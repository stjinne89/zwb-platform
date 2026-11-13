-- Voeding: de sportvoedingslijst (0330) als clubrecepten in het receptenboek.
--
-- Eén recept per product, voor Tijdens de rit: een gel of reep is één stuk, een
-- poeder één portie voor een bidon met de schep van de fabrikant. Titel, bron en
-- soort koolhydraten komen uit nutrition_products; het recept is alleen het
-- product, zodat het ritplan het niet schaalt (isPackagedRecipe).
--
-- Een clubrecept met alleen barcodeproducten telt in het menu, het ritplan en de
-- eventplanner pas als het lid het als favoriet heeft of zelf kiest
-- (menu.ts, isBrandRecipe). Zonder die regel zou elk lid in de wissel van de
-- rangorde merken voorgesteld krijgen die hij niet heeft.
--
-- drink_mix: een poeder voor de bidon. In gram, maar het telt in de app als
-- drank en wordt dus een bidon (products.ts, productAsFood).
--
-- Kan opnieuw draaien: titel, bron en soort volgen het product, en de regel van
-- het recept wordt vervangen. Een recept van een lid met dezelfde slug blijft
-- staan.

alter table public.nutrition_products
  add column if not exists drink_mix boolean not null default false;

update public.nutrition_products
set drink_mix = barcode in ('3175681308848', '3830081922512', '3830081922567', '4029679671973', '5025324003167', '5025324009626', '5027492002423', '5060905440658', '5407005694695', '5414963021197', '6009614342180', '6009803683742', '7350008410084', '7350008410091', '7612100034552', '8007640909054', '8007640909252')
where source = 'zwb';

-- Een gewone tijdelijke tabel, zodat het ook stap voor stap in de SQL-editor werkt.
drop table if exists pg_temp.merk_recepten;
create temporary table merk_recepten (slug text primary key, barcode text not null);

insert into merk_recepten (slug, barcode) values
  ('merk-32gi-endure-sports-drink-orange', '6009803683742'),
  ('merk-32gi-race-energy-bar-chocolate-macadamia', '6009614342845'),
  ('merk-32gi-race-sports-drink-orange', '6009614342180'),
  ('merk-32gi-sports-chews-orange', '6009614342135'),
  ('merk-32gi-sports-gel-vanilla', '6009803683131'),
  ('merk-amacx-energy-fruit-chew-orange', '8714411000420'),
  ('merk-amacx-energy-nougat-cranberry', '8714411001120'),
  ('merk-amacx-turbo-gel-citrus', '8714411000512'),
  ('merk-enervit-c2-1pro-carbo-chews-orange', '8007640909351'),
  ('merk-enervit-c2-1pro-carbo-gel-lemon-sodium', '8007640896347'),
  ('merk-enervit-c2-1pro-isocarb-lemon', '8007640909252'),
  ('merk-enervit-competition-bar-orange', '8007640887734'),
  ('merk-enervit-isotonic-drink-orange', '8007640909054'),
  ('merk-etixx-energy-bar-chocolade', '5414963009546'),
  ('merk-etixx-energy-bar-fruit-chew-tropische-vruchten', '5407005694671'),
  ('merk-etixx-energy-gel-framboos', '5407005694763'),
  ('merk-etixx-isotonic-drink-citroen', '5414963021197'),
  ('merk-etixx-pro-line-energy-gel-cola', '5407005695708'),
  ('merk-etixx-pro-line-high-carb-drink-citroen', '5407005694695'),
  ('merk-high5-energy-bar-banana', '5027492006209'),
  ('merk-high5-energy-drink-citrus', '5027492002423'),
  ('merk-high5-energy-gel-aqua-orange', '5027492003147'),
  ('merk-high5-energy-gel-orange', '50572984'),
  ('merk-high5-energy-gummies-mixed-berry', '5027492015010'),
  ('merk-isostar-actifood-apple', '7612100026953'),
  ('merk-isostar-energy-sport-bar-cereals-en-banana', '7612100008225'),
  ('merk-isostar-hydrate-en-perform-lemon', '7612100034552'),
  ('merk-isostar-long-energy-3h-gel-orange', '3175681308855'),
  ('merk-isostar-long-energy-3h-sports-drink-lemon', '3175681308848'),
  ('merk-isostar-long-energy-3h-bar-banana-chocolate', '3175681308886'),
  ('merk-maurten-drink-mix-160', '7350008410084'),
  ('merk-maurten-drink-mix-320', '7350008410091'),
  ('merk-maurten-gel-100', '73160717'),
  ('merk-maurten-gel-160', '73187363'),
  ('merk-maurten-solid-160', '73193739'),
  ('merk-nduranz-nrgy-chew-bar-22-5-cola', '3830081922741'),
  ('merk-nduranz-nrgy-drink-45-lemon', '3830081922512'),
  ('merk-nduranz-nrgy-drink-90-orange', '3830081922567'),
  ('merk-nduranz-nrgy-gel-22-5-lemon', '3830081923014'),
  ('merk-nduranz-nrgy-gel-45-lemon', '3830081921690'),
  ('merk-nduranz-nrgy-juice-bar-45-cola', '3830081925155'),
  ('merk-powerbar-energize-original-berry', '4029679679399'),
  ('merk-powerbar-isoactive-red-fruit-punch', '4029679671973'),
  ('merk-powerbar-powergel-hydro-orange', '4029679672673'),
  ('merk-powerbar-powergel-original-lemon-lime', '4029679672482'),
  ('merk-powerbar-powergel-shots-raspberry', '4029679675193'),
  ('merk-precision-fuel-en-hydration-carb-en-electrolyte-drink-mix', '5060905440658'),
  ('merk-precision-fuel-en-hydration-pf-30-chew', '5060905440092'),
  ('merk-precision-fuel-en-hydration-pf-30-gel', '5060905440009'),
  ('merk-precision-fuel-en-hydration-pf-90-gel', '5060905440078'),
  ('merk-sis-beta-fuel-80-drink-mix-orange', '5025324009626'),
  ('merk-sis-beta-fuel-energy-chews-orange', '5025324009756'),
  ('merk-sis-beta-fuel-energy-gel-orange', '5025324010394'),
  ('merk-sis-go-energy-drink-powder', '5025324003167'),
  ('merk-sis-go-energy-mini-bar-banana-fudge', '5025324008247'),
  ('merk-sis-go-isotonic-energy-gel-lemon-en-lime', '5025324010288'),
  ('merk-torq-energy-gel-cherry-bakewell', '5060123414349');

