"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createBookingEvent } from "@/lib/gcal/events";
import { sendEmail, bookingPatientEmail, bookingClinicEmail } from "@/lib/email/resend";
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

  // Read patient profile (name for email + GCal event).
  // Email comes from auth.user — profiles table has no email column.
  const patientEmail = auth.user.email ?? null;
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", auth.user.id)
    .returns<{ full_name: string }[]>()
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
    // Only attempt GCal write if the dentist has actually connected their calendar
    const { data: calRow } = await admin
      .from("dentist_calendars")
      .select("dentist_id")
      .eq("dentist_id", cd.dentist_id)
      .returns<{ dentist_id: string }[]>()
      .maybeSingle();

    if (!calRow) {
      console.log(
        `[booking] dentist ${cd.dentist_id} has no GCal token — skipping calendar write (connect via /dashboard/calendar)`
      );
    } else {
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
  }

  const isAr = input.locale === "ar";
  const dentistName = isAr ? cd.dentist?.name_ar : cd.dentist?.name_en;
  const clinicName = isAr ? cd.clinic?.name_ar : cd.clinic?.name_en;
  const dentistNameEn = cd.dentist?.name_en ?? "Your dentist";
  const clinicNameEn = cd.clinic?.name_en ?? "";

  // Patient confirmation email
  if (patientEmail) {
    try {
      await sendEmail({
        to: patientEmail,
        ...bookingPatientEmail({
          patientName: profile?.full_name ?? "Patient",
          dentistName: dentistName ?? dentistNameEn,
          clinicName: clinicName ?? clinicNameEn,
          slotIso: start.toISOString(),
          feeEgp: cd.fee_egp,
          locale: input.locale,
        }),
      });
    } catch (e) {
      console.error("[booking] patient email failed (non-fatal):", e);
    }
  }

  // Clinic admin notification — sent to CLINIC_NOTIFICATION_EMAIL env var.
  // Pilot shortcut: one env var covers all clinics. Replace with per-clinic
  // lookup once we have a clinic_admins table.
  const clinicAdminEmail = process.env.CLINIC_NOTIFICATION_EMAIL ?? null;
  if (clinicAdminEmail) {
    try {
      await sendEmail({
        to: clinicAdminEmail,
        ...bookingClinicEmail({
          patientName: profile?.full_name ?? "Patient",
          patientPhone: input.patientPhone,
          patientEmail: patientEmail ?? "",
          dentistName: dentistNameEn,
          clinicName: clinicNameEn,
          slotIso: start.toISOString(),
          feeEgp: cd.fee_egp,
          patientNote: input.patientNote,
        }),
      });
    } catch (e) {
      console.error("[booking] clinic email failed (non-fatal):", e);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, appointmentId: inserted.id };
}
