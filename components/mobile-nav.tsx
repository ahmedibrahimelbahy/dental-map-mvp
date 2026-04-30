"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Menu, X, Search, Sparkles, MapPin, Building, LogIn, UserPlus, User as UserIcon, LayoutDashboard } from "lucide-react";

type NavItem = { href: string; label: string; Icon: typeof Search };

export function MobileNav({
  labels,
  authed,
  isDentistAdmin,
  firstName,
}: {
  labels: {
    search: string;
    specialties: string;
    areas: string;
    forClinics: string;
    signIn: string;
    signUp: string;
    account: string;
    dashboard: string;
  };
  authed: boolean;
  isDentistAdmin: boolean;
  firstName: string;
}) {
  const [open, setOpen] = useState(false);

  const items: NavItem[] = [
    { href: "/search", label: labels.search, Icon: Search },
    { href: "/specialties", label: labels.specialties, Icon: Sparkles },
    { href: "/areas", label: labels.areas, Icon: MapPin },
    { href: "/for-clinics", label: labels.forClinics, Icon: Building },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-ink-700 hover:bg-ink-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" aria-hidden />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* backdrop */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
            aria-label="Close menu"
          />
          {/* drawer */}
          <div
            className="absolute top-0 right-0 rtl:right-auto rtl:left-0 h-full w-[78%] max-w-[340px] bg-white shadow-2xl flex flex-col animate-[slide_0.2s_ease_forwards]"
            style={{
              transform: "translateX(0)",
            }}
          >
            <div className="flex items-center justify-between p-5 border-b border-ink-100">
              <span className="font-display text-[18px] font-bold text-ink-900">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-ink-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {items.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14.5px] font-medium text-ink-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-ink-400" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="my-4 border-t border-ink-100" />

              {!authed && (
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/signin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14.5px] font-medium text-ink-700 hover:bg-teal-50 hover:text-teal-700"
                    >
                      <LogIn className="w-5 h-5 text-ink-400" aria-hidden />
                      {labels.signIn}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/signup"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14.5px] font-bold text-white bg-teal-600 hover:bg-teal-700"
                    >
                      <UserPlus className="w-5 h-5" aria-hidden />
                      {labels.signUp}
                    </Link>
                  </li>
                </ul>
              )}

              {authed && (
                <ul className="space-y-1">
                  {isDentistAdmin ? (
                    <li>
                      <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14.5px] font-medium text-ink-700 hover:bg-teal-50 hover:text-teal-700"
                      >
                        <LayoutDashboard className="w-5 h-5 text-ink-400" aria-hidden />
                        {labels.dashboard}
                      </Link>
                    </li>
                  ) : (
                    <li>
                      <Link
                        href="/account"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14.5px] font-medium text-ink-700 hover:bg-teal-50 hover:text-teal-700"
                      >
                        <UserIcon className="w-5 h-5 text-ink-400" aria-hidden />
                        {labels.account}
                        {firstName && (
                          <span className="ms-auto text-[12px] text-ink-400 font-medium truncate max-w-[10ch]">
                            {firstName}
                          </span>
                        )}
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
