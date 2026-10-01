-- De segmentverkenner en de ZWB KOM's uit de database.
--
-- Besluit van de eigenaar (2026-10-01). De tabel strava_activity_segment_efforts
-- was ~1 GB van een database van 1,26 GB op een Free-plan van 0,5 GB, en de ruimte
-- was niet terug te geven met een VACUUM FULL (past niet op de disk van 2 GB; zie
-- docs/prestatie-onderzoek-2026-09-30.md). Een tabel die weg mag, kan wel: DROP
-- TABLE geeft de ruimte direct terug, zonder kopie en vrijwel zonder WAL.
--
-- Wat blijft: de collecties (zwb_segments, profile_completed_segments), cols en
-- coltijden. Die hebben de pogingen niet nodig (src/lib/segments/sync.ts).
--
-- VOLGORDE: pas toepassen nadat de code zonder verkenner live staat. De oude code
-- leest deze tabellen en de kolom on_segment_kom nog.
--
-- Alles in één transactie. De laatste stap controleert of er nog een functie naar
-- de verwijderde tabellen verwijst en breekt dan alles af.

begin;

-- ── 1. Eigen GPS-tijden bewaren ─────────────────────────────────────
-- Sinds 0199 stond een eigen tijd (GPX, intervals.icu) als poging in de tabel.
-- Voortaan staat hij in de rit zelf (raw.gps_segment_times, gps-sync.ts). Alleen
-- uitgekozen segmenten en cols; de rest hoorde bij de verkenner.
with curated as (
  select strava_segment_id as id from public.zwb_segments where strava_segment_id is not null
  union
  select strava_segment_id from public.cols where strava_segment_id is not null
), best as (
  select distinct on (e.activity_id, e.strava_segment_id)
    e.activity_id, e.strava_segment_id, e.elapsed_time_seconds, e.started_at
  from public.strava_activity_segment_efforts e
  join curated c on c.id = e.strava_segment_id
  where e.raw->>'source' = 'gps' and e.elapsed_time_seconds > 0
  order by e.activity_id, e.strava_segment_id, e.elapsed_time_seconds
), per_ride as (
  select activity_id,
    jsonb_agg(jsonb_build_object(
      'segment_id', strava_segment_id,
      'seconds', elapsed_time_seconds,
      'started_at', started_at
    ) order by strava_segment_id) as times
  from best
  group by activity_id
)
update public.strava_activities a
set raw = coalesce(a.raw, '{}'::jsonb) || jsonb_build_object('gps_segment_times', p.times)
from per_ride p
where a.id = p.activity_id
  and not (coalesce(a.raw, '{}'::jsonb) ? 'gps_segment_times');

-- ── 2. Triggers, views en functies ──────────────────────────────────
-- Op naam opgezocht in plaats van met een vaste lijst van signaturen: de functies
-- zijn over meerdere migraties herschreven (0152, 0155, 0156, 0161, 0162, 0199,
-- 0209). cascade neemt de triggers mee die een functie aanroepen, ook die op
-- strava_activities, profiles en strava_connections (KOM-herberekening).
drop view if exists public.zwb_segment_kom_club;
drop view if exists public.zwb_segment_club;

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
    where p.proname in (
      'replace_activity_segment_efforts',
      'register_ridden_segment',
      'segment_geometry_candidates',
      'segment_geometry_priority',
      'segment_map_clusters',
      'refresh_segment_koms',
      'mark_segment_koms_dirty',
      'zwb_segment_kom_effort_changed',
      'zwb_segment_kom_activity_changed',
      'zwb_segment_kom_rider_changed',
      'slim_segment_effort_raw',
      'slim_segment_effort_row'
    )
  loop
    execute format('drop function %s cascade', fn.signature);
  end loop;
end $$;

-- ── 3. Tabellen ─────────────────────────────────────────────────────
drop table if exists public.zwb_segment_kom_events;
drop table if exists public.zwb_segment_koms;
drop table if exists public.strava_activity_segment_efforts;

-- ── 4. Het register: alleen nog lijnen voor de GPS-meting ───────────
-- Van ~80.000 Strava-segmenten naar de uitgekozen segmenten en cols. Legen en
-- terugzetten in plaats van verwijderen: TRUNCATE geeft de ruimte direct terug en
-- schrijft bijna geen WAL (les van het incident op 2026-10-01).
create temporary table zwb_segment_maps_keep on commit drop as
select m.*
from public.zwb_segment_maps m
where m.id in (
  select strava_segment_id from public.zwb_segments where strava_segment_id is not null
  union
  select strava_segment_id from public.cols where strava_segment_id is not null
);
truncate table public.zwb_segment_maps;
insert into public.zwb_segment_maps select * from zwb_segment_maps_keep;

alter table public.zwb_segment_maps
  drop column if exists kom_dirty,
  drop column if exists kom_computed_at;

-- ── 5. De pushvoorkeur voor KOM-meldingen ───────────────────────────
alter table public.notification_preferences drop column if exists on_segment_kom;

-- ── 6. Controle ─────────────────────────────────────────────────────
do $$
declare leftover text;
begin
  select string_agg(p.proname, ', ') into leftover
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where p.prokind = 'f'
    and p.prosrc ~ 'strava_activity_segment_efforts|zwb_segment_koms|zwb_segment_kom_events|zwb_segment_club|zwb_segment_kom_club';
  if leftover is not null then
    raise exception 'Functies verwijzen nog naar verwijderde tabellen: %', leftover;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
