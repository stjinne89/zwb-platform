-- Geen ZRL-races meer voor hoofdteams.
--
-- Een hoofdteam met subteams (B met B1/B2, de Zwiftladies) start zelf niet in
-- een wedstrijd; dat doen de subteams. De import zette er toch races voor neer.
-- Het hoofdteam blijft wel de plek waar georganiseerd wordt: leden melden zich
-- beschikbaar bij het hoofdteam en de captain verdeelt ze over de subteams.
--
-- Dat organiseren hing aan de races van het hoofdteam. Het verhuist naar het
-- hoofdevent van de raceweek (migr. 0178): beschikbaarheid, opstellingen en
-- TTT-plannen van het hoofdteam gaan naar dat hoofdevent, daarna gaan de races
-- van het hoofdteam weg.
--
-- Een "ja" op een race van het hoofdteam wordt beschikbaarheid bij het hoofdteam
-- voor die raceweek (misschien blijft misschien, nee wordt niet beschikbaar),
-- tenzij het lid daar al iets had opgegeven. Trainingsblokken die aan zo'n race
-- hingen blijven in het schema staan, zonder koppeling (`on delete set null`).

drop table if exists zrl_hoofdteams;
create temporary table zrl_hoofdteams as
select distinct parent.id
from public.teams parent
join public.teams child on child.parent_team_id = parent.id;

-- Races die het hoofdteam organiseert: zijn eigen races en die van zijn
-- subteams, telkens met het hoofdevent van die raceweek.
drop table if exists zrl_organised_races;
create temporary table zrl_organised_races as
select e.id as event_id, e.parent_event_id, e.team_id
from public.events e
where e.type = 'zrl'
  and e.parent_event_id is not null
  and e.team_id is not null;

-- 1. Beschikbaarheid bij het hoofdteam → hoofdevent. Bij dubbele opgave (race
--    van B en van B1 in dezelfde week) wint de laatste.
insert into public.team_event_availability
  (event_id, team_id, profile_id, status, note, updated_at)
select distinct on (r.parent_event_id, a.team_id, a.profile_id)
  r.parent_event_id, a.team_id, a.profile_id, a.status, a.note, a.updated_at
from public.team_event_availability a
join zrl_organised_races r on r.event_id = a.event_id
where a.team_id in (select id from zrl_hoofdteams)
order by r.parent_event_id, a.team_id, a.profile_id, a.updated_at desc
on conflict (event_id, team_id, profile_id) do nothing;

delete from public.team_event_availability a
using zrl_organised_races r
where r.event_id = a.event_id
  and a.team_id in (select id from zrl_hoofdteams);

-- 2. RSVP op een race van het hoofdteam → beschikbaarheid bij het hoofdteam.
insert into public.team_event_availability
  (event_id, team_id, profile_id, status, updated_at)
select distinct on (r.parent_event_id, r.team_id, v.profile_id)
  r.parent_event_id,
  r.team_id,
  v.profile_id,
  case v.status
    when 'yes' then 'available'
    when 'maybe' then 'maybe'
    else 'unavailable'
  end,
  v.updated_at
from public.event_rsvps v
join zrl_organised_races r on r.event_id = v.event_id
where r.team_id in (select id from zrl_hoofdteams)
order by r.parent_event_id, r.team_id, v.profile_id, v.updated_at desc
on conflict (event_id, team_id, profile_id) do nothing;

-- 3. Opstellingen van het hoofdteam → hoofdevent.
insert into public.team_event_lineups
  (event_id, parent_team_id, team_id, profile_id, slot, role, note, selected_by, updated_at)
select distinct on (r.parent_event_id, l.parent_team_id, l.profile_id)
  r.parent_event_id, l.parent_team_id, l.team_id, l.profile_id,
  l.slot, l.role, l.note, l.selected_by, l.updated_at
from public.team_event_lineups l
join zrl_organised_races r on r.event_id = l.event_id
where l.parent_team_id in (select id from zrl_hoofdteams)
order by r.parent_event_id, l.parent_team_id, l.profile_id, l.updated_at desc
on conflict (event_id, parent_team_id, profile_id) do nothing;

delete from public.team_event_lineups l
using zrl_organised_races r
where r.event_id = l.event_id
  and l.parent_team_id in (select id from zrl_hoofdteams);

-- 4. TTT-plannen van het hoofdteam → hoofdevent.
update public.ttt_plans p
set event_id = r.parent_event_id
from zrl_organised_races r
where r.event_id = p.event_id
  and p.parent_team_id in (select id from zrl_hoofdteams);

-- 5. De races van de hoofdteams zelf.
delete from public.events e
using zrl_organised_races r
where r.event_id = e.id
  and r.team_id in (select id from zrl_hoofdteams);

drop table zrl_organised_races;
drop table zrl_hoofdteams;
