import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { BrandMark } from "./brand-mark";
import { LocaleSwitcher } from "./locale-switcher";
import { SignOutButton } from "./dashboard/sign-out-button";
import { MobileNav } from "./mobile-nav";
import { HeaderSearch } from "./header-search";
import { getCurrentUser } from "@/lib/auth/session";
import { LayoutDashboard, CalendarCheck, Shield, Home } from "lucide-react";

export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const user = await getCurrentUser();
  const isOps = user?.profile.role === "ops";
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
      <div className="max-w-[1240px] mx-auto px-3 sm:px-5 md:px-8 h-[60px] md:h-[68px] flex items-center justify-between gap-2 md:gap-6">
        {/* START side: hamburger (mobile) + brand + nav links (desktop) */}
        <div className="flex items-center gap-2 md:gap-6 lg:gap-10 min-w-0">
          <MobileNav
            authed={!!user}
            isDentistAdmin={isDentistAdmin}
            firstName={firstName}
            fullName={user?.profile.full_name ?? ""}
            initials={initials}
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
              menu: t("menu"),
              browse: t("browse"),
              home: t("home"),
              patientRole: t("patientRole"),
              adminRole: t("adminRole"),
            }}
          />
          <BrandMark />
          <Link
            href="/"
            aria-label={t("home")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-ink-700 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          >
            <Home className="w-[18px] h-[18px]" aria-hidden />
            <span className="hidden lg:inline text-[14px] font-medium">
              {t("home")}
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-7 text-[14px] text-ink-700 font-medium">
            <Link href="/specialties" className="hover:text-teal-600 transition-colors">
              {t("specialties")}
            </Link>
            <Link href="/areas" className="hover:text-teal-600 transition-colors">
              {t("areas")}
            </Link>
            {/* "For clinics" is marketing for non-customers — hide once
                the user is signed in (regardless of role). */}
            {!user && (
              <Link href="/for-clinics" className="hover:text-teal-600 transition-colors">
                {t("forClinics")}
              </Link>
            )}
          </nav>
        </div>

        {/* MIDDLE: persistent search — replaces the standalone "Find a dentist"
            link. Hidden on smallest screens to leave room for the brand mark
            and right-side controls. */}
        <div className="hidden md:flex flex-1 max-w-[420px] mx-2">
          <HeaderSearch
            placeholder={t("searchPlaceholder")}
            ariaLabel={t("search")}
          />
        </div>

        {/* END side: locale switcher + auth actions */}
        <div className="flex items-center gap-1.5 md:gap-3">
          <LocaleSwitcher />

          {!user && (
            <>
              <Link href="/signin" className="hidden md:inline btn-ghost">
                {t("signIn")}
              </Link>
              <Link
                href="/signup"
                className="btn-primary !text-[12.5px] sm:!text-[13px] !py-2 !px-3 sm:!px-3.5 md:!px-5"
              >
                {t("signUp")}
              </Link>
            </>
          )}

          {user && (
            <>
              {isOps && (
                <Link
                  href="/admin"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition-colors font-bold text-[12.5px]"
                >
                  <Shield className="w-3.5 h-3.5" aria-hidden />
                  Admin
                </Link>
              )}
              {isOps ? null : isDentistAdmin ? (
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
                href={isOps ? "/admin" : isDentistAdmin ? "/dashboard" : "/account"}
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
        </div>
      </div>
    </header>
  );
}
