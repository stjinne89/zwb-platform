-- ZWBlokken: welke rasterblokken heeft een lid ooit bereden?
--
-- Afgeleide data, gevuld door de Strava-sync (src/lib/zwblokken/sync.ts) en
-- goedkoop gelezen door /zwblokken — hetzelfde patroon als
-- profile_climbed_cols en profile_completed_segments.
--
-- Privacy: het blok waar een rit begint of eindigt komt hier nooit in, en de
-- eerste en laatste kilometer van elke rit tellen niet mee. Zwift-ritten
-- (VirtualRide) blijven helemaal buiten beschouwing.

create table if not exists public.profile_blocks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Alleen zoom 14 in gebruik; de kolom houdt een fijner raster later open
  -- zonder de primaire sleutel te hoeven migreren.
  z smallint not null default 14,
  x integer not null,
  y integer not null,
  first_activity_id bigint,
  first_seen_at timestamptz not null default now(),
  primary key (profile_id, z, x, y)
);

create index if not exists profile_blocks_xy_idx
  on public.profile_blocks (z, x, y);
create index if not exists profile_blocks_seen_idx
  on public.profile_blocks (profile_id, first_seen_at);

alter table public.profile_blocks enable row level security;

drop policy if exists "profile_blocks_members_read" on public.profile_blocks;
create policy "profile_blocks_members_read" on public.profile_blocks
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

-- Schrijven gebeurt uitsluitend door de sync met de service-role-sleutel;
-- die omzeilt RLS, dus er is bewust geen insert/update-policy.

-- Clubweergave: hoeveel verschillende leden zijn in een blok geweest? Voedt
-- zowel het clubtotaal als de intensiteitskleur op de kaart. security_invoker
-- zodat de RLS van profile_blocks blijft gelden.
drop view if exists public.club_blocks;
create view public.club_blocks with (security_invoker = on) as
  select z, x, y, count(distinct profile_id)::int as rider_count
  from public.profile_blocks
  group by z, x, y;

-- Cursor voor incrementeel werk, in het patroon van strava_activities
-- .efforts_fetched_at: een volledige herberekening is
--   update public.strava_activities set blocks_processed_at = null;
alter table public.strava_activities
  add column if not exists blocks_processed_at timestamptz;

create index if not exists strava_activities_blocks_todo_idx
  on public.strava_activities (profile_id)
  where blocks_processed_at is null;
