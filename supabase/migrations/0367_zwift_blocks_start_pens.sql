-- ZWBlokken in de Zwift-werelden: startvakken en zeven blokken zonder weg weg.
--
-- Na 0366 zag de eigenaar nog foutjes, onder meer in Innsbruck, en dat hij zelf
-- een startvak niet had.
-- Gemeten 2026-11-25 over alle blokken zonder bekende route:
-- - zeven startvakken (France, London, Makuri, New York x2, Watopia,
--   Yorkshire): bijna elk lid met zo'n blok kreeg het van het eerste stuk van
--   zijn rit. In dezelfde ZRL-race in London starten vier leden in hetzelfde
--   vak; wie het blok krijgt, scheelt een paar meter in de plek in het vak;
-- - zes blokken van 3 tot 19 leden zonder route en zonder weg op de kaart
--   (London, Makuri, Paris, Watopia x3);
-- - in Innsbruck het gras naast het keerpunt bij het meer boven op de KOM (5
--   leden): ritten en routevorm snijden daar de hoek af.
-- Besluit eigenaar: startvakken tellen voor niemand, de rest mag weg. Ze
-- staan nu in NO_ROAD_BLOCKS (src/lib/zwblokken/zwift.ts).
--
-- Alleen deze veertien blokken weg; de rest van de tabel en de cursor blijven
-- staan. Pas toe nadat de code live staat.

delete from public.profile_zwift_blocks b
using (values
  ('france', 63015, 36818),
  ('innsbruck', 34847, 22993),
  ('london', 32754, 21790),
  ('london', 32739, 21794),
  ('makuri-islands', 62958, 34747),
  ('makuri-islands', 62957, 34741),
  ('new-york', 19300, 24633),
  ('new-york', 19300, 24634),
  ('paris', 33185, 22540),
  ('watopia', 63161, 34900),
  ('watopia', 63156, 34914),
  ('watopia', 63158, 34910),
  ('watopia', 63169, 34901),
  ('yorkshire', 32486, 21045)
) as v(world, x, y)
where b.world = v.world and b.x = v.x and b.y = v.y;
