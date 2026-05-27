-- Event-reminder push-notificaties (24u + 2u voor start).
--
-- 1. Voeg de opt-in toe aan notification_preferences (default aan — leden die
--    al RSVP yes/maybe op een event hebben staan willen meestal ook de
--    herinnering).
-- 2. Log-tabel om dubbele sends te voorkomen. Een (event_id, profile_id,
--    reminder_kind) krijgt maximaal 1 rij. De cron-route controleert deze
--    tabel voor elke kandidaat alvorens te versturen.
-- 3. Index op events.start_at voor snelle window-queries (events binnen
--    [now+90min, now+150min] / [now+23h, now+25h]).

alter table public.notification_preferences
  add column if not exists on_event_reminder boolean not null default true;

create table if not exists public.event_reminder_sends (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reminder_kind text not null check (reminder_kind in ('24h', '2h')),
  sent_at timestamptz not null default now(),
  primary key (event_id, profile_id, reminder_kind)
);

create index if not exists events_start_at_idx
  on public.events (start_at);

-- RLS: alleen service-role schrijft (via /api/events/reminders). Geen
-- lees-policy nodig — de log dient als interne admin/debug-trail.
alter table public.event_reminder_sends enable row level security;
