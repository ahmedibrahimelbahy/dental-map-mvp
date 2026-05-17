// Extract lat/lng from a Google Maps URL.
//
// Handles the common share formats:
//   1. Long URL with @lat,lng,zoom in the path (the *camera* position):
//        https://www.google.com/maps/.../@30.0444,31.2357,17z/...
//   2. Place URL with !3dLAT!4dLNG in the data block (the actual *pin*):
//        https://www.google.com/maps/place/Foo/data=!4m5!...!3d30.0440!4d31.2353
//   3. Query-style with ?q=lat,lng or ?ll=lat,lng:
//        https://www.google.com/maps?q=30.0444,31.2357
//   4. Bare "lat,lng" or "lat, lng"
//
// Priority is important: Google share URLs for a place ALMOST ALWAYS contain
// BOTH `@` (camera) AND `!3d!4d` (pin), and the camera is often dozens to
// hundreds of metres from the pin (depends on zoom + scroll). We must prefer
// the pin over the camera, otherwise pasted share links resolve to the wrong
// spot. Order: explicit bare coords → pin → query coords → camera fallback.
//
// Short URLs (maps.app.goo.gl) need a network redirect to resolve — those
// are handled by resolveGoogleMapsLocation() server action below.

export type LatLng = { lat: number; lng: number };

export function parseGoogleMapsUrl(input: string): LatLng | null {
  if (!input) return null;
  const s = input.trim();

  // 1. Bare "lat,lng" or "lat, lng" — explicit user input, highest priority.
  const bare = s.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (bare) {
    const lat = parseFloat(bare[1]);
    const lng = parseFloat(bare[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 2. !3dLAT!4dLNG data-block — the actual place pin on place pages. This
  //    BEATS the `@` camera coord because Google's share UI emits the place
  //    URL with both, and only this pair is the business location.
  const data = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (data) {
    const lat = parseFloat(data[1]);
    const lng = parseFloat(data[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 3. ?q=lat,lng or &q=lat,lng or ?ll=lat,lng — also explicit coords.
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
  } catch {
    // Not a valid URL — already covered by the regex paths above.
  }

  // 4. @lat,lng camera position — last-resort fallback. Only useful when the
  //    URL has no pin data block (e.g. a screenshot-style maps link with no
  //    selected place).
  const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) {
    const lat = parseFloat(at[1]);
    const lng = parseFloat(at[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

export function isValidLatLng(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

// Egypt rough bounding box — used to flag pins that clearly fell outside
// the country (typos like swapping lat/lng order). Not a hard validation,
// just a UI warning hook.
export function isInEgypt(lat: number, lng: number): boolean {
  return lat >= 22 && lat <= 32 && lng >= 24.7 && lng <= 36.9;
}
