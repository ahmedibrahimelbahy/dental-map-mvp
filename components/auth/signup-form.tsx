"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { signUpAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";

/**
 * One-shot sign-up: name + email + phone + password → user created
 * via admin client (email pre-confirmed) → client SDK signs them in
 * via signInWithPassword → hard reload.
 *
 * No OTP, no email click, no friction. Email validity is verified
 * later when we send a booking confirmation — if the address is fake
 * we just don't deliver to it.
 */
export function SignUpForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    const email = ((fd.get("email") as string) || "").trim().toLowerCase();
    const password = (fd.get("password") as string) || "";
    const fullName = ((fd.get("fullName") as string) || "").trim();
    const phone = ((fd.get("phone") as string) || "").trim();

    if (!email || !password || !fullName || !phone) {
      setError(t("requiredFields"));
      setBusy(false);
      return;
    }
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      setBusy(false);
      return;
    }

    // Step 1 — server creates the auth user (email_confirm:true bypasses
    // OTP entirely). Service-role client only used here.
    const sendFd = new FormData();
    sendFd.set("locale", locale);
    sendFd.set("email", email);
    sendFd.set("password", password);
    sendFd.set("fullName", fullName);
    sendFd.set("phone", phone);

    const created = await signUpAction(undefined, sendFd);
    if (!created.ok) {
      const msg = created.error.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        setError(t("emailAlreadyTaken"));
      } else {
        setError(created.error);
      }
      setBusy(false);
      return;
    }

    // Step 2 — sign in client-side so cookies land in document.cookie.
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      // Account is created but auto-sign-in failed — send to /signin
      window.location.assign(`/${locale}/signin`);
      return;
    }

    // Step 3 — hard reload so the SSR shell sees the session
    window.location.assign(`/${locale}`);
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
          className="field-input"
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
          className="field-input"
        />
        <p className="mt-2 text-[12.5px] text-ink-500 leading-[1.5]">
          {t("phoneHint")}
        </p>
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
          minLength={8}
          autoComplete="new-password"
          className="field-input"
        />
        <p className="mt-2 text-[12.5px] text-ink-500 leading-[1.5]">
          {t("passwordHint")}
        </p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
        {t("submitSignUp")}
      </button>

      <div className="mt-10 text-[14px] text-ink-500 text-center">
        {t("haveAccount")}{" "}
        <Link href="/signin" className="link-teal">
          {t("linkSignIn")}
        </Link>
      </div>
    </form>
  );
}
