import { OAuth2Client } from "google-auth-library";
import { decrypt } from "@/lib/crypto/encryption";
import { createAdminClient } from "@/lib/supabase/admin";

export const GCAL_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

export function createOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth env not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URI)."
    );
  }
  return new OAuth2Client({ clientId, clientSecret, redirectUri });
}

/**
 * Returns an OAuth client authorized to act on behalf of the dentist's
 * stored refresh token. Access tokens are auto-refreshed by googleapis.
 */
export async function getAuthorizedClient(
  dentistId: string
): Promise<OAuth2Client> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dentist_calendars")
    .select("encrypted_refresh_token, google_calendar_id")
    .eq("dentist_id", dentistId)
    .returns<{ encrypted_refresh_token: string; google_calendar_id: string }[]>()
    .single();

  if (error || !data) {
    throw new Error(`No stored calendar token for dentist ${dentistId}.`);
  }

  const refreshToken = decrypt(data.encrypted_refresh_token);
  const oauth = createOAuthClient();
  oauth.setCredentials({ refresh_token: refreshToken });
  return oauth;
}
