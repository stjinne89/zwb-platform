-- Indexen op de verwijzingen naar training_plans.
--
-- De databasecheck van 2026-10-27 vond `delete training_plans` met gemiddeld
-- 1.030 ms. Zes verwijzingen naar training_plans(id) hadden geen index, dus bij
-- elke delete liep Postgres die tabellen helemaal door om `on delete set null`
-- uit te voeren (training_workouts heeft ~8.400 rijen). De verwijzingen
-- training_workouts.plan_id en training_ai_generations.parent_plan_id hadden al
-- een index.
--
-- De tabellen zijn klein; gewone create index binnen de migratie is genoeg.

create index if not exists training_workouts_superseded_by_plan_idx
  on public.training_workouts (superseded_by_plan_id);

create index if not exists training_plans_parent_plan_idx
  on public.training_plans (parent_plan_id);

create index if not exists training_plans_root_plan_idx
  on public.training_plans (root_plan_id);

create index if not exists training_adaptation_runs_source_plan_idx
  on public.training_adaptation_runs (source_plan_id);

create index if not exists training_adaptation_runs_draft_plan_idx
  on public.training_adaptation_runs (draft_plan_id);

create index if not exists training_chat_messages_plan_idx
  on public.training_chat_messages (plan_id);
