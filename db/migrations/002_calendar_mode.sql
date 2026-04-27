-- Calendar integration mode per (clinic, dentist) pair.
-- 'google'   = Dental Map reads/writes a Google Calendar (works whether the dentist
--              uses GCal directly or pipes Dentolize/Dentalore → GCal externally)
-- 'manual'   = Dental Map is the source of truth; busy = our own appointments only.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'calendar_mode') then
    create type calendar_mode as enum ('google', 'manual');
  end if;
end$$;

alter table clinic_dentists
  add column if not exists calendar_mode calendar_mode not null default 'google';
