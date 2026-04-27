import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeSlots } from "@/lib/availability/compute";
import { fetchBusyForClinicDentist } from "@/lib/availability/fetch-busy";
import type {
  CalendarMode,
  WorkingHoursDay,
} from "@/lib/supabase/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const fromIso =
    url.searchParams.get("from") ??
    new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const toIso =
    url.searchParams.get("to") ??
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const timeZone = url.searchParams.get("tz") ?? "Africa/Cairo";

  const admin = createAdminClient();

  type Row = {
    id: string;
    dentist_id: string;
    slot_minutes: number;
    working_hours: WorkingHoursDay[];
    calendar_mode: CalendarMode;
    is_active: boolean;
  };

  const { data, error } = await admin
    .from("clinic_dentists")
    .select("id, dentist_id, slot_minutes, working_hours, calendar_mode, is_active")
    .eq("id", id)
    .returns<Row[]>()
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return NextResponse.json({ slots: [] }, { status: 200 });
  }

  const busy = await fetchBusyForClinicDentist({
    clinicDentistId: data.id,
    dentistId: data.dentist_id,
    calendarMode: data.calendar_mode,
    fromIso,
    toIso,
  });

  const slots = computeSlots({
    workingHours: data.working_hours,
    busy,
    slotMinutes: data.slot_minutes,
    from: fromIso,
    to: toIso,
    timeZone,
  });

  return NextResponse.json({ slots, slotMinutes: data.slot_minutes });
}
