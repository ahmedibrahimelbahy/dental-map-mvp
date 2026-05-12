"use client";

import { useState, useTransition } from "react";
import { MapPin, Loader2, Check, AlertCircle, ExternalLink } from "lucide-react";
import {
  resolveGoogleMapsLocation,
  geocodeAddress,
} from "@/lib/clinic/resolve-maps-action";
import {
  isInEgypt,
  isValidLatLng,
  parseGoogleMapsUrl,
} from "@/lib/clinic/parse-google-maps";

export type LocationValue = {
  lat: number | null;
  lng: number | null;
  // The raw Google Maps URL the user pasted. Saved alongside lat/lng so the
  // profile page can offer an "Open in Google Maps" link even when the
  // resolved coords are approximate (Google sometimes CAPTCHAs the resolver).
  googleMapsUrl?: string | null;
};

export type LocationPickerLabels = {
  title: string;
  body: string;
  urlLabel: string;
  urlHint: string;
  urlPlaceholder: string;
  resolveBtn: string;
  resolving: string;
  resolved: string;
  errorInvalid: string;
  errorNoCoords: string;
  errorFetch: string;
  manualToggle: string;
  manualLat: string;
  manualLng: string;
  previewLabel: string;
  outsideEgypt: string;
  geocodeFallbackCta: string;
  geocodeNotFound: string;
  required: string;
};

export function LocationPicker({
  value,
  onChange,
  labels,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  labels: LocationPickerLabels;
}) {
  const [url, setUrl] = useState("");
  const [resolving, startResolving] = useTransition();
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const hasCoords = isValidLatLng(value.lat ?? NaN, value.lng ?? NaN);
  const outsideEgypt =
    hasCoords && !isInEgypt(value.lat as number, value.lng as number);

  function handleResolve() {
    setError(null);
    setResolved(false);

    // Synchronous parse first — covers long URLs + bare "lat,lng" without
    // a network round-trip.
    const quick = parseGoogleMapsUrl(url);
    if (quick) {
      onChange({ lat: quick.lat, lng: quick.lng, googleMapsUrl: url });
      setResolved(true);
      return;
    }

    startResolving(async () => {
      // Treat the input as a URL first (most common); if that fails, try
      // it as a freeform address via Nominatim.
      const r = await resolveGoogleMapsLocation(url);
      if (r.ok) {
        onChange({ lat: r.lat, lng: r.lng, googleMapsUrl: url });
        setResolved(true);
        return;
      }
      const g = await geocodeAddress(url);
      if (g.ok) {
        // Geocode came from a typed address, not a Maps URL — store the
        // address as the URL too so "Open in Maps" still navigates there.
        onChange({ lat: g.lat, lng: g.lng, googleMapsUrl: null });
        setResolved(true);
        return;
      }
      setError(
        r.error === "invalid_url"
          ? labels.errorInvalid
          : r.error === "fetch_failed"
            ? labels.errorFetch
            : labels.geocodeNotFound
      );
    });
  }

  return (
    <section className="rounded-2xl bg-white border border-ink-100 p-5 md:p-7 shadow-card space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 grid place-items-center shrink-0">
          <MapPin className="w-5 h-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[16px] md:text-[18px] font-bold text-ink-900">
            {labels.title}
            <span className="text-rose-600 ms-1">*</span>
          </h3>
          <p className="text-[12.5px] md:text-[13px] leading-[1.55] text-ink-600 mt-1">
            {labels.body}
          </p>
        </div>
      </div>

      <div>
        <label className="field-label">{labels.urlLabel}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setResolved(false);
              setError(null);
            }}
            placeholder={labels.urlPlaceholder}
            className="field-input flex-1"
            dir="ltr"
          />
          <button
            type="button"
            onClick={handleResolve}
            disabled={!url.trim() || resolving}
            className="btn-primary !py-2.5 !px-4 !text-[13.5px] inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
          >
            {resolving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                {labels.resolving}
              </>
            ) : (
              labels.resolveBtn
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-500 leading-[1.5]">
          {labels.urlHint}
        </p>
      </div>

      {/* Resolved confirmation OR error */}
      {resolved && hasCoords && (
        <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 flex items-start gap-2.5 text-[13px] text-teal-900">
          <Check className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <div className="font-bold">{labels.resolved}</div>
            <div className="mt-0.5 font-mono text-[12px] tabular-nums">
              {value.lat?.toFixed(6)}, {value.lng?.toFixed(6)}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-[13px] text-rose-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {outsideEgypt && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-[13px] text-amber-900">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          <span>{labels.outsideEgypt}</span>
        </div>
      )}

      {/* Manual lat/lng fallback */}
      <div>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="text-[12.5px] font-bold text-teal-700 hover:text-teal-800 underline-offset-2 hover:underline"
        >
          {labels.manualToggle}
        </button>
        {showManual && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">{labels.manualLat}</span>
              <input
                type="number"
                step="any"
                value={value.lat ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : parseFloat(e.target.value);
                  onChange({ lat: v, lng: value.lng, googleMapsUrl: value.googleMapsUrl ?? null });
                  setResolved(false);
                }}
                placeholder="30.0444"
                className="field-input"
                dir="ltr"
              />
            </label>
            <label className="block">
              <span className="field-label">{labels.manualLng}</span>
              <input
                type="number"
                step="any"
                value={value.lng ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : parseFloat(e.target.value);
                  onChange({ lat: value.lat, lng: v, googleMapsUrl: value.googleMapsUrl ?? null });
                  setResolved(false);
                }}
                placeholder="31.2357"
                className="field-input"
                dir="ltr"
              />
            </label>
          </div>
        )}
      </div>

      {/* Live preview — OSM embed shows the chosen pin */}
      {hasCoords && (
        <div>
          <div className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">
            {labels.previewLabel}
          </div>
          <div className="rounded-xl overflow-hidden border border-ink-200 aspect-[16/9] relative">
            <iframe
              key={`${value.lat}-${value.lng}`}
              src={osmEmbedUrl(value.lat as number, value.lng as number)}
              className="w-full h-full"
              loading="lazy"
              title="Clinic location preview"
            />
          </div>
          <a
            href={`https://www.google.com/maps/?q=${value.lat},${value.lng}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-teal-700 hover:text-teal-800 underline-offset-2 hover:underline"
          >
            <ExternalLink className="w-3 h-3" aria-hidden />
            Open in Google Maps
          </a>
        </div>
      )}
    </section>
  );
}

// Small bounding box around the pin so the embed renders zoomed in on the
// clinic, not the whole region.
function osmEmbedUrl(lat: number, lng: number): string {
  const d = 0.005; // ~500m at Cairo latitude
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}
