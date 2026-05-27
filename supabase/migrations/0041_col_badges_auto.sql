-- Col-badges (A013-A019, A095) staan nu op trigger_source='auto' nadat
-- de col-detector op summary_polyline werkt. A017/A018 (Everesting) blijven
-- manual — die zijn over hoogtemeters in 1 rit, niet specifieke cols, en
-- worden in een aparte iteratie opgepakt via singleElevationResult.

update public.achievement_badges
set trigger_source = 'auto'
where kind = 'milestone'
  and achievement_code in (
    'A013',  -- Alpe Finisher
    'A014',  -- Ventoux Finisher
    'A015',  -- Marmotte Finisher
    'A016',  -- Dolomiti Rider
    'A019',  -- Col Collector
    'A095'   -- Stelvio Finisher
  );
