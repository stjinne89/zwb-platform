-- ZWBlokken in de Zwift-werelden: het meer naast de klim naar Ven-Top weg.
--
-- De eigenaar zag na 0367 nog een foutje op de klim naar Ven-Top in France. Van
-- zeven twijfelblokken op die klim koos hij op 2026-11-25 alleen 63030/36813
-- (3 leden): het meer naast de weg, die alleen de hoek raakt. Het staat nu in
-- NO_ROAD_BLOCKS (src/lib/zwblokken/zwift.ts).
--
-- Alleen dit blok weg. Pas toe nadat de code live staat.

delete from public.profile_zwift_blocks
where world = 'france' and x = 63030 and y = 36813;
