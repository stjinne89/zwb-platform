-- Programma's op de kalender (wens van de eigenaar, 2026-10-09).
--
-- Een programma verbindt events van verschillende categorieën en types die bij
-- elkaar horen: "Road to WK GF" is het WK zelf, de kwalificatie-GF's, de
-- trainingskampen, social rides en trainingsritten. Dezelfde opzet verbindt de
-- races van een ZRL-, FRR-, SRC- of Ladderseizoen.
--
-- Anders dan parent_event_id (0178): dat is één raceweek of tour als één
-- kalenderregel. Een programma laat elk event op zijn eigen dag staan en hangt
-- er alleen een label aan. Een event kan in meerdere programma's zitten.
--
-- Leden lezen alles. Programma's beheert wie alle events mag beheren; een event
-- aan een programma hangen mag ook de aanmaker van dat event.

create table if not exists public.event_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  description text,
  -- Gearchiveerd: niet meer te kiezen bij een event of in het filter; de
  -- pagina en de koppelingen blijven bestaan.
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_program_links (
  program_id uuid not null references public.event_programs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (program_id, event_id)
);

create index if not exists event_program_links_event_idx
  on public.event_program_links (event_id);

alter table public.event_programs enable row level security;
alter table public.event_program_links enable row level security;

drop policy if exists "event_programs_read" on public.event_programs;
create policy "event_programs_read" on public.event_programs
  for select to authenticated using (true);

drop policy if exists "event_programs_insert" on public.event_programs;
create policy "event_programs_insert" on public.event_programs
  for insert to authenticated
  with check (public.current_user_has_permission('events.manage_all'));

drop policy if exists "event_programs_update" on public.event_programs;
create policy "event_programs_update" on public.event_programs
  for update to authenticated
  using (public.current_user_has_permission('events.manage_all'));

drop policy if exists "event_programs_delete" on public.event_programs;
create policy "event_programs_delete" on public.event_programs
  for delete to authenticated
  using (public.current_user_has_permission('events.manage_all'));

drop policy if exists "event_program_links_read" on public.event_program_links;
create policy "event_program_links_read" on public.event_program_links
  for select to authenticated using (true);

drop policy if exists "event_program_links_insert" on public.event_program_links;
create policy "event_program_links_insert" on public.event_program_links
  for insert to authenticated
  with check (
    public.current_user_has_permission('events.manage_all')
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.created_by = (select auth.uid())
    )
  );

drop policy if exists "event_program_links_delete" on public.event_program_links;
create policy "event_program_links_delete" on public.event_program_links
  for delete to authenticated
  using (
    public.current_user_has_permission('events.manage_all')
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.created_by = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
