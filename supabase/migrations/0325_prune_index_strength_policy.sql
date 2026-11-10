-- Twee punten uit de wekelijkse databasecheck van 2026-11-10.
--
-- 1. prune_superseded_training_workouts (0304) was de zwaarste query: elke run
--    scande heel training_workouts (~2.000 buffers, minimaal 619 ms, gemiddeld
--    1,2 s), terwijl er maar een handvol rijen langer dan 30 dagen vervangen is.
--    De partiële index hieronder dekt precies de filter van die functie, zodat
--    de scan alleen de kandidaten raakt. De route /api/live/cleanup draait de
--    functie bovendien nog maar één keer per dag in plaats van elk kwartier.
--
-- 2. De policy uit 0292 riep auth.uid() per rij aan (advisor auth_rls_initplan).
--    Met (select auth.uid()) rekent Postgres die één keer per query uit, zoals in
--    0210_rls_initplan.sql.
--
-- Volgorde: los van de code; beide kanten werken zonder elkaar.

create index if not exists training_workouts_prune_idx
  on public.training_workouts (superseded_at)
  where status = 'planned'
    and intervals_event_id is null
    and superseded_at is not null;

drop policy if exists "intervals_strength_muscles_own" on public.intervals_strength_muscles;
create policy "intervals_strength_muscles_own" on public.intervals_strength_muscles
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

notify pgrst, 'reload schema';

-- Verificatie (handmatig, na uitvoeren):
-- explain select 1 from public.training_workouts
--   where superseded_at < now() - interval '30 days'
--     and status = 'planned' and intervals_event_id is null;
--   -- verwacht: Index Scan using training_workouts_prune_idx
-- select qual from pg_policies where policyname = 'intervals_strength_muscles_own';
--   -- verwacht: (profile_id = ( SELECT auth.uid() AS uid))
