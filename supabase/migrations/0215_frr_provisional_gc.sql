-- Voorlopig FRR-klassement per lid (wens van de eigenaar, 2026-10-04).
--
-- FRR zet een etappe pas later in zijn klassementstabel, en vult positie en eGAP
-- daarna nog. Tot die tijd rekent ZWB zelf: de finishtijden per tijdslot komen
-- uit Zwift (serviceaccount), de klasse van een renner uit het laatste
-- klassement van FRR (frr_gc_standings, 0195). Per etappe en tijdslot zet de
-- eerste renner van een klasse de tijd; de rest verliest eGAP op hem.
--
-- Een lid kan renners uit zijn eigen berekening halen: wie gepromoveerd is of
-- in een verkeerde startgroep reed. Dat is persoonlijk, zoals frr_watch_riders.

create table if not exists public.frr_stage_results (
  slot_event_id uuid not null references public.events(id) on delete cascade,
  zwift_id text not null check (zwift_id ~ '^\d+$'),
  tour_id uuid not null references public.frr_tours(id) on delete cascade,
  stage int not null check (stage > 0),
  -- De startgroep (subgroep A–E) waarin de renner finishte.
  pen text,
  time_s numeric(12, 3) not null check (time_s > 0),
  fetched_at timestamptz not null default now(),
  primary key (slot_event_id, zwift_id)
);

create index if not exists frr_stage_results_tour_zwift_idx
  on public.frr_stage_results (tour_id, zwift_id);

create table if not exists public.frr_gc_exclusions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tour_id uuid not null references public.frr_tours(id) on delete cascade,
  zwift_id text not null check (zwift_id ~ '^\d+$'),
  name text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, tour_id, zwift_id)
);

alter table public.frr_stage_results enable row level security;
alter table public.frr_gc_exclusions enable row level security;

-- Schrijven alleen met de service-role, door de sync.
drop policy if exists "frr_stage_results_read" on public.frr_stage_results;
create policy "frr_stage_results_read" on public.frr_stage_results
  for select to authenticated using (true);

drop policy if exists "frr_gc_exclusions_own_read" on public.frr_gc_exclusions;
create policy "frr_gc_exclusions_own_read" on public.frr_gc_exclusions
  for select to authenticated using ((select auth.uid()) = profile_id);

drop policy if exists "frr_gc_exclusions_own_insert" on public.frr_gc_exclusions;
create policy "frr_gc_exclusions_own_insert" on public.frr_gc_exclusions
  for insert to authenticated with check ((select auth.uid()) = profile_id);

drop policy if exists "frr_gc_exclusions_own_delete" on public.frr_gc_exclusions;
create policy "frr_gc_exclusions_own_delete" on public.frr_gc_exclusions
  for delete to authenticated using ((select auth.uid()) = profile_id);

notify pgrst, 'reload schema';
