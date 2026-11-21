-- Bandendruk op Vandaag: wielen en banden per fiets (2026-11-21).
--
-- Wens eigenaar: op Vandaag van ZWBeter een inklapbaar blok dat de bandendruk
-- uitrekent voor de fiets die je kiest. De gegevens van wielen en banden vul je
-- in Mijn garage in. Eén wielset per fiets (keuze eigenaar); meerdere wielsets
-- per fiets is bewust niet gebouwd.
--
-- De rekenregel staat in src/lib/materiaal/bandendruk.ts en docs/bandendruk.md.
-- Het lichaamsgewicht komt uit profiles.weight_kg en staat hier niet.
--
-- Het lid leest en schrijft de eigen rijen, net als bike_components. Verdwijnt
-- de fiets, dan verdwijnt de setup mee.

create table if not exists public.bike_tire_setups (
  bike_id text primary key references public.strava_bikes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  front_width_mm numeric(4,1) not null,
  rear_width_mm numeric(4,1) not null,
  front_measured_mm numeric(4,1),
  rear_measured_mm numeric(4,1),
  tire_type text not null default 'binnenband',
  hookless boolean not null default false,
  bike_kg numeric(4,1) not null,
  max_bar numeric(3,1),
  updated_at timestamptz not null default now(),
  constraint bike_tire_setups_front_width check (front_width_mm between 18 and 70),
  constraint bike_tire_setups_rear_width check (rear_width_mm between 18 and 70),
  constraint bike_tire_setups_front_measured check (front_measured_mm is null or front_measured_mm between 18 and 70),
  constraint bike_tire_setups_rear_measured check (rear_measured_mm is null or rear_measured_mm between 18 and 70),
  constraint bike_tire_setups_tire_type check (tire_type in ('binnenband', 'tubeless', 'tube')),
  constraint bike_tire_setups_bike_kg check (bike_kg between 3 and 40),
  constraint bike_tire_setups_max_bar check (max_bar is null or max_bar between 1 and 12)
);

create index if not exists bike_tire_setups_profile_idx on public.bike_tire_setups (profile_id);

alter table public.bike_tire_setups enable row level security;

revoke all on public.bike_tire_setups from anon, authenticated;
grant select, insert, update, delete on public.bike_tire_setups to authenticated;
grant all on public.bike_tire_setups to service_role;

drop policy if exists "bike_tire_setups_own_all" on public.bike_tire_setups;
create policy "bike_tire_setups_own_all" on public.bike_tire_setups
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (
    profile_id = (select auth.uid())
    -- Alleen voor een eigen fiets: bike_id is de sleutel, dus een vreemde rij
    -- zou de eigenaar buitensluiten.
    and exists (
      select 1 from public.strava_bikes b
      where b.id = bike_id and b.profile_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select policyname, cmd from pg_policies where tablename = 'bike_tire_setups';
-- select count(*) from public.bike_tire_setups;
