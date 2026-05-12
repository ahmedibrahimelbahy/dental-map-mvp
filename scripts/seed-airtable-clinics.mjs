#!/usr/bin/env node
/**
 * Seed clinics from the Airtable "Clinic Submissions-Grid view" CSV.
 *
 * - Resolves Google Maps short URLs (maps.app.goo.gl) to lat/lng via redirect-follow
 * - Parses the team-member bullet list into dentists
 * - Maps district/address → area slug, team role → specialty slug + title
 * - Defaults: subscription = growth, validity = 3 months, verification = approved, published
 * - Idempotent: upserts by clinic slug; safe to re-run
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-airtable-clinics.mjs "Clinic Submissions-Grid view (1).csv"
 */

import { readFile } from "node:fs/promises";
import { resolve as pathResolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/seed-airtable-clinics.mjs "<csv-path>"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env vars not set");
const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ─────────────────────────── CSV parser ─────────────────────────── */

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
      } else if (c === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (c === "\r") {
        i++;
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
      } else {
        field += c;
        i++;
      }
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* ──────────────────────── Google Maps resolver ──────────────────────── */

const COORD_RE = {
  at: /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  data: /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  bareLatLng: /^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/,
};

function parseMapsUrl(str) {
  if (!str) return null;
  const s = str.trim();
  const bare = s.match(COORD_RE.bareLatLng);
  if (bare) return { lat: parseFloat(bare[1]), lng: parseFloat(bare[2]) };
  const at = s.match(COORD_RE.at);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  const data = s.match(COORD_RE.data);
  if (data) return { lat: parseFloat(data[1]), lng: parseFloat(data[2]) };
  try {
    const u = new URL(s);
    const q = u.searchParams.get("q") || u.searchParams.get("ll");
    if (q) {
      const m = q.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
      if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    }
  } catch {}
  return null;
}

// Use a plain curl-style User-Agent — when a Safari-like UA is sent,
// maps.app.goo.gl returns a JavaScript "Durable Deep Link" page that
// resolves client-side and gives us nothing. Treated as a non-browser,
// Google issues a clean 302 to maps.google.com with the place metadata
// in query params.
async function followRedirects(startUrl, maxHops = 6) {
  let cur = startUrl;
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(cur, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "curl/8.0" },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) break;
      cur = new URL(next, cur).toString();
      continue;
    }
    const body = await res.text();
    return { finalUrl: cur, body };
  }
  return { finalUrl: cur, body: "" };
}

