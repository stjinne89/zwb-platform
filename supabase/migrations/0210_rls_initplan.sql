-- RLS: auth.uid(), auth.role() en auth.jwt() één keer per query in plaats van per rij.
--
-- De Supabase performance-advisor meldde op 2026-09-30 144 policies met
-- "auth_rls_initplan": een kale auth.uid() in een policy wordt voor elke rij
-- opnieuw uitgevoerd. Als (select auth.uid()) maakt Postgres er een initplan
-- van dat één keer per query draait. Zelfde uitkomst, minder werk; het verschil
-- groeit met de tabel. Zie docs/prestatie-onderzoek-2026-09-30.md.
--
-- Mechanisch in plaats van 144 policies met de hand overtikken: dit blok leest de
-- policies zoals Postgres ze bewaart, zet de kale aanroepen tussen haakjes en
-- schrijft ze terug. Wat al omhuld is, blijft ongemoeid. Het hele blok is één
-- transactie: faalt één ALTER POLICY, dan verandert er niets.
--
-- Bewust niet gedaan: de 36 meldingen "multiple_permissive_policies". Die
-- samenvoegen verandert per tabel wie wat mag; dat is per geval een ontwerpkeuze
-- en geen mechanische herschrijving.

-- Postgres schrijft een omhulde aanroep terug als "( SELECT auth.uid() AS uid)".
-- Die wordt eerst afgeschermd, zodat alleen de kale aanroepen worden omhuld.
create or replace function public.rls_wrap_auth_calls(p text)
returns text language plpgsql immutable as $$
declare t text;
begin
  if p is null then return null; end if;
  t := regexp_replace(p, '\(\s*SELECT\s+auth\.(uid|role|jwt)\(\)(\s+AS\s+\w+)?\s*\)', '@@\1@@', 'gi');
  if t !~ 'auth\.(uid|role|jwt)\(\)' then return p; end if;
  t := regexp_replace(t, 'auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g');
  return regexp_replace(t, '@@(uid|role|jwt)@@', '(select auth.\1())', 'g');
end $$;

do $$
declare
  pol record;
  new_qual text;
  new_check text;
  stmt text;
  changed integer := 0;
begin
  for pol in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual ~ 'auth\.(uid|role|jwt)\(\)' or with_check ~ 'auth\.(uid|role|jwt)\(\)')
  loop
    new_qual := public.rls_wrap_auth_calls(pol.qual);
    new_check := public.rls_wrap_auth_calls(pol.with_check);
    if new_qual is not distinct from pol.qual and new_check is not distinct from pol.with_check then
      continue;
    end if;
    stmt := format('alter policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    if pol.qual is not null then stmt := stmt || format(' using (%s)', new_qual); end if;
    if pol.with_check is not null then stmt := stmt || format(' with check (%s)', new_check); end if;
    execute stmt;
    changed := changed + 1;
  end loop;
  raise notice 'rls_initplan: % policies herschreven', changed;
end $$;

drop function public.rls_wrap_auth_calls(text);
