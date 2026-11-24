-- Club Ladder-sessie die ZWB zelf ververst (2026-11-24).
--
-- De pagina's van ladder.cycleracing.club met aanmeldingen, captains, kerkhof en
-- teamhistorie zitten achter een login. Tot nu toe plakte de eigenaar de
-- `connect.sid` uit Chrome in LADDER_COOKIE op Netlify, en hield een geplande
-- Chrome-taak die sessie warm. Nu logt de server zelf in met LADDER_EMAIL en
-- LADDER_PASSWORD (env) zodra de ladder naar /signin doorstuurt, en bewaart de
-- nieuwe cookie hier. Een env-waarde zou bij elke nieuwe cookie een deploy vragen.
--
-- Eén rij. Alleen de server (service role) leest en schrijft: de cookie is een
-- ingelogde sessie, dus geen select voor anon of authenticated en geen policies.

create table if not exists public.club_ladder_session (
  id boolean primary key default true check (id),
  cookie text,
  renewed_at timestamptz,
  login_error text,
  login_error_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.club_ladder_session enable row level security;

revoke all on public.club_ladder_session from anon, authenticated;
grant all on public.club_ladder_session to service_role;

notify pgrst, 'reload schema';
