-- Agenda-abonnement: een persoonlijke ICS-link per lid (/api/agenda/<token>).
-- Google Agenda, Outlook en Apple Agenda halen die link zelf op, zonder sessie;
-- het token in het pad is de sleutel. Het staat onversleuteld, net als het
-- deeltoken van een TTT-plan (ttt_plans.share_token): het lid moet de link later
-- opnieuw kunnen kopiëren, en hij geeft alleen leestoegang tot de eigen agenda.
-- Intrekken = de rij verwijderen; een nieuwe link vervangt de oude.

create table if not exists public.calendar_feed_tokens (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  last_fetched_at timestamptz
);

alter table public.calendar_feed_tokens enable row level security;

drop policy if exists "calendar_feed_tokens_select_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_select_own" on public.calendar_feed_tokens
  for select to authenticated
  using (auth.uid() = profile_id);

drop policy if exists "calendar_feed_tokens_insert_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_insert_own" on public.calendar_feed_tokens
  for insert to authenticated
  with check (auth.uid() = profile_id);

drop policy if exists "calendar_feed_tokens_update_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_update_own" on public.calendar_feed_tokens
  for update to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "calendar_feed_tokens_delete_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_delete_own" on public.calendar_feed_tokens
  for delete to authenticated
  using (auth.uid() = profile_id);
