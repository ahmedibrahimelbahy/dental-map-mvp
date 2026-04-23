import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  const home = useTranslations("Home");
  const brand = useTranslations("Brand");
  const nav = useTranslations("Nav");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="max-w-[1240px] mx-auto px-5 md:px-8 pt-14 pb-10">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 md:gap-12 mb-12">
          <div>
            <BrandMark />
            <p className="mt-4 text-[14.5px] leading-[1.6] text-ink-500 max-w-[38ch]">
              {home("footerTagline")}
            </p>
          </div>

          <FooterCol label={nav("search")}>
            <FooterLink href="/search">{nav("specialties")}</FooterLink>
            <FooterLink href="/areas">{nav("areas")}</FooterLink>
            <FooterLink href="/search">{nav("search")}</FooterLink>
          </FooterCol>

          <FooterCol label={nav("forClinics")}>
            <FooterLink href="/for-clinics">{nav("forClinics")}</FooterLink>
            <FooterLink href="/brief.html">Brief</FooterLink>
          </FooterCol>

          <FooterCol label={nav("account")}>
            <FooterLink href="/signin">{nav("signIn")}</FooterLink>
            <FooterLink href="/signup">{nav("signUp")}</FooterLink>
          </FooterCol>
        </div>

        <div className="border-t border-ink-100 pt-6 flex flex-wrap items-center justify-between gap-4 text-[12.5px] text-ink-400">
          <div>
            © {year} {brand("name")} · {home("footerRights")}
          </div>
          <div className="font-medium">Cairo · Egypt</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="small-caps text-ink-400 mb-4">{label}</div>
      <ul className="space-y-2.5 text-[14px] text-ink-600">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("/") && href.includes(".");
  if (isExternal) {
    return (
      <li>
        <a
          href={href}
          className="hover:text-teal-600 transition-colors"
          target="_blank"
          rel="noopener"
        >
          {children}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className="hover:text-teal-600 transition-colors">
        {children}
      </Link>
    </li>
  );
}
