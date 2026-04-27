import { createAdminClient } from "@/lib/supabase/admin";

export type DentistListItem = {
  clinicDentistId: string;
  dentistId: string;
  clinicId: string;
  dentistSlug: string;
  clinicSlug: string;
  nameAr: string;
  nameEn: string;
  title: string;
  yearsExperience: number | null;
  feeEgp: number;
  photoUrl: string | null;
  clinic: {
    nameAr: string;
    nameEn: string;
    addressAr: string | null;
    addressEn: string | null;
    lat: number | null;
    lng: number | null;
    areaSlug: string | null;
    areaNameAr: string | null;
    areaNameEn: string | null;
  };
  specialties: Array<{ slug: string; nameAr: string; nameEn: string }>;
};

export type ListFilters = {
  specialtySlug?: string;
  areaSlug?: string;
  feeMax?: number;
};

/**
 * List published dentists across published clinics with optional filters.
 * Service-role read (RLS would also allow anon, but this avoids the round-trip).
 */
export async function listDentists(
  filters: ListFilters = {}
): Promise<DentistListItem[]> {
  const admin = createAdminClient();

  // Step 1: resolve filter ids
  let areaId: string | null = null;
  if (filters.areaSlug) {
    const { data } = await admin
      .from("areas")
      .select("id")
      .eq("slug", filters.areaSlug)
      .returns<{ id: string }[]>()
      .maybeSingle();
    areaId = data?.id ?? null;
  }
  let specialtyId: string | null = null;
  if (filters.specialtySlug) {
    const { data } = await admin
      .from("specialties")
      .select("id")
      .eq("slug", filters.specialtySlug)
      .returns<{ id: string }[]>()
      .maybeSingle();
    specialtyId = data?.id ?? null;
  }

  // Step 2: if specialty filter, find dentist_ids first
  let dentistIdsForSpecialty: string[] | null = null;
  if (specialtyId) {
    const { data } = await admin
      .from("dentist_specialties")
      .select("dentist_id")
      .eq("specialty_id", specialtyId)
      .returns<{ dentist_id: string }[]>();
    dentistIdsForSpecialty = (data ?? []).map((d) => d.dentist_id);
    if (dentistIdsForSpecialty.length === 0) return [];
  }

  // Step 3: pull clinic_dentists with everything joined
  type Row = {
    id: string;
    fee_egp: number;
    clinic_id: string;
    dentist_id: string;
    is_active: boolean;
    clinic: {
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      address_ar: string | null;
      address_en: string | null;
      lat: number | null;
      lng: number | null;
      is_published: boolean;
      area: {
        slug: string;
        name_ar: string;
        name_en: string;
      } | null;
    } | null;
    dentist: {
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      title: string;
      years_experience: number | null;
      photo_url: string | null;
      is_published: boolean;
    } | null;
  };

  let q = admin
    .from("clinic_dentists")
    .select(
      `
      id, fee_egp, clinic_id, dentist_id, is_active,
      clinic:clinics!inner(
        id, slug, name_ar, name_en, address_ar, address_en, lat, lng, is_published,
        area:areas(slug, name_ar, name_en)
      ),
      dentist:dentists!inner(
        id, slug, name_ar, name_en, title, years_experience, photo_url, is_published
      )
    `
    )
    .eq("is_active", true)
    .eq("clinic.is_published", true)
    .eq("dentist.is_published", true);

  if (areaId) q = q.eq("clinic.area_id", areaId);
  if (typeof filters.feeMax === "number") q = q.lte("fee_egp", filters.feeMax);
  if (dentistIdsForSpecialty)
    q = q.in("dentist_id", dentistIdsForSpecialty);

  const { data: rows, error } = await q.returns<Row[]>();
  if (error) throw error;

  if (!rows || rows.length === 0) return [];

  // Step 4: fetch specialties for all the dentists in the result, in one round-trip
  const dentistIds = Array.from(new Set(rows.map((r) => r.dentist_id)));
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

  return rows
    .filter((r) => r.clinic && r.dentist)
    .map<DentistListItem>((r) => ({
      clinicDentistId: r.id,
      dentistId: r.dentist!.id,
      clinicId: r.clinic!.id,
      dentistSlug: r.dentist!.slug,
      clinicSlug: r.clinic!.slug,
      nameAr: r.dentist!.name_ar,
      nameEn: r.dentist!.name_en,
      title: r.dentist!.title,
      yearsExperience: r.dentist!.years_experience,
      feeEgp: r.fee_egp,
      photoUrl: r.dentist!.photo_url,
      clinic: {
        nameAr: r.clinic!.name_ar,
        nameEn: r.clinic!.name_en,
        addressAr: r.clinic!.address_ar,
        addressEn: r.clinic!.address_en,
        lat: r.clinic!.lat,
        lng: r.clinic!.lng,
        areaSlug: r.clinic!.area?.slug ?? null,
        areaNameAr: r.clinic!.area?.name_ar ?? null,
        areaNameEn: r.clinic!.area?.name_en ?? null,
      },
      specialties: specsByDentist.get(r.dentist!.id) ?? [],
    }));
}

/**
 * Single dentist + their clinic + all their (clinic, fee) pairings.
 * Used by the profile page.
 */
export async function getDentistBySlug(slug: string) {
  const admin = createAdminClient();

  type Row = {
    id: string;
    slug: string;
    name_ar: string;
    name_en: string;
    title: string;
    years_experience: number | null;
    bio_ar: string | null;
    bio_en: string | null;
    photo_url: string | null;
    is_published: boolean;
  };

  const { data: dentist } = await admin
    .from("dentists")
    .select(
      "id, slug, name_ar, name_en, title, years_experience, bio_ar, bio_en, photo_url, is_published"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .returns<Row[]>()
    .maybeSingle();

  if (!dentist) return null;

  type CD = {
    id: string;
    fee_egp: number;
    slot_minutes: number;
    calendar_mode: "google" | "manual";
    clinic: {
      id: string;
      slug: string;
      name_ar: string;
      name_en: string;
      address_ar: string | null;
      address_en: string | null;
      lat: number | null;
      lng: number | null;
      area: { slug: string; name_ar: string; name_en: string } | null;
    } | null;
  };

  const { data: linksRaw } = await admin
    .from("clinic_dentists")
    .select(
      `
      id, fee_egp, slot_minutes, calendar_mode,
      clinic:clinics!inner(
        id, slug, name_ar, name_en, address_ar, address_en, lat, lng, is_published,
        area:areas(slug, name_ar, name_en)
      )
    `
    )
    .eq("dentist_id", dentist.id)
    .eq("is_active", true)
    .eq("clinic.is_published", true)
    .returns<CD[]>();

  const { data: ds } = await admin
    .from("dentist_specialties")
    .select("specialty:specialties(slug, name_ar, name_en)")
    .eq("dentist_id", dentist.id)
    .returns<{ specialty: { slug: string; name_ar: string; name_en: string } }[]>();

  return {
    dentist,
    links: (linksRaw ?? []).filter((l) => l.clinic),
    specialties: (ds ?? []).map((s) => s.specialty),
  };
}
