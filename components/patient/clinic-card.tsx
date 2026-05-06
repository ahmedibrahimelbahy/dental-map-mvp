"use client";

import { Link } from "@/i18n/routing";
import { MapPin, ArrowRight, BadgeCheck, Building2 } from "lucide-react";
import type { ClinicGroup } from "@/lib/clinics/list";

const TITLE_LABEL: Record<string, { en: string; ar: string }> = {
  professor: { en: "Professor", ar: "أستاذ" },
  consultant: { en: "Consultant", ar: "استشاري" },
  specialist: { en: "Specialist", ar: "أخصائي" },
  resident: { en: "Resident", ar: "مقيم" },
};

export function ClinicCard({
  c,
  locale,
  labels,
}: {
  c: ClinicGroup;
  locale: string;
  labels: {
    feeRange: (min: number, max: number) => string;
    specialtyCount: (n: number) => string;
    dentistCount: (n: number) => string;
    bookCta: string;
  };
}) {
  const isAr = locale === "ar";
  const name = isAr ? c.nameAr : c.nameEn;
  const area = isAr ? c.areaNameAr : c.areaNameEn;
  const address = isAr ? c.addressAr : c.addressEn;

  const feeText =
    c.maxFeeEgp > c.minFeeEgp
      ? labels.feeRange(c.minFeeEgp, c.maxFeeEgp)
      : `EGP ${c.minFeeEgp}`;

  // CTA target: route to the first dentist's profile for now (no clinic filter yet)
  const firstDentistSlug = c.dentists[0]?.dentistSlug ?? "";

  return (
    <article className="rounded-2xl bg-white border border-ink-100 p-5 md:p-6 shadow-card hover:shadow-card-hover hover:border-teal-300 transition-[box-shadow,border-color]">
      <header className="flex items-start gap-4">
        <span className="w-14 h-14 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[17px] md:text-[19px] font-bold text-ink-900 truncate mb-1">
            {name}
          </h3>
          <div className="flex items-center gap-2 text-[13px] text-ink-500">
            <MapPin
              className="w-3.5 h-3.5 text-teal-500 shrink-0"
              aria-hidden
            />
            <span className="truncate">
              {address ? address : null}
              {address && area ? " · " : null}
              {area}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-500">
            <span className="font-display text-ink-900 text-[14px] font-bold">
              {feeText}
            </span>
            <span className="inline-flex items-center gap-1">
              <BadgeCheck
                className="w-3.5 h-3.5 text-teal-500"
                aria-hidden
              />
              {labels.dentistCount(c.dentists.length)}
            </span>
            {c.specialtyCount > 0 && (
              <span>· {labels.specialtyCount(c.specialtyCount)}</span>
            )}
          </div>
        </div>
      </header>

      {/* mini dentist list */}
      <ul className="mt-4 pt-4 border-t border-ink-100 flex flex-col gap-2">
        {c.dentists.map((d) => {
          const dName = isAr ? d.nameAr : d.nameEn;
          const titleLabel =
            TITLE_LABEL[d.title]?.[isAr ? "ar" : "en"] ?? d.title;
          const initials = (d.nameEn ?? "")
            .split(" ")
            .slice(-2)
            .map((s) => s[0])
            .join("");
          return (
            <li key={d.clinicDentistId}>
              <Link
                href={`/dentist/${d.dentistSlug}`}
                className="flex items-center gap-3 px-2 py-2 -mx-2 rounded-lg hover:bg-teal-50/60 focus-visible:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 transition-colors"
              >
                <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-display text-[13px] font-bold shrink-0">
                  {initials}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold text-ink-900 truncate">
                    {dName}
                  </span>
                  <span className="block text-[12px] text-ink-500 truncate">
                    <span className="small-caps text-teal-600">
                      {titleLabel}
                    </span>
                    {d.specialties.length > 0 ? " · " : ""}
                    {d.specialties
                      .map((s) => (isAr ? s.nameAr : s.nameEn))
                      .join(" · ")}
                  </span>
                </span>
                <span className="text-[13px] font-display font-bold text-ink-900 shrink-0">
                  {d.feeEgp}
                  <span className="text-[11px] text-ink-500"> EGP</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <footer className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-end">
        {firstDentistSlug && (
          <Link
            href={`/dentist/${firstDentistSlug}`}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal-600 hover:text-teal-700 transition-colors"
          >
            {labels.bookCta}
            <ArrowRight
              className="w-3.5 h-3.5 rtl:rotate-180"
              aria-hidden
            />
          </Link>
        )}
      </footer>
    </article>
  );
}
