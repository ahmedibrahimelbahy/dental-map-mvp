import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBusyIntervals as fetchGcalBusy } from "@/lib/gcal/availability";
import type { BusyInterval } from "./types";
import type { CalendarMode } from "@/lib/supabase/types";

/**
 * Resolve busy intervals for a (clinic, dentist) pair across whichever
 * integration mode the clinic operates in.
 *
 * In every mode we always block out our own confirmed/pending appointments
 * (so we don't double-book). In `google` mode we additionally fetch
 * free/busy from the dentist's connected Google Calendar.
 */
export async function fetchBusyForClinicDentist({
  clinicDentistId,
  dentistId,
  calendarMode,
  fromIso,
  toIso,
}: {
  clinicDentistId: string;
  dentistId: string;
  calendarMode: CalendarMode;
  fromIso: string;
  toIso: string;
}): Promise<BusyInterval[]> {
  const admin = createAdminClient();

  const { data: ourBookings } = await admin
    .from("appointments")
    .select("slot_start, slot_end, status")
    .eq("clinic_dentist_id", clinicDentistId)
    .in("status", ["pending", "confirmed"])
    .gte("slot_end", fromIso)
    .lte("slot_start", toIso)
    .returns<{ slot_start: string; slot_end: string; status: string }[]>();

  const ours: BusyInterval[] =
    ourBookings?.map((b) => ({ start: b.slot_start, end: b.slot_end })) ?? [];

  if (calendarMode === "manual") return ours;

  // google mode — also pull from the connected calendar.
  try {
    const gcal = await fetchGcalBusy(dentistId, fromIso, toIso);
    return [...ours, ...gcal];
  } catch (err) {
    // If the calendar is disconnected or token expired, gracefully fall back
    // to our-bookings-only — better than refusing to compute slots.
    console.error("[availability] gcal busy fetch failed:", err);
    return ours;
  }
}
