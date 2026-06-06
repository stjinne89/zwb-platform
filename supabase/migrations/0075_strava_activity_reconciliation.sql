-- Houd afgeleide col-PR's consistent wanneer een activiteit op Strava wordt
-- verwijderd en de lokale reconciliatie die activiteit opruimt.

update public.profile_climbed_cols climbed
set
  best_time_activity_id = null,
  best_time_seconds = null,
  best_time_at = null
where climbed.best_time_activity_id is not null
  and not exists (
    select 1
    from public.strava_activities activity
    where activity.id = climbed.best_time_activity_id
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profile_climbed_cols'::regclass
      and conname = 'profile_climbed_cols_best_time_activity_id_fkey'
  ) then
    alter table public.profile_climbed_cols
      add constraint profile_climbed_cols_best_time_activity_id_fkey
      foreign key (best_time_activity_id)
      references public.strava_activities(id)
      on delete set null;
  end if;
end
$$;
