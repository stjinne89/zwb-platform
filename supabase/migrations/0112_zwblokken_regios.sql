-- ZWBlokken: bij welke provincie en welk land hoort een blok?
--
-- De regio is een pure functie van (x, y), maar we slaan hem op zodat de
-- dekkingspercentages per provincie en per land zonder herberekening te
-- lezen zijn. Gevuld door src/lib/zwblokken/sync.ts via regionForBlock().
--
-- country is null buiten Europa (die regio's tonen we niet, maar het blok
-- telt wel gewoon mee op de kaart); province is alleen gevuld binnen Nederland.

alter table public.profile_blocks
  add column if not exists country text,
  add column if not exists province text;

create index if not exists profile_blocks_country_idx
  on public.profile_blocks (profile_id, country);
create index if not exists profile_blocks_province_idx
  on public.profile_blocks (profile_id, province);

-- Clubweergave draagt de regio mee: die hangt aan het blok, niet aan het lid,
-- dus groeperen op (z, x, y, country, province) verandert niets aan de telling.
drop view if exists public.club_blocks;
create view public.club_blocks with (security_invoker = on) as
  select z, x, y, country, province, count(distinct profile_id)::int as rider_count
  from public.profile_blocks
  group by z, x, y, country, province;
