#!/usr/bin/env node
/**
 * Re-resolve lat/lng for clinics that have a google_maps_url.
 *
 * Strategy (in order):
 *   1. Direct regex parse of the URL (works for long desktop share URLs)
 *   2. Follow redirect chain (curl/8.0 UA) — parse final/intermediate URLs
 *   3. Nominatim geocode using the q= place name from the Google redirect
 *   4. Nominatim geocode using clinic name + area (most reliable fallback for
 *      mobile share links that resolve to a nearby landmark, not the clinic)
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-clinic-coords.mjs
 *   node --env-file=.env.local scripts/fix-clinic-coords.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");

const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supaUrl || !key) throw new Error("Supabase env vars not set");
const supa = createClient(supaUrl, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SHORT_HOSTS = new Set([
  "maps.app.goo.gl", "goo.gl", "g.co", "share.google",
]);

function parseGoogleMapsUrl(s) {
  if (!s) return null;
  s = s.trim();

  const bare = s.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (bare) {
    const lat = parseFloat(bare[1]);
    const lng = parseFloat(bare[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) {
    const lat = parseFloat(at[1]);
    const lng = parseFloat(at[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  const data = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (data) {
    const lat = parseFloat(data[1]);
    const lng = parseFloat(data[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  try {
    const url = new URL(s);
    const q = url.searchParams.get("q") ?? url.searchParams.get("ll");
    if (q) {
      const m = q.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        if (isValidLatLng(lat, lng)) return { lat, lng };
      }
    }
  } catch {}

  return null;
}

function isValidLatLng(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function isInEgypt(lat, lng) {
  return lat >= 22 && lat <= 32 && lng >= 24.7 && lng <= 36.9;
}

// Follow redirect chain; capture ALL redirect targets, not just the last one.
// Returns { finalUrl, allUrls, body } where allUrls includes every hop.
async function followRedirects(startUrl, maxHops = 8) {
  let currentUrl = startUrl;
  const allUrls = [startUrl];
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "curl/8.0" },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) break;
      currentUrl = new URL(next, currentUrl).toString();
      allUrls.push(currentUrl);
      continue;
    }
    // Stop on 429 / 200 / etc — don't follow into /sorry/
    const body = await res.text();
    return { finalUrl: currentUrl, allUrls, body };
  }
  return { finalUrl: currentUrl, allUrls, body: "" };
}

let nominatimLast = 0;
async function nominatimGeocode(query) {
  // Respect 1 req/sec policy
  const now = Date.now();
  const wait = 1100 - (now - nominatimLast);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  nominatimLast = Date.now();

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("countrycodes", "eg");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "DentalMap/1.0 (https://dentalmap.app)",
        "Accept-Language": "en",
      },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    const lat = parseFloat(rows[0].lat);
    const lng = parseFloat(rows[0].lon);
    if (!isValidLatLng(lat, lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function resolveCoords(rawUrl, clinicName, areaName, addressEn) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // 1. Direct parse (works for long desktop URLs with @lat,lng)
  const direct = parseGoogleMapsUrl(trimmed);
  if (direct && isInEgypt(direct.lat, direct.lng))
    return { ...direct, method: "direct-parse" };

  let urlObj;
  try { urlObj = new URL(trimmed); } catch { return null; }

  const shouldFollow =
    SHORT_HOSTS.has(urlObj.hostname) ||
    urlObj.hostname.endsWith("google.com") ||
    urlObj.hostname.endsWith("share.google");

  if (shouldFollow) {
    const { allUrls, body } = await followRedirects(trimmed);

    // 2. Try parsing every URL in the chain (including intermediate hops)
    for (const u of allUrls) {
      const parsed = parseGoogleMapsUrl(u);
      if (parsed && isInEgypt(parsed.lat, parsed.lng))
        return { ...parsed, method: "redirect-parse" };
    }

    // 3. Try HTML body
    const fromBody = parseGoogleMapsUrl(body);
    if (fromBody && isInEgypt(fromBody.lat, fromBody.lng))
      return { ...fromBody, method: "html-parse" };

    // 4. Extract q= from any intermediate maps.google.com URL and geocode
    for (const u of allUrls) {
      try {
        const pu = new URL(u);
        if (pu.hostname.includes("google.com")) {
          const q = pu.searchParams.get("q");
          if (q && !q.match(/^-?\d/)) {
            // It's a place name, not coords — try Nominatim
            const geo = await nominatimGeocode(`${q}, Egypt`);
            if (geo && isInEgypt(geo.lat, geo.lng))
              return { ...geo, method: `nominatim-q(${q.slice(0, 30)})` };
          }
        }
      } catch {}
    }
  }

  // 5. Nominatim with clinic name + area (best fallback for mobile share links)
  const nameQuery = [clinicName, areaName, "Cairo", "Egypt"]
    .filter(Boolean).join(", ");
  const nameGeo = await nominatimGeocode(nameQuery);
  if (nameGeo && isInEgypt(nameGeo.lat, nameGeo.lng))
    return { ...nameGeo, method: "nominatim-name" };

  // 6. Nominatim with stored address
  if (addressEn) {
    const addrGeo = await nominatimGeocode(`${addressEn}, Egypt`);
    if (addrGeo && isInEgypt(addrGeo.lat, addrGeo.lng))
      return { ...addrGeo, method: "nominatim-address" };
  }

  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const { data: clinics, error } = await supa
  .from("clinics")
  .select(`
    id, slug, name_en, google_maps_url, lat, lng, address_en,
    area:areas(name_en)
  `)
  .not("google_maps_url", "is", null)
  .order("name_en");

if (error) throw error;
if (!clinics.length) {
  console.log("No clinics with google_maps_url found.");
  process.exit(0);
}

console.log(`Found ${clinics.length} clinics with google_maps_url.\n`);
if (dryRun) console.log("DRY RUN — no DB writes.\n");

let updated = 0, skipped = 0, failed = 0;

for (const clinic of clinics) {
  process.stdout.write(`  ${clinic.name_en.padEnd(48)} `);

  let coords;
  try {
    coords = await resolveCoords(
      clinic.google_maps_url,
      clinic.name_en,
      clinic.area?.name_en ?? null,
      clinic.address_en ?? null,
    );
  } catch (e) {
    console.log(`❌ error: ${e.message}`);
    failed++;
    continue;
  }

  if (!coords) {
    console.log(`✗  could not resolve`);
    failed++;
    continue;
  }

  const prevLat = clinic.lat ? parseFloat(clinic.lat) : null;
  const prevLng = clinic.lng ? parseFloat(clinic.lng) : null;
  const same =
    prevLat !== null && prevLng !== null &&
    Math.abs(prevLat - coords.lat) < 0.00005 &&
    Math.abs(prevLng - coords.lng) < 0.00005;

  if (same) {
    console.log(`✓  unchanged  ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}  [${coords.method}]`);
    skipped++;
    continue;
  }

  if (!dryRun) {
    const { error: updateErr } = await supa
      .from("clinics")
      .update({ lat: coords.lat, lng: coords.lng })
      .eq("id", clinic.id);
    if (updateErr) {
      console.log(`❌ DB error: ${updateErr.message}`);
      failed++;
      continue;
    }
  }

  const prev = prevLat ? `(was ${prevLat.toFixed(4)}, ${prevLng.toFixed(4)})` : "(was null)";
  console.log(`✅ updated  ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}  [${coords.method}] ${prev}`);
  updated++;
}

console.log(`\n${updated} updated, ${skipped} already correct, ${failed} failed.`);
