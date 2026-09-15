-- ZWB QOM naast de KOM, plus een pushmelding bij winnen of verliezen.
--
-- Keuzes van de eigenaar (2026-09-15):
--   * KOM blijft de snelste van iedereen, ook vrouwen. QOM is daarnaast de snelste vrouw
--     (profiles.sex = 'vrouw'); een vrouw kan dus beide titels hebben.
--   * De drempel blijft drie ZWB'ers op het segment, niet per categorie: de snelste vrouw
--     krijgt de QOM ook als zij de enige vrouw is.
--   * Leden zonder geslacht of met 'zeg_ik_liever_niet' dingen alleen naar de KOM mee.
--
-- Meldingen gaan via een uitgaande wachtrij (zwb_segment_kom_events), zodat een timeout
-- van de doorrekening geen melding kwijtraakt of dubbel verstuurt. Alleen gebeurtenissen
-- met een recordrit van de afgelopen zeven dagen komen erin, en niet bij de eerste
-- doorrekening van een segment: anders geeft deze migratie en de inhaalslag van oude
-- ritten honderden meldingen. Verliezen telt alleen als de nieuwe houder echt sneller is,
-- niet als de oude houder zelf verdween (rit privé, koppeling ingetrokken).

alter table public.zwb_segment_koms add column if not exists title text not null default 'kom' check (title in ('kom','qom'));
alter table public.zwb_segment_koms drop constraint if exists zwb_segment_koms_pkey;
alter table public.zwb_segment_koms add primary key (segment_id, title, profile_id);

-- Eerste doorrekening onder deze regels: alles opnieuw, en die ronde meldt niets.
alter table public.zwb_segment_maps add column if not exists kom_computed_at timestamptz;
update public.zwb_segment_maps set kom_dirty=true, kom_computed_at=null;

create table public.zwb_segment_kom_events (
  id bigint generated always as identity primary key,
  segment_id bigint not null references public.zwb_segment_maps(id) on delete cascade,
  title text not null check (title in ('kom','qom')),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('won','lost')),
  seconds integer not null,
  holder_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
create index zwb_segment_kom_events_pending on public.zwb_segment_kom_events(id) where notified_at is null;
create index zwb_segment_kom_events_profile on public.zwb_segment_kom_events(profile_id);
alter table public.zwb_segment_kom_events enable row level security;
revoke all on public.zwb_segment_kom_events from anon, authenticated;
grant all on public.zwb_segment_kom_events to service_role;

alter table public.notification_preferences
  add column if not exists on_segment_kom boolean not null default true;

-- Geslacht bepaalt nu mee wie de QOM heeft.
drop trigger if exists zwb_segment_kom_rider_changed on public.profiles;
create trigger zwb_segment_kom_rider_changed after update on public.profiles
for each row when (
  old.is_approved is distinct from new.is_approved
  or (old.privacy_accepted_version >= '2026-09-13') is distinct from (new.privacy_accepted_version >= '2026-09-13')
  or (coalesce(old.sex,'')='vrouw') <> (coalesce(new.sex,'')='vrouw')
) execute function public.zwb_segment_kom_rider_changed();

