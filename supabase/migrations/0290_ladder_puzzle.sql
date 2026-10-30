-- Ladderpuzzel op /teams/club-ladder (2026-10-29).
--
-- Vraag eigenaar: de indeling in ladderteams als puzzel, zoals het artifact
-- "Ladderpuzzelen". Per team een afgesproken band, per renner een ladderrank, en
-- renners zonder account op dezelfde manier als bij ZRL (hun rosternaam).
--
-- * teams.ladder_rank_min/max: de afgesproken band van een ladderteam. Rank 1 is
--   Diamond, 10 Copper; min is dus de hoogste rank. Een team met een band staat
--   in de puzzel, ook in het archief (een captain deelt in vóór het seizoen).
-- * ladder_ranks: ladderrank per Zwift-ID, door een captain ingevuld zolang de
--   ZwiftRacing-API er niet is. Op Zwift-ID, zodat het voor leden en rosternamen
--   gelijk werkt en bij claimen niets hoeft te verhuizen.
-- * ladder_roster_riders: rosternamen zonder account in de ladderlijst, met hun
--   ladderteam (leeg = losse stukjes). Een rosternaam hoort al bij één ZRL-team
--   (roster_entries.team_id), dus de ladder krijgt een eigen koppeling. Bij
--   claimen (claim_roster_entry of link_roster_by_zwift_id, beide zetten
--   claimed_by) wordt het lid van dat ladderteam, of komt in ladder_pool.
-- * Alleen de server leest en schrijft (admin-client na de check uit
--   lib/club-ladder/access.ts): RLS aan zonder policies, zoals ladder_pool (0285).
--
-- De ranks zelf staan niet in deze migratie: dat zijn gegevens van renners, die
-- bij het toepassen los worden ingevuld.

alter table public.teams
  add column if not exists ladder_rank_min smallint,
  add column if not exists ladder_rank_max smallint;

alter table public.teams drop constraint if exists teams_ladder_band_check;
alter table public.teams
  add constraint teams_ladder_band_check check (
    (ladder_rank_min is null and ladder_rank_max is null)
    or (
      ladder_rank_min between 1 and 10
      and ladder_rank_max between 1 and 10
      and ladder_rank_min <= ladder_rank_max
    )
  );

create table if not exists public.ladder_ranks (
  zwift_id text primary key check (zwift_id ~ '^[0-9]+$'),
  rank smallint not null check (rank between 1 and 10),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.ladder_ranks enable row level security;

create table if not exists public.ladder_roster_riders (
  roster_entry_id uuid primary key references public.roster_entries(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  sex text check (sex in ('man', 'vrouw')),
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ladder_roster_riders_team_idx on public.ladder_roster_riders (team_id);

alter table public.ladder_roster_riders enable row level security;

create or replace function public.handle_roster_claim_ladder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
begin
  if new.claimed_by is null or old.claimed_by is not null then
    return new;
  end if;

  select team_id into v_team
  from public.ladder_roster_riders
  where roster_entry_id = new.id;
  if not found then
    return new;
  end if;

  if v_team is not null then
    insert into public.team_members (team_id, profile_id, role, assignment_source)
    values (v_team, new.claimed_by, 'member', 'manual')
    on conflict (team_id, profile_id) do nothing;
  else
    insert into public.ladder_pool (profile_id)
    values (new.claimed_by)
    on conflict (profile_id) do nothing;
  end if;

  delete from public.ladder_roster_riders where roster_entry_id = new.id;
  return new;
end;
$$;

revoke all on function public.handle_roster_claim_ladder() from public;

drop trigger if exists roster_entries_claim_ladder on public.roster_entries;
create trigger roster_entries_claim_ladder
  after update of claimed_by on public.roster_entries
  for each row execute function public.handle_roster_claim_ladder();

-- Indeling 2026-10-29: Zwiftladies en Bandits gaan samen op in ZWBrains, en
-- ZWBeauties komt erbij. Bandits en Zwiftladies blijven in het archief.
insert into public.teams (name, type)
select v.name, 'ladder'
from (values ('ZWBrains'), ('ZWBeauties')) as v(name)
where not exists (
  select 1 from public.teams t where t.type = 'ladder' and lower(t.name) = lower(v.name)
);

update public.teams t
set ladder_rank_min = b.min_rank, ladder_rank_max = b.max_rank
from (values
  ('ZWBeasts', 1, 2),
  ('ZWBullets', 2, 4),
  ('ZWBrains', 4, 6),
  ('ZWBeauties', 5, 7)
) as b(name, min_rank, max_rank)
where t.type = 'ladder' and lower(t.name) = lower(b.name);

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select name, is_graveyard, ladder_rank_min, ladder_rank_max from teams
--   where type = 'ladder' order by name;
--   -- Beasts 1-2, Beauties 5-7, Brains 4-6, Bullets 2-4; Bandits en Zwiftladies leeg
-- select relname, relrowsecurity from pg_class
--   where oid in ('public.ladder_ranks'::regclass, 'public.ladder_roster_riders'::regclass);
--   -- beide true
