-- RPE bij een rit waar geen training tegenover stond.
--
-- RPE hing tot nu toe alleen aan een rapportage, en een rapportage hangt aan een
-- geplande training. Wie spontaan een rondje reed, kon dus niet zeggen hoe zwaar
-- het voelde, terwijl juist een rustig bedoelde rit die zwaar voelde een
-- herstelsignaal is.
--
-- Een kolom op de rit, zoals training_excluded_at (0163): de RPE hoort bij
-- precies één rit en verdwijnt met die rit (verwijderd in Strava, bewaartermijn,
-- ingetrokken koppeling). Koppelt het lid de rit later aan een training, dan
-- neemt de rapportage de RPE over; die is vanaf dan de bron.

alter table public.strava_activities
  add column if not exists athlete_rpe smallint
    check (athlete_rpe is null or athlete_rpe between 1 and 10);

notify pgrst, 'reload schema';
