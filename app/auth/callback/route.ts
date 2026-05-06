import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth code-exchange callback for Supabase Auth (Google sign-in).
 *
 * This route is intentionally OUTSIDE the [locale] segment because OAuth
 * providers don't preserve our locale prefix in the redirect URL. The
 * locale is round-tripped via the `next` query param set by
 * `signInWithGoogleAction`.
 *
 * On success: redirect to `next` (already locale-prefixed).
 * On failure: send the user back to `/en/signin?error=oauth_failed`.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/en/signin?error=oauth_failed`);
}
