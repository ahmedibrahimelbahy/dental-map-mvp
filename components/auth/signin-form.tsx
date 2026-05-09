"use client";

import { useActionState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { signInAction, type AuthState } from "@/lib/auth/actions";

export function SignInForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signInAction,
    { ok: true } satisfies AuthState
  );

  // Hard-navigate on success. We deliberately bypass Next.js soft routing
  // here — on iOS Safari, server-action redirect() races with cookie
  // commit, so the new request goes out without the auth cookies and
  // the user appears still signed-out. window.location.assign forces
  // the browser to fully commit cookies before navigating.
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
            {isRedirecting ? "…" : t("submitSignIn")}
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
