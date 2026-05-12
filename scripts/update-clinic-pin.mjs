#!/usr/bin/env node
/**
 * Update a single clinic's google_maps_url and, if extractable, its lat/lng.
 *
 *   node --env-file=.env.local scripts/update-clinic-pin.mjs <slug> "<url>"
 *
 * Example:
 *   node --env-file=.env.local scripts/update-clinic-pin.mjs smile-craft-dental-clinic "https://maps.app.goo.gl/..."
 */
import { createClient } from "@supabase/supabase-js";

const slug = process.argv[2];
const url = process.argv[3];
if (!slug || !url) {
  console.error('Usage: node scripts/update-clinic-pin.mjs <slug> "<url>"');
  process.exit(1);
}

const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supaUrl || !key) throw new Error("Supabase env vars not set");
const supa = createClient(supaUrl, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Best-effort lat/lng extraction — if the URL doesn't carry coords, we just
// store the URL and leave the approximate centroid lat/lng in place. The
// profile page's "Open in Google Maps" button uses the URL, so navigation is
// already exact.
function extractLatLng(s) {
  let m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  try {
    const u = new URL(s);
    const q = u.searchParams.get("q") || u.searchParams.get("ll");
    if (q) {
      const bare = q.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
      if (bare) return { lat: parseFloat(bare[1]), lng: parseFloat(bare[2]) };
    }
  } catch {}
  return null;
}

const coords = extractLatLng(url);
const patch = { google_maps_url: url };
if (coords) {
  patch.lat = coords.lat;
  patch.lng = coords.lng;
}

const { data, error } = await supa
  .from("clinics")
  .update(patch)
  .eq("slug", slug)
  .select("id, name_en, lat, lng")
  .maybeSingle();

if (error) {
  console.error("❌", error.message);
  process.exit(1);
}
if (!data) {
  console.error(`❌ no clinic with slug "${slug}"`);
  process.exit(1);
}
console.log(`✓ Updated ${data.name_en}`);
console.log(`  google_maps_url: ${url.slice(0, 80)}${url.length > 80 ? "…" : ""}`);
console.log(`  lat/lng:         ${data.lat}, ${data.lng}${coords ? " (extracted from URL)" : " (kept previous)"}`);
