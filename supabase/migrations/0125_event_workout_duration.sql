-- Duur van een workout tot 12 uur toestaan.
--
-- training_workouts.duration_minutes stond sinds 0037 op maximaal 480 minuten.
-- Dat was ruim voor een training, maar niet voor een toegezegd clubevent: de
-- Marmotte (176 km, 5067 hm) duurt ruim negen uur en werd zo op acht uur
-- afgekapt — precies het soort verschil dat het schema onbruikbaar maakt.
--
-- 720 minuten is de nieuwe grens. De AI-dagaanpassing houdt zijn eigen,
-- strengere grens van 480 minuten aan (MAX_ADJUST_MINUTES in draft.ts): een
-- training van twaalf uur bestaat niet, een gran fondo wel.

alter table public.training_workouts
  drop constraint if exists training_workouts_duration_minutes_check;

alter table public.training_workouts
  add constraint training_workouts_duration_minutes_check
  check (duration_minutes > 0 and duration_minutes <= 720);
