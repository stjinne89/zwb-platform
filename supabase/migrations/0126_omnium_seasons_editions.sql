-- Omnium: seizoenen, edities en de vier onderdelen per editie.
--
-- Het ZWB Omnium draaide tot nu toe op een losse statische site waar één editie
-- verspreid stond over zeven HTML-bestanden, met de uitslagen in handmatig
-- gescoorde Google Sheets. Vanaf seizoen 2026/27 (zes edities, maandelijks van
-- oktober tot en met maart) leeft een editie hier als één record.
--
-- Waarom `events` wél hergebruikt wordt en `event_results` niet: een editie is
-- één kalenderitem van 90 minuten, dus die krijgt gewoon een `events`-rij en
-- daarmee RSVP, chat, reminders en push. De vier onderdelen zijn géén losse
-- kalenderitems — dat zou de ledenkalender elke maand met vier bijna identieke
-- rijen vullen — en leven daarom uitsluitend in `omnium_edition_events`.
--
-- Publiek: anders dan de rest van het platform is de Omnium bedoeld voor een
-- internationaal veld dat niet inlogt. Daarom leest `anon` mee, maar alleen wat
-- gepubliceerd is. Schrijven blijft (huisregel) service-role-only: er is bewust
-- geen insert/update/delete-policy.

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
      'overig'
    )
  );

create table if not exists public.omnium_seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                  -- '2026-27'
  name text not null,                         -- 'ZWB Omnium 2026/27'
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  -- Puntenschalen en tiebreak per seizoen. Leeg = de defaults uit
  -- src/lib/omnium/scales.ts. Zo is een regelwijziging een instelling en geen
  -- code-release, en blijft een afgesloten seizoen op zijn eigen regels staan.
  scoring jsonb not null default '{}'::jsonb,
  rules_md text,
  zwift_tag text default 'zwbomnium',
  discord_guild_id text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Er kan er maar één het lopende seizoen zijn.
create unique index if not exists omnium_seasons_current_idx
  on public.omnium_seasons (is_current) where is_current;

create table if not exists public.omnium_editions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.omnium_seasons(id) on delete cascade,
  number int not null check (number > 0),
  slug text not null,                         -- 'monumental-finale'
  title text not null,
  subtitle text,
  starts_at timestamptz not null,
  status text not null default 'concept'
    check (status in ('concept', 'published', 'live', 'results_final')),
  -- Het kalenderitem van 90 minuten, plus de losse recon-rit ervoor.
  event_id uuid references public.events(id) on delete set null,
  recon_event_id uuid references public.events(id) on delete set null,
  intro_md text,
  cover_image_path text,
  -- Livestream: de uitzending met voorbeschouwing en commentaar.
  youtube_url text,
  preshow_at timestamptz,
  published_at timestamptz,
  announced_at timestamptz,
  results_announced_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, number),
  unique (season_id, slug)
);

create index if not exists omnium_editions_start_idx
  on public.omnium_editions (starts_at desc);

create table if not exists public.omnium_edition_events (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.omnium_editions(id) on delete cascade,
  discipline text not null
    check (discipline in ('prologue', 'scratch', 'sprint', 'crit', 'recon')),
  order_index int not null,
  title text not null,
  starts_at timestamptz not null,
  duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  break_minutes int not null default 5 check (break_minutes >= 0),
  route_name text,
  route_url text,
  world text,
  distance_km numeric(6,2),
  laps int,
  drafting boolean,
  bike_rule text,
  notes_md text,
  map_image_path text,
  -- Het nummer uit .../events/view/<id>; per ronde nieuw.
  zwift_event_id text,
  zwift_subgroup_ids text[] not null default '{}',
  -- Zwift levert 'A'/'B'/'C'/'D' of een pen-naam, niet de vELO-league. Deze
  -- mapping vertaalt de subgroep naar de league van het klassement. Zonder
  -- mapping blijft een deelnemer ongeplaatst — zichtbaar mis in plaats van
  -- stilzwijgend fout ingedeeld.
  subgroup_leagues jsonb not null default '{}'::jsonb,
  -- Aantal FAL-tussensprints; alleen zinvol bij de Crit Royale.
  sprint_count int not null default 0 check (sprint_count >= 0),
  -- Stuurt de tussenstand tijdens de uitzending: wat is er al binnen?
  results_state text not null default 'pending'
    check (results_state in ('pending', 'partial', 'final')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, discipline),
  unique (edition_id, order_index)
);

create unique index if not exists omnium_edition_events_zwift_idx
  on public.omnium_edition_events (zwift_event_id)
  where zwift_event_id is not null;

alter table public.omnium_seasons enable row level security;
alter table public.omnium_editions enable row level security;
alter table public.omnium_edition_events enable row level security;

drop policy if exists "omnium_seasons_public_read" on public.omnium_seasons;
create policy "omnium_seasons_public_read" on public.omnium_seasons
  for select to anon, authenticated
  using (published_at is not null);

drop policy if exists "omnium_editions_public_read" on public.omnium_editions;
create policy "omnium_editions_public_read" on public.omnium_editions
  for select to anon, authenticated
  using (published_at is not null);

drop policy if exists "omnium_edition_events_public_read" on public.omnium_edition_events;
create policy "omnium_edition_events_public_read" on public.omnium_edition_events
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.omnium_editions e
      where e.id = omnium_edition_events.edition_id
        and e.published_at is not null
    )
  );

-- Beheerders lezen concepten via de service-role in de server action, net als
-- /beheer/event-scan dat doet. Schrijven verloopt uitsluitend zo; geen
-- insert/update/delete-policy betekent standaard geweigerd voor gewone clients.

drop trigger if exists omnium_seasons_touch on public.omnium_seasons;
create trigger omnium_seasons_touch
  before update on public.omnium_seasons
  for each row execute function public.touch_updated_at();

drop trigger if exists omnium_editions_touch on public.omnium_editions;
create trigger omnium_editions_touch
  before update on public.omnium_editions
  for each row execute function public.touch_updated_at();

drop trigger if exists omnium_edition_events_touch on public.omnium_edition_events;
create trigger omnium_edition_events_touch
  before update on public.omnium_edition_events
  for each row execute function public.touch_updated_at();
