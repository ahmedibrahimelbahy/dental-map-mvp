import { createAdminClient } from "@/lib/supabase/admin";
import type { DentistListItem } from "@/lib/dentists/list";

export type ClinicGroup = {
  clinicId: string;
  clinicSlug: string;
  nameAr: string;
  nameEn: string;
  addressAr: string | null;
  addressEn: string | null;
  areaSlug: string | null;
  areaNameAr: string | null;
  areaNameEn: string | null;
  lat: number | null;
  lng: number | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  dentists: DentistListItem[];
  minFeeEgp: number;
  maxFeeEgp: number;
  specialtyCount: number;
};

/**
 * Group an already-fetched DentistListItem[] by clinic. Pure client-safe transform.
 * Used by the search page to render the "Clinics" entity view from the same data
 * the "Dentists" view uses.
 */
export function groupDentistsByClinic(
  dentists: DentistListItem[]
): ClinicGroup[] {
  const byClinic = new Map<string, ClinicGroup>();

  for (const d of dentists) {
    const existing = byClinic.get(d.clinicId);
    if (existing) {
      existing.dentists.push(d);
      if (d.feeEgp < existing.minFeeEgp) existing.minFeeEgp = d.feeEgp;
      if (d.feeEgp > existing.maxFeeEgp) existing.maxFeeEgp = d.feeEgp;
    } else {
      byClinic.set(d.clinicId, {
        clinicId: d.clinicId,
        clinicSlug: d.clinicSlug,
        nameAr: d.clinic.nameAr,
        nameEn: d.clinic.nameEn,
        addressAr: d.clinic.addressAr,
        addressEn: d.clinic.addressEn,
        areaSlug: d.clinic.areaSlug,
        areaNameAr: d.clinic.areaNameAr,
        areaNameEn: d.clinic.areaNameEn,
        lat: d.clinic.lat,
        lng: d.clinic.lng,
        logoUrl: d.clinic.logoUrl,
        heroImageUrl: d.clinic.heroImageUrl,
        dentists: [d],
        minFeeEgp: d.feeEgp,
        maxFeeEgp: d.feeEgp,
        specialtyCount: 0,
      });
    }
  }

  // Compute distinct specialty count per clinic across all dentists
  for (const group of byClinic.values()) {
    const specs = new Set<string>();
    for (const dentist of group.dentists) {
      for (const s of dentist.specialties) specs.add(s.slug);
    }
    group.specialtyCount = specs.size;
  }

  // Sort clinics by dentist count desc (most populous first), then by name
  return Array.from(byClinic.values()).sort((a, b) => {
    if (b.dentists.length !== a.dentists.length) {
      return b.dentists.length - a.dentists.length;
    }
    return a.nameEn.localeCompare(b.nameEn);
  });
}

export type ClinicListItem = {
  clinicId: string;
  clinicSlug: string;
  nameAr: string;
  nameEn: string;
  addressAr: string | null;
  addressEn: string | null;
  areaSlug: string | null;
  areaNameAr: string | null;
  areaNameEn: string | null;
  dentistCount: number;
  feeFromEgp: number | null;
};

/**
 * List published clinics in a given area, with the dentist count and the lowest
 * active fee across that clinic's dentists. Used by the /areas landing page.
 */
