import { Resend } from "resend";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("[email] RESEND_API_KEY not set — skipping");
    return null;
  }
  return new Resend(key);
}

const FROM =
  process.env.RESEND_FROM ?? "Dental Map <onboarding@resend.dev>";

/* ── generic send ──────────────────────────────────────────────────────── */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const resend = getClient();
  if (!resend) return;

  const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });

  if (error) {
    // Resend SDK error — includes full message, e.g. domain not verified
    console.error("[email] Resend error:", JSON.stringify(error));
  }
}

/* ── templates ─────────────────────────────────────────────────────────── */
export function bookingPatientEmail({
  patientName,
  dentistName,
  clinicName,
  slotIso,
  feeEgp,
  locale,
}: {
  patientName: string;
  dentistName: string;
  clinicName: string;
  slotIso: string;
  feeEgp: number;
  locale: string;
}): { subject: string; html: string; text: string } {
  const isAr = locale === "ar";
  const when = new Date(slotIso).toLocaleString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });

  if (isAr) {
    const text = `مرحباً ${patientName}،\n\nتم تأكيد حجزك:\n  الطبيب: ${dentistName}\n  العيادة: ${clinicName}\n  الموعد: ${when}\n  السعر: ${feeEgp} ج.م\n\nهنرسلك تذكير قبل الميعاد.\nDental Map`;
    return { subject: `تأكيد حجز · ${dentistName}`, html: text.replace(/\n/g, "<br>"), text };
  }
  const text = `Hi ${patientName},\n\nYour booking is confirmed:\n  Dentist: ${dentistName}\n  Clinic:  ${clinicName}\n  When:    ${when}\n  Fee:     ${feeEgp} EGP\n\nWe'll send a reminder before your appointment.\nDental Map`;
  return { subject: `Booking confirmed · ${dentistName}`, html: text.replace(/\n/g, "<br>"), text };
}

export function bookingClinicEmail({
  patientName,
  patientPhone,
  patientEmail,
  dentistName,
  clinicName,
  slotIso,
  feeEgp,
  patientNote,
}: {
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  dentistName: string;
  clinicName: string;
  slotIso: string;
  feeEgp: number;
  patientNote?: string | null;
}): { subject: string; html: string; text: string } {
  const when = new Date(slotIso).toLocaleString("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
  const noteLine = patientNote ? `\n  Note:    ${patientNote}` : "";
  const text = `New booking via Dental Map\n\n  Dentist: ${dentistName}\n  Clinic:  ${clinicName}\n  When:    ${when}\n  Fee:     ${feeEgp} EGP\n\nPatient details\n  Name:    ${patientName}\n  Phone:   ${patientPhone}\n  Email:   ${patientEmail}${noteLine}\n\nLog in to your dashboard to manage this appointment.\nhttps://dental-map-mvp.vercel.app/dashboard`;
  return {
    subject: `New booking · ${patientName} · ${when}`,
    html: text.replace(/\n/g, "<br>"),
    text,
  };
}
