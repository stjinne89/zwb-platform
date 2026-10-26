-- Zwift-garage per lid: welke frames (met upgradeniveau) en welke wielen een
-- lid in Zwift heeft. Snelste fiets in het pacingplan en de racebriefing
-- rekent daarmee (src/lib/pacing/zwift-garage.ts). ZWB kan de garage niet uit
-- Zwift lezen; het lid vult hem zelf in op /mijn-garage/zwift.
--
-- * Namen zoals in zwift_bike_parts. Geen foreign key: die tabel heeft per
--   naam een rij per stage en per testframe, en een naam die na een nieuwe
--   sheet verdwijnt, slaat de app over in plaats van dat de garage breekt.
-- * Een wiel heeft geen upgradeniveau; stage is dan 0.
-- * Alleen het lid zelf leest, schrijft en wist. De racebriefing leest de
--   garage van wie kijkt via de server.
-- * In de gegevensexport (/api/account/export).

create table if not exists public.member_zwift_bikes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  part text not null check (part in ('frame', 'wheel')),
  name text not null check (char_length(name) between 1 and 120),
  stage smallint not null default 0 check (stage between 0 and 5),
  updated_at timestamptz not null default now(),
  primary key (profile_id, part, name),
  check (part = 'frame' or stage = 0)
);

alter table public.member_zwift_bikes enable row level security;

drop policy if exists "member_zwift_bikes_own" on public.member_zwift_bikes;
create policy "member_zwift_bikes_own" on public.member_zwift_bikes
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
