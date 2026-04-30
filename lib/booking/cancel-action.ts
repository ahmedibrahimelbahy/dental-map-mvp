"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelBookingEvent } from "@/lib/gcal/events";

export type CancelResult =
  | { ok: true }
  | { ok: false; error: "not_authenticated" | "not_found" | "too_late" | "already_cancelled" | "server_error" };

const MIN_HOURS_BEFORE_CANCEL = 2;

/**
 * Patient cancels their own booking. Verifies ownership, enforces the
 * minimum cancellation window, removes the GCal event (best-effort), and
 * flips the appointment status to 'cancelled'.
 */
export async function cancelBookingAction(appointmentId: string): Promise<CancelResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  const admin = createAdminClient();

  type Row = {
    id: string;
    patient_id: string;
    status: string;
    slot_start: string;
    gcal_event_id: string | null;
    clinic_dentist: { dentist_id: string } | null;
  };
  const { data: appt } = await admin
    .from("appointments")
    .select(
      `id, patient_id, status, slot_start, gcal_event_id,
       clinic_dentist:clinic_dentists(dentist_id)`
    )
    .eq("id", appointmentId)
    .returns<Row[]>()
    .maybeSingle();

  if (!appt || appt.patient_id !== auth.user.id) {
    return { ok: false, error: "not_found" };
  }
  if (appt.status === "cancelled") {
    return { ok: false, error: "already_cancelled" };
  }
  if (appt.status === "completed" || appt.status === "no_show") {
    return { ok: false, error: "too_late" };
  }

  const minutesAhead =
    (new Date(appt.slot_start).getTime() - Date.now()) / 60_000;
  if (minutesAhead < MIN_HOURS_BEFORE_CANCEL * 60) {
    return { ok: false, error: "too_late" };
  }

  // Flip status first — even if GCal cleanup fails, the slot is freed
  const { error: updateErr } = await admin
    .from("appointments")
    .update({ status: "cancelled" } as never)
    .eq("id", appointmentId);

  if (updateErr) {
    console.error("[cancel] db update failed:", updateErr);
    return { ok: false, error: "server_error" };
  }

  // Remove the GCal event (best-effort)
  if (appt.gcal_event_id && appt.clinic_dentist?.dentist_id) {
    try {
      await cancelBookingEvent(appt.clinic_dentist.dentist_id, appt.gcal_event_id);
    } catch (e) {
      console.error("[cancel] gcal cleanup failed (non-fatal):", e);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
