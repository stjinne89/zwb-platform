-- Club Ladder: renners van wedstrijden met een sprint opnieuw koppelen (2026-11-19).
--
-- matchZwiftResults koppelde een ladderrenner aan de eerste Zwift-rij binnen
-- 2 s rijtijd. In een sprint schoven de Zwift-ID's daardoor door: in wedstrijd
-- 17723 kregen Dan Stockdale, Liam Mckeever en Rich T.Pot elkaars ID, gewicht
-- en vermogen (nagekeken op zwiftracing.app). In productie hingen 53 Zwift-ID's
-- aan meer dan één naam, waarvan ongeveer tien duidelijk verschillende renners.
--
-- De koppeling neemt nu het kleinste tijdverschil, binnen 0,05 s. Deze
-- migratie zet riders_fetched_at terug bij elke wedstrijd met twee renners
-- binnen 2 s van elkaar (118 van de 123 op 2026-11-19), zodat ensureMatchRiders
-- ze bij het volgende laden van een matchup opnieuw ophaalt. De upsert op
-- (result_id, position) overschrijft de oude rijen. Zonder Zwift-uitslag blijft
-- riders_fetched_at leeg en probeert de sync het later opnieuw, zoals al gold.

update public.club_ladder_matches m
set riders_fetched_at = null
where m.riders_fetched_at is not null
  and exists (
    select 1
    from public.club_ladder_match_riders a
    join public.club_ladder_match_riders b
      on b.result_id = a.result_id
     and b.position > a.position
     and abs(a.time_s - b.time_s) <= 2
    where a.result_id = m.result_id
  );
