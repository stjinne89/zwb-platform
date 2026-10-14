-- Kerntemperatuur van een CORE-sensor bij de hitteprotocollen.
--
-- De sensor zet zijn meting in het FIT-bestand van de fietscomputer en
-- intervals.icu maakt daar een stream van. Rijdt een lid met een lopend
-- hitteprotocol, dan haalt de app (src/lib/protocols/core-fill.ts) die stream
-- op en bewaart per rit alleen de samenvatting: de hoogste kerntemperatuur en
-- hoeveel minuten die op of boven 38,5 °C lag. De meting zelf niet.
--
-- * Een rij zonder max_core_c betekent: rit bekeken, geen CORE-data. Dan vraagt
--   de app die rit niet opnieuw op.
-- * auto_checked: de app heeft de hittesessie op die dag voor het lid
--   afgevinkt. Haalt het lid het vinkje weg, dan zet de app het niet terug.
-- * Lezen: dezelfde kring als member_protocol_checks (het lid en de eigen
--   trainer). Schrijven alleen met de service-role; er is geen schrijfbeleid.
-- * Alleen runs met consent_version '2026-10-14-core' doen mee: die tekst noemt
--   de CORE-sensor. Een run onder de eerste tekst blijft zoals hij was.

alter table public.member_protocols
  drop constraint if exists member_protocols_consent_version_check;
alter table public.member_protocols
  add constraint member_protocols_consent_version_check
  check (consent_version in ('2026-10-14', '2026-10-14-core'));

create table if not exists public.member_protocol_core_sessions (
  protocol_id uuid not null references public.member_protocols(id) on delete cascade,
  intervals_id text not null check (char_length(intervals_id) between 1 and 64),
  day date not null,
  max_core_c numeric(4, 2) check (max_core_c is null or max_core_c between 34 and 43),
  minutes_above int check (minutes_above is null or minutes_above between 0 and 1440),
  auto_checked boolean not null default false,
  checked_at timestamptz not null default now(),
  primary key (protocol_id, intervals_id),
  check ((max_core_c is null) = (minutes_above is null))
);

alter table public.member_protocol_core_sessions enable row level security;

drop policy if exists "member_protocol_core_sessions_select" on public.member_protocol_core_sessions;
create policy "member_protocol_core_sessions_select" on public.member_protocol_core_sessions
  for select to authenticated
  using (
    exists (
      select 1 from public.member_protocols p
      where p.id = protocol_id and public.current_user_in_training_chat(p.profile_id)
    )
  );

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select rowsecurity from pg_tables where tablename = 'member_protocol_core_sessions';  -- true
-- select pg_get_constraintdef(oid) from pg_constraint
--   where conname = 'member_protocols_consent_version_check';  -- beide versies
