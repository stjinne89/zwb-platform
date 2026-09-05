-- Strava webhook events: de vervanging van het pollen.
--
-- Strava eist een 200 binnen 2 seconden op elk webhook-event en verwijdert de
-- subscription bij herhaald falen. Verwerken in de callback kan dus niet: de
-- route schrijft het event alleen weg en antwoordt meteen. Een aparte,
-- secret-gated verwerker (Netlify scheduled function, elke minuut) doet het werk.
-- Vandaar een echte eventtabel en geen fire-and-forget.
--
-- Beide tabellen krijgen RLS aan en GEEN policies: schrijven en lezen gebeurt
-- uitsluitend met de service-role (die RLS omzeilt), en /beheer/strava leest al
-- via createAdminClient(). Zelfde keuze en motivatie als bij migratie 0102.

-- Eén subscription per applicatie. We bewaren 'm zodat we het subscription_id op
-- binnenkomende events kunnen toetsen, en zodat /beheer/strava kan laten zien of
-- de koppeling met Strava nog staat.
create table if not exists public.strava_webhook_subscriptions (
  id bigint primary key,
  callback_url text not null,
  verify_token text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.strava_webhook_events (
  id bigserial primary key,
  subscription_id bigint,
  object_type text not null,           -- 'activity' | 'athlete'
  object_id bigint not null,           -- activity-id of athlete-id
  aspect_type text not null,           -- 'create' | 'update' | 'delete'
  owner_id bigint not null,            -- Strava athlete id van de eigenaar
  event_time timestamptz not null,
  updates jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts smallint not null default 0,
  last_error text
);

-- Strava levert bij een trage of mislukte response opnieuw af. Deze sleutel maakt
-- het insert-pad idempotent (insert ... on conflict do nothing) zodat een herlevering
-- niet tot dubbele verwerking leidt.
create unique index if not exists strava_webhook_events_dedupe_idx
  on public.strava_webhook_events (object_type, object_id, aspect_type, event_time);

-- Werklijst van de verwerker.
create index if not exists strava_webhook_events_todo_idx
  on public.strava_webhook_events (received_at)
  where processed_at is null;

alter table public.strava_webhook_subscriptions enable row level security;
alter table public.strava_webhook_events enable row level security;

notify pgrst, 'reload schema';
