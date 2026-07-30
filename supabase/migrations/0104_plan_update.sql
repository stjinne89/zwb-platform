-- Een schema bijwerken (uren/doel/intensiteit) loopt via dezelfde achtergrond-
-- AI-flow als de dag-aanpassing: een afgeleid plan met parent_plan_id. Tot nu
-- toe was parent_plan_id het enige onderscheid, waardoor élk afgeleid plan de
-- titel "(aanpassing vandaag)" kreeg. Vandaar adaptation_kind.
--
-- adapt_from_date is de datum vanaf waar het schema opnieuw is gemaakt. Het
-- publiceren gebruikt die datum om de oude workouts in dat hele bereik als
-- vervangen te markeren — niet alleen op de datums waar de nieuwe workouts
-- toevallig ook op vallen. Zonder dat blijft een geschrapte trainingsdag staan.

alter table public.training_ai_generations
  add column if not exists adaptation_kind text
    check (adaptation_kind is null or adaptation_kind in ('day', 'plan_update')),
  add column if not exists adapt_from_date date;

alter table public.training_plans
  add column if not exists adapt_from_date date;

notify pgrst, 'reload schema';
