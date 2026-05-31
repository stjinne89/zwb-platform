-- G1 — Vastleggen wanneer een lid akkoord ging met de privacyverklaring (AVG
-- art. 7: aantoonbare toestemming). Wordt gezet bij registratie.

alter table public.profiles
  add column if not exists privacy_accepted_at timestamptz;
