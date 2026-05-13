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
  ratingAvg: number; // 0 when no reviews
  ratingCount: number;
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

export type SortKey = "recommended" | "rating" | "price";

export type ListFilters = {
  specialtySlug?: string;
  areaSlug?: string;
  feeMax?: number;
  q?: string;
  sort?: SortKey;
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

  // Free-text filter: case-insensitive substring match on dentist + clinic
  // names (both languages). Run in JS — the result set is bounded by area
  // and specialty filters already, so this is cheap.
  const qNorm = (filters.q ?? "").trim().toLowerCase();
  const filtered = rows
    .filter((r) => r.clinic && r.dentist)
    .filter((r) => {
      if (!qNorm) return true;
      const hay = [
        r.dentist!.name_en,
        r.dentist!.name_ar,
        r.clinic!.name_en,
        r.clinic!.name_ar,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(qNorm);
    });

  // Rating aggregates — pull once for the result set so we can sort by
  // average rating without N+1 round-trips. Reviews are stored per-dentist
  // (not per-clinic_dentist), so we aggregate by dentist_id.
  const visibleDentistIds = Array.from(new Set(filtered.map((r) => r.dentist!.id)));
  const ratingByDentist = new Map<string, { avg: number; count: number }>();
  if (visibleDentistIds.length > 0) {
    const { data: reviewRows } = await admin
      .from("reviews")
      .select("dentist_id, rating")
      .in("dentist_id", visibleDentistIds)
      .not("published_at", "is", null)
      .returns<{ dentist_id: string; rating: number }[]>();
    const acc = new Map<string, { sum: number; n: number }>();
    for (const r of reviewRows ?? []) {
      const cur = acc.get(r.dentist_id) ?? { sum: 0, n: 0 };
      cur.sum += r.rating;
      cur.n += 1;
      acc.set(r.dentist_id, cur);
    }
    for (const [id, { sum, n }] of acc) {
      ratingByDentist.set(id, {
        avg: Math.round((sum / n) * 10) / 10,
        count: n,
      });
    }
  }

  const items = filtered.map<DentistListItem>((r) => {
    const stats = ratingByDentist.get(r.dentist!.id) ?? { avg: 0, count: 0 };
    return {
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
      ratingAvg: stats.avg,
      ratingCount: stats.count,
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
    };
  });

  // Sort. We do this in JS because the result set is bounded (<200 typical)
  // and the rating-based ordering depends on the aggregate we just built.
  const sort = filters.sort ?? "recommended";
  if (sort === "price") {
    items.sort((a, b) => a.feeEgp - b.feeEgp);
  } else if (sort === "rating") {
    items.sort((a, b) => {
      // Bayesian-ish: require >=3 reviews to beat unrated, otherwise stay neutral
      const aQual = a.ratingCount >= 3 ? a.ratingAvg : 0;
      const bQual = b.ratingCount >= 3 ? b.ratingAvg : 0;
      if (bQual !== aQual) return bQual - aQual;
      // Tie-break by review count, then lower price
      if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
      return a.feeEgp - b.feeEgp;
    });
  } else {
    // "recommended" — blend rating + count + (lower) price. Subscription
    // tier weighting comes in once we plumb it through. For now this gives
    // sensible default ordering that's better than the DB's natural order.
    items.sort((a, b) => {
      const aScore = (a.ratingAvg || 3) * Math.log10((a.ratingCount || 0) + 2);
      const bScore = (b.ratingAvg || 3) * Math.log10((b.ratingCount || 0) + 2);
      if (bScore !== aScore) return bScore - aScore;
      return a.feeEgp - b.feeEgp;
    });
  }

  return items;
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
      google_maps_url: string | null;
      area: { slug: string; name_ar: string; name_en: string } | null;
    } | null;
  };

  const { data: linksRaw } = await admin
    .from("clinic_dentists")
    .select(
      `
      id, fee_egp, slot_minutes, calendar_mode,
      clinic:clinics!inner(
        id, slug, name_ar, name_en, address_ar, address_en, lat, lng, google_maps_url, is_published,
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
