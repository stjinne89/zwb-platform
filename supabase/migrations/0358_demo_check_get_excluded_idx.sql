-- Databasecheck 2026-11-24: demo-check goedkoper, index voor uitgesloten ritten.
--
-- 1. demo_read_only() (0334) draait als pgrst.db_pre_request vóór elk verzoek:
--    ~509.000 keer per week, ~10% van alle databasetijd. Elke aanroep opent een
--    subtransactie (het blok met exception) en zoekt profiles.is_demo op.
--    GET en HEAD voert PostgREST al in een alleen-lezen transactie uit, dus daar
--    kan een demo-account toch niet schrijven. Die verzoeken slaan we meteen over,
--    vóór het blok. Ontbreekt request.method, dan valt de functie terug op de
--    oude controle. De rest (set_config buiten het blok, geen search_path, geen
--    security definer) blijft zoals 0334 uitlegt.
--
-- 2. markExcludedRides (src/lib/training/compliance.ts) vraagt per lid de ritten
--    met training_excluded_at op: ~1.360 keer per week, gemiddeld 116 ms, omdat
--    Postgres alle ritten van het lid leest (4.523 rijen voor 20 treffers bij het
--    lid met de meeste ritten). Een partiële index maakt dat een paar rijen.

create or replace function public.demo_read_only()
returns void
language plpgsql
volatile
as $$
declare
  demo boolean := false;
begin
  if upper(coalesce(current_setting('request.method', true), '')) in ('GET', 'HEAD') then
    return;
  end if;
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

create index if not exists strava_activities_excluded_idx
  on public.strava_activities (profile_id)
  where training_excluded_at is not null;

-- Controle na het draaien:
--   explain select id from public.strava_activities
--     where profile_id = '00000000-0000-0000-0000-000000000000'
--     and training_excluded_at is not null;        -- toont strava_activities_excluded_idx
-- Als demo-account in de app: lezen werkt, een schrijfactie (POST/PATCH/DELETE)
-- geeft nog steeds "read-only transaction".
