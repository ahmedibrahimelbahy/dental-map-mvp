import { setRequestLocale, getTranslations } from "next-intl/server";
import { SignUpForm } from "@/components/auth/signup-form";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div>
      <div className="small-caps text-[11px] text-teal-600 mb-4">
        Account · Create
      </div>
      <h1 className="display-h2 text-[42px] md:text-[52px] text-ink-900 mb-3">
        {t("signUpTitle")}
      </h1>
      <p className="text-[15.5px] leading-[1.6] text-ink-500 mb-10 max-w-[38ch]">
        {t("signUpSubtitle")}
      </p>
      <SignUpForm />
    </div>
  );
}
