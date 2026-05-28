-- Coördinaat-correctie Col de la Madeleine. Seed-waarde (45.4296, 6.3946)
-- zat ~1,8 km naast de echte top (vooral lengtegraad), waardoor de
-- detector 'm zelfs met 1500m radius miste. Echte summit: 45.4342, 6.3720.

update public.cols
set summit_lat = 45.434200,
    summit_lon = 6.372000
where slug = 'col-de-la-madeleine';
