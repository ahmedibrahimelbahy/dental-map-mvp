import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardForm } from "@/components/clinic/onboard-form";
import { isValidTier, type Tier } from "@/lib/clinic/pricing";
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
  const [{ data: areasRaw }, { data: specialtiesRaw }, { data: insuranceRaw }] =
    await Promise.all([
      admin
        .from("areas")
        .select("slug, name_ar, name_en, tier")
        .order("tier")
        .returns<{ slug: string; name_ar: string; name_en: string; tier: number | null }[]>(),
      admin
        .from("specialties")
        .select("slug, name_ar, name_en")
        .order("name_en")
        .returns<{ slug: string; name_ar: string; name_en: string }[]>(),
      admin
        .from("insurance_providers")
        .select("slug, name_ar, name_en")
        .order("name_en")
        .returns<{ slug: string; name_ar: string; name_en: string }[]>(),
    ]);

  const areas = (areasRaw ?? [])
    .filter((a): a is typeof a & { tier: Tier } => isValidTier(a.tier))
    .map((a) => ({
      slug: a.slug,
      nameAr: a.name_ar,
      nameEn: a.name_en,
      tier: a.tier,
    }));
  const specialties = (specialtiesRaw ?? []).map((s) => ({
    slug: s.slug,
    nameAr: s.name_ar,
    nameEn: s.name_en,
  }));
  const insuranceProviders = (insuranceRaw ?? []).map((p) => ({
    slug: p.slug,
    nameAr: p.name_ar,
    nameEn: p.name_en,
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
        insuranceProviders={insuranceProviders}
        locale={locale}
        labels={{
          location: {
            title: t("locationTitle"),
            body: t("locationBody"),
            urlLabel: t("locationUrlLabel"),
            urlHint: t("locationUrlHint"),
            urlPlaceholder: t("locationUrlPlaceholder"),
            resolveBtn: t("locationResolve"),
            resolving: t("locationResolving"),
            resolved: t("locationResolved"),
            errorInvalid: t("locationErrorInvalid"),
            errorNoCoords: t("locationErrorNoCoords"),
            errorFetch: t("locationErrorFetch"),
            manualToggle: t("locationManualToggle"),
            manualLat: t("locationManualLat"),
            manualLng: t("locationManualLng"),
            previewLabel: t("locationPreview"),
            outsideEgypt: t("locationOutsideEgypt"),
            geocodeFallbackCta: t("locationGeocodeFallback"),
            geocodeNotFound: t("locationGeocodeNotFound"),
            required: t("locationRequired"),
          },
          insuranceTitle: t("insuranceTitle"),
          insuranceBody: t("insuranceBody"),
          locationRequired: t("locationRequired"),
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
          successPendingBadge: t("successPendingBadge"),
          successTimeframe: t("successTimeframe"),
          successCallNote: t("successCallNote"),
          successEmailNote: t("successEmailNote"),
          errorPrefix: t("errorPrefix"),
          workingHoursNote: t("workingHoursNote"),
          publishNote: t("publishNote"),
          stepLabel: t("stepLabel"),
          stepClinicTitle: t("stepClinicTitle"),
          stepPricingTitle: t("stepPricingTitle"),
          back: t("back"),
          next: t("next"),
          pricingHeader: t("pricingHeader"),
          pricingSubheader: t("pricingSubheader"),
          pricingAreaPrefix: t("pricingAreaPrefix"),
          pricingMonthSuffix: t("pricingMonthSuffix"),
          packageStandard: t("packageStandard"),
          packageGrowth: t("packageGrowth"),
          packagePremium: t("packagePremium"),
          packageMostPopular: t("packageMostPopular"),
          packageBest: t("packageBest"),
          featuresStandard: t.raw("featuresStandard") as string[],
          featuresGrowth: t.raw("featuresGrowth") as string[],
          featuresPremium: t.raw("featuresPremium") as string[],
          successFeeLabel: t("successFeeLabel"),
          successFeeBody: t("successFeeBody"),
          validityTitle: t("validityTitle"),
          validityBody: t("validityBody"),
          validity1: t("validity1"),
          validity3: t("validity3"),
          pricingSelectFirst: t("pricingSelectFirst"),
          betaBadge: t("betaBadge"),
          betaTitle: t("betaTitle"),
          pricingEmptyTitle: t("pricingEmptyTitle"),
          pricingEmptyBody: t("pricingEmptyBody"),
          clinicLogoLabel: t("clinicLogoLabel"),
          clinicLogoHint: t("clinicLogoHint"),
          clinicHeroLabel: t("clinicHeroLabel"),
          clinicHeroHint: t("clinicHeroHint"),
          dentistPhotoLabel: t("dentistPhotoLabel"),
          dentistPhotoHint: t("dentistPhotoHint"),
          imageUpload: {
            add: t("imgUploadAdd"),
            replace: t("imgUploadReplace"),
            remove: t("imgUploadRemove"),
            uploading: t("imgUploadUploading"),
            tooLarge: t("imgUploadTooLarge"),
            wrongType: t("imgUploadWrongType"),
            failed: t("imgUploadFailed"),
          },
        }}
      />
    </div>
  );
}
