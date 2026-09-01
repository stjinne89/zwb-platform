-- Pacingplannen per lid per event, plus de AI-generaties die eraan voorafgaan.
--
-- Twee tabellen om dezelfde reden als bij de trainingsschema's: de generatie is
-- een langlopende, falende, herhaalbare bewerking met een volledige prompt erin,
-- het plan is het resultaat waar het lid mee werkt. Die door elkaar halen maakt
-- van elke mislukte AI-call een kapot plan.
--
-- Privacy. Een pacingplan zegt meer over een lid dan de w/kg die via
-- `rider_power_profiles` al clubbreed zichtbaar is: het legt ook tactiek en
-- zwakke punten bloot. Delen is daarom opt-in per plan (`shared`), en de
-- persoonlijke notities gaan nooit mee — die filtert de leeslaag eruit.
-- De generatie-rij blijft altijd privé: daar zit de hele prompt in, inclusief
-- vorm- en wellnessdata.

create table if not exists public.event_pacing_plans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  unique (event_id, profile_id),

  source text not null default 'baseline'
    check (source in ('ai', 'baseline', 'manual')),

  -- De planstukken: [{startKm, endKm, targetWkg, label, effort, rationale, accentId}]
  segments jsonb not null default '[]'::jsonb,
  -- Waar het plan op gebaseerd was. Een route kan later opnieuw gesynchroniseerd
  -- worden; dan hoort het lid te zien dat zijn plan van een ander profiel uitging.
  route_snapshot jsonb,
  -- CP, W', FTP, gewicht en de bron daarvan op het moment van berekenen. Wijkt
  -- dit af van de huidige waarden, dan is het plan verouderd — zichtbaar, en
  -- alleen te verversen op de knop van het lid.
  assumptions jsonb,
  -- Doorgerekende uitkomst: tijd, gemiddeld vermogen, W'-verloop, doorkomsten.
  summary jsonb,

  notes text,
  shared boolean not null default false,

  ai_generation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_pacing_plans_event_idx
  on public.event_pacing_plans (event_id);
create index if not exists event_pacing_plans_shared_idx
  on public.event_pacing_plans (event_id) where shared;

create table if not exists public.event_pacing_generations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  model text not null,
  status text not null default 'queued'
    check (status in ('queued', 'in_progress', 'completed', 'failed', 'cancelled')),
  openai_response_id text,
  -- De volledige JSON-invoer, zoals training_ai_generations.prompt_summary.
  prompt_summary text,
  prompt_text text,
  response_json jsonb,
  error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_pacing_generations_lookup_idx
  on public.event_pacing_generations (profile_id, event_id, created_at desc);

alter table public.event_pacing_plans
  drop constraint if exists event_pacing_plans_generation_fk;
alter table public.event_pacing_plans
  add constraint event_pacing_plans_generation_fk
  foreign key (ai_generation_id)
  references public.event_pacing_generations(id) on delete set null;

-- ──────────────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────────────

alter table public.event_pacing_plans enable row level security;

drop policy if exists "event_pacing_plans_read" on public.event_pacing_plans;
create policy "event_pacing_plans_read" on public.event_pacing_plans
  for select to authenticated
  using (profile_id = auth.uid() or shared);

drop policy if exists "event_pacing_plans_insert" on public.event_pacing_plans;
create policy "event_pacing_plans_insert" on public.event_pacing_plans
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "event_pacing_plans_update" on public.event_pacing_plans;
create policy "event_pacing_plans_update" on public.event_pacing_plans
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "event_pacing_plans_delete" on public.event_pacing_plans;
create policy "event_pacing_plans_delete" on public.event_pacing_plans
  for delete to authenticated
  using (profile_id = auth.uid());

alter table public.event_pacing_generations enable row level security;

-- Geen `shared`-uitzondering: hier staat de hele prompt in.
drop policy if exists "event_pacing_generations_own" on public.event_pacing_generations;
create policy "event_pacing_generations_own" on public.event_pacing_generations
  for select to authenticated
  using (profile_id = auth.uid());
