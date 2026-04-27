import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CircleCheck, ArrowRight } from "lucide-react";

export default async function BookingSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Booking");

  return (
    <div className="max-w-[640px] mx-auto px-5 md:px-8 py-20 md:py-28 text-center">
      <span className="inline-flex w-16 h-16 rounded-2xl bg-teal-500 text-white items-center justify-center mb-6 shadow-teal-glow">
        <CircleCheck className="w-8 h-8" aria-hidden />
      </span>
      <h1 className="display-h2 text-[32px] md:text-[44px] text-ink-900 mb-4">
        {t("successTitle")}
      </h1>
      <p className="text-[16px] leading-[1.65] text-ink-600 max-w-[44ch] mx-auto mb-10">
        {t("successBody")}
      </p>
      <Link href="/" className="btn-primary">
        {t("successCta")}
        <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
      </Link>
    </div>
  );
}
