"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LayoutGrid, Map } from "lucide-react";
import { DentistCard } from "./dentist-card";
import type { DentistListItem } from "@/lib/dentists/list";

/* ── lazy-load the Leaflet map to avoid SSR issues ─────────────────────── */
const ClinicMap = dynamic(
  () => import("./clinic-map").then((m) => m.ClinicMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-teal-50 rounded-2xl">
        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    ),
  }
);

type View = "list" | "map";

export function SearchResults({
  dentists,
  locale,
  emptyTitle,
  emptyBody,
}: {
  dentists: DentistListItem[];
  locale: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  const isAr = locale === "ar";
  const [view, setView] = useState<View>("list");
  const [activeId, setActiveId] = useState<string | null>(null);

  const hasMapped = dentists.some(
    (d) => d.clinic.lat != null && d.clinic.lng != null
  );

  return (
    <div>
      {/* view toggle */}
      <div className="flex items-center justify-end gap-1 mb-4">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            view === "list"
              ? "bg-teal-500 text-white shadow-sm"
              : "text-ink-500 hover:text-ink-800 hover:bg-ink-50"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
          {isAr ? "قائمة" : "List"}
        </button>
        <button
          type="button"
          onClick={() => setView("map")}
          disabled={!hasMapped}
          title={
            !hasMapped
              ? isAr
                ? "لا توجد إحداثيات لعرض الخريطة"
                : "No location data to show on map"
              : undefined
          }
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            view === "map"
              ? "bg-teal-500 text-white shadow-sm"
              : "text-ink-500 hover:text-ink-800 hover:bg-ink-50"
          }`}
        >
          <Map className="w-3.5 h-3.5" aria-hidden />
          {isAr ? "خريطة" : "Map"}
        </button>
      </div>

      {/* map view */}
      {view === "map" && (
        <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
          <div className="h-[520px] lg:h-[640px]">
            <ClinicMap
              clinics={dentists}
              locale={locale}
              activeId={activeId}
              onHover={setActiveId}
            />
          </div>
          <div className="flex flex-col gap-3 max-h-[640px] overflow-y-auto pr-1 lg:pr-2">
            {dentists.map((d) => (
              <div
                key={d.clinicDentistId}
                onMouseEnter={() => setActiveId(d.clinicDentistId)}
                onMouseLeave={() => setActiveId(null)}
                className={`rounded-2xl transition-all ${
                  activeId === d.clinicDentistId
                    ? "ring-2 ring-teal-400 ring-offset-1"
                    : ""
                }`}
              >
                <DentistCard d={d} locale={locale} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* list view */}
      {view === "list" && (
        <>
          {dentists.length === 0 ? (
            <div className="rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-card">
              <h3 className="font-display text-[20px] font-bold text-ink-900 mb-2">
                {emptyTitle}
              </h3>
              <p className="text-[14px] text-ink-500 max-w-[44ch] mx-auto">
                {emptyBody}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {dentists.map((d) => (
                <DentistCard key={d.clinicDentistId} d={d} locale={locale} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
