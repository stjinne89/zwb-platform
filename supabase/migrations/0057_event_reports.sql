-- Ritverslagen: meerdere verhalen per (voorbij) event + reacties van leden,
-- plus een cover-afbeelding per event voor de beeld-forward restyle.
--
-- Cover-afbeeldingen hergebruiken de bestaande publieke `event-photos`-bucket
-- onder pad `<event_id>/cover/…` (geen nieuwe bucket/RLS nodig).

alter table public.events
  add column if not exists cover_image_path text;

-- Eén lid kan een eigen verslag schrijven bij een event; meerdere per event.
create table if not exists public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body_md text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_reports_event_idx
  on public.event_reports (event_id, created_at desc);
create index if not exists event_reports_recent_idx
  on public.event_reports (created_at desc);

create table if not exists public.event_report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.event_reports(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists event_report_comments_report_idx
  on public.event_report_comments (report_id, created_at);

-- ---------- RLS (gespiegeld op post_comments) ----------

alter table public.event_reports enable row level security;
alter table public.event_report_comments enable row level security;

-- Verslagen: goedgekeurde leden lezen; auteur schrijft eigen; auteur of admin
-- update/verwijdert.
drop policy if exists "event_reports_select_approved" on public.event_reports;
create policy "event_reports_select_approved" on public.event_reports
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved)
  );

drop policy if exists "event_reports_insert_own" on public.event_reports;
create policy "event_reports_insert_own" on public.event_reports
  for insert to authenticated with check (
    auth.uid() = profile_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved)
  );

drop policy if exists "event_reports_update_own" on public.event_reports;
create policy "event_reports_update_own" on public.event_reports
  for update to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "event_reports_delete_own_or_admin" on public.event_reports;
create policy "event_reports_delete_own_or_admin" on public.event_reports
  for delete to authenticated using (
    auth.uid() = profile_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Reacties: goedgekeurde leden lezen; auteur schrijft; auteur of admin verwijdert.
drop policy if exists "event_report_comments_select_approved" on public.event_report_comments;
create policy "event_report_comments_select_approved" on public.event_report_comments
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved)
  );

drop policy if exists "event_report_comments_insert_own" on public.event_report_comments;
create policy "event_report_comments_insert_own" on public.event_report_comments
  for insert to authenticated with check (
    auth.uid() = profile_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved)
  );

drop policy if exists "event_report_comments_delete_own_or_admin" on public.event_report_comments;
create policy "event_report_comments_delete_own_or_admin" on public.event_report_comments
  for delete to authenticated using (
    auth.uid() = profile_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- updated_at bijhouden op verslagen (hergebruik bestaande touch-functie).
drop trigger if exists event_reports_touch_updated_at on public.event_reports;
create trigger event_reports_touch_updated_at
  before update on public.event_reports
  for each row execute function public.touch_updated_at();
