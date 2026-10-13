-- CONCEPTINHOUD — pas draaien nadat de eigenaar docs/kracht-literatuur.md, de
-- oefeningen en de teksten heeft goedgekeurd. Vereist 0159 en 0160.
--
-- Acht krachtoefeningen en vijf series erbij: zwaar werk in de sportschool en
-- een thuisserie met gewicht. Dit draait het besluit uit 0160 terug om geen
-- werk met halters aan te bieden; de eigenaar koos daar op 2026-10-14 voor.
--
-- De onderbouwing per oefening en serie staat in docs/kracht-literatuur.md.
-- Kort:
--   * De gymseries volgen het programma uit Vikmoen e.a. (2017): halve squat,
--     eenbenige leg press, staande heupbuiging en kuitheffen, drie sets, in
--     blokken van 10/6, 8/5 en 6/4 herhalingen. De rust tussen sets (120 s) en
--     de invulling van de onderhoudssessie zijn eigen keuzes.
--   * De thuisserie gebruikt de thuisversies van dezelfde vier bewegingen. Dat
--     lichtere gewichten tot dicht bij spierfalen vergelijkbare spiergroei geven
--     komt uit algemene krachtliteratuur, niet uit onderzoek bij wielrenners.
--   * Geen gewichten in kilo's: een app kent je kracht niet. De tekst zegt hoe
--     zwaar het moet voelen.
--
-- Welk materiaal een oefening vraagt staat in de code
-- (src/lib/training/equipment.ts), net als de spiergroepen en de figuren. Een
-- serie met een halter of machine wordt nooit uit zichzelf voorgesteld.
--
-- illustration_slug verwijst naar src/components/mobility/figures/gym.ts.

-- ──────────────────────────────────────────────────────────────────────
-- Oefeningen
-- ──────────────────────────────────────────────────────────────────────

insert into public.mobility_exercises
  (slug, title, category, region, cue_md, illustration_slug,
   default_hold_seconds, default_reps, is_unilateral, level, is_standard)
select
  v.slug, v.title, v.category, v.region, v.cue_md, v.illustration_slug,
  -- Geen van deze oefeningen is een hold, dus de kolom bestaat hier alleen uit
  -- null en heeft zonder cast geen type.
  v.default_hold_seconds::int, v.default_reps, v.is_unilateral, v.level, true
