-- Migration 012 — lock down the `clinic-media` Supabase Storage bucket.
--
-- Background. The bucket was created public (so patients can load logos /
-- hero images / dentist headshots via `<img src="…/storage/v1/object/public/…">`),
-- but with no row-level policies on `storage.objects`. That means ANY user
-- with our anon key + a signed-in auth session could call
--   supabase.storage.from('clinic-media').upload('anything.jpg', file)
-- and overwrite or pollute the bucket. Patient reads are fine because
-- public buckets bypass RLS for SELECT — the leak is purely on writes.
--
-- Our actual upload path is:
--   1. Browser asks the `requestUploadTicketAction` server action for a
--      signed upload URL scoped to `pending/<user_id>/<kind>-<uuid>.<ext>`.
--   2. Server action creates that URL via the SERVICE ROLE.
--   3. Browser PUTs the bytes to the signed URL.
--
-- Signed upload URLs carry a service-role-signed token and bypass RLS,
-- so we can lock writes down to "service role only" without breaking the
-- onboarding form. Service role is also what seed scripts and ops tools
-- use, so backfills keep working.
--
-- After this migration:
--   - SELECT on clinic-media objects   → public (unchanged)
--   - INSERT / UPDATE / DELETE         → denied for anon + authenticated.
--     Only service-role + signed-upload-URL paths can write.

-- ─── 1. RLS state on storage.objects ─────────────────────────────────
-- Supabase enables RLS by default; this line is a belt-and-suspenders.
alter table storage.objects enable row level security;

-- ─── 2. Drop any prior permissive policies we might have added ───────
-- These DROPs use IF EXISTS so re-running the migration is safe even if
-- the policies were never created.
drop policy if exists "clinic-media public read"        on storage.objects;
drop policy if exists "clinic-media authed insert"      on storage.objects;
drop policy if exists "clinic-media authed update"      on storage.objects;
drop policy if exists "clinic-media authed delete"      on storage.objects;
drop policy if exists "clinic-media own pending insert" on storage.objects;
drop policy if exists "clinic-media own pending update" on storage.objects;
drop policy if exists "clinic-media own pending delete" on storage.objects;

-- ─── 3. Explicit SELECT policy ───────────────────────────────────────
-- The bucket is public, so SELECT would work even without this. But
-- being explicit keeps the security posture obvious to anyone auditing
-- the policies later.
create policy "clinic-media public read"
  on storage.objects
  for select
  using (bucket_id = 'clinic-media');

-- ─── 4. No INSERT / UPDATE / DELETE policies ─────────────────────────
-- Intentionally omitted. With RLS enabled and no INSERT/UPDATE/DELETE
-- policy in scope for the `clinic-media` bucket, those operations are
-- denied for anon + authenticated. Service role bypasses RLS, and
-- signed upload URLs (created by service role) bypass RLS too.
--
-- If we later want clinic admins to manage their own media directly
-- from the dashboard without going through a server action, add a
-- policy like:
--
--   create policy "clinic-media own pending insert"
--     on storage.objects
--     for insert
--     to authenticated
--     with check (
--       bucket_id = 'clinic-media'
--       and (storage.foldername(name))[1] = 'pending'
--       and (storage.foldername(name))[2] = auth.uid()::text
--     );
--
-- For now we route everything through the server action so we can
-- validate types, sizes, and ownership in TypeScript before issuing
-- the signed URL.
