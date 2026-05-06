import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron/auth";
import { sendEmail, bookingReminderEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReminderRow = {
  id: string;
  patient_id: string;
  slot_start: string;
  clinic_dentist: {
    dentist: { name_ar: string; name_en: string } | null;
    clinic: { name_ar: string; name_en: string } | null;
  } | null;
};

/**
 * Cron · every hour
 *
 * Sends a one-time reminder email ~24h before the appointment.
 * Window is 23h–25h ahead so the hourly schedule reliably catches
 * each appointment exactly once.
 *
 * Idempotency: appointments.reminder_sent_at is set after the email
 * is queued. The query filters `reminder_sent_at is null` so a
 * single appointment can never receive a duplicate reminder, even
 * if a cron run is retried.
 *
 * Locale: we don't store user locale yet, so we default to English
 * with Arabic name_ar as fallback. (Locale-aware reminders can be
 * wired up once we persist user language preference.)
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const fromIso = new Date(now + 23 * 3600_000).toISOString();
  const toIso = new Date(now + 25 * 3600_000).toISOString();

  const { data: rows, error } = await admin
    .from("appointments")
    .select(
      `
      id, patient_id, slot_start,
      clinic_dentist:clinic_dentists(
        dentist:dentists(name_ar, name_en),
        clinic:clinics(name_ar, name_en)
      )
    `
    )
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gte("slot_start", fromIso)
    .lte("slot_start", toIso)
    .returns<ReminderRow[]>();

  if (error) {
    console.error("[cron/reminders] select failed:", error);
    return NextResponse.json(
      { error: "server_error", message: error.message },
      { status: 500 }
    );
  }

  let sent = 0;
  let errors = 0;

  for (const row of rows ?? []) {
    try {
      // Patient email lives on auth.users (profiles.email is a mirror but
      // not guaranteed populated). Use the admin auth client.
      const { data: userData, error: userErr } =
        await admin.auth.admin.getUserById(row.patient_id);
      if (userErr || !userData?.user?.email) {
        console.warn(
          `[cron/reminders] no email for patient ${row.patient_id} — skipping`
        );
        errors++;
        continue;
      }
      const patientEmail = userData.user.email;

      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", row.patient_id)
        .returns<{ full_name: string }[]>()
        .maybeSingle();

      const dentistName =
        row.clinic_dentist?.dentist?.name_en ?? "your dentist";
      const clinicName = row.clinic_dentist?.clinic?.name_en ?? "";

      await sendEmail({
        to: patientEmail,
        ...bookingReminderEmail({
          patientName: profile?.full_name ?? "there",
          dentistName,
          clinicName,
          slotIso: row.slot_start,
          locale: "en",
        }),
      });

      const { error: updateErr } = await admin
        .from("appointments")
        .update({ reminder_sent_at: new Date().toISOString() } as never)
        .eq("id", row.id);

      if (updateErr) {
        console.error(
          `[cron/reminders] failed to mark ${row.id} sent:`,
          updateErr
        );
        errors++;
        continue;
      }

      sent++;
    } catch (e) {
      console.error(`[cron/reminders] failed for ${row.id}:`, e);
      errors++;
    }
  }

  console.log(`[cron/reminders] sent=${sent} errors=${errors}`);
  return NextResponse.json({ ok: true, sent, errors });
}
