import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowRight, MapPin, Building2, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listClinicsByArea,
  type ClinicListItem,
} from "@/lib/clinics/list";

export const dynamic = "force-dynamic";

// Order to render the cards in. Other areas in the DB still appear after these.
const FEATURED_ORDER = [
  "zamalek",
  "nasr-city",
  "maadi",
  "heliopolis",
  "mohandessin",
  "6-october",
];

type AreaRow = {
  slug: string;
  name_ar: string;
  name_en: string;
};

export default async function AreasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Areas");
  const isAr = locale === "ar";

  // 1) Fetch all areas
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("areas")
    .select("slug, name_ar, name_en")
    .returns<AreaRow[]>();

  const allAreas: AreaRow[] = rows ?? [];

  // Sort: featured first (in their defined order), then the rest by EN name
  const sortedAreas = [...allAreas].sort((a, b) => {
    const ai = FEATURED_ORDER.indexOf(a.slug);
    const bi = FEATURED_ORDER.indexOf(b.slug);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name_en.localeCompare(b.name_en);
  });

  // 2) For each area, fetch top clinics in parallel
  const areaData = await Promise.all(
    sortedAreas.map(async (row) => {
      const clinics = await listClinicsByArea(row.slug, 3);
      return { row, clinics };
    })
  );

  return (
    <div>
      {/* HERO */}
      <section className="hero-wash border-b border-ink-100">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-10 md:pb-16">
          <div className="max-w-[760px]">
            <span className="chip mb-5">
              <span className="chip-dot" />
              {t("eyebrow")}
            </span>
            <h1 className="display-h1 text-[36px] md:text-[60px] lg:text-[68px] text-ink-900">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 md:mt-6 text-[16px] md:text-[18px] leading-[1.6] text-ink-500 max-w-[60ch]">
              {t("heroSubtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* CARDS */}
      <section>
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-12 md:py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {areaData.map(({ row, clinics }) => {
              const name = isAr ? row.name_ar : row.name_en;
              const altName = isAr ? row.name_en : row.name_ar;
              const descKey = `desc.${row.slug}` as const;
              const description = t.has(descKey)
                ? t(descKey)
                : t("desc.default");
              return (
                <AreaCard
                  key={row.slug}
                  slug={row.slug}
                  name={name}
                  altName={altName}
                  description={description}
                  clinics={clinics}
                  locale={locale}
                  topClinicsLabel={t("topClinics")}
                  emptyLabel={t("noneYet")}
                  viewAllLabel={t("viewAll", { area: name })}
                  feeFromLabel={t("feeFrom")}
                  feeUnitLabel={t("feeUnit")}
                  dentistsLabel={(n: number) => t("dentistCount", { count: n })}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function AreaCard({
  slug,
  name,
  altName,
  description,
  clinics,
  locale,
  topClinicsLabel,
  emptyLabel,
  viewAllLabel,
  feeFromLabel,
  feeUnitLabel,
  dentistsLabel,
}: {
  slug: string;
  name: string;
  altName: string;
  description: string;
  clinics: ClinicListItem[];
  locale: string;
  topClinicsLabel: string;
  emptyLabel: string;
  viewAllLabel: string;
  feeFromLabel: string;
  feeUnitLabel: string;
  dentistsLabel: (n: number) => string;
}) {
  const isAr = locale === "ar";

  return (
    <article className="group rounded-2xl bg-white border border-ink-100 shadow-card hover:shadow-card-hover hover:border-teal-200 transition-shadow flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-7 pb-5 border-b border-ink-100">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 shadow-[0_6px_18px_-10px_rgba(30,165,143,0.55)]">
            <MapPin className="w-6 h-6 md:w-7 md:h-7" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="display-h3 text-[20px] md:text-[22px] text-ink-900 leading-tight">
              {name}
            </h2>
            <span className="small-caps text-ink-400 mt-1.5 block">
              {altName}
            </span>
          </div>
        </div>
        <p className="mt-4 text-[14.5px] leading-[1.65] text-ink-500">
          {description}
        </p>
      </div>

      {/* Top clinics */}
      <div className="px-6 md:px-7 py-5 flex-1">
        <div className="small-caps text-teal-600 mb-3">{topClinicsLabel}</div>
        {clinics.length === 0 ? (
          <p className="text-[13.5px] text-ink-400 italic">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {clinics.map((c) => {
              const cName = isAr ? c.nameAr : c.nameEn;
              return (
                <li key={c.clinicId}>
                  <div className="flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2">
                    <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" aria-hidden />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-ink-900 truncate">
                        {cName}
                      </div>
                      <div className="flex items-center gap-1 text-[12px] text-ink-500">
                        <Users
                          className="w-3 h-3 text-teal-500 shrink-0"
                          aria-hidden
                        />
                        <span>{dentistsLabel(c.dentistCount)}</span>
                      </div>
                    </div>
                    {c.feeFromEgp !== null && (
                      <div className="text-[13px] text-ink-700 shrink-0 text-end">
                        <span className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-400">
                          {feeFromLabel}
                        </span>
                        <span className="font-display font-bold">
                          {c.feeFromEgp}
                        </span>
                        <span className="text-ink-400 text-[11px]">
                          {" "}
                          {feeUnitLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer link */}
      <div className="px-6 md:px-7 pb-6 pt-2">
        <Link
          href={`/search?area=${slug}`}
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-teal-600 hover:text-teal-700 transition-colors"
        >
          {viewAllLabel}
          <ArrowRight
            className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </article>
  );
}
