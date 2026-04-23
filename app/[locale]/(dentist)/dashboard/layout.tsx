import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireDentistAdmin } from "@/lib/auth/session";
import { Link } from "@/i18n/routing";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireDentistAdmin(locale);
  const t = await getTranslations("Dashboard");

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-ink-100">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 h-[64px] flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandMark compact />
            <span className="hidden md:inline text-ink-300">·</span>
            <span className="hidden md:inline small-caps text-ink-500">
              {t("navHome")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[13px] text-ink-600 font-medium">
              {user.profile.full_name}
            </span>
            <LocaleSwitcher />
            <SignOutButton label={t("signOut")} />
          </div>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-8 md:py-10 grid md:grid-cols-[220px_1fr] gap-8">
        <DashboardNav
          t={{
            home: t("navHome"),
            calendar: t("navCalendar"),
            clinic: t("navClinic"),
            bookings: t("navBookings"),
          }}
        />
        <main>{children}</main>
      </div>
    </div>
  );
}
