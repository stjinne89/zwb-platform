-- Statusgeschiedenis van de integratie-health-check. Eén rij per bron per run;
-- de laatste rij per bron is de actuele status. Gevuld door
-- POST /api/health/integrations (service-role).

create table if not exists public.integration_health (
  id uuid primary key default uuid_generate_v4(),
  source text not null,
  ok boolean not null,
  detail text,
  checked_at timestamptz not null default now()
);

create index if not exists integration_health_source_checked_idx
  on public.integration_health (source, checked_at desc);

alter table public.integration_health enable row level security;

-- Geen client-side policies: de beheerpagina leest via de service-role-client
-- nadat de server `events.manage_all` heeft gecontroleerd (zelfde patroon als
-- external_event_candidates).
