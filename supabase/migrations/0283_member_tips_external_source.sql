-- Tips met een externe bron in plaats van een lid (2026-10-27).
--
-- Besluit eigenaar: de racetips beginnen met tips uit Zwift Insider, onder die
-- naam. Een tip hing tot nu toe altijd aan een lid (0239). Een nep-account
-- "Zwift Insider" kan niet: dat doet zich voor als clublid. Daarom een vierde
-- bron, 'bron': geen lid, wel een naam en een link naar het artikel, zoals de
-- pro-tips in Mijn garage (maintenance_tips, 0122). De tekst is een
-- samenvatting in eigen woorden, geen citaat.
--
-- * Alleen de moderatie (community.manage) plaatst een bron-tip; dat dekt de
--   insert-policy van 0240 al. Leden plaatsen alleen op eigen naam.
-- * Een bron-tip heeft geen eigenaar, dus aanpassen en verwijderen kan alleen
--   de moderatie (update- en delete-policy van 0239).

alter table public.member_tips
  add column if not exists source_name text,
  add column if not exists source_url text;

alter table public.member_tips alter column profile_id drop not null;

alter table public.member_tips drop constraint if exists member_tips_source_check;
alter table public.member_tips
  add constraint member_tips_source_check check (source in ('lid', 'import', 'gesprek', 'bron'));

-- Een bron-tip heeft nooit een lid, elke andere tip altijd; een bron-tip heeft
-- een naam en een https-link.
alter table public.member_tips drop constraint if exists member_tips_source_owner_check;
alter table public.member_tips
  add constraint member_tips_source_owner_check check (
    (source = 'bron') = (profile_id is null)
    and (
      source <> 'bron'
      or (
        length(btrim(source_name)) between 2 and 60
        and source_url ~ '^https://'
      )
    )
  );

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select pg_get_constraintdef(oid) from pg_constraint
--  where conname in ('member_tips_source_check', 'member_tips_source_owner_check');
--   -- twee rijen, de eerste met 'bron'
