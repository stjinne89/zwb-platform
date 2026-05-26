-- OwnTracks background GPS voor Samen fietsen.
-- De browser/PWA hoeft geen foreground geolocation meer te gebruiken; native
-- OwnTracks-apps posten locaties naar /api/live/owntracks.

alter table public.live_sessions
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'owntracks', 'external'));

create index if not exists live_sessions_source_idx
  on public.live_sessions (source, profile_id, started_at desc);

create table if not exists public.live_tracker_tokens (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'owntracks' check (provider in ('owntracks')),
  token_hash text not null unique,
  label text not null default 'OwnTracks',
  enabled boolean not null default true,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists live_tracker_tokens_profile_idx
  on public.live_tracker_tokens (profile_id, created_at desc);

alter table public.live_tracker_tokens enable row level security;

drop policy if exists "live_tracker_tokens_select_own" on public.live_tracker_tokens;
create policy "live_tracker_tokens_select_own" on public.live_tracker_tokens
  for select to authenticated
  using (auth.uid() = profile_id);

drop policy if exists "live_tracker_tokens_insert_own" on public.live_tracker_tokens;
create policy "live_tracker_tokens_insert_own" on public.live_tracker_tokens
  for insert to authenticated
  with check (auth.uid() = profile_id);

drop policy if exists "live_tracker_tokens_update_own" on public.live_tracker_tokens;
create policy "live_tracker_tokens_update_own" on public.live_tracker_tokens
  for update to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
