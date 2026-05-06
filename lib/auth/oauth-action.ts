"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OAuthState =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Initiates Google OAuth via Supabase Auth.
 *
 * The flow:
 *  1. Supabase returns a Google authorization URL.
 *  2. We redirect the user to that URL.
 *  3. Google redirects back to Supabase's callback (configured in the
 *     Supabase Auth dashboard for the Google provider).
 *  4. Supabase then redirects to our `redirectTo` (`/auth/callback?next=...`),
 *     where we exchange the code for a session and land the user on `next`.
 *
 * `next` is appended to `/${locale}` so users return to a localized URL
 * (e.g. `/en/book/abc123`). The Google provider strips arbitrary path/query
 * state, so we encode it into the `redirectTo` here.
 */
export async function signInWithGoogleAction(locale: string, next?: string) {
  const supabase = await createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://dentalmap.app";
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(
    `/${locale}${next ?? ""}`
  )}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }
  if (data?.url) {
    redirect(data.url);
  }
  return { ok: true as const };
}

/**
 * Form-action friendly wrapper. React's form `action` expects
 * `(formData: FormData) => void | Promise<void>`, so we drop the
 * structured return value here and just trigger the redirect.
 *
 * On error we redirect to the locale's signin page with `?error=oauth_failed`
 * so the existing error banner can render — this keeps the UX consistent
 * with what `app/auth/callback/route.ts` does on its failure path.
 */
export async function startGoogleOAuth(
  locale: string,
  next: string | undefined,
  _formData: FormData
): Promise<void> {
  const result = await signInWithGoogleAction(locale, next);
  if (result && result.ok === false) {
    redirect(`/${locale}/signin?error=oauth_failed`);
  }
}
