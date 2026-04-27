/**
 * Thin Resend wrapper. Gracefully no-ops when RESEND_API_KEY isn't set,
 * so booking creation still succeeds during the early pilot before email
 * is wired up.
 */

type SendInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: SendInput): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Dental Map <bookings@dentalmap.eg>";

  if (!key) {
    console.log("[email] RESEND_API_KEY missing — skipping send to:", input.to);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, ...input }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] Resend send failed:", res.status, body);
  }
}

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
    return {
      subject: `تأكيد حجز · ${dentistName}`,
      html: text.replace(/\n/g, "<br>"),
      text,
    };
  }
  const text = `Hi ${patientName},\n\nYour booking is confirmed:\n  Dentist: ${dentistName}\n  Clinic:  ${clinicName}\n  When:    ${when}\n  Fee:     ${feeEgp} EGP\n\nWe'll send a reminder before your appointment.\nDental Map`;
  return {
    subject: `Booking confirmed · ${dentistName}`,
    html: text.replace(/\n/g, "<br>"),
    text,
  };
}
