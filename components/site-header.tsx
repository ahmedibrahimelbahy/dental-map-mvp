import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BrandMark } from "./brand-mark";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteHeader() {
  const t = useTranslations("Nav");
  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-ink-100">
      <div className="max-w-[1240px] mx-auto px-5 md:px-8 h-[68px] flex items-center justify-between gap-6">
        <div className="flex items-center gap-10">
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

        <div className="flex items-center gap-2 md:gap-4">
          <LocaleSwitcher />
          <Link href="/signin" className="hidden md:inline btn-ghost">
            {t("signIn")}
          </Link>
          <Link href="/signup" className="btn-primary text-[13.5px] py-2.5 px-4 md:px-5">
            {t("signUp")}
          </Link>
        </div>
      </div>
    </header>
  );
}
