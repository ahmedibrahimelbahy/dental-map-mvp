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
    { key: "specialtyRootCanal", slug: "root-canal", Icon: HeartPulse },
    { key: "specialtyImplants", slug: "implants", Icon: Zap },
    { key: "specialtySurgery", slug: "surgery", Icon: Scissors },
  ] as const;

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="hero-wash">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 pt-10 md:pt-20 pb-14 md:pb-24 grid xl:grid-cols-[minmax(0,1fr)_380px] gap-12 xl:gap-10 items-center">
          <div className="max-w-[820px] animate-rise">
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

          <HeroCairoMap />
        </div>
      </section>

      {/* ═══ SPECIALTIES ═══ */}
      <section className="bg-surface">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="mb-10">
            <h2 className="display-h2 text-[30px] md:text-[44px] text-ink-900">
              {t("specialtiesTitle")}
            </h2>
            <p className="mt-2 text-[15.5px] text-ink-500 max-w-[48ch]">
              {t("specialtiesSubtitle")}
            </p>
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
            <StepCard num="02" title={t("howStep2Title")} body={t("howStep2Body")} variant="green" />
            <StepCard num="03" title={t("howStep3Title")} body={t("howStep3Body")} variant="darkGreen" />
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
  variant = "light",
}: {
  num: string;
  title: string;
  body: string;
  variant?: "light" | "green" | "darkGreen";
}) {
  const isTinted = variant === "green" || variant === "darkGreen";

  const containerClass =
    variant === "green"
      ? "rounded-2xl text-white p-7 md:p-8 shadow-card bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700"
      : variant === "darkGreen"
      ? "rounded-2xl text-white p-7 md:p-8 shadow-card bg-gradient-to-br from-emerald-800 via-emerald-900 to-green-950"
      : "rounded-2xl bg-white p-7 md:p-8 border border-ink-100 shadow-card";

  const eyebrowClass =
    variant === "green"
      ? "text-white/85"
      : variant === "darkGreen"
      ? "text-emerald-300"
      : "text-teal-600";

  return (
    <div className={containerClass}>
      <div className={`small-caps mb-4 ${eyebrowClass}`}>
        Step · {num}
      </div>
      <div
        className={`font-display text-[22px] md:text-[26px] font-bold tracking-tight2 leading-tight mb-3 ${
          isTinted ? "text-white" : "text-ink-900"
        }`}
      >
        {title}
      </div>
      <p
        className={`text-[14.5px] leading-[1.65] ${
          isTinted ? "text-white/85" : "text-ink-500"
        }`}
      >
        {body}
      </p>
    </div>
  );
}

