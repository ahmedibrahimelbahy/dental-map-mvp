"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

/**
 * Magic-link sign-up. Collects name + phone (clinic needs the phone)
 * and emails the user a one-tap sign-in link. Account creation +
 * sign-in happen via the same signInWithOtp call — Supabase creates
 * the user from user_metadata when they click the link.
 */
export function SignUpForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const emailRedirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(`/${locale}`)}`;

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
        data: {
          full_name: cleanName,
          phone: cleanPhone,
        },
      },
    });

    if (otpErr) {
      setError(otpErr.message);
      setBusy(false);
      return;
    }

    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-6 text-center">
        <span className="inline-flex w-12 h-12 rounded-full bg-teal-500 text-white items-center justify-center mb-4">
          <CheckCircle2 className="w-6 h-6" aria-hidden />
        </span>
        <h2 className="font-display text-[20px] font-bold text-ink-900 mb-2">
          {t("checkEmailTitle")}
        </h2>
        <p className="text-[14px] leading-[1.65] text-ink-600 mb-2">
          {t("checkEmailBody", { email })}
        </p>
        <p className="text-[12.5px] text-ink-500 mt-4">
          {t("emailNotArrivedHint")}{" "}
          <button
            type="button"
            onClick={() => {
              setSent(false);
            }}
            className="link-teal underline"
          >
            {t("tryAgain")}
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
        {t("sendSignUpLink")}
      </button>

      <p className="text-[12.5px] leading-[1.55] text-ink-500 text-center">
        {t("magicLinkHint")}
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
