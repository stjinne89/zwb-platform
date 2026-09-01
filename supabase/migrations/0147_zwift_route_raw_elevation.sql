-- Ruwe hoogtemeters naast de gesmoothde.
--
-- Na de eerste vulling van de routebibliotheek bleek het verschil met
-- `zwift-data` groter dan verwacht: op rollende routes zo'n 35 % minder
-- hoogtemeters (Bon Voyage 83 om 132, Douce France 78 om 133). Op een lange
-- aaneengesloten klim is er geen verschil (Road to Sky 1043 om 1044).
--
-- Dat patroon past bij het vermoeden dat zwift-data de ruwe optelsom van
-- ZwiftInsider overneemt en wij eerst smoothen. Maar vermoeden is geen weten, en
-- het verschil is groot genoeg om erover te willen beslissen in plaats van het
-- te laten gebeuren. Door de ongesmoothde som ernaast te bewaren is in beheer af
-- te lezen welke van de twee waarden ons smoothing-venster wegneemt, en of dat
-- klopt.
--
-- Alleen diagnostiek: het pacingmodel rekent met de gradiënten uit het
-- gesmoothde profiel, niet met dit getal.

alter table public.zwift_routes
  add column if not exists profile_raw_elevation_m numeric(7, 1);
