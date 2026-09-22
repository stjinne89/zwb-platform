-- Teamindeling van tegenstanders voor de live ZRL-stand (/live/zrl/[eventId]).
--
-- Zwift kent geen teamveld; het dashboard leidt het team af uit de tag in de
-- Zwift-naam. Gemeten 2026-09-22: 19 van de 51 renners in een divisie hadden
-- geen tag, en één team stond er in vier spellingen. Keuze van de eigenaar: een
-- ploegleider stelt dat één keer bij, en dat geldt de rest van de ronde, want de
-- divisie blijft gelijk. Vandaar per league-sleutel (seizoen, league, divisie en
-- Zwift-subgroep), niet per event.
--
-- Het dashboard leest met de admin-client (publieke pagina); schrijven gaat via
-- de server-action na de check op `teams.manage_results`.

create table if not exists public.zrl_team_assignments (
  league_key text not null,
  zwift_id bigint not null,
  team_label text not null check (length(trim(team_label)) between 1 and 60),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (league_key, zwift_id)
);

alter table public.zrl_team_assignments enable row level security;

drop policy if exists "zrl_team_assignments_read" on public.zrl_team_assignments;
create policy "zrl_team_assignments_read" on public.zrl_team_assignments
  for select to authenticated
  using (true);
