-- Blinde vergelijking AI tegen regelmotor: per opgeslagen AI-generatie kiest een
-- trainer welk van twee schema's beter is, zonder te weten welk van wie is.
--
-- * Het schema van de motor wordt niet opgeslagen: generateEnginePlan() is
--   deterministisch en wordt op de pagina opnieuw uitgerekend uit prompt_summary.
-- * winner is het oordeel na ontblinding ('ai', 'engine' of 'gelijk');
--   engine_side legt vast of de motor als A of B getoond werd, zodat een latere
--   wijziging van de volgorde de oude oordelen niet scheef trekt.
-- * Eén oordeel per trainer per generatie.
-- * profile_id is het lid van de generatie: daarop rust de schrijfregel, net als
--   bij de andere trainingstabellen (0205).

create table if not exists public.training_engine_comparisons (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.training_ai_generations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  winner text not null check (winner in ('ai', 'engine', 'gelijk')),
  engine_side text not null check (engine_side in ('a', 'b')),
  reason text check (reason is null or char_length(reason) <= 280),
  created_at timestamptz not null default now(),
  unique (generation_id, trainer_id)
);

create index if not exists training_engine_comparisons_trainer_idx
  on public.training_engine_comparisons (trainer_id, created_at desc);

-- Voor de cascade bij het verwijderen van een lid (foreign key zonder index).
create index if not exists training_engine_comparisons_profile_idx
  on public.training_engine_comparisons (profile_id);

alter table public.training_engine_comparisons enable row level security;

drop policy if exists "training_engine_comparisons_select" on public.training_engine_comparisons;
create policy "training_engine_comparisons_select" on public.training_engine_comparisons
  for select to authenticated
  using (
    trainer_id = (select auth.uid())
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_engine_comparisons_insert" on public.training_engine_comparisons;
create policy "training_engine_comparisons_insert" on public.training_engine_comparisons
  for insert to authenticated
  with check (
    trainer_id = (select auth.uid())
    and public.current_user_can_train_profile(profile_id)
  );
