-- Spiegel van de Zwift-kalender, zodat een geplande training een passend event
-- voorgesteld kan krijgen.
--
-- Waarom náást external_event_candidates: die tabel is de beheerlaag voor
-- ZWB-relevante events die een beheerder naar /kalender publiceert, met een
-- matchstatus, een negeervlag en een koppeling naar het gepubliceerde event.
-- Daar horen duizenden wereldwijde Zwift-events niet in: die zouden de
-- reviewflow op /beheer/event-scan onbruikbaar maken. Deze tabel is het
-- tegenovergestelde: wegwerpdata, volledig herbouwbaar uit de Zwift-API, zonder
-- beheerbeslissing eraan vast. Wat hier binnenkomt wordt nooit gepubliceerd.
--
-- Wat hier NIET in staat: naam, afstand, hoogtemeters en de klim-/sprintsegmenten
-- van een route. Die komen uit het `zwift-data`-pakket via route_id, net als bij
-- zwift_routes (0144) — één bron, niet gekopieerd.

create table if not exists public.zwift_events (
  -- Gelijk aan `id` uit de publieke Zwift-event-API.
  event_id bigint primary key,
  name text not null,
  event_start timestamptz not null,

  -- GROUP_RIDE, RACE, GROUP_WORKOUT, TIME_TRIAL, FONDO, ... Ruw overgenomen:
  -- Zwift voegt soorten toe, en een onbekende soort mag de sync niet breken.
  event_type text,
  sport text,

  -- Verwijst naar routes[].id in zwift-data; null als Zwift geen route meegaf.
  route_id bigint,

  -- Zwift geeft óf een duur, óf een afstand met een rondental. Allebei null kan.
  duration_seconds int,
  distance_m numeric(10, 1),
  laps int,

  -- Per subgroep: label (A/B/C/D/E), de W/kg-band (rangeAccessLabel), starttijd,
  -- afstand en het aantal inschrijvingen. De W/kg-band is het enige harde
  -- intensiteitssignaal dat de publieke API geeft, dus die bewaren we ruw.
  subgroups jsonb not null default '[]'::jsonb,

  series_name text,
  description text,

  -- Inschrijvingen wereldwijd, zoals de API ze geeft. Null als het veld ontbrak;
  -- 0 en "onbekend" zijn niet hetzelfde en mogen niet samenvallen.
  total_signups int,
  -- Hoeveel ZWB'ers zich inschreven, uit de geautoriseerde member-feed
  -- (followeeSignedUpCount, zie zwift-club.ts). Null als de clubkoppeling niet
  -- is geconfigureerd.
  zwb_signups int,

  external_url text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Het voorstel zoekt altijd binnen één dagvenster; dit is de enige toegangsweg.
create index if not exists zwift_events_start_idx
  on public.zwift_events (event_start);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — elk ingelogd lid leest de spiegel (het voorstel wordt in een server
-- component berekend); schrijven doet uitsluitend de service-role sync.
-- Gelijk aan zwift_routes (0144).
-- ──────────────────────────────────────────────────────────────────────

alter table public.zwift_events enable row level security;

drop policy if exists "zwift_events_read" on public.zwift_events;
create policy "zwift_events_read" on public.zwift_events
  for select to authenticated
  using (true);

-- ──────────────────────────────────────────────────────────────────────
-- De keuze van het lid hangt aan de training, niet aan het event: welk Zwift-
-- event heeft dit lid bij déze training gekozen, of heeft het de voorstellen
-- weggeklikt. Zelfde vorm als event_id in 0116.
--
-- Bewust geen foreign key naar zwift_events: die tabel ruimt afgelopen events
-- op, en dan zou de keuze van het lid met terugwerkende kracht verdwijnen uit
-- een training die het wél zo gereden heeft.
-- ──────────────────────────────────────────────────────────────────────

alter table public.training_workouts
  add column if not exists zwift_event_id bigint;

alter table public.training_workouts
  add column if not exists zwift_suggestions_dismissed_at timestamptz;

notify pgrst, 'reload schema';
