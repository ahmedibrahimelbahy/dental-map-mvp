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

export type OpsPatientRow = {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  bookingCount: number;
  lastBookingAt: string | null;
};

export type OpsRecentReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  dentistNameEn: string;
  clinicNameEn: string;
  patientName: string;
};

export type OpsCalendarHealthRow = {
  dentistId: string;
  dentistName: string;
  clinicName: string;
  mode: "google" | "manual";
  lastSyncedAt: string | null;
};

export type OpsSnapshot = {
  pending: OpsClinicRow[];
  others: OpsClinicRow[];
  recentBookings: OpsRecentBooking[];
  patients: OpsPatientRow[];
  recentReviews: OpsRecentReview[];
  calendarHealth: OpsCalendarHealthRow[];
  counts: {
    totalClinics: number;
    pendingClinics: number;
    approvedClinics: number;
    publishedClinics: number;
    totalDentists: number;
    totalPatients: number;
    totalReviews: number;
    bookingsLast30: number;
    revenueLast30Egp: number;
    monthlyRecurringEgp: number;
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

  const { count: totalDentists } = await admin
    .from("dentists")
    .select("id", { head: true, count: "exact" });

  const { count: totalReviews } = await admin
    .from("reviews")
    .select("id", { head: true, count: "exact" })
    .not("published_at", "is", null);

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { count: bookingsLast30 } = await admin
    .from("appointments")
    .select("id", { head: true, count: "exact" })
    .gte("created_at", since.toISOString());

  // Revenue last 30 days — sum of fees on completed appointments (paid at
  // clinic, but a useful directional metric for the marketplace's GMV).
  const { data: feeRows } = await admin
    .from("appointments")
    .select("fee_at_booking_egp")
    .eq("status", "completed")
    .gte("slot_end", since.toISOString())
    .returns<{ fee_at_booking_egp: number }[]>();
  const revenueLast30Egp = (feeRows ?? []).reduce(
    (s, r) => s + (r.fee_at_booking_egp ?? 0),
    0
  );

  // Monthly recurring revenue — only counts approved+published clinics
  // since pending ones aren't billable.
  const monthlyRecurringEgp = allRows
    .filter((r) => r.verificationStatus === "approved" && r.isPublished)
    .reduce((s, r) => s + (r.subscriptionMonthlyEgp ?? 0), 0);

  // Patients — top 50 by booking count (or recent signups if no bookings)
  type PatientProfile = {
    id: string;
    full_name: string | null;
    phone: string | null;
    created_at: string;
  };
  const { data: patientProfiles } = await admin
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("role", "patient")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<PatientProfile[]>();

  const patientIds = (patientProfiles ?? []).map((p) => p.id);
  // Booking aggregates per patient
  const { data: patientAppts } = await admin
    .from("appointments")
    .select("patient_id, slot_start")
    .in("patient_id", patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"])
    .returns<{ patient_id: string; slot_start: string }[]>();
  const bookingCountByPatient = new Map<string, number>();
  const lastBookingByPatient = new Map<string, string>();
  for (const a of patientAppts ?? []) {
    bookingCountByPatient.set(a.patient_id, (bookingCountByPatient.get(a.patient_id) ?? 0) + 1);
    const prev = lastBookingByPatient.get(a.patient_id);
    if (!prev || a.slot_start > prev) lastBookingByPatient.set(a.patient_id, a.slot_start);
  }
  // Resolve emails for these patients via auth admin (one per id — not
  // ideal but fine at pilot scale; revisit with a batched query if it
  // gets slow).
  const patientEmailById = new Map<string, string>();
  for (const id of patientIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) patientEmailById.set(id, data.user.email);
  }
  const patients: OpsPatientRow[] = (patientProfiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    phone: p.phone,
    email: patientEmailById.get(p.id) ?? null,
    createdAt: p.created_at,
    bookingCount: bookingCountByPatient.get(p.id) ?? 0,
    lastBookingAt: lastBookingByPatient.get(p.id) ?? null,
  }));

  // Recent reviews — 10 most recent, with denormalised dentist + clinic + patient
  type ReviewRow = {
    id: string;
    rating: number;
    comment_en: string | null;
    comment_ar: string | null;
    published_at: string;
    appointment: {
      patient: { full_name: string | null } | null;
      clinic_dentist: {
        dentist: { name_en: string } | null;
        clinic: { name_en: string } | null;
      } | null;
    } | null;
  };
  const { data: reviewRows } = await admin
    .from("reviews")
    .select(
      `
      id, rating, comment_en, comment_ar, published_at,
      appointment:appointments!inner(
        patient:profiles!appointments_patient_id_fkey(full_name),
        clinic_dentist:clinic_dentists(
          dentist:dentists(name_en),
          clinic:clinics(name_en)
        )
      )
    `
    )
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(10)
    .returns<ReviewRow[]>();

  const recentReviews: OpsRecentReview[] = (reviewRows ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment_en ?? r.comment_ar ?? null,
    createdAt: r.published_at,
    dentistNameEn: r.appointment?.clinic_dentist?.dentist?.name_en ?? "(unknown)",
    clinicNameEn: r.appointment?.clinic_dentist?.clinic?.name_en ?? "(unknown)",
    patientName: r.appointment?.patient?.full_name ?? "(unknown)",
  }));

  // Calendar health — per active clinic_dentist, what mode + last sync
  type CalRow = {
    dentist_id: string;
    dentist: { name_en: string } | null;
    clinic: { name_en: string } | null;
    calendar_mode: "google" | "manual";
  };
  const { data: calRows } = await admin
    .from("clinic_dentists")
    .select(
      `dentist_id, calendar_mode,
       dentist:dentists(name_en),
       clinic:clinics!inner(name_en, is_published)`
    )
    .eq("is_active", true)
    .eq("clinic.is_published", true)
    .returns<CalRow[]>();
  const calendarHealth: OpsCalendarHealthRow[] = (calRows ?? [])
    .filter((r) => r.dentist && r.clinic)
    .map((r) => ({
      dentistId: r.dentist_id,
      dentistName: r.dentist!.name_en,
      clinicName: r.clinic!.name_en,
      mode: r.calendar_mode,
      lastSyncedAt: null, // dentist_calendars table tracks this; punt for v1
    }));

  return {
    pending,
    others,
    recentBookings,
    patients,
    recentReviews,
    calendarHealth,
    counts: {
      totalClinics: allRows.length,
      pendingClinics: pending.length,
      approvedClinics: allRows.filter((r) => r.verificationStatus === "approved").length,
      publishedClinics: allRows.filter((r) => r.isPublished).length,
      totalDentists: totalDentists ?? 0,
      totalPatients: totalPatients ?? 0,
      totalReviews: totalReviews ?? 0,
      bookingsLast30: bookingsLast30 ?? 0,
      revenueLast30Egp,
      monthlyRecurringEgp,
    },
  };
}
