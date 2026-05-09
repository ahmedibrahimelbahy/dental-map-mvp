"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign-in form using the Supabase BROWSER client (not a server action).
 *
 * Why browser-side: server actions set cookies via response headers,
 * which iOS Safari Private mode silently drops. The browser client
 * writes cookies via document.cookie — confirmed working on the user's
 * iPhone via /auth-debug. After success we do a hard reload so the
 * server-rendered layout picks up the new auth state.
 */
export function SignInForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = ((fd.get("email") as string) || "").trim().toLowerCase();
    const password = (fd.get("password") as string) || "";

    if (!email || !password) {
      setError(t("requiredFields") ?? "Email and password are required.");
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      setError(t("invalidCredentials") ?? "Invalid email or password.");
      setBusy(false);
      return;
    }

    // Resolve the role to decide where to land. Cookies are now in
    // document.cookie via the browser SDK, so the next server request
    // will see them.
    const { data: auth } = await supabase.auth.getUser();
    let target = `/${locale}`;
    if (auth.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .returns<{ role: "patient" | "dentist_admin" | "ops" }[]>()
        .single();
      if (profile?.role === "dentist_admin" || profile?.role === "ops") {
        target = `/${locale}/dashboard`;
      }
    }

    // Hard navigation — bypasses Next.js Router Cache and forces a
    // fresh server render with the new cookies attached.
    window.location.assign(target);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-coral-500/40 bg-coral-100/60 px-4 py-3 text-[13.5px] text-ink-900">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="field-label">
          {t("email")}
        </label>
        <input
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          {t("password")}
        </label>
        <input
          id="password"
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="field-input"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            {t("submitSignIn")}
          </>
        ) : (
          t("submitSignIn")
        )}
      </button>

      <div className="mt-10 text-[14px] text-ink-500">
        {t("noAccount")}{" "}
        <Link href="/signup" className="link-teal">
          {t("linkSignUp")}
        </Link>
      </div>
    </form>
  );
}
