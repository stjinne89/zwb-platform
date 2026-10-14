-- Voeding, naleving stap 2: verpakte producten via de barcode.
--
-- NEVO kent geen merken, en juist sportvoeding (gels, repen, drank) staat er
-- nauwelijks in. Een gescande barcode wordt opgevraagd bij Open Food Facts
-- (ODbL, bronvermelding op /hulp) en hier bewaard, zodat hetzelfde product maar
-- één keer wordt opgehaald. Alleen wat de naleving nodig heeft: naam, merk,
-- koolhydraten en eiwit per 100 g of ml, en de portiegrootte.
--
-- De tabel is gedeeld tussen leden en bevat niets over wie wat scande. Schrijven
-- doet alleen de server (service role); er is bewust geen insert-policy.

create table if not exists public.nutrition_products (
  barcode text primary key check (barcode ~ '^[0-9]{8,14}$'),
  name text not null check (length(name) between 1 and 160),
  brand text check (brand is null or length(brand) <= 120),
  quantity_unit text not null default 'g' check (quantity_unit in ('g', 'ml')),
  -- Per 100 g of ml, zoals Open Food Facts ze geeft. Null = onbekend.
  carbs_g numeric check (carbs_g is null or (carbs_g >= 0 and carbs_g <= 100)),
  protein_g numeric check (protein_g is null or (protein_g >= 0 and protein_g <= 100)),
  -- Eén stuk of portie, als de verpakking dat vermeldt.
  serving_g numeric check (serving_g is null or (serving_g > 0 and serving_g <= 2000)),
  fetched_at timestamptz not null default now()
);

alter table public.nutrition_products enable row level security;

drop policy if exists "nutrition_products_read" on public.nutrition_products;
create policy "nutrition_products_read" on public.nutrition_products
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_approved
    )
  );

-- Een regel in het eetdagboek is een NEVO-product óf een barcodeproduct.
alter table public.nutrition_log_items
  alter column food_id drop not null,
  add column if not exists product_barcode text references public.nutrition_products(barcode) on delete restrict;

alter table public.nutrition_log_items
  drop constraint if exists nutrition_log_items_one_source_check,
  add constraint nutrition_log_items_one_source_check
    check ((food_id is null) <> (product_barcode is null));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select count(*) from public.nutrition_log_items where food_id is null and product_barcode is null;  -- 0
