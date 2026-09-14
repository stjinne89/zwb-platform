-- Uitslagtijden in duizendsten in plaats van hele seconden.
--
-- `time_seconds` en `segment_seconds` stonden als `int`. Dat leek genoeg — een
-- uitslag toont immers "22:42" — maar zo werkt een Zwift-uitslag niet: ZwiftPower
-- geeft één absolute tijd voor de leider en daarna alleen verschillen, en die
-- verschillen lopen in duizendsten. In de Crit Royale van editie 7 (seizoen
-- 2025/26) stonden acht renners van league A op dezelfde "22:42" met 0,6 seconde
-- ertussen; tussen de zevende en de achtste zat één duizendste.
--
-- Met een int-kolom werden die acht bij het opslaan allemaal 1362 en was het
-- verschil weg. De punten kloppen nog wel — die worden vóór het opslaan
-- uitgerekend, uit de geparseerde waarden — maar de opgeslagen uitslag kan het
-- daarna niet meer navertellen: de tijd op de publieke pagina toont acht keer
-- hetzelfde, en elke herberekening die ooit op tijd zou willen sorteren begint
-- met een gelijkspel dat er in werkelijkheid niet was.
--
-- numeric(9,3) houdt ruim 27 uur aan in duizendsten; ruim genoeg voor een
-- onderdeel van negentig minuten.

alter table public.omnium_results
  alter column time_seconds type numeric(9, 3) using time_seconds::numeric(9, 3);

alter table public.omnium_results
  alter column segment_seconds type numeric(9, 3) using segment_seconds::numeric(9, 3);

notify pgrst, 'reload schema';
