import { setRequestLocale, getTranslations } from "next-intl/server";
import { listDentists } from "@/lib/dentists/list";
import { SearchResults } from "@/components/patient/search-results";
import { SearchFilters } from "@/components/patient/search-filters";
import { createAdminClient } from "@/lib/supabase/admin";
import { Search as SearchIcon } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = {
  specialty?: string;
  area?: string;
  feeMax?: string;
};

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SP>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Search");

  const admin = createAdminClient();
  const [{ data: specialties }, { data: areas }] = await Promise.all([
    admin
      .from("specialties")
      .select("slug, name_ar, name_en")
      .order("name_en")
      .returns<{ slug: string; name_ar: string; name_en: string }[]>(),
    admin
      .from("areas")
      .select("slug, name_ar, name_en")
      .order("name_en")
      .returns<{ slug: string; name_ar: string; name_en: string }[]>(),
  ]);

  const dentists = await listDentists({
    specialtySlug: sp.specialty,
    areaSlug: sp.area,
    feeMax: sp.feeMax ? parseInt(sp.feeMax, 10) : undefined,
  });

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-5 md:px-8 py-8 md:py-14">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <SearchIcon className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="display-h2 text-[24px] sm:text-[28px] md:text-[36px] text-ink-900 leading-tight">
          {t("headerTitle")}
        </h1>
      </div>
      <p className="text-[13.5px] text-ink-500 mb-6 md:mb-8">
        {t("resultsCount", { count: dentists.length })}
      </p>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6 lg:gap-8">
        <SearchFilters
          specialties={specialties ?? []}
          areas={areas ?? []}
          current={sp}
          locale={locale}
          labels={{
            title: t("filtersTitle"),
            anySpecialty: t("filterAnySpecialty"),
            anyArea: t("filterAnyArea"),
            feeMax: t("filterFeeMax"),
            apply: t("filterApply"),
            reset: t("filterReset"),
            showFilters: t("showFilters"),
          }}
        />

        {/* Results — client island with list/map toggle */}
        <SearchResults
          dentists={dentists}
          locale={locale}
          emptyTitle={t("emptyTitle")}
          emptyBody={t("emptyBody")}
        />
      </div>
    </div>
  );
}
