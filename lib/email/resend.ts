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
export type EmailAttachment = {
  filename: string;
  /** Raw text content. We base64-encode it before handing to Resend. */
  content: string;
  contentType?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  const resend = getClient();
  if (!resend) return;

  const payload: Parameters<typeof resend.emails.send>[0] = {
    from: FROM,
    to,
    subject,
    html,
    text,
  };

  if (attachments?.length) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "utf-8").toString("base64"),
      contentType: a.contentType,
    }));
  }

  const { error } = await resend.emails.send(payload);

  if (error) {
    console.error("[email] Resend error:", JSON.stringify(error));
  }
}

/* ── templates ─────────────────────────────────────────────────────────── */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dentalmap.app";

export function welcomePatientEmail({
  patientName,
  locale,
}: {
  patientName: string;
  locale: string;
}): { subject: string; html: string; text: string } {
  const isAr = locale === "ar";
  if (isAr) {
    const text = `أهلاً ${patientName}،\n\nمرحبًا بك في Dental Map! حسابك جاهز.\n\nدلوقتي تقدر:\n  • تبحث في 50+ طبيب أسنان موثّق في القاهرة\n  • تشوف المواعيد المتاحة لحظيًا\n  • تحجز في ثوانٍ بدون تليفونات\n\nالعيادة بتستلم حجزك مباشرة في تقويمها — مفيش لخبطة.\n\nلو في أي سؤال، رد على الإيميل ده.\n\nDental Map\nhttps://dentalmap.app`;
    const html = `
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0F1320;">
  <h2 style="font-size: 22px; color: #0F766E; margin: 0 0 16px;">أهلاً ${patientName} 👋</h2>
  <p style="font-size: 15px; line-height: 1.65; margin: 0 0 14px;">مرحبًا بك في <strong>Dental Map</strong>. حسابك جاهز.</p>
  <p style="font-size: 14.5px; line-height: 1.7; color: #2F3645; margin: 16px 0;">دلوقتي تقدر:</p>
  <ul style="font-size: 14.5px; line-height: 1.7; color: #2F3645; padding-inline-start: 20px;">
    <li>تبحث في 50+ طبيب أسنان موثّق في القاهرة</li>
    <li>تشوف المواعيد المتاحة لحظيًا</li>
    <li>تحجز في ثوانٍ بدون تليفونات</li>
  </ul>
  <p style="font-size: 14px; line-height: 1.65; color: #5F6776; margin: 18px 0;">العيادة بتستلم حجزك مباشرة في تقويمها — مفيش لخبطة.</p>
  <p style="margin: 24px 0;">
    <a href="https://dentalmap.app/ar/search" style="background: #0D9488; color: white; padding: 12px 22px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14.5px;">ابحث عن طبيب الآن</a>
  </p>
  <p style="font-size: 12.5px; color: #5F6776; margin-top: 32px;">لو في أي سؤال، رد على الإيميل ده.<br/>Dental Map · القاهرة · <a href="https://dentalmap.app" style="color: #0F766E;">dentalmap.app</a></p>
</div>`;
    return { subject: `أهلاً ${patientName} في Dental Map 👋`, html, text };
  }
  const text = `Hi ${patientName},\n\nWelcome to Dental Map! Your account is ready.\n\nYou can now:\n  • Search 50+ verified dentists across Cairo\n  • See real-time open slots\n  • Book in seconds — no phone tag\n\nThe clinic gets your booking directly into their calendar. No back-and-forth.\n\nQuestions? Just reply to this email.\n\nDental Map\nhttps://dentalmap.app`;
  const html = `
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0F1320;">
  <h2 style="font-size: 22px; color: #0F766E; margin: 0 0 16px;">Welcome, ${patientName} 👋</h2>
  <p style="font-size: 15px; line-height: 1.65; margin: 0 0 14px;">Your <strong>Dental Map</strong> account is ready.</p>
  <p style="font-size: 14.5px; line-height: 1.7; color: #2F3645; margin: 16px 0;">You can now:</p>
  <ul style="font-size: 14.5px; line-height: 1.7; color: #2F3645; padding-inline-start: 20px;">
    <li>Search 50+ verified dentists across Cairo</li>
    <li>See real-time open slots</li>
    <li>Book in seconds — no phone tag</li>
  </ul>
  <p style="font-size: 14px; line-height: 1.65; color: #5F6776; margin: 18px 0;">The clinic receives your booking directly in their calendar — no back-and-forth.</p>
  <p style="margin: 24px 0;">
    <a href="https://dentalmap.app/en/search" style="background: #0D9488; color: white; padding: 12px 22px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14.5px;">Find a dentist</a>
  </p>
  <p style="font-size: 12.5px; color: #5F6776; margin-top: 32px;">Questions? Just reply to this email.<br/>Dental Map · Cairo · <a href="https://dentalmap.app" style="color: #0F766E;">dentalmap.app</a></p>
</div>`;
  return { subject: `Welcome to Dental Map, ${patientName} 👋`, html, text };
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
    return { subject: `تأكيد حجز · ${dentistName}`, html: text.replace(/\n/g, "<br>"), text };
  }
  const text = `Hi ${patientName},\n\nYour booking is confirmed:\n  Dentist: ${dentistName}\n  Clinic:  ${clinicName}\n  When:    ${when}\n  Fee:     ${feeEgp} EGP\n\nWe'll send a reminder before your appointment.\nDental Map`;
  return { subject: `Booking confirmed · ${dentistName}`, html: text.replace(/\n/g, "<br>"), text };
}

