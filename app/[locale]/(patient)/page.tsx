import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Search, MapPin, ArrowRight } from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");

  const specialties = [
    { key: "specialtyAdult", slug: "adult" },
    { key: "specialtyPediatric", slug: "pediatric" },
    { key: "specialtyOrtho", slug: "orthodontics" },
    { key: "specialtyCosmetic", slug: "cosmetic" },
    { key: "specialtyEndo", slug: "endodontics" },
    { key: "specialtyImplants", slug: "implants" },
    { key: "specialtySurgery", slug: "oral-surgery" },
  ] as const;

  return (
    <>
      {/* HERO */}
      <section className="max-w-[1200px] mx-auto px-6 md:px-10 pt-14 md:pt-24 pb-16 md:pb-24">
        <div className="animate-rise">
          <span className="chip mb-8">
            <span className="chip-dot"></span>
            {t("heroEyebrow")}
          </span>

          <h1 className="display-h1 text-[56px] md:text-[96px] lg:text-[120px] text-spruce-900 max-w-[14ch]">
            {t("heroTitle")}{" "}
            <span className="display-italic text-copper-500">
              {t("heroTitleItalic")}
            </span>{" "}
            <span className="text-spruce-800">{t("heroTitleRest")}</span>
          </h1>

          <p className="mt-8 text-[18px] md:text-[20px] leading-[1.6] text-ink/75 max-w-[60ch]">
            {t("heroSubtitle")}
          </p>

          {/* SEARCH BAR */}
          <form
            action="/search"
            className="mt-10 max-w-[720px] bg-paper/80 backdrop-blur-sm border border-ink/10 rounded-2xl p-2 shadow-card flex flex-col md:flex-row gap-2"
          >
            <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/40 border border-transparent focus-within:border-spruce-600 focus-within:bg-white/70 transition-colors">
              <Search
                className="w-[18px] h-[18px] text-spruce-700 shrink-0"
                aria-hidden
              />
              <input
                type="text"
                name="specialty"
                placeholder={t("searchPlaceholderSpecialty")}
                className="flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-ink/35"
              />
            </label>
            <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/40 border border-transparent focus-within:border-spruce-600 focus-within:bg-white/70 transition-colors">
              <MapPin
                className="w-[18px] h-[18px] text-spruce-700 shrink-0"
                aria-hidden
              />
              <input
                type="text"
                name="area"
                placeholder={t("searchPlaceholderArea")}
                className="flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-ink/35"
              />
            </label>
            <button type="submit" className="btn-primary md:self-stretch md:px-8">
              {t("searchSubmit")}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/search" className="btn-secondary">
              {t("heroCta")}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
            </Link>
            <Link
              href="/how-it-works"
              className="small-caps text-[11px] text-spruce-700 hover:text-copper-500 transition-colors"
            >
              {t("heroCtaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="max-w-[1200px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="mb-12 flex items-baseline gap-6">
          <span className="deco-num text-[72px] md:text-[96px]">i.</span>
          <h2 className="display-h2 text-[36px] md:text-[52px] text-spruce-900 max-w-[22ch]">
            {t("trustTitle")}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <TrustCard
            numeral="01"
            title={t("trustOne")}
            body={t("trustOneBody")}
          />
          <TrustCard
            numeral="02"
            title={t("trustTwo")}
            body={t("trustTwoBody")}
            dark
          />
          <TrustCard
            numeral="03"
            title={t("trustThree")}
            body={t("trustThreeBody")}
          />
        </div>
      </section>

      {/* SPECIALTIES */}
      <section className="max-w-[1200px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="mb-12 flex items-baseline gap-6">
          <span className="deco-num text-[72px] md:text-[96px]">ii.</span>
          <h2 className="display-h2 text-[36px] md:text-[52px] text-spruce-900">
            {t("specialtiesTitle")}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {specialties.map((s) => (
            <Link
              key={s.slug}
              href={`/search?specialty=${s.slug}`}
              className="group rounded-xl bg-paper border border-ink/5 px-5 py-6 transition-all hover:-translate-y-[2px] hover:border-copper-500/40 shadow-card hover:shadow-card-hover"
            >
              <div className="font-display text-[22px] leading-tight text-spruce-900 group-hover:text-copper-600 transition-colors">
                {t(s.key)}
              </div>
              <div className="mt-2 flex items-center gap-1 small-caps text-[10px] text-fog group-hover:text-copper-500 transition-colors">
                <span>Browse</span>
                <ArrowRight
                  className="w-3 h-3 rtl:rotate-180 transition-transform group-hover:translate-x-[2px] rtl:group-hover:-translate-x-[2px]"
                  aria-hidden
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="text-center asterism py-6">✺ &nbsp; ✺ &nbsp; ✺</div>
    </>
  );
}

function TrustCard({
  numeral,
  title,
  body,
  dark = false,
}: {
  numeral: string;
  title: string;
  body: string;
  dark?: boolean;
}) {
  return (
    <div
      className={
        dark
          ? "rounded-2xl bg-spruce-800 text-cream p-7 shadow-card"
          : "rounded-2xl bg-paper p-7 border border-ink/5 shadow-card"
      }
    >
      <div className="flex items-start justify-between mb-4">
        <span
          className={`small-caps text-[10.5px] ${
            dark ? "text-copper-300" : "text-copper-500"
          }`}
        >
          {numeral}
        </span>
      </div>
      <div
        className={`font-display text-[28px] leading-tight mb-3 ${
          dark ? "text-cream" : "text-spruce-900"
        }`}
      >
        {title}
      </div>
      <p
        className={`text-[15px] leading-[1.65] ${
          dark ? "text-cream/80" : "text-ink/75"
        }`}
      >
        {body}
      </p>
    </div>
  );
}
