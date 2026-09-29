-- FRR-tour als hoofdevent (wens eigenaar, 2026-09-29).
--
-- 0195 zette elke etappe als hoofdevent in de kalender, met de tijdsloten
-- eronder. Nu komt er één niveau boven: het tourevent ("FRR Ignite"), met de
-- etappes eronder en per etappe de tijdsloten. De kalender toont de tour als
-- één regel met een knop per etappe, zoals een ZRL-raceweek.
--
-- Herkenning binnen een tour (alle drie hebben frr_tour_id):
--   tourevent   frr_stage null, zwift_event_id null
--   etappe      frr_stage gezet, zwift_event_id null
--   tijdslot    zwift_event_id gezet
--
-- De migratie maakt voor bestaande tours het tourevent aan en hangt de etappes
-- eronder. Draaien vóór de deploy: de nieuwe import gaat uit van deze indexen.

drop index if exists public.events_frr_stage_parent_idx;

do $$
declare
  t record;
  tour_event uuid;
  first_start timestamptz;
begin
  for t in select id, name, created_by from public.frr_tours loop
    select id into tour_event
      from public.events
     where frr_tour_id = t.id and frr_stage is null and zwift_event_id is null
     limit 1;

    if tour_event is null then
      select min(start_at) into first_start
        from public.events
       where frr_tour_id = t.id and frr_stage is not null and zwift_event_id is null;
      if first_start is null then continue; end if;

      insert into public.events (type, title, start_at, external_url, frr_tour_id, created_by)
      values (
        'flamme_rouge',
        'FRR ' || coalesce(nullif(regexp_replace(trim(t.name), '^tour\s+', '', 'i'), ''), trim(t.name)),
        first_start,
        'https://flammerougeracing.com/tours/',
        t.id,
        coalesce(
          t.created_by,
          (select created_by from public.events
            where frr_tour_id = t.id and frr_stage is not null and zwift_event_id is null
            limit 1)
        )
      )
      returning id into tour_event;
    end if;

    update public.events
       set parent_event_id = tour_event
     where frr_tour_id = t.id
       and frr_stage is not null
       and zwift_event_id is null
       and parent_event_id is null;
  end loop;
end $$;

-- Eén tourevent per tour, één etappe per nummer.
create unique index if not exists events_frr_tour_event_idx
  on public.events (frr_tour_id)
  where frr_tour_id is not null and frr_stage is null and zwift_event_id is null;
create unique index if not exists events_frr_stage_idx
  on public.events (frr_tour_id, frr_stage)
  where frr_tour_id is not null and frr_stage is not null and zwift_event_id is null;

notify pgrst, 'reload schema';
