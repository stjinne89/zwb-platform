-- Uitslagen van de Sunday Race Club (fase 3, 2026-09-30).
--
-- Bron: de openbare uitslagen-API van MyWhoosh (service14 …/public). Per race
-- bewaren we zo weinig mogelijk persoonsgegevens:
--   src_results       alleen renners die voor ZWB tellen: onder een ZWB-teamnaam,
--                     gekoppeld aan een lid (MyWhoosh-id in profiles.mywhoosh_id),
--                     of met precies de naam van één lid (koppelvoorstel). Alleen
--                     categorie, plaats en tijd: geen vermogen, gewicht of prijzengeld.
--   src_team_results  alle teams per categorie (teamnaam, tijd van de beste drie,
--                     plaats), zodat de plaats van ons team context heeft. Geen
--                     namen van renners.
--
-- Schrijven gebeurt alleen met de service-role (cron en beheer). Leden lezen alles.

alter table public.src_races
  add column if not exists results_status text,
  add column if not exists results_synced_at timestamptz,
  add column if not exists results_error text;

create table if not exists public.src_results (
  race_event_id uuid not null references public.events(id) on delete cascade,
  mywhoosh_user_id text not null,
  name text not null,
  mywhoosh_team_id text,
  team_name text,
  category int check (category is null or category between 1 and 9),
  -- Plaats in de eigen categorie; MyWhoosh geeft alleen de totaalplaats.
  category_rank int,
  finished_ms bigint,
  gap_ms bigint,
  status text,
  -- Gekoppeld lid (op MyWhoosh-id), of alleen een voorstel op naam.
  profile_id uuid references public.profiles(id) on delete set null,
  suggested_profile_id uuid references public.profiles(id) on delete set null,
  primary key (race_event_id, mywhoosh_user_id)
);

create index if not exists src_results_profile_idx on public.src_results (profile_id);
create index if not exists src_results_user_idx on public.src_results (mywhoosh_user_id);

create table if not exists public.src_team_results (
  race_event_id uuid not null references public.events(id) on delete cascade,
  category int not null,
  mywhoosh_team_id text not null,
  team_name text not null,
  time_ms bigint not null,
  rank int not null,
  finishers int not null,
  primary key (race_event_id, category, mywhoosh_team_id)
);

-- Uitslag van één race in één keer vervangen, zodat niemand een halve uitslag ziet.
create or replace function public.src_replace_results(
  p_event_id uuid,
  p_result_event_id text,
  p_status text,
  p_rows jsonb,
  p_teams jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_typeof(p_teams) <> 'array' then
    raise exception 'Ongeldige uitslag.';
  end if;
  perform 1 from src_races where event_id = p_event_id for update;
  delete from src_results where race_event_id = p_event_id;
  delete from src_team_results where race_event_id = p_event_id;
  insert into src_results (
    race_event_id, mywhoosh_user_id, name, mywhoosh_team_id, team_name, category,
    category_rank, finished_ms, gap_ms, status, profile_id, suggested_profile_id
  )
  select p_event_id, r.mywhoosh_user_id, r.name, r.mywhoosh_team_id, r.team_name, r.category,
         r.category_rank, r.finished_ms, r.gap_ms, r.status, r.profile_id, r.suggested_profile_id
  from jsonb_to_recordset(p_rows) as r(
    mywhoosh_user_id text, name text, mywhoosh_team_id text, team_name text, category int,
    category_rank int, finished_ms bigint, gap_ms bigint, status text, profile_id uuid,
    suggested_profile_id uuid
  )
  on conflict (race_event_id, mywhoosh_user_id) do nothing;
  insert into src_team_results (
    race_event_id, category, mywhoosh_team_id, team_name, time_ms, rank, finishers
  )
  select p_event_id, t.category, t.mywhoosh_team_id, t.team_name, t.time_ms, t.rank, t.finishers
  from jsonb_to_recordset(p_teams) as t(
    category int, mywhoosh_team_id text, team_name text, time_ms bigint, rank int, finishers int
  )
  on conflict (race_event_id, category, mywhoosh_team_id) do nothing;
  update src_races
     set result_event_id = p_result_event_id,
         results_status = p_status,
         results_synced_at = clock_timestamp(),
         results_error = null
   where event_id = p_event_id;
end $$;
revoke all on function public.src_replace_results(uuid, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.src_replace_results(uuid, text, text, jsonb, jsonb)
  to service_role;

alter table public.src_results enable row level security;
alter table public.src_team_results enable row level security;

drop policy if exists "src_results_read" on public.src_results;
create policy "src_results_read" on public.src_results
  for select to authenticated using (true);

drop policy if exists "src_team_results_read" on public.src_team_results;
create policy "src_team_results_read" on public.src_team_results
  for select to authenticated using (true);

notify pgrst, 'reload schema';
