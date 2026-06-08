-- Bewaar naast de vaste teamselectiewaarden ook de volledige, compacte
-- 90-daagse Intervals powercurve voor vergelijkingen in Mijn vermogen.

alter table public.rider_power_profiles
  add column if not exists curve_points jsonb not null default '[]'::jsonb;

alter table public.rider_power_profiles
  drop constraint if exists rider_power_profiles_curve_points_array;

alter table public.rider_power_profiles
  add constraint rider_power_profiles_curve_points_array
  check (jsonb_typeof(curve_points) = 'array');

comment on column public.rider_power_profiles.curve_points is
  'Compacte powercurve: [{seconds, watts, wattsPerKg}], zonder activiteitsdetails.';
