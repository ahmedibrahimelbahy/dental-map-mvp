import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import {
  CalendarSync,
  Star,
  Globe,
  BadgeDollarSign,
  Headphones,
  Languages,
  ArrowRight,
  CheckCircle2,
  LogIn,
  MessageCircle,
  Mail,
  Sparkles,
} from "lucide-react";

export default async function ForClinicsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ForClinics");
  const isAr = locale === "ar";
  const user = await getCurrentUser();
  const isDentistAdmin =
    user?.profile.role === "dentist_admin" || user?.profile.role === "ops";

  // Build pre-filled email mailto link for the apply CTA.
  const mailto = `mailto:clinics@dentalmap.eg?subject=${encodeURIComponent(
    t("applyEmailSubject")
  )}&body=${encodeURIComponent(t("applyEmailBody"))}`;

  // Optional WhatsApp number — set NEXT_PUBLIC_CLINIC_WHATSAPP=20100xxxxxxx
  // (digits only, country code prefix). If not set, only email shows.
  const whatsappNumber = process.env.NEXT_PUBLIC_CLINIC_WHATSAPP;
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t("applyEmailBody"))}`
    : null;

  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-white pointer-events-none" />
        <div className="absolute top-20 -end-20 w-[480px] h-[480px] rounded-full bg-teal-100/40 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1240px] mx-auto px-4 sm:px-5 md:px-8 pt-12 md:pt-20 pb-14 md:pb-20">
          <div className="max-w-[820px]">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100/70 text-teal-800 text-[12px] font-bold tracking-wider uppercase mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              {t("heroEyebrow")}
            </span>

            <h1 className="display-h1 text-[36px] sm:text-[48px] md:text-[68px] lg:text-[82px] text-ink-900 leading-[1.02]">
              {t("heroTitle")}
              <br />
              <span className="text-teal-600">{t("heroTitleAccent")}</span>
            </h1>

            <p className="mt-5 md:mt-7 text-[15.5px] sm:text-[17px] md:text-[19px] leading-[1.6] text-ink-600 max-w-[60ch]">
              {t("heroSubtitle")}
            </p>

            <div className="mt-7 md:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {whatsappLink ? (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener"
                  className="btn-primary !py-3.5 !px-6 !text-[15px] inline-flex items-center justify-center gap-2 shadow-glow"
                >
                  <MessageCircle className="w-5 h-5" aria-hidden />
                  {t("ctaApply")}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
                </a>
              ) : (
                <a
                  href={mailto}
                  className="btn-primary !py-3.5 !px-6 !text-[15px] inline-flex items-center justify-center gap-2 shadow-glow"
                >
                  <Mail className="w-5 h-5" aria-hidden />
                  {t("ctaApply")}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
                </a>
              )}

              {isDentistAdmin ? (
                <Link
                  href="/dashboard"
                  className="btn-secondary !py-3.5 !px-6 !text-[15px] inline-flex items-center justify-center gap-2"
                >
                  {isAr ? "ادخل لوحة التحكم" : "Go to dashboard"}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
                </Link>
              ) : (
                <Link
                  href="/signin"
                  className="btn-secondary !py-3.5 !px-6 !text-[15px] inline-flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" aria-hidden />
                  {t("ctaSignIn")}
                </Link>
              )}
            </div>

            <p className="mt-5 text-[12.5px] sm:text-[13px] text-ink-500 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-500" aria-hidden />
              {t("trustLine")}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHY ═══ */}
      <section className="bg-white py-14 md:py-20">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-5 md:px-8">
          <div className="max-w-[680px] mb-10 md:mb-14">
            <span className="small-caps text-teal-700 mb-2 block">{isAr ? "لماذا Dental Map" : "Why Dental Map"}</span>
            <h2 className="display-h2 text-[28px] sm:text-[34px] md:text-[44px] text-ink-900 leading-tight mb-3">
              {t("whyTitle")}
            </h2>
            <p className="text-[14.5px] md:text-[15.5px] leading-[1.65] text-ink-500">
              {t("whySubtitle")}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <WhyTile Icon={CalendarSync} title={t("why1Title")} body={t("why1Body")} accent />
            <WhyTile Icon={Star} title={t("why2Title")} body={t("why2Body")} />
            <WhyTile Icon={Globe} title={t("why3Title")} body={t("why3Body")} />
            <WhyTile Icon={BadgeDollarSign} title={t("why4Title")} body={t("why4Body")} />
            <WhyTile Icon={Headphones} title={t("why5Title")} body={t("why5Body")} />
            <WhyTile Icon={Languages} title={t("why6Title")} body={t("why6Body")} />
          </div>
        </div>
      </section>

      {/* ═══ DENTOLIZE CALLOUT ═══ */}
      <section className="bg-ink-50 py-14 md:py-20">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-5 md:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-ink-900 via-teal-900 to-teal-700 text-white p-7 md:p-12 shadow-glow relative overflow-hidden">
            <div className="absolute -top-24 -end-24 w-[300px] h-[300px] rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-[11px] font-bold tracking-wider uppercase mb-5">
                <Sparkles className="w-3 h-3" aria-hidden />
                {isAr ? "متوافق مع Dentolize" : "Dentolize-friendly"}
              </div>
              <h2 className="display-h2 text-[26px] sm:text-[32px] md:text-[40px] leading-tight mb-4">
                {t("dentolizeTitle")}
              </h2>
              <p className="text-[14.5px] md:text-[16px] leading-[1.7] text-teal-50 max-w-[60ch] mb-6 md:mb-8">
                {t("dentolizeBody")}
              </p>

              <ul className="space-y-3">
                {[t("dentolizeBullet1"), t("dentolizeBullet2"), t("dentolizeBullet3")].map(
                  (b, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] md:text-[14.5px]">
                      <span className="w-5 h-5 rounded-full bg-teal-400/30 grid place-items-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-200" aria-hidden />
                      </span>
                      <span className="text-teal-50">{b}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="bg-white py-14 md:py-20">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-5 md:px-8">
          <div className="max-w-[680px] mb-10 md:mb-14">
            <span className="small-caps text-teal-700 mb-2 block">{isAr ? "الخطوات" : "How"}</span>
            <h2 className="display-h2 text-[28px] sm:text-[34px] md:text-[44px] text-ink-900 leading-tight mb-3">
              {t("howTitle")}
            </h2>
            <p className="text-[14.5px] md:text-[15.5px] leading-[1.65] text-ink-500">
              {t("howSubtitle")}
            </p>
          </div>

          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <Step n={1} title={t("how1Title")} body={t("how1Body")} />
            <Step n={2} title={t("how2Title")} body={t("how2Body")} />
            <Step n={3} title={t("how3Title")} body={t("how3Body")} />
            <Step n={4} title={t("how4Title")} body={t("how4Body")} />
          </ol>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="bg-ink-50 py-14 md:py-20">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-5 md:px-8">
          <div className="max-w-[640px] mb-8 md:mb-10">
            <span className="small-caps text-teal-700 mb-2 block">{isAr ? "السعر" : "Pricing"}</span>
            <h2 className="display-h2 text-[28px] sm:text-[34px] md:text-[44px] text-ink-900 leading-tight">
              {t("pricingTitle")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            <div className="rounded-2xl bg-white border-2 border-teal-300 p-6 md:p-8 shadow-glow relative">
              <span className="absolute top-4 end-4 inline-flex items-center px-2.5 py-1 rounded-full bg-teal-600 text-white text-[10.5px] font-bold tracking-wider uppercase">
                {isAr ? "الآن" : "Now"}
              </span>
              <div className="font-display text-[15px] font-bold text-teal-700 uppercase tracking-wider mb-2">
                {t("pricingFreeBadge")}
              </div>
              <div className="display-h2 text-[42px] md:text-[56px] text-ink-900 leading-none mb-3">
                EGP 0
              </div>
              <p className="text-[14px] leading-[1.7] text-ink-600">{t("pricingFreeBody")}</p>
            </div>

            <div className="rounded-2xl bg-white border border-ink-100 p-6 md:p-8 shadow-card">
              <div className="font-display text-[15px] font-bold text-ink-500 uppercase tracking-wider mb-2">
                {t("pricingFutureLabel")}
              </div>
              <div className="display-h2 text-[28px] md:text-[34px] text-ink-700 leading-tight mb-3">
                {isAr ? "5–10% / حجز" : "5–10% / booking"}
              </div>
              <p className="text-[14px] leading-[1.7] text-ink-600">{t("pricingFutureBody")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-white py-14 md:py-20">
        <div className="max-w-[860px] mx-auto px-4 sm:px-5 md:px-8">
          <div className="mb-8 md:mb-10">
            <span className="small-caps text-teal-700 mb-2 block">FAQ</span>
            <h2 className="display-h2 text-[28px] sm:text-[34px] md:text-[44px] text-ink-900 leading-tight">
              {t("faqTitle")}
            </h2>
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <details
                key={i}
                className="group rounded-xl border border-ink-100 bg-white shadow-card overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none hover:bg-ink-50 transition-colors">
                  <span className="font-display text-[15px] md:text-[16px] font-bold text-ink-900">
                    {t(`faq${i}Q` as `faq${1 | 2 | 3 | 4 | 5 | 6}Q`)}
                  </span>
                  <span className="w-7 h-7 rounded-full bg-ink-50 grid place-items-center text-ink-500 shrink-0 transition-transform group-open:rotate-45">
                    <span className="text-[18px] leading-none font-light">+</span>
                  </span>
                </summary>
                <div className="px-5 pb-4 pt-1 text-[14px] leading-[1.7] text-ink-600">
                  {t(`faq${i}A` as `faq${1 | 2 | 3 | 4 | 5 | 6}A`)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="bg-gradient-to-br from-teal-700 to-teal-500 text-white py-14 md:py-20">
        <div className="max-w-[860px] mx-auto px-4 sm:px-5 md:px-8 text-center">
          <h2 className="display-h2 text-[30px] sm:text-[38px] md:text-[52px] leading-tight mb-3">
            {t("finalTitle")}
          </h2>
          <p className="text-[15px] md:text-[16.5px] text-teal-50 max-w-[52ch] mx-auto mb-7 md:mb-9 leading-[1.6]">
            {t("finalBody")}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-teal-700 font-bold text-[15px] hover:bg-teal-50 transition-colors shadow-lg"
              >
                <MessageCircle className="w-5 h-5" aria-hidden />
                {t("ctaApply")}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
              </a>
            ) : (
              <a
                href={mailto}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-teal-700 font-bold text-[15px] hover:bg-teal-50 transition-colors shadow-lg"
              >
                <Mail className="w-5 h-5" aria-hidden />
                {t("ctaApply")}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
              </a>
            )}
            {!isDentistAdmin && (
              <Link
                href="/signin"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-teal-800/40 hover:bg-teal-800/60 text-white font-bold text-[15px] border border-white/20 transition-colors"
              >
                <LogIn className="w-4 h-4" aria-hidden />
                {t("ctaSignIn")}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── tile ─────────────────────────────────────────────────────────────── */
function WhyTile({
  Icon,
  title,
  body,
  accent = false,
}: {
  Icon: typeof CalendarSync;
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 md:p-6 transition-shadow ${
        accent
          ? "bg-gradient-to-br from-teal-50 to-white border-teal-200 shadow-glow"
          : "bg-white border-ink-100 shadow-card hover:shadow-tile"
      }`}
    >
      <span
        className={`inline-flex w-10 h-10 rounded-xl items-center justify-center mb-3 ${
          accent ? "bg-teal-600 text-white" : "bg-teal-50 text-teal-600"
        }`}
      >
        <Icon className="w-5 h-5" aria-hidden />
      </span>
      <h3 className="font-display text-[16px] md:text-[17px] font-bold text-ink-900 mb-2 leading-tight">
        {title}
      </h3>
      <p className="text-[13.5px] md:text-[14px] leading-[1.65] text-ink-600">{body}</p>
    </div>
  );
}

/* ── numbered step ────────────────────────────────────────────────────── */
function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-2xl bg-white border border-ink-100 shadow-card p-5 md:p-6 relative overflow-hidden">
      <span className="font-display text-[44px] md:text-[52px] font-bold leading-none bg-gradient-to-br from-teal-600 to-teal-300 [-webkit-background-clip:text] [background-clip:text] text-transparent absolute top-2 end-3 opacity-30">
        {n.toString().padStart(2, "0")}
      </span>
      <div className="relative">
        <div className="text-[11px] uppercase tracking-wider font-bold text-teal-700 mb-2">
          {n === 1 ? "Step" : ""}
          {n}
        </div>
        <h3 className="font-display text-[16px] md:text-[17px] font-bold text-ink-900 mb-2 leading-tight">
          {title}
        </h3>
        <p className="text-[13.5px] md:text-[14px] leading-[1.65] text-ink-600">{body}</p>
      </div>
    </li>
  );
}
