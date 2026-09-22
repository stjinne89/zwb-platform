-- Hoofdevent met teamevents eronder.
--
-- De ZRL-import zette per team één event per raceweek neer. Informatie die voor
-- alle teams geldt (parcours, format, afspraken) moest daardoor per team worden
-- ingevuld, en de kalender stond vol met dezelfde race onder vijf namen.
--
-- Nu: één hoofdevent per raceweek zonder team, met de teamevents eronder via
-- `parent_event_id`. Het teamevent houdt alles wat per team verschilt
-- (beschikbaarheid, opstelling, Zwift-eventlink, RSVP's); het hoofdevent draagt
-- de gedeelde omschrijving.
--
-- `on delete set null`: een hoofdevent verwijderen laat de teamevents staan, met
-- hun opstellingen en beschikbaarheid. Ze worden dan weer losse events.

alter table public.events
  add column if not exists parent_event_id uuid
    references public.events(id) on delete set null;

alter table public.events
  drop constraint if exists events_parent_not_self;
alter table public.events
  add constraint events_parent_not_self
    check (parent_event_id is null or parent_event_id <> id);

create index if not exists events_parent_event_id_idx
  on public.events (parent_event_id)
  where parent_event_id is not null;

-- Bestaande ZRL-teamevents groeperen. De import schreef titels als
-- "ZRL 2026/27 · R1 · W1 · ZRL A — Race of Truth"; de eerste drie delen zijn de
-- raceweek. Titels die met de hand zijn veranderd en niet meer in dat patroon
-- passen, blijven los staan.
insert into public.events (type, title, start_at, created_by)
select
  'zrl',
  groups.round_key || case when groups.is_rot then ' — Race of Truth' else '' end,
  groups.start_at,
  groups.created_by
from (
  select
    substring(title from '^(ZRL [^·]+ · R[0-9]+ · W[0-9]+) · ') as round_key,
    min(start_at) as start_at,
    bool_or(title like '%— Race of Truth') as is_rot,
    (array_agg(created_by order by start_at, id))[1] as created_by
  from public.events
  where type = 'zrl'
    and team_id is not null
    and parent_event_id is null
  group by 1
) as groups
where groups.round_key is not null
  and not exists (
    select 1
    from public.events parent
    where parent.type = 'zrl'
      and parent.team_id is null
      and substring(parent.title from '^(ZRL [^·]+ · R[0-9]+ · W[0-9]+)') = groups.round_key
  );

update public.events child
set parent_event_id = parent.id
from public.events parent
where child.type = 'zrl'
  and child.team_id is not null
  and child.parent_event_id is null
  and parent.type = 'zrl'
  and parent.team_id is null
  and parent.parent_event_id is null
  and substring(child.title from '^(ZRL [^·]+ · R[0-9]+ · W[0-9]+) · ')
    = substring(parent.title from '^(ZRL [^·]+ · R[0-9]+ · W[0-9]+)');
