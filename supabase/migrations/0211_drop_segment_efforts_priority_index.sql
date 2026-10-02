-- De index segment_efforts_priority (0156) hoorde bij de oude voorrangslijst, die
-- alle pogingen per segment telde. Sinds 0209 leest die lijst zwb_segment_koms en
-- zoekt hij per segment één rijder; daarvoor volstaat segment_efforts_club_best
-- (strava_segment_id, profile_id, elapsed_time_seconds).
--
-- Op productie is de index op 2026-10-01 met de hand verwijderd om 32 MB vrij te
-- maken: de database stond op alleen-lezen omdat de disk vol was (zie
-- docs/prestatie-onderzoek-2026-09-30.md, "Incident 2026-10-01"). Deze migratie
-- legt dat vast, zodat een nieuwe omgeving hetzelfde schema krijgt.
drop index if exists public.segment_efforts_priority;
