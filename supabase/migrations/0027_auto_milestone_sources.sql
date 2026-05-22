-- Mark milestone badges that now have deterministic Strava evaluators.
-- This keeps the Badge-kast source label in sync with the evaluator code.

update public.achievement_badges
set trigger_source = 'auto'
where kind = 'milestone'
  and achievement_code in (
    'A001',
    'A002',
    'A003',
    'A005',
    'A006',
    'A007',
    'A008',
    'A027',
    'A028',
    'A029',
    'A030',
    'A038',
    'A039',
    'A041',
    'A042',
    'A043',
    'A044',
    'A045',
    'A057',
    'A071',
    'A081',
    'A084'
  );
