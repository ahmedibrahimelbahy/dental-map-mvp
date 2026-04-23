import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOAuthClient, GCAL_SCOPES } from "@/lib/gcal/client";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const dentistId = url.searchParams.get("dentistId");
  const locale = url.searchParams.get("locale") || "ar";

  if (!dentistId) {
    return NextResponse.json({ error: "missing dentistId" }, { status: 400 });
  }

  // Auth check — must be a dentist_admin for a clinic that employs this dentist
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.redirect(
      new URL(`/${locale}/signin`, req.url)
    );
  }

  const admin = createAdminClient();

  // Lightweight authz: user must be dentist_admin or ops.
  // Strict ownership check (user admin's this dentist's clinic) is done in the callback.
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .returns<{ role: "patient" | "dentist_admin" | "ops" }[]>()
    .single();
  if (profile?.role !== "dentist_admin" && profile?.role !== "ops") {
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  const state = randomBytes(24).toString("hex");
  const oauth = createOAuthClient();
  const authUrl = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GCAL_SCOPES,
    state,
    include_granted_scopes: true,
  });

  const res = NextResponse.redirect(authUrl);
  // Signed-ish state cookie — bound to user + dentist for the callback to validate
  res.cookies.set(
    "gcal_oauth_state",
    JSON.stringify({ state, dentistId, userId: auth.user.id, locale }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600, // 10 min
    }
  );
  return res;
}
