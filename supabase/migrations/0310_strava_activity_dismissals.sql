-- Een dubbele opname zelf weghalen.
--
-- Wie een rit met Zwift én een horloge of fietscomputer opneemt, krijgt in
-- Strava twee activiteiten. Beide komen hier binnen en tellen dubbel mee in
-- belasting, schema en statistieken. Alleen een handmatig ingevoerde rit kon het
-- lid zelf verwijderen; een rit uit Strava of intervals.icu niet, en die zou ook
-- terugkomen: de sync haalt het venster van de laatste dagen telkens opnieuw op
-- en upsert op id.
--
-- Daarom een eigen tabel: de rit gaat weg uit strava_activities, de id blijft
-- hier staan, en elk schrijfpad (Strava-sync, webhook, historie, intervals.icu,
-- CSV-import) slaat die id's over. Een kolom op strava_activities zou dat niet
-- doen: dan moest elke lezer van die tabel de rit wegfilteren.
--
-- Lezen alleen het lid zelf (de CSV-import draait met de sessie van het lid).
-- Schrijven alleen de server met de service role, na de controle dat het om een
-- eigen rit gaat die een andere rit overlapt.

create table if not exists public.strava_activity_dismissals (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_id bigint not null,
  dismissed_at timestamptz not null default now(),
  primary key (profile_id, activity_id)
);

alter table public.strava_activity_dismissals enable row level security;

revoke all on public.strava_activity_dismissals from anon;
revoke insert, update, delete on public.strava_activity_dismissals from authenticated;
grant select on public.strava_activity_dismissals to authenticated;

drop policy if exists "strava_activity_dismissals_select_own" on public.strava_activity_dismissals;
create policy "strava_activity_dismissals_select_own" on public.strava_activity_dismissals
  for select to authenticated
  using ((select auth.uid()) = profile_id);

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select tablename, rowsecurity from pg_tables where tablename = 'strava_activity_dismissals';
-- select policyname, cmd from pg_policies where tablename = 'strava_activity_dismissals';
