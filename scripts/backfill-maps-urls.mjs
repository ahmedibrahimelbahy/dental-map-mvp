#!/usr/bin/env node
/**
 * Backfill clinic.google_maps_url from the Airtable Clinic Submissions CSV.
 *
 * The seed script saved each clinic's original Google Maps share URL into
 * `address_en` (formatted as "address — (Map: URL)") as a stopgap. Now that
 * migration 007 added a proper `google_maps_url` column, lift the URL into
 * its own field and restore `address_en` to just the address.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-maps-urls.mjs "Clinic Submissions-Grid view (1).csv"
 */
import { readFile } from "node:fs/promises";
import { resolve as pathResolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/backfill-maps-urls.mjs "<csv-path>"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env vars not set");
const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") {}
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function slugify(s) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

const csvText = await readFile(pathResolve(process.cwd(), csvPath), "utf8");
const rows = parseCSV(csvText);
const header = rows.shift();
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

console.log(`📄 ${rows.length} rows in CSV\n`);
let okCount = 0;
let skipCount = 0;

for (const row of rows) {
  const name = (row[idx["Clinic Name"]] || "").trim();
  if (!name) continue;
  const slug = slugify(name);
  const address = (row[idx["Location - Address"]] || "").trim();
  const mapsUrl = (row[idx["Google Maps Link"]] || "").trim();

  if (!mapsUrl) {
    console.log(`⏭  ${slug} — no URL in CSV, skipping`);
    skipCount++;
    continue;
  }

  // Look up the clinic by slug
  const { data: existing } = await supa
    .from("clinics")
    .select("id, address_en")
    .eq("slug", slug)
    .maybeSingle();
  if (!existing) {
    console.log(`⏭  ${slug} — not in DB, skipping`);
    skipCount++;
    continue;
  }

  // Clean address_en: strip any "(Map: ...)" suffix we appended earlier
  const cleanAddress = (existing.address_en || address || "")
    .replace(/\s*—\s*\(Map:[^)]*\)\s*$/i, "")
    .trim();

  const { error } = await supa
    .from("clinics")
    .update({
      google_maps_url: mapsUrl,
      address_en: cleanAddress || address || null,
    })
    .eq("id", existing.id);
  if (error) {
    console.log(`❌ ${slug} — ${error.message}`);
    skipCount++;
    continue;
  }
  console.log(`✓  ${slug}`);
  okCount++;
}

console.log(`\n✅ ${okCount} clinics updated, ${skipCount} skipped.`);