// Geocode a freeform place name via OpenStreetMap Nominatim. Egypt-biased.
// Rate-limited by Nominatim to ~1 req/sec — caller paces accordingly.
async function nominatimGeocode(query) {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("q", query);
  u.searchParams.set("format", "json");
  u.searchParams.set("countrycodes", "eg");
  u.searchParams.set("limit", "1");
  const res = await fetch(u, {
    headers: {
      "User-Agent": "DentalMap-Seeder/1.0 (https://dentalmap.app)",
      "Accept-Language": "en,ar",
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows.length) return null;
  const r = rows[0];
  const lat = parseFloat(r.lat);
  const lng = parseFloat(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, displayName: r.display_name };
}

async function resolveMaps(url, fallbackAddress = "") {
  if (!url && !fallbackAddress) return null;

  if (url) {
    const direct = parseMapsUrl(url);
    if (direct) return direct;

    try {
      const { finalUrl, body } = await followRedirects(url);
      console.log(`    redirect → ${finalUrl.slice(0, 90)}${finalUrl.length > 90 ? "…" : ""}`);
      const fromUrl = parseMapsUrl(finalUrl) || parseMapsUrl(body);
      if (fromUrl) return fromUrl;

      // Lift the place name out of the final URL's q= and Nominatim-geocode it.
      try {
        const u = new URL(finalUrl);
        const placeName = u.searchParams.get("q");
        if (placeName) {
          console.log(`    place: "${placeName.slice(0, 60)}…"`);
          // Try with address context first
          const tries = fallbackAddress
            ? [
                `${placeName}, ${fallbackAddress}, Cairo, Egypt`,
                `${placeName}, Cairo, Egypt`,
                `${fallbackAddress}, Cairo, Egypt`,
              ]
            : [`${placeName}, Cairo, Egypt`];
          for (const q of tries) {
            const geo = await nominatimGeocode(q);
            if (geo) {
              console.log(`    geocoded → ${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)} (${q.slice(0, 50)}…)`);
              return geo;
            }
            await new Promise((r) => setTimeout(r, 1100));
          }
        } else {
          console.log(`    no q= in final URL`);
        }
      } catch (e) {
        console.warn(`    ⚠ geocode-from-url failed: ${e.message}`);
      }
    } catch (e) {
      console.warn(`  ⚠ redirect-follow failed: ${e.message}`);
    }
  }

  if (fallbackAddress) {
    const geo = await nominatimGeocode(`${fallbackAddress}, Cairo, Egypt`);
    if (geo) {
      console.log(`    geocoded address → ${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}`);
      return geo;
    }
  }

  return null;
}

/* ──────────────────────── Field inference ──────────────────────── */

// Area resolution: try the district field first, then sniff the address.
// Default to nasr-city only if address mentions Nasr/Madinet Nasr; else
// the area defaults to whatever the address resembles.
function inferArea(district, address) {
  const d = (district || "").toLowerCase();
  const a = (address || "").toLowerCase();

  // Explicit district matches first
  if (d.includes("nasr city")) return "nasr-city";
  if (d.includes("mostafa el nahas")) return "nasr-city";
  if (d.includes("shorouk")) return "el-shorouk";
  if (d.includes("5th settlement")) return "new-cairo";
  if (d.includes("zamalek")) return "zamalek";
  if (d.includes("maadi")) return "maadi";
  if (d.includes("heliopolis")) return "heliopolis";
  if (d.includes("mohandessin")) return "mohandessin";
  if (d.includes("dokki")) return "dokki";
  if (d.includes("october")) return "6-october";

  // Fall back to address sniffing
  if (a.includes("lasalki") || a.includes("maadi") || a.includes("المعادي")) return "maadi";
  if (a.includes("nasr") || a.includes("مدينه نصر") || a.includes("مدينة نصر")) return "nasr-city";
  if (a.includes("shorouk") || a.includes("الشروق")) return "el-shorouk";
  if (a.includes("masr el gedida") || a.includes("مصر الجديدة") || a.includes("heliopolis") || a.includes("orouba") || a.includes("nozha")) return "heliopolis";
  if (a.includes("5th settlement") || a.includes("التجمع") || a.includes("mivida") || a.includes("new cairo") || a.includes("القاهرة الجديدة")) return "new-cairo";
  if (a.includes("dokki") || a.includes("الدقي")) return "dokki";
  if (a.includes("mohandessin") || a.includes("المهندسين")) return "mohandessin";
  if (a.includes("zamalek") || a.includes("الزمالك")) return "zamalek";

  // "الشطر" numbered districts + Carrefour → 6th October (most common)
  if (a.includes("الشطر") || a.includes("كارفور")) return "6-october";

  // Final fallback — log it so we know
  return null;
}

// Map a free-text role on the team list to one of our specialty slugs.
// Returns an array because some roles map to multiple (e.g., "Esthetic and
// Restorative Dentist" → cosmetic + adult).
function specialtyFromRole(role) {
  const r = (role || "").toLowerCase();
  const out = new Set();
  if (/orthodont|تقويم/.test(r)) out.add("orthodontics");
  if (/endodont|root canal|عصب/.test(r)) out.add("endodontics");
  if (/implant|زراعة/.test(r)) out.add("implants");
  if (/pediatric|pedodont|أطفال/.test(r)) out.add("pediatric");
  if (/surgeon|oral surgery|maxillofacial|جراحة/.test(r)) out.add("oral-surgery");
  if (/cosmetic|esthetic|aesthetic|تجميل/.test(r)) out.add("cosmetic");
  // Restorative / prosthodontics / periodontics → general adult dentistry
  // (we don't have separate slugs for these in v1).
  if (/restorative|prosthodont|periodont|general/.test(r) && out.size === 0) {
    out.add("adult");
  }
  if (out.size === 0) out.add("adult");
  return [...out];
}

// Map team roles to our title enum. Default to specialist since most
// dentists in the data set are practising specialists.
function titleFromRole(role) {
  const r = (role || "").toLowerCase();
  if (/professor|prof\.|prof\//.test(r)) return "professor";
  if (/consultant|استشاري/.test(r)) return "consultant";
  return "specialist";
}

// Parse the team-members blob.
// Format examples:
//   "• Dr. ahmed saad — Orthodontist"
//   "• Mohamed Sherif — Esthetic and Restorative Dentist"
// Some entries include bio paragraphs on subsequent lines; we keep those as bio_en.
function parseTeamMembers(blob) {
  if (!blob) return [];
  const lines = blob.split(/\r?\n/);
  const dentists = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("•")) {
      if (current) dentists.push(current);
      const stripped = line.replace(/^•\s*/, "");
      const dashIdx = stripped.search(/—|–|-/);
      const name = dashIdx > 0 ? stripped.slice(0, dashIdx).trim() : stripped;
      const role = dashIdx > 0 ? stripped.slice(dashIdx + 1).trim() : "";
      current = {
        name_en: name.replace(/^Dr\.?\s+/i, "Dr. "),
        role,
        bio_en: "",
      };
    } else if (current) {
      // continuation bio line
      current.bio_en = current.bio_en
        ? `${current.bio_en}\n${line}`
        : line;
    }
  }
  if (current) dentists.push(current);
  // Drop dental assistants — they're not bookable practitioners.
  return dentists.filter((d) => !/assistant/i.test(d.role));
}

// Extract the consultation fee from the pricing column.
function parseConsultationFee(pricingBlob) {
  if (!pricingBlob) return 400;
  const m = pricingBlob.match(/(?:Diagnosis|Consultation)[^:]*:\s*(\d+)\s*EGP/i);
  if (m) return parseInt(m[1], 10);
  return 400;
}

const TIER_BY_AREA = {
  "new-cairo": 1,
  zamalek: 1,
  maadi: 1,
  heliopolis: 2,
  mohandessin: 2,
  "nasr-city": 3,
  "6-october": 4,
  "el-shorouk": 4,
  // Anything else: defaulted to 4 per migration 006
};

const PRICE_BY_TIER_PACKAGE = {
  1: { standard: 999, growth: 1499, premium: 2199 },
  2: { standard: 899, growth: 1399, premium: 1999 },
  3: { standard: 699, growth: 1099, premium: 1699 },
  4: { standard: 599, growth: 899, premium: 1399 },
};

const DEFAULT_WORKING_HOURS = [0, 1, 2, 3, 4].map((day) => ({
  day,
  start: "10:00",
  end: "18:00",
  breaks: [{ start: "14:00", end: "15:00" }],
}));

// Approximate centroid per area — used when we can't resolve a clinic's
// exact pin (rate limit, wrong URL, no URL). Ops or the clinic admin can
// drag the pin in the dashboard later. These come from Google Maps spot-
// checks on each area's commercial core, ±500m accuracy.
const AREA_CENTROID = {
  maadi:        { lat: 29.9603, lng: 31.2569 },
  heliopolis:   { lat: 30.0973, lng: 31.3284 },
  "nasr-city":  { lat: 30.0599, lng: 31.3475 },
  "new-cairo":  { lat: 30.0271, lng: 31.4775 },
  "el-shorouk": { lat: 30.1306, lng: 31.6135 },
  "6-october":  { lat: 29.9696, lng: 30.9272 },
  dokki:        { lat: 30.0386, lng: 31.2103 },
  mohandessin:  { lat: 30.0594, lng: 31.2014 },
  zamalek:      { lat: 30.0617, lng: 31.2189 },
  "sheikh-zayed":{ lat: 30.0444, lng: 30.9706 },
  downtown:     { lat: 30.0444, lng: 31.2357 },
  shoubra:      { lat: 30.1106, lng: 31.2417 },
  "ain-shams":  { lat: 30.1305, lng: 31.3294 },
};

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/* ─────────────────────────── Main ─────────────────────────── */

const csvText = await readFile(pathResolve(process.cwd(), csvPath), "utf8");
const rows = parseCSV(csvText);
const header = rows.shift();
console.log(`📄 CSV header: ${header.length} cols`);
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

// Required columns
const need = [
  "Clinic Name",
  "About the Clinic",
  "Services",
  "Location - Address",
  "Location - District",
  "Google Maps Link",
  "Team Members",
  "Pricing",
  "Phone (Calls)",
  "Phone (WhatsApp)",
];
for (const n of need) {
  if (!(n in idx)) {
    console.error(`Missing column: ${n}`);
    process.exit(1);
  }
}

// Pre-fetch lookups
const { data: areas } = await supa.from("areas").select("id, slug");
const areaIdBySlug = new Map(areas.map((a) => [a.slug, a.id]));
const { data: specialties } = await supa.from("specialties").select("id, slug");
const specialtyIdBySlug = new Map(specialties.map((s) => [s.slug, s.id]));

console.log(`📍 ${areas.length} areas, ${specialties.length} specialties loaded\n`);

let okCount = 0;
let skipCount = 0;

for (let r = 0; r < rows.length; r++) {
  const row = rows[r];
  const name = (row[idx["Clinic Name"]] || "").trim();
  if (!name) continue;

  const district = (row[idx["Location - District"]] || "").trim();
  const address = (row[idx["Location - Address"]] || "").trim();
  const mapsUrl = (row[idx["Google Maps Link"]] || "").trim();
  const teamBlob = row[idx["Team Members"]] || "";
  const pricingBlob = row[idx["Pricing"]] || "";
  const about = (row[idx["About the Clinic"]] || "").trim();
  const phone = (row[idx["Phone (Calls)"]] || "").trim();
  const whatsapp = (row[idx["Phone (WhatsApp)"]] || "").trim();

  console.log(`▶ ${name}`);

  const areaSlug = inferArea(district, address);
  if (!areaSlug || !areaIdBySlug.has(areaSlug)) {
    console.log(`  ⚠ area unmatched (district="${district}", address="${address.slice(0, 40)}") — skipping`);
    skipCount++;
    continue;
  }
  console.log(`  area: ${areaSlug}`);

  let coords = await resolveMaps(mapsUrl, `${name}, ${address}`);
  let pinIsExact = !!coords;
  if (!coords) {
    coords = AREA_CENTROID[areaSlug];
    if (!coords) {
      console.log(`  ⚠ no coords + no centroid for area "${areaSlug}" — skipping`);
      skipCount++;
      continue;
    }
    console.log(`  pin:  ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} (APPROX from area centroid — fix in dashboard)`);
  } else {
    console.log(`  pin:  ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
  }

  // Nominatim politely asks for ~1 req/sec — pace ourselves between rows.
  await new Promise((r) => setTimeout(r, 1100));

  const dentists = parseTeamMembers(teamBlob);
  if (dentists.length === 0) {
    console.log(`  ⚠ no team members parsed — adding a placeholder dentist`);
    dentists.push({
      name_en: "Dr. (TBD)",
      role: "General Dentist",
      bio_en: "",
    });
  }
  console.log(`  team: ${dentists.length} dentist(s)`);

  const fee = parseConsultationFee(pricingBlob);
  const tier = TIER_BY_AREA[areaSlug] ?? 4;
  const pkg = "growth";
  const monthlyEgp = PRICE_BY_TIER_PACKAGE[tier][pkg];

  const slug = slugify(name);

  // Upsert clinic
  const fullAddress = pinIsExact
    ? address
    : `${address}${address ? " — " : ""}(Map: ${mapsUrl || "no link"})`;
  const clinicRow = {
    slug,
    name_en: name,
    name_ar: name, // Airtable doesn't have AR; ops can fill later
    area_id: areaIdBySlug.get(areaSlug),
    address_en: fullAddress || null,
    address_ar: null,
    phone: phone || null,
    whatsapp: whatsapp || null,
    lat: coords.lat,
    lng: coords.lng,
    is_published: true,
    subscription_tier: tier,
    subscription_package: pkg,
    subscription_monthly_egp: monthlyEgp,
    consultation_validity_months: 3,
    verification_status: "approved",
    verification_submitted_at: new Date().toISOString(),
  };

  const { data: existing } = await supa
    .from("clinics")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  let clinicId;
  if (existing) {
    const { error } = await supa.from("clinics").update(clinicRow).eq("id", existing.id);
    if (error) {
      console.log(`  ❌ clinic update failed: ${error.message}`);
      skipCount++;
      continue;
    }
    clinicId = existing.id;
    console.log(`  ✏  updated clinic ${slug}`);
  } else {
    const { data, error } = await supa.from("clinics").insert(clinicRow).select("id").single();
    if (error) {
      console.log(`  ❌ clinic insert failed: ${error.message}`);
      skipCount++;
      continue;
    }
    clinicId = data.id;
    console.log(`  ✓  inserted clinic ${slug}`);
  }

  // Wipe existing clinic_dentists for this clinic — easiest way to keep
  // the seed idempotent when team rosters change.
  await supa.from("clinic_dentists").delete().eq("clinic_id", clinicId);

  // Upsert dentists + links
  for (const d of dentists) {
    let dentistSlug = slugify(d.name_en) || `dentist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // If a different dentist already owns the slug, suffix it.
    const { data: existingD } = await supa
      .from("dentists")
      .select("id")
      .eq("slug", dentistSlug)
      .maybeSingle();
    let dentistId;
    if (existingD) {
      // Reuse the existing dentist row — common when the same dentist
      // appears in multiple clinics.
      dentistId = existingD.id;
      await supa
        .from("dentists")
        .update({
          name_en: d.name_en,
          name_ar: d.name_en, // no AR in Airtable; ops can fill
          title: titleFromRole(d.role),
          bio_en: d.bio_en || null,
          is_published: true,
        })
        .eq("id", dentistId);
    } else {
      const { data, error } = await supa
        .from("dentists")
        .insert({
          slug: dentistSlug,
          name_en: d.name_en,
          name_ar: d.name_en,
          title: titleFromRole(d.role),
          bio_en: d.bio_en || null,
          is_published: true,
        })
        .select("id")
        .single();
      if (error) {
        console.log(`    ⚠ dentist insert failed (${d.name_en}): ${error.message}`);
        continue;
      }
      dentistId = data.id;
    }

    // clinic_dentists link
    await supa.from("clinic_dentists").insert({
      clinic_id: clinicId,
      dentist_id: dentistId,
      fee_egp: fee,
      slot_minutes: 30,
      working_hours: DEFAULT_WORKING_HOURS,
      is_active: true,
    });

    // Specialty links — wipe + reinsert
    await supa.from("dentist_specialties").delete().eq("dentist_id", dentistId);
    const slugs = specialtyFromRole(d.role);
    const specRows = slugs
      .map((s) => specialtyIdBySlug.get(s))
      .filter(Boolean)
      .map((sId) => ({ dentist_id: dentistId, specialty_id: sId }));
    if (specRows.length) {
      await supa.from("dentist_specialties").insert(specRows);
    }
  }
  okCount++;
}

console.log(`\n✅ Done: ${okCount} clinics seeded, ${skipCount} skipped.`);
