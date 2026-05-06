import { Link } from "@/i18n/routing";
import { MapPin, ArrowRight, BadgeCheck } from "lucide-react";
import type { DentistListItem } from "@/lib/dentists/list";

const TITLE_LABEL: Record<string, { en: string; ar: string }> = {
  professor: { en: "Professor", ar: "أستاذ" },
  consultant: { en: "Consultant", ar: "استشاري" },
  specialist: { en: "Specialist", ar: "أخصائي" },
  resident: { en: "Resident", ar: "مقيم" },
};

export function DentistCard({
  d,
  locale,
}: {
  d: DentistListItem;
  locale: string;
}) {
  const isAr = locale === "ar";
  const name = isAr ? d.nameAr : d.nameEn;
  const clinicName = isAr ? d.clinic.nameAr : d.clinic.nameEn;
  const area = isAr ? d.clinic.areaNameAr : d.clinic.areaNameEn;
  const titleLabel = TITLE_LABEL[d.title]?.[isAr ? "ar" : "en"] ?? d.title;

  return (
    <Link
      href={`/dentist/${d.dentistSlug}`}
      className="block rounded-2xl bg-white border border-ink-100 p-5 md:p-6 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 hover:border-teal-300 transition-[transform,box-shadow,border-color]"
    >
      <div className="flex items-start gap-4">
        <span className="w-14 h-14 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-display text-[18px] font-bold shrink-0">
          {(d.nameEn ?? "").split(" ").slice(-2).map(s => s[0]).join("")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
            <h3 className="font-display text-[17px] md:text-[19px] font-bold text-ink-900 truncate">
              {name}
            </h3>
            <span className="small-caps text-teal-600">{titleLabel}</span>
          </div>
          {d.specialties.length > 0 && (
            <div className="text-[13.5px] text-ink-600 mb-2">
              {d.specialties
                .map((s) => (isAr ? s.nameAr : s.nameEn))
                .join(" · ")}
            </div>
          )}
          <div className="flex items-center gap-2 text-[13px] text-ink-500">
            <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" aria-hidden />
            <span className="truncate">
              {clinicName}
              {area ? ` · ${area}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-ink-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-[15px]">
            <span className="font-display font-bold text-ink-900">{d.feeEgp}</span>
            <span className="text-ink-500 text-[12.5px]"> EGP</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-500">
            <BadgeCheck className="w-3.5 h-3.5 text-teal-500" aria-hidden />
            {isAr ? "موثق" : "Verified"}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal-600">
          {isAr ? "احجز" : "Book"}
          <ArrowRight
            className="w-3.5 h-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-1"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}
