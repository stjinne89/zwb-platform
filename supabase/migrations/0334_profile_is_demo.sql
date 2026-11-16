-- Demo-account: alleen kijken (2026-11-16).
--
-- Voor leden die inloggen en koppelen te moeilijk vinden, maar willen zien wat
-- de app inhoudt. Het account ziet de echte clubdata, zoals elk lid, maar kan
-- niets veranderen. Een demo-account krijgt ook is_test (0333), zodat het niet
-- tussen de leden staat.
--
-- Drie lagen:
-- 1. PostgREST: db_pre_request zet elke transactie van een demo-account op
--    alleen-lezen. Dat vangt schrijven naar tabellen én schrijvende RPC's
--    (ook security definer), zonder ze een voor een af te gaan. Lezende RPC's
--    blijven werken, ook via POST.
-- 2. Storage: een beperkende regel op storage.objects (eigen API, geen PostgREST).
-- 3. De app: de middleware weigert elke schrijfactie (server actions, API-routes)
--    van een demo-account; die gaan met de service-rol buiten RLS om.
--
-- Niet afgedekt: wachtwoord of e-mail wijzigen rechtstreeks via de Auth-API.

alter table public.profiles
  add column if not exists is_demo boolean not null default false;

create or replace function public.current_user_is_demo()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select is_demo from public.profiles where id = (select auth.uid())), false)
$$;

revoke all on function public.current_user_is_demo() from public;
grant execute on function public.current_user_is_demo() to anon, authenticated;

-- Mag nooit falen: een fout hier breekt elk verzoek aan de database. De vraag
-- staat daarom in een eigen blok met exception. set_config staat erbuiten:
-- binnen zo'n blok draait Postgres transaction_read_only bij het verlaten terug
-- (op 2026-11-16 op productie nagegaan). Bewust geen `set search_path` en geen
-- security definer: een SET-regel opent een eigen GUC-niveau bij het aanroepen,
-- en de instelling moet de functie overleven. Alles is daarom schema-gekwalificeerd.
create or replace function public.demo_read_only()
returns void
language plpgsql
volatile
as $$
declare
  demo boolean := false;
begin
  begin
    demo := (select auth.uid()) is not null and public.current_user_is_demo();
  exception when others then
    demo := false;
  end;
  if demo then
    perform set_config('transaction_read_only', 'on', true);
  end if;
end;
$$;

revoke all on function public.demo_read_only() from public;
grant execute on function public.demo_read_only() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request = 'public.demo_read_only';
notify pgrst, 'reload config';

drop policy if exists demo_no_insert on storage.objects;
create policy demo_no_insert on storage.objects as restrictive
  for insert to authenticated
  with check (not public.current_user_is_demo());

drop policy if exists demo_no_update on storage.objects;
create policy demo_no_update on storage.objects as restrictive
  for update to authenticated
  using (not public.current_user_is_demo());

drop policy if exists demo_no_delete on storage.objects;
create policy demo_no_delete on storage.objects as restrictive
  for delete to authenticated
  using (not public.current_user_is_demo());

-- Controle na het draaien:
--   select rolconfig from pg_roles where rolname = 'authenticator';
--   select policyname from pg_policies where schemaname = 'storage' and policyname like 'demo_%';
-- Als demo-account in de app: een schrijfactie geeft een fout
-- ("read-only transaction"), lezen werkt gewoon.
