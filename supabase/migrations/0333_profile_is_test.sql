-- Testaccounts verbergen (2026-11-16).
--
-- De eigenaar wil een tweede account om de app als gewoon lid te bekijken,
-- zonder dat het tussen de echte leden staat.
--
-- - is_test: zet je met de hand (SQL); er is bewust geen knop in beheer.
-- - Leesregel op profiles: een testprofiel ziet alleen het account zelf.
--   Dat dekt elke lezing met het gewone client, ook de profielen die bij
--   andere tabellen worden meegehaald (die komen dan leeg terug).
-- - Het admin-client omzeilt RLS; die plekken filteren in de app zelf.
-- - bokaal_standings is security definer en slaat testprofielen nu over.

alter table public.profiles
  add column if not exists is_test boolean not null default false;

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (not is_test or id = (select auth.uid()));

create or replace function public.bokaal_standings(p_season text)
returns table(profile_id uuid, display_name text, balance numeric, open_stake bigint, hits bigint, bets bigint)
language sql
stable security definer
set search_path to 'public'
as $function$
  select pl.profile_id, p.display_name,
    public.bokaal_balance(pl.profile_id, p_season),
    coalesce((select sum(stake) from public.bokaal_bets b where b.profile_id = pl.profile_id and b.season = p_season and b.outcome = 'open'), 0),
    (select count(*) from public.bokaal_bets b where b.profile_id = pl.profile_id and b.season = p_season and b.outcome = 'raak'),
    (select count(*) from public.bokaal_bets b where b.profile_id = pl.profile_id and b.season = p_season)
  from public.bokaal_players pl
  join public.profiles p on p.id = pl.profile_id and p.is_approved and not p.is_test
  where pl.season = p_season and public.bokaal_member()
$function$;

-- Controle na het draaien:
--   select count(*) filter (where is_test) as test, count(*) from public.profiles;
--   select qual from pg_policies
--    where tablename = 'profiles' and policyname = 'profiles_select_authenticated';
