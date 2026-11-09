-- AI-verbruik per lid (fase 0 van ZWBrandstof, 2026-11-09).
--
-- Voordat er een muntsysteem komt, wil het bestuur weten waar het AI-geld heen
-- gaat: per lid, per soort aanroep, en of het lid er zelf om vroeg of dat de app
-- het deed. ai_jobs (0275) kan dat niet: de rijen weten niet van wie ze zijn en
-- gaan na zeven dagen weg. Zie src/lib/ai/usage.ts en /beheer/ai-verbruik.
--
-- * Eén rij per Claude-aanroep, geschreven door de server (service role). Geen
--   policies: alleen de beheerpagina leest, met de service role, na een check
--   op het recht.
-- * Geen prompt, geen antwoord: alleen lid, soort, herkomst, model, tokens en
--   kosten. Wordt een lid verwijderd, dan blijft de regel staan zonder lid, zodat
--   de clubtotalen kloppen.
-- * Rijen ouder dan dertien maanden ruimt de app zelf op (claude.ts), zodat een
--   heel jaar te vergelijken is.

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  profile_id uuid references public.profiles(id) on delete set null,
  feature text not null,
  kind text not null,
  trigger text not null check (trigger in ('member', 'follow_up', 'automatic')),
  model text not null,
  stop_reason text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  -- Lijstprijs op het moment van de aanroep; null bij een model zonder prijs.
  cost_usd numeric(10, 5)
);

create index if not exists ai_usage_created_idx on public.ai_usage (created_at);
create index if not exists ai_usage_profile_created_idx on public.ai_usage (profile_id, created_at);

alter table public.ai_usage enable row level security;

revoke all on table public.ai_usage from anon, authenticated;
