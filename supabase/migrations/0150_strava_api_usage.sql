-- Rate-limit-budget dat een koude serverless-invocatie overleeft.
--
-- Strava's limieten gelden per applicatie, niet per gebruiker. De app las de
-- x-ratelimit-headers tot nu toe alleen in de summary-writer, en omdat elke
-- cronrun koud start was er geen enkel geheugen van het verbruik van de vorige
-- run. Een dagbudget bewaken was daarmee principieel onmogelijk.
--
-- Eén rij (id = 'strava'), overschreven bij elke waargenomen response. Geen
-- historie: we willen alleen weten of we nu mogen doorgaan.

create table if not exists public.strava_api_usage (
  id text primary key,
  short_term_used int,
  short_term_limit int,
  daily_used int,
  daily_limit int,
  observed_at timestamptz not null default now()
);

alter table public.strava_api_usage enable row level security;

notify pgrst, 'reload schema';
