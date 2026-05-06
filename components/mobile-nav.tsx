"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    menu: string;
    patientRole: string;
    adminRole: string;
    browse: string;
  };
  authed: boolean;
  isDentistAdmin: boolean;
  firstName: string;
  fullName: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mountTarget, setMountTarget] = useState<HTMLElement | null>(null);

  // SSR-safe portal target
  useEffect(() => {
    setMountTarget(document.body);
  }, []);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // delay setting mounted so the slide-in transition runs
      requestAnimationFrame(() => setMounted(true));
      return () => {
        document.body.style.overflow = original;
      };
    } else {
      setMounted(false);
    }
  }, [open]);

  // Close drawer on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 -ms-1 rounded-lg text-ink-700 hover:bg-ink-50 active:bg-ink-100 transition-colors"
        aria-label={labels.menu}
        aria-expanded={open}
      >
        <Menu className="w-5 h-5" aria-hidden />
      </button>

      {open && mountTarget && createPortal(
        <div
          className="lg:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={labels.menu}
        >
          {/* backdrop — solid translucent black, no blur (cheap on mobile GPU) */}
          <button
            type="button"
            onClick={close}
            className={`absolute inset-0 bg-ink-900/55 transition-opacity duration-200 ${
              mounted ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Close menu"
            tabIndex={-1}
          />

          {/* drawer — slides in from the START side (left in LTR, right in RTL) */}
          <div
            className={`absolute top-0 bottom-0 start-0 w-[84%] max-w-[340px] bg-white text-ink-900 shadow-2xl flex flex-col transform transition-transform duration-200 ease-out will-change-transform ${
              mounted ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
            }`}
            style={{ backgroundColor: "#ffffff" }}
          >
            {/* header — user identity if signed in */}
            {authed ? (
              <div className="px-5 pt-5 pb-4 border-b border-ink-100 bg-teal-50">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center text-[16px] font-bold shrink-0">
                      {initials || "·"}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display text-[16px] font-bold text-ink-900 truncate leading-tight">
                        {fullName || firstName}
                      </div>
                      <div className="text-[12px] text-teal-700 font-semibold mt-0.5">
                        {isDentistAdmin ? labels.adminRole : labels.patientRole}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white active:bg-ink-100 shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" aria-hidden />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
                <span className="font-display text-[18px] font-bold text-ink-900">
                  {labels.menu}
                </span>
                <button
                  type="button"
                  onClick={close}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-ink-50 active:bg-ink-100"
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
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-[14.5px] transition-colors"
                  >
                    <LayoutDashboard className="w-5 h-5" aria-hidden />
                    {labels.dashboard}
                  </Link>
                ) : (
                  <Link
                    href="/account"
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-[14.5px] transition-colors"
                  >
                    <CalendarCheck className="w-5 h-5" aria-hidden />
                    {labels.myBookings}
                  </Link>
                )}
              </div>
            )}

            {/* browse */}
            <nav className="flex-1 overflow-y-auto p-3 bg-white">
              <div className="small-caps mb-2 px-3">{labels.browse}</div>
              <ul className="space-y-0.5">
                {browseItems.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14.5px] font-medium text-ink-700 hover:bg-teal-50 active:bg-teal-100 hover:text-teal-700 transition-colors"
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
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href="/signin"
                        onClick={close}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14.5px] font-medium text-ink-700 hover:bg-teal-50 active:bg-teal-100"
                      >
                        <LogIn className="w-5 h-5 text-ink-400" aria-hidden />
                        {labels.signIn}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/signup"
                        onClick={close}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14.5px] font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-glow"
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
              <div className="p-3 border-t border-ink-100 bg-white">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold text-rose-700 hover:bg-rose-50 active:bg-rose-100 transition-colors"
                  >
                    <LogOut className="w-5 h-5" aria-hidden />
                    {labels.signOut}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>,
        mountTarget
      )}
    </>
  );
}
