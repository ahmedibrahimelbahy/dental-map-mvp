import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getDentistBySlug } from "@/lib/dentists/list";
import { SlotGrid } from "@/components/patient/slot-grid";
import { MapPin, Stethoscope, BadgeCheck } from "lucide-react";

const TITLE_LABEL: Record<string, { en: string; ar: string }> = {
  professor: { en: "Professor", ar: "أستاذ" },
  consultant: { en: "Consultant", ar: "استشاري" },
  specialist: { en: "Specialist", ar: "أخصائي" },
  resident: { en: "Resident", ar: "مقيم" },
};

export default async function DentistProfile({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await getDentistBySlug(slug);
  if (!data) notFound();

  const t = await getTranslations("Profile");
  const isAr = locale === "ar";
  const { dentist, links, specialties } = data;
  const primary = links[0];
  const name = isAr ? dentist.name_ar : dentist.name_en;
  const bio = (isAr ? dentist.bio_ar : dentist.bio_en) ?? null;
  const titleLabel = TITLE_LABEL[dentist.title]?.[isAr ? "ar" : "en"] ?? dentist.title;

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-10 md:py-14 grid lg:grid-cols-[1fr_380px] gap-8">
      {/* Left: profile */}
      <div className="space-y-8">
        <header>
          <div className="flex items-start gap-5 mb-5">
            <span className="w-20 h-20 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-display text-[22px] font-bold shrink-0">
              {(dentist.name_en ?? "")
                .split(" ")
                .slice(-2)
                .map((s) => s[0])
                .join("")}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                <h1 className="display-h2 text-[28px] md:text-[36px] text-ink-900">
                  {name}
                </h1>
                <span className="small-caps text-teal-600">{titleLabel}</span>
              </div>
              {dentist.years_experience != null && (
                <p className="text-[14px] text-ink-500">
                  {t("experience", { years: dentist.years_experience })}
                </p>
              )}
            </div>
          </div>

          {primary && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-ink-600">
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-500" aria-hidden />
                {t("atClinic")}{" "}
                <span className="font-semibold text-ink-800">
                  {isAr ? primary.clinic!.name_ar : primary.clinic!.name_en}
                </span>
                {primary.clinic!.area && (
                  <span className="text-ink-500">
                    ·{" "}
                    {isAr
                      ? primary.clinic!.area.name_ar
                      : primary.clinic!.area.name_en}
                  </span>
                )}
              </span>
              <span className="inline-flex items-center gap-2 text-[13px] text-teal-700 font-semibold">
                <BadgeCheck className="w-4 h-4 text-teal-500" aria-hidden />
                {isAr ? "موثق" : "Verified"}
              </span>
            </div>
          )}
        </header>

        {specialties.length > 0 && (
          <section>
            <h2 className="small-caps text-ink-400 mb-3">
              <Stethoscope className="inline w-3.5 h-3.5 me-1.5 text-teal-500" />
              {t("specialties")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {specialties.map((s) => (
                <span
                  key={s.slug}
                  className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-[13px] font-semibold border border-teal-100"
                >
                  {isAr ? s.name_ar : s.name_en}
                </span>
              ))}
            </div>
          </section>
        )}

        {bio && (
          <section>
            <h2 className="small-caps text-ink-400 mb-3">{t("about")}</h2>
            <p className="text-[15px] leading-[1.7] text-ink-700">{bio}</p>
          </section>
        )}

        {primary && (
          <SlotGrid
            clinicDentistId={primary.id}
            locale={locale}
            t={{
              title: t("pickSlotTitle"),
              subtitle: t("pickSlotSubtitle"),
              noSlots: t("noSlots"),
              loading: t("loadingSlots"),
              book: t("bookSlot"),
            }}
          />
        )}
      </div>

      {/* Right: fee + clinic info card */}
      <aside className="lg:sticky lg:top-24 self-start">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <div className="small-caps text-ink-400 mb-2">{t("fee")}</div>
          <div className="font-display text-[36px] font-bold text-ink-900 leading-none mb-1">
            {primary?.fee_egp ?? "—"}
            <span className="text-[16px] text-ink-500 font-medium ms-1.5">EGP</span>
          </div>
          <div className="text-[12.5px] text-ink-500 mb-5">
            {primary
              ? `${primary.slot_minutes} min · ${primary.calendar_mode === "google" ? "Live calendar" : "Manual"}`
              : ""}
          </div>

          {primary?.clinic && (
            <div className="border-t border-ink-100 pt-4 text-[13px] text-ink-600 space-y-1">
              <div className="font-semibold text-ink-800">
                {isAr ? primary.clinic.name_ar : primary.clinic.name_en}
              </div>
              {(isAr ? primary.clinic.address_ar : primary.clinic.address_en) && (
                <div className="flex items-start gap-2">
                  <MapPin
                    className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0"
                    aria-hidden
                  />
                  <span>
                    {isAr ? primary.clinic.address_ar : primary.clinic.address_en}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
