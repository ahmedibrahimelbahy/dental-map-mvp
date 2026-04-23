"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useTransition } from "react";
import { routing } from "@/i18n/routing";

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
      className="small-caps text-[11px] text-spruce-700 hover:text-copper-500 transition-colors disabled:opacity-50"
    >
      {other === "ar" ? "العربية" : "English"}
    </button>
  );
}
