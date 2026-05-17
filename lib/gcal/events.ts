import { calendar as calendarModule } from "@googleapis/calendar";
import { getAuthorizedClient } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChiefComplaint } from "@/lib/supabase/types";

const COMPLAINT_LABEL_EN: Record<ChiefComplaint, string> = {
  cleaning: "Cleaning / checkup",
  pain: "Pain",
  cosmetic: "Cosmetic",
  ortho: "Orthodontics",
  emergency: "Emergency",
  other: "Other",
};

type BookingEventInput = {
  dentistId: string;
  startIso: string;
  endIso: string;
  patientName: string;
  patientPhone: string;
  chiefComplaint?: ChiefComplaint;
  note?: string;
};

/**
 * Writes the booking into the dentist's Google Calendar and returns the event id.
 */
export async function createBookingEvent(
  input: BookingEventInput
): Promise<string> {
  const oauth = await getAuthorizedClient(input.dentistId);
  const admin = createAdminClient();
  const { data: cal } = await admin
    .from("dentist_calendars")
    .select("google_calendar_id")
    .eq("dentist_id", input.dentistId)
    .returns<{ google_calendar_id: string }[]>()
    .single();
  const calendarId = cal?.google_calendar_id ?? "primary";

  const calendar = calendarModule({ version: "v3", auth: oauth });

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Dental Map · ${input.patientName}`,
      description: [
        `Patient: ${input.patientName}`,
        `Phone: ${input.patientPhone}`,
        input.chiefComplaint
          ? `Reason: ${COMPLAINT_LABEL_EN[input.chiefComplaint]}`
          : null,
        input.note ? `Note: ${input.note}` : null,
        "Booked via Dental Map.",
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: input.startIso, timeZone: "Africa/Cairo" },
      end: { dateTime: input.endIso, timeZone: "Africa/Cairo" },
    },
  });

  const eventId = res.data.id;
  if (!eventId) throw new Error("Google Calendar did not return an event id.");
  return eventId;
}

export async function cancelBookingEvent(
  dentistId: string,
  gcalEventId: string
): Promise<void> {
  const oauth = await getAuthorizedClient(dentistId);
  const admin = createAdminClient();
  const { data: cal } = await admin
    .from("dentist_calendars")
    .select("google_calendar_id")
    .eq("dentist_id", dentistId)
    .returns<{ google_calendar_id: string }[]>()
    .single();
  const calendarId = cal?.google_calendar_id ?? "primary";
  const calendar = calendarModule({ version: "v3", auth: oauth });
  await calendar.events.delete({ calendarId, eventId: gcalEventId });
}
