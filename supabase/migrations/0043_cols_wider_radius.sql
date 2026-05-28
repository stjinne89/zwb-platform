-- Ruimere detection-radii voor de col-detector.
--
-- De detector matcht nu op lijnsegment-afstand (niet losse polyline-punten),
-- maar Strava's summary_polyline blijft gedecimeerd en onze summit-coords
-- hebben wat onnauwkeurigheid. Ruimere radii voorkomen dat echte
-- beklimmingen gemist worden:
--   - Hoge bergcols (HC/C1/C2) staan geïsoleerd → 1500m geeft geen
--     false-positives (je komt niet binnen 1.5km van de top zonder te
--     klimmen).
--   - Kleinere cols (C3/C4) → 700m.
--   - Lokale heuvels (Limburg/Ardennen) → 500m; dichter wegennet dus
--     tighter, maar segment-detectie houdt 't accuraat.

update public.cols set detection_radius_m = 1500
  where category in ('HC', 'C1', 'C2');

update public.cols set detection_radius_m = 700
  where category in ('C3', 'C4');

update public.cols set detection_radius_m = 500
  where category = 'local' or category is null;
