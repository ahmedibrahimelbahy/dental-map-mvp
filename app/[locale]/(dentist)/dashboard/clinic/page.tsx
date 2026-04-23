import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireDentistAdmin } from "@/lib/auth/session";
import { Building2 } from "lucide-react";

export default async function ClinicPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireDentistAdmin(locale);
  const t = await getTranslations("Dashboard");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <Building2 className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="display-h2 text-[26px] md:text-[32px] text-ink-900">
          {t("navClinic")}
        </h1>
      </div>
      <div className="rounded-2xl border border-ink-100 bg-white p-6 md:p-7 shadow-card">
        <p className="text-[14.5px] leading-[1.65] text-ink-600 max-w-[60ch]">
          {t("clinicPlaceholder")}
        </p>
      </div>
    </div>
  );
}
