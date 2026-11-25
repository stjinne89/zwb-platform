-- ZWBlokken in de Zwift-werelden: portalklimmen en korte sprongen opruimen.
--
-- Na 0364 lagen er nog blokken waar de kaart geen weg tekent. Gemeten
-- 2026-11-25 over alle Zwift-ritten van de club:
-- - Climb Portal-klimmen binnen de kaart. In France 25 blokken van hooguit twee
--   leden op het gras aan de westkant, in Watopia een rij aan de noordrand. Die
--   telden bewust mee; de eigenaar besloot op 2026-11-25 dat portalklimmen
--   nergens meetellen;
-- - sprongen korter dan 1,5 km, zoals ~600 m dwars door London;
-- - Strava's samenvattingslijn van lange ritten (een punt per ~1,6 km), waarvan
--   de rechte stukken het water tussen de eilanden van Watopia overstaken.
--
-- De code (src/lib/zwblokken/zwift.ts) slaat nu een stuk rit over dat bij de
-- portal begint of de kaart uit gaat, en ritten waarvan de naam een portalklim
-- noemt. Hij gebruikt de volledige routelijn als Strava die gaf, en knipt
-- daarin al bij 300 m. Over alle ritten: France 148 -> 99 blokken, Watopia
-- 220 -> 195, en geen enkel blok verdwijnt waar een bekende route doorheen loopt.
--
-- Zoals in 0364: alles opnieuw, de blokken weg en de cursor terug. De sync
-- rekent elke Zwift-rit opnieuw door, van oud naar nieuw.
--
-- VOLGORDE: pas toe nadat de nieuwe code live staat. Daarna
-- /api/zwblokken/backfill?zwift=1 herhalen tot `remaining` false is. Tot dan
-- zijn de Zwift-kaarten en -titels leeg of onvolledig.

delete from public.profile_zwift_blocks;

update public.strava_activities
  set zwift_blocks_processed_at = null
  where sport_type = 'VirtualRide';
