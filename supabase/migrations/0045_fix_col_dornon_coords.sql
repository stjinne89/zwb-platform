-- Coördinaat-correctie Col d'Ornon. De seed-waarde (44.9886, 5.9844) zat
-- ~1,9 km naast de echte top, waardoor de col-detector 'm zelfs met de
-- 1500m-radius miste. Echte summit volgens Wikipedia: 45.002843, 5.96773.

update public.cols
set summit_lat = 45.002843,
    summit_lon = 5.967730
where slug = 'col-d-ornon';