export async function listClinicsByArea(
  areaSlug: string,
  limit = 3
): Promise<ClinicListItem[]> {
  const admin = createAdminClient();

  // Resolve area
  const { data: area } = await admin
    .from("areas")
    .select("id, slug, name_ar, name_en")
    .eq("slug", areaSlug)
    .returns<{ id: string; slug: string; name_ar: string; name_en: string }[]>()
    .maybeSingle();

  if (!area) return [];

  // Pull published clinics in this area with their active dentists in one round-trip
  type Row = {
    id: string;
    slug: string;
    name_ar: string;
    name_en: string;
    address_ar: string | null;
    address_en: string | null;
    is_published: boolean;
    clinic_dentists: Array<{
      fee_egp: number;
      is_active: boolean;
      dentist: { id: string; is_published: boolean } | null;
    }>;
  };

  const { data: clinics } = await admin
    .from("clinics")
    .select(
      `
      id, slug, name_ar, name_en, address_ar, address_en, is_published,
      clinic_dentists(
        fee_egp, is_active,
        dentist:dentists(id, is_published)
      )
    `
    )
    .eq("area_id", area.id)
    .eq("is_published", true)
    .returns<Row[]>();

  if (!clinics) return [];

  const items: ClinicListItem[] = clinics
    .map((c) => {
      const liveLinks = (c.clinic_dentists ?? []).filter(
        (l) => l.is_active && l.dentist?.is_published
      );
      const fees = liveLinks.map((l) => l.fee_egp);
      return {
        clinicId: c.id,
        clinicSlug: c.slug,
        nameAr: c.name_ar,
        nameEn: c.name_en,
        addressAr: c.address_ar,
        addressEn: c.address_en,
        areaSlug: area.slug,
        areaNameAr: area.name_ar,
        areaNameEn: area.name_en,
        dentistCount: liveLinks.length,
        feeFromEgp: fees.length > 0 ? Math.min(...fees) : null,
      };
    })
    .filter((c) => c.dentistCount > 0)
    .sort((a, b) => b.dentistCount - a.dentistCount);

  return items.slice(0, limit);
}

/**
 * Single clinic profile with all its active dentists.
 * Used by the /clinic/[slug] page.
 */
export async function getClinicBySlug(slug: string) {
  const admin = createAdminClient();

  type ClinicRow = {
    id: string;
    slug: string;
    name_ar: string;
    name_en: string;
    address_ar: string | null;
    address_en: string | null;
    phone: string | null;
    whatsapp: string | null;
    lat: number | null;
    lng: number | null;
    logo_url: string | null;
    hero_image_url: string | null;
    google_maps_url: string | null;
    is_published: boolean;
    area: { slug: string; name_ar: string; name_en: string } | null;
  };

  const { data: clinic } = await admin
    .from("clinics")
    .select(
      `
      id, slug, name_ar, name_en, address_ar, address_en, phone, whatsapp,
      lat, lng, logo_url, hero_image_url, google_maps_url, is_published,
      area:areas(slug, name_ar, name_en)
    `
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .returns<ClinicRow[]>()
    .maybeSingle();

  if (!clinic) return null;

  type CDRow = {
    id: string;
    fee_egp: number;
    slot_minutes: number;
    calendar_mode: "google" | "manual";
    is_active: boolean;
    dentist: {
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      title: string;
      years_experience: number | null;
      photo_url: string | null;
      bio_ar: string | null;
      bio_en: string | null;
      is_published: boolean;
    } | null;
  };

  const { data: linksRaw } = await admin
    .from("clinic_dentists")
    .select(
      `
      id, fee_egp, slot_minutes, calendar_mode, is_active,
      dentist:dentists!inner(
        id, slug, name_ar, name_en, title, years_experience, photo_url, bio_ar, bio_en, is_published
      )
    `
    )
    .eq("clinic_id", clinic.id)
    .eq("is_active", true)
    .eq("dentist.is_published", true)
    .returns<CDRow[]>();

  const links = (linksRaw ?? []).filter((l) => l.dentist);
  if (links.length === 0) return null;

  const dentistIds = links.map((l) => l.dentist!.id);
  const { data: ds } = await admin
    .from("dentist_specialties")
    .select("dentist_id, specialty:specialties(slug, name_ar, name_en)")
    .in("dentist_id", dentistIds)
    .returns<{
      dentist_id: string;
      specialty: { slug: string; name_ar: string; name_en: string };
    }[]>();

  const specsByDentist = new Map<
    string,
    Array<{ slug: string; nameAr: string; nameEn: string }>
  >();
  for (const s of ds ?? []) {
    const arr = specsByDentist.get(s.dentist_id) ?? [];
    arr.push({
      slug: s.specialty.slug,
      nameAr: s.specialty.name_ar,
      nameEn: s.specialty.name_en,
    });
    specsByDentist.set(s.dentist_id, arr);
  }

  return { clinic, links, specsByDentist };
}
