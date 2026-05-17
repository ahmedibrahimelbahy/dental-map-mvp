-- Migration 009 — add chief_complaint on appointments + gender on profiles.
--
-- chief_complaint: structured reason for the visit, captured at booking time.
--   Lets the clinic triage and lets us later rank dentists by specialty match.
--   Free-text patient_note still exists alongside this for anything extra.
--
-- gender: optional patient profile field. Surfaced under "My account" settings,
--   never required. Some Egyptian patients filter for same-gender dentists.

-- ── 1. Enums ─────────────────────────────────────────────────────────
create type chief_complaint as enum (
  'cleaning',
  'pain',
  'cosmetic',
  'ortho',
  'emergency',
  'other'
);

create type gender as enum ('male', 'female', 'unspecified');

-- ── 2. appointments.chief_complaint ──────────────────────────────────
alter table appointments
  add column chief_complaint chief_complaint;

-- ── 3. profiles.gender ───────────────────────────────────────────────
alter table profiles
  add column gender gender;
