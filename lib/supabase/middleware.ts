import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase auth session cookies on every request.
 *
 * Supabase requires this in middleware for Next.js App Router so that
 * Server Components, Server Actions, and Route Handlers can read a
 * fresh session via the cookies. Without it, the access token expires
 * after an hour and `getCurrentUser()` starts returning null even
 * though the user is signed in — which is what was happening in the
 * site header on mobile.
 *
 * Pattern is straight from https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Calling getUser triggers a refresh if the access token expired.
  // Do not remove this call — it's the entire point of this middleware.
  await supabase.auth.getUser();

  return response;
}
