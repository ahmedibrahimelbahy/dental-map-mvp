"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

/**
 * 6-digit OTP code sign-up. Same pattern as SignInForm but collects
 * full name + phone first, then sends a code to the email. The
 * handle_new_user trigger picks up name + phone from user_metadata
 * when the user is created on first verifyOtp.
 */
export function SignUpForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [stage, setStage] = useState<"form" | "code">("form");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanEmail || !cleanName || !cleanPhone) {
      setError(t("requiredFields"));
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        data: { full_name: cleanName, phone: cleanPhone },
      },
    });

    if (otpErr) {
      setError(otpErr.message);
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

    window.location.assign(`/${locale}`);
  }

  if (stage === "code") {
    return (
      <form onSubmit={verifyCode} className="space-y-5">
        <button
          type="button"
          onClick={() => {
            setStage("form");
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
          {t("verifyCodeAndCreate")}
        </button>

        <p className="text-[12.5px] text-center text-ink-500">
          {t("emailNotArrivedHint")}{" "}
          <button
            type="button"
            onClick={() => {
              setStage("form");
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
        <label htmlFor="fullName" className="field-label">
          {t("fullName")}
        </label>
        <input
          id="fullName"
          type="text"
          name="fullName"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="field-input"
        />
      </div>

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

      <div>
        <label htmlFor="phone" className="field-label">
          {t("phone")}
        </label>
        <input
          id="phone"
          type="tel"
          name="phone"
          required
          autoComplete="tel"
          inputMode="tel"
          pattern="[0-9+\s\-]+"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="field-input"
        />
        <p className="mt-2 text-[12.5px] text-ink-500 leading-[1.5]">
          {t("phoneHint")}
        </p>
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
        {t("haveAccount")}{" "}
        <Link href="/signin" className="link-teal">
          {t("linkSignIn")}
        </Link>
      </div>
    </form>
  );
}
