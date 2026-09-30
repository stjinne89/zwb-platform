-- intervals.icu als ritbron voor leden zonder Strava-koppeling.
--
-- De ritten zelf landen in strava_activities (negatief id,
-- raw.import_source = 'intervals'); zie src/lib/intervals/rides.ts. Deze
-- migratie voegt alleen de boekhouding per koppeling toe.
--
-- last_synced_at bestond al sinds 0021 maar werd nooit geschreven; de
-- uurlijkse cron doet dat nu, en kiest er ook de volgorde mee.

alter table public.intervals_connections
  -- Laatste fout van de ritten-sync; leeg na een geslaagde run.
  add column if not exists last_ride_sync_error text,
  -- De eerste run haalt een jaar op; daarna alleen het venster van 30 dagen.
  add column if not exists rides_backfilled_at timestamptz,
  -- Herinnering "open intervals.icu even": een gratis account slaapt na 90
  -- dagen zonder bezoek in, en dan komen er geen ritten meer binnen.
  add column if not exists visit_confirmed_at timestamptz,
  add column if not exists visit_reminded_at timestamptz;

create index if not exists intervals_connections_last_synced_idx
  on public.intervals_connections (last_synced_at nulls first);

-- Push bij de herinnering. Default aan: het gaat om het lid zijn eigen ritten.
alter table public.notification_preferences
  add column if not exists on_intervals_visit_reminder boolean not null default true;

notify pgrst, 'reload schema';
