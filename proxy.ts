import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all paths except:
    // - /api, /_next, /_vercel, static files, and anything with a dot
    "/((?!api|_next|_vercel|design-brief|.*\\..*).*)",
  ],
};
