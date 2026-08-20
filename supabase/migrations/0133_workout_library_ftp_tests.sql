-- De twee FTP-tests uit src/lib/training/ftp-test.ts ook in de workout-
-- bibliotheek, zodat de trainer ze net als elke andere sessie in een schema kan
-- zetten of een bestaande workout ermee kan vervangen.
--
-- `test_type` is daarbij het verschil tussen "een zware rit" en "een meting":
-- alleen een workout mét test_type vraagt het lid achteraf om zijn resultaat,
-- werkt de FTP van het profiel bij en laat het schema daarop herzien. Zonder
-- deze kolom zou een test uit de bibliotheek precies dat missen.
--
-- De bibliotheek had al een 'Ramp-test' (45 min) en een 'FTP-test 20 min'
-- (60 min) uit 0107. Die zijn hier vervangen door dezelfde protocollen als in de
-- code, met dezelfde titels, zodat er geen twee bijna-gelijke tests naast elkaar
-- staan en een test uit de bibliotheek precies is wat de app zelf inplant.
-- 'Test 2x8 min' blijft staan: dat is een andere test, geen FTP-meting.

alter table public.training_workout_templates
  add column if not exists test_type text;

alter table public.training_workout_templates
  drop constraint if exists training_workout_templates_test_type_check;
alter table public.training_workout_templates
  add constraint training_workout_templates_test_type_check
    check (test_type is null or test_type in ('ramp', 'twenty_min'));

-- De oude varianten weg vóór de insert: de unieke index loopt op (form, title),
-- dus onder een nieuwe titel zouden ze anders blijven staan. Alleen de
-- meegeleverde rijen; eigen kopieën van een trainer blijven van hem.
delete from public.training_workout_templates
where is_standard
  and form = 'test'
  and title in ('Ramp-test', 'FTP-test 20 min');

insert into public.training_workout_templates
  (form, title, description, duration_minutes, intensity, target_type, structure_json, test_type, is_standard)
select
  v.form, v.title, v.description, v.duration_minutes, v.intensity, v.target_type, v.structure_json, v.test_type, true
from (values
  (
    'test',
    'FTP-test (ramp)',
    'Oplopende test tot je niet meer kunt volgen. Je FTP is 75% van je hoogste minuutvermogen.',
    40,
    'threshold',
    'power',
    '[{"label":"Inrijden","durationMinutes":10,"target":"50-60%","notes":"Rustig op gang, laatste minuten een paar korte versnellingen.","intensity":"recovery"},{"label":"Oplopende trap","durationMinutes":20,"target":"60-130%","notes":"Elke minuut ongeveer 20 watt erbij. Rijden tot je de cadans niet meer houdt.","intensity":"vo2max"},{"label":"Uitrijden","durationMinutes":10,"target":"45-55%","notes":"Losdraaien.","intensity":"recovery"}]'::jsonb,
    'ramp'
  ),
  (
    'test',
    'FTP-test (20 min)',
    'De standaardtest; je FTP is 95% van je gemiddelde over de twintig minuten.',
    65,
    'threshold',
    'power',
    '[{"label":"Inrijden","durationMinutes":15,"target":"55-65%","notes":"Rustig op gang komen.","intensity":"endurance"},{"label":"Opener","durationMinutes":5,"target":"105-115%","notes":"Kort scherp, om het systeem open te zetten.","intensity":"vo2max"},{"label":"Herstel","durationMinutes":10,"target":"45-55%","notes":"Volledig herstellen voor de test.","intensity":"recovery"},{"label":"Test","durationMinutes":20,"target":"95-105%","notes":"Zo hard als je twintig minuten kunt volhouden. Begin niet te snel.","intensity":"threshold"},{"label":"Uitrijden","durationMinutes":15,"target":"45-55%","notes":"Losdraaien.","intensity":"recovery"}]'::jsonb,
    'twenty_min'
  )
) as v(form, title, description, duration_minutes, intensity, target_type, structure_json, test_type)
on conflict (form, title) where is_standard do update
set
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  intensity = excluded.intensity,
  target_type = excluded.target_type,
  structure_json = excluded.structure_json,
  test_type = excluded.test_type,
  updated_at = now();

notify pgrst, 'reload schema';
