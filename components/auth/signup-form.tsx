"use client";

import { useActionState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { signUpAction, type AuthState } from "@/lib/auth/actions";

export function SignUpForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signUpAction,
    { ok: true } satisfies AuthState
  );

  // Hard-navigate on success to bypass the iOS Safari soft-nav cookie
  // race that left mobile users still seeing Sign Up after sign-up.
  const redirectTo = state.ok ? state.redirectTo : undefined;
  useEffect(() => {
    if (redirectTo) {
      window.location.assign(redirectTo);
    }
  }, [redirectTo]);
  const isRedirecting = !!redirectTo;
  const busy = pending || isRedirecting;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      {state && !state.ok && (
        <div className="rounded-lg border border-coral-500/40 bg-coral-100/60 px-4 py-3 text-[13.5px] text-ink-900">
          {state.error}
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
            {isRedirecting ? "…" : t("submitSignUp")}
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
