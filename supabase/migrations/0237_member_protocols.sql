-- Protocollen: een hitteblok, bicarbonaat voor een wedstrijd, darmtraining.
--
-- Een protocol is geen kennisartikel maar iets wat je uitvoert: je start het,
-- krijgt per dag taken en vinkt die af. De inhoud (fases, taken, doses, bronnen)
-- staat in code, in src/lib/protocols/, om dezelfde reden als de kennisbanken:
-- elke dosis en bewering gaat via een commit. Hier staat alleen wie welk
-- protocol volgt en wat er is afgevinkt.
--
-- * Alleen met toestemming: consent_version is de tekst waarvoor het lid bij
--   het starten tekende (PROTOCOL_CONSENT_VERSION in src/lib/protocols/consent.ts).
--   Zelfde aanpak als het eetdagboek (0231), geen nieuwe privacyversie.
-- * Het lid leest en schrijft zelf. De aangewezen trainer leest mee, dezelfde
--   kring als de coachchat (0167): wel de eigen trainer, niet het bestuur. Wie
--   een supplement neemt is persoonlijk.
-- * Geen doses in de database. De app rekent ze bij het tonen uit het gewicht
--   van het lid; een rij zegt alleen welk protocol en wanneer.

create table if not exists public.member_protocols (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  protocol_slug text not null check (protocol_slug ~ '^[a-z0-9-]{2,60}$'),
  -- Eerste dag van het protocol. Bij een protocol naar een wedstrijd rekent de
  -- app hem terug uit race_date.
  start_date date not null,
  -- De wedstrijddag bij een protocol met anker 'wedstrijd'; anders leeg.
  race_date date,
  status text not null default 'actief' check (status in ('actief', 'gestopt', 'afgerond')),
  consent_version text not null check (consent_version in ('2026-10-14')),
  created_at timestamptz not null default now(),
  stopped_at timestamptz,
  check (race_date is null or race_date >= start_date)
);

-- Eén lopend exemplaar per protocol per lid.
create unique index if not exists member_protocols_one_active_idx
  on public.member_protocols (profile_id, protocol_slug)
  where status = 'actief';

create index if not exists member_protocols_profile_idx
  on public.member_protocols (profile_id, start_date);

create table if not exists public.member_protocol_checks (
  protocol_id uuid not null references public.member_protocols(id) on delete cascade,
  day date not null,
  task_key text not null check (task_key ~ '^[a-z0-9-]{1,60}$'),
  done_at timestamptz not null default now(),
  primary key (protocol_id, day, task_key)
);

alter table public.member_protocols enable row level security;
alter table public.member_protocol_checks enable row level security;

drop policy if exists "member_protocols_select" on public.member_protocols;
create policy "member_protocols_select" on public.member_protocols
  for select to authenticated
  using (public.current_user_in_training_chat(profile_id));

drop policy if exists "member_protocols_own_write" on public.member_protocols;
create policy "member_protocols_own_write" on public.member_protocols
  for insert to authenticated
  with check (profile_id = (select auth.uid()));

drop policy if exists "member_protocols_own_update" on public.member_protocols;
create policy "member_protocols_own_update" on public.member_protocols
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "member_protocols_own_delete" on public.member_protocols;
create policy "member_protocols_own_delete" on public.member_protocols
  for delete to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "member_protocol_checks_select" on public.member_protocol_checks;
create policy "member_protocol_checks_select" on public.member_protocol_checks
  for select to authenticated
  using (
    exists (
      select 1 from public.member_protocols p
      where p.id = protocol_id and public.current_user_in_training_chat(p.profile_id)
    )
  );

-- Afvinken alleen in een lopend protocol van jezelf.
drop policy if exists "member_protocol_checks_own_insert" on public.member_protocol_checks;
create policy "member_protocol_checks_own_insert" on public.member_protocol_checks
  for insert to authenticated
  with check (
    exists (
      select 1 from public.member_protocols p
      where p.id = protocol_id and p.profile_id = (select auth.uid()) and p.status = 'actief'
    )
  );

drop policy if exists "member_protocol_checks_own_delete" on public.member_protocol_checks;
create policy "member_protocol_checks_own_delete" on public.member_protocol_checks
  for delete to authenticated
  using (
    exists (
      select 1 from public.member_protocols p
      where p.id = protocol_id and p.profile_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select tablename, rowsecurity from pg_tables where tablename like 'member_protocol%';  -- twee keer true
