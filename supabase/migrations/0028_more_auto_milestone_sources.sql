-- More milestone badges now have deterministic Strava evaluators.
-- These remain conservative proxies when Strava lacks the exact concept.

update public.achievement_badges
set trigger_source = 'auto'
where kind = 'milestone'
  and achievement_code in (
    'A004',
    'A009',
    'A012',
    'A017',
    'A018',
    'A020',
    'A021',
    'A026',
    'A031',
    'A046',
    'A051',
    'A075',
    'A085',
    'A088',
    'A090',
    'A096'
  );