export function bookingReminderEmail({
  patientName,
  dentistName,
  clinicName,
  slotIso,
  locale,
}: {
  patientName: string;
  dentistName: string;
  clinicName: string;
  slotIso: string;
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
  const accountUrl = `https://dentalmap.app/${locale}/account`;

  if (isAr) {
    const text = `مرحباً ${patientName}،\n\nتذكير بميعادك بكرة:\n  الطبيب: ${dentistName}\n  العيادة: ${clinicName}\n  الموعد: ${when}\n\nلو محتاج تلغي أو تعدل، اضغط هنا:\n${accountUrl}\n\nDental Map`;
    return {
      subject: `تذكير · ${dentistName} بكرة`,
      html: text.replace(/\n/g, "<br>"),
      text,
    };
  }
  const text = `Hi ${patientName},\n\nReminder of your appointment tomorrow:\n  Dentist: ${dentistName}\n  Clinic:  ${clinicName}\n  When:    ${when}\n\nNeed to cancel or reschedule? Manage your booking:\n${accountUrl}\n\nDental Map`;
  return {
    subject: `Reminder · ${dentistName} tomorrow`,
    html: text.replace(/\n/g, "<br>"),
    text,
  };
}

export function reviewRequestEmail({
  patientName,
  dentistName,
  slotIso,
  locale,
  accountUrl,
}: {
  patientName: string;
  dentistName: string;
  slotIso: string;
  locale: string;
  accountUrl: string;
}): { subject: string; html: string; text: string } {
  const isAr = locale === "ar";
  const when = new Date(slotIso).toLocaleString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Cairo",
  });

  if (isAr) {
    const text = `مرحباً ${patientName}،\n\nإزاي كانت زيارتك مع ${dentistName} يوم ${when}؟\nقيّمها في 30 ثانية، تساعد مرضى تانيين يلاقوا دكتور كويس.\n\n${accountUrl}\n\nشكراً،\nDental Map`;
    return {
      subject: `قيّم زيارتك مع ${dentistName}`,
      html: text.replace(/\n/g, "<br>"),
      text,
    };
  }
  const text = `Hi ${patientName},\n\nHow was your visit with ${dentistName} on ${when}?\nIt takes 30 seconds to leave a review — and it helps other patients pick a great dentist.\n\n${accountUrl}\n\nThanks,\nDental Map`;
  return {
    subject: `How was your visit with ${dentistName}?`,
    html: text.replace(/\n/g, "<br>"),
    text,
  };
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
  const text = `New booking via Dental Map\n\n  Dentist: ${dentistName}\n  Clinic:  ${clinicName}\n  When:    ${when}\n  Fee:     ${feeEgp} EGP\n\nPatient details\n  Name:    ${patientName}\n  Phone:   ${patientPhone}\n  Email:   ${patientEmail}${noteLine}\n\nLog in to your dashboard to manage this appointment.\nhttps://dentalmap.app/dashboard`;
  return {
    subject: `New booking · ${patientName} · ${when}`,
    html: text.replace(/\n/g, "<br>"),
    text,
  };
}
