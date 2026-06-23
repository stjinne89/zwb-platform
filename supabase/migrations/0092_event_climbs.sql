-- Per-event klim-overrides: admin/creator kan de automatisch uit de GPX
-- gedetecteerde klimmen bijsturen (samenvoegen, hernoemen, categorie kiezen) en
-- klimmen toevoegen die niet gedetecteerd werden. Eén rij = één klim, als een
-- afstand-bereik (start_km..end_km). De stats (lengte/hoogtemeters/%) worden bij
-- het tonen uit de GPX herberekend; alleen het bereik + naam + categorie staat
-- hier. Als een event minstens één rij heeft, vervangen die de auto-detectie.

create table if not exists public.event_climbs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  position int not null default 0,
  name text,
  category text check (category in ('4e', '3e', '2e', '1e', 'HC')),
  start_km numeric(7, 3) not null,
  end_km numeric(7, 3) not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists event_climbs_event_idx
  on public.event_climbs (event_id, position);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — iedereen die het event mag zien leest de klimmen; schrijven gebeurt
-- via de service-role admin-client na permissie-check in de server-action
-- (zelfde patroon als event_results).
-- ──────────────────────────────────────────────────────────────────────

alter table public.event_climbs enable row level security;

drop policy if exists "event_climbs_read" on public.event_climbs;
create policy "event_climbs_read" on public.event_climbs
  for select to authenticated
  using (true);
