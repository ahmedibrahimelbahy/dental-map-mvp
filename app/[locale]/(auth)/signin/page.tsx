import { setRequestLocale, getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/auth/signin-form";
import { GoogleSection } from "@/components/auth/google-section";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { next, error } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  // Sanity-check `next`: only allow same-site relative paths so we never
  // bounce a user to an external URL after OAuth.
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : undefined;

  return (
    <div>
      <div className="small-caps text-[11px] text-teal-600 mb-4">
        Account · Sign in
      </div>
      <h1 className="display-h2 text-[42px] md:text-[52px] text-ink-900 mb-3">
        {t("signInTitle")}
      </h1>
      <p className="text-[15.5px] leading-[1.6] text-ink-500 mb-8 max-w-[38ch]">
        {t("signInSubtitle")}
      </p>

      {error === "oauth_failed" && (
        <div className="rounded-lg border border-coral-500/40 bg-coral-100/60 px-4 py-3 text-[13.5px] text-ink-900 mb-6">
          {t("oauthFailed")}
        </div>
      )}

      <GoogleSection
        locale={locale}
        label={t("googleSignIn")}
        orContinueWith={t("orContinueWith")}
        next={safeNext}
        safariNote={t("safariOauthNote")}
      />

      <SignInForm />
    </div>
  );
}
