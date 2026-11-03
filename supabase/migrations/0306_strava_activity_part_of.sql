-- Meerdere ritten die samen één training zijn.
--
-- Een training hing tot nu toe aan precies één rit. Wie zijn duurtraining in
-- stukken rijdt — een Zwift-workout, daarna een video-rit en een group ride —
-- zag alleen het eerste stuk bij de training, en de rest als ongepland. Het lid
-- kan een rit nu bij een andere rit van dezelfde dag zetten; de app telt ze
-- daarna overal in het schema als één rit, met die andere rit als hoofdrit.
--
-- Een kolom op de rit, zoals training_excluded_at (0163) en athlete_rpe (0303):
-- de markering hoort bij precies één rit. Verdwijnt de hoofdrit (verwijderd in
-- Strava, bewaartermijn), dan staat het stuk weer los. Eén niveau diep: de app
-- hangt een stuk altijd aan de hoofdrit, nooit aan een ander stuk.

alter table public.strava_activities
  add column if not exists part_of_activity_id bigint
    references public.strava_activities(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'strava_activities_part_of_not_self'
  ) then
    alter table public.strava_activities
      add constraint strava_activities_part_of_not_self
        check (part_of_activity_id is null or part_of_activity_id <> id);
  end if;
end $$;

create index if not exists strava_activities_part_of_idx
  on public.strava_activities (part_of_activity_id)
  where part_of_activity_id is not null;

notify pgrst, 'reload schema';
