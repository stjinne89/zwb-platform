-- Allow members with the Trainer role to assign themselves as their own coach.
-- The application action still validates that trainer_id belongs to a profile
-- with community role "trainer"; this migration only removes the old
-- athlete_id <> trainer_id database restriction.

do $$
declare
  constraint_name text;
begin
  select c.conname
    into constraint_name
  from pg_constraint c
  where c.conrelid = 'public.training_coach_assignments'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%athlete_id%<>%trainer_id%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.training_coach_assignments drop constraint %I',
      constraint_name
    );
  end if;
end $$;
