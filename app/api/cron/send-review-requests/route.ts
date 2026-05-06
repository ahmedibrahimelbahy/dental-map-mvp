import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron/auth";
import { sendEmail, reviewRequestEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReviewRow = {
  id: string;
  patient_id: string;
  slot_start: string;
  slot_end: string;
  clinic_dentist: {
    dentist: { name_ar: string; name_en: string } | null;
  } | null;
};

/**
 * Cron · every hour
 *
 * Sends a one-time "How was your visit?" email ~6h after slot_end,
 * but only for appointments that have already been flipped to
 * `completed` by the finalize-appointments cron. Window is
 * 5h–7h after slot_end so the hourly schedule catches each
 * completed appointment exactly once.
 *
 * Idempotency: review_request_sent_at is set after queueing.
 *
 * Locale: defaults to English (we don't yet persist user language
 * preference). The /account page where the review form lives is
 * locale-routed via next-intl, so the link uses /en for now.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const fromIso = new Date(now - 7 * 3600_000).toISOString();
  const toIso = new Date(now - 5 * 3600_000).toISOString();

  const { data: rows, error } = await admin
    .from("appointments")
    .select(
      `
      id, patient_id, slot_start, slot_end,
      clinic_dentist:clinic_dentists(
        dentist:dentists(name_ar, name_en)
      )
    `
    )
    .eq("status", "completed")
    .is("review_request_sent_at", null)
    .gte("slot_end", fromIso)
    .lte("slot_end", toIso)
    .returns<ReviewRow[]>();

  if (error) {
    console.error("[cron/review-requests] select failed:", error);
    return NextResponse.json(
      { error: "server_error", message: error.message },
      { status: 500 }
    );
  }

  let sent = 0;
  let errors = 0;
  const locale = "en";
  const accountUrl = `https://dentalmap.app/${locale}/account`;

  for (const row of rows ?? []) {
    try {
      const { data: userData, error: userErr } =
        await admin.auth.admin.getUserById(row.patient_id);
      if (userErr || !userData?.user?.email) {
        console.warn(
          `[cron/review-requests] no email for patient ${row.patient_id} — skipping`
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

      await sendEmail({
        to: patientEmail,
        ...reviewRequestEmail({
          patientName: profile?.full_name ?? "there",
          dentistName,
          slotIso: row.slot_start,
          locale,
          accountUrl,
        }),
      });

      const { error: updateErr } = await admin
        .from("appointments")
        .update({ review_request_sent_at: new Date().toISOString() } as never)
        .eq("id", row.id);

      if (updateErr) {
        console.error(
          `[cron/review-requests] failed to mark ${row.id} sent:`,
          updateErr
        );
        errors++;
        continue;
      }

      sent++;
    } catch (e) {
      console.error(`[cron/review-requests] failed for ${row.id}:`, e);
      errors++;
    }
  }

  console.log(`[cron/review-requests] sent=${sent} errors=${errors}`);
  return NextResponse.json({ ok: true, sent, errors });
}
