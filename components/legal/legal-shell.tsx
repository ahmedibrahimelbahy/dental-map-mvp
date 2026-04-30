import { Link } from "@/i18n/routing";
import { ArrowLeft, FileText, ShieldCheck, ScrollText, Cookie, CalendarX } from "lucide-react";

export type LegalDoc = "privacy" | "terms" | "cancellation" | "cookies";

const ICON: Record<LegalDoc, typeof FileText> = {
  privacy: ShieldCheck,
  terms: ScrollText,
  cancellation: CalendarX,
  cookies: Cookie,
};

export function LegalShell({
  doc,
  locale,
  title,
  subtitle,
  lastUpdated,
  children,
  navLabels,
  draftNotice,
  backLabel,
}: {
  doc: LegalDoc;
  locale: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
  navLabels: Record<LegalDoc, string>;
  draftNotice: string;
  backLabel: string;
}) {
  const Icon = ICON[doc];
  const docs: LegalDoc[] = ["privacy", "terms", "cancellation", "cookies"];
  const HREF: Record<LegalDoc, "/privacy" | "/terms" | "/cancellation" | "/cookies"> = {
    privacy: "/privacy",
    terms: "/terms",
    cancellation: "/cancellation",
    cookies: "/cookies",
  };

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-5 md:px-8 py-8 md:py-14">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-teal-700 mb-5 md:mb-6"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden />
        {backLabel}
      </Link>

      <div className="grid md:grid-cols-[220px_1fr] gap-6 md:gap-10">
        {/* Side nav */}
        <aside className="md:sticky md:top-24 self-start -mx-4 sm:-mx-5 md:mx-0 px-4 sm:px-5 md:px-0">
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible no-scrollbar pb-1 md:pb-0">
            {docs.map((d) => {
              const DocIcon = ICON[d];
              const active = d === doc;
              return (
                <li key={d} className="shrink-0">
                  <Link
                    href={HREF[d]}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13.5px] font-medium whitespace-nowrap transition-colors ${
                      active
                        ? "bg-teal-50 text-teal-700"
                        : "text-ink-600 hover:bg-ink-50 hover:text-teal-700"
                    }`}
                  >
                    <DocIcon className="w-4 h-4 shrink-0" aria-hidden />
                    {navLabels[d]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Content */}
        <article>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 grid place-items-center shrink-0">
              <Icon className="w-5 h-5" aria-hidden />
            </span>
            <h1 className="display-h2 text-[26px] sm:text-[32px] md:text-[40px] text-ink-900 leading-tight">
              {title}
            </h1>
          </div>
          <p className="text-[14.5px] text-ink-500 mb-3">{subtitle}</p>
          <div className="text-[12px] text-ink-400 mb-6 md:mb-8">
            {lastUpdated} · Cairo, Egypt · {locale === "ar" ? "العربية" : "English"}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-8 text-[12.5px] leading-relaxed text-amber-900">
            {draftNotice}
          </div>

          <div className="legal-prose text-ink-700">{children}</div>
        </article>
      </div>
    </div>
  );
}
