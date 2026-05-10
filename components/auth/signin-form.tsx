"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

/**
 * Email + password sign-in. Plain and familiar.
 *
 * Uses the browser SDK so cookies land in document.cookie (the only
 * reliable cross-browser path on iOS Safari). Hard-reloads on success
 * so the SSR-rendered shell picks up the new auth state.
 */
export function SignInForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNeedsConfirmation(false);
    setBusy(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError(t("requiredFields"));
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signInErr) {
      const msg = signInErr.message.toLowerCase();
      if (msg.includes("not confirmed") || msg.includes("not verified")) {
        setNeedsConfirmation(true);
      } else {
        setError(t("invalidCredentials"));
      }
      setBusy(false);
      return;
    }

    // Resolve role to decide redirect target
    let target = `/${locale}`;
    const { data: auth } = await supabase.auth.getUser();
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

    window.location.assign(target);
  }

  async function resendConfirmation() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: resendErr } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
    });
    setBusy(false);
    if (resendErr) {
      setError(resendErr.message);
      return;
    }
    setError(t("confirmationResent"));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-coral-500/40 bg-coral-100/60 px-4 py-3 text-[13.5px] text-ink-900">
          {error}
        </div>
      )}

      {needsConfirmation && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
          <p className="mb-2">{t("emailNotConfirmed")}</p>
          <button
            type="button"
            onClick={resendConfirmation}
            disabled={busy}
            className="text-amber-900 underline font-semibold disabled:opacity-60"
          >
            {t("resendConfirmation")}
          </button>
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
        {t("submitSignIn")}
      </button>

      <div className="mt-10 text-[14px] text-ink-500 text-center">
        {t("noAccount")}{" "}
        <Link href="/signup" className="link-teal">
          {t("linkSignUp")}
        </Link>
      </div>
    </form>
  );
}
