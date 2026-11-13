-- Voeding: je eigen keuzes voor een event bewaren.
--
-- Op de eventpagina zet je met de knop Duur, Tempo, Race, de schuifjes en
-- "Reken met" je eigen plan (src/lib/nutrition/event-planner.ts). Zonder bewaren
-- toonde de herinnering een ander plan dan je klaarzette. Stap 4 van
-- docs/eventvoeding-plan.md, besluit 7.
--
-- Per lid per event één rij: de keuzes zelf (leeg bij vocht en Reken met: het
-- advies volgen), en het getal en het vocht waarmee het plan rekende. Die twee
-- lezen de herinnering en Boodschappen, die de planner niet hebben. Terug naar
-- het advies wist de rij.
--
-- * Alleen het lid zelf leest, schrijft en wist. Geen trainer, geen bestuur.
-- * Weg met het event of het account (on delete cascade).
-- * In de gegevensexport (/api/account/export).

create table if not exists public.nutrition_event_fuel (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  preset text not null check (preset in ('duur', 'tempo', 'race')),
  intensity_factor numeric(3, 2) not null check (intensity_factor between 0.5 and 1.05),
  minutes smallint not null check (minutes between 20 and 720),
  fluid_ml_per_hour smallint check (fluid_ml_per_hour between 0 and 2000),
  per_hour_g smallint check (per_hour_g between 0 and 150),
  plan_g_per_hour smallint not null check (plan_g_per_hour between 0 and 150),
  plan_fluid_ml_per_hour smallint not null check (plan_fluid_ml_per_hour between 0 and 2000),
  updated_at timestamptz not null default now(),
  primary key (profile_id, event_id)
);

comment on table public.nutrition_event_fuel is
  'Eigen voedingskeuzes per lid per event (eventvoeding stap 4). Alleen het lid zelf.';

alter table public.nutrition_event_fuel enable row level security;

drop policy if exists "nutrition_event_fuel_own" on public.nutrition_event_fuel;
create policy "nutrition_event_fuel_own" on public.nutrition_event_fuel
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

grant select, insert, update, delete on public.nutrition_event_fuel to authenticated;
grant all on public.nutrition_event_fuel to service_role;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select count(*) from public.nutrition_event_fuel;  -- verwacht: 0
-- select polname from pg_policy where polrelid = 'public.nutrition_event_fuel'::regclass;
