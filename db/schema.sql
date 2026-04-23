-- ══════════════════════════════════════════════════════════════════════════
-- Dental Map · Postgres schema (Supabase)
-- Run against a fresh Supabase project's SQL editor.
-- ══════════════════════════════════════════════════════════════════════════

-- ───── EXTENSIONS ─────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ───── ENUMS ──────────────────────────────────────────────────────────────
create type user_role as enum ('patient', 'dentist_admin', 'ops');
create type dentist_title as enum ('professor', 'consultant', 'specialist', 'resident');
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

-- ───── PROFILES ───────────────────────────────────────────────────────────
-- Extends auth.users.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'patient',
  full_name text not null,
  phone text,                              -- required on patient signup (enforced at app layer)
  email citext,                            -- mirror of auth.users.email for convenience
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_phone_idx on profiles (phone);

-- Keep email + updated_at in sync
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated_at before update on profiles for each row execute function set_updated_at();

-- Auto-create profile row when a user signs up
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), new.raw_user_meta_data->>'phone');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ───── AREAS (Cairo districts) ────────────────────────────────────────────
create table areas (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  lat numeric(9,6),
  lng numeric(9,6)
);

-- ───── SPECIALTIES ────────────────────────────────────────────────────────
create table specialties (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  icon text
);

-- ───── INSURANCE ──────────────────────────────────────────────────────────
create table insurance_providers (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  logo_url text
);

