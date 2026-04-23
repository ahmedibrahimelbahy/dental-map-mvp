import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { dentistId, locale } = (await req.json().catch(() => ({}))) as {
    dentistId?: string;
    locale?: string;
  };
  const loc = locale || "ar";
  if (!dentistId) {
    return NextResponse.json({ error: "missing dentistId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.redirect(new URL(`/${loc}/signin`, req.url));
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .returns<{ role: "patient" | "dentist_admin" | "ops" }[]>()
    .single();
  if (profile?.role !== "dentist_admin" && profile?.role !== "ops") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await admin.from("dentist_calendars").delete().eq("dentist_id", dentistId);

  return NextResponse.json({ ok: true });
}
