-- Watopia (Zwift) cols. Zwift-ritten krijgen virtuele GPS-coördinaten in
-- Watopia, gemapt op Teanu-eiland (Salomonseilanden). Die zitten in de
-- summary_polyline van VirtualRide-activities, dus dezelfde col-detector
-- werkt — mits we de juiste summit-coördinaten hebben.
--
-- We kennen de coördinaten niet vooraf, maar wél de Strava-segment-ID per
-- klim (uit het zwift-data package). De coördinaten worden zelf-kalibrerend
-- opgehaald via de Strava segment-API (end_latlng = top) bij de eerstvolgende
-- Strava-sync — zie src/lib/cols/watopia.ts. Daarom seeden we met NULL
-- coördinaten en maken we de kolommen nullable.

-- 1. Coördinaten nullable maken (voor uncalibrated virtual cols)
alter table public.cols alter column summit_lat drop not null;
alter table public.cols alter column summit_lon drop not null;

-- 2. virtual-flag — onderscheidt Watopia van echte cols
alter table public.cols
  add column if not exists virtual boolean not null default false;

-- 3. Seed Watopia-klimmen (forward-varianten, geen -rev duplicaten).
--    summit_lat/lon NULL → worden gekalibreerd via Strava segment-API.
--    detection_radius_m klein (250m) want klimmen liggen dicht op elkaar
--    op Teanu.
insert into public.cols
  (slug, name, country, region, summit_lat, summit_lon, summit_elevation_m, ascent_m, category, detection_radius_m, virtual, strava_segment_id)
values
  ('zwift-alpe-du-zwift', 'Alpe du Zwift', 'ZW', 'Watopia', null, null, 1076, 1036, 'HC', 250, true, 17267489),
  ('zwift-epic-kom', 'Epic KOM', 'ZW', 'Watopia', null, null, null, 387, 'C2', 250, true, 16784833),
  ('zwift-the-grade-kom', 'The Grade KOM', 'ZW', 'Watopia', null, null, 305, 305, 'C2', 250, true, 37033150),
  ('zwift-volcano-kom', 'Volcano KOM', 'ZW', 'Watopia', null, null, null, 120, 'C4', 250, true, 14270131),
  ('zwift-titans-grove-kom', 'Titans Grove KOM', 'ZW', 'Watopia', null, null, null, 57, 'local', 250, true, 21343975),
  ('zwift-kom', 'Zwift KOM', 'ZW', 'Watopia', null, null, null, 45, 'local', 250, true, 12109030),
  ('zwift-radio-tower-kom', 'Radio Tower KOM', 'ZW', 'Watopia', null, null, null, 155, 'C3', 250, true, 14120182),
  ('zwift-itza-kom', 'Itza KOM', 'ZW', 'Watopia', null, null, 95, 75, 'local', 250, true, 37039571),
  ('zwift-mayan-mountainside-kom', 'Mayan Mountainside KOM', 'ZW', 'Watopia', null, null, 62, 62, 'local', 250, true, 37049451),
  ('zwift-jarvis-kom', 'Jarvis KOM', 'ZW', 'Watopia', null, null, null, 32, 'local', 250, true, 38138480)
on conflict (slug) do nothing;
