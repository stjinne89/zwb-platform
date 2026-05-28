-- Zwift/Watopia-badges op auto na de col-detector + Watopia-kalibratie.
--   A083 Alpe du Zwift  → bronze (finish) + platinum (25×) auto via
--                         virtuele col-detectie. Silver/gold (sub 75/60 min)
--                         blijven feitelijk onbehaald via auto (tijd-data
--                         ontbreekt), maar de badge-bron is 'auto'.
--   A090 Virtual Everesting → hoogtemeters in één VirtualRide.
--
-- A082 Zwift Route Hunter blijft 'manual' — gaat over aantal unieke routes,
-- niet detecteerbaar uit summary-data.

update public.achievement_badges
set trigger_source = 'auto'
where kind = 'milestone'
  and achievement_code in ('A083', 'A090');
