-- Livestreams via YouTube, fase 1 (2026-11-18).
--
-- Wens eigenaar: leden streamen hun Zwift-races op hun eigen YouTube-kanaal en
-- de stream speelt af in de app. Voorstel en besluiten:
-- docs/livestream-youtube.md.
--
-- youtube_connections: één rij per lid dat zijn kanaal koppelde. De tokens
-- staan versleuteld (app-laag, lib/crypto/secrets) en zijn alleen via de
-- service-role te lezen. Het lid zelf leest alleen kanaal en status van de
-- eigen rij (kolomrechten). De streamsleutel wordt niet bewaard.
--
-- event_streams: één rij per lid per race, met het video-ID van de uitzending
-- op YouTube. Lezen: goedgekeurde leden. Schrijven alleen via de service-role,
-- na de controles in de server action (gekoppeld, ingeschreven of opgesteld).
--
-- Geen ZWB-data, geen persoonsgegevens in deze migratie (installatie.md §7).

create table if not exists public.youtube_connections (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  channel_id text not null,
  channel_title text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  stream_id text,
  needs_reconnect boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youtube_connections_channel_id_len check (length(channel_id) between 1 and 64),
  constraint youtube_connections_channel_title_len check (
    channel_title is null or length(channel_title) <= 200
  )
);

alter table public.youtube_connections enable row level security;

revoke all on public.youtube_connections from anon, authenticated;
grant select (profile_id, channel_id, channel_title, needs_reconnect, created_at, updated_at)
  on public.youtube_connections to authenticated;
grant all on public.youtube_connections to service_role;

drop policy if exists "youtube_connections_select_own" on public.youtube_connections;
create policy "youtube_connections_select_own" on public.youtube_connections
  for select to authenticated
  using (profile_id = (select auth.uid()));

create table if not exists public.event_streams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  youtube_video_id text not null,
  channel_title text,
  scheduled_start_at timestamptz not null,
  status text not null default 'gepland',
  live_notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_streams_one_per_rider unique (event_id, profile_id),
  constraint event_streams_video_id_format check (youtube_video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  constraint event_streams_status_check check (status in ('gepland', 'live', 'afgelopen')),
  constraint event_streams_channel_title_len check (
    channel_title is null or length(channel_title) <= 200
  )
);

create index if not exists event_streams_profile_idx on public.event_streams (profile_id);

alter table public.event_streams enable row level security;

revoke all on public.event_streams from anon, authenticated;
grant select on public.event_streams to authenticated;
grant all on public.event_streams to service_role;

drop policy if exists "event_streams_select_approved" on public.event_streams;
create policy "event_streams_select_approved" on public.event_streams
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_approved
    )
  );

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select policyname, tablename, cmd from pg_policies
--   where tablename in ('youtube_connections', 'event_streams');
-- select grantee, privilege_type, column_name from information_schema.column_privileges
--   where table_name = 'youtube_connections' and grantee = 'authenticated';
