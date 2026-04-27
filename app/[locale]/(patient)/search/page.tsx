import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listDentists } from "@/lib/dentists/list";
import { DentistCard } from "@/components/patient/dentist-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { Search as SearchIcon, MapPin, BadgeDollarSign } from "lucide-react";

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
  const isAr = locale === "ar";

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
    <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <SearchIcon className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="display-h2 text-[28px] md:text-[36px] text-ink-900">
          {t("headerTitle")}
        </h1>
      </div>
      <p className="text-[14px] text-ink-500 mb-8">
        {t("resultsCount", { count: dentists.length })}
      </p>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        {/* Filters */}
        <aside className="lg:sticky lg:top-24 self-start">
          <form
            action="/search"
            method="get"
            className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card space-y-5"
          >
            <h2 className="font-display text-[15px] font-bold text-ink-900">
              {t("filtersTitle")}
            </h2>

            <div>
              <label className="field-label" htmlFor="specialty">
                {t("filterAnySpecialty")}
              </label>
              <select
                id="specialty"
                name="specialty"
                defaultValue={sp.specialty ?? ""}
                className="field-input !py-2.5 !text-[14px]"
              >
                <option value="">{t("filterAnySpecialty")}</option>
                {(specialties ?? []).map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {isAr ? s.name_ar : s.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="area">
                {t("filterAnyArea")}
              </label>
              <select
                id="area"
                name="area"
                defaultValue={sp.area ?? ""}
                className="field-input !py-2.5 !text-[14px]"
              >
                <option value="">{t("filterAnyArea")}</option>
                {(areas ?? []).map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {isAr ? a.name_ar : a.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="feeMax">
                {t("filterFeeMax")}
              </label>
              <input
                id="feeMax"
                name="feeMax"
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                defaultValue={sp.feeMax ?? ""}
                placeholder="—"
                className="field-input !py-2.5 !text-[14px]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary !py-2 !px-4 !text-[13px] flex-1">
                {t("filterApply")}
              </button>
              <Link
                href="/search"
                className="btn-secondary !py-2 !px-4 !text-[13px]"
              >
                {t("filterReset")}
              </Link>
            </div>
          </form>
        </aside>

        {/* Results */}
        <div>
          {dentists.length === 0 ? (
            <div className="rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-card">
              <h3 className="font-display text-[20px] font-bold text-ink-900 mb-2">
                {t("emptyTitle")}
              </h3>
              <p className="text-[14px] text-ink-500 max-w-[44ch] mx-auto">
                {t("emptyBody")}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {dentists.map((d) => (
                <DentistCard key={d.clinicDentistId} d={d} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
