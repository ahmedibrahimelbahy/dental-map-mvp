import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireDentistAdmin } from "@/lib/auth/session";
import { listAppointmentsForAdmin } from "@/lib/bookings/list";
import { BookingsTable } from "@/components/dashboard/bookings-table";
import { BookOpenCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireDentistAdmin(locale);
  const t = await getTranslations("Dashboard");

  const appointments = await listAppointmentsForAdmin();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <BookOpenCheck className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="display-h2 text-[26px] md:text-[32px] text-ink-900">
          {t("navBookings")}
        </h1>
        <span className="ms-auto text-[13px] text-ink-500">
          {appointments.length} {locale === "ar" ? "حجز" : "total"}
        </span>
      </div>

      <BookingsTable
        appointments={appointments}
        locale={locale}
        emptyLabel={t("bookingsEmpty")}
      />
    </div>
  );
}
