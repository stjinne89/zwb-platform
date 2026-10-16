-- Springen voor je botten: één oefening en één serie. Vereist 0159.
--
-- Wetenschappelijke toets fase 4 (2026-10-16, docs/wetenschappelijke-toets.md):
--   * Springen verhoogde bij volwassenen de botdichtheid in de dijbeenhals met
--     ~1,5 %, rond 50 sprongen vier keer per week (Florence 2023).
--   * Bij topwielrenners hield vijf keer per week vijf minuten springen, met
--     collageen, die botdichtheid op peil (Hilkens 2023).
-- Vijf sets van tien is de ~50 sprongen per keer uit Florence 2023.
--
-- De serie heeft goal 'kracht' omdat ze bij de krachtseries hoort, maar valt
-- buiten de krachtregels (BONE_SERIES_SLUGS in src/lib/training/mobility.ts):
-- niet uit zichzelf voorgesteld en niet geteld voor de rust tussen
-- krachtsessies. Figuur, spiergroepen en materiaal staan in de code.
--
-- Niet lokaal tegen Supabase gedraaid; tests/unit/mobility-strength-migration.test.ts
-- draait hem in PGlite bovenop 0109–0232.

insert into public.mobility_exercises
  (slug, title, category, region, cue_md, illustration_slug,
   default_hold_seconds, default_reps, is_unilateral, level, is_standard)
select
  v.slug, v.title, v.category, v.region, v.cue_md, v.illustration_slug,
  v.default_hold_seconds::int, v.default_reps, v.is_unilateral, v.level, true
from (values
  ('countermovement-jump', 'Sprong uit stand', 'kracht', 'been',
   'Sta met je voeten op heupbreedte. Zak snel een kwart squat in, zwaai je armen mee en spring zo hoog als je kunt. Land zacht op je voorvoeten, knieën licht gebogen boven je voeten, en sta even stil voor de volgende sprong. Op een stevige, vlakke ondergrond, niet op gladde sokken.',
   'countermovement-jump', null, 10, false, 1)
) as v(slug, title, category, region, cue_md, illustration_slug,
       default_hold_seconds, default_reps, is_unilateral, level)
on conflict (slug) do update
set
  title = excluded.title,
  category = excluded.category,
  region = excluded.region,
  cue_md = excluded.cue_md,
  illustration_slug = excluded.illustration_slug,
  default_hold_seconds = excluded.default_hold_seconds,
  default_reps = excluded.default_reps,
  is_unilateral = excluded.is_unilateral,
  level = excluded.level,
  updated_at = now();

insert into public.mobility_series
  (slug, title, subtitle, goal, timing, duration_minutes, level, is_standard)
select v.slug, v.title, v.subtitle, v.goal, v.timing, v.duration_minutes, v.level, true
from (values
  ('springen', 'Springen voor je botten',
   'Vijftig sprongen, drie à vier keer per week. Mag ook op een fietsdag.',
   'kracht', 'rustdag', 6, 1)
) as v(slug, title, subtitle, goal, timing, duration_minutes, level)
on conflict (slug) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  goal = excluded.goal,
  timing = excluded.timing,
  duration_minutes = excluded.duration_minutes,
  level = excluded.level,
  updated_at = now();

delete from public.mobility_series_items
where series_id in (
  select id from public.mobility_series where is_standard and slug = 'springen'
);

insert into public.mobility_series_items
  (series_id, exercise_id, sort_order, sets, reps, hold_seconds, rest_seconds)
select s.id, e.id, v.sort_order, v.sets, v.reps, v.hold_seconds, v.rest_seconds
from (values
  ('springen', 'countermovement-jump', 0, 5, 10, null::int, 30)
) as v(series_slug, exercise_slug, sort_order, sets, reps, hold_seconds, rest_seconds)
join public.mobility_series s on s.slug = v.series_slug and s.is_standard
join public.mobility_exercises e on e.slug = v.exercise_slug and e.is_standard;

notify pgrst, 'reload schema';

-- Verificatie (na het draaien): één serie met één oefening.
--   select s.slug, count(i.id) from public.mobility_series s
--   left join public.mobility_series_items i on i.series_id = s.id
--   where s.slug = 'springen' group by s.slug;
