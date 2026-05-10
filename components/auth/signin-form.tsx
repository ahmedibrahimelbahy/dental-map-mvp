"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

/**
 * 6-digit OTP code sign-in. No magic-link click → no cross-domain
 * redirect chain → iOS Safari ITP can't break it.
 *
 * Stage 1: user enters email → we call signInWithOtp without
 *   emailRedirectTo so Supabase emails them just the code (and a link
 *   we tell them to ignore — eliminating the link entirely requires a
 *   custom email template, deferred).
 * Stage 2: user enters the 6-digit code → verifyOtp({type:"email"}) →
 *   browser SDK writes cookies via document.cookie → hard reload.
 */
export function SignInForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError(t("emailRequired"));
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: false },
    });

    if (otpErr) {
      const msg = otpErr.message.toLowerCase();
      if (msg.includes("not found") || msg.includes("signups not allowed")) {
        setError(t("noAccountForEmail"));
      } else {
        setError(otpErr.message);
      }
      setBusy(false);
      return;
    }

    setStage("code");
    setBusy(false);
  }

  async function verifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setError(t("codeSixDigits"));
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: cleanCode,
      type: "email",
    });

    if (verifyErr || !data.session) {
      setError(verifyErr?.message ?? t("invalidCode"));
      setBusy(false);
      return;
    }

    // Resolve role for redirect target
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

  if (stage === "code") {
    return (
      <form onSubmit={verifyCode} className="space-y-5">
        <button
          type="button"
          onClick={() => {
            setStage("email");
            setCode("");
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-teal-700"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden />
          {t("changeEmail")}
        </button>

        <div className="rounded-xl bg-teal-50/40 border border-teal-200 p-4">
          <p className="text-[13.5px] leading-[1.6] text-ink-700">
            {t.rich("codeSentTo", {
              email,
              strong: (chunks) => (
                <strong className="text-ink-900">{chunks}</strong>
              ),
            })}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-coral-500/40 bg-coral-100/60 px-4 py-3 text-[13.5px] text-ink-900">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="code" className="field-label">
            {t("codeLabel")}
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="field-input !text-[20px] !tracking-[0.4em] !text-center !font-bold"
            placeholder="••••••"
          />
        </div>

        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : null}
          {t("verifyCode")}
        </button>

        <p className="text-[12.5px] text-center text-ink-500">
          {t("emailNotArrivedHint")}{" "}
          <button
            type="button"
            onClick={() => {
              setStage("email");
              setCode("");
            }}
            className="link-teal underline"
          >
            {t("tryAgain")}
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-5">
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input"
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : (
          <Mail className="w-4 h-4" aria-hidden />
        )}
        {t("sendCode")}
      </button>

      <p className="text-[12.5px] leading-[1.55] text-ink-500 text-center">
        {t("codeHint")}
      </p>

      <div className="mt-10 text-[14px] text-ink-500 text-center">
        {t("noAccount")}{" "}
        <Link href="/signup" className="link-teal">
          {t("linkSignUp")}
        </Link>
      </div>
    </form>
  );
}
