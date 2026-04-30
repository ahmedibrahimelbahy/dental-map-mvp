import { createAdminClient } from "@/lib/supabase/admin";

export type PatientBooking = {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  slotStartIso: string;
  slotEndIso: string;
  feeEgp: number;
  patientPhone: string;
  patientNote: string | null;
  gcalEventId: string | null;
  dentistSlug: string;
  dentistNameAr: string;
  dentistNameEn: string;
  clinicNameAr: string;
  clinicNameEn: string;
  clinicAddressAr: string | null;
  clinicAddressEn: string | null;
  areaNameAr: string | null;
  areaNameEn: string | null;
  isUpcoming: boolean;
  isCancellable: boolean; // true if upcoming, not cancelled, more than 2h away
};

const MIN_HOURS_BEFORE_CANCEL = 2;

export async function listPatientBookings(patientId: string): Promise<PatientBooking[]> {
  const admin = createAdminClient();

  type Row = {
    id: string;
    status: PatientBooking["status"];
    slot_start: string;
    slot_end: string;
    fee_at_booking_egp: number;
    patient_phone: string;
    patient_note: string | null;
    gcal_event_id: string | null;
    clinic_dentist: {
      dentist: { slug: string; name_ar: string; name_en: string } | null;
      clinic: {
        name_ar: string;
        name_en: string;
        address_ar: string | null;
        address_en: string | null;
        area: { name_ar: string; name_en: string } | null;
      } | null;
    } | null;
  };

  const { data, error } = await admin
    .from("appointments")
    .select(
      `id, status, slot_start, slot_end, fee_at_booking_egp,
       patient_phone, patient_note, gcal_event_id,
       clinic_dentist:clinic_dentists!inner(
         dentist:dentists(slug, name_ar, name_en),
         clinic:clinics(name_ar, name_en, address_ar, address_en,
           area:areas(name_ar, name_en)
         )
       )`
    )
    .eq("patient_id", patientId)
    .order("slot_start", { ascending: false })
    .returns<Row[]>();

  if (error) throw error;
  if (!data) return [];

  const now = Date.now();
  const minMsAhead = MIN_HOURS_BEFORE_CANCEL * 60 * 60 * 1000;

  return data.map<PatientBooking>((r) => {
    const startMs = new Date(r.slot_start).getTime();
    const isUpcoming = startMs > now;
    const isCancellable =
      isUpcoming &&
      (r.status === "confirmed" || r.status === "pending") &&
      startMs - now > minMsAhead;

    return {
      id: r.id,
      status: r.status,
      slotStartIso: r.slot_start,
      slotEndIso: r.slot_end,
      feeEgp: r.fee_at_booking_egp,
      patientPhone: r.patient_phone,
      patientNote: r.patient_note,
      gcalEventId: r.gcal_event_id,
      dentistSlug: r.clinic_dentist?.dentist?.slug ?? "",
      dentistNameAr: r.clinic_dentist?.dentist?.name_ar ?? "—",
      dentistNameEn: r.clinic_dentist?.dentist?.name_en ?? "—",
      clinicNameAr: r.clinic_dentist?.clinic?.name_ar ?? "—",
      clinicNameEn: r.clinic_dentist?.clinic?.name_en ?? "—",
      clinicAddressAr: r.clinic_dentist?.clinic?.address_ar ?? null,
      clinicAddressEn: r.clinic_dentist?.clinic?.address_en ?? null,
      areaNameAr: r.clinic_dentist?.clinic?.area?.name_ar ?? null,
      areaNameEn: r.clinic_dentist?.clinic?.area?.name_en ?? null,
      isUpcoming,
      isCancellable,
    };
  });
}
