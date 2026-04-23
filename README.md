# Dental Map

Arabic-first booking marketplace for dentists in Egypt.  
[Live brief →](https://dental-map-mvp.vercel.app/brief.html)

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase dashboard
npm run dev
```

Open <http://localhost:3000> → redirects to `/ar` (default locale). Toggle to English via the header.

## Supabase setup

1. Create a new Supabase project at <https://supabase.com/dashboard>.
2. Open the SQL editor → paste `db/schema.sql` → run.
3. Copy the project URL, anon key, and service-role key into `.env.local`.
4. (Optional) Regenerate typed schema:  
   `npx supabase gen types typescript --project-id <ref> --schema public > lib/supabase/types.ts`

## Stack

- Next.js 15 (App Router, RSC)
- next-intl (Arabic RTL + English)
- Tailwind CSS + custom brand tokens
- Supabase (Postgres + Auth + Storage + RLS)
- Google Calendar API (integration bus — Week 2)
- Vercel (hosting + auto-deploy)

## Project structure

```
app/
  [locale]/
    (patient)/     # public search/booking surface
    (auth)/        # signin / signup
components/        # shared UI
i18n/              # locale routing + message loading
messages/          # ar.json · en.json
lib/
  supabase/        # client · server · admin
  utils.ts
db/
  schema.sql       # run in Supabase SQL editor
public/
  brief.html       # the plan brief (accessible at /brief.html)
```

## Plan

See `plan.md` or the [rendered brief](https://dental-map-mvp.vercel.app/brief.html).

Target: pilot cohort (20–50 Cairo clinics) in 5–6 weeks from 2026-04-22.
