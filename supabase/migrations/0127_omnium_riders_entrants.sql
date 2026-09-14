-- Omnium: rennersidentiteit en startlijsten.
--
-- Dit is het stuk dat nergens anders in het platform bestaat: een deelnemer
-- zónder ZWB-profiel die over edities heen dezelfde persoon moet blijven. De
-- huidige Google-Sheets-GC matcht op naam en dat is precies waarom daar elk
-- seizoen handwerk in zit — één andere spelling en iemand staat twee keer in
-- het klassement. `omnium_riders` maakt van de renner een record met het
-- Zwift-ID als bron van waarheid en de genormaliseerde naam als terugvaloptie.
--
-- `event_rsvps` was hiervoor niet bruikbaar: daar is `profile_id` verplicht,
-- terwijl het internationale veld geen ZWB-profiel heeft.

create table if not exists public.omnium_riders (
  id uuid primary key default gen_random_uuid(),
  zwift_id text,
  -- Genormaliseerde naam (zie src/lib/text/normalize.ts) voor naam-matching
  -- van historische uitslagen zonder Zwift-ID.
  name_key text not null,
  display_name text not null,
  team_name text,
  country text,
  last_league text,
  -- Alleen gevuld als het gekoppelde lid een publiek profiel heeft. Zie
  -- omnium_rider_links voor de reden dat dit gesplitst is.
  public_profile_id uuid references public.profiles(id) on delete set null,
  -- Na een samenvoeging wijst de dubbele rij naar de overgebleven renner.
  merged_into_id uuid references public.omnium_riders(id) on delete set null,
  -- AVG: bij een verwijderverzoek wordt de naam vervangen door 'Rider #xxxx'.
  -- De punten blijven staan, anders klopt het klassement van anderen niet meer.
  anonymised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists omnium_riders_zwift_idx
  on public.omnium_riders (zwift_id) where zwift_id is not null;

create index if not exists omnium_riders_name_idx
  on public.omnium_riders (name_key);

create index if not exists omnium_riders_merged_idx
  on public.omnium_riders (merged_into_id) where merged_into_id is not null;

-- Bewust apart van omnium_riders: deze koppeling is niet publiek leesbaar.
-- Een publiek zichtbare profile_id zou een Omnium-renner verbinden met het
-- ledenrecord van iemand die géén publiek profiel wil, en /profielen/<uuid>
-- is een bestaande route. Voor de publieke pagina's is er
-- omnium_riders.public_profile_id, dat alleen gevuld wordt bij een lid dat
-- zijn profiel openbaar heeft gezet.
create table if not exists public.omnium_rider_links (
  rider_id uuid primary key references public.omnium_riders(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  matched_via text not null check (matched_via in ('zwift_id', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists omnium_rider_links_profile_idx
  on public.omnium_rider_links (profile_id);

create table if not exists public.omnium_entrants (
  id uuid primary key default gen_random_uuid(),
  edition_event_id uuid not null
    references public.omnium_edition_events(id) on delete cascade,
  rider_id uuid not null references public.omnium_riders(id) on delete cascade,
  -- null = nog in te delen; dat hoort zichtbaar te zijn op de startlijst.
  league text,
  subgroup_label text,
  source text not null check (source in ('zwift_entrants', 'manual', 'result')),
  synced_at timestamptz not null default now(),
  unique (edition_event_id, rider_id)
);

create index if not exists omnium_entrants_league_idx
  on public.omnium_entrants (edition_event_id, league);

alter table public.omnium_riders enable row level security;
alter table public.omnium_rider_links enable row level security;
alter table public.omnium_entrants enable row level security;

-- Rennersnamen staan vandaag al publiek op de resultatensite; dit verandert
-- daar niets aan.
drop policy if exists "omnium_riders_public_read" on public.omnium_riders;
create policy "omnium_riders_public_read" on public.omnium_riders
  for select to anon, authenticated using (true);

-- De koppeling renner <-> lid is alleen voor goedgekeurde leden.
drop policy if exists "omnium_rider_links_members_read" on public.omnium_rider_links;
create policy "omnium_rider_links_members_read" on public.omnium_rider_links
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

drop policy if exists "omnium_entrants_public_read" on public.omnium_entrants;
create policy "omnium_entrants_public_read" on public.omnium_entrants
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.omnium_edition_events ee
      join public.omnium_editions e on e.id = ee.edition_id
      where ee.id = omnium_entrants.edition_event_id
        and e.published_at is not null
    )
  );

-- Schrijven verloopt uitsluitend via de service-role in de server actions.

drop trigger if exists omnium_riders_touch on public.omnium_riders;
create trigger omnium_riders_touch
  before update on public.omnium_riders
  for each row execute function public.touch_updated_at();
