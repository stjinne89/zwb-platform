-- De meegeleverde core- en mobiliteitsbibliotheek. Zelfde patroon als de andere
-- gecureerde datasets in deze map (0107_workout_library_seed.sql,
-- 0040_cols_database.sql).
--
-- De inhoud volgt uit wat de literatuur wél ondersteunt:
--   * Rompuithoudingsvermogen en houdingscontrole verbeteren betrouwbaar; kracht
--     en snelheid niet. Daarom holds en gecontroleerde herhalingen, geen zwaar
--     krachtwerk, en nergens een belofte over wattage.
--   * Renners mét lage rugpijn zitten meer geflecteerd in de lage rug en hun
--     pijn loopt op over twee uur rijden. Daarom een serie die expliciet op het
--     volhouden van de zithouding zit.
--   * Beperkte hamstring- en rompmobiliteit voorspelt het ontstáán van lage
--     rugpijn. Daarom hamstring- en heupwerk in de na-de-rit-serie.
--   * Lang statisch rekken vóór inspanning kost vermogen. De pre_ride-serie is
--     daarom volledig dynamisch; de trigger uit 0109 bewaakt dat.
--
-- illustration_slug verwijst naar het figuurregister in
-- src/components/mobility/figures. Ontbreekt een figuur, dan toont de UI alleen
-- de tekst — een seed loopt daar dus nooit op stuk.

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
  ('plank', 'Plank', 'core', 'lumbaal',
   'Steun op onderarmen en tenen. Trek je navel licht in en knijp je bilspieren aan, zodat je onderrug niet doorzakt. Schouders recht boven de ellebogen, blik naar de mat. Blijf rustig doorademen.',
   'plank', 30, null, false, 1),

  ('side-plank', 'Zijplank', 'core', 'lumbaal',
   'Op je zij, steun op één onderarm, elleboog recht onder de schouder. Duw je heup omhoog tot je van enkel tot schouder een rechte lijn maakt. Laat je bovenlichaam niet naar voren draaien.',
   'side-plank', 20, null, true, 2),

  ('bird-dog', 'Bird dog', 'core', 'lumbaal',
   'Op handen en knieën. Strek tegelijk je rechterarm en linkerbeen tot ze in het verlengde van je romp staan. Houd je bekken vlak — een bekertje water op je onderrug mag niet omvallen. Rustig terug en wissel.',
   'bird-dog', null, 8, true, 1),

  ('dead-bug', 'Dead bug', 'core', 'lumbaal',
   'Op je rug, armen recht omhoog, knieën in een hoek van 90 graden. Laat je rechterarm en linkerbeen langzaam zakken tot net boven de mat, terwijl je onderrug tegen de mat gedrukt blijft. Terug en wissel.',
   'dead-bug', null, 10, false, 1),

  ('hollow-hold', 'Hollow hold', 'core', 'lumbaal',
   'Op je rug, onderrug stevig tegen de mat. Til schouderbladen en gestrekte benen net van de mat en houd vast. Komt je onderrug los, breng dan je knieën iets dichter naar je toe.',
   'hollow-hold', 20, null, false, 3),

  ('glute-bridge', 'Bruggetje', 'core', 'heup',
   'Op je rug, voeten plat op de mat, hielen ongeveer een handbreedte van je billen. Duw via je hielen je heupen omhoog tot knie, heup en schouder één lijn vormen. Knijp bovenin je bilspieren aan en zak gecontroleerd terug.',
   'glute-bridge', null, 12, false, 1),

  ('cat-camel', 'Kat-koe', 'mobiliteit', 'thoracaal',
   'Op handen en knieën. Rol je rug langzaam bol vanaf je stuit, kin naar de borst. Rol daarna wervel voor wervel de andere kant op tot een holle rug. Beweeg traag; dit is mobiliteit, geen rekoefening.',
   'cat-camel', null, 10, false, 1),

  ('thoracic-rotation', 'Thoracale rotatie', 'mobiliteit', 'thoracaal',
   'Op handen en knieën, één hand achter je hoofd. Draai je elleboog naar de mat, dan zo ver mogelijk naar het plafond, en volg met je blik. Houd je bekken stil — de beweging komt uit je borstwervelkolom.',
   'thoracic-rotation', null, 8, true, 1),

  ('thoracic-extension', 'Thoracale extensie', 'mobiliteit', 'thoracaal',
   'Zit op je hielen met je onderarmen op een bank of stoel. Laat je borst tussen je armen door zakken tot je rek voelt tussen je schouderbladen. Adem uit en zak bij elke uitademing iets verder.',
   'thoracic-extension', 30, null, false, 1),

  ('child-pose', 'Kindhouding', 'mobiliteit', 'thoracaal',
   'Zit op je hielen, knieën uit elkaar, strek je armen ver naar voren en laat je borst naar de mat zakken. Ontspan je nek. Rustig doorademen naar je onderrug.',
   'child-pose', 60, null, false, 1),

  ('shoulder-opener', 'Schouderopener', 'mobiliteit', 'schouder',
   'Sta rechtop met een handdoek of stok in beide handen, handen ruim uit elkaar. Breng gestrekte armen langzaam over je hoofd naar achteren en terug. Kom je vast te zitten, pak dan breder vast.',
   'shoulder-opener', null, 10, false, 1),

  ('hip-flexor-stretch', 'Heupbuigerrek', 'mobiliteit', 'heup',
   'Half geknield, achterste knie op de mat, voorste voet plat. Kantel je bekken achterover door je bilspier aan te spannen en schuif dan pas je heup naar voren. Je voelt de rek aan de voorkant van je achterste heup.',
   'hip-flexor-stretch', 45, null, true, 1),

  ('hamstring-stretch', 'Hamstringrek', 'mobiliteit', 'heup',
   'Zet één hiel op een verhoging met gestrekt been. Houd je rug recht en kantel vanuit je heupen naar voren tot je rek achter je bovenbeen voelt. Rond je rug niet — dan verplaats je de rek naar je onderrug.',
   'hamstring-stretch', 45, null, true, 1),

  ('figure-four', 'Bilspierrek', 'mobiliteit', 'heup',
   'Op je rug, leg je rechterenkel over je linkerknie. Pak je linkerbovenbeen vast en trek het naar je toe tot je rek in je rechterbil voelt. Houd je schouders op de mat.',
   'figure-four', 45, null, true, 1),

  ('ankle-rock', 'Enkelmobiliteit', 'mobiliteit', 'enkel',
   'Half geknield, voorste voet plat en ongeveer een handbreedte van een muur. Duw je knie recht over je tenen richting de muur zonder je hiel op te tillen. Terug en herhaal.',
   'ankle-rock', null, 10, true, 1),

  ('leg-swing', 'Beenzwaaien', 'activatie', 'heup',
   'Sta met steun aan een muur. Zwaai één been ontspannen naar voren en naar achteren, zonder je romp mee te laten draaien. Bouw de uitslag geleidelijk op; forceer niets.',
   'leg-swing', null, 12, true, 1),

  ('hip-circle', 'Heupcirkels', 'activatie', 'heup',
   'Sta op één been met steun. Til de andere knie tot heuphoogte en maak grote, rustige cirkels met je knie — naar buiten en daarna naar binnen. Houd je romp stil.',
   'hip-circle', null, 8, true, 1),

  ('hip-hinge', 'Hip hinge', 'activatie', 'heup',
   'Sta met je voeten heupbreed en een stok langs je rug die je achterhoofd, rug en stuit raakt. Duw je heupen naar achteren en buig voorover; de stok houdt op alle drie de punten contact. Dit is de beweging die je op de fiets naar het stuur brengt.',
   'hip-hinge', null, 10, false, 2)
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
  ('fundament', 'Fundament',
   'Rompuithoudingsvermogen: de basis, twee tot drie keer per week.',
   'stabiliteit', 'rustdag', 10, 1),
  ('voor-de-rit', 'Voor de rit',
   'Dynamisch klaarmaken zonder vermogen in te leveren.',
   'mobiliteit', 'pre_ride', 6, 1),
  ('na-de-rit', 'Na de rit',
   'Heup en rug lang maken na uren in dezelfde houding.',
   'mobiliteit', 'post_ride', 8, 1),
  ('zithouding', 'Zithouding',
   'Voorovergebogen zitten volhouden zonder in je onderrug te zakken.',
   'houding', 'rustdag', 12, 2)
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
-- Eerst leeghalen en dan opnieuw vullen: dat is idempotent én het gaat goed als
-- een serie in een latere versie kórter wordt. Raakt alleen de standaardset, dus
-- zelfgemaakte series van leden blijven ongemoeid.

