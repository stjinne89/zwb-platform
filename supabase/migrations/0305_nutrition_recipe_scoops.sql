-- Voeding: hoeveel gram één schep is, per ingrediënt van een recept.
--
-- Sportdrankpoeder meet je af met de schep uit de verpakking. Het lid vult bij
-- een eigen recept in hoeveel gram een schep is; het receptenboek en
-- Klaarzetten tonen de grammen dan ook in schepjes. Per recept en niet per
-- product: nutrition_products blijft alleen door de server te vullen (0276),
-- en wat een lid invult hoort bij zijn eigen recept.
--
-- Lezen en schrijven volgen de bestaande policies op
-- nutrition_recipe_ingredients. Leeg betekent: geen schep.

alter table public.nutrition_recipe_ingredients
  add column if not exists scoop_g numeric;

alter table public.nutrition_recipe_ingredients
  drop constraint if exists nutrition_recipe_ingredients_scoop_g_check,
  add constraint nutrition_recipe_ingredients_scoop_g_check
    check (scoop_g is null or (scoop_g > 0 and scoop_g <= 200));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select count(*) from public.nutrition_recipe_ingredients where scoop_g is not null;  -- 0 tot een lid een schep invult
