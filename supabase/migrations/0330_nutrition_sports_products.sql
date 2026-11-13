-- Voeding: een sportvoedingslijst van ZWB in nutrition_products.
--
-- Open Food Facts (0233) wordt door gebruikers gevuld: bij sportvoeding
-- ontbreken vaak koolhydraten of natrium, en de verhouding glucose:fructose
-- staat er nooit in, terwijl de grens per uur daar juist van afhangt
-- (event-fuel.ts, 0328). Deze lijst neemt de waarden over van het etiket of de
-- productpagina van de fabrikant; Open Food Facts alleen voor de barcode.
--
-- * carb_mix: de soort zoals de fabrikant die noemt, of afgeleid uit een
--   ingrediëntenlijst die geen twijfel laat (alleen maltodextrine en dextrose:
--   glucose). Anders leeg, en dan rekent de app met 60 g per uur. Een reep
--   telt als gewoon eten.
-- * scoop_g: gram per schep bij poeder, als de fabrikant die noemt.
-- * sodium_mg: natrium per 100 g of ml.
-- * source: 'off' voor wat de server uit Open Food Facts ophaalt, 'zwb' voor
--   deze lijst. Een rij van ZWB heeft altijd koolhydraten en eiwit, zodat het
--   opzoeken hem nooit met Open Food Facts overschrijft (_log-actions.ts).
-- * Gels staan in gram: een product in ml telt in de app als drank en wordt
--   dan een bidon (products.ts, productAsFood).
--
-- Gedeeld, zonder iets over wie wat scande; schrijven blijft alleen voor de
-- server. Waarden nagekeken op checked_on; bij een nieuw etiket de rij bijwerken.

alter table public.nutrition_products
  add column if not exists carb_mix text,
  add column if not exists scoop_g numeric,
  add column if not exists sodium_mg numeric,
  add column if not exists source text not null default 'off',
  add column if not exists source_url text,
  add column if not exists checked_on date;

alter table public.nutrition_products
  drop constraint if exists nutrition_products_carb_mix_check,
  add constraint nutrition_products_carb_mix_check
    check (carb_mix is null or carb_mix in ('glucose', '2:1', '1:0.8', 'eten')),
  drop constraint if exists nutrition_products_scoop_check,
  add constraint nutrition_products_scoop_check
    check (scoop_g is null or (scoop_g > 0 and scoop_g <= 200)),
  drop constraint if exists nutrition_products_sodium_check,
  add constraint nutrition_products_sodium_check
    check (sodium_mg is null or (sodium_mg >= 0 and sodium_mg <= 40000)),
  drop constraint if exists nutrition_products_source_check,
  add constraint nutrition_products_source_check
    check (source in ('off', 'zwb')),
  drop constraint if exists nutrition_products_zwb_complete_check,
  add constraint nutrition_products_zwb_complete_check
    check (source <> 'zwb' or (carbs_g is not null and protein_g is not null and source_url is not null and checked_on is not null));

create index if not exists nutrition_products_source_idx
  on public.nutrition_products (source) where source = 'zwb';

insert into public.nutrition_products
  (barcode, name, brand, quantity_unit, carbs_g, protein_g, serving_g, carb_mix, scoop_g, sodium_mg, source, source_url, checked_on)
