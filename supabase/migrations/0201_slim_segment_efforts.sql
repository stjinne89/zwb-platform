-- Segmentpogingen slank, en een voorrangslijst die niet meer alle pogingen telt.
-- Onderzoek en metingen: docs/prestatie-onderzoek-2026-09-30.md.
--
-- Op 2026-09-30 was strava_activity_segment_efforts 1,02 GB van een database van
-- 1,31 GB (Free-plan: 0,5 GB, Nano-compute met 0,5 GB geheugen). Ongeveer 670 MB
-- daarvan was de kolom raw: de volledige Strava-effort (atleet, activiteit,
-- segmentobject, hartslag, achievements). De database leest daar alleen
-- raw->>'source' ('gps' voor eigen metingen, 0199) en raw->'segment'->>'private'
-- uit; hidden bewaren we ook, omdat 0152 er ooit op filterde.
--
-- Bewuste keuze van de eigenaar (2026-09-30): de rest van de Strava-effort wordt
-- niet meer bewaard. Een latere feature die er iets anders uit wil halen, moet het
-- opnieuw bij Strava ophalen.

-- ── raw inkorten, voor elke schrijfweg ──────────────────────────────
-- In de database in plaats van alleen in de app: zo geldt het ook voor de
-- versie die nog draait tot de deploy, en voor elke toekomstige schrijfweg.
create or replace function public.slim_segment_effort_raw(p_raw jsonb)
returns jsonb language sql immutable as $$
  select case when p_raw is null or jsonb_typeof(p_raw) <> 'object' then p_raw
  else jsonb_strip_nulls(jsonb_build_object(
    'source', p_raw->'source',
    'hidden', p_raw->'hidden',
    'segment', case when jsonb_typeof(p_raw->'segment') = 'object' and p_raw->'segment' ? 'private'
      then jsonb_build_object('private', p_raw->'segment'->'private') end
  )) end
$$;

create or replace function public.slim_segment_effort_row()
returns trigger language plpgsql set search_path=public as $$
begin
  new.raw := public.slim_segment_effort_raw(new.raw);
  return new;
end $$;
revoke all on function public.slim_segment_effort_row() from public;

drop trigger if exists slim_segment_effort_raw on public.strava_activity_segment_efforts;
create trigger slim_segment_effort_raw
  before insert or update of raw on public.strava_activity_segment_efforts
  for each row execute function public.slim_segment_effort_row();

-- ── KOM-herberekening alleen bij een wijziging die ertoe doet ───────
-- De trigger uit 0161 markeerde bij élke update het segment als dirty. Het
-- inkorten van raw raakt ~500.000 rijen en zou zo alle ~80.000 segmenten opnieuw
-- laten doorrekenen. Nu alleen als een kolom verandert die refresh_segment_koms
-- (0161, 0162, 0199) of het clubklassement leest.
drop trigger if exists zwb_segment_kom_effort_changed on public.strava_activity_segment_efforts;
drop trigger if exists zwb_segment_kom_effort_updated on public.strava_activity_segment_efforts;
create trigger zwb_segment_kom_effort_changed
  after insert or delete on public.strava_activity_segment_efforts
  for each row execute function public.zwb_segment_kom_effort_changed();
create trigger zwb_segment_kom_effort_updated
  after update on public.strava_activity_segment_efforts
  for each row when (
    old.strava_segment_id is distinct from new.strava_segment_id
    or old.profile_id is distinct from new.profile_id
    or old.activity_id is distinct from new.activity_id
    or old.elapsed_time_seconds is distinct from new.elapsed_time_seconds
    or old.started_at is distinct from new.started_at
    or old.raw->>'source' is distinct from new.raw->>'source'
    or old.raw->'segment'->>'private' is distinct from new.raw->'segment'->>'private'
  )
  execute function public.zwb_segment_kom_effort_changed();

-- ── Voorrangslijst voor segmentlijnen ───────────────────────────────
-- 0156 telde bij elke aanroep alle pogingen per segment (op 2026-09-30 ~500.000
-- rijen): gemiddeld 4,6 s, geregeld afgebroken op de statement timeout van 8 s,
-- elke 5 minuten. Samen ~40% van alle databasetijd. De app wacht maar 2 s, dus het
-- antwoord kwam vrijwel nooit aan.
--
-- Nu: alleen segmenten met een ZWB KOM, dus met minstens drie ZWB-rijders
-- (zwb_segment_koms houdt dat aantal al bij). Dat waren er op 2026-09-30 2.272
-- zonder lijn. Segmenten met één of twee rijders krijgen hun lijn pas als een lid
-- ze opent (api/segments/explore/[id]); bij 20-60 lijnen per dag kwam de
-- inhaalslag daar in de praktijk toch nooit aan toe.
create or replace function public.segment_geometry_priority(p_limit integer)
returns table(id text, profile_id uuid)
language sql stable security definer set search_path=public as $$
  with riders as (
    select p.id from public.profiles p
    join public.strava_connections c on c.profile_id=p.id and c.revoked_at is null
    where p.is_approved
  ), top as (
    select k.segment_id as id, max(k.riders) as riders
    from public.zwb_segment_koms k
    join public.zwb_segment_maps m on m.id=k.segment_id
    where not m.private
      and (m.geometry_status='pending' or (m.geometry_status='error' and m.geometry_checked_at < now()-interval '7 days'))
    group by k.segment_id
    order by max(k.riders) desc, k.segment_id
    limit least(greatest(p_limit,0),10)
  )
  select t.id::text, pick.profile_id
  from top t
  cross join lateral (
    select e.profile_id
    from public.strava_activity_segment_efforts e
    join public.strava_activities a on a.id=e.activity_id and a.profile_id=e.profile_id and a.sport_type='Ride' and not a.trainer
    where e.strava_segment_id=t.id and e.profile_id in (select id from riders)
    order by e.started_at desc nulls last
    limit 1
  ) pick
  order by t.riders desc, t.id
$$;
revoke all on function public.segment_geometry_priority(integer) from public,anon,authenticated;
grant execute on function public.segment_geometry_priority(integer) to service_role;

notify pgrst,'reload schema';
