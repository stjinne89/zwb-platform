-- Voeding: sportvoeding met barcode in het receptenboek.
--
-- Een gel, reep of sportdrank staat zelden in NEVO. Sinds 0233 kan het
-- eetdagboek een barcodeproduct (nutrition_products) bevatten; nu kan een eigen
-- recept dat ook. Zo kiest het ritplan ook de eigen gels en bidons, en telt
-- "Gegeten" ze mee.
--
-- Een ingrediënt is een NEVO-product óf een barcodeproduct, net als een regel in
-- het eetdagboek. Lezen en schrijven volgen de bestaande policies op
-- nutrition_recipe_ingredients; nutrition_products blijft alleen door de server
-- te vullen.

alter table public.nutrition_recipe_ingredients
  alter column food_id drop not null,
  add column if not exists product_barcode text references public.nutrition_products(barcode) on delete restrict;

alter table public.nutrition_recipe_ingredients
  drop constraint if exists nutrition_recipe_ingredients_one_source_check,
  add constraint nutrition_recipe_ingredients_one_source_check
    check ((food_id is null) <> (product_barcode is null));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select count(*) from public.nutrition_recipe_ingredients where food_id is null and product_barcode is null;  -- 0
-- select count(*) from public.nutrition_recipe_ingredients where product_barcode is not null;                -- 0 tot een lid scant
