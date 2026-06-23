-- POI's (points of interest) per event: leden klikken op de kaart om een
-- waterpunt, eetpunt, gevaar, uitzicht of info-punt te markeren. Verschijnen
-- blijvend op de kaart én het hoogteprofiel. Elk lid mag toevoegen; je verwijdert
-- je eigen POI's (of de event-beheerder/admin verwijdert ze via een server-action).

create table if not exists public.event_pois (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  type text not null check (type in ('water', 'food', 'danger', 'view', 'info')),
  label text,
  lat numeric(9, 6) not null,
  lng numeric(9, 6) not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists event_pois_event_idx on public.event_pois (event_id);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — iedereen die het event ziet leest de POI's; ingelogde leden voegen
-- eigen POI's toe en verwijderen die. Beheerders verwijderen elke POI via de
-- service-role admin-client in de server-action (na permissie-check).
-- ──────────────────────────────────────────────────────────────────────

alter table public.event_pois enable row level security;

drop policy if exists "event_pois_read" on public.event_pois;
create policy "event_pois_read" on public.event_pois
  for select to authenticated
  using (true);

drop policy if exists "event_pois_insert_own" on public.event_pois;
create policy "event_pois_insert_own" on public.event_pois
  for insert to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "event_pois_delete_own" on public.event_pois;
create policy "event_pois_delete_own" on public.event_pois
  for delete to authenticated
  using (auth.uid() = created_by);
