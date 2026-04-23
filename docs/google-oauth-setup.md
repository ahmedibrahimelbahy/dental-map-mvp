# Google OAuth setup — 5 minutes

Dental Map connects to each dentist's Google Calendar via OAuth. To enable it, create a Google Cloud OAuth client and paste the credentials into Vercel.

## Step 1 — Google Cloud project

1. Open <https://console.cloud.google.com/projectcreate>
2. **Project name:** `dental-map-prod` (or whatever you like)
3. Create → wait ~10 s → switch into the new project via the top-left project picker.

## Step 2 — Enable the Calendar API

1. Search bar at the top → type **Google Calendar API** → select the result.
2. Click **Enable**.

## Step 3 — OAuth consent screen

1. Left nav → **APIs & Services → OAuth consent screen**.
2. **User Type:** External → Create.
3. **App name:** `Dental Map`
4. **User support email:** your email (`ahmedodo47@gmail.com`)
5. **App logo:** upload `public/dental-map-logo.jpg` (optional but looks pro).
6. **App domain → Application home page:** `https://dental-map-mvp.vercel.app`
7. **Developer contact information:** your email.
8. Save and continue → **Scopes:**
   - Add: `openid`, `email`
   - Add: `https://www.googleapis.com/auth/calendar.readonly`
   - Add: `https://www.googleapis.com/auth/calendar.events`
9. Save and continue → **Test users:** add the Gmail accounts of the pilot dentists (until Google verifies the app, only test users can authorize it).
10. Save → Back to Dashboard.

> **You'll stay in "Testing" mode for the pilot.** Google Verification is only needed before >100 users or at production launch. The pilot cohort can be added as test users one-by-one.

## Step 4 — OAuth Client ID (Web application)

1. Left nav → **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. **Application type:** Web application.
3. **Name:** `Dental Map Web`
4. **Authorized JavaScript origins:**
   - `https://dental-map-mvp.vercel.app`
   - `http://localhost:3000`
5. **Authorized redirect URIs:**
   - `https://dental-map-mvp.vercel.app/api/gcal/oauth/callback`
   - `http://localhost:3000/api/gcal/oauth/callback`
6. **Create.** Google shows a dialog with:
   - **Client ID** (looks like `1234567890-xxxx.apps.googleusercontent.com`)
   - **Client secret** (looks like `GOCSPX-xxxxxxxx`)

## Step 5 — Paste the credentials to me

Send me these two values and I'll add them to Vercel + your local `.env.local`:

```
GOOGLE_CLIENT_ID=<the Client ID from step 4>
GOOGLE_CLIENT_SECRET=<the Client secret from step 4>
```

(Or you can add them yourself: Vercel dashboard → Project → Settings → Environment Variables.)

## Step 6 — First test

Once the credentials are set:

1. Sign in as a dentist admin.
2. Go to `/dashboard/calendar`.
3. Click **Connect Google Calendar**.
4. You'll be redirected to Google's consent screen (your email must be in the test users list if the app is still in "Testing" mode).
5. Click **Allow**.
6. You should land back at `/dashboard/calendar?gcal=connected` with a green checkmark.
7. Set your working hours and save.

From there, Week 3 plugs in the patient-side search that reads these slots.

## Troubleshooting

| Error | Likely cause |
|---|---|
| `gcal=denied` | You clicked Deny on Google's consent screen. |
| `gcal=state_mismatch` | Session cookie got wiped between starting and returning from Google. Sign back in and retry. |
| `gcal=no_refresh` | Google didn't issue a refresh token. Reconnect with `prompt=consent` (already the default). If it persists, revoke the app at <https://myaccount.google.com/permissions> and reconnect. |
| `403 access_denied · unauthorized_user` | Your email isn't in the Test users list of the consent screen. Add it in Step 3. |
