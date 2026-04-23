import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function SiteFooter() {
  const t = useTranslations("Home");
  const brand = useTranslations("Brand");
  const nav = useTranslations("Nav");
  return (
    <footer className="max-w-[1200px] mx-auto px-6 md:px-10 pt-16 pb-10">
      <div className="hairline mb-10"></div>
      <div className="asterism text-center mb-10">✺ &nbsp; ✺ &nbsp; ✺</div>

      <div className="grid md:grid-cols-4 gap-10 md:gap-12 mb-12">
        <div className="md:col-span-2">
          <div className="font-display text-[34px] leading-[1.05] text-spruce-900 tracking-tight max-w-[16ch]">
            {brand("name")}
          </div>
          <p className="mt-3 text-[15px] leading-[1.65] text-ink/70 max-w-[48ch]">
            {brand("tagline")}
          </p>
        </div>

        <div>
          <div className="small-caps text-[10.5px] text-fog mb-4">
            {nav("search")}
          </div>
          <ul className="space-y-2 text-[14px] text-ink/75">
            <li>
              <Link href="/search" className="hover:text-copper-500 transition-colors">
                {nav("specialties")}
              </Link>
            </li>
            <li>
              <Link href="/areas" className="hover:text-copper-500 transition-colors">
                {nav("areas")}
              </Link>
            </li>
            <li>
              <Link href="/for-clinics" className="hover:text-copper-500 transition-colors">
                {nav("forClinics")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="small-caps text-[10.5px] text-fog mb-4">Account</div>
          <ul className="space-y-2 text-[14px] text-ink/75">
            <li>
              <Link href="/signin" className="hover:text-copper-500 transition-colors">
                {nav("signIn")}
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-copper-500 transition-colors">
                {nav("signUp")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="hairline-solid mb-5"></div>
      <div className="flex flex-wrap items-center justify-between gap-4 small-caps text-[10.5px] text-fog">
        <div>
          © {new Date().getFullYear()} {brand("name")} · {t("footerRights")}
        </div>
        <div>Cairo · Egypt</div>
      </div>
    </footer>
  );
}
