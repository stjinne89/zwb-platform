-- Het lid zegt: deze rit hoort bij geen enkele geplande training.
--
-- De koppeling tussen rit en training gaat automatisch, op kalenderdag. Een lid kan
-- die nu zelf herstellen: de rit aan een andere training hangen, een ongeplande rit
-- aan een gemiste training, of de rit loskoppelen. Dat laatste moet blijvend zijn;
-- zonder markering koppelt de detectie de rit bij de volgende sync gewoon terug.
--
-- Bewust een kolom op de rit en geen losse tabel: de markering hoort bij precies
-- één rit en verdwijnt met die rit (verwijderd in Strava, bewaartermijn,
-- ingetrokken koppeling). Koppelt het lid de rit later toch aan een training, dan
-- gaat de markering weer weg.

alter table public.strava_activities
  add column if not exists training_excluded_at timestamptz;

notify pgrst, 'reload schema';
