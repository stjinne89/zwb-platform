-- De twee ZRL-warming-ups uit 0221 heten voortaan naar een gewone wedstrijd:
-- ze passen bij elke scratch- of puntenrace, niet alleen bij de ZRL.
--   'Warming-up ZRL lang' -> 'Warming-up wedstrijd'
--   'Warming-up ZRL kort' -> 'Warming-up wedstrijd kort'
--
-- Alleen de meegeleverde rijen. Al ingeplande en gereden warming-ups houden hun
-- titel: die staan zo ook in intervals.icu.

update public.training_workout_templates t
set title = 'Warming-up wedstrijd', updated_at = now()
where t.is_standard
  and t.form = 'warmup'
  and t.title = 'Warming-up ZRL lang'
  and not exists (
    select 1 from public.training_workout_templates o
    where o.is_standard and o.form = 'warmup' and o.title = 'Warming-up wedstrijd'
  );

update public.training_workout_templates t
set
  title = 'Warming-up wedstrijd kort',
  description = 'Tien minuten voor een wedstrijd, als er weinig tijd is.',
  updated_at = now()
where t.is_standard
  and t.form = 'warmup'
  and t.title = 'Warming-up ZRL kort'
  and not exists (
    select 1 from public.training_workout_templates o
    where o.is_standard and o.form = 'warmup' and o.title = 'Warming-up wedstrijd kort'
  );

notify pgrst, 'reload schema';