insert into public.nutrition_recipes
  (slug, title, meal_moment, fuel_profile, diet_tags, servings, prep_minutes, steps_md, is_standard, owner_id, source_name, source_url, carb_mix)
select
  m.slug,
  left(p.brand || ' ' || p.name, 120),
  'tijdens_rit',
  'hoog_kh',
  '{}'::text[],
  1,
  null,
  case when p.drink_mix then '1. Los de portie op in een bidon water.' else '' end,
  true,
  null,
  p.brand,
  p.source_url,
  p.carb_mix
from merk_recepten m
join public.nutrition_products p on p.barcode = m.barcode and p.source = 'zwb'
on conflict (slug) do update set
  title = excluded.title,
  steps_md = excluded.steps_md,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  carb_mix = excluded.carb_mix
where public.nutrition_recipes.is_standard;

delete from public.nutrition_recipe_ingredients i
using merk_recepten m, public.nutrition_recipes r
where r.slug = m.slug and r.is_standard and i.recipe_id = r.id;

insert into public.nutrition_recipe_ingredients (recipe_id, food_id, product_barcode, sort_order, grams, role, scoop_g)
select r.id, null, p.barcode, 0, p.serving_g, 'kh_bron', p.scoop_g
from merk_recepten m
join public.nutrition_recipes r on r.slug = m.slug and r.is_standard
join public.nutrition_products p on p.barcode = m.barcode and p.source = 'zwb' and p.serving_g > 0;

drop table merk_recepten;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select count(*) from public.nutrition_recipes where slug like 'merk-%' and is_standard;  -- 57
-- select count(*) from public.nutrition_products where drink_mix;  -- 17
-- select count(*) from public.nutrition_recipes r where slug like 'merk-%' and is_standard
--   and (select count(*) from public.nutrition_recipe_ingredients i where i.recipe_id = r.id) <> 1;  -- 0
