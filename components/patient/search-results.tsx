"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { LayoutGrid, Map, Users, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DentistCard } from "./dentist-card";
import { ClinicCard } from "./clinic-card";
import { groupDentistsByClinic } from "@/lib/clinics/list";
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
type Entity = "dentists" | "clinics";

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
  const t = useTranslations("Search");
  const [view, setView] = useState<View>("list");
  const [entity, setEntity] = useState<Entity>("dentists");
  const [activeId, setActiveId] = useState<string | null>(null);

  const hasMapped = dentists.some(
    (d) => d.clinic.lat != null && d.clinic.lng != null
  );

  const clinics = useMemo(() => groupDentistsByClinic(dentists), [dentists]);

  const clinicCardLabels = useMemo(
    () => ({
      feeRange: (min: number, max: number) =>
        t("clinicCardFeeRange", { min, max }),
      specialtyCount: (n: number) => t("clinicCardSpecialtyCount", { n }),
      dentistCount: (n: number) => t("clinicCardDentistCount", { n }),
      bookCta: t("clinicCardBookCta"),
    }),
    [t]
  );

  return (
    <div>
      {/* toggles row */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        {/* entity toggle: Dentists / Clinics */}
        <div className="inline-flex items-center gap-1 rounded-xl bg-ink-50/70 p-1">
          <button
            type="button"
            onClick={() => setEntity("dentists")}
            aria-pressed={entity === "dentists"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              entity === "dentists"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-ink-500 hover:text-ink-800 hover:bg-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" aria-hidden />
            {t("entityDentists")}
          </button>
          <button
            type="button"
            onClick={() => setEntity("clinics")}
            aria-pressed={entity === "clinics"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              entity === "clinics"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-ink-500 hover:text-ink-800 hover:bg-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" aria-hidden />
            {t("entityClinics")}
          </button>
        </div>

        {/* view toggle: List / Map */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
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
            aria-pressed={view === "map"}
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
      </div>

      {/* map view — TODO: entity-aware pin behaviour. For now, map shows
          dentist-card-driven sidebar regardless of entity (clinics view in
          map mode comes in a follow-up). */}
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
          ) : entity === "dentists" ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {dentists.map((d) => (
                <DentistCard key={d.clinicDentistId} d={d} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {clinics.map((c) => (
                <ClinicCard
                  key={c.clinicId}
                  c={c}
                  locale={locale}
                  labels={clinicCardLabels}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
