"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign-out via the browser Supabase SDK so the cookie clear lands in
 * document.cookie. iOS Safari Private mode silently drops server-side
 * cookie writes — confirmed via /auth-debug — so we can't rely on
 * server-side signOut() to actually log the user out on mobile.
 */
export function SignOutButton({ label }: { label: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // Hard reload so the server-rendered layout re-runs without auth.
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="btn-ghost !py-1.5 !px-3 text-[13px]"
    >
      <LogOut className="w-4 h-4" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
