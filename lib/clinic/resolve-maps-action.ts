"use server";

import { parseGoogleMapsUrl, type LatLng } from "@/lib/clinic/parse-google-maps";

export type ResolveResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: "invalid_url" | "no_coords" | "fetch_failed" };

const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);

// Resolve a Google Maps share URL (long or short) to lat/lng.
// Short URLs need a network redirect to expand; long URLs we parse locally.
export async function resolveGoogleMapsLocation(
  rawUrl: string
): Promise<ResolveResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { ok: false, error: "invalid_url" };

  // First try parsing as-is — handles long URLs and bare lat,lng pairs
  // without any network round-trip.
  const direct = parseGoogleMapsUrl(trimmed);
  if (direct) return { ok: true, ...direct };

  // Short URL? Follow the redirect chain to get the long URL, then parse.
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (!SHORT_HOSTS.has(url.hostname)) {
    return { ok: false, error: "no_coords" };
  }

  try {
    // We have to handle redirects ourselves so we can read intermediate
    // Location headers — fetch's redirect:'follow' would discard them and
    // some Google share endpoints return HTML with the coords in canonical
    // <link> tags instead of a redirect.
    const expanded = await followRedirects(trimmed);
    const parsed = parseGoogleMapsUrl(expanded.finalUrl);
    if (parsed) return { ok: true, ...parsed };

    // Fallback: pull coords from any inline <meta>/<link> in the HTML body.
    const coordsFromHtml = extractCoordsFromHtml(expanded.body);
    if (coordsFromHtml) return { ok: true, ...coordsFromHtml };

    return { ok: false, error: "no_coords" };
  } catch (e) {
    console.error("[maps] resolve failed:", e);
    return { ok: false, error: "fetch_failed" };
  }
}

async function followRedirects(
  startUrl: string,
  maxHops = 5
): Promise<{ finalUrl: string; body: string }> {
  let currentUrl = startUrl;
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        // Google sometimes serves a placeholder page to non-browser UAs.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept-Language": "en-US,en;q=0.9",
      },
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
