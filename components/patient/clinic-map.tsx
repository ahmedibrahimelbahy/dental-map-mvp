"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression } from "leaflet";
import type { DentistListItem } from "@/lib/dentists/list";

/* ── fix Leaflet's default icon paths (broken by webpack) ──────────────── */
function fixLeafletIcons() {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet") as typeof import("leaflet");
  // @ts-expect-error internal webpack mangling
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

/* ── custom teal pin via DivIcon ───────────────────────────────────────── */
function makePinIcon(active: boolean) {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet") as typeof import("leaflet");
  const bg = active ? "#0f766e" : "#14b8a6";
  const ring = active ? "#ccfbf1" : "white";
  const scale = active ? 1.15 : 1;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:36px; height:36px;
        background:${bg};
        border:2.5px solid ${ring};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg) scale(${scale});
        box-shadow:0 2px 10px rgba(0,0,0,0.22);
        transition:transform 0.15s ease;
      ">
        <svg style="transform:rotate(45deg);display:block;margin:7px auto 0;"
          width="14" height="14" fill="white" viewBox="0 0 24 24">
          <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm4 12H8v-1c0-2.21 2.69-4 4-4s4 1.79 4 4v1z"/>
        </svg>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  });
}

/* ── FlyTo helper: smoothly re-centre when activeId changes ────────────── */
function MapFocus({
  center,
  zoom,
}: {
  center: LatLngExpression | null;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { animate: true, duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

/* ── main component ────────────────────────────────────────────────────── */
export type MapClinic = Pick<
  DentistListItem,
  | "clinicDentistId"
  | "dentistSlug"
  | "nameAr"
  | "nameEn"
  | "feeEgp"
  | "title"
  | "clinic"
  | "specialties"
>;

const CAIRO: LatLngExpression = [30.0444, 31.2357];

export function ClinicMap({
  clinics,
  locale,
  activeId,
  onHover,
}: {
  clinics: MapClinic[];
  locale: string;
  activeId: string | null;
  onHover: (id: string | null) => void;
}) {
  const isAr = locale === "ar";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fixLeafletIcons();
    setReady(true);
  }, []);

  const mapped = clinics.filter(
    (c) => c.clinic.lat != null && c.clinic.lng != null
  );

  const activeClinic = mapped.find((c) => c.clinicDentistId === activeId);
  const focusCenter: LatLngExpression | null =
    activeClinic
      ? [activeClinic.clinic.lat!, activeClinic.clinic.lng!]
      : null;

  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-teal-50 rounded-2xl">
        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-ink-100 shadow-card">
      {mapped.length === 0 && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-3">
          <svg className="w-10 h-10 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-[13px] text-ink-500">
            {isAr ? "لا توجد عيادات بإحداثيات على الخريطة" : "No clinic locations to display"}
          </p>
        </div>
      )}

      <MapContainer
        center={CAIRO}
        zoom={11}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors, © <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {focusCenter && <MapFocus center={focusCenter} zoom={14} />}

        {mapped.map((c) => {
          const isActive = c.clinicDentistId === activeId;
          const icon = makePinIcon(isActive);
          const name = isAr ? c.nameAr : c.nameEn;
          const clinicName = isAr ? c.clinic.nameAr : c.clinic.nameEn;

          return (
            <Marker
              key={c.clinicDentistId}
              position={[c.clinic.lat!, c.clinic.lng!]}
              icon={icon ?? undefined}
              eventHandlers={{
                mouseover: () => onHover(c.clinicDentistId),
                mouseout: () => onHover(null),
              }}
            >
              <Popup>
                <div className="min-w-[180px] font-sans">
                  <div className="font-bold text-[14px] text-ink-900 mb-0.5">{name}</div>
                  <div className="text-[12px] text-ink-500 mb-2">{clinicName}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-ink-900">
                      {c.feeEgp} <span className="text-[11px] font-normal text-ink-400">EGP</span>
                    </span>
                    <a
                      href={`/${locale}/dentist/${c.dentistSlug}`}
                      className="text-[12px] font-semibold text-teal-600 hover:text-teal-700"
                    >
                      {isAr ? "احجز ←" : "Book →"}
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* attribution */}
      <div className="absolute bottom-1 right-1 z-[1000] text-[10px] text-ink-400 bg-white/80 px-1.5 py-0.5 rounded">
        © OpenStreetMap · CARTO
      </div>
    </div>
  );
}
