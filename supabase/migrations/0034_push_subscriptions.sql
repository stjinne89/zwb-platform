-- Web Push subscriptions per ledenprofiel (device-bound).
--
-- Een gebruiker kan meerdere subscriptions hebben (desktop + Android +
-- iPhone bv.) — daarom geen unique op profile_id, maar wel op endpoint
-- (de browser/device-unieke push-URL).
--
-- Subscriptions worden door de browser geleverd; wij slaan endpoint + keys
-- (p256dh, auth) op. Bij send-fail met 410/404 ruimen we 'm op.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_profile_idx
  on public.push_subscriptions (profile_id);

-- ──────────────────────────────────────────────────────────────────────
-- Notification preferences (welke triggers wil je ontvangen)
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  on_new_event boolean not null default true,
  on_live_started boolean not null default true,
  on_new_badge boolean not null default false,
  on_admin_broadcast boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — alleen eigen subscriptions/preferences
-- ──────────────────────────────────────────────────────────────────────

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "push_subscriptions_own_all" on public.push_subscriptions;
create policy "push_subscriptions_own_all" on public.push_subscriptions
  for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "notification_preferences_own_all" on public.notification_preferences;
create policy "notification_preferences_own_all" on public.notification_preferences
  for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
