-- Tot nu toe kwam elke workout uit een AI-generatie of uit de bibliotheek van de
-- trainer. Een lid kan voortaan zelf een vrije rit inplannen (clubrit, buitenrit,
-- wedstrijd) en daar moet het schema omheen plannen.
--
-- origin onderscheidt die rit van een geplande workout. Dat is niet cosmetisch:
-- retireSupersededWorkouts markeert bij een herziening alles in het bereik als
-- vervangen, en zou de zelf ingeplande rit dus wegstrepen. Op origin kunnen we
-- die uitzonderen.

alter table public.training_workouts
  add column if not exists origin text not null default 'ai';

alter table public.training_workouts
  drop constraint if exists training_workouts_origin_check;
alter table public.training_workouts
  add constraint training_workouts_origin_check
    check (origin in ('ai', 'member', 'trainer'));

-- Workouts uit de bibliotheek zijn door een trainer neergezet, niet door de AI.
update public.training_workouts as workout
set origin = 'trainer'
from public.training_plans as plan
where plan.id = workout.plan_id
  and plan.source = 'manual'
  and workout.origin = 'ai';

-- Het herplannen zoekt de vaste ritten van een lid binnen een datumbereik.
create index if not exists training_workouts_member_origin_idx
  on public.training_workouts (profile_id, scheduled_at)
  where origin = 'member' and superseded_at is null;

notify pgrst, 'reload schema';
