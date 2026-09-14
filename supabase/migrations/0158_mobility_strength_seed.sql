-- CONCEPTINHOUD — pas draaien nadat de eigenaar de oefeningen en series heeft
-- goedgekeurd. Vereist 0157.
--
-- Krachtreeksen met lichaamsgewicht of licht materiaal, voor thuis op een
-- rustdag. Wat de literatuur ondersteunt en wat niet:
--   * Zwaar krachtwerk (weinig herhalingen, hoge weerstand) kan bij getrainde
--     renners de fietsefficiëntie en sprintkracht verbeteren. Dat vraagt om
--     halters en begeleiding, en dat bieden deze series niet.
--   * Deze series zijn daarom bedoeld als algemene beenkracht, eenbenige
--     stabiliteit en belastbaarheid naast het fietsen. Nergens een belofte over
--     wattage; de hulp zegt dat ook.
--   * Eenbenig werk omdat trappen eenbenig is: links en rechts duwen om de beurt.
--   * Op een rustdag en hooguit twee keer per week, met minstens drie dagen
--     ertussen: spierpijn in de benen botst anders met de volgende sleutelsessie
--     op de fiets.
--
-- illustration_slug verwijst naar src/components/mobility/figures/kracht.ts.

-- ──────────────────────────────────────────────────────────────────────
-- Oefeningen
-- ──────────────────────────────────────────────────────────────────────

insert into public.mobility_exercises
  (slug, title, category, region, cue_md, illustration_slug,
   default_hold_seconds, default_reps, is_unilateral, level, is_standard)
select
  v.slug, v.title, v.category, v.region, v.cue_md, v.illustration_slug,
  v.default_hold_seconds, v.default_reps, v.is_unilateral, v.level, true
from (values
  ('squat', 'Squat', 'kracht', 'been',
   'Voeten iets breder dan heupbreed, tenen licht naar buiten. Duw je heupen naar achteren en zak tot je bovenbenen ongeveer horizontaal zijn, knieën in de richting van je tenen. Borst omhoog, hielen op de grond. Duw via je hele voet terug omhoog.',
   'squat', null, 12, false, 1),

  ('split-squat', 'Split squat', 'kracht', 'been',
   'Grote stap uit elkaar, achterste hiel los van de grond. Zak recht naar beneden tot je achterste knie net boven de grond hangt; je voorste knie blijft boven je voet. Duw vooral via je voorste hiel terug omhoog.',
   'split-squat', null, 8, true, 2),

  ('step-up', 'Step-up', 'kracht', 'been',
   'Zet één voet volledig op een stevige traptrede of bank op kniehoogte. Duw jezelf omhoog met dat been, zonder af te zetten met je achterste voet. Kom gecontroleerd weer naar beneden.',
   'step-up', null, 10, true, 1),

  ('single-leg-bridge', 'Eenbenig bruggetje', 'kracht', 'heup',
   'Op je rug, één voet plat op de mat, het andere been gestrekt in het verlengde van je bovenbeen. Duw via je hiel je heup omhoog tot schouder, heup en knie één lijn vormen. Houd je bekken vlak; zakt één kant weg, doe dan minder herhalingen.',
   'single-leg-bridge', null, 10, true, 2),

  ('calf-raise', 'Kuitheffen', 'kracht', 'enkel',
   'Sta met je voorvoeten op de rand van een traptrede, met steun aan een muur of leuning. Kom langzaam zo hoog mogelijk op je tenen en zak in drie tellen terug tot net onder de trede.',
   'calf-raise', null, 15, false, 1),

  ('single-leg-rdl', 'Eenbenige deadlift', 'kracht', 'heup',
   'Sta op één been met een lichte buiging in de knie. Kantel vanuit je heup naar voren terwijl je andere been gestrekt naar achteren gaat, tot je romp bijna horizontaal is. Rug recht, bekken vlak. Kom terug door je bilspier aan te spannen.',
   'single-leg-rdl', null, 8, true, 2),

  ('wall-sit', 'Muurzit', 'kracht', 'been',
   'Leun met je rug tegen een muur en schuif omlaag tot je knieën een hoek van 90 graden maken, knieën boven je enkels. Houd vast en blijf doorademen.',
   'wall-sit', 40, null, false, 1)
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
  ('kracht-basis', 'Kracht: basis',
   'Beenkracht en romp met je eigen gewicht. Op een rustdag.',
   'kracht', 'rustdag', 20, 1),
  ('kracht-klimmen', 'Kracht voor klimmen',
   'Lang doorduwen op één been, zoals op een steile helling.',
   'kracht', 'rustdag', 30, 2),
  ('kracht-eenbenig', 'Kracht: eenbenig',
   'Stabiliteit per been, want trappen doe je om de beurt.',
   'kracht', 'rustdag', 25, 2)
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
-- Alleen de krachtseries leeghalen: de items van de series uit 0110 blijven
-- ongemoeid. (Let op: 0110 opnieuw draaien haalt álle standaarditems weg, ook
-- deze; draai dan 0158 erna opnieuw.)

delete from public.mobility_series_items
where series_id in (
  select id from public.mobility_series
  where is_standard and slug in ('kracht-basis', 'kracht-klimmen', 'kracht-eenbenig')
);

insert into public.mobility_series_items
  (series_id, exercise_id, sort_order, sets, reps, hold_seconds, rest_seconds)
select s.id, e.id, v.sort_order, v.sets, v.reps, v.hold_seconds, v.rest_seconds
from (values
  -- Kracht: basis — tweebenig, van groot naar klein.
  ('kracht-basis', 'squat',        0, 3, 12,   null, 60),
  ('kracht-basis', 'step-up',      1, 2, 10,   null, 45),
  ('kracht-basis', 'glute-bridge', 2, 3, 12,   null, 45),
  ('kracht-basis', 'calf-raise',   3, 2, 15,   null, 45),
  ('kracht-basis', 'plank',        4, 2, null, 30,   45),

  -- Kracht voor klimmen — lang onder spanning, eenbenig.
  ('kracht-klimmen', 'split-squat',       0, 3, 8,    null, 60),
  ('kracht-klimmen', 'step-up',           1, 3, 10,   null, 45),
  ('kracht-klimmen', 'single-leg-bridge', 2, 3, 10,   null, 45),
  ('kracht-klimmen', 'wall-sit',          3, 2, null, 40,   60),
  ('kracht-klimmen', 'side-plank',        4, 2, null, 20,   30),

  -- Kracht: eenbenig — balans en controle per been.
  ('kracht-eenbenig', 'single-leg-rdl',    0, 3, 8,  null, 45),
  ('kracht-eenbenig', 'split-squat',       1, 2, 8,  null, 60),
  ('kracht-eenbenig', 'single-leg-bridge', 2, 2, 10, null, 45),
  ('kracht-eenbenig', 'calf-raise',        3, 3, 15, null, 45),
  ('kracht-eenbenig', 'bird-dog',          4, 2, 8,  null, 20)
) as v(series_slug, exercise_slug, sort_order, sets, reps, hold_seconds, rest_seconds)
join public.mobility_series s on s.slug = v.series_slug and s.is_standard
join public.mobility_exercises e on e.slug = v.exercise_slug and e.is_standard;

notify pgrst, 'reload schema';

-- Verificatie (na het draaien): drie series met elk vijf oefeningen.
--   select s.slug, count(i.id) from public.mobility_series s
--   left join public.mobility_series_items i on i.series_id = s.id
--   where s.goal = 'kracht' group by s.slug;
