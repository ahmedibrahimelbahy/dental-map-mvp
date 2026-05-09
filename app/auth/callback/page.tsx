import { CallbackClient } from "./callback-client";

export const dynamic = "force-dynamic";

/**
 * OAuth callback. Outside the [locale] segment because OAuth providers
 * don't preserve our locale prefix — locale travels in the `next` query
 * param set by the GoogleSignInButton.
 *
 * The page is a server component that just hands the code + next to the
 * client. The actual exchangeCodeForSession runs client-side via the
 * browser SDK so the new auth cookies land in document.cookie — which
 * persists on iOS Safari, unlike server-set cookies on a redirect
 * response.
 */
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F7F8F9",
        fontFamily: "-apple-system, system-ui, sans-serif",
      }}
    >
      <CallbackClient code={sp.code ?? null} next={sp.next ?? "/"} oauthError={sp.error ?? null} />
    </div>
  );
}
