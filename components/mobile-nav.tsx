"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import {
  Menu,
  X,
  Search,
  Sparkles,
  MapPin,
  Building,
  LogIn,
  UserPlus,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

type NavItem = { href: string; label: string; Icon: typeof Search };

export function MobileNav({
  labels,
  authed,
  isDentistAdmin,
  firstName,
  fullName,
  initials,
}: {
  labels: {
    search: string;
    specialties: string;
    areas: string;
    forClinics: string;
    signIn: string;
    signUp: string;
    myBookings: string;
    dashboard: string;
    signOut: string;
  };
  authed: boolean;
  isDentistAdmin: boolean;
  firstName: string;
  fullName: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);

  const browseItems: NavItem[] = [
    { href: "/search", label: labels.search, Icon: Search },
    { href: "/specialties", label: labels.specialties, Icon: Sparkles },
    { href: "/areas", label: labels.areas, Icon: MapPin },
    { href: "/for-clinics", label: labels.forClinics, Icon: Building },
  ];

  function close() {
    setOpen(false);
  }

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
            onClick={close}
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
            aria-label="Close menu"
          />
          {/* drawer */}
          <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 h-full w-[82%] max-w-[360px] bg-white shadow-2xl flex flex-col">
            {/* header — user identity if signed in */}
            {authed ? (
              <div className="px-5 pt-5 pb-4 border-b border-ink-100 bg-gradient-to-br from-teal-50 to-white">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={close}
                    className="ms-auto w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" aria-hidden />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center text-[16px] font-bold shrink-0">
                    {initials || "·"}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-[16px] font-bold text-ink-900 truncate leading-tight">
                      {fullName || firstName}
                    </div>
                    <div className="text-[12px] text-ink-500">
                      {isDentistAdmin ? "Clinic admin" : "Patient"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-5 border-b border-ink-100">
                <span className="font-display text-[18px] font-bold text-ink-900">Menu</span>
                <button
                  type="button"
                  onClick={close}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-ink-50"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" aria-hidden />
                </button>
              </div>
            )}

            {/* primary action — patient bookings / admin dashboard */}
            {authed && (
              <div className="p-3 border-b border-ink-100">
                {isDentistAdmin ? (
                  <Link
                    href="/dashboard"
                    onClick={close}
                    className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[14.5px] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <LayoutDashboard className="w-5 h-5" aria-hidden />
                      {labels.dashboard}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href="/account"
                    onClick={close}
                    className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[14.5px] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <CalendarCheck className="w-5 h-5" aria-hidden />
                      {labels.myBookings}
                    </span>
                  </Link>
                )}
              </div>
            )}

            {/* browse */}
            <nav className="flex-1 overflow-y-auto p-3">
              <div className="small-caps mb-2 px-3">Browse</div>
              <ul className="space-y-0.5">
                {browseItems.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14.5px] font-medium text-ink-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-ink-400" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* signed-out CTAs */}
              {!authed && (
                <>
                  <div className="my-4 border-t border-ink-100" />
                  <ul className="space-y-1">
                    <li>
                      <Link
                        href="/signin"
                        onClick={close}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14.5px] font-medium text-ink-700 hover:bg-teal-50 hover:text-teal-700"
                      >
                        <LogIn className="w-5 h-5 text-ink-400" aria-hidden />
                        {labels.signIn}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/signup"
                        onClick={close}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14.5px] font-bold text-white bg-teal-600 hover:bg-teal-700"
                      >
                        <UserPlus className="w-5 h-5" aria-hidden />
                        {labels.signUp}
                      </Link>
                    </li>
                  </ul>
                </>
              )}
            </nav>

            {/* sign out — pinned to bottom */}
            {authed && (
              <div className="p-3 border-t border-ink-100">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium text-rose-700 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" aria-hidden />
                    {labels.signOut}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
