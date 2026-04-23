import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient } from "@/lib/gcal/client";
import { encrypt } from "@/lib/crypto/encryption";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const stateCookie = req.cookies.get("gcal_oauth_state")?.value;
  let parsedState: {
    state: string;
    dentistId: string;
    userId: string;
    locale: string;
  } | null = null;
  if (stateCookie) {
    try {
      parsedState = JSON.parse(stateCookie);
    } catch {
      parsedState = null;
    }
  }
  const locale = parsedState?.locale || "ar";

  if (errorParam) {
    return NextResponse.redirect(
      new URL(
        `/${locale}/dashboard/calendar?gcal=denied`,
        req.url
      )
    );
  }
  if (!code || !returnedState || !parsedState) {
    return NextResponse.redirect(
      new URL(`/${locale}/dashboard/calendar?gcal=bad_state`, req.url)
    );
  }
  if (returnedState !== parsedState.state) {
    return NextResponse.redirect(
      new URL(`/${locale}/dashboard/calendar?gcal=state_mismatch`, req.url)
    );
  }

  // Verify the current session matches the user who started the flow
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== parsedState.userId) {
    return NextResponse.redirect(new URL(`/${locale}/signin`, req.url));
  }

  const oauth = createOAuthClient();
  const { tokens } = await oauth.getToken(code);
  const refreshToken = tokens.refresh_token;
  if (!refreshToken) {
    return NextResponse.redirect(
      new URL(`/${locale}/dashboard/calendar?gcal=no_refresh`, req.url)
    );
  }

  const admin = createAdminClient();
  await admin.from("dentist_calendars").upsert(
    {
      dentist_id: parsedState.dentistId,
      google_calendar_id: "primary",
      encrypted_refresh_token: encrypt(refreshToken),
    } as never,
    { onConflict: "dentist_id" }
  );

  const res = NextResponse.redirect(
    new URL(`/${locale}/dashboard/calendar?gcal=connected`, req.url)
  );
  res.cookies.delete("gcal_oauth_state");
  return res;
}
