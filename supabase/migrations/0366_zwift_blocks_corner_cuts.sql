-- ZWBlokken in de Zwift-werelden: twaalf losse blokken naast de weg weg.
--
-- Na 0365 bleven buiten Watopia twaalf blokken over van hooguit twee leden
-- zonder bekende route erdoor: een grove routelijn (vaak een intervals.icu-
-- import met ~500 punten) die net de hoek van een blok naast de weg afsnijdt.
-- De eigenaar bekeek ze op 2026-11-25 op de kaart: "Al deze rode blokken mogen
-- weg, allemaal net kleine route fouten". Ze staan nu in NO_ROAD_BLOCKS
-- (src/lib/zwblokken/zwift.ts), dus de sync legt ze niet opnieuw neer.
--
-- Alleen deze blokken weg; de rest van de tabel en de cursor blijven staan.
-- Pas toe nadat de code live staat.

delete from public.profile_zwift_blocks b
using (values
  ('france', 63014, 36819),
  ('innsbruck', 34841, 22979),
  ('innsbruck', 34843, 22977),
  ('innsbruck', 34844, 22976),
  ('innsbruck', 34845, 22989),
  ('london', 32744, 21791),
  ('london', 32752, 21795),
  ('new-york', 19298, 24631),
  ('new-york', 19301, 24623),
  ('paris', 33189, 22541),
  ('paris', 33189, 22542),
  ('scotland', 31817, 20521)
) as v(world, x, y)
where b.world = v.world and b.x = v.x and b.y = v.y;