create or replace function public.refresh_segment_koms(p_limit integer) returns integer
language plpgsql security definer set search_path=public as $$
declare picked bigint[]; candidates bigint[]; previous jsonb;
begin
  select coalesce(array_agg(id),'{}') into picked from (
    select id from public.zwb_segment_maps where kom_dirty order by id limit least(greatest(p_limit,0),1000) for update skip locked
  ) dirty;
  if cardinality(picked)=0 then return 0; end if;

  select coalesce(array_agg(segment_id),'{}') into candidates from (
    select e.strava_segment_id as segment_id
    from public.strava_activity_segment_efforts e
    join public.profiles p on p.id=e.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
    join public.strava_connections c on c.profile_id=e.profile_id and c.revoked_at is null
    where e.strava_segment_id=any(picked)
    group by e.strava_segment_id having count(distinct e.profile_id) >= 3
  ) enough;

  select coalesce(jsonb_agg(jsonb_build_object('segment_id',k.segment_id,'title',k.title,'profile_id',k.profile_id,'seconds',k.seconds)),'[]')
  into previous from public.zwb_segment_koms k where k.segment_id=any(picked);

  delete from public.zwb_segment_koms where segment_id=any(picked);
  insert into public.zwb_segment_koms(segment_id,title,profile_id,seconds,riders,achieved_at,activity_id)
  with best as (
    select distinct on (e.strava_segment_id,e.profile_id) e.strava_segment_id as segment_id,e.profile_id,
      coalesce(p.sex,'')='vrouw' as woman,e.elapsed_time_seconds as seconds,e.started_at,e.activity_id
    from public.strava_activity_segment_efforts e
    join public.zwb_segment_maps m on m.id=e.strava_segment_id and not m.private
    join public.strava_activities a on a.id=e.activity_id and a.profile_id=e.profile_id
    join public.profiles p on p.id=e.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
    join public.strava_connections c on c.profile_id=e.profile_id and c.revoked_at is null
    where e.strava_segment_id=any(candidates) and e.elapsed_time_seconds>0
      and a.sport_type='Ride' and not a.trainer
      and coalesce(a.raw->>'private','false')='false'
      and coalesce(a.raw->>'visibility','everyone') <> 'only_me'
      and coalesce(a.raw->>'flagged','false')='false'
      and coalesce(e.raw->'segment'->>'private','false')='false'
    order by e.strava_segment_id,e.profile_id,e.elapsed_time_seconds,e.started_at nulls last,e.activity_id
  ), ranked as (
    select best.*, count(*) over (partition by segment_id) as riders,
      rank() over (partition by segment_id order by seconds) as place,
      rank() over (partition by segment_id, woman order by seconds) as place_sex
    from best
  )
  select segment_id,'kom',profile_id,seconds,riders,started_at,activity_id from ranked where place=1 and riders>=3
  union all
  select segment_id,'qom',profile_id,seconds,riders,started_at,activity_id from ranked where woman and place_sex=1 and riders>=3;

  insert into public.zwb_segment_kom_events(segment_id,title,profile_id,kind,seconds,holder_id)
  with old as (
    select * from jsonb_to_recordset(previous) as x(segment_id bigint,title text,profile_id uuid,seconds integer)
  ), winners as (
    select k.* from public.zwb_segment_koms k
    join public.zwb_segment_maps m on m.id=k.segment_id and m.kom_computed_at is not null
    where k.segment_id=any(picked) and k.achieved_at >= now()-interval '7 days'
      and not exists(select 1 from old o where o.segment_id=k.segment_id and o.title=k.title and o.profile_id=k.profile_id)
  )
  select w.segment_id,w.title,w.profile_id,'won',w.seconds,w.profile_id from winners w
  union all
  select o.segment_id,o.title,o.profile_id,'lost',w.seconds,w.profile_id
  from old o
  cross join lateral (
    select * from winners w where w.segment_id=o.segment_id and w.title=o.title and w.seconds<o.seconds
    order by w.achieved_at desc nulls last,w.profile_id limit 1
  ) w
  where not exists(select 1 from public.zwb_segment_koms k where k.segment_id=o.segment_id and k.title=o.title and k.profile_id=o.profile_id);

  update public.zwb_segment_maps set kom_dirty=false,kom_computed_at=now() where id=any(picked);
  return cardinality(picked);
end $$;
revoke all on function public.refresh_segment_koms(integer) from public,anon,authenticated;
grant execute on function public.refresh_segment_koms(integer) to service_role;

-- Nieuwe kolom achteraan (create or replace view mag alleen toevoegen). Een QOM telt bij
-- lezen alleen zolang het profiel nog 'vrouw' zegt.
create or replace view public.zwb_segment_kom_club with (security_barrier=true) as
select k.segment_id::text as segment_id,m.name as segment_name,m.distance_m,m.average_grade,
  k.profile_id,p.display_name,k.seconds,k.riders,k.achieved_at,k.title
from public.zwb_segment_koms k
join public.zwb_segment_maps m on m.id=k.segment_id and not m.private
join public.profiles p on p.id=k.profile_id and p.is_approved and p.privacy_accepted_version >= '2026-09-13'
  and (k.title='kom' or p.sex='vrouw')
join public.strava_connections c on c.profile_id=k.profile_id and c.revoked_at is null
where auth.role()='service_role' or exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.is_approved and viewer.privacy_accepted_version >= '2026-09-13');
revoke all on public.zwb_segment_kom_club from public,anon;
grant select on public.zwb_segment_kom_club to authenticated,service_role;
notify pgrst,'reload schema';
