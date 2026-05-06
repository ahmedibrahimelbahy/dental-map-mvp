/**
 * Vercel Cron auth.
 *
 * Vercel sends scheduled requests with `Authorization: Bearer ${CRON_SECRET}`.
 * We compare against `process.env.CRON_SECRET`. If unset, we allow the request
 * through with a warning so manual curl-driven debugging works locally — the
 * env var is still required in production.
 */
export function isCronAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.warn(
      "[cron] CRON_SECRET not set — allowing unauthenticated invocation"
    );
    return true;
  }
  return auth === `Bearer ${expected}`;
}
