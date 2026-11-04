-- Pop-up "nog niet gekoppeld" vanuit /beheer/koppelingen.
--
-- Wie koppelingen beheert (integrations.manage) kan leden zonder een koppeling
-- een melding in de app sturen: wat er nog niet gekoppeld is en wat ze daardoor
-- missen. Het lid ziet hem bij het volgende bezoek; de beheerder ziet wanneer
-- hij verstuurd en gezien is.
--
-- Per melding één rij. Titel en link volgen uit `integration` (vaste tekst in
-- src/lib/integrations/notices.ts); de beheerder kan alleen de uitleg (`body`)
-- aanpassen. `resolved_at`: het lid koppelde voordat hij de melding zag, dan
-- toont de app hem niet meer.
--
-- Lezen alleen het lid zelf. Schrijven (versturen, gezien, opgelost) alleen de
-- server met de service role, na de rechtencontrole: een lid mag geen melding
-- voor een ander maken, en "gezien" zet de serveractie alleen op eigen rijen.

create table if not exists public.integration_notices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  integration text not null
    check (integration in ('strava', 'intervals', 'telegram', 'push', 'agenda', 'live')),
  body text not null check (length(btrim(body)) between 1 and 600),
  sent_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  resolved_at timestamptz
);

-- De layout vraagt op elke pagina de openstaande meldingen van het lid op.
create index if not exists integration_notices_open_idx
  on public.integration_notices (profile_id)
  where seen_at is null and resolved_at is null;

-- Het beheerscherm toont de laatste melding per lid en koppeling.
create index if not exists integration_notices_profile_created_idx
  on public.integration_notices (profile_id, integration, created_at desc);

alter table public.integration_notices enable row level security;

revoke all on public.integration_notices from anon;
revoke insert, update, delete on public.integration_notices from authenticated;
grant select on public.integration_notices to authenticated;

drop policy if exists "integration_notices_select_own" on public.integration_notices;
create policy "integration_notices_select_own" on public.integration_notices
  for select to authenticated
  using ((select auth.uid()) = profile_id);

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select tablename, rowsecurity from pg_tables where tablename = 'integration_notices';
-- select policyname, cmd from pg_policies where tablename = 'integration_notices';