values
  ('6009803683742', 'Endure Sports Drink Orange', '32Gi', 'g', 88, 0, 50, null, 25, 465, 'zwb', 'https://32gi.com/products/endure', date '2026-11-13'),
  ('6009614342845', 'Race Energy Bar Chocolate Macadamia', '32Gi', 'g', 78.3, 2.9, 25, 'eten', null, 49, 'zwb', 'https://32gi.com/products/race-energy-bar', date '2026-11-13'),
  ('6009614342180', 'Race Sports Drink Orange', '32Gi', 'g', 90, 0, 75, null, 25, 310, 'zwb', 'https://32gi.com/products/race-drink', date '2026-11-13'),
  ('6009614342135', 'Sports Chews Orange', '32Gi', 'g', 66, 0, 50, null, null, 260, 'zwb', 'https://32gi.com/products/sports-chews', date '2026-11-13'),
  ('6009803683131', 'Sports Gel Vanilla', '32Gi', 'g', 77, 1.2, 27, 'glucose', null, 217, 'zwb', 'https://32gi.com/products/sports-gels', date '2026-11-13'),
  ('8714411000420', 'Energy Fruit Chew Orange', 'Amacx', 'g', 80, 0, 38, '2:1', null, 259, 'zwb', 'https://amacx.com/products/energy-fruit-chew-orange', date '2026-11-13'),
  ('8714411001120', 'Energy Nougat Cranberry', 'Amacx', 'g', 87, 3.2, 37, 'eten', null, 130, 'zwb', 'https://amacx.com/products/energy-nougat-cranberry', date '2026-11-13'),
  ('8714411000512', 'Turbo Gel Citrus', 'Amacx', 'g', 66.7, 0, 60, '1:0.8', null, 326, 'zwb', 'https://amacx.com/products/turbo-gel-citrus-single-1', date '2026-11-13'),
  ('8007640909351', 'C2:1PRO Carbo Chews Orange', 'Enervit', 'g', 87, 0, 34, '2:1', null, 0, 'zwb', 'https://www.enervit.com/en/products/the-carbo-chews-c-2-1-pro.html', date '2026-11-13'),
  ('8007640896347', 'C2:1PRO Carbo Gel Lemon Sodium', 'Enervit', 'g', 67, 0, 60, '2:1', null, 333, 'zwb', 'https://www.enervit.com/en/products/carbo-gel-c-2-1-pro-sodium.html', date '2026-11-13'),
  ('8007640909252', 'C2:1PRO Isocarb Lemon', 'Enervit', 'g', 92, 0, 65, '2:1', 32.5, 354, 'zwb', 'https://www.enervit.com/en/products/isocarb-c-2-1-pro.html', date '2026-11-13'),
  ('8007640887734', 'Competition Bar Orange', 'Enervit', 'g', 77, 3.8, 30, 'eten', null, 39, 'zwb', 'https://www.enervit.com/en/products/competition-bar-orange.html', date '2026-11-13'),
  ('8007640909054', 'Isotonic Drink Orange', 'Enervit', 'g', 82, 0, 30, null, 15, 800, 'zwb', 'https://www.enervit.com/en/products/isotonic-drink-tub-orange.html', date '2026-11-13'),
  ('5414963009546', 'Energy Bar Chocolade', 'Etixx', 'g', 68, 6.4, 40, 'eten', null, 79, 'zwb', 'https://www.etixxsports.com/nl-nl/products/energy-sport-bar', date '2026-11-13'),
  ('5407005694671', 'Energy Bar Fruit Chew Tropische vruchten', 'Etixx', 'g', 80, 0, 38, null, null, 259, 'zwb', 'https://www.etixxsports.com/nl-nl/products/energy-bar-fruit-chew', date '2026-11-13'),
  ('5407005694763', 'Energy Gel Framboos', 'Etixx', 'g', 75, 0, 40, null, null, 0, 'zwb', 'https://www.etixxsports.com/nl-nl/products/energy-gel', date '2026-11-13'),
  ('5414963021197', 'Isotonic Drink Citroen', 'Etixx', 'g', 87, 0, 35, null, 17.5, 786, 'zwb', 'https://www.etixxsports.com/nl-nl/products/isotonic-drink', date '2026-11-13'),
  ('5407005695708', 'PRO LINE Energy Gel Cola', 'Etixx', 'g', 83, 0, 60, '1:0.8', null, 326, 'zwb', 'https://www.etixxsports.com/nl-nl/products/pro-line-energy-gel', date '2026-11-13'),
  ('5407005694695', 'PRO LINE High Carb Drink Citroen', 'Etixx', 'g', 95, 0, 74, '1:0.8', 18.5, 550, 'zwb', 'https://www.etixxsports.com/nl-nl/products/pro-line-high-carb-drink', date '2026-11-13'),
  ('5027492006209', 'Energy Bar Banana', 'High5', 'g', 66, 4.3, 55, 'eten', null, 75, 'zwb', 'https://highfive.co.uk/products/energybar', date '2026-11-13'),
  ('5027492002423', 'Energy Drink Citrus', 'High5', 'g', 93, 0, 47, '2:1', null, 511, 'zwb', 'https://highfive.co.uk/products/energydrink', date '2026-11-13'),
  ('5027492003147', 'Energy Gel Aqua Orange', 'High5', 'g', 36, 0, 66, 'glucose', null, 39, 'zwb', 'https://highfive.co.uk/products/energy-gel-aqua', date '2026-11-13'),
  ('50572984', 'Energy Gel Orange', 'High5', 'g', 57, 0, 40, 'glucose', null, 47, 'zwb', 'https://highfive.co.uk/products/energy-gel-6-pack', date '2026-11-13'),
  ('5027492015010', 'Energy Gummies Mixed Berry', 'High5', 'g', 80, 0, 26, null, null, 314, 'zwb', 'https://highfive.co.uk/products/energy-gummies', date '2026-11-13'),
  ('7612100026953', 'Actifood Apple', 'Isostar', 'g', 51, 0, 90, null, null, 20, 'zwb', 'https://www.isostar.nl/actifood-apple.html', date '2026-11-13'),
  ('7612100008225', 'Energy Sport Bar Cereals & Banana', 'Isostar', 'g', 73, 5, 40, 'eten', null, 236, 'zwb', 'https://www.isostar.nl/energy-sport-bar-cereals-banana.html', date '2026-11-13'),
  ('7612100034552', 'Hydrate & Perform Lemon', 'Isostar', 'g', 88, 0, 40, null, null, 1100, 'zwb', 'https://www.isostar.nl/hydrate-perform-lemon.html', date '2026-11-13'),
  ('3175681308855', 'Long Energy +3H Gel Orange', 'Isostar', 'g', 45, 0.5, 40, '2:1', null, 149, 'zwb', 'https://www.isostar.nl/long-energy-3h-gel-orange-flavour.html', date '2026-11-13'),
  ('3175681308848', 'Long Energy +3H Sports Drink Lemon', 'Isostar', 'g', 81, 1.8, 38, '2:1', null, 1493, 'zwb', 'https://www.isostar.nl/long-energy-3h-sports-drink-lemon.html', date '2026-11-13'),
  ('3175681308886', 'Long Energy 3H+ Bar Banana Chocolate', 'Isostar', 'g', 58, 12, 32, 'eten', null, 177, 'zwb', 'https://www.isostar.nl/long-energy-3h-bar-banana-chocolate.html', date '2026-11-13'),
  ('7350008410084', 'Drink Mix 160', 'Maurten', 'g', 93, 0, 42, '2:1', null, 511, 'zwb', 'https://www.maurten.com/products/drink-mix-160', date '2026-11-13'),
  ('7350008410091', 'Drink Mix 320', 'Maurten', 'g', 94, 0, 83, null, null, 295, 'zwb', 'https://www.maurten.com/products/drink-mix-320', date '2026-11-13'),
  ('73160717', 'Gel 100', 'Maurten', 'g', 62.5, 0, 40, '1:0.8', null, 49, 'zwb', 'https://www.maurten.com/products/gel-100-box', date '2026-11-13'),
  ('73187363', 'Gel 160', 'Maurten', 'g', 62.5, 0, 65, '1:0.8', null, 49, 'zwb', 'https://www.maurten.com/products/gel-160-box', date '2026-11-13'),
  ('73193739', 'Solid 160', 'Maurten', 'g', 72.7, 4, 55, 'eten', null, 432, 'zwb', 'https://www.maurten.com/products/solid-160', date '2026-11-13'),
  ('3830081922741', 'Nrgy Chew Bar 22.5 Cola', 'Nduranz', 'g', 75, 0.1, 30, null, null, 51, 'zwb', 'https://nduranz.com/products/nrgy-chew-bar-22-5', date '2026-11-13'),
  ('3830081922512', 'Nrgy Drink 45 Lemon', 'Nduranz', 'g', 93.8, 0, 48, '1:0.8', 24, 958, 'zwb', 'https://nduranz.com/products/nrgy-drink-45', date '2026-11-13'),
  ('3830081922567', 'Nrgy Drink 90 Orange', 'Nduranz', 'g', 93.8, 0, 96, '1:0.8', 24, 479, 'zwb', 'https://nduranz.com/products/nrgy-drink-90', date '2026-11-13'),
  ('3830081923014', 'Nrgy Gel 22.5 Lemon', 'Nduranz', 'g', 34, 0, 66, '1:0.8', null, 0, 'zwb', 'https://nduranz.com/products/nrgy-gel-22-5', date '2026-11-13'),
  ('3830081921690', 'Nrgy Gel 45 Lemon', 'Nduranz', 'g', 60, 0, 75, '1:0.8', null, 613, 'zwb', 'https://nduranz.com/products/nrgy-gel-45', date '2026-11-13'),
  ('3830081925155', 'Nrgy Juice Bar 45 Cola', 'Nduranz', 'g', 80, 0, 56, 'eten', null, 20, 'zwb', 'https://nduranz.com/products/nrgy-juice-bar-45', date '2026-11-13'),
  ('4029679679399', 'Energize Original Berry', 'PowerBar', 'g', 71, 11, 55, 'eten', null, 350, 'zwb', 'https://www.powerbar.com/de-at/products/energize-original', date '2026-11-13'),
  ('4029679671973', 'Isoactive Red Fruit Punch', 'PowerBar', 'g', 89, 0, 33, '2:1', null, 1123, 'zwb', 'https://www.powerbar.com/de-at/products/iso-active', date '2026-11-13'),
  ('4029679672673', 'PowerGel Hydro Orange', 'PowerBar', 'g', 37, 0, 67, '2:1', null, 318, 'zwb', 'https://www.powerbar.com/de-at/products/powergel-hydro', date '2026-11-13'),
  ('4029679672482', 'PowerGel Original Lemon Lime', 'PowerBar', 'g', 63, 0, 41, '2:1', null, 503, 'zwb', 'https://www.powerbar.com/de-at/products/powergel-original', date '2026-11-13'),
  ('4029679675193', 'PowerGel Shots Raspberry', 'PowerBar', 'g', 81, 6.7, 60, '2:1', null, 59, 'zwb', 'https://www.powerbar.com/de-at/products/powergel-shots', date '2026-11-13'),
  ('5060905440658', 'Carb & Electrolyte Drink Mix', 'Precision Fuel & Hydration', 'g', 88, 0, 34, '2:1', 17, 1471, 'zwb', 'https://www.precisionhydration.com/eu/en/products/carb-electrolyte-drink-mix/', date '2026-11-13'),
  ('5060905440092', 'PF 30 Chew', 'Precision Fuel & Hydration', 'g', 88, 0, 34, null, null, 0, 'zwb', 'https://www.precisionhydration.com/eu/en/products/pf-30-chew/', date '2026-11-13'),
  ('5060905440009', 'PF 30 Gel', 'Precision Fuel & Hydration', 'g', 59, 0, 51, '2:1', null, null, 'zwb', 'https://www.precisionhydration.com/eu/en/products/pf-30-gel/', date '2026-11-13'),
  ('5060905440078', 'PF 90 Gel', 'Precision Fuel & Hydration', 'g', 59, 0, 153, '2:1', null, null, 'zwb', 'https://www.precisionhydration.com/eu/en/products/pf-90-gel/', date '2026-11-13'),
  ('5025324009626', 'Beta Fuel 80 Drink Mix Orange', 'SiS', 'g', 98, 0, 82, '1:0.8', null, 0, 'zwb', 'https://www.scienceinsport.com/eu/beta-fuel-80-powder-orange-15-pack', date '2026-11-13'),
  ('5025324009756', 'Beta Fuel Energy Chews Orange', 'SiS', 'g', 77, 0, 60, '1:0.8', null, 71, 'zwb', 'https://www.scienceinsport.com/eu/shop-sis/go-range/go-energy-bars/beta-fuel-energy-chews-sis', date '2026-11-13'),
  ('5025324010394', 'Beta Fuel Energy Gel Orange', 'SiS', 'g', 66, 0, 60, '1:0.8', null, 20, 'zwb', 'https://www.scienceinsport.com/eu/shop-sis/go-range/beta-fuel/beta-fuel-gels-sis', date '2026-11-13'),
  ('5025324003167', 'GO Energy Drink Powder', 'SiS', 'g', 94, 0, 50, null, 16.7, 0, 'zwb', 'https://www.scienceinsport.com/eu/shop-sis/energy-hydration/go-energy-powders/go-energy-powder-1-6kg', date '2026-11-13'),
  ('5025324008247', 'GO Energy Mini Bar Banana Fudge', 'SiS', 'g', 64, 11, 40, 'eten', null, 118, 'zwb', 'https://www.scienceinsport.com/eu/shop-sis/energy-hydration/go-energy-bars/go-energy-mini-30-bar', date '2026-11-13'),
  ('5025324010288', 'GO Isotonic Energy Gel Lemon & Lime', 'SiS', 'g', 36, 0, 60, 'glucose', null, 4, 'zwb', 'https://www.scienceinsport.com/eu/shop-sis/go-range/go-gels/go-isotonic-energy-gels-sis', date '2026-11-13'),
  ('5060123414349', 'Energy Gel Cherry Bakewell', 'Torq', 'g', 63, 0, 45, '2:1', null, 109, 'zwb', 'https://www.torqfitness.co.uk/product/cherry-bakewell', date '2026-11-13')
on conflict (barcode) do update set
  name = excluded.name,
  brand = excluded.brand,
  quantity_unit = excluded.quantity_unit,
  carbs_g = excluded.carbs_g,
  protein_g = excluded.protein_g,
  serving_g = excluded.serving_g,
  carb_mix = excluded.carb_mix,
  scoop_g = excluded.scoop_g,
  sodium_mg = excluded.sodium_mg,
  source = excluded.source,
  source_url = excluded.source_url,
  checked_on = excluded.checked_on,
  fetched_at = now();

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select brand, count(*) from public.nutrition_products where source = 'zwb' group by 1 order by 1;
-- select count(*) from public.nutrition_products where source = 'zwb' and (carbs_g is null or protein_g is null);  -- 0
