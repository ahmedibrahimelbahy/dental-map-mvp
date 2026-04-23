"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter, routing } from "@/i18n/routing";
import { useTransition } from "react";
import { Globe } from "lucide-react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const other = routing.locales.find((l) => l !== locale)!;

  const switchTo = () => {
    startTransition(() => {
      router.replace(pathname, { locale: other });
    });
  };

  return (
    <button
      type="button"
      onClick={switchTo}
      disabled={isPending}
      aria-label={`Switch language to ${other === "ar" ? "Arabic" : "English"}`}
      className="btn-ghost !text-ink-600 !px-2 md:!px-3"
    >
      <Globe className="w-[15px] h-[15px]" aria-hidden />
      <span className="text-[13px] font-semibold">
        {other === "ar" ? "العربية" : "English"}
      </span>
    </button>
  );
}
