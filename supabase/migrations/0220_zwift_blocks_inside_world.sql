-- ZWBlokken in de Zwift-werelden: blokken van Climb Portals opruimen.
--
-- Zwift tekent een Climb Portal (Tourmalet, Puy de Dôme, …) direct naast de
-- wereld: een sliert vanaf de portal de kaart uit. De sync liet tot nu toe alles
-- binnen ~15 km van de wereldgrens toe, in de veronderstelling dat de portals veel
-- verder weg lagen. Daardoor telden in Watopia 79 en in France 162 club-blokken
-- mee die geen weg in die wereld zijn (gemeten 2026-10-05).
--
-- De code houdt nu alleen blokken waarvan het middelpunt binnen de grenzen van
-- Zwifts eigen kaart ligt (blockInWorld in src/lib/zwblokken/zwift.ts). Dit ruimt
-- op wat er al staat. De bereiken hieronder zijn die van worldBlockRange, voor
-- zwift-data 1.50 en zoom 16.
--
-- Ritten hoeven niet opnieuw door de sync: een blok binnen de wereld is niet
-- veranderd. De noemer van de dekking (routevormen ∪ club-blokken) en de titels
-- lezen deze tabel en kloppen daarna vanzelf.

delete from public.profile_zwift_blocks
  where world = 'watopia' and z = 16
    and not (x between 63147 and 63174 and y between 34899 and 34919);

delete from public.profile_zwift_blocks
  where world = 'richmond' and z = 16
    and not (x between 18661 and 18678 and y between 25376 and 25393);

delete from public.profile_zwift_blocks
  where world = 'london' and z = 16
    and not (x between 32736 and 32757 and y between 21784 and 21805);

delete from public.profile_zwift_blocks
  where world = 'new-york' and z = 16
    and not (x between 19293 and 19310 and y between 24615 and 24669);

delete from public.profile_zwift_blocks
  where world = 'innsbruck' and z = 16
    and not (x between 34834 and 34857 and y between 22972 and 22995);

delete from public.profile_zwift_blocks
  where world = 'bologna' and z = 16
    and not (x between 34818 and 34837 and y between 23695 and 23714);

delete from public.profile_zwift_blocks
  where world = 'yorkshire' and z = 16
    and not (x between 32471 and 32494 and y between 21035 and 21057);

delete from public.profile_zwift_blocks
  where world = 'crit-city' and z = 16
    and not (x between 62948 and 62954 and y between 34665 and 34671);

delete from public.profile_zwift_blocks
  where world = 'makuri-islands' and z = 16
    and not (x between 62945 and 62965 and y between 34734 and 34755);

delete from public.profile_zwift_blocks
  where world = 'france' and z = 16
    and not (x between 63013 and 63034 and y between 36805 and 36826);

delete from public.profile_zwift_blocks
  where world = 'paris' and z = 16
    and not (x between 33179 and 33199 and y between 22533 and 22553);

delete from public.profile_zwift_blocks
  where world = 'scotland' and z = 16
    and not (x between 31807 and 31824 and y between 20513 and 20530);
