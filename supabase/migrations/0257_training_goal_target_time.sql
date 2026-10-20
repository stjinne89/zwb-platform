-- Een doeltijd bij een trainingsdoel (2026-10-20).
--
-- Een lid wil een gran fondo in een bepaalde tijd rijden. Het platform rekent
-- met het pacingmodel uit wat de huidige vorm oplevert, hoeveel CP de doeltijd
-- vraagt en waar op het parcours de tijd zit; dat laatste gaat als nadruk naar
-- de schema-AI. Zie docs/doeltijd-trainingsdoel.md.
--
-- * training_goals.target_time_seconds: de doeltijd.
-- * training_goals.target_riding: alleen of in een groep (minder luchtweerstand).
-- * training_goals.target_route: het parcours uit een eigen GPX, alleen als
--   hoogteprofiel (afstand en helling per 100 m, plus de klimmen). Geen
--   coördinaten: zo staat er geen locatiedata van het lid in de database. Een
--   parcours uit een ZWB-event komt uit target_event_id (bestond al).
-- * training_goal_forecasts: één rij per prognose, zodat het lid het verloop
--   ziet. Alleen de server schrijft (service role); lezen mag wie het doel mag
--   lezen. profile_id staat erop, dus de AVG-export neemt hem mee.

alter table public.training_goals
  add column if not exists target_time_seconds integer
    check (target_time_seconds is null or target_time_seconds between 600 and 86400),
  add column if not exists target_riding text
    check (target_riding is null or target_riding in ('alone', 'group')),
  add column if not exists target_route jsonb;

create table if not exists public.training_goal_forecasts (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.training_goals(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  computed_at timestamptz not null default now(),
  target_seconds integer not null,
  predicted_seconds integer not null,
  verdict text not null
    check (verdict in ('haalbaar', 'met_groei', 'ambitieus', 'niet_realistisch', 'groei_nodig', 'buiten_bereik')),
  cp_watts integer not null,
  weight_kg numeric(5, 1) not null,
  required_cp_watts integer,
  -- De rest van de uitkomst: nadruk, gevoeligheden, bron van de CP, klimaandeel.
  detail jsonb not null default '{}'::jsonb
);

create index if not exists training_goal_forecasts_goal_idx
  on public.training_goal_forecasts (goal_id, computed_at desc);

alter table public.training_goal_forecasts enable row level security;

drop policy if exists "training_goal_forecasts_select" on public.training_goal_forecasts;
create policy "training_goal_forecasts_select" on public.training_goal_forecasts
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));
