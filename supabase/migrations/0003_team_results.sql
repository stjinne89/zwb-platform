-- Manual standings entry for teams (fase 1, until scrapers in fase 2).
-- One row = one result of one team in one round of one competition.

create table public.team_results (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  competition text not null,        -- e.g. "ZRL S15 Div 3"
  round_label text,                 -- e.g. "Race 1 — Crit City Reverse"
  round_at timestamptz,
  position int check (position > 0),
  points numeric(7,2),
  total_teams int check (total_teams > 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.team_results (team_id, round_at desc);
create index on public.team_results (competition);

alter table public.team_results enable row level security;

-- Everyone authenticated can read.
create policy "team_results_select_authenticated" on public.team_results
  for select to authenticated using (true);

-- Admins and team captains can write.
create policy "team_results_admin_or_captain_write" on public.team_results
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_results.team_id
        and tm.profile_id = auth.uid()
        and tm.role in ('captain','co-captain')
    )
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_results.team_id
        and tm.profile_id = auth.uid()
        and tm.role in ('captain','co-captain')
    )
  );

-- Allow captains to manage their own team's roster (not only admins).
drop policy if exists "team_members_admin_write" on public.team_members;

create policy "team_members_admin_or_captain_write" on public.team_members
  for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id
        and tm.profile_id = auth.uid()
        and tm.role in ('captain','co-captain')
    )
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id
        and tm.profile_id = auth.uid()
        and tm.role in ('captain','co-captain')
    )
  );
