import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BrandMark } from "./brand-mark";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteHeader() {
  const t = useTranslations("Nav");
  return (
    <header>
      <div className="hairline-solid w-full"></div>
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 pt-6 pb-4 flex items-center justify-between gap-6">
        <BrandMark />

        <nav className="hidden md:flex items-center gap-8 small-caps text-[11px] text-spruce-700">
          <Link
            href="/search"
            className="hover:text-copper-500 transition-colors"
          >
            {t("search")}
          </Link>
          <Link
            href="/specialties"
            className="hover:text-copper-500 transition-colors"
          >
            {t("specialties")}
          </Link>
          <Link
            href="/areas"
            className="hover:text-copper-500 transition-colors"
          >
            {t("areas")}
          </Link>
          <Link
            href="/for-clinics"
            className="hover:text-copper-500 transition-colors"
          >
            {t("forClinics")}
          </Link>
        </nav>

        <div className="flex items-center gap-5">
          <LocaleSwitcher />
          <span className="hidden md:inline w-px h-4 bg-ink/15"></span>
          <Link
            href="/signin"
            className="hidden md:inline small-caps text-[11px] text-spruce-700 hover:text-copper-500 transition-colors"
          >
            {t("signIn")}
          </Link>
          <Link href="/signup" className="btn-primary text-[13px] py-2 px-4">
            {t("signUp")}
          </Link>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="hairline"></div>
      </div>
    </header>
  );
}
