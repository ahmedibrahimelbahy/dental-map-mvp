import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("Brand");
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <span className="w-9 h-9 rounded-full bg-spruce-700 flex items-center justify-center text-cream leading-none text-lg display-italic transition-colors group-hover:bg-spruce-800">
        <span style={{ transform: "translateY(-1px)", display: "inline-block" }}>
          d
        </span>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[17px] font-medium tracking-tight text-ink">
            {t("name")}
          </span>
          <span className="small-caps block text-[10.5px] text-fog">
            Egypt · Cairo
          </span>
        </span>
      )}
    </Link>
  );
}
