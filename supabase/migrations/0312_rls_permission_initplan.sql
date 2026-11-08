-- RLS: de rechtencheck één keer per query in plaats van per rij.
--
-- Zelfde probleem als 0210 (auth.uid()), nu voor onze eigen functies. Een kale
-- current_user_has_permission('…') in een policy draait voor elke rij opnieuw,
-- en elke aanroep kijkt zelf weer in profiles en de rollen. Gemeten op
-- productie, 2026-11-08: alle recepten met ingrediënten lezen kostte 491 ms, waarvan
-- ~385 ms in 775 aanroepen vanuit nutrition_recipe_ingredients_write. Die policy
-- is FOR ALL en telt dus ook bij lezen. De Supabase-advisor ziet dit niet: die
-- kijkt alleen naar auth.* en current_setting().
--
-- Als (select …) maakt Postgres er een initplan van dat één keer per query
-- draait. De functies zijn STABLE en de argumenten letterlijk, dus de uitkomst is
-- binnen een query toch overal gelijk. Alleen aanroepen zonder rij-argument
-- worden omhuld; current_user_can_train_profile(profile_id) en dergelijke hangen
-- aan de rij en blijven zoals ze zijn.
--
-- Mechanisch, zoals 0210: lees de policies zoals Postgres ze bewaart, omhul de
-- kale aanroepen, schrijf ze terug. Wat al omhuld is, blijft ongemoeid. Eén
-- transactie: faalt één ALTER POLICY, dan verandert er niets.

-- Eerst wordt elke aanroep omhuld, ook een die al omhuld was. Postgres schrijft
-- die laatste terug als
-- "( SELECT current_user_has_permission('x'::text) AS current_user_has_permission)";
-- na de eerste stap staat daar een dubbele omhulling, en die gaat in de tweede
-- stap terug naar één.
create or replace function public.rls_wrap_permission_calls(p text)
returns text language plpgsql immutable as $$
declare
  call constant text :=
    '(current_user_has_permission\(''[^'']*''(::text)?\)|current_user_moderates_member_tips\(\)|current_user_answers_questions\(\))';
  t text;
begin
  if p is null then return null; end if;
  t := regexp_replace(p, '(public\.)?' || call, '(select public.\2)', 'g');
  return regexp_replace(
    t,
    '\(\s*SELECT\s+\(select public\.' || call || '\)(\s+AS\s+\w+)?\s*\)',
    '(select public.\1)',
    'gi'
  );
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
      and (
        concat(qual, ' ', with_check) ~ 'current_user_has_permission\('''
        or concat(qual, ' ', with_check) ~ 'current_user_(moderates_member_tips|answers_questions)\(\)'
      )
  loop
    new_qual := public.rls_wrap_permission_calls(pol.qual);
    new_check := public.rls_wrap_permission_calls(pol.with_check);
    if new_qual is not distinct from pol.qual and new_check is not distinct from pol.with_check then
      continue;
    end if;
    stmt := format('alter policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    if pol.qual is not null then stmt := stmt || format(' using (%s)', new_qual); end if;
    if pol.with_check is not null then stmt := stmt || format(' with check (%s)', new_check); end if;
    execute stmt;
    changed := changed + 1;
  end loop;
  raise notice 'rls_permission_initplan: % policies herschreven', changed;
end $$;

drop function public.rls_wrap_permission_calls(text);
