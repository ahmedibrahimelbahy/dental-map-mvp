import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { BookingForm } from "@/components/patient/booking-form";
import { CalendarDays, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

type CDRow = {
  id: string;
  fee_egp: number;
  slot_minutes: number;
  is_active: boolean;
  dentist: { slug: string; name_ar: string; name_en: string } | null;
  clinic: { name_ar: string; name_en: string } | null;
};

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; clinicDentistId: string }>;
  searchParams: Promise<{ start?: string }>;
}) {
  const { locale, clinicDentistId } = await params;
  const { start } = await searchParams;
  setRequestLocale(locale);

  if (!start) notFound();

  const user = await getCurrentUser();
  if (!user) {
    const redirectTo = `/${locale}/book/${clinicDentistId}?start=${encodeURIComponent(start)}`;
    redirect(`/${locale}/signin?next=${encodeURIComponent(redirectTo)}`);
  }

  const t = await getTranslations("Booking");
  const isAr = locale === "ar";

  const admin = createAdminClient();
  const { data: cd } = await admin
    .from("clinic_dentists")
    .select(
      `
      id, fee_egp, slot_minutes, is_active,
      dentist:dentists(slug, name_ar, name_en),
      clinic:clinics(name_ar, name_en)
    `
    )
    .eq("id", clinicDentistId)
    .returns<CDRow[]>()
    .maybeSingle();

  if (!cd || !cd.is_active) notFound();

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) notFound();

  const dentistName = isAr ? cd.dentist?.name_ar : cd.dentist?.name_en;
  const clinicName = isAr ? cd.clinic?.name_ar : cd.clinic?.name_en;
  const whenLabel = startDate.toLocaleString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });

  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-5 md:px-8 py-8 md:py-14 grid md:grid-cols-[1fr_320px] gap-6 md:gap-8">
      <div>
        <h1 className="display-h2 text-[24px] sm:text-[28px] md:text-[36px] text-ink-900 mb-5 md:mb-6 leading-tight">
          {t("headerTitle")}
        </h1>
        <BookingForm
          clinicDentistId={clinicDentistId}
          slotStartIso={start}
          initialName={user.profile.full_name}
          initialPhone={user.profile.phone ?? ""}
        />
      </div>

      <aside className="md:order-last">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card space-y-4">
          <div>
            <div className="small-caps text-ink-400 mb-1">
              {t("summaryDentist")}
            </div>
            <div className="font-display text-[16px] font-bold text-ink-900">
              {dentistName ?? "—"}
            </div>
            {clinicName && (
              <div className="flex items-center gap-1.5 text-[12.5px] text-ink-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-teal-500" aria-hidden />
                {clinicName}
              </div>
            )}
          </div>

          <div className="border-t border-ink-100 pt-4">
            <div className="small-caps text-ink-400 mb-1">
              {t("summaryWhen")}
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="w-4 h-4 text-teal-500 mt-0.5" aria-hidden />
              <div>
                <div className="font-semibold text-ink-900 text-[14px]">
                  {whenLabel}
                </div>
                <div className="text-[12.5px] text-ink-500">
                  {t("summaryDuration", { minutes: cd.slot_minutes })}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-ink-100 pt-4 flex items-baseline justify-between">
            <span className="small-caps text-ink-400">{t("summaryFee")}</span>
            <span className="font-display text-[20px] font-bold text-ink-900">
              {cd.fee_egp} <span className="text-[12.5px] text-ink-500 font-medium">EGP</span>
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
