-- Module Uitdaging: deelnemen aan een goededoelenrit (2026-11-17).
--
-- Wens eigenaar: een installatie voor een Rabobank-club die Alpe d'HuZes
-- fietst. De rit zelf is een gewoon event met kind = 'goed_doel'. Per lid en
-- per event één regel: hoe vaak omhoog als doel, hoe vaak gehaald, het
-- sponsordoel, wat er al is opgehaald en de link naar de eigen actiepagina.
--
-- - Bedragen in hele euro's. Het lid vult ze zelf in; er is geen koppeling met
--   een actieplatform.
-- - Lezen: goedgekeurde leden. Schrijven: alleen de eigen regel, en alleen
--   bij een goededoelenevent. Wie zich aanmeldt, staat ook op "ja" bij het
--   event (event_rsvps), via de app.
-- - De module staat standaard uit (club_modules). Een club zet hem aan op
--   /beheer/inrichting/modules en geeft hem daar een eigen naam.
-- - Geen ZWB-data, geen persoonsgegevens in deze migratie (installatie.md §7).

create table if not exists public.challenge_entries (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  target_climbs smallint not null,
  climbs_done smallint,
  fundraising_target_eur integer,
  raised_eur integer,
  fundraising_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, profile_id),
  constraint challenge_entries_target_climbs_range check (target_climbs between 1 and 10),
  constraint challenge_entries_climbs_done_range check (climbs_done is null or climbs_done between 0 and 10),
  constraint challenge_entries_target_eur_range check (
    fundraising_target_eur is null or fundraising_target_eur between 0 and 1000000
  ),
  constraint challenge_entries_raised_eur_range check (
    raised_eur is null or raised_eur between 0 and 1000000
  ),
  constraint challenge_entries_url_https check (
    fundraising_url is null or (fundraising_url ~ '^https://' and length(fundraising_url) <= 500)
  )
);

create index if not exists challenge_entries_profile_idx
  on public.challenge_entries (profile_id);

alter table public.challenge_entries enable row level security;

revoke all on public.challenge_entries from anon, authenticated;
grant select, insert, update, delete on public.challenge_entries to authenticated;
grant all on public.challenge_entries to service_role;

drop policy if exists "challenge_entries_select_approved" on public.challenge_entries;
create policy "challenge_entries_select_approved" on public.challenge_entries
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_approved
    )
  );

drop policy if exists "challenge_entries_insert_own" on public.challenge_entries;
create policy "challenge_entries_insert_own" on public.challenge_entries
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_approved
    )
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.kind = 'goed_doel'
    )
  );

drop policy if exists "challenge_entries_update_own" on public.challenge_entries;
create policy "challenge_entries_update_own" on public.challenge_entries
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.kind = 'goed_doel'
    )
  );

drop policy if exists "challenge_entries_delete_own" on public.challenge_entries;
create policy "challenge_entries_delete_own" on public.challenge_entries
  for delete to authenticated
  using (profile_id = (select auth.uid()));

-- Standaard uit, ook bij ZWB. Een bestaande rij blijft staan.
insert into public.club_modules (module_key, enabled, label) values
  ('uitdaging', false, null)
on conflict (module_key) do nothing;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select module_key, enabled, label from public.club_modules where module_key = 'uitdaging';
-- select policyname, cmd from pg_policies where tablename = 'challenge_entries';
