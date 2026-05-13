import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getClinicBySlug } from "@/lib/clinics/list";
import { SlotGrid } from "@/components/patient/slot-grid";
import {
  MapPin,
  Phone,
  Navigation,
  Stethoscope,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";

const TITLE_LABEL: Record<string, { en: string; ar: string }> = {
  professor: { en: "Professor", ar: "أستاذ" },
  consultant: { en: "Consultant", ar: "استشاري" },
  specialist: { en: "Specialist", ar: "أخصائي" },
  resident: { en: "Resident", ar: "مقيم" },
};

export default async function ClinicProfile({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const result = await getClinicBySlug(slug);
  if (!result) notFound();

  const t = await getTranslations("Profile");
  const isAr = locale === "ar";
  const { clinic, links, specsByDentist } = result;

  const name = isAr ? clinic.name_ar : clinic.name_en;
  const address = isAr ? clinic.address_ar : clinic.address_en;
  const areaName = isAr ? clinic.area?.name_ar : clinic.area?.name_en;

  const mapsHref =
    clinic.google_maps_url ||
    (clinic.lat != null && clinic.lng != null
      ? `https://www.google.com/maps/?q=${clinic.lat},${clinic.lng}`
      : null);

  // Collect all unique specialties across dentists in this clinic
  const allSpecs = new Map<string, { nameAr: string; nameEn: string }>();
  for (const link of links) {
    for (const s of specsByDentist.get(link.dentist!.id) ?? []) {
      allSpecs.set(s.slug, { nameAr: s.nameAr, nameEn: s.nameEn });
    }
  }

  const primaryLink = links[0];

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-10 md:py-14">
      {/* Hero banner */}
      {clinic.hero_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={clinic.hero_image_url}
          alt=""
          className="w-full h-44 md:h-64 rounded-2xl object-cover mb-8 border border-ink-100 shadow-card"
          loading="eager"
          aria-hidden
        />
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Left */}
        <div className="space-y-8">
          {/* Clinic header */}
          <header>
            <div className="flex items-start gap-5 mb-4">
              {clinic.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clinic.logo_url}
                  alt={clinic.name_en}
                  className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-ink-100 shadow-card"
                  loading="eager"
                />
              ) : (
                <span className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-display text-[22px] font-bold shrink-0">
                  {(clinic.name_en ?? "")
                    .split(" ")
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="display-h2 text-[28px] md:text-[36px] text-ink-900 mb-1">
                  {name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-ink-500">
                  {(address || areaName) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" aria-hidden />
                      {address ?? areaName}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-teal-700 font-semibold">
                    <BadgeCheck className="w-3.5 h-3.5 text-teal-500" aria-hidden />
                    {isAr ? "موثق" : "Verified"}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Specialties */}
          {allSpecs.size > 0 && (
            <section>
              <h2 className="small-caps text-ink-400 mb-3">
                <Stethoscope className="inline w-3.5 h-3.5 me-1.5 text-teal-500" />
                {t("specialties")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {Array.from(allSpecs.values()).map((s) => (
                  <span
                    key={s.nameEn}
                    className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-[13px] font-semibold border border-teal-100"
                  >
                    {isAr ? s.nameAr : s.nameEn}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Dentist list */}
          <section>
            <h2 className="small-caps text-ink-400 mb-4">
              {isAr ? "أطباء العيادة" : "Our dentists"}
            </h2>
            <div className="space-y-3">
              {links.map((link) => {
                const d = link.dentist!;
                const dName = isAr ? d.name_ar : d.name_en;
                const titleLabel =
                  TITLE_LABEL[d.title]?.[isAr ? "ar" : "en"] ?? d.title;
                const specs = specsByDentist.get(d.id) ?? [];
                const initials = (d.name_en ?? "")
                  .split(" ")
                  .slice(-2)
                  .map((s) => s[0])
                  .join("");

                return (
                  <Link
                    key={link.id}
                    href={`/dentist/${d.slug}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-ink-100 shadow-card hover:shadow-card-hover hover:border-teal-300 hover:-translate-y-0.5 transition-[transform,box-shadow,border-color]"
                  >
                    {d.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.photo_url}
                        alt={d.name_en}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-ink-100"
                        loading="lazy"
                      />
                    ) : (
                      <span className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-display text-[16px] font-bold shrink-0">
                        {initials}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-0.5">
                        <span className="font-display text-[16px] font-bold text-ink-900 truncate">
                          {dName}
                        </span>
                        <span className="small-caps text-teal-600 text-[12px]">
                          {titleLabel}
                        </span>
                      </div>
                      {specs.length > 0 && (
                        <p className="text-[12.5px] text-ink-500 truncate">
                          {specs
                            .map((s) => (isAr ? s.nameAr : s.nameEn))
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-end">
                      <div className="font-display text-[15px] font-bold text-ink-900">
                        {link.fee_egp}
                        <span className="text-[11px] text-ink-500 font-medium ms-0.5">
                          EGP
                        </span>
                      </div>
                      <ArrowRight
                        className="w-4 h-4 text-teal-500 mt-1 ms-auto rtl:rotate-180"
                        aria-hidden
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Slot picker for primary dentist */}
          {primaryLink && (
            <section>
              <h2 className="small-caps text-ink-400 mb-4">
                {isAr ? "أقرب موعد متاح" : "Next available slot"}
              </h2>
              <SlotGrid
                clinicDentistId={primaryLink.id}
                locale={locale}
                t={{
                  title: t("pickSlotTitle"),
                  subtitle: isAr
                    ? `مع ${isAr ? primaryLink.dentist!.name_ar : primaryLink.dentist!.name_en}`
                    : `With ${primaryLink.dentist!.name_en}`,
                  noSlots: t("noSlots"),
                  loading: t("loadingSlots"),
                  book: t("bookSlot"),
                }}
              />
            </section>
          )}
        </div>

        {/* Right: clinic info card */}
        <aside className="lg:sticky lg:top-24 self-start">
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card space-y-4 text-[13.5px]">
            <div className="small-caps text-ink-400">
              {isAr ? "معلومات العيادة" : "Clinic info"}
            </div>

            {(address || areaName) && (
              <div className="flex items-start gap-2.5 text-ink-600">
                <MapPin className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" aria-hidden />
                <span>{address ?? areaName}</span>
              </div>
            )}

            {clinic.phone && (
              <div className="flex items-center gap-2.5 text-ink-600">
                <Phone className="w-4 h-4 text-teal-500 shrink-0" aria-hidden />
                <a
                  href={`tel:${clinic.phone}`}
                  className="hover:text-teal-700 transition-colors"
                >
                  {clinic.phone}
                </a>
              </div>
            )}

            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 text-[12.5px] font-bold hover:bg-teal-100 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" aria-hidden />
                {isAr ? "افتح في خرائط جوجل" : "Open in Google Maps"}
              </a>
            )}

            <div className="border-t border-ink-100 pt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="font-display text-[24px] font-bold text-ink-900 leading-none mb-1">
                  {links.length}
                </div>
                <div className="text-[12px] text-ink-500">
                  {isAr ? "طبيب" : links.length === 1 ? "dentist" : "dentists"}
                </div>
              </div>
              <div>
                <div className="font-display text-[24px] font-bold text-ink-900 leading-none mb-1">
                  {allSpecs.size}
                </div>
                <div className="text-[12px] text-ink-500">
                  {isAr ? "تخصص" : allSpecs.size === 1 ? "specialty" : "specialties"}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
