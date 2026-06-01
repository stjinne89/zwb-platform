-- Tweede ronde col-segmenten: de juiste beklimmingskant op basis van echte
-- ZWB-segment-efforts (Galibier/Madeleine/Gavia) en explore-match voor de
-- Limburgse hellingen. Brengt de dekking op 48/50 cols.
--
-- Nog open: cote-du-maquisard (geen herkenbaar Strava-segment) en
-- passo-falzarego (geen betrouwbare naam-match) — later handmatig.

update public.cols set strava_segment_id = 21355204 where slug = 'col-du-galibier';      -- Télégraphe>Galibier (Maurienne)
update public.cols set strava_segment_id = 37468284 where slug = 'col-de-la-madeleine';  -- volledige klim
update public.cols set strava_segment_id = 25049136 where slug = 'passo-gavia';          -- vanaf Bormio
update public.cols set strava_segment_id = 23355245 where slug = 'vaalserberg';
update public.cols set strava_segment_id = 628031   where slug = 'keutenberg';
update public.cols set strava_segment_id = 1074096  where slug = 'eyserbosweg';
