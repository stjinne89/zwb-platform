-- Volledige coördinaat-audit van de col-database. Veel seed-waarden (uit
-- het hoofd ingevoerd) zaten honderden meters tot meerdere km naast de
-- echte top, waardoor de detector ze miste. Hieronder per col gecorrigeerd
-- tegen Wikipedia / latitude.to / officiële bronnen.
--
-- Grote correcties: Mortirolo (~3.3km), Col de la Loze (~2.9km),
-- Joux Plane (~3.5km), Port de Balès (~4.6km), Stockeu (~7km),
-- Camerig (~3km), Mont Cenis (~1.7km), Mur de Huy (~0.9km).

-- ── Franse Alpen ────────────────────────────────────────────────────
update public.cols set summit_lat = 45.092600, summit_lon = 6.068300 where slug = 'alpe-d-huez';
update public.cols set summit_lat = 45.239600, summit_lon = 6.175600 where slug = 'col-du-glandon';
update public.cols set summit_lat = 45.202600, summit_lon = 6.444500 where slug = 'col-du-telegraphe';
update public.cols set summit_lat = 45.406200, summit_lon = 6.613500 where slug = 'col-de-la-loze';
update public.cols set summit_lat = 46.132800, summit_lon = 6.711400 where slug = 'col-de-joux-plane';
update public.cols set summit_lat = 45.256100, summit_lon = 6.900800 where slug = 'col-du-mont-cenis';

-- ── Pyreneeën ───────────────────────────────────────────────────────
update public.cols set summit_lat = 42.904800, summit_lon = 0.141000 where slug = 'col-du-tourmalet';
update public.cols set summit_lat = 42.976500, summit_lon = -0.339700 where slug = 'col-d-aubisque';
update public.cols set summit_lat = 42.871200, summit_lon = 0.500500 where slug = 'col-de-port-de-bales';

-- ── Italië ──────────────────────────────────────────────────────────
update public.cols set summit_lat = 46.248000, summit_lon = 10.299100 where slug = 'passo-del-mortirolo';
update public.cols set summit_lat = 46.339500, summit_lon = 10.486200 where slug = 'passo-gavia';
update public.cols set summit_lat = 43.823600, summit_lon = 7.790300 where slug = 'poggio-di-sanremo';

-- ── Belgische Ardennen ──────────────────────────────────────────────
update public.cols set summit_lat = 50.515500, summit_lon = 5.246700 where slug = 'mur-de-huy';
update public.cols set summit_lat = 50.490600, summit_lon = 5.705300 where slug = 'cote-de-la-redoute';
update public.cols set summit_lat = 50.401000, summit_lon = 5.924000 where slug = 'cote-de-stockeu';

-- ── Limburg / NL ────────────────────────────────────────────────────
update public.cols set summit_lat = 50.857400, summit_lon = 5.822100 where slug = 'cauberg';
update public.cols set summit_lat = 50.754900, summit_lon = 6.019900 where slug = 'vaalserberg';
update public.cols set summit_lat = 50.850300, summit_lon = 5.856700 where slug = 'keutenberg';
update public.cols set summit_lat = 50.820000, summit_lon = 5.886100 where slug = 'eyserbosweg';
update public.cols set summit_lat = 50.772000, summit_lon = 5.947000 where slug = 'camerig';

-- Ruimere radius voor de korte lokale/Belgische klimmen waar onze top-
-- coördinaat een schatting is (bronnen geven vaak dorps- i.p.v. klim-top).
-- 800m absorbeert de onzekerheid; deze klimmen liggen geïsoleerd genoeg
-- in het wegennet om false-positives beperkt te houden.
update public.cols set detection_radius_m = 800
  where slug in (
    'keutenberg', 'eyserbosweg', 'camerig', 'cauberg', 'vaalserberg',
    'cote-de-stockeu', 'cote-de-wanne', 'cote-du-maquisard',
    'cote-de-la-redoute', 'mur-de-huy'
  );