delete from public.mobility_series_items
where series_id in (select id from public.mobility_series where is_standard);

insert into public.mobility_series_items
  (series_id, exercise_id, sort_order, sets, reps, hold_seconds, rest_seconds)
select s.id, e.id, v.sort_order, v.sets, v.reps, v.hold_seconds, v.rest_seconds
from (values
  -- Fundament — holds en controle, oplopend van makkelijk naar zwaarder.
  ('fundament', 'glute-bridge',    0, 2, 12,   null, 20),
  ('fundament', 'dead-bug',        1, 2, 10,   null, 20),
  ('fundament', 'bird-dog',        2, 2, 8,    null, 20),
  ('fundament', 'plank',           3, 2, null, 30,   30),
  ('fundament', 'side-plank',      4, 2, null, 20,   30),

  -- Voor de rit — uitsluitend dynamisch, geen enkele hold.
  ('voor-de-rit', 'cat-camel',         0, 1, 10, null, 10),
  ('voor-de-rit', 'thoracic-rotation', 1, 1, 8,  null, 10),
  ('voor-de-rit', 'leg-swing',         2, 1, 12, null, 10),
  ('voor-de-rit', 'hip-circle',        3, 1, 8,  null, 10),
  ('voor-de-rit', 'glute-bridge',      4, 1, 12, null, 10),

  -- Na de rit — hier mogen de holds wél lang.
  ('na-de-rit', 'hip-flexor-stretch',  0, 1, null, 45, 10),
  ('na-de-rit', 'hamstring-stretch',   1, 1, null, 45, 10),
  ('na-de-rit', 'figure-four',         2, 1, null, 45, 10),
  ('na-de-rit', 'thoracic-extension',  3, 1, null, 30, 10),
  ('na-de-rit', 'child-pose',          4, 1, null, 60, 0),

  -- Zithouding — thoracale mobiliteit, heupscharnier en hamstringlengte.
  ('zithouding', 'cat-camel',          0, 1, 10,   null, 10),
  ('zithouding', 'thoracic-rotation',  1, 2, 8,    null, 15),
  ('zithouding', 'thoracic-extension', 2, 2, null, 30,   15),
  ('zithouding', 'shoulder-opener',    3, 1, 10,   null, 15),
  ('zithouding', 'hip-hinge',          4, 2, 10,   null, 20),
  ('zithouding', 'hamstring-stretch',  5, 1, null, 45,   10),
  ('zithouding', 'ankle-rock',         6, 1, 10,   null, 10),
  ('zithouding', 'bird-dog',           7, 2, 8,    null, 20)
) as v(series_slug, exercise_slug, sort_order, sets, reps, hold_seconds, rest_seconds)
join public.mobility_series s on s.slug = v.series_slug and s.is_standard
join public.mobility_exercises e on e.slug = v.exercise_slug and e.is_standard;

notify pgrst, 'reload schema';
