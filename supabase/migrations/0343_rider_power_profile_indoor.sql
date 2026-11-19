-- De indoorcurve naast de volledige curve: dezelfde 90 dagen uit intervals.icu,
-- alleen over ritten binnen (trainer, Zwift). Op het ladderadvies, de matchup,
-- de teampagina's en de indeling kan een lid zo kiezen tussen alles en indoor;
-- het verschil tussen binnen en buiten is het punt (keuze eigenaar 2026-11-19).
--
-- Eén jsonb-kolom en geen veertien losse: dezelfde sleutels als de kolommen
-- van de volledige curve (watts_15s … watts_20m, wkg_15s … wkg_20m,
-- rider_type), zodat een pagina de rij in indoorstand alleen hoeft om te
-- wisselen. Leeg tot de volgende sync (knop op Teams of de wekelijkse job).

alter table public.rider_power_profiles
  add column if not exists indoor_profile jsonb;

comment on column public.rider_power_profiles.indoor_profile is
  'Beste watt en W/kg per duur over 90 dagen, alleen indoorritten (intervals.icu-filter indoor); zelfde sleutels als de kolommen van de volledige curve.';

notify pgrst, 'reload schema';
