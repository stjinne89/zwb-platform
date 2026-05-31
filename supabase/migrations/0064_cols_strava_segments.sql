-- Strava-segment-ID's voor cols, zodat /profiel/cols een PR-tijd + tijd-ranking
-- per col kan tonen. ID's opgehaald via de Strava segments/explore-API rond elke
-- top en gematcht op naam (canonieke/volledige beklimming, hoogste climb_category).
--
-- Nog open (geen betrouwbare naam-match gevonden, volgt later): passo-falzarego,
-- cote-du-maquisard, vaalserberg, keutenberg, eyserbosweg.
-- Te verfijnen: mont-ventoux (nu par Sault i.p.v. Bédoin),
-- col-du-soulor (segment loopt door tot Aubisque).

update public.cols set strava_segment_id = 37857683 where slug = 'mont-ventoux';
update public.cols set strava_segment_id = 36994954 where slug = 'col-du-galibier';
update public.cols set strava_segment_id = 37857789 where slug = 'col-de-la-croix-de-fer';
update public.cols set strava_segment_id = 37857767 where slug = 'col-d-izoard';
update public.cols set strava_segment_id = 7909147  where slug = 'passo-dello-stelvio';
update public.cols set strava_segment_id = 17625683 where slug = 'passo-pordoi';
update public.cols set strava_segment_id = 15183768 where slug = 'col-de-l-iseran';
update public.cols set strava_segment_id = 12952256 where slug = 'col-du-grand-saint-bernard';
update public.cols set strava_segment_id = 625479   where slug = 'madonna-del-ghisallo';
update public.cols set strava_segment_id = 653262   where slug = 'sa-calobra';
update public.cols set strava_segment_id = 18478849 where slug = 'col-du-soulor';
update public.cols set strava_segment_id = 9874898  where slug = 'col-de-peyresourde';
update public.cols set strava_segment_id = 37857720 where slug = 'col-d-aspin';
update public.cols set strava_segment_id = 38830996 where slug = 'cipressa';
update public.cols set strava_segment_id = 36908639 where slug = 'col-de-vars';
update public.cols set strava_segment_id = 9023430  where slug = 'col-d-ornon';
update public.cols set strava_segment_id = 18302488 where slug = 'col-de-la-madeleine';
update public.cols set strava_segment_id = 652851   where slug = 'alpe-d-huez';
update public.cols set strava_segment_id = 39492114 where slug = 'col-du-glandon';
update public.cols set strava_segment_id = 19322487 where slug = 'col-du-telegraphe';
update public.cols set strava_segment_id = 39492420 where slug = 'col-de-la-loze';
update public.cols set strava_segment_id = 647664   where slug = 'col-de-joux-plane';
update public.cols set strava_segment_id = 5170240  where slug = 'col-du-tourmalet';
update public.cols set strava_segment_id = 37857865 where slug = 'col-d-aubisque';
update public.cols set strava_segment_id = 18623173 where slug = 'passo-del-mortirolo';
update public.cols set strava_segment_id = 614727   where slug = 'passo-gavia';
update public.cols set strava_segment_id = 16888141 where slug = 'cote-de-wanne';
update public.cols set strava_segment_id = 15474001 where slug = 'col-du-mont-cenis';
update public.cols set strava_segment_id = 16838086 where slug = 'col-de-port-de-bales';
update public.cols set strava_segment_id = 626919   where slug = 'poggio-di-sanremo';
update public.cols set strava_segment_id = 617076   where slug = 'mur-de-huy';
update public.cols set strava_segment_id = 1269095  where slug = 'cote-de-la-redoute';
update public.cols set strava_segment_id = 893327   where slug = 'cote-de-stockeu';
update public.cols set strava_segment_id = 642136   where slug = 'cauberg';
update public.cols set strava_segment_id = 866472   where slug = 'camerig';
