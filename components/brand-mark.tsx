import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("Brand");
  return (
    <Link href="/" className="flex items-center gap-2.5 group" aria-label={t("name")}>
      <Image
        src="/dental-map-logo.jpg"
        alt=""
        width={160}
        height={160}
        priority
        className="w-9 h-9 object-contain"
      />
      {!compact && (
        <span className="hidden sm:block leading-tight">
          <span className="block font-display text-[19px] font-bold tracking-display text-ink-900">
            Dental<span className="text-teal-500"> Map</span>
          </span>
        </span>
      )}
    </Link>
  );
}
