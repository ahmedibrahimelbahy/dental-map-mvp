"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CalendarMode, WorkingHoursDay } from "@/lib/supabase/types";

async function requireClinicAdminFor(clinicDentistId: string): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: cd } = await admin
    .from("clinic_dentists")
    .select("clinic_id")
    .eq("id", clinicDentistId)
    .returns<{ clinic_id: string }[]>()
    .single();
  if (!cd) throw new Error("clinic_dentist not found");

  const { data: ca } = await admin
    .from("clinic_admins")
    .select("profile_id")
    .eq("clinic_id", cd.clinic_id)
    .eq("profile_id", auth.user.id)
    .returns<{ profile_id: string }[]>()
    .maybeSingle();

  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .returns<{ role: "patient" | "dentist_admin" | "ops" }[]>()
    .single();

  if (!ca && me?.role !== "ops") throw new Error("Forbidden");
}

/**
 * Save working hours + slot length for a (clinic, dentist) row.
 * Only callable by an authenticated admin of that clinic.
 */
export async function saveWorkingHoursAction(input: {
  clinicDentistId: string;
  workingHours: WorkingHoursDay[];
  slotMinutes: number;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  // Verify ownership: the clinic_dentist row's clinic must have this user in clinic_admins
  const { data: cd } = await admin
    .from("clinic_dentists")
    .select("clinic_id")
    .eq("id", input.clinicDentistId)
    .returns<{ clinic_id: string }[]>()
    .single();
  if (!cd) throw new Error("clinic_dentist not found");

  const { data: ca } = await admin
    .from("clinic_admins")
    .select("profile_id")
    .eq("clinic_id", cd.clinic_id)
    .eq("profile_id", auth.user.id)
    .returns<{ profile_id: string }[]>()
    .maybeSingle();

  // Allow ops to override
  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .returns<{ role: "patient" | "dentist_admin" | "ops" }[]>()
    .single();

  if (!ca && me?.role !== "ops") throw new Error("Forbidden");

  // Validate + save
  const clean = input.workingHours
    .filter((w) => w.day >= 0 && w.day <= 6 && w.start && w.end)
    .map((w) => ({ day: w.day, start: w.start, end: w.end }));

  const allowedSlots = [15, 20, 30, 45, 60];
  const slotMinutes = allowedSlots.includes(input.slotMinutes)
    ? input.slotMinutes
    : 30;

  const { error } = await admin
    .from("clinic_dentists")
    .update({ working_hours: clean, slot_minutes: slotMinutes } as never)
    .eq("id", input.clinicDentistId);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/**
 * Save calendar integration mode for a (clinic, dentist) pair.
 * 'google'  = read/write a connected Google Calendar
 * 'manual'  = no external calendar; busy = our own appointments
 */
export async function saveCalendarModeAction(input: {
  clinicDentistId: string;
  calendarMode: CalendarMode;
}) {
  if (input.calendarMode !== "google" && input.calendarMode !== "manual") {
    throw new Error("Invalid calendar mode");
  }
  await requireClinicAdminFor(input.clinicDentistId);
  const admin = createAdminClient();
  const { error } = await admin
    .from("clinic_dentists")
    .update({ calendar_mode: input.calendarMode } as never)
    .eq("id", input.clinicDentistId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/**
 * Toggle clinic publish state. Only the clinic's admin (or ops) can flip it.
 */
export async function setClinicPublishedAction(input: {
  clinicId: string;
  published: boolean;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: ca } = await admin
    .from("clinic_admins")
    .select("profile_id")
    .eq("clinic_id", input.clinicId)
    .eq("profile_id", auth.user.id)
    .returns<{ profile_id: string }[]>()
    .maybeSingle();
  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .returns<{ role: "patient" | "dentist_admin" | "ops" }[]>()
    .single();
  if (!ca && me?.role !== "ops") throw new Error("Forbidden");

  const { error } = await admin
    .from("clinics")
    .update({ is_published: input.published } as never)
    .eq("id", input.clinicId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
