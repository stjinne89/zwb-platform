-- Een aanpassing is in de database een afgeleid plan (parent_plan_id), maar de
-- schemapagina toonde élke rij als een zelfstandig programma. Met een dagelijkse
-- cron erbij duwde dat het échte schema binnen een week uit beeld.
--
-- root_plan_id wijst naar het schema waar een rij bij hoort. Voor een basisplan
-- is dat zijn eigen id, voor een aanpassing die van het plan waar de keten begon.
-- Daarmee kan de UI één kaart per schema tonen met de aanpassingen erin verwerkt,
-- zonder per plan de parent-keten te moeten aflopen.
--
-- adaptation_kind stond alleen op training_ai_generations (0104), waardoor het
-- plan zelf niet wist wat voor aanpassing het was. De UI leidde dat af uit de
-- titel-suffix. 'daily' is nieuw: dat is de nachtelijke bijstelling, die voortaan
-- een voorstel binnen het lopende schema is in plaats van een eigen concept.

alter table public.training_plans
  add column if not exists root_plan_id uuid
    references public.training_plans(id) on delete set null,
  add column if not exists adaptation_kind text;

alter table public.training_plans
  drop constraint if exists training_plans_adaptation_kind_check;
alter table public.training_plans
  add constraint training_plans_adaptation_kind_check
    check (adaptation_kind is null or adaptation_kind in ('day', 'plan_update', 'daily'));

-- De check op training_ai_generations is inline gedefinieerd in 0104 en kent
-- 'daily' nog niet; de cron schrijft die waarde straks wel.
alter table public.training_ai_generations
  drop constraint if exists training_ai_generations_adaptation_kind_check;
alter table public.training_ai_generations
  add constraint training_ai_generations_adaptation_kind_check
    check (adaptation_kind is null or adaptation_kind in ('day', 'plan_update', 'daily'));

-- Backfill. Eerst de basisplannen: die zijn hun eigen root.
update public.training_plans
set root_plan_id = id
where parent_plan_id is null
  and root_plan_id is null;

-- Daarna telkens één niveau omlaag, tot er niets meer te vullen valt. De guard
-- maakt een (theoretische) cyclus in de keten onschadelijk: die zou anders
-- eeuwig blijven rondlopen zonder ooit een rij te raken.
do $$
declare
  touched int;
  guard int := 0;
begin
  loop
    update public.training_plans as child
    set root_plan_id = parent.root_plan_id
    from public.training_plans as parent
    where child.parent_plan_id = parent.id
      and child.root_plan_id is null
      and parent.root_plan_id is not null;
    get diagnostics touched = row_count;
    guard := guard + 1;
    exit when touched = 0 or guard > 50;
  end loop;
end $$;

-- Wat nu nog leeg is, hangt aan een verdwenen parent. Dat behandelen we als een
-- eigen schema; anders valt het helemaal uit de lijst.
update public.training_plans
set root_plan_id = id
where root_plan_id is null;

-- De aard van bestaande aanpassingen zat alleen in de titel-suffix die
-- createPlanFromAiGeneration erachter plakte.
update public.training_plans
set adaptation_kind = case
  when title like '%(bijgewerkt)' then 'plan_update'
  when title like '%(dagelijkse aanpassing)' then 'daily'
  else 'day'
end
where parent_plan_id is not null
  and adaptation_kind is null;

-- De schemapagina haalt per lid de basisplannen op en daarna hun hele familie.
create index if not exists training_plans_profile_root_idx
  on public.training_plans (profile_id, root_plan_id);

notify pgrst, 'reload schema';
