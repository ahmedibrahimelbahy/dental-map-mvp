/**
 * Generate an iCalendar (.ics) string for a confirmed booking.
 *
 * The output is a minimal RFC 5545 VCALENDAR with a single VEVENT.
 * Modern calendar apps (iOS Calendar, Google Calendar, Outlook,
 * Calendar.app on macOS) all parse this format the same way and
 * offer "Add to Calendar" when the user opens the file or email
 * attachment.
 */

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function generateBookingIcs(input: {
  appointmentId: string;
  startIso: string;
  endIso: string;
  dentistName: string;
  clinicName: string;
  clinicAddress?: string | null;
  feeEgp?: number | null;
}): string {
  const start = new Date(input.startIso);
  const end = new Date(input.endIso);
  const summary = `Dental appointment · ${input.dentistName}`;
  const location = input.clinicAddress
    ? `${input.clinicName}, ${input.clinicAddress}`
    : input.clinicName;
  const description = [
    `Booking on Dental Map`,
    `${input.dentistName} at ${input.clinicName}`,
    input.feeEgp != null ? `Fee: ${input.feeEgp} EGP` : null,
    "",
    "Manage this booking: https://dentalmap.app/account",
  ]
    .filter(Boolean)
    .join("\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dental Map//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:appointment-${input.appointmentId}@dentalmap.app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "URL:https://dentalmap.app/account",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Dental appointment in 1 hour",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
