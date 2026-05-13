"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/routing";

// Slim search input that lives in the site header on every page.
// Submitting (Enter or icon click) navigates to /search?q=<text>.
// The query is just a free-text filter on dentist + clinic names —
// server-side wiring is in app/[locale]/(patient)/search/page.tsx.
export function HeaderSearch({
  placeholder,
  ariaLabel,
}: {
  placeholder: string;
  ariaLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    // Push to /search keeping any other filters off — fresh query takes
    // precedence over previous filter combos.
    const href = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    router.push(href);
    // Clear once we navigate so the next focus shows the placeholder.
    // (We don't clear if the user is already typing and we just bumped them
    // on the same page — pathname check.)
    if (pathname !== "/search") setValue("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="relative flex items-center w-full max-w-[420px]"
    >
      <span className="pointer-events-none absolute start-3 text-ink-400">
        <Search className="w-4 h-4" aria-hidden />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full h-9 md:h-10 ps-9 pe-3 rounded-full border border-ink-150 bg-white text-[13px] md:text-[13.5px] text-ink-900 placeholder:text-ink-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200/60 transition-all"
        autoComplete="off"
      />
    </form>
  );
}
