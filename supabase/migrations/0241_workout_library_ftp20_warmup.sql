-- De 20-minutentest in de bibliotheek krijgt dezelfde warming-up als in
-- src/lib/training/ftp-test.ts: geen opener van vijf minuten op 105-115 % meer,
-- maar drie korte versnellingen. Na de klassieke warming-up met zo'n blok reden
-- renners hun test ~5 % lager (Tramontin e.a. 2021). Zie
-- docs/wetenschappelijke-toets.md, 1B.
--
-- Alleen de meegeleverde rij; eigen kopieën van een trainer blijven van hem.
-- Al ingeplande tests houden hun eigen structuur.

update public.training_workout_templates
set
  duration_minutes = 60,
  structure_json = '[{"label":"Inrijden","durationMinutes":15,"target":"55-65%","notes":"Rustig op gang komen.","intensity":"endurance"},{"label":"Versnellingen","durationMinutes":5,"target":"60-70%","notes":"Drie korte versnellingen van tien seconden op hoge cadans, met een minuut rustig ertussen.","intensity":"endurance"},{"label":"Rustig","durationMinutes":5,"target":"50-60%","notes":"Losdraaien voor de test.","intensity":"recovery"},{"label":"Test","durationMinutes":20,"target":"95-105%","notes":"Zo hard als je twintig minuten kunt volhouden. Begin niet te snel.","intensity":"threshold"},{"label":"Uitrijden","durationMinutes":15,"target":"45-55%","notes":"Losdraaien.","intensity":"recovery"}]'::jsonb,
  updated_at = now()
where is_standard
  and test_type = 'twenty_min';
