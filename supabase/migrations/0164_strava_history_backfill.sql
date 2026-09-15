-- Volledige Strava-historie: de koppeling haalde tot nu toe ritten tot vijf jaar
-- terug op. De inhaalslag in src/lib/strava/history-backfill.ts haalt de rest,
-- één pagina per run, en onthoudt per koppeling hoe ver hij is.
--
-- history_before: Strava's `before`-cursor, de starttijd van de oudste activiteit
--   die de inhaalslag voor dit lid heeft gezien (ook niet-fietsritten, anders
--   blijft hij op een pagina vol hardloopjes hangen). Null = nog niet begonnen;
--   dan start hij bij de oudste rit die de gewone sync al binnenhaalde.
-- history_complete_at: Strava gaf een onvolle pagina terug, er is niets ouder.
--
-- Opnieuw laten lopen voor iedereen:
--   update public.strava_connections set history_before = null, history_complete_at = null;

alter table public.strava_connections
  add column if not exists history_before timestamptz,
  add column if not exists history_complete_at timestamptz;

notify pgrst, 'reload schema';
