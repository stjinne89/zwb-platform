-- Links bij een event: reconvideo's, de uitleg op ZwiftInsider, de racepagina
-- op zwbcycling.nl en losse links. Wens van de eigenaar (2026-09-22) voor de
-- ZRL-races. Zwift, ZwiftPower en ZwiftRacing staan hier niet in: die volgen uit
-- events.zwift_event_id. Een teamrace toont ook de links van zijn raceweek.
-- Schrijven gaat via de service-role admin-client na de permissiecheck in de
-- server-action (zelfde patroon als event_zones).

create table if not exists public.event_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  position int not null default 0,
  kind text not null check (kind in ('recon', 'zwiftinsider', 'zwb', 'overig')),
  label text,
  url text not null check (url ~ '^https://'),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists event_links_event_idx
  on public.event_links (event_id, position);

alter table public.event_links enable row level security;

drop policy if exists "event_links_read" on public.event_links;
create policy "event_links_read" on public.event_links
  for select to authenticated
  using (true);
