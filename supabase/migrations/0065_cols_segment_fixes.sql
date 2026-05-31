-- Correctie van enkele col-segmenten naar de juiste beklimmingskant. De eerder
-- (0064) via explore gekozen segmenten betroffen de verkeerde versant, waardoor
-- renners die de col van de andere kant beklommen geen segment-tijd kregen.
-- Deze ID's komen uit echte ZWB-segment-efforts (de gereden kant).

update public.cols set strava_segment_id = 1736961   where slug = 'col-de-la-croix-de-fer'; -- West side (D927)
update public.cols set strava_segment_id = 10123783  where slug = 'passo-dello-stelvio';     -- Bormio
update public.cols set strava_segment_id = 3974623   where slug = 'mont-ventoux';             -- via Bédoin
update public.cols set strava_segment_id = 7474038   where slug = 'col-d-ornon';              -- Bourg d'Oisans side
