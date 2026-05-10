import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CircleCheck, ArrowRight, CalendarPlus } from "lucide-react";

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { locale } = await params;
  const { id: appointmentId } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Booking");

  return (
    <div className="max-w-[640px] mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
      <span className="inline-flex w-16 h-16 rounded-2xl bg-teal-500 text-white items-center justify-center mb-6 shadow-teal-glow">
        <CircleCheck className="w-8 h-8" aria-hidden />
      </span>
      <h1 className="display-h2 text-[32px] md:text-[44px] text-ink-900 mb-4">
        {t("successTitle")}
      </h1>
      <p className="text-[16px] leading-[1.65] text-ink-600 max-w-[44ch] mx-auto mb-8">
        {t("successBody")}
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-10">
        <Link
          href="/"
          className="btn-primary inline-flex items-center justify-center gap-2"
        >
          {t("successCta")}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
        </Link>

        {appointmentId && (
          <a
            href={`/api/booking/${appointmentId}/calendar.ics`}
            download="dental-appointment.ics"
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <CalendarPlus className="w-4 h-4" aria-hidden />
            {t("addToCalendar")}
          </a>
        )}
      </div>

      {appointmentId && (
        <p className="text-[12.5px] text-ink-500 leading-[1.55] max-w-[44ch] mx-auto">
          {t("addToCalendarHint")}
        </p>
      )}
    </div>
  );
}
