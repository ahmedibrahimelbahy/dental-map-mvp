import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  Search,
  MapPin,
  CalendarDays,
  ArrowRight,
  BadgeCheck,
  Clock,
  Globe,
  Baby,
  Smile,
  Scissors,
  Sparkles,
  Stethoscope,
  Zap,
  HeartPulse,
} from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");

  const specialties = [
    { key: "specialtyAdult", slug: "adult", Icon: Stethoscope },
    { key: "specialtyPediatric", slug: "pediatric", Icon: Baby },
    { key: "specialtyOrtho", slug: "orthodontics", Icon: Smile },
    { key: "specialtyCosmetic", slug: "cosmetic", Icon: Sparkles },
    { key: "specialtyEndo", slug: "endodontics", Icon: HeartPulse },
    { key: "specialtyImplants", slug: "implants", Icon: Zap },
    { key: "specialtySurgery", slug: "oral-surgery", Icon: Scissors },
  ] as const;

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="hero-wash">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 pt-10 md:pt-20 pb-14 md:pb-24">
          <div className="max-w-[860px] animate-rise">
            <span className="chip mb-6">
              <span className="chip-dot"></span>
              {t("heroEyebrow")}
            </span>

            <h1 className="display-h1 text-[44px] md:text-[72px] lg:text-[84px] text-ink-900">
              {t("heroTitle")}
              <br />
              <span className="text-teal-500">{t("heroTitleAccent")}</span>
            </h1>

            <p className="mt-6 md:mt-8 text-[17px] md:text-[19px] leading-[1.6] text-ink-500 max-w-[62ch]">
              {t("heroSubtitle")}
            </p>

            {/* Search card */}
            <form
              action="/search"
              className="mt-8 md:mt-10 bg-white rounded-2xl border border-ink-100 shadow-search overflow-hidden grid grid-cols-1 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-stretch"
            >
              <label className="search-field">
                <Search
                  className="w-[18px] h-[18px] text-teal-500 shrink-0"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <span className="block text-[10.5px] uppercase tracking-[0.14em] font-bold text-ink-400">
                    {t("searchSpecialtyLabel")}
                  </span>
                  <input
                    type="text"
                    name="specialty"
                    placeholder={t("searchSpecialtyPlaceholder")}
                    className="!p-0 mt-0.5 text-[15.5px] font-medium"
                  />
                </div>
              </label>

              <label className="search-field">
                <MapPin
                  className="w-[18px] h-[18px] text-teal-500 shrink-0"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <span className="block text-[10.5px] uppercase tracking-[0.14em] font-bold text-ink-400">
                    {t("searchAreaLabel")}
                  </span>
                  <input
                    type="text"
                    name="area"
                    placeholder={t("searchAreaPlaceholder")}
                    className="!p-0 mt-0.5 text-[15.5px] font-medium"
                  />
                </div>
              </label>

              <label className="search-field">
                <CalendarDays
                  className="w-[18px] h-[18px] text-teal-500 shrink-0"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <span className="block text-[10.5px] uppercase tracking-[0.14em] font-bold text-ink-400">
                    {t("searchDateLabel")}
                  </span>
                  <select
                    name="when"
                    defaultValue="any"
                    className="!p-0 mt-0.5 text-[15.5px] font-medium cursor-pointer appearance-none bg-transparent"
                  >
                    <option value="any">{t("searchDateAny")}</option>
                    <option value="today">{t("searchDateToday")}</option>
                    <option value="tomorrow">{t("searchDateTomorrow")}</option>
                    <option value="this-week">{t("searchDateThisWeek")}</option>
                  </select>
                </div>
              </label>

              <button
                type="submit"
                className="btn-primary !rounded-none md:!rounded-tl-none md:!rounded-bl-none rtl:md:!rounded-tr-none rtl:md:!rounded-br-none h-auto md:min-w-[180px] justify-center"
              >
                {t("searchSubmit")}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
              </button>
            </form>

            {/* Trust strip */}
            <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[13.5px] text-ink-600">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" aria-hidden />
                {t("trustBookings")}
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-teal-500" aria-hidden />
                {t("trustReviews")}
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-500" aria-hidden />
                {t("trustBilingual")}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ SPECIALTIES ═══ */}
      <section className="bg-surface">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="display-h2 text-[30px] md:text-[44px] text-ink-900">
                {t("specialtiesTitle")}
              </h2>
              <p className="mt-2 text-[15.5px] text-ink-500 max-w-[48ch]">
                {t("specialtiesSubtitle")}
              </p>
            </div>
            <Link
              href="/search"
              className="hidden md:inline-flex items-center gap-1.5 text-[14px] font-semibold text-teal-600 hover:text-teal-700 transition-colors"
            >
              {t("searchSubmit")}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4">
            {specialties.map(({ key, slug, Icon }) => (
              <Link
                key={slug}
                href={`/search?specialty=${slug}`}
                className="group rounded-2xl bg-white border border-ink-100 px-5 py-6 flex flex-col items-start gap-4 shadow-card hover:shadow-card-hover hover:border-teal-300 hover:-translate-y-0.5 transition-[transform,box-shadow,border-color]"
              >
                <span className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" aria-hidden />
                </span>
                <span className="font-display text-[15.5px] md:text-[16px] font-semibold text-ink-900 leading-tight">
                  {t(key)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section>
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="max-w-[640px] mb-12 md:mb-16">
            <h2 className="display-h2 text-[30px] md:text-[44px] text-ink-900">
              {t("howItWorksTitle")}
            </h2>
            <p className="mt-2 text-[15.5px] text-ink-500">
              {t("howItWorksSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            <StepCard num="01" title={t("howStep1Title")} body={t("howStep1Body")} />
            <StepCard num="02" title={t("howStep2Title")} body={t("howStep2Body")} dark />
            <StepCard num="03" title={t("howStep3Title")} body={t("howStep3Body")} />
          </div>
        </div>
      </section>

      {/* ═══ FOR CLINICS ═══ */}
      <section className="bg-surface">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="rounded-3xl bg-teal-gradient text-white p-8 md:p-14 flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-teal-glow">
            <div className="max-w-[56ch]">
              <h2 className="display-h2 text-[28px] md:text-[38px] text-white">
                {t("forClinicsTitle")}
              </h2>
              <p className="mt-3 text-[15.5px] md:text-[17px] text-white/85 leading-[1.55]">
                {t("forClinicsBody")}
              </p>
            </div>
            <Link
              href="/for-clinics"
              className="bg-white text-teal-700 font-semibold rounded-xl px-6 py-3.5 text-[15px] hover:bg-teal-50 transition-colors shadow-card whitespace-nowrap inline-flex items-center gap-2"
            >
              {t("forClinicsCta")}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function StepCard({
  num,
  title,
  body,
  dark = false,
}: {
  num: string;
  title: string;
  body: string;
  dark?: boolean;
}) {
  return (
    <div
      className={
        dark
          ? "rounded-2xl bg-ink-900 text-white p-7 md:p-8 shadow-card"
          : "rounded-2xl bg-white p-7 md:p-8 border border-ink-100 shadow-card"
      }
    >
      <div
        className={`small-caps mb-4 ${
          dark ? "text-teal-300" : "text-teal-600"
        }`}
      >
        Step · {num}
      </div>
      <div
        className={`font-display text-[22px] md:text-[26px] font-bold tracking-tight2 leading-tight mb-3 ${
          dark ? "text-white" : "text-ink-900"
        }`}
      >
        {title}
      </div>
      <p
        className={`text-[14.5px] leading-[1.65] ${
          dark ? "text-white/75" : "text-ink-500"
        }`}
      >
        {body}
      </p>
    </div>
  );
}
