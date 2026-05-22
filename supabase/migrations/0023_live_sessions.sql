-- "Samen fietsen" / live-tracker voor ZWB-leden.
-- Drie modes: outdoor (telefoon-GPS), indoor (Zwift/MyWhoosh/Wahoo manual),
-- en externe LiveTrack (Garmin/Wahoo share-URL doorlinks).

create table if not exists public.live_sessions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('outdoor','zwift','mywhoosh','wahoo_indoor','other_indoor')),
  status_text text,
  external_track_url text,
  visibility text not null default 'members' check (visibility in ('members','public','private')),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists live_sessions_active_idx
  on public.live_sessions (last_seen_at)
  where ended_at is null;
create index if not exists live_sessions_profile_idx
  on public.live_sessions (profile_id, started_at desc);

create table if not exists public.live_positions (
  id bigserial primary key,
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  altitude numeric(7,2),
  speed_kmh numeric(5,1),
  recorded_at timestamptz not null default now()
);

create index if not exists live_positions_session_idx
  on public.live_positions (session_id, recorded_at);

-- ---------- RLS ----------
alter table public.live_sessions enable row level security;
alter table public.live_positions enable row level security;

-- Sessies: ingelogde + goedgekeurde leden zien alle members-visibility sessies.
drop policy if exists "live_sessions_select_members" on public.live_sessions;
create policy "live_sessions_select_members" on public.live_sessions
  for select to authenticated using (
    visibility = 'members'
    and exists (select 1 from public.profiles where id = auth.uid() and is_approved)
  );

drop policy if exists "live_sessions_insert_own" on public.live_sessions;
create policy "live_sessions_insert_own" on public.live_sessions
  for insert to authenticated with check (
    auth.uid() = profile_id
    and visibility = 'members'
    and exists (select 1 from public.profiles where id = auth.uid() and is_approved)
  );

drop policy if exists "live_sessions_update_own" on public.live_sessions;
create policy "live_sessions_update_own" on public.live_sessions
  for update to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Posities: leesbaar voor leden, schrijfbaar door eigenaar.
drop policy if exists "live_positions_select_members" on public.live_positions;
create policy "live_positions_select_members" on public.live_positions
  for select to authenticated using (
    exists (
      select 1 from public.live_sessions s
      where s.id = live_positions.session_id
        and s.visibility = 'members'
    )
    and exists (select 1 from public.profiles where id = auth.uid() and is_approved)
  );

drop policy if exists "live_positions_insert_own" on public.live_positions;
create policy "live_positions_insert_own" on public.live_positions
  for insert to authenticated with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.live_sessions s
      where s.id = live_positions.session_id
        and s.profile_id = auth.uid()
        and s.ended_at is null
    )
  );

-- ---------- Realtime ----------
-- Voeg toe aan supabase_realtime publication zodat broadcast werkt.
-- (Idempotent via DO-block.)
do $$
begin
  begin
    alter publication supabase_realtime add table public.live_sessions;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.live_positions;
  exception when duplicate_object then null;
  end;
end$$;
