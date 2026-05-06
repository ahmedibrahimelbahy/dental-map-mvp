import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Composed middleware:
 *   1. Refresh Supabase auth cookies (so getCurrentUser() sees a fresh session)
 *   2. Run next-intl locale routing on top
 *
 * The intl middleware may return a redirect for the locale prefix; we copy
 * the Supabase-set cookies onto that response so the auth tokens survive.
 */
export default async function proxy(request: NextRequest) {
  const supaResponse = await updateSession(request);
  const intlResponse = intlMiddleware(request);

  // intl returns either a NextResponse (redirect/rewrite) or undefined.
  // When it produces its own response, transfer the auth cookies onto it.
  if (intlResponse instanceof NextResponse) {
    supaResponse.cookies.getAll().forEach((c) => {
      intlResponse.cookies.set(c.name, c.value, {
        domain: c.domain,
        expires: c.expires,
        httpOnly: c.httpOnly,
        maxAge: c.maxAge,
        path: c.path,
        sameSite: c.sameSite,
        secure: c.secure,
      });
    });
    return intlResponse;
  }

  return supaResponse;
}

export const config = {
  matcher: [
    // Match all paths except:
    // - /api, /auth/callback, /_next, /_vercel, static files, anything with a dot
    "/((?!api|auth/callback|auth-debug|_next|_vercel|design-brief|.*\\..*).*)",
  ],
};
