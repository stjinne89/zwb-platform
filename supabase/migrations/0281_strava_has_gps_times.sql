-- Eigen tijden ophalen zonder per rit de hele raw uit te pakken.
--
-- De databasecheck van 2026-10-27 vond src/lib/cols/gps-col-times.ts als
-- zwaarste query (17% van de databasetijd, gemiddeld 573 ms). Hij filterde op
-- `raw->gps_col_times is not null` en `raw->gps_segment_times is not null`; daarvoor
-- pakt Postgres bij elke rit van het lid de hele raw uit, terwijl maar 232 van
-- de ~29.000 ritten eigen tijden hebben.
--
-- has_gps_times zegt of raw een van beide sleutels heeft. Een trigger houdt hem
-- bij zodra raw wordt geschreven (gps-sync.ts, de intervals-sync, imports),
-- zodat geen schrijver hem hoeft te kennen. De trigger vuurt alleen bij een
-- update die raw zet, niet bij updates van andere kolommen.
--
-- Kolom zonder default: geen herschrijving van de tabel (de les van
-- 2026-10-01). Null telt als "geen tijden".

alter table public.strava_activities
  add column if not exists has_gps_times boolean;

create or replace function public.strava_activities_set_has_gps_times()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.has_gps_times := coalesce(new.raw ? 'gps_col_times' or new.raw ? 'gps_segment_times', false);
  return new;
end $$;

drop trigger if exists strava_activities_has_gps_times on public.strava_activities;
create trigger strava_activities_has_gps_times
  before insert or update of raw on public.strava_activities
  for each row execute function public.strava_activities_set_has_gps_times();

-- Bestaande ritten: alleen de rijen met tijden krijgen true (232 op
-- 2026-10-27), de rest blijft null. De update zet raw niet, dus de trigger
-- vuurt hier niet.
update public.strava_activities
   set has_gps_times = true
 where raw ? 'gps_col_times' or raw ? 'gps_segment_times';

-- De app vraagt `has_gps_times is true` (PostgREST `.is(..., true)`): letterlijk
-- dezelfde voorwaarde als hier, zodat de planner de index altijd kan gebruiken,
-- ook in een generiek plan.
create index if not exists strava_activities_gps_times_idx
  on public.strava_activities (profile_id)
  where has_gps_times is true;