-- ───── CLINICS ────────────────────────────────────────────────────────────
create table clinics (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  area_id uuid references areas(id) on delete set null,
  address_ar text,
  address_en text,
  phone text,
  whatsapp text,
  lat numeric(9,6),
  lng numeric(9,6),
  logo_url text,
  hero_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clinics_area_idx on clinics (area_id);
create trigger clinics_updated_at before update on clinics for each row execute function set_updated_at();

-- clinic admins (which profile administers which clinic)
create table clinic_admins (
  clinic_id uuid not null references clinics(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (clinic_id, profile_id)
);

-- ───── DENTISTS ───────────────────────────────────────────────────────────
create table dentists (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  title dentist_title not null default 'specialist',
  years_experience int,
  bio_ar text,
  bio_en text,
  photo_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger dentists_updated_at before update on dentists for each row execute function set_updated_at();

-- M2M: dentists ↔ clinics, with fee and working hours per (dentist, clinic)
create table clinic_dentists (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  dentist_id uuid not null references dentists(id) on delete cascade,
  fee_egp int not null check (fee_egp >= 0),
  slot_minutes int not null default 30 check (slot_minutes in (15, 20, 30, 45, 60)),
  working_hours jsonb not null default '[]'::jsonb,
  -- Shape: [{"day":0..6, "start":"10:00", "end":"18:00", "breaks":[{"start":"14:00","end":"15:00"}]}]
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, dentist_id)
);
create index clinic_dentists_clinic_idx on clinic_dentists (clinic_id);
create index clinic_dentists_dentist_idx on clinic_dentists (dentist_id);
create trigger clinic_dentists_updated_at before update on clinic_dentists for each row execute function set_updated_at();

-- M2M: dentists ↔ specialties
create table dentist_specialties (
  dentist_id uuid not null references dentists(id) on delete cascade,
  specialty_id uuid not null references specialties(id) on delete cascade,
  primary key (dentist_id, specialty_id)
);

-- M2M: clinics ↔ accepted insurance
create table clinic_insurance (
  clinic_id uuid not null references clinics(id) on delete cascade,
  insurance_id uuid not null references insurance_providers(id) on delete cascade,
  primary key (clinic_id, insurance_id)
);

-- ───── DENTIST CALENDARS (Google) ─────────────────────────────────────────
create table dentist_calendars (
  id uuid primary key default uuid_generate_v4(),
  dentist_id uuid not null unique references dentists(id) on delete cascade,
  google_calendar_id text not null,
  -- Refresh token is encrypted at the application layer before insert.
  encrypted_refresh_token text not null,
  watch_channel_id text,
  watch_resource_id text,
  watch_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger dentist_calendars_updated_at before update on dentist_calendars for each row execute function set_updated_at();

-- ───── APPOINTMENTS ───────────────────────────────────────────────────────
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references profiles(id) on delete restrict,
  clinic_dentist_id uuid not null references clinic_dentists(id) on delete restrict,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  fee_at_booking_egp int not null,
  status appointment_status not null default 'pending',
  patient_phone text not null,             -- copied at booking in case patient updates profile later
  patient_note text,
  gcal_event_id text,                      -- filled once the event is pushed to Google Calendar
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slot_range_valid check (slot_end > slot_start)
);
create index appointments_patient_idx on appointments (patient_id, slot_start desc);
create index appointments_clinic_dentist_idx on appointments (clinic_dentist_id, slot_start);
create unique index appointments_slot_unique on appointments (clinic_dentist_id, slot_start)
  where status in ('pending', 'confirmed');
create trigger appointments_updated_at before update on appointments for each row execute function set_updated_at();

-- ───── REVIEWS ────────────────────────────────────────────────────────────
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null unique references appointments(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment_ar text,
  comment_en text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index reviews_created_idx on reviews (created_at desc);

-- ══════════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════════
alter table profiles             enable row level security;
alter table clinics              enable row level security;
alter table clinic_admins        enable row level security;
alter table dentists             enable row level security;
alter table clinic_dentists      enable row level security;
alter table dentist_specialties  enable row level security;
alter table clinic_insurance     enable row level security;
alter table dentist_calendars    enable row level security;
alter table appointments         enable row level security;
alter table reviews              enable row level security;
alter table areas                enable row level security;
alter table specialties          enable row level security;
alter table insurance_providers  enable row level security;

-- Reference data: public read
create policy "areas public read" on areas for select using (true);
create policy "specialties public read" on specialties for select using (true);
create policy "insurance public read" on insurance_providers for select using (true);

-- Clinics + dentists + joins: public read for published rows
create policy "clinics public read" on clinics for select using (is_published = true);
create policy "dentists public read" on dentists for select using (is_published = true);
create policy "clinic_dentists public read" on clinic_dentists for select using (is_active = true);
create policy "dentist_specialties public read" on dentist_specialties for select using (true);
create policy "clinic_insurance public read" on clinic_insurance for select using (true);

-- Profiles: self-only
create policy "profile self select" on profiles for select using (auth.uid() = id);
create policy "profile self update" on profiles for update using (auth.uid() = id);

-- Appointments
create policy "appointments self read" on appointments for select
  using (auth.uid() = patient_id);
create policy "appointments self insert" on appointments for insert
  with check (auth.uid() = patient_id);
-- Clinic admins can see their clinic's appointments
create policy "appointments clinic admin read" on appointments for select
  using (
    exists (
      select 1 from clinic_admins ca
      join clinic_dentists cd on cd.clinic_id = ca.clinic_id
      where cd.id = appointments.clinic_dentist_id
        and ca.profile_id = auth.uid()
    )
  );

-- Reviews: verified-only insert
create policy "reviews public read" on reviews for select using (is_published = true);
create policy "reviews verified insert" on reviews for insert
  with check (
    exists (
      select 1 from appointments a
      where a.id = reviews.appointment_id
        and a.patient_id = auth.uid()
        and a.status = 'completed'
    )
  );

-- Clinic admins on their own clinic
create policy "clinic_admins self" on clinic_admins for select using (profile_id = auth.uid());
create policy "dentist_calendars by admin" on dentist_calendars for select
  using (
    exists (
      select 1 from clinic_dentists cd
      join clinic_admins ca on ca.clinic_id = cd.clinic_id
      where cd.dentist_id = dentist_calendars.dentist_id
        and ca.profile_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════════
-- SEED: specialties (slug · Arabic · English)
-- ══════════════════════════════════════════════════════════════════════════
insert into specialties (slug, name_ar, name_en) values
  ('adult',        'أسنان الكبار',  'Adult dentistry'),
  ('pediatric',    'أسنان الأطفال', 'Pediatric dentistry'),
  ('orthodontics', 'تقويم',         'Orthodontics'),
  ('cosmetic',     'تجميل',         'Cosmetic dentistry'),
  ('endodontics',  'علاج جذور',     'Endodontics'),
  ('implants',     'زراعة',         'Implants'),
  ('oral-surgery', 'جراحة فم',      'Oral surgery')
on conflict (slug) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- SEED: Greater Cairo areas
-- ══════════════════════════════════════════════════════════════════════════
insert into areas (slug, name_ar, name_en) values
  ('nasr-city',      'مدينة نصر',       'Nasr City'),
  ('heliopolis',     'مصر الجديدة',     'Heliopolis'),
  ('maadi',          'المعادي',         'Maadi'),
  ('zamalek',        'الزمالك',         'Zamalek'),
  ('new-cairo',      'القاهرة الجديدة', 'New Cairo'),
  ('6-october',      '6 أكتوبر',         '6th of October'),
  ('sheikh-zayed',   'الشيخ زايد',      'Sheikh Zayed'),
  ('mohandessin',    'المهندسين',       'Mohandessin'),
  ('dokki',          'الدقي',            'Dokki'),
  ('downtown',       'وسط البلد',        'Downtown'),
  ('shoubra',        'شبرا',             'Shoubra'),
  ('ain-shams',      'عين شمس',          'Ain Shams')
on conflict (slug) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- SEED: insurance providers (subset — extend during pilot)
-- ══════════════════════════════════════════════════════════════════════════
insert into insurance_providers (slug, name_ar, name_en) values
  ('axa',       'أكسا',        'AXA'),
  ('metlife',   'ميت لايف',    'MetLife'),
  ('bupa',      'بوبا',        'Bupa'),
  ('globemed',  'جلوب ميد',    'GlobeMed'),
  ('medmark',   'ميدمارك',     'Medmark'),
  ('allianz',   'أليانز',      'Allianz')
on conflict (slug) do nothing;