function HeroCairoMap() {
  const pulsePins = [
    { x: 120, y: 178, delay: "0s" },
    { x: 248, y: 128, delay: "0.6s" },
    { x: 295, y: 232, delay: "1.2s" },
    { x: 62, y: 222, delay: "1.8s" },
    { x: 308, y: 295, delay: "0.3s" },
  ];
  const solidPins = [
    { x: 180, y: 175 },
    { x: 270, y: 165 },
    { x: 200, y: 270 },
    { x: 95, y: 260 },
    { x: 280, y: 200 },
    { x: 260, y: 350 },
  ];

  return (
    <div className="hidden xl:block relative animate-rise" aria-hidden>
      <div className="relative aspect-[360/460] w-full overflow-hidden rounded-3xl bg-[#fbfaf5] border border-ink-100 shadow-search">
        <svg
          viewBox="0 0 360 460"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="hero-map-dots" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.55" fill="rgba(15,118,110,0.13)" />
            </pattern>
            <linearGradient id="hero-nile" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.55" />
            </linearGradient>
            <radialGradient id="hero-pin-halo" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="360" height="460" fill="url(#hero-map-dots)" />

          {/* Subtle district washes */}
          <ellipse cx="65" cy="220" rx="78" ry="55" fill="rgba(15,118,110,0.045)" />
          <ellipse cx="120" cy="185" rx="45" ry="38" fill="rgba(15,118,110,0.045)" />
          <ellipse cx="248" cy="125" rx="62" ry="42" fill="rgba(15,118,110,0.045)" />
          <ellipse cx="295" cy="228" rx="55" ry="50" fill="rgba(15,118,110,0.045)" />
          <ellipse cx="305" cy="295" rx="48" ry="45" fill="rgba(15,118,110,0.045)" />
          <ellipse cx="225" cy="350" rx="62" ry="55" fill="rgba(15,118,110,0.07)" />

          {/* Nile river */}
          <path
            d="M 165 -10 Q 152 90 178 175 Q 200 260 172 350 Q 148 430 168 480"
            stroke="url(#hero-nile)"
            strokeWidth="30"
            fill="none"
            strokeLinecap="round"
          />

          {/* Zamalek island */}
          <ellipse
            cx="180"
            cy="195"
            rx="9"
            ry="38"
            fill="#fbfaf5"
            stroke="rgba(13,148,136,0.35)"
            strokeWidth="1"
          />

          {/* District labels */}
          <g
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight="700"
            letterSpacing="1.2"
            fill="#475569"
          >
            <text x="58" y="225" textAnchor="middle" fontSize="8">6TH OCTOBER</text>
            <text x="118" y="190" textAnchor="middle" fontSize="8">MOHANDESSIN</text>
            <text x="248" y="120" textAnchor="middle" fontSize="8">HELIOPOLIS</text>
            <text x="293" y="230" textAnchor="middle" fontSize="8">NASR CITY</text>
            <text x="305" y="298" textAnchor="middle" fontSize="8">NEW CAIRO</text>
            <text x="225" y="356" textAnchor="middle" fontSize="9" fill="#0f766e">MAADI</text>
            <text
              x="170"
              y="430"
              textAnchor="middle"
              fontSize="7"
              fontStyle="italic"
              fontWeight="600"
              letterSpacing="2"
              fill="#0d9488"
              opacity="0.7"
            >
              النيل · NILE
            </text>
          </g>

          {/* Pulse pins */}
          {pulsePins.map((p, i) => (
            <g key={`pulse-${i}`}>
              <circle cx={p.x} cy={p.y} r="14" fill="url(#hero-pin-halo)" />
              <circle cx={p.x} cy={p.y} r="4" fill="#0d9488" opacity="0.45">
                <animate attributeName="r" from="4" to="18" dur="2.6s" begin={p.delay} repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.45" to="0" dur="2.6s" begin={p.delay} repeatCount="indefinite" />
              </circle>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#0d9488" stroke="white" strokeWidth="1.2" />
            </g>
          ))}

          {/* Solid pins (no pulse) — adds density */}
          {solidPins.map((p, i) => (
            <circle
              key={`solid-${i}`}
              cx={p.x}
              cy={p.y}
              r="2.6"
              fill="#0d9488"
              stroke="white"
              strokeWidth="1"
              opacity="0.85"
            />
          ))}

          {/* Active Maadi pin (larger, highlighted) */}
          <g>
            <circle cx="225" cy="340" r="26" fill="#0d9488" opacity="0.12" />
            <circle cx="225" cy="340" r="18" fill="#0d9488" opacity="0.18" />
            <circle cx="225" cy="340" r="7.5" fill="#0d9488" stroke="white" strokeWidth="2.2" />
          </g>
        </svg>

        {/* Live-clinics badge top-left */}
        <div className="absolute top-4 left-4 z-30 inline-flex items-center gap-2 rounded-full bg-white/95 backdrop-blur border border-ink-100 px-3 py-1.5 shadow-card">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-700">
            Greater Cairo · 50+ clinics
          </span>
        </div>

        {/* Popup card anchored to Maadi pin */}
        <div className="absolute z-30" style={{ left: "62.5%", top: "73.9%" }}>
          <div className="relative -translate-x-1/2 -translate-y-full -mt-4 rounded-xl bg-white border border-ink-100 shadow-card-hover px-3.5 py-2.5 w-[164px]">
            <div className="flex items-center justify-between">
              <div className="font-display font-bold text-[14px] text-ink-900">Maadi</div>
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-teal-600">
                Live
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-500">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
              12 dentists · 3 open today
            </div>
            <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-r border-b border-ink-100" />
          </div>
        </div>

        {/* Bottom-right live-map chip */}
        <div className="absolute bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-ink-900/90 backdrop-blur text-white px-3 py-1.5 shadow-card">
          <MapPin className="w-3 h-3 text-teal-300" />
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em]">
            Live map
          </span>
        </div>
      </div>
    </div>
  );
}
