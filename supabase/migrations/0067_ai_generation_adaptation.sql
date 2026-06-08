-- "Pas vandaag aan" (renner) draait nu via dezelfde achtergrond-AI-flow als de
-- trainer-knop. De achtergrond-generatie moet de aanpassings-context dragen
-- zodat de poll-stap het juiste (afgeleide) plan kan bouwen.

alter table public.training_ai_generations
  add column if not exists parent_plan_id uuid references public.training_plans(id) on delete set null,
  add column if not exists adaptation_reason text;
