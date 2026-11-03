-- Trainingsdata kleiner, zodat de database binnen de 500 MB van Free blijft.
-- Onderzoek: docs/database-bewaartermijn.md (2026-11-03).
--
-- 1. De systeemprompt één keer opslaan. training_ai_generations.prompt_text was
--    ~9,5 MB van de tabel, terwijl 821 generaties maar 60 verschillende prompts
--    hadden. Een trigger zet de tekst in training_ai_prompts en houdt per
--    generatie alleen de hash; de schrijvende code in src/lib/training/draft.ts
--    hoeft daardoor niet te veranderen en de volgorde van migratie en deploy
--    maakt niet uit. De app leest prompt_text nergens terug; alleen
--    scripts/claude-replay.mjs en scripts/schema-meetlat.mjs, en die lezen nu
--    via de hash.
--
-- 2. Vervangen workouts opruimen. Elke herziening zet het hele venster opnieuw
--    neer en markeert de vorige workouts als vervangen; 89% van
--    training_workouts was zo'n vervangen rij (~1.800 per week erbij). Geen
--    scherm toont ze. /api/live/cleanup roept de functie hieronder aan en
--    verwijdert ze na 30 dagen, behalve als er nog iets aan hangt: een
--    intervals.icu-event, een rapportage, een FTP-test of een ritsamenvatting.
--
-- Ruimte komt pas terug na een eenmalige `vacuum full` op beide tabellen
-- (docs/runbook.md); verwijderen alleen maakt de ruimte vrij voor hergebruik.

create table if not exists public.training_ai_prompts (
  hash text primary key,
  prompt_text text not null,
  created_at timestamptz not null default now()
);

-- Geen policies: alleen de service role en de trigger hieronder komen erbij.
alter table public.training_ai_prompts enable row level security;
revoke all on public.training_ai_prompts from anon, authenticated;

alter table public.training_ai_generations
  add column if not exists prompt_hash text
    references public.training_ai_prompts (hash);

-- Bestaande generaties omzetten.
insert into public.training_ai_prompts (hash, prompt_text)
select distinct on (md5(prompt_text)) md5(prompt_text), prompt_text
from public.training_ai_generations
where prompt_text is not null
order by md5(prompt_text), created_at
on conflict (hash) do nothing;

update public.training_ai_generations
set prompt_hash = md5(prompt_text),
    prompt_text = null
where prompt_text is not null;

create or replace function public.training_ai_generations_store_prompt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.prompt_text is not null then
    new.prompt_hash := md5(new.prompt_text);
    insert into public.training_ai_prompts (hash, prompt_text)
    values (new.prompt_hash, new.prompt_text)
    on conflict (hash) do nothing;
    new.prompt_text := null;
  end if;
  return new;
end;
$$;

revoke all on function public.training_ai_generations_store_prompt() from public, anon, authenticated;

drop trigger if exists training_ai_generations_store_prompt on public.training_ai_generations;
create trigger training_ai_generations_store_prompt
  before insert or update of prompt_text on public.training_ai_generations
  for each row execute function public.training_ai_generations_store_prompt();

create or replace function public.prune_superseded_training_workouts(keep_days integer default 30)
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.training_workouts w
    where w.superseded_at < now() - make_interval(days => keep_days)
      and w.status = 'planned'
      and w.intervals_event_id is null
      and not exists (select 1 from public.training_workout_reports r where r.workout_id = w.id)
      and not exists (select 1 from public.training_ftp_tests f where f.workout_id = w.id)
      and not exists (select 1 from public.strava_activity_summaries s where s.workout_id = w.id)
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.prune_superseded_training_workouts(integer) from public, anon, authenticated;
grant execute on function public.prune_superseded_training_workouts(integer) to service_role;

notify pgrst, 'reload schema';
