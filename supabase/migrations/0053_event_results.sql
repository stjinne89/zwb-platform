-- Uitslagen-scraper voor kalender-events (Gran Fondos, toertochten, wegwedstrijden).
-- Op een event kan een uitslag-URL (timing-site) worden ingevuld; een admin
-- klikt "Uitslag ophalen" en we cachen de gescrapte ZWB-uitslagen hier.

alter table public.events
  add column if not exists results_url text,
  add column if not exists last_results_scrape_at timestamptz,
  add column if not exists results_scrape_error text;

create table if not exists public.event_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  -- null = ZWB-vermelding zonder matchend lid (gast / lid buiten de DB)
  profile_id uuid references public.profiles(id) on delete set null,
  scraped_name text not null,            -- naam zoals in de uitslag
  position int,                          -- klassering (null als onbekend)
  time_text text,                        -- ruwe tijd-string ("3:42:18")
  time_seconds int,                      -- genormaliseerd voor sortering
  matched_via text not null,             -- 'member_name'|'strava_name'|'roster'|'zwb_mention'
  created_at timestamptz not null default now()
);

create index if not exists event_results_event_idx
  on public.event_results (event_id, position);

alter table public.event_results enable row level security;

-- Leden (goedgekeurd) mogen uitslagen lezen.
drop policy if exists "event_results_select_approved" on public.event_results;
create policy "event_results_select_approved"
  on public.event_results for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

-- Writes verlopen via service-role (server-action), niet via anon/auth-client.
-- Geen insert/update/delete policy = standaard geweigerd voor gewone clients.
