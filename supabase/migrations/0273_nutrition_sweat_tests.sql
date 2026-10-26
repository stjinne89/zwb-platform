-- Ritvoeding, stap 5 (docs/ritvoeding-plan.md): zweettest en vochtdoel.
--
-- Een lid weegt zich voor en na een rit en noteert wat het dronk. De app rekent
-- daaruit het zweetverlies per uur (src/lib/nutrition/sweat.ts) en bewaart alleen
-- dat, met datum, duur en omstandigheid. Het lichaamsgewicht van voor en na
-- wordt niet bewaard (besluit 5: geen weegcultuur). Een test die niet plausibel
-- is (korter dan 45 minuten, of buiten 0,2-3 liter per uur) slaat de app niet op.
--
-- * Alleen met eigen toestemming: consent_version is de tekst waarvoor het lid
--   bij de eerste test tekende (SWEAT_CONSENT_VERSION in sweat.ts). Zelfde
--   aanpak als het eetdagboek (0231) en de protocollen (0237): geen nieuwe
--   privacyversie voor iedereen, alleen wie het gebruikt tekent.
-- * Alleen het lid zelf leest, schrijft en wist. Geen trainer, geen bestuur.
-- * In de gegevensexport (/api/account/export).

create table if not exists public.nutrition_sweat_tests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tested_on date not null,
  duration_minutes smallint not null check (duration_minutes between 45 and 600),
  sweat_ml_per_hour smallint not null check (sweat_ml_per_hour between 200 and 3000),
  setting text not null check (setting in ('binnen', 'buiten')),
  warm boolean not null default false,
  consent_version text not null check (consent_version in ('2026-10-25')),
  created_at timestamptz not null default now()
);

create index if not exists nutrition_sweat_tests_profile_idx
  on public.nutrition_sweat_tests (profile_id, tested_on desc);

alter table public.nutrition_sweat_tests enable row level security;

drop policy if exists "nutrition_sweat_tests_own" on public.nutrition_sweat_tests;
create policy "nutrition_sweat_tests_own" on public.nutrition_sweat_tests
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
