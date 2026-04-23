import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireDentistAdmin } from "@/lib/auth/session";
import { BookOpenCheck } from "lucide-react";

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireDentistAdmin(locale);
  const t = await getTranslations("Dashboard");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <BookOpenCheck className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="display-h2 text-[26px] md:text-[32px] text-ink-900">
          {t("navBookings")}
        </h1>
      </div>
      <div className="rounded-2xl border border-ink-100 bg-white p-10 md:p-12 shadow-card text-center">
        <p className="text-[15px] leading-[1.65] text-ink-500 max-w-[50ch] mx-auto">
          {t("bookingsEmpty")}
        </p>
      </div>
    </div>
  );
}
