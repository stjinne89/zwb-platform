-- Mijn garage: fietstype per fiets, en slijtage die ook in tijd gemeten kan
-- worden.
--
-- Waarom tijd erbij: remvloeistof trekt water aan of je nu rijdt of niet,
-- stuurlint gaat kapot van zweet en vering wordt door de fabrikant in
-- draaiuren voorgeschreven. Draaiuren kunnen we niet berekenen — ritten hangen
-- nergens aan een fiets — dus die zijn omgerekend naar maanden. Zie
-- docs/onderhoud-per-fietstype.md.

-- 1. Fietstype. Bepaalt welke onderdelen de garage voorstelt en met welke
--    drempels. Bij de Strava-sync gegokt uit de gearnaam, altijd door het lid
--    te corrigeren.
alter table public.strava_bikes
  add column if not exists discipline text not null default 'race'
    check (discipline in ('race', 'gravel', 'mtb', 'indoor', 'stad', 'overig'));

-- 2. Handmatige fietsen hebben geen Strava-kilometerstand. Zonder eigen teller
--    staat hun slijtage eeuwig op nul, en juist de binnenfiets en de tweede mtb
--    staan vaak niet in Strava.
alter table public.strava_bikes
  add column if not exists manual_distance_m numeric(12, 2) not null default 0;

-- 3. Slijtagemaat per onderdeel. threshold_km blijft bestaan zodat oude code en
--    bestaande rijen niet omvallen; threshold_value is voortaan leidend.
alter table public.bike_components
  add column if not exists wear_metric text not null default 'km'
    check (wear_metric in ('km', 'months'));

alter table public.bike_components
  add column if not exists threshold_value int;

update public.bike_components
   set threshold_value = threshold_km
 where threshold_value is null;

alter table public.bike_components
  alter column threshold_value set not null;

alter table public.bike_components
  add constraint bike_components_threshold_value_positive
    check (threshold_value > 0) not valid;

notify pgrst, 'reload schema';
