-- Wanneer was een lid voor het laatst in de app?
--
-- auth.users.last_sign_in_at is daarvoor onbruikbaar: Supabase zet die alleen bij
-- een echte inlog (wachtwoord, magic link), niet bij het verversen van een
-- sessie. Wie ingelogd blijft, en dat is vrijwel iedereen met de PWA, staat daar
-- maanden stil terwijl hij dagelijks langskomt. Gemeten op 2026-09-23: het
-- eigenaarsaccount stond op 36 dagen, terwijl de eigenaar de app dagelijks gebruikt.
--
-- De middleware roept bij elk verzoek auth.getUser() aan en ververst een verlopen
-- access token (standaard na een uur). Elke verversing raakt auth.sessions en
-- schrijft een nieuwe rij in auth.refresh_tokens. Het laatste van die momenten is
-- dus "laatst gezien", tot op ongeveer een uur nauwkeurig. last_sign_in_at blijft
-- meetellen voor wie na een uitlog opnieuw inlogt.
--
-- Alleen voor de service role: dit is gebruiksgedrag per lid, en het Strava-
-- inactiviteitsbeleid en /beheer/strava zijn de enige lezers.

create or replace function public.member_last_seen()
returns table (profile_id uuid, last_seen_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id as profile_id,
    greatest(u.last_sign_in_at, s.last_session_at, r.last_refresh_at) as last_seen_at
  from auth.users u
  left join lateral (
    select max(ses.updated_at) as last_session_at
    from auth.sessions ses
    where ses.user_id = u.id
  ) s on true
  left join lateral (
    select max(rt.updated_at) as last_refresh_at
    from auth.refresh_tokens rt
    where rt.user_id = u.id::text
  ) r on true;
$$;

revoke all on function public.member_last_seen() from public, anon, authenticated;
grant execute on function public.member_last_seen() to service_role;

notify pgrst, 'reload schema';
