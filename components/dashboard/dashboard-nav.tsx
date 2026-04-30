"use client";

import { Link, usePathname } from "@/i18n/routing";
import { LayoutDashboard, CalendarDays, Building2, BookOpenCheck } from "lucide-react";

export function DashboardNav({
  t,
}: {
  t: { home: string; calendar: string; clinic: string; bookings: string };
}) {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: t.home, Icon: LayoutDashboard },
    { href: "/dashboard/calendar", label: t.calendar, Icon: CalendarDays },
    { href: "/dashboard/clinic", label: t.clinic, Icon: Building2 },
    { href: "/dashboard/bookings", label: t.bookings, Icon: BookOpenCheck },
  ] as const;

  return (
    <nav className="md:sticky md:top-24 md:self-start -mx-4 sm:-mx-5 md:mx-0 px-4 sm:px-5 md:px-0">
      <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible no-scrollbar pb-1 md:pb-0 snap-x">
        {items.map(({ href, label, Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0 snap-start">
              <Link
                href={href}
                className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 rounded-xl text-[13.5px] md:text-[14px] font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-ink-600 hover:bg-white hover:text-teal-700"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
