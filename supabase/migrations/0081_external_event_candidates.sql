-- Externe kalenderconcepten voor Zwift/MyWhoosh-eventscan.
-- Publicatie blijft een beheeractie; deze tabel bewaart scanresultaten zodat
-- admins events kunnen negeren, markeren of later publiceren.

create table if not exists public.external_event_candidates (
  id uuid primary key default uuid_generate_v4(),
  source text not null check (source in ('mywhoosh', 'zwift')),
  external_id text not null,
  external_url text not null,
  title text not null,
  start_at timestamptz not null,
  distance_km numeric(10,2),
  elevation_m int,
  zwb_match_status text not null default 'unknown'
    check (zwb_match_status in ('unknown', 'likely', 'confirmed', 'manual')),
  raw_metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ignored_at timestamptz,
  published_event_id uuid references public.events(id) on delete set null,
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists external_event_candidates_start_idx
  on public.external_event_candidates (start_at);
create index if not exists external_event_candidates_status_idx
  on public.external_event_candidates (ignored_at, published_at, start_at);

alter table public.external_event_candidates enable row level security;

-- Geen client-side policies: beheerpagina's lezen en schrijven via service-role
-- nadat de server-action `events.manage_all` heeft gecontroleerd.
