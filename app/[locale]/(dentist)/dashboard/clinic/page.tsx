import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireDentistAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublishToggle } from "@/components/dashboard/publish-toggle";
import { ClinicPhotosEditor } from "@/components/dashboard/clinic-photos-editor";
import { Building2 } from "lucide-react";

type ClinicRow = {
  id: string;
  name_en: string;
  name_ar: string;
  is_published: boolean;
  address_en: string | null;
  address_ar: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
};

type DentistLink = {
  dentist_id: string;
  dentists: {
    id: string;
    name_en: string;
    name_ar: string;
    photo_url: string | null;
  } | null;
};

export default async function ClinicPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireDentistAdmin(locale);
  const t = await getTranslations("Dashboard");

  const admin = createAdminClient();
  const { data: links } = await admin
    .from("clinic_admins")
    .select("clinic_id")
    .eq("profile_id", user.id)
    .returns<{ clinic_id: string }[]>();
  const clinicIds = links?.map((l) => l.clinic_id) ?? [];

  const { data: clinics } = clinicIds.length
    ? await admin
        .from("clinics")
        .select(
          "id, name_en, name_ar, is_published, address_en, address_ar, logo_url, hero_image_url"
        )
        .in("id", clinicIds)
        .returns<ClinicRow[]>()
    : { data: [] as ClinicRow[] };

  const primary = clinics?.[0];

  // Linked dentists for the primary clinic — we render a photo slot per
  // dentist so the admin can replace any headshot without touching code.
  const { data: dentistLinks } = primary
    ? await admin
        .from("clinic_dentists")
        .select(
          "dentist_id, dentists(id, name_en, name_ar, photo_url)"
        )
        .eq("clinic_id", primary.id)
        .returns<DentistLink[]>()
    : { data: [] as DentistLink[] };

  const dentists = (dentistLinks ?? [])
    .map((l) => l.dentists)
    .filter((d): d is NonNullable<typeof d> => !!d)
    .map((d) => ({
      id: d.id,
      name: locale === "ar" ? d.name_ar : d.name_en,
      photoUrl: d.photo_url,
    }));

  // Pull image-upload + photos-editor labels from the existing namespaces so
  // we don't fork strings between onboarding and dashboard.
  const onboard = await getTranslations("Onboard");
  const photoLabels = {
    sectionTitle: t("photosSectionTitle"),
    sectionBody: t("photosSectionBody"),
    logoLabel: onboard("clinicLogoLabel"),
    logoHint: onboard("clinicLogoHint"),
    heroLabel: onboard("clinicHeroLabel"),
    heroHint: onboard("clinicHeroHint"),
    dentistsTitle: t("photosDentistsTitle"),
    saved: t("photosSaved"),
    saveFailed: t("photosSaveFailed"),
    imageUpload: {
      add: onboard("imgUploadAdd"),
      replace: onboard("imgUploadReplace"),
      remove: onboard("imgUploadRemove"),
      uploading: onboard("imgUploadUploading"),
      tooLarge: onboard("imgUploadTooLarge"),
      wrongType: onboard("imgUploadWrongType"),
      failed: onboard("imgUploadFailed"),
    },
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <Building2 className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="display-h2 text-[26px] md:text-[32px] text-ink-900">
          {t("navClinic")}
        </h1>
      </div>

      {primary ? (
        <>
          <div className="rounded-2xl border border-ink-100 bg-white p-6 md:p-7 shadow-card">
            <div className="font-display text-[20px] font-bold text-ink-900 mb-1">
              {locale === "ar" ? primary.name_ar : primary.name_en}
            </div>
            <div className="text-[13.5px] text-ink-500">
              {(locale === "ar" ? primary.address_ar : primary.address_en) ?? "—"}
            </div>
          </div>

          <PublishToggle
            clinicId={primary.id}
            initialPublished={primary.is_published}
            t={{
              title: t("publishTitle"),
              body: t("publishBody"),
              on: t("publishToggleOn"),
              off: t("publishToggleOff"),
            }}
          />

          <ClinicPhotosEditor
            initialLogoUrl={primary.logo_url}
            initialHeroUrl={primary.hero_image_url}
            dentists={dentists}
            labels={photoLabels}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 md:p-7">
          <p className="text-[14.5px] leading-[1.6] text-ink-600 max-w-[60ch]">
            {t("clinicPlaceholder")}
          </p>
        </div>
      )}
    </div>
  );
}
