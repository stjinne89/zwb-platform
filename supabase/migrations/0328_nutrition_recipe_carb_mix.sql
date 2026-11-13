-- Voeding: welke soort koolhydraten een recept voor onderweg heeft.
--
-- De opnamegrens per uur hangt af van wat je meeneemt: alleen glucose
-- (maltodextrine) ~60 g, 2:1 glucose:fructose ~90, 1:0,8 of 1:1 tot ~120, gewoon
-- eten ~60 (src/lib/nutrition/event-fuel.ts). Open Food Facts en NEVO geven
-- geen fructose, dus het lid kiest de soort bij een eigen recept; de
-- clubrecepten vult deze migratie (stap 3 van docs/eventvoeding-plan.md,
-- besluit 5). Leeg betekent: weet ik niet, en dat telt als 60 (besluit 6).
--
-- Lezen en schrijven volgen de bestaande policies op nutrition_recipes.

alter table public.nutrition_recipes
  add column if not exists carb_mix text;

alter table public.nutrition_recipes
  drop constraint if exists nutrition_recipes_carb_mix_check,
  add constraint nutrition_recipes_carb_mix_check
    check (carb_mix is null or carb_mix in ('glucose', '2:1', '1:0.8', 'eten'));

comment on column public.nutrition_recipes.carb_mix is
  'Soort koolhydraten van een recept voor onderweg: glucose, 2:1, 1:0.8 (ook 1:1) of eten. Leeg: onbekend.';

-- De clubrecepten voor onderweg. De zelfgemaakte sportdrank is suiker (sucrose,
-- glucose en fructose 1:1). De sportdrank van appelsap heeft meer fructose dan
-- glucose; ZWB rekent die voorzichtig als 2:1. De rest is gewoon eten.
update public.nutrition_recipes set carb_mix = '1:0.8'
  where is_standard and slug = 'sportdrank-zelfgemaakt' and carb_mix is null;

update public.nutrition_recipes set carb_mix = '2:1'
  where is_standard and slug = 'appelsap-sportdrank' and carb_mix is null;

update public.nutrition_recipes set carb_mix = 'eten'
  where is_standard and carb_mix is null and slug in (
    'rijsttaartjes',
    'dadelrepen',
    'krentenbol-jam-onderweg',
    'banaan-ontbijtkoek',
    'wit-broodje-jam',
    'sandwich-pindakaas-jam',
    'haverkoekjes-banaan',
    'zoute-aardappeltjes',
    'dadels-winegums',
    'mueslireep-banaan'
  );

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select carb_mix, count(*) from public.nutrition_recipes
--   where is_standard and meal_moment = 'tijdens_rit' group by 1;
--   -- verwacht: eten 10, 1:0.8 1, 2:1 1, geen lege
