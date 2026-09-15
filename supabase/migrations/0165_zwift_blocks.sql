-- ZWBlokken in de Zwift-werelden.
--
-- Los van profile_blocks, om twee redenen:
-- - acht van de twaalf Zwift-werelden liggen op echte coördinaten (London, New
--   York, Paris …). In dezelfde tabel zou een Zwift-rondje in London echte
--   Londense blokken kleuren, en meetellen voor dekking en titels buiten;
-- - de blokken zijn fijner: zoom 16 (~600 m) in plaats van 14, anders is Watopia
--   36 blokken en Crit City er één.
--
-- Gevuld door src/lib/zwblokken/zwift-sync.ts uit de routelijnen van
-- VirtualRide-ritten die van Zwift komen. Geen start/eind-maskering: een virtuele
-- wereld is geen woonadres.

create table if not exists public.profile_zwift_blocks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Slug uit zwift-data: watopia, makuri-islands, london …
  world text not null,
  z smallint not null default 16,
  x integer not null,
  y integer not null,
  first_activity_id bigint,
  first_seen_at timestamptz not null default now(),
  primary key (profile_id, z, x, y)
);

create index if not exists profile_zwift_blocks_world_idx
  on public.profile_zwift_blocks (world, profile_id);
create index if not exists profile_zwift_blocks_xy_idx
  on public.profile_zwift_blocks (z, x, y);

alter table public.profile_zwift_blocks enable row level security;

drop policy if exists "profile_zwift_blocks_members_read" on public.profile_zwift_blocks;
create policy "profile_zwift_blocks_members_read" on public.profile_zwift_blocks
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

-- Schrijven gebeurt uitsluitend door de sync met de service-role-sleutel.

drop view if exists public.club_zwift_blocks;
create view public.club_zwift_blocks with (security_invoker = on) as
  select world, z, x, y, count(distinct profile_id)::int as rider_count
  from public.profile_zwift_blocks
  group by world, z, x, y;

-- Eigen cursor, los van blocks_processed_at: buiten en Zwift rekenen elk hun
-- eigen ritten door. Opnieuw rekenen:
--   update public.strava_activities set zwift_blocks_processed_at = null
--   where sport_type = 'VirtualRide';
alter table public.strava_activities
  add column if not exists zwift_blocks_processed_at timestamptz;

create index if not exists strava_activities_zwift_blocks_todo_idx
  on public.strava_activities (profile_id)
  where zwift_blocks_processed_at is null and sport_type = 'VirtualRide';

notify pgrst, 'reload schema';
