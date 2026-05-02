import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardForm } from "@/components/clinic/onboard-form";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OnboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Onboard");

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/signin?next=/onboard", locale });
    return null;
  }

  const admin = createAdminClient();
  const [{ data: areasRaw }, { data: specialtiesRaw }] = await Promise.all([
    admin
      .from("areas")
      .select("slug, name_ar, name_en")
      .order("name_en")
      .returns<{ slug: string; name_ar: string; name_en: string }[]>(),
    admin
      .from("specialties")
      .select("slug, name_ar, name_en")
      .order("name_en")
      .returns<{ slug: string; name_ar: string; name_en: string }[]>(),
  ]);

  const areas = (areasRaw ?? []).map((a) => ({
    slug: a.slug,
    nameAr: a.name_ar,
    nameEn: a.name_en,
  }));
  const specialties = (specialtiesRaw ?? []).map((s) => ({
    slug: s.slug,
    nameAr: s.name_ar,
    nameEn: s.name_en,
  }));

  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-5 md:px-8 py-8 md:py-14">
      <header className="mb-7 md:mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-teal-50 text-teal-600 grid place-items-center shrink-0">
            <Building2 className="w-5 h-5 md:w-6 md:h-6" aria-hidden />
          </span>
          <h1 className="display-h2 text-[24px] sm:text-[28px] md:text-[36px] text-ink-900 leading-tight">
            {t("pageTitle")}
          </h1>
        </div>
        <p className="text-[14px] md:text-[15px] leading-[1.65] text-ink-500 max-w-[64ch]">
          {t("pageSubtitle")}
        </p>
      </header>

      <OnboardForm
        areas={areas}
        specialties={specialties}
        locale={locale}
        labels={{
          sectionClinic: t("sectionClinic"),
          sectionDentists: t("sectionDentists"),
          sectionSubmit: t("sectionSubmit"),
          clinicNameEn: t("clinicNameEn"),
          clinicNameAr: t("clinicNameAr"),
          addressEn: t("addressEn"),
          addressAr: t("addressAr"),
          area: t("area"),
          areaPlaceholder: t("areaPlaceholder"),
          phone: t("phone"),
          whatsapp: t("whatsapp"),
          whatsappHint: t("whatsappHint"),
          dentistN: t("dentistN"),
          addDentist: t("addDentist"),
          removeDentist: t("removeDentist"),
          dentistNameEn: t("dentistNameEn"),
          dentistNameAr: t("dentistNameAr"),
          title: t("title"),
          titles: {
            professor: t("titleProfessor"),
            consultant: t("titleConsultant"),
            specialist: t("titleSpecialist"),
            resident: t("titleResident"),
          },
          yearsExp: t("yearsExp"),
          feeEgp: t("feeEgp"),
          specialties: t("specialties"),
          submit: t("submit"),
          submitting: t("submitting"),
          successTitle: t("successTitle"),
          successBody: t("successBody"),
          successCta: t("successCta"),
          errorPrefix: t("errorPrefix"),
          workingHoursNote: t("workingHoursNote"),
          publishNote: t("publishNote"),
        }}
      />
    </div>
  );
}
