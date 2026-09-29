-- Flamme Rouge Racing-tours op de kalender (wens van de eigenaar, 2026-09-29).
--
-- Zelfde opbouw als de ZRL (0178): een hoofdevent per etappe, daaronder per
-- tijdslot een event via parent_event_id. Verschil met de ZRL: een tijdslot
-- heeft geen team. Wie in welk slot rijdt, volgt uit de Zwift-inschrijving.
--
-- Het klassement komt van flammerougeracing.com (toestemming eigenaar om het
-- op te halen). ZwiftPower en WTRL blijven links, zoals eerder besloten.
--
-- Schrijven gebeurt alleen met de service-role: door de import- en sync-code na
-- de permissiecheck in de server-action, of door de cron. Leden lezen alles,
-- behalve de favorieten van een ander.

create table if not exists public.frr_tours (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- De tag waarmee FRR alle tijdsloten van de tour in Zwift zet (frrignite).
  zwift_tag text not null unique check (zwift_tag ~ '^frr[a-z0-9]+$'),
  -- Code van de tour in de GC-tabel van FRR ("FTQ.5"). Pas bekend na de eerste
  -- etappe; de beheerder zet hem. Zonder code wordt het klassement niet geladen.
  gc_code text check (gc_code is null or gc_code ~ '^[A-Za-z0-9]+(\.[A-Za-z0-9]+)?$'),
  starts_on date,
  ends_on date,
  gc_after_stage int,
  gc_scraped_at timestamptz,
  gc_error text,
  synced_at timestamptz,
  sync_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events
  add column if not exists frr_tour_id uuid references public.frr_tours(id) on delete set null;
alter table public.events
  add column if not exists frr_stage int check (frr_stage is null or frr_stage > 0);

-- Eén hoofdevent per etappe; de tijdsloten worden herkend aan zwift_event_id.
create unique index if not exists events_frr_stage_parent_idx
  on public.events (frr_tour_id, frr_stage)
  where frr_tour_id is not null and parent_event_id is null;
create index if not exists events_frr_tour_idx
  on public.events (frr_tour_id)
  where frr_tour_id is not null;

-- Het klassement na de laatste etappe. Eerdere etappes bewaren we niet: de
-- FRR-site heeft die zelf, en de rivalenlijst kijkt alleen naar nu.
create table if not exists public.frr_gc_standings (
  tour_id uuid not null references public.frr_tours(id) on delete cascade,
  gender_class text not null,
  class_code text not null,
  gender text not null check (gender in ('M', 'F')),
  zwift_id text not null check (zwift_id ~ '^\d+$'),
  position int not null check (position > 0),
  name text not null,
  club text,
  age_cat text,
  stages_ridden int,
  tour_time_s numeric(12, 3),
  egap_s numeric(12, 3),
  after_stage int not null,
  scraped_at timestamptz not null default now(),
  primary key (tour_id, gender_class, zwift_id)
);

create index if not exists frr_gc_standings_zwift_idx
  on public.frr_gc_standings (tour_id, zwift_id);

-- Alle inschrijvers per tijdslot, niet alleen ZWB'ers: de rivalenlijst wil
-- weten in welk slot een tegenstander rijdt.
create table if not exists public.frr_slot_entrants (
  event_id uuid not null references public.events(id) on delete cascade,
  zwift_id text not null check (zwift_id ~ '^\d+$'),
  name text not null,
  subgroup_label text,
  profile_id uuid references public.profiles(id) on delete set null,
  synced_at timestamptz not null default now(),
  primary key (event_id, zwift_id)
);

create index if not exists frr_slot_entrants_zwift_idx
  on public.frr_slot_entrants (zwift_id);

-- Renners die een lid zelf volgt.
create table if not exists public.frr_watch_riders (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  zwift_id text not null check (zwift_id ~ '^\d+$'),
  name text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, zwift_id)
);

-- ──────────────────────────────────────────────────────────────────────
-- Klassement in één keer vervangen, zodat een lid nooit een half klassement ziet.
-- ──────────────────────────────────────────────────────────────────────

create or replace function public.frr_replace_gc(p_tour_id uuid, p_after_stage int, p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Leeg of ongeldig klassement.';
  end if;
  perform 1 from frr_tours where id = p_tour_id for update;
  delete from frr_gc_standings where tour_id = p_tour_id;
  insert into frr_gc_standings (
    tour_id, gender_class, class_code, gender, zwift_id, position, name, club,
    age_cat, stages_ridden, tour_time_s, egap_s, after_stage
  )
  select p_tour_id, r.gender_class, r.class_code, r.gender, r.zwift_id, r.position,
         r.name, r.club, r.age_cat, r.stages_ridden, r.tour_time_s, r.egap_s, p_after_stage
  from jsonb_to_recordset(p_rows) as r(
    gender_class text, class_code text, gender text, zwift_id text, position int,
    name text, club text, age_cat text, stages_ridden int, tour_time_s numeric, egap_s numeric
  )
  on conflict (tour_id, gender_class, zwift_id) do nothing;
  update frr_tours
     set gc_after_stage = p_after_stage, gc_scraped_at = clock_timestamp(), gc_error = null
   where id = p_tour_id;
end $$;
revoke all on function public.frr_replace_gc(uuid, int, jsonb) from public, anon, authenticated;
grant execute on function public.frr_replace_gc(uuid, int, jsonb) to service_role;

-- ──────────────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────────────

alter table public.frr_tours enable row level security;
alter table public.frr_gc_standings enable row level security;
alter table public.frr_slot_entrants enable row level security;
alter table public.frr_watch_riders enable row level security;

drop policy if exists "frr_tours_read" on public.frr_tours;
create policy "frr_tours_read" on public.frr_tours
  for select to authenticated using (true);

drop policy if exists "frr_gc_standings_read" on public.frr_gc_standings;
create policy "frr_gc_standings_read" on public.frr_gc_standings
  for select to authenticated using (true);

drop policy if exists "frr_slot_entrants_read" on public.frr_slot_entrants;
create policy "frr_slot_entrants_read" on public.frr_slot_entrants
  for select to authenticated using (true);

drop policy if exists "frr_watch_riders_own_read" on public.frr_watch_riders;
create policy "frr_watch_riders_own_read" on public.frr_watch_riders
  for select to authenticated using (auth.uid() = profile_id);

drop policy if exists "frr_watch_riders_own_insert" on public.frr_watch_riders;
create policy "frr_watch_riders_own_insert" on public.frr_watch_riders
  for insert to authenticated with check (auth.uid() = profile_id);

drop policy if exists "frr_watch_riders_own_delete" on public.frr_watch_riders;
create policy "frr_watch_riders_own_delete" on public.frr_watch_riders
  for delete to authenticated using (auth.uid() = profile_id);

notify pgrst, 'reload schema';
