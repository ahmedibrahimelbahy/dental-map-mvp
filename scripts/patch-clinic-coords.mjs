#!/usr/bin/env node
/**
 * Targeted coordinate patch using Nominatim-resolved or known-good coordinates.
 * Run once to fix clinics that had area-centroid placeholders.
 *
 *   node --env-file=.env.local scripts/patch-clinic-coords.mjs
 */
import { createClient } from "@supabase/supabase-js";

const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supaUrl || !key) throw new Error("Supabase env vars not set");
const supa = createClient(supaUrl, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Coordinates resolved via Nominatim + address data from the Airtable CSV.
// Each entry is the best available fix for clinics with placeholder coords.
// "Open in Google Maps" navigation uses google_maps_url (exact); these coords
// are for our map pin display only.
const patches = [
  {
    slug: "elan-dental-clinic",
    lat: 30.15229, lng: 31.62672,
    note: "Terrace Mall, El Shorouk (clinic address: Shorouk 2, Terrace Mall, Gate 6)",
  },
  {
    slug: "elbialy-dental-clinic",
    lat: 30.05454, lng: 31.34869,
    note: "Nahas Street, Nasr City (clinic address: 75 Ali Amin Mostafa Nahas)",
  },
  {
    slug: "modern-dental-clinic",
    lat: 30.05403, lng: 31.34208,
    note: "Nahas Street, Nasr City (clinic address: 7 Mostafa El Nahas St)",
  },
  {
    slug: "nuvo-dental-clinic",
    lat: 30.10222, lng: 31.35559,
    note: "El Orouba Street, Heliopolis (clinic address: 185 el orouba street 4th floor)",
  },
  {
    slug: "optima-dental-and-maxillofacial-care",
    lat: 30.03502, lng: 31.21535,
    note: "Dokki area, Giza (clinic address: 126 Mohey-eldin abou-elezz st. El dokki)",
  },
  {
    slug: "sabet-dental-clinic",
    lat: 30.07508, lng: 31.31583,
    note: "Youssef Abbas Street, Nasr City (clinic address: 22 Youssef Abbas infront Cairo International Stadium)",
  },
  {
    slug: "smile-factory-dental-clinic",
    lat: 30.05212, lng: 31.34220,
    note: "Nasr City (clinic address: 25 Gamal eldin kassem street)",
  },
];

console.log(`Patching ${patches.length} clinics...\n`);

for (const p of patches) {
  const { data: clinic } = await supa
    .from("clinics")
    .select("id, name_en, lat, lng")
    .eq("slug", p.slug)
    .maybeSingle();

  if (!clinic) {
    console.log(`⏭  ${p.slug} — not found in DB`);
    continue;
  }

  const prevLat = clinic.lat ? parseFloat(clinic.lat) : null;
  const prevLng = clinic.lng ? parseFloat(clinic.lng) : null;

  const { error } = await supa
    .from("clinics")
    .update({ lat: p.lat, lng: p.lng })
    .eq("id", clinic.id);

  if (error) {
    console.log(`❌ ${clinic.name_en}: ${error.message}`);
    continue;
  }

  const prev = prevLat ? `(was ${prevLat.toFixed(4)}, ${prevLng.toFixed(4)})` : "(was null)";
  console.log(`✅ ${clinic.name_en}`);
  console.log(`   ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} ${prev}`);
  console.log(`   ${p.note}`);
  console.log();
}

console.log("Done.");
