import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * OAuth code-exchange callback for Supabase Auth (Google sign-in).
 *
 * This route is intentionally OUTSIDE the [locale] segment because OAuth
 * providers don't preserve our locale prefix in the redirect URL. The
 * locale is round-tripped via the `next` query param set by
 * `signInWithGoogleAction`.
 *
 * Cookie handling: we build the redirect response FIRST and pass its
 * cookie jar to the Supabase client, so the auth cookies set by
 * `exchangeCodeForSession` are written onto the redirect response that
 * actually reaches the browser. The naive `cookies()` helper from
 * next/headers does not survive `NextResponse.redirect()` in route
 * handlers — that was the bug behind the stuck "Sign up" button.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/en/signin?error=oauth_failed`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/en/signin?error=oauth_failed`);
  }

  return response;
}
