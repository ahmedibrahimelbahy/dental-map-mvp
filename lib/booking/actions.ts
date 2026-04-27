"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createBookingEvent } from "@/lib/gcal/events";
import { sendEmail, bookingPatientEmail } from "@/lib/email/resend";
import type { CalendarMode } from "@/lib/supabase/types";

export type BookingResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: "not_authenticated" | "slot_taken" | "invalid" | "server_error"; message?: string };

type CreateInput = {
  clinicDentistId: string;
  slotStartIso: string;
  patientPhone: string;
  patientNote?: string;
  locale: string;
};

export async function createBookingAction(
  input: CreateInput
): Promise<BookingResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  const admin = createAdminClient();

  type CD = {
    id: string;
    dentist_id: string;
    fee_egp: number;
    slot_minutes: number;
    calendar_mode: CalendarMode;
    is_active: boolean;
    dentist: { name_ar: string; name_en: string } | null;
    clinic: { name_ar: string; name_en: string } | null;
  };
  const { data: cd } = await admin
    .from("clinic_dentists")
    .select(
      `
      id, dentist_id, fee_egp, slot_minutes, calendar_mode, is_active,
      dentist:dentists(name_ar, name_en),
      clinic:clinics(name_ar, name_en)
    `
    )
    .eq("id", input.clinicDentistId)
    .returns<CD[]>()
    .single();

  if (!cd || !cd.is_active) return { ok: false, error: "invalid" };

  const start = new Date(input.slotStartIso);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "invalid" };
  const end = new Date(start.getTime() + cd.slot_minutes * 60_000);

  // Pre-check overlap (best-effort; the unique partial index is the real guard)
  const { data: overlap } = await admin
    .from("appointments")
    .select("id")
    .eq("clinic_dentist_id", cd.id)
    .in("status", ["pending", "confirmed"])
    .lt("slot_start", end.toISOString())
    .gt("slot_end", start.toISOString())
    .returns<{ id: string }[]>()
    .limit(1)
    .maybeSingle();
  if (overlap) return { ok: false, error: "slot_taken" };

  // Read patient profile (for name in email + GCal event)
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", auth.user.id)
    .returns<{ full_name: string; email: string | null }[]>()
    .single();

  // Insert appointment
  const { data: inserted, error: insertErr } = await admin
    .from("appointments")
    .insert({
      patient_id: auth.user.id,
      clinic_dentist_id: cd.id,
      slot_start: start.toISOString(),
      slot_end: end.toISOString(),
      fee_at_booking_egp: cd.fee_egp,
      status: "confirmed",
      patient_phone: input.patientPhone,
      patient_note: input.patientNote ?? null,
    } as never)
    .select("id")
    .returns<{ id: string }[]>()
    .single();

  if (insertErr || !inserted) {
    // unique_violation = 23505 — slot taken concurrently
    if ((insertErr as { code?: string } | null)?.code === "23505") {
      return { ok: false, error: "slot_taken" };
    }
    console.error("[booking] insert failed:", insertErr);
    return { ok: false, error: "server_error" };
  }

  // Side effects (best-effort — never undo the booking on failure)
  if (cd.calendar_mode === "google") {
    try {
      const eventId = await createBookingEvent({
        dentistId: cd.dentist_id,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        patientName: profile?.full_name ?? "Patient",
        patientPhone: input.patientPhone,
        note: input.patientNote,
      });
      await admin
        .from("appointments")
        .update({ gcal_event_id: eventId } as never)
        .eq("id", inserted.id);
    } catch (e) {
      console.error("[booking] gcal write failed (non-fatal):", e);
    }
  }

  if (profile?.email) {
    try {
      const isAr = input.locale === "ar";
      const dentistName = isAr ? cd.dentist?.name_ar : cd.dentist?.name_en;
      const clinicName = isAr ? cd.clinic?.name_ar : cd.clinic?.name_en;
      const email = bookingPatientEmail({
        patientName: profile.full_name,
        dentistName: dentistName ?? "Your dentist",
        clinicName: clinicName ?? "",
        slotIso: start.toISOString(),
        feeEgp: cd.fee_egp,
        locale: input.locale,
      });
      await sendEmail({ to: profile.email, ...email });
    } catch (e) {
      console.error("[booking] email send failed (non-fatal):", e);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, appointmentId: inserted.id };
}
