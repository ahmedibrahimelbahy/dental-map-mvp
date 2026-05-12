-- Migration 007 — store the Google Maps share URL directly on the clinic.
--
-- We were collecting these in the onboarding form already and resolving them
-- to lat/lng. Google's anti-bot CAPTCHA makes lat/lng resolution unreliable
-- for short links (maps.app.goo.gl), so for the pilot we ALSO keep the
-- original share URL — it gives patients exact navigation via "Open in
-- Google Maps" without needing precise coords on our side.
--
-- lat/lng stays useful for: any future "find clinics near me" / distance
-- search, plus the embedded preview when we DO manage to resolve coords.

alter table clinics
  add column if not exists google_maps_url text;
