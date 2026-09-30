-- MyWhoosh Sunday Race Club op de kalender (wens van de eigenaar, 2026-09-30).
--
-- Zelfde opbouw als de ZRL-raceweek (0178): per zondag één hoofdevent, met
-- daaronder een event voor de herenrace en een voor de damesrace. Een lid zegt
-- ja op zijn eigen race; het hoofdevent is alleen de kalenderregel.
--
-- De agenda komt uit de openbare feed van event.mywhoosh.com. Die loopt maar
-- een week vooruit, dus de cron vult de zondagen één voor één aan en verwijdert
-- nooit iets.
--
-- Schrijven gebeurt alleen met de service-role: door de sync-code na de
-- permissiecheck in de server-action, of door de cron. Leden lezen alles.

alter table public.events
  drop constraint if exists events_type_check;

alter table public.events
  add constraint events_type_check
  check (
    type in (
      'outdoor',
      'gran_fondo',
      'toertocht',
      'gravel_race',
      'zrl',
      'ladder',
      'flamme_rouge',
      'social',
      'training',
      'zwift',
      'mywhoosh',
      'omnium',
      'src',
      'overig'
    )
  );

-- De zondag van een SRC-hoofdevent. Eén hoofdevent per zondag.
alter table public.events
  add column if not exists src_sunday date;

create unique index if not exists events_src_sunday_idx
  on public.events (src_sunday)
  where src_sunday is not null and parent_event_id is null;

-- Per race (heren of dames op een zondag) wat MyWhoosh erover publiceert.
create table if not exists public.src_races (
  event_id uuid primary key references public.events(id) on delete cascade,
  -- Id in de agenda-feed van event.mywhoosh.com (Mongo-id).
  mywhoosh_event_id text not null unique,
  sunday date not null,
  gender text not null check (gender in ('men', 'women')),
  -- Kwalificatie 1..4; null bij de finale.
  round int check (round is null or round between 1 and 5),
  is_final boolean not null default false,
  -- Categorie → starttijd (UTC), bijvoorbeeld {"1": "2026-10-04T09:57:30Z"}.
  category_starts jsonb not null default '{}'::jsonb,
  registration_closes_at timestamptz,
  -- Categorieën met een weigh-in vóór de start, en dat venster.
  pre_weight_categories int[] not null default array[]::int[],
  pre_weight_opens_at timestamptz,
  pre_weight_closes_at timestamptz,
  course_url text,
  participants int,
  -- Id van dezelfde race in de uitslagen-API (UUID); vult de uitslagensync.
  result_event_id text,
  synced_at timestamptz not null default now(),
  unique (sunday, gender)
);

-- Eén rij: wanneer de agenda voor het laatst is opgehaald, en wie als maker van
-- de events geldt (een event heeft altijd een maker; bij de cron is dat de
-- beheerder die de eerste keer op "Nu verversen" drukte).
create table if not exists public.src_sync_state (
  id boolean primary key default true check (id),
  created_by uuid references public.profiles(id) on delete set null,
  synced_at timestamptz,
  sync_error text,
  races_in_feed int
);

alter table public.src_races enable row level security;
alter table public.src_sync_state enable row level security;

drop policy if exists "src_races_read" on public.src_races;
create policy "src_races_read" on public.src_races
  for select to authenticated using (true);

drop policy if exists "src_sync_state_read" on public.src_sync_state;
create policy "src_sync_state_read" on public.src_sync_state
  for select to authenticated using (true);

notify pgrst, 'reload schema';
