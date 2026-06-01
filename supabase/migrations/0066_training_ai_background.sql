-- Allow long-running OpenAI training drafts to be tracked asynchronously.

alter table public.training_ai_generations
  add column if not exists openai_response_id text,
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.training_ai_generations
  drop constraint if exists training_ai_generations_status_check;

alter table public.training_ai_generations
  add constraint training_ai_generations_status_check
  check (status in ('queued','in_progress','completed','failed','cancelled'));

create unique index if not exists training_ai_generations_openai_response_id_unique
  on public.training_ai_generations (openai_response_id)
  where openai_response_id is not null;

create index if not exists training_ai_generations_profile_status_idx
  on public.training_ai_generations (profile_id, status, created_at desc);

create unique index if not exists training_plans_ai_generation_id_unique
  on public.training_plans (ai_generation_id)
  where ai_generation_id is not null;

drop trigger if exists training_ai_generations_touch on public.training_ai_generations;
create trigger training_ai_generations_touch
  before update on public.training_ai_generations
  for each row execute function public.touch_training_updated_at();
