-- Bewaar naast de verse powercurve ook de vermoeide curves uit intervals.icu
-- (after_kj0/after_kj1), zodat "Mijn vermogen" en de coach-cockpit in dezelfde
-- vermoeidheidsstand met andere ZWB-profielen kunnen vergelijken.

alter table public.rider_power_profiles
  add column if not exists curve_points_fatigue jsonb not null default '[]'::jsonb;

alter table public.rider_power_profiles
  drop constraint if exists rider_power_profiles_curve_points_fatigue_array;

alter table public.rider_power_profiles
  add constraint rider_power_profiles_curve_points_fatigue_array
  check (jsonb_typeof(curve_points_fatigue) = 'array');

comment on column public.rider_power_profiles.curve_points_fatigue is
  'Vermoeide curves: [{afterKj, points: [{seconds, watts, wattsPerKg}]}].';
