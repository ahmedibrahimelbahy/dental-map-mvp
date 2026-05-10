"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelBookingEvent } from "@/lib/gcal/events";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: "not_authenticated" | "email_mismatch" | "server_error"; message?: string };

/**
 * Hard-deletes the current user's account.
 *
 * What gets removed:
 *  - auth.users row (so they can never sign back in)
 *  - profiles row (cascades from auth.users)
 *
 * What gets preserved (and anonymized):
 *  - appointments rows — clinic accounting keeps the booking history but
 *    patient_id is nulled by the on-delete-set-null FK, and we strip
 *    patient_phone + patient_note in this action so no PII remains.
 *  - reviews rows — they reference appointments, not the patient
 *    directly, so they survive the deletion intact (rating + comment
 *    only, no name).
 *
 * Future bookings:
 *  - Set to status='cancelled' first, with best-effort GCal cleanup,
 *    so the dentist's calendar isn't holding a phantom slot.
 *
 * Confirmation:
 *  - Caller must pass the user's own email; we compare it server-side
 *    so a CSRF + email-typo guard exists. Front-end already gates the
 *    submit button to a typed match.
 */
export async function deleteAccountAction(
  confirmEmail: string
): Promise<DeleteAccountResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  const userEmail = (auth.user.email ?? "").toLowerCase();
  const typed = (confirmEmail ?? "").trim().toLowerCase();
  if (!userEmail || userEmail !== typed) {
    return { ok: false, error: "email_mismatch" };
  }

  const admin = createAdminClient();
  const userId = auth.user.id;

  // 1. Cancel future appointments + best-effort GCal cleanup.
  type FutureAppt = {
    id: string;
    gcal_event_id: string | null;
    clinic_dentist: { dentist_id: string } | null;
  };
  const { data: future } = await admin
    .from("appointments")
    .select(
      `id, gcal_event_id,
       clinic_dentist:clinic_dentists(dentist_id)`
    )
    .eq("patient_id", userId)
    .in("status", ["pending", "confirmed"])
    .gt("slot_start", new Date().toISOString())
    .returns<FutureAppt[]>();

  for (const a of future ?? []) {
    await admin
      .from("appointments")
      .update({ status: "cancelled" } as never)
      .eq("id", a.id);
    if (a.gcal_event_id && a.clinic_dentist?.dentist_id) {
      try {
        await cancelBookingEvent(a.clinic_dentist.dentist_id, a.gcal_event_id);
      } catch (e) {
        console.error("[delete-account] gcal cleanup failed (non-fatal):", e);
      }
    }
  }

  // 2. Anonymize ALL patient appointments (past + just-cancelled).
  //    patient_id will become NULL via the FK on cascade, but we proactively
  //    strip patient_phone + patient_note ahead of the cascade so even if
  //    the cascade fails, no PII survives.
  await admin
    .from("appointments")
    .update({ patient_phone: null, patient_note: null } as never)
    .eq("patient_id", userId);

  // 3. Hard-delete the auth user. Cascades to profiles (and via the new
  //    migration 005, sets appointments.patient_id to NULL).
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    console.error("[delete-account] deleteUser failed:", deleteErr);
    return { ok: false, error: "server_error", message: deleteErr.message };
  }

  return { ok: true };
}
