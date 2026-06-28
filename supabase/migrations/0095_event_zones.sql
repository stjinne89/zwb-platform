-- Per-event geneutraliseerde zones: de organisator markeert stukken route waar
-- het tempo geneutraliseerd is (parade/uitritten), als afstand-bereik
-- (start_km..end_km) met een optioneel label. Eén rij = één zone. Verschijnt als
-- band op de kaart én het hoogteprofiel. Schrijven mag alleen de event-beheerder/
-- creator (zelfde patroon als event_climbs): via de service-role admin-client na
-- permissie-check in de server-action.

create table if not exists public.event_zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  position int not null default 0,
  label text,
  start_km numeric(7, 3) not null,
  end_km numeric(7, 3) not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists event_zones_event_idx
  on public.event_zones (event_id, position);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — iedereen die het event mag zien leest de zones; schrijven gebeurt via
-- de service-role admin-client na permissie-check in de server-action.
-- ──────────────────────────────────────────────────────────────────────

alter table public.event_zones enable row level security;

drop policy if exists "event_zones_read" on public.event_zones;
create policy "event_zones_read" on public.event_zones
  for select to authenticated
  using (true);
