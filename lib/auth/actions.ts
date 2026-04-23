"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthState =
  | { ok: true }
  | { ok: false; error: string; field?: string };

export async function signUpAction(
  _prev: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const locale = (formData.get("locale") as string) || "ar";
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  const fullName = ((formData.get("fullName") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  // If email confirmation is required on Supabase, session is null
  if (!data.session) {
    redirect(`/${locale}/signin?checkEmail=1`);
  }

  redirect(`/${locale}`);
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
    if (profile?.role === "dentist_admin" || profile?.role === "ops") {
      redirect(`/${locale}/dashboard`);
    }
  }
  redirect(`/${locale}`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
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
