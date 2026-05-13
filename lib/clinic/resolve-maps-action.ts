"use server";

import { parseGoogleMapsUrl, type LatLng } from "@/lib/clinic/parse-google-maps";

export type ResolveResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: "invalid_url" | "no_coords" | "fetch_failed" };

const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);

// Resolve a Google Maps share URL (long or short) to lat/lng.
// Short URLs need a network redirect to expand; long URLs we parse locally.
// If we can't extract exact coords but can identify a place name, we
// geocode it via Nominatim as a secondary fallback. Returns "no_coords"
// only when both paths fail.
export async function resolveGoogleMapsLocation(
  rawUrl: string
): Promise<ResolveResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { ok: false, error: "invalid_url" };

  // First try parsing as-is — handles long URLs and bare lat,lng pairs
  // without any network round-trip.
  const direct = parseGoogleMapsUrl(trimmed);
  if (direct) return { ok: true, ...direct };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "invalid_url" };
  }

  // For both short URLs (maps.app.goo.gl) AND long URLs without inline
  // coords, follow the redirect chain — Google often serves a cleaner
  // canonical URL via 302 to non-browser UAs.
  const shouldFollow =
    SHORT_HOSTS.has(url.hostname) || url.hostname.endsWith("google.com");
  if (!shouldFollow) {
    return { ok: false, error: "no_coords" };
  }

  try {
    const expanded = await followRedirects(trimmed);
    const parsed = parseGoogleMapsUrl(expanded.finalUrl);
    if (parsed) return { ok: true, ...parsed };

    // HTML body sometimes carries coords inline.
    const coordsFromHtml = extractCoordsFromHtml(expanded.body);
    if (coordsFromHtml) return { ok: true, ...coordsFromHtml };

    // Last attempt: lift the place name out of `q=` and Nominatim-geocode
    // it. Less precise than the original pin but usually within ~50m for
    // named businesses.
    try {
      const finalUrlParsed = new URL(expanded.finalUrl);
      const placeName = finalUrlParsed.searchParams.get("q");
      if (placeName) {
        const geo = await geocodeAddress(`${placeName}, Cairo, Egypt`);
        if (geo.ok) return { ok: true, lat: geo.lat, lng: geo.lng };
      }
    } catch {
      // ignore — fall through to no_coords
    }

    return { ok: false, error: "no_coords" };
  } catch (e) {
    console.error("[maps] resolve failed:", e);
    return { ok: false, error: "fetch_failed" };
  }
}

async function followRedirects(
  startUrl: string,
  maxHops = 6
): Promise<{ finalUrl: string; body: string }> {
  // IMPORTANT: do NOT send a Safari User-Agent here. maps.app.goo.gl serves
  // a JavaScript-only "Durable Deep Link" placeholder page to browser UAs
  // and a real 302 redirect to a non-browser UA. Use a curl-style UA so we
  // get the proper Location header chain to maps.google.com?q=...&ftid=...
  let currentUrl = startUrl;
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
      continue;
    }
    const body = await res.text();
    return { finalUrl: currentUrl, body };
  }
  return { finalUrl: currentUrl, body: "" };
}

function extractCoordsFromHtml(html: string): LatLng | null {
  // Google embeds the canonical coords in a couple of patterns. Try them
  // in order of reliability.
  const direct = parseGoogleMapsUrl(html);
  if (direct) return direct;
  return null;
}

export type GeocodeAddressResult =
  | { ok: true; lat: number; lng: number; displayName: string }
  | { ok: false; error: "not_found" | "fetch_failed" };

// Free fallback: geocode a typed address via Nominatim (OpenStreetMap).
// We cap results to 1 and bias to Egypt. Nominatim's usage policy asks for
// a sensible User-Agent and rate limiting (~1 req/sec); for an onboarding
// form that runs a few times a day this is well within budget.
export async function geocodeAddress(query: string): Promise<GeocodeAddressResult> {
  const q = query.trim();
  if (!q) return { ok: false, error: "not_found" };

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("countrycodes", "eg");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "DentalMap/1.0 (https://dentalmap.app)",
        "Accept-Language": "en,ar",
      },
      // Nominatim is fine with a short cache for repeated queries.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { ok: false, error: "fetch_failed" };
    const rows = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!rows.length) return { ok: false, error: "not_found" };
    const r = rows[0];
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: "not_found" };
    }
    return { ok: true, lat, lng, displayName: r.display_name };
  } catch (e) {
    console.error("[maps] geocode failed:", e);
    return { ok: false, error: "fetch_failed" };
  }
}
