-- Omnium: uitslagen per onderdeel en de twee klassementen.
--
-- Waarom niet `event_results` hergebruiken: dat contract is "één gescrapete
-- positie per deelnemer". De Omnium heeft per renner en per onderdeel ook
-- punten, een status (DNF/DNS/DSQ), een segmenttijd voor de Fastest Time on
-- Segment, FAL-sprintpunten, en een league die niet gelijk is aan de
-- startgroep. Dat zijn zes nullable kolommen erbij op een tabel die de
-- resultaat-scraper en de eventpagina delen. Bovendien is `event_results`
-- afgeschermd op `authenticated`, terwijl Omnium-uitslagen juist publiek
-- moeten zijn — een tegengesteld RLS-beleid op dezelfde tabel.
--
-- De vorm is wel overgenomen van `zwift_rider_results` uit migratie 0068:
-- points als numeric, matched_via met een check, metadata als jsonb.
--
-- De standings zijn afgeleid maar worden opgeslagen. Reden: het klassement
-- komt uit een geteste TypeScript-functie en niet uit SQL, de publieke
-- pagina's moeten goedkoop zijn onder verkeer vanaf Zwift en YouTube, en de
-- rangorde mét tiebreak is niet in één `order by` uit te drukken.

create table if not exists public.omnium_results (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.omnium_editions(id) on delete cascade,
  edition_event_id uuid not null
    references public.omnium_edition_events(id) on delete cascade,
  rider_id uuid not null references public.omnium_riders(id) on delete cascade,
  league text not null,
  status text not null default 'finished'
    check (status in ('finished', 'dnf', 'dns', 'dsq')),
  -- Positie binnen de league. Categorieen mogen op de startlijst samengevoegd
  -- worden zonder het klassement te raken, dus dit is nadrukkelijk niet de
  -- positie in het hele veld; die staat los in overall_position.
  position int check (position is null or position > 0),
  overall_position int check (overall_position is null or overall_position > 0),
  time_text text,
  time_seconds int,
  -- Fastest Time on Segment, alleen bij de Sprint Quali.
  segment_seconds int,
  finish_points numeric(7,2) not null default 0,
  sprint_points numeric(7,2) not null default 0,
  -- Wat er na alle regels meetelt.
  points numeric(7,2) not null default 0,
  -- Wat er verdiend was voordat de crit-nulregel werd toegepast, zodat de
  -- publieke pagina kan uitleggen waarom er 0 staat naast een zichtbare
  -- sprintprestatie.
  points_raw numeric(7,2) not null default 0,
  voided_reason text,
  breakdown jsonb not null default '{}'::jsonb,
  matched_via text not null default 'manual'
    check (matched_via in ('zwift_id', 'profile', 'name', 'manual', 'unmatched')),
  source text not null default 'paste'
    check (source in ('paste', 'zwift', 'import')),
  entered_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_event_id, rider_id)
);

create index if not exists omnium_results_edition_idx
  on public.omnium_results (edition_id, league, points desc);

create index if not exists omnium_results_rider_idx
  on public.omnium_results (rider_id);

-- Stand binnen één editie: de som van de vier onderdelen van die dag. Moet ook
-- halverwege kloppen, want dit voedt de tussenstand tijdens de uitzending.
create table if not exists public.omnium_edition_standings (
  edition_id uuid not null references public.omnium_editions(id) on delete cascade,
  rider_id uuid not null references public.omnium_riders(id) on delete cascade,
  league text not null,
  prologue_points numeric(7,2) not null default 0,
  scratch_points numeric(7,2) not null default 0,
  sprint_points numeric(7,2) not null default 0,
  crit_points numeric(7,2) not null default 0,
  total_points numeric(8,2) not null default 0,
  rank int not null,
  -- Bij een gelijke stand die de tiebreak niet breekt delen renners een plaats.
  rank_shared boolean not null default false,
  -- Aantal onderdelen gewonnen binnen deze editie, en alle klasseringen
  -- oplopend. Allebei nodig voor de tiebreak van het seizoensklassement: die
  -- telt overwinningen per onderdeel en doet een countback op de beste
  -- klasseringen, niet op de editie-rangnummers.
  wins int not null default 0,
  positions int[] not null default '{}',
  -- Zolang niet alle vier de onderdelen binnen zijn is dit een tussenstand.
  is_provisional boolean not null default false,
  computed_at timestamptz not null default now(),
  primary key (edition_id, rider_id)
);

create index if not exists omnium_edition_standings_rank_idx
  on public.omnium_edition_standings (edition_id, league, rank);

-- Seizoensklassement over alle edities.
create table if not exists public.omnium_season_standings (
  season_id uuid not null references public.omnium_seasons(id) on delete cascade,
  rider_id uuid not null references public.omnium_riders(id) on delete cascade,
  league text not null,
  -- {"1": 86, "2": 54, ...} — redundant met de editiestanden, maar het
  -- bespaart een join op de zwaarst bezochte pagina van de site.
  points_by_edition jsonb not null default '{}'::jsonb,
  prologue_points numeric(8,2) not null default 0,
  scratch_points numeric(8,2) not null default 0,
  sprint_points numeric(8,2) not null default 0,
  crit_points numeric(8,2) not null default 0,
  total_points numeric(9,2) not null default 0,
  editions_raced int not null default 0,
  rank int not null,
  rank_shared boolean not null default false,
  computed_at timestamptz not null default now(),
  primary key (season_id, rider_id)
);

create index if not exists omnium_season_standings_rank_idx
  on public.omnium_season_standings (season_id, league, rank);

alter table public.omnium_results enable row level security;
alter table public.omnium_edition_standings enable row level security;
alter table public.omnium_season_standings enable row level security;

drop policy if exists "omnium_results_public_read" on public.omnium_results;
create policy "omnium_results_public_read" on public.omnium_results
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.omnium_editions e
      where e.id = omnium_results.edition_id
        and e.published_at is not null
    )
  );

drop policy if exists "omnium_edition_standings_public_read"
  on public.omnium_edition_standings;
create policy "omnium_edition_standings_public_read"
  on public.omnium_edition_standings
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.omnium_editions e
      where e.id = omnium_edition_standings.edition_id
        and e.published_at is not null
    )
  );

drop policy if exists "omnium_season_standings_public_read"
  on public.omnium_season_standings;
create policy "omnium_season_standings_public_read"
  on public.omnium_season_standings
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.omnium_seasons s
      where s.id = omnium_season_standings.season_id
        and s.published_at is not null
    )
  );

-- Schrijven verloopt uitsluitend via de service-role in de server actions.

drop trigger if exists omnium_results_touch on public.omnium_results;
create trigger omnium_results_touch
  before update on public.omnium_results
  for each row execute function public.touch_updated_at();
