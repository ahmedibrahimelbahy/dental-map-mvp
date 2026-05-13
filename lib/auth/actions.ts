"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, welcomePatientEmail } from "@/lib/email/resend";

export type AuthState =
  | { ok: true; redirectTo?: string }
  | { ok: false; error: string; field?: string };

/**
 * Strip everything but digits and check we have a plausible phone
 * number. Egyptian mobiles are 11 digits starting 010/011/012/015;
 * with international prefix +20 they're 13. We accept anything from
 * 10 to 15 digits to cover the realistic range, including international
 * numbers for clinics with non-Egyptian customers.
 */
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export async function signUpAction(
  _prev: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const locale = (formData.get("locale") as string) || "ar";
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  const fullName = ((formData.get("fullName") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  const role = (formData.get("role") as string) || "patient";
  const isClinicAdmin = role === "clinic_admin";

  if (!email || !password || !fullName || !phone) {
    return { ok: false, error: "All fields are required." };
  }
  if (password.length < 8) {
    return {
      ok: false,
      error: "Password must be at least 8 characters.",
      field: "password",
    };
  }
  if (!isValidPhone(phone)) {
    return {
      ok: false,
      error:
        "Please enter a valid phone number (at least 10 digits, including country code if international).",
      field: "phone",
    };
  }

  // Create the auth user via service role with email already confirmed,
  // bypassing Supabase's built-in SMTP rate limit. The handle_new_user
  // trigger creates the matching profiles row from user_metadata.
  const adminSupa = createAdminClient();
  const { data: created, error: createErr } = await adminSupa.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (createErr) {
    const msg = (createErr.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        ok: false,
        error: "An account with that email already exists. Try signing in.",
        field: "email",
      };
    }
    return { ok: false, error: createErr.message };
  }

  // Promote to dentist_admin immediately when the user picked the clinic
  // role on the picker. Without this they stay 'patient' until the onboard
  // form submits, and the topbar shows "My bookings" during onboarding.
  if (isClinicAdmin && created?.user?.id) {
    const { error: promoteErr } = await adminSupa
      .from("profiles")
      .update({ role: "dentist_admin" } as never)
      .eq("id", created.user.id);
    if (promoteErr) {
      console.error("[signup] role promotion failed (non-fatal):", promoteErr);
    }
  }

  // Send the welcome email — best-effort, never block sign-up on it.
  try {
    await sendEmail({
      to: email,
      ...welcomePatientEmail({ patientName: fullName, locale }),
    });
  } catch (e) {
    console.error("[signup] welcome email failed (non-fatal):", e);
  }

  // User created with email_confirm:true. We deliberately do NOT sign
  // them in server-side — server-set cookies don't persist on iOS Safari
  // Private mode (confirmed via /auth-debug). The client form runs
  // signInWithPassword via the browser SDK after this returns ok, which
  // sets cookies via document.cookie (does work on iOS Safari).
  return { ok: true };
}

export async function signInAction(
  _prev: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const locale = (formData.get("locale") as string) || "ar";
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "Invalid email or password." };
  }

  // Role-based redirect: dentist admins go to dashboard, patients to home
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .returns<{ role: "patient" | "dentist_admin" | "ops" }[]>()
      .single();
    if (profile?.role === "ops") {
      revalidatePath("/", "layout");
      return { ok: true, redirectTo: `/${locale}/admin` };
    }
    if (profile?.role === "dentist_admin") {
      revalidatePath("/", "layout");
      return { ok: true, redirectTo: `/${locale}/dashboard` };
    }
  }
  revalidatePath("/", "layout");
  // Same hard-nav-via-client pattern as signUpAction — eliminates the
  // mobile cookie/RSC race entirely.
  return { ok: true, redirectTo: `/${locale}` };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  // No server-side redirect — caller does window.location.assign("/")
  // so the auth-cookie clear is fully committed before navigation.
}

/**
 * Ops-only: promote a user to dentist_admin. Called from an internal tool
 * once we've manually verified a clinic during the pilot.
 */
export async function promoteToDentistAdmin(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: "dentist_admin" } as never)
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
