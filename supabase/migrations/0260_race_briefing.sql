-- Racebriefing per ZRL-race (/events/[id]/briefing).
--
-- Vraag van de eigenaar (2026-10-20): de briefing die voor Bdev met de hand werd
-- gemaakt, in de app voor alle teams. Zichtbaar voor alle leden; een captain of
-- teambeheerder schrijft het plan.
--
-- 1. zwift_rider_metrics: per Zwift-ID de Zwift Racing Score en categorie (uit
--    Zwift, via het club-serviceaccount) en, zodra er een API-sleutel is, vELO en
--    het vermogensprofiel in W/kg van ZwiftRacing.app. Ook van renners van andere
--    clubs in dezelfde groep: dat zijn gegevens die Zwift en ZwiftRacing openbaar
--    tonen. Geen gewicht, geen FTP. Een cache: wat ouder is dan 90 dagen, gooit de
--    app weg bij het verversen. Alleen de server leest en schrijft (admin-client),
--    dus RLS aan zonder policies.
--
-- 2. race_briefings: het plan van de captain en de rol per renner, één rij per
--    teamevent. Lezen voor ingelogde leden; schrijven via de serveractie na de
--    check op captain of `teams.manage_roster`/`teams.manage_results`.

create table if not exists public.zwift_rider_metrics (
  zwift_id bigint primary key,
  racing_score integer,
  zwift_category text,
  zrs_fetched_at timestamptz,
  velo numeric(6, 1),
  velo_category text,
  phenotype text,
  -- Beste W/kg van de laatste 90 dagen: {"s15":…, "m1":…, "m2":…, "m5":…, "m20":…}.
  power_wkg jsonb,
  velo_fetched_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists zwift_rider_metrics_updated_idx on public.zwift_rider_metrics (updated_at);

alter table public.zwift_rider_metrics enable row level security;

create table if not exists public.race_briefings (
  event_id uuid primary key references public.events(id) on delete cascade,
  plan text check (plan is null or length(plan) <= 4000),
  -- Zwift-ID → rol, bv. {"4235693": "Positie op de brug"}.
  roles jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.race_briefings enable row level security;

drop policy if exists "race_briefings_read" on public.race_briefings;
create policy "race_briefings_read" on public.race_briefings
  for select to authenticated
  using (true);
