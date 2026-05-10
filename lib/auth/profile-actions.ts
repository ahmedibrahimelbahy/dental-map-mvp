"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type ProfileUpdateResult =
  | { ok: true }
  | { ok: false; error: string; field?: "fullName" | "phone" | "password" };

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/** Update full_name and/or phone on the patient's profile. */
export async function updateProfileAction(input: {
  fullName?: string;
  phone?: string;
}): Promise<ProfileUpdateResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Not signed in." };

  const updates: { full_name?: string; phone?: string } = {};
  if (input.fullName !== undefined) {
    const cleanName = input.fullName.trim();
    if (!cleanName) {
      return { ok: false, error: "Name cannot be empty.", field: "fullName" };
    }
    updates.full_name = cleanName;
  }
  if (input.phone !== undefined) {
    const cleanPhone = input.phone.trim();
    if (!isValidPhone(cleanPhone)) {
      return {
        ok: false,
        error: "Please enter a valid phone number.",
        field: "phone",
      };
    }
    updates.phone = cleanPhone;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(updates as never)
    .eq("id", auth.user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Change the user's password. Requires the current password. */
export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ProfileUpdateResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !auth.user.email) {
    return { ok: false, error: "Not signed in." };
  }
  if (input.newPassword.length < 8) {
    return {
      ok: false,
      error: "New password must be at least 8 characters.",
      field: "password",
    };
  }

  // Re-auth with the current password before allowing the change.
  // (We don't have a "verify password" endpoint, so we sign in again.)
  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: input.currentPassword,
  });
  if (reauthErr) {
    return {
      ok: false,
      error: "Current password is incorrect.",
      field: "password",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(auth.user.id, {
    password: input.newPassword,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
