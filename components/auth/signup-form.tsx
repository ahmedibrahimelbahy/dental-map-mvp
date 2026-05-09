"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { signUpAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign-up flow:
 *   1. Server action creates the user (needs service role to bypass
 *      Supabase's email-rate-limit + auto-confirm).
 *   2. Client signs in via the browser SDK so cookies are written via
 *      document.cookie — the only path that persists on iOS Safari
 *      Private mode (confirmed via /auth-debug screenshot showing
 *      ZERO server-set cookies on iPhone Safari incognito).
 *   3. Hard reload to /{locale}.
 */
export function SignUpForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    const email = ((fd.get("email") as string) || "").trim().toLowerCase();
    const password = (fd.get("password") as string) || "";
    const fullName = ((fd.get("fullName") as string) || "").trim();
    const phone = ((fd.get("phone") as string) || "").trim();

    const fdToSend = new FormData();
    fdToSend.set("locale", locale);
    fdToSend.set("email", email);
    fdToSend.set("password", password);
    fdToSend.set("fullName", fullName);
    fdToSend.set("phone", phone);

    // Step 1 — server creates the user (admin client, email_confirm:true)
    const created = await signUpAction(undefined, fdToSend);
    if (!created.ok) {
      setError(created.error);
      setBusy(false);
      return;
    }

    // Step 2 — client signs in so the session lands in document.cookie
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      // Account is created but auto-sign-in failed. Send them to /signin.
      window.location.assign(`/${locale}/signin`);
      return;
    }

    // Step 3 — hard navigate so the server-rendered shell sees the new session
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
      </div>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            {t("submitSignUp")}
          </>
        ) : (
          t("submitSignUp")
        )}
      </button>

      <div className="mt-10 text-[14px] text-ink-500">
        {t("haveAccount")}{" "}
        <Link href="/signin" className="link-teal">
          {t("linkSignIn")}
        </Link>
      </div>
    </form>
  );
}
