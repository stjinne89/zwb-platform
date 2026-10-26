-- AI-opdrachten voor Claude (Anthropic).
--
-- OpenAI's Responses API heeft een background-modus: de app start een opdracht,
-- bewaart het response-id en haalt het antwoord later op. Claude heeft dat niet,
-- en een schema duurt daar minuten, terwijl een Netlify-functie na zo'n 30
-- seconden stopt. Daarom draait een Claude-aanroep in een Netlify-
-- achtergrondfunctie (netlify/functions/ai-job-background.mts), en houdt deze
-- tabel bij hoe ver hij is. Het id ("aij_" + id) staat waar eerst het response-id
-- van OpenAI stond, zodat de bestaande ophaal-code niet verandert.
--
-- * Alleen de server leest en schrijft (service role); geen policies.
-- * `request` (prompt en invoer, met ledendata) gaat leeg zodra de opdracht klaar
--   of mislukt is. Het antwoord staat daarna ook bij de functie die het gebruikt;
--   rijen ouder dan zeven dagen ruimt de achtergrondfunctie zelf op.

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  feature text not null check (feature in ('training', 'coach', 'pacing', 'nutrition')),
  model text not null,
  status text not null default 'queued'
    check (status in ('queued', 'in_progress', 'completed', 'failed')),
  request jsonb,
  output_text text,
  error text,
  usage jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists ai_jobs_created_idx on public.ai_jobs (created_at);

alter table public.ai_jobs enable row level security;
