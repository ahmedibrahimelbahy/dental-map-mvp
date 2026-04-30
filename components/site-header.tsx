import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { BrandMark } from "./brand-mark";
import { LocaleSwitcher } from "./locale-switcher";
import { SignOutButton } from "./dashboard/sign-out-button";
import { MobileNav } from "./mobile-nav";
import { getCurrentUser } from "@/lib/auth/session";
import { LayoutDashboard, CalendarCheck } from "lucide-react";

export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const user = await getCurrentUser();
  const isDentistAdmin =
    user?.profile.role === "dentist_admin" || user?.profile.role === "ops";
  const firstName = user?.profile.full_name?.split(" ")[0] ?? "";
  const initials = (user?.profile.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-ink-100">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 md:px-8 h-[64px] md:h-[68px] flex items-center justify-between gap-3 md:gap-6">
        <div className="flex items-center gap-6 lg:gap-10 min-w-0">
          <BrandMark />
          <nav className="hidden lg:flex items-center gap-7 text-[14px] text-ink-700 font-medium">
            <Link href="/search" className="hover:text-teal-600 transition-colors">
              {t("search")}
            </Link>
            <Link href="/specialties" className="hover:text-teal-600 transition-colors">
              {t("specialties")}
            </Link>
            <Link href="/areas" className="hover:text-teal-600 transition-colors">
              {t("areas")}
            </Link>
            <Link href="/for-clinics" className="hover:text-teal-600 transition-colors">
              {t("forClinics")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3">
          <LocaleSwitcher />

          {!user && (
            <>
              <Link href="/signin" className="hidden md:inline btn-ghost">
                {t("signIn")}
              </Link>
              <Link
                href="/signup"
                className="hidden sm:inline-flex btn-primary !text-[13px] !py-2 !px-3.5 md:!px-5"
              >
                {t("signUp")}
              </Link>
            </>
          )}

          {user && (
            <>
              {isDentistAdmin ? (
                <Link
                  href="/dashboard"
                  className="hidden md:inline-flex items-center gap-1.5 btn-ghost"
                >
                  <LayoutDashboard className="w-4 h-4" aria-hidden />
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/account"
                  className="hidden md:inline-flex items-center gap-1.5 btn-ghost"
                >
                  <CalendarCheck className="w-4 h-4" aria-hidden />
                  {t("myBookings")}
                </Link>
              )}
              <Link
                href={isDentistAdmin ? "/dashboard" : "/account"}
                className="flex items-center gap-2 px-2 py-1 md:px-2.5 md:py-1.5 rounded-full bg-teal-50 border border-teal-100 hover:bg-teal-100 transition-colors"
                title={user.profile.full_name}
              >
                <span className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  {initials || "·"}
                </span>
                <span className="hidden sm:inline text-[13px] font-semibold text-teal-800 max-w-[10ch] truncate">
                  {firstName}
                </span>
              </Link>
              <span className="hidden md:inline">
                <SignOutButton label={t("signOut")} />
              </span>
            </>
          )}

          <MobileNav
            authed={!!user}
            isDentistAdmin={isDentistAdmin}
            firstName={firstName}
            initials={initials}
            fullName={user?.profile.full_name ?? ""}
            labels={{
              search: t("search"),
              specialties: t("specialties"),
              areas: t("areas"),
              forClinics: t("forClinics"),
              signIn: t("signIn"),
              signUp: t("signUp"),
              myBookings: t("myBookings"),
              dashboard: "Dashboard",
              signOut: t("signOut"),
            }}
          />
        </div>
      </div>
    </header>
  );
}
