import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  Stethoscope,
  Baby,
  Smile,
  Sparkles,
  HeartPulse,
  Zap,
  Scissors,
  ArrowRight,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDentists, type DentistListItem } from "@/lib/dentists/list";

export const dynamic = "force-dynamic";

const SPECIALTY_ORDER: Array<{ slug: string; Icon: LucideIcon }> = [
  { slug: "adult", Icon: Stethoscope },
  { slug: "pediatric", Icon: Baby },
  { slug: "orthodontics", Icon: Smile },
  { slug: "cosmetic", Icon: Sparkles },
  { slug: "endodontics", Icon: HeartPulse },
  { slug: "implants", Icon: Zap },
  { slug: "oral-surgery", Icon: Scissors },
];

type SpecialtyRow = {
  slug: string;
  name_ar: string;
  name_en: string;
};

export default async function SpecialtiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Specialties");
  const isAr = locale === "ar";

  // 1) Pull all specialties from Supabase
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("specialties")
    .select("slug, name_ar, name_en")
    .returns<SpecialtyRow[]>();

  const bySlug = new Map<string, SpecialtyRow>();
  for (const r of rows ?? []) bySlug.set(r.slug, r);

  // 2) For each specialty in our defined order, fetch top dentists in parallel
  const specialtyData = await Promise.all(
    SPECIALTY_ORDER.map(async ({ slug, Icon }) => {
      const row = bySlug.get(slug);
      if (!row) return null;
      const all = await listDentists({ specialtySlug: slug });
      const top = all.slice(0, 3);
      return { slug, Icon, row, top };
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
            {specialtyData.map((item) => {
              if (!item) return null;
              const { slug, Icon, row, top } = item;
              const name = isAr ? row.name_ar : row.name_en;
              const altName = isAr ? row.name_en : row.name_ar;
              return (
                <SpecialtyCard
                  key={slug}
                  slug={slug}
                  Icon={Icon}
                  name={name}
                  altName={altName}
                  description={t(`desc.${slug}`)}
                  topDentists={top}
                  locale={locale}
                  viewAllLabel={t("viewAll", { name })}
                  topDentistsLabel={t("topDentists")}
                  feeLabel={t("feeLabel")}
                  emptyLabel={t("noneYet")}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function SpecialtyCard({
  slug,
  Icon,
  name,
  altName,
  description,
  topDentists,
  locale,
  viewAllLabel,
  topDentistsLabel,
  feeLabel,
  emptyLabel,
}: {
  slug: string;
  Icon: LucideIcon;
  name: string;
  altName: string;
  description: string;
  topDentists: DentistListItem[];
  locale: string;
  viewAllLabel: string;
  topDentistsLabel: string;
  feeLabel: string;
  emptyLabel: string;
}) {
  const isAr = locale === "ar";

  return (
    <article className="group rounded-2xl bg-white border border-ink-100 shadow-card hover:shadow-card-hover hover:border-teal-200 transition-shadow flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-7 pb-5 border-b border-ink-100">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 shadow-[0_6px_18px_-10px_rgba(30,165,143,0.55)]">
            <Icon className="w-6 h-6 md:w-7 md:h-7" aria-hidden />
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

      {/* Top dentists */}
      <div className="px-6 md:px-7 py-5 flex-1">
        <div className="small-caps text-teal-600 mb-3">{topDentistsLabel}</div>
        {topDentists.length === 0 ? (
          <p className="text-[13.5px] text-ink-400 italic">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {topDentists.map((d) => {
              const dName = isAr ? d.nameAr : d.nameEn;
              const area =
                (isAr ? d.clinic.areaNameAr : d.clinic.areaNameEn) ?? "";
              return (
                <li key={d.clinicDentistId}>
                  <Link
                    href={`/dentist/${d.dentistSlug}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-teal-50/60 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-display text-[12px] font-bold shrink-0">
                      {(d.nameEn ?? "")
                        .split(" ")
                        .slice(-2)
                        .map((s) => s[0])
                        .join("")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-ink-900 truncate">
                        {dName}
                      </div>
                      {area && (
                        <div className="flex items-center gap-1 text-[12px] text-ink-500 truncate">
                          <MapPin
                            className="w-3 h-3 text-teal-500 shrink-0"
                            aria-hidden
                          />
                          <span className="truncate">{area}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-[13px] text-ink-700 shrink-0 text-end">
                      <span className="font-display font-bold">{d.feeEgp}</span>
                      <span className="text-ink-400 text-[11px]">
                        {" "}
                        {feeLabel}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer link */}
      <div className="px-6 md:px-7 pb-6 pt-2">
        <Link
          href={`/search?specialty=${slug}`}
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
