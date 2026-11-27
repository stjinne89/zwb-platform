-- Eigen materiaal in de rekenaar van ZWBeter materiaal (2026-11-27).
--
-- Wens eigenaar: leden voegen hun eigen helm, fiets, wielen of banden toe om de
-- winst in te schatten. De rekenaar schat het verschil met de basis uit de
-- geteste producten (src/lib/materiaal/eigen-materiaal.ts) en toont het als
-- "schatting". Kleding en sokken krijgen geen eigen invoer.
--
-- `invoer` is wat het lid invulde, per onderdeel:
--   helm:   { lijktOp, type }
--   fiets:  { kg, lijktOp, type }
--   wielen: { velgVoor, velgAchter }
--   banden: { breedte, tubeless, soort, watt }
-- De server-action controleert die vorm met leesInvoer; de tabel controleert
-- alleen dat het een object is. Een rij die niet meer klopt, laat de pagina weg.
--
-- Het lid leest en schrijft alleen de eigen rijen, net als bike_tire_setups.
-- Verdwijnt het profiel, dan verdwijnen de rijen mee.

create table if not exists public.materiaal_eigen (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  onderdeel text not null,
  naam text not null,
  invoer jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materiaal_eigen_onderdeel check (onderdeel in ('helm', 'fiets', 'wielen', 'banden')),
  constraint materiaal_eigen_naam check (char_length(naam) between 1 and 60),
  constraint materiaal_eigen_invoer check (jsonb_typeof(invoer) = 'object')
);

create index if not exists materiaal_eigen_profile_idx on public.materiaal_eigen (profile_id);

alter table public.materiaal_eigen enable row level security;

revoke all on public.materiaal_eigen from anon, authenticated;
grant select, insert, update, delete on public.materiaal_eigen to authenticated;
grant all on public.materiaal_eigen to service_role;

drop policy if exists "materiaal_eigen_own_all" on public.materiaal_eigen;
create policy "materiaal_eigen_own_all" on public.materiaal_eigen
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select policyname, cmd from pg_policies where tablename = 'materiaal_eigen';
-- select count(*) from public.materiaal_eigen;
