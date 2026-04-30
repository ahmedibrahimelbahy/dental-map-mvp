import { createAdminClient } from "@/lib/supabase/admin";

export type AppointmentRow = {
  id: string;
  slotStartIso: string;
  slotEndIso: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  feeEgp: number;
  patientPhone: string;
  patientNote: string | null;
  gcalEventId: string | null;
  patientName: string;
  patientEmail: string | null;
  dentistNameAr: string;
  dentistNameEn: string;
  clinicNameAr: string;
  clinicNameEn: string;
};

/**
 * Pilot path: returns ALL appointments. Once we add a clinic_admins table,
 * filter by clinics the user owns. ops role always sees all.
 */
export async function listAppointmentsForAdmin(): Promise<AppointmentRow[]> {
  const admin = createAdminClient();

  type Row = {
    id: string;
    slot_start: string;
    slot_end: string;
    status: AppointmentRow["status"];
    fee_at_booking_egp: number;
    patient_phone: string;
    patient_note: string | null;
    gcal_event_id: string | null;
    patient_id: string;
    clinic_dentist: {
      dentist: { name_ar: string; name_en: string } | null;
      clinic: { name_ar: string; name_en: string } | null;
    } | null;
  };

  const { data: rows, error } = await admin
    .from("appointments")
    .select(
      `
      id, slot_start, slot_end, status, fee_at_booking_egp,
      patient_phone, patient_note, gcal_event_id, patient_id,
      clinic_dentist:clinic_dentists!inner(
        dentist:dentists(name_ar, name_en),
        clinic:clinics(name_ar, name_en)
      )
    `
    )
    .order("slot_start", { ascending: true })
    .returns<Row[]>();

  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // Resolve patient names from profiles + emails from auth.users
  const patientIds = Array.from(new Set(rows.map((r) => r.patient_id)));

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", patientIds)
    .returns<{ id: string; full_name: string | null }[]>();
  const nameById = new Map<string, string>(
    (profiles ?? []).map((p) => [p.id, p.full_name ?? "—"])
  );

  // Emails live in auth.users — fetch one by one (no bulk lookup in supa-js).
  // Acceptable at pilot volume; cache to avoid duplicate lookups.
  const emailById = new Map<string, string | null>();
  await Promise.all(
    patientIds.map(async (id) => {
      try {
        const { data } = await admin.auth.admin.getUserById(id);
        emailById.set(id, data.user?.email ?? null);
      } catch {
        emailById.set(id, null);
      }
    })
  );

  return rows.map<AppointmentRow>((r) => ({
    id: r.id,
    slotStartIso: r.slot_start,
    slotEndIso: r.slot_end,
    status: r.status,
    feeEgp: r.fee_at_booking_egp,
    patientPhone: r.patient_phone,
    patientNote: r.patient_note,
    gcalEventId: r.gcal_event_id,
    patientName: nameById.get(r.patient_id) ?? "—",
    patientEmail: emailById.get(r.patient_id) ?? null,
    dentistNameAr: r.clinic_dentist?.dentist?.name_ar ?? "—",
    dentistNameEn: r.clinic_dentist?.dentist?.name_en ?? "—",
    clinicNameAr: r.clinic_dentist?.clinic?.name_ar ?? "—",
    clinicNameEn: r.clinic_dentist?.clinic?.name_en ?? "—",
  }));
}