from (values
  ('barbell-half-squat', 'Halve squat met halter', 'kracht', 'been',
   'Stang op je bovenrug, voeten iets breder dan heupbreed. Zak gecontroleerd tot je knieën een hoek van 90 graden maken, borst omhoog, hielen op de grond. Kom krachtig omhoog. Kies een gewicht waarmee de laatste herhaling nog net netjes lukt. Gebruik een rek met veiligheidsstangen of laat iemand meekijken.',
   'barbell-half-squat', null, 6, false, 3),

  ('single-leg-press', 'Eenbenige leg press', 'kracht', 'been',
   'Eén voet midden op de plaat, rug en bekken tegen de zitting. Laat de plaat zakken tot je knie ongeveer 90 graden is en duw krachtig weg zonder je knie op slot te zetten. Je knie blijft boven je voet. Kies een gewicht waarmee de laatste herhaling nog net netjes lukt.',
   'single-leg-press', null, 6, true, 3),

  ('standing-hip-flexion', 'Staande heupbuiging met kabel', 'kracht', 'heup',
   'Kabel laag, band om je enkel, rug naar het apparaat. Houd je vast en sta rechtop op je andere been. Trek je knie krachtig omhoog tot je bovenbeen horizontaal is en laat gecontroleerd terugkomen. Je romp blijft stil; leun niet achterover.',
   'standing-hip-flexion', null, 6, true, 3),

  ('loaded-calf-raise', 'Kuitheffen met gewicht', 'kracht', 'enkel',
   'Stang op je bovenrug of in een kuitenmachine, voorvoeten op een verhoging. Kom zo hoog mogelijk op je tenen en zak gecontroleerd terug tot net onder de rand. Knieën gestrekt maar niet op slot.',
   'loaded-calf-raise', null, 6, false, 3),

  ('goblet-squat', 'Goblet squat', 'kracht', 'been',
   'Houd een dumbbell of kettlebell met twee handen tegen je borst. Voeten iets breder dan heupbreed. Zak tot je bovenbenen ongeveer horizontaal zijn, ellebogen tussen je knieën, borst omhoog. Duw via je hele voet terug omhoog.',
   'goblet-squat', null, 12, false, 2),

  ('bulgarian-split-squat', 'Bulgaarse split squat', 'kracht', 'been',
   'Achterste voet op een stoel of bank, voorste voet een grote stap ervoor. Dumbbells langs je lichaam. Zak recht naar beneden tot je voorste bovenbeen ongeveer horizontaal is; je voorste knie blijft boven je voet. Duw via je voorste hiel omhoog. Begin zonder gewicht.',
   'bulgarian-split-squat', null, 10, true, 3),

  ('banded-hip-flexion', 'Heupbuiging met band', 'kracht', 'heup',
   'Maak een weerstandsband laag vast en doe hem om je enkel, rug naar het ankerpunt. Houd je vast en sta rechtop op je andere been. Trek je knie krachtig omhoog tot je bovenbeen horizontaal is en laat gecontroleerd terugkomen. Je romp blijft stil.',
   'banded-hip-flexion', null, 12, true, 2),

  ('single-leg-calf-raise', 'Eenbenig kuitheffen', 'kracht', 'enkel',
   'Sta met één voorvoet op de rand van een traptrede, met steun aan een muur of leuning. Kom zo hoog mogelijk op je tenen en zak in drie tellen terug tot net onder de trede. Te licht? Neem een dumbbell in de hand aan dezelfde kant.',
   'single-leg-calf-raise', null, 12, true, 2)
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

-- ──────────────────────────────────────────────────────────────────────
-- Series
-- ──────────────────────────────────────────────────────────────────────

insert into public.mobility_series
  (slug, title, subtitle, goal, timing, duration_minutes, level, is_standard)
select v.slug, v.title, v.subtitle, v.goal, v.timing, v.duration_minutes, v.level, true
from (values
  ('gym-opbouw-1', 'Gym: opbouw 1',
   'Week 1 tot 3. Tien herhalingen; de tweede sessie van de week zes, zwaarder.',
   'kracht', 'rustdag', 45, 3),
  ('gym-opbouw-2', 'Gym: opbouw 2',
   'Week 4 tot 6. Acht herhalingen; de tweede sessie van de week vijf.',
   'kracht', 'rustdag', 45, 3),
  ('gym-opbouw-3', 'Gym: opbouw 3',
   'Week 7 tot 12. Zes herhalingen; de tweede sessie van de week vier.',
   'kracht', 'rustdag', 40, 3),
  ('gym-onderhoud', 'Gym: onderhoud',
   'In het seizoen, één keer per week. Zwaar, maar kort.',
   'kracht', 'rustdag', 25, 3),
  ('kracht-thuis-gewicht', 'Kracht thuis: met gewicht',
   'Dumbbell en band. Elke set tot je er nog twee over hebt.',
   'kracht', 'rustdag', 35, 2)
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

-- ──────────────────────────────────────────────────────────────────────
-- De oefeningen in elke serie
-- ──────────────────────────────────────────────────────────────────────
--
-- Alleen deze vijf series leeghalen. (Let op: 0110 opnieuw draaien haalt álle
-- standaarditems weg, ook deze; draai dan 0160 en 0232 erna opnieuw.)

delete from public.mobility_series_items
where series_id in (
  select id from public.mobility_series
  where is_standard and slug in (
    'gym-opbouw-1', 'gym-opbouw-2', 'gym-opbouw-3', 'gym-onderhoud',
    'kracht-thuis-gewicht'
  )
);

insert into public.mobility_series_items
  (series_id, exercise_id, sort_order, sets, reps, hold_seconds, rest_seconds)
select s.id, e.id, v.sort_order, v.sets, v.reps, v.hold_seconds, v.rest_seconds
from (values
  ('gym-opbouw-1', 'barbell-half-squat',   0, 3, 10, null::int, 120),
  ('gym-opbouw-1', 'single-leg-press',     1, 3, 10, null, 120),
  ('gym-opbouw-1', 'standing-hip-flexion', 2, 3, 10, null, 120),
  ('gym-opbouw-1', 'loaded-calf-raise',    3, 3, 10, null, 120),

  ('gym-opbouw-2', 'barbell-half-squat',   0, 3, 8, null, 120),
  ('gym-opbouw-2', 'single-leg-press',     1, 3, 8, null, 120),
  ('gym-opbouw-2', 'standing-hip-flexion', 2, 3, 8, null, 120),
  ('gym-opbouw-2', 'loaded-calf-raise',    3, 3, 8, null, 120),

  ('gym-opbouw-3', 'barbell-half-squat',   0, 3, 6, null, 120),
  ('gym-opbouw-3', 'single-leg-press',     1, 3, 6, null, 120),
  ('gym-opbouw-3', 'standing-hip-flexion', 2, 3, 6, null, 120),
  ('gym-opbouw-3', 'loaded-calf-raise',    3, 3, 6, null, 120),

  ('gym-onderhoud', 'barbell-half-squat',   0, 2, 5, null, 120),
  ('gym-onderhoud', 'single-leg-press',     1, 2, 5, null, 120),
  ('gym-onderhoud', 'standing-hip-flexion', 2, 2, 5, null, 120),
  ('gym-onderhoud', 'loaded-calf-raise',    3, 2, 5, null, 120),

  ('kracht-thuis-gewicht', 'goblet-squat',          0, 3, 12, null, 75),
  ('kracht-thuis-gewicht', 'bulgarian-split-squat', 1, 3, 10, null, 75),
  ('kracht-thuis-gewicht', 'banded-hip-flexion',    2, 3, 12, null, 45),
  ('kracht-thuis-gewicht', 'single-leg-calf-raise', 3, 3, 12, null, 45)
) as v(series_slug, exercise_slug, sort_order, sets, reps, hold_seconds, rest_seconds)
join public.mobility_series s on s.slug = v.series_slug and s.is_standard
join public.mobility_exercises e on e.slug = v.exercise_slug and e.is_standard;

notify pgrst, 'reload schema';

-- Verificatie (na het draaien): vijf series met elk vier oefeningen.
--   select s.slug, count(i.id) from public.mobility_series s
--   left join public.mobility_series_items i on i.series_id = s.id
--   where s.slug like 'gym-%' or s.slug = 'kracht-thuis-gewicht' group by s.slug;
