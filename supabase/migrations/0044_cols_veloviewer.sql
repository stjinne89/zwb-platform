-- VeloViewer-deeplinks per col. VeloViewer toont een segment op
-- https://veloviewer.com/segments/{strava_segment_id} — dezelfde ID als
-- Strava's segment-ID.
--
-- Kolom is nullable: niet voor elke col kennen we (nog) een betrouwbare
-- segment-ID. De UI valt terug op een VeloViewer-zoekopdracht zolang de
-- ID ontbreekt, en linkt direct zodra 'ie is ingevuld (via migratie of
-- admin-UI later).

alter table public.cols
  add column if not exists strava_segment_id bigint;
