-- "Duur aanpassen" zette een training op origin 'member', zodat de volgende
-- herziening de gekozen duur niet terugzette. Maar 'member' betekent overal
-- "eigen rit van het lid": een vaste afspraak die geen herziening mag raken. Na
-- één duur-aanpassing kon de AI de training dus niet meer bijstellen, plande hij
-- de dag eromheen leeg, sloegen de chat en het dagvoorstel hem over, en wiste
-- verwijderen hem als eigen rit (Rolf en Bart, november 2026).
--
-- De wens van het lid krijgt nu een eigen kolom. De training blijft wat hij was;
-- een herziening mag hem vervangen, maar de nieuwe training van die dag krijgt
-- deze duur (insertPlanWorkouts) en draagt de wens weer verder.

alter table public.training_workouts
  add column if not exists member_duration_minutes integer
    check (member_duration_minutes between 15 and 480);

-- Herstel: trainingen die door "Duur aanpassen" op 'member' kwamen. Die zijn
-- tegelijk met hun AI-plan aangemaakt; een eigen rit, warming-up of test komt
-- later of draagt test_type of een warming-up-id.
update public.training_workouts as workout
set origin = 'ai',
    member_duration_minutes = workout.duration_minutes
from public.training_plans as plan
where plan.id = workout.plan_id
  and plan.source = 'ai'
  and workout.origin = 'member'
  and workout.test_type is null
  and coalesce(workout.intervals_external_id, '') not like 'zwb-warmup-%'
  and workout.created_at between plan.created_at and plan.created_at + interval '2 minutes'
  and workout.duration_minutes between 15 and 480;

notify pgrst, 'reload schema';
