import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/routing";
import type { Database, UserRole } from "@/lib/supabase/types";

export type CurrentUser = {
  id: string;
  email: string | null;
  profile: Database["public"]["Tables"]["profiles"]["Row"];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .returns<Database["public"]["Tables"]["profiles"]["Row"][]>()
    .single();

  if (!profile) return null;

  return {
    id: auth.user.id,
    email: auth.user.email ?? null,
    profile,
  };
}

export async function requireRole(
  role: UserRole | UserRole[],
  locale: string
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    throw new Error("unreachable"); // for TS narrowing
  }

  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.profile.role)) {
    redirect({ href: "/", locale });
    throw new Error("unreachable");
  }
  return user;
}

export async function requireDentistAdmin(locale: string): Promise<CurrentUser> {
  return requireRole(["dentist_admin", "ops"], locale);
}
