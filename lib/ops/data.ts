import { createAdminClient } from "@/lib/supabase/admin";

export type OpsClinicRow = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  areaSlug: string | null;
  areaNameEn: string | null;
  phone: string | null;
  whatsapp: string | null;
  googleMapsUrl: string | null;
  isPublished: boolean;
  verificationStatus: "pending" | "approved" | "denied";
  verificationSubmittedAt: string | null;
  subscriptionTier: number | null;
  subscriptionPackage: string | null;
  subscriptionMonthlyEgp: number | null;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
  dentistCount: number;
  bookingCount: number;
};

export type OpsRecentBooking = {
  id: string;
  slotStart: string;
  feeEgp: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  dentistNameEn: string;
  clinicNameEn: string;
  clinicSlug: string;
};

export type OpsSnapshot = {
  pending: OpsClinicRow[];
  others: OpsClinicRow[];
  recentBookings: OpsRecentBooking[];
  counts: {
    totalClinics: number;
    pendingClinics: number;
    approvedClinics: number;
    publishedClinics: number;
    totalPatients: number;
    bookingsLast30: number;
  };
};

export async function getOpsSnapshot(): Promise<OpsSnapshot> {
  const admin = createAdminClient();

  // Clinics — full table with area name, owner, dentist count, booking count.
  // For the pilot's data volume (<200 clinics) we can pull everything in
  // memory and aggregate in JS. Worth revisiting once we cross ~500 clinics.
  type ClinicRow = {
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
    phone: string | null;
    whatsapp: string | null;
    google_maps_url: string | null;
    is_published: boolean;
    verification_status: "pending" | "approved" | "denied";
    verification_submitted_at: string | null;
    subscription_tier: number | null;
    subscription_package: string | null;
    subscription_monthly_egp: number | null;
    created_at: string;
    area: { slug: string; name_en: string } | null;
  };

  const { data: clinics } = await admin
    .from("clinics")
    .select(
      `
      id, slug, name_en, name_ar, phone, whatsapp, google_maps_url,
      is_published, verification_status, verification_submitted_at,
      subscription_tier, subscription_package, subscription_monthly_egp,
      created_at,
      area:areas(slug, name_en)
    `
    )
    .order("created_at", { ascending: false })
    .returns<ClinicRow[]>();

  const clinicIds = (clinics ?? []).map((c) => c.id);

  // Owner (clinic_admins) → profile in one batched query
  const { data: adminLinks } = await admin
    .from("clinic_admins")
    .select(`clinic_id, profile:profiles(id, full_name, phone)`)
    .in("clinic_id", clinicIds.length ? clinicIds : ["00000000-0000-0000-0000-000000000000"])
    .returns<{
      clinic_id: string;
      profile: { id: string; full_name: string | null; phone: string | null } | null;
    }[]>();
  const ownerByClinic = new Map<string, { profileId: string; name: string | null }>();
  for (const a of adminLinks ?? []) {
    if (a.profile) {
      ownerByClinic.set(a.clinic_id, { profileId: a.profile.id, name: a.profile.full_name });
    }
  }

  // Resolve owner emails via auth admin API in one pass — only fetch the
  // profiles we actually need.
  const ownerEmailById = new Map<string, string>();
  const ownerIds = Array.from(new Set([...ownerByClinic.values()].map((o) => o.profileId)));
  for (const id of ownerIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) ownerEmailById.set(id, data.user.email);
  }

  // Dentist count per clinic
  const { data: cdRows } = await admin
    .from("clinic_dentists")
    .select("clinic_id, id")
    .in("clinic_id", clinicIds.length ? clinicIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("is_active", true)
    .returns<{ clinic_id: string; id: string }[]>();
  const dentistCountByClinic = new Map<string, number>();
  const clinicDentistIdsByClinic = new Map<string, string[]>();
  for (const r of cdRows ?? []) {
    dentistCountByClinic.set(r.clinic_id, (dentistCountByClinic.get(r.clinic_id) ?? 0) + 1);
    const arr = clinicDentistIdsByClinic.get(r.clinic_id) ?? [];
    arr.push(r.id);
    clinicDentistIdsByClinic.set(r.clinic_id, arr);
  }

  // Booking count per clinic (via clinic_dentists)
  const allClinicDentistIds = (cdRows ?? []).map((r) => r.id);
  const { data: apptRows } = await admin
    .from("appointments")
    .select("clinic_dentist_id, status")
    .in("clinic_dentist_id", allClinicDentistIds.length ? allClinicDentistIds : ["00000000-0000-0000-0000-000000000000"])
    .returns<{ clinic_dentist_id: string; status: string }[]>();
  const bookingByCD = new Map<string, number>();
  for (const a of apptRows ?? []) {
    bookingByCD.set(a.clinic_dentist_id, (bookingByCD.get(a.clinic_dentist_id) ?? 0) + 1);
  }
  const bookingCountByClinic = new Map<string, number>();
  for (const [clinicId, cdIds] of clinicDentistIdsByClinic) {
    let total = 0;
    for (const cdId of cdIds) total += bookingByCD.get(cdId) ?? 0;
    bookingCountByClinic.set(clinicId, total);
  }

  // Map clinics → OpsClinicRow
  const allRows: OpsClinicRow[] = (clinics ?? []).map((c) => {
    const owner = ownerByClinic.get(c.id);
    return {
      id: c.id,
      slug: c.slug,
      nameEn: c.name_en,
      nameAr: c.name_ar,
      areaSlug: c.area?.slug ?? null,
      areaNameEn: c.area?.name_en ?? null,
      phone: c.phone,
      whatsapp: c.whatsapp,
      googleMapsUrl: c.google_maps_url,
      isPublished: c.is_published,
      verificationStatus: c.verification_status,
      verificationSubmittedAt: c.verification_submitted_at,
      subscriptionTier: c.subscription_tier,
      subscriptionPackage: c.subscription_package,
      subscriptionMonthlyEgp: c.subscription_monthly_egp,
      createdAt: c.created_at,
      ownerEmail: owner ? ownerEmailById.get(owner.profileId) ?? null : null,
      ownerName: owner?.name ?? null,
      dentistCount: dentistCountByClinic.get(c.id) ?? 0,
      bookingCount: bookingCountByClinic.get(c.id) ?? 0,
    };
  });

  const pending = allRows.filter((r) => r.verificationStatus === "pending");
  const others = allRows.filter((r) => r.verificationStatus !== "pending");

  // Recent bookings feed — last 20 across the platform
  type ApptDetail = {
    id: string;
    slot_start: string;
    fee_at_booking_egp: number;
    status: OpsRecentBooking["status"];
    patient_phone: string;
    patient: { full_name: string | null } | null;
    patient_user: { email: string | null } | null;
    clinic_dentist: {
      dentist: { name_en: string } | null;
      clinic: { slug: string; name_en: string } | null;
    } | null;
  };
  const { data: recent } = await admin
    .from("appointments")
    .select(
      `
      id, slot_start, fee_at_booking_egp, status, patient_phone,
      patient:profiles!appointments_patient_id_fkey(full_name),
      clinic_dentist:clinic_dentists(
        dentist:dentists(name_en),
        clinic:clinics(slug, name_en)
      )
    `
    )
    .order("slot_start", { ascending: false })
    .limit(20)
    .returns<ApptDetail[]>();

  const recentBookings: OpsRecentBooking[] = (recent ?? []).map((r) => ({
    id: r.id,
    slotStart: r.slot_start,
    feeEgp: r.fee_at_booking_egp,
    status: r.status,
    patientName: r.patient?.full_name ?? "(unknown)",
    patientPhone: r.patient_phone,
    patientEmail: null, // resolved separately if needed; auth.users.email isn't joinable directly via PostgREST
    dentistNameEn: r.clinic_dentist?.dentist?.name_en ?? "(unknown)",
    clinicNameEn: r.clinic_dentist?.clinic?.name_en ?? "(unknown)",
    clinicSlug: r.clinic_dentist?.clinic?.slug ?? "",
  }));

  // Headline counts — cheap aggregates
  const { count: totalPatients } = await admin
    .from("profiles")
    .select("id", { head: true, count: "exact" })
    .eq("role", "patient");

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { count: bookingsLast30 } = await admin
    .from("appointments")
    .select("id", { head: true, count: "exact" })
    .gte("created_at", since.toISOString());

  return {
    pending,
    others,
    recentBookings,
    counts: {
      totalClinics: allRows.length,
      pendingClinics: pending.length,
      approvedClinics: allRows.filter((r) => r.verificationStatus === "approved").length,
      publishedClinics: allRows.filter((r) => r.isPublished).length,
      totalPatients: totalPatients ?? 0,
      bookingsLast30: bookingsLast30 ?? 0,
    },
  };
}
