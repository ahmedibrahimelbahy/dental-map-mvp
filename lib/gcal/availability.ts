import { calendar as calendarModule } from "@googleapis/calendar";
import { getAuthorizedClient } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusyInterval } from "@/lib/availability/types";

/**
 * Fetch busy intervals from the dentist's connected Google Calendar for the
 * requested window. Returns raw ISO ranges ready to pass into `computeSlots`.
 */
export async function fetchBusyIntervals(
  dentistId: string,
  fromIso: string,
  toIso: string
): Promise<BusyInterval[]> {
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
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: fromIso,
      timeMax: toIso,
      items: [{ id: calendarId }],
    },
  });

  const busy = res.data.calendars?.[calendarId]?.busy ?? [];
  return busy
    .filter(
      (b): b is { start: string; end: string } =>
        typeof b.start === "string" && typeof b.end === "string"
    )
    .map((b) => ({ start: b.start, end: b.end }));
}
