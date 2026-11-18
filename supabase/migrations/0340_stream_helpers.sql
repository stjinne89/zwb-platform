-- Livestreams via YouTube, fase 3 (2026-11-18): OBS starten vanaf de telefoon.
--
-- Een lid koppelt de stream-hulp (map stream-hulp/, voor Windows en Mac) aan
-- het profiel. Tikt het lid in de app op OBS starten of stoppen, dan stuurt het
-- platform een ondertekende opdracht over Supabase Realtime naar het eigen
-- kanaal van die hulp; de hulp zet OBS via obs-websocket aan of uit en meldt de
-- stand terug (`POST /api/youtube/hulp`).
--
-- - Eén hulp per lid. Het kanaal en het geheim staan versleuteld (app-laag,
--   lib/crypto/secrets); de terugmelding vindt de rij via de hash van het kanaal.
-- - Het lid leest van de eigen rij alleen de stand en wanneer de hulp het laatst
--   iets liet horen (kolomrechten). Schrijven alleen via de service-role.
--
-- Vereist 0338. Geen ZWB-data, geen persoonsgegevens (installatie.md §7).

create table if not exists public.stream_helpers (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  channel_hash text not null unique,
  channel_enc text not null,
  secret_enc text not null,
  obs_state text,
  reported_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint stream_helpers_obs_state_check check (
    obs_state is null or obs_state in ('streaming', 'idle', 'obs-offline')
  ),
  constraint stream_helpers_channel_hash_format check (channel_hash ~ '^[0-9a-f]{64}$')
);

alter table public.stream_helpers enable row level security;

revoke all on public.stream_helpers from anon, authenticated;
grant select (profile_id, obs_state, last_seen_at, created_at) on public.stream_helpers to authenticated;
grant all on public.stream_helpers to service_role;

drop policy if exists "stream_helpers_select_own" on public.stream_helpers;
create policy "stream_helpers_select_own" on public.stream_helpers
  for select to authenticated
  using (profile_id = (select auth.uid()));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select policyname, cmd from pg_policies where tablename = 'stream_helpers';
-- select column_name from information_schema.column_privileges
--   where table_name = 'stream_helpers' and grantee = 'authenticated';
