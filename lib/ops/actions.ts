"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";

export type OpsActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function assertOps(): Promise<OpsActionResult | null> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "not_authenticated" };
  if (user.profile.role !== "ops") return { ok: false, error: "forbidden" };
  return null;
}

// Approve: flip verification_status → 'approved' AND publish the clinic so
// it becomes searchable. Ops can still unpublish manually if needed.
export async function approveClinicAction(clinicId: string): Promise<OpsActionResult> {
  const gate = await assertOps();
  if (gate) return gate;
  const admin = createAdminClient();
  const { error } = await admin
    .from("clinics")
    .update({ verification_status: "approved", is_published: true } as never)
    .eq("id", clinicId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function denyClinicAction(clinicId: string): Promise<OpsActionResult> {
  const gate = await assertOps();
  if (gate) return gate;
  const admin = createAdminClient();
  const { error } = await admin
    .from("clinics")
    .update({ verification_status: "denied", is_published: false } as never)
    .eq("id", clinicId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function togglePublishAction(
  clinicId: string,
  next: boolean
): Promise<OpsActionResult> {
  const gate = await assertOps();
  if (gate) return gate;
  const admin = createAdminClient();
  const { error } = await admin
    .from("clinics")
    .update({ is_published: next } as never)
    .eq("id", clinicId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
