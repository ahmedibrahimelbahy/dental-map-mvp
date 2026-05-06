import { setRequestLocale, getTranslations } from "next-intl/server";
import { SignUpForm } from "@/components/auth/signup-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default async function SignUpPage({
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

  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : undefined;

  return (
    <div>
      <div className="small-caps text-[11px] text-teal-600 mb-4">
        Account · Create
      </div>
      <h1 className="display-h2 text-[42px] md:text-[52px] text-ink-900 mb-3">
        {t("signUpTitle")}
      </h1>
      <p className="text-[15.5px] leading-[1.6] text-ink-500 mb-8 max-w-[38ch]">
        {t("signUpSubtitle")}
      </p>

      {error === "oauth_failed" && (
        <div className="rounded-lg border border-coral-500/40 bg-coral-100/60 px-4 py-3 text-[13.5px] text-ink-900 mb-6">
          {t("oauthFailed")}
        </div>
      )}

      <GoogleSignInButton
        locale={locale}
        label={t("googleSignUp")}
        next={safeNext}
      />

      <div
        className="my-6 flex items-center gap-4 text-[12px] text-ink-400"
        role="separator"
        aria-label={t("orContinueWith")}
      >
        <span className="h-px flex-1 bg-ink-100" />
        <span className="uppercase tracking-smallcaps">
          {t("orContinueWith")}
        </span>
        <span className="h-px flex-1 bg-ink-100" />
      </div>

      <SignUpForm />
    </div>
  );
}
