-- Gezin voor de boodschappenlijst.
--
-- Wie mee-eet met de renner: volwassenen en kinderen met een hele portie, en
-- kinderen met een halve. household_moments zegt bij welke maaltijden het gezin
-- meedoet; momenten rond de rit en voor het slapen zijn alleen van de renner.
-- Staat bij de lengte in nutrition_profiles, dus alleen voor het lid zelf
-- (policy nutrition_profiles_own uit 0168). Zie src/lib/nutrition/shopping.ts.

alter table public.nutrition_profiles
  add column if not exists household_adults smallint not null default 0
    check (household_adults between 0 and 10),
  add column if not exists household_children_full smallint not null default 0
    check (household_children_full between 0 and 10),
  add column if not exists household_children_half smallint not null default 0
    check (household_children_half between 0 and 10),
  add column if not exists household_moments text[] not null default array['diner']::text[]
    check (household_moments <@ array['ontbijt', 'lunch', 'tussendoor', 'diner']::text[]);
