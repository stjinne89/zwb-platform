-- Coördinaat-correctie Limburgse heuvels o.b.v. OpenStreetMap (de straten
-- zelf, betrouwbaar). Mijn eerdere schattingen zaten er flink naast:
--   Eyserbosweg ~3km (lengtegraad), Camerig ~1.5km, Keutenberg ~1.4km.
-- Mid-cluster van de OSM-straatpunten, met de 800m radius uit 0047 dekt
-- dat de hele (korte) klim.

update public.cols set summit_lat = 50.845500, summit_lon = 5.873800 where slug = 'keutenberg';
update public.cols set summit_lat = 50.827000, summit_lon = 5.931300 where slug = 'eyserbosweg';
update public.cols set summit_lat = 50.769100, summit_lon = 5.931300 where slug = 'camerig';
