-- Weekoverzicht: per lid per week één terugblik, getoond als pop-up op
-- zondagavond (wens eigenaar, 2026-10-18).
--
-- `summary` is de samenvatting zoals src/lib/weekly-review/summary.ts hem
-- uitrekent op het moment dat het lid de pop-up voor het eerst opent. Bewaard,
-- zodat de terugblik niet verschuift als er later nog een rit binnenkomt, en de
-- AI-tekst bij de cijfers blijft passen. De vooruitblik (beschikbaarheid,
-- events) wordt níet bewaard: die verandert juist als het lid hem aanpast.
--
-- De coachtekst loopt in de achtergrond bij OpenAI, net als de coachchat:
-- `coach_status` 'pending' met een `coach_response_id`, en de eerstvolgende
-- lezing haalt hem op. 'rules' is de tekst uit vaste regels, voor leden die
-- ZWBeter niet voor hun training gebruiken of als de AI faalde.
--
-- Alleen het lid leest de eigen rijen; schrijven gaat via de service role.

create table if not exists public.weekly_reviews (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  summary jsonb not null check (jsonb_typeof(summary) = 'object'),
  coach_text text,
  coach_status text not null default 'rules'
    check (coach_status in ('rules', 'pending', 'done', 'failed')),
  coach_response_id text,
  coach_model text,
  coach_started_at timestamptz,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, week_start)
);

alter table public.weekly_reviews enable row level security;

revoke all on public.weekly_reviews from anon, authenticated;
grant select on public.weekly_reviews to authenticated;
grant all on public.weekly_reviews to service_role;

drop policy if exists "weekly_reviews_self_read" on public.weekly_reviews;
create policy "weekly_reviews_self_read" on public.weekly_reviews
  for select to authenticated
  using (profile_id = (select auth.uid()));

-- Controle na toepassen:
-- select count(*) from public.weekly_reviews;                       -- 0
-- select relrowsecurity from pg_class where relname = 'weekly_reviews'; -- true
