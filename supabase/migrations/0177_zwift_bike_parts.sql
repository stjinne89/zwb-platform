-- Zwift-frames en -wielen met hun luchtweerstand en gewicht, voor het pacingplan.
--
-- `zwift-data` kent alleen de namen van fietsen. ZwiftInsider zet voor elk frame
-- (per upgradeniveau) en elke wielset de gemeten snelheden op Tempus Fugit en de
-- Alpe du Zwift in een openbare Google-sheet. Een beheerder haalt die op via
-- /beheer/zwift-routes; src/lib/zwift/bike-sheet.ts leidt er per onderdeel het
-- verschil in CdA en massa met de referentiefiets uit. Het pacingplan telt die
-- verschillen op bij de Zwift-fysica in src/lib/pacing/zwift-setup.ts.
--
-- Keuze van de eigenaar (21 september 2026): de volledige lijst, hoewel
-- ZwiftInsider geen licentie of API voor hergebruik aanbiedt. De bron staat per
-- rij vermeld.
--
-- Een ophaalronde vervangt de hele tabel: onderdelen die uit de sheet verdwijnen
-- horen ook hier te verdwijnen.

create table if not exists public.zwift_bike_parts (
  id bigint generated always as identity primary key,
  part text not null check (part in ('frame', 'wheel')),
  name text not null,
  kind text not null check (kind in ('road', 'tt', 'gravel', 'mtb')),
  -- Alleen bij wielen: het referentieframe waarop ze gemeten zijn. Leeg bij een
  -- frame; bewust geen null, zodat de unieke sleutel een gewone constraint kan
  -- zijn waar een upsert op kan landen.
  test_frame text not null default '',
  stage smallint not null default 0 check (stage between 0 and 5),
  -- Verschil met de referentiefiets (Zwift Carbon, Zwift 32mm Carbon) bij
  -- 183 cm en 75 kg.
  cda_delta numeric(6, 4) not null,
  kg_delta numeric(5, 2) not null,
  source text not null,
  synced_at timestamptz not null default now(),
  constraint zwift_bike_parts_unique unique (part, name, test_frame, stage)
);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — elk ingelogd lid leest de lijst (fietskeuze in het pacingplan);
-- schrijven alleen via de service-role admin-client na een permissiecheck,
-- zoals bij zwift_routes.
-- ──────────────────────────────────────────────────────────────────────

alter table public.zwift_bike_parts enable row level security;

drop policy if exists "zwift_bike_parts_read" on public.zwift_bike_parts;
create policy "zwift_bike_parts_read" on public.zwift_bike_parts
  for select to authenticated
  using (true);
