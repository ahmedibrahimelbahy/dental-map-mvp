import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

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
      <div className="small-caps text-[11px] text-copper-500 mb-4">
        Account · Create
      </div>
      <h1 className="display-h2 text-[42px] md:text-[52px] text-spruce-900 mb-3">
        {t("signUpTitle")}
      </h1>
      <p className="text-[15.5px] leading-[1.6] text-ink/70 mb-10 max-w-[38ch]">
        {t("signUpSubtitle")}
      </p>

      <form className="space-y-5">
        <div>
          <label htmlFor="fullName" className="field-label">
            {t("fullName")}
          </label>
          <input
            id="fullName"
            type="text"
            name="fullName"
            required
            autoComplete="name"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="phone" className="field-label">
            {t("phone")}
          </label>
          <input
            id="phone"
            type="tel"
            name="phone"
            required
            autoComplete="tel"
            inputMode="tel"
            pattern="[0-9+\s\-]+"
            className="field-input"
          />
          <p className="mt-2 text-[12.5px] text-ink/55 leading-[1.5]">
            {t("phoneHint")}
          </p>
        </div>
        <div>
          <label htmlFor="password" className="field-label">
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="field-input"
          />
        </div>

        <button type="submit" className="btn-primary w-full mt-2">
          {t("submitSignUp")}
        </button>
      </form>

      <div className="mt-10 text-[14px] text-ink/70">
        {t("haveAccount")}{" "}
        <Link
          href="/signin"
          className="text-spruce-700 hover:text-copper-500 underline decoration-copper-500/40 underline-offset-4 transition-colors"
        >
          {t("linkSignIn")}
        </Link>
      </div>
    </div>
  );
}
