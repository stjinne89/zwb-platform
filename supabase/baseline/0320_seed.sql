-- Generieke startinhoud voor een nieuwe installatie, na 0320_baseline.sql.
-- Gemaakt door scripts/build-baseline.mjs; niet met de hand aanpassen.
--
-- Rollen en rechten, cols, workouts, mobiliteit, voeding en recepten,
-- onderhoudstips, kennis- en racetips, segmenten, ladderroutes en badges. Zonder
-- ledenroster, teams, sponsors en releasenotes; de clubrij is neutraal.

--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: achievement_badges; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.achievement_badges VALUES
	('kudos_received_week', 'Kudo-magneet', 'Meeste ontvangen kudos op gesyncte Strava-ritten.', 'kudos_received', 'heart', 'sage', '2026-11-09 15:09:14.824+01', 'weekly', NULL, NULL, NULL, 'auto', '{}', 0),
	('consistency_week', 'Meest actief', 'Meeste gesyncte fietsritten in een week.', 'activity_count', 'refresh', 'steel', '2026-11-09 15:09:14.824+01', 'weekly', NULL, NULL, NULL, 'auto', '{}', 0),
	('A001_bronze', 'Distance Ride - Brons', '50 km', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A001', 'bronze', 'Weg, kilometerpaal, racefiets', 'auto', '{"visual": "Weg, kilometerpaal, racefiets", "threshold": {"raw": "50 km", "unit": "km", "value": 50.0}, "achievement": "Distance Ride"}', 101),
	('A004_bronze', 'First Group Ride - Brons', '3 renners', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A004', 'bronze', 'Peloton', 'auto', '{"visual": "Peloton", "threshold": {"raw": "3 renners", "unit": "renners", "value": 3.0}, "achievement": "First Group Ride"}', 113),
	('A004_silver', 'First Group Ride - Zilver', '5 renners', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A004', 'silver', 'Peloton', 'auto', '{"visual": "Peloton", "threshold": {"raw": "5 renners", "unit": "renners", "value": 5.0}, "achievement": "First Group Ride"}', 114),
	('A004_gold', 'First Group Ride - Goud', '10 renners', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A004', 'gold', 'Peloton', 'auto', '{"visual": "Peloton", "threshold": {"raw": "10 renners", "unit": "renners", "value": 10.0}, "achievement": "First Group Ride"}', 115),
	('A004_platinum', 'First Group Ride - Platinum', '20+ renners', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A004', 'platinum', 'Peloton', 'auto', '{"visual": "Peloton", "threshold": {"raw": "20+ renners", "unit": "", "value": 20.0}, "achievement": "First Group Ride"}', 116),
	('A026_bronze', 'Night Ride - Brons', 'start donker', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A026', 'bronze', 'Maan, lampen', 'auto', '{"visual": "Maan, lampen", "threshold": {"raw": "start donker"}, "achievement": "Night Ride"}', 201),
	('climber_week', 'Klimmer van de week', 'Meeste hoogtemeters in een week.', 'elevation_m', 'mountain', 'gold', '2026-11-09 15:09:14.824+01', 'weekly', NULL, NULL, NULL, 'auto', '{}', 0),
	('distance_week', 'Kilometervreter', 'Meeste kilometers in een week.', 'distance_m', 'route', 'petrol', '2026-11-09 15:09:14.824+01', 'weekly', NULL, NULL, NULL, 'auto', '{}', 0),
	('A010_bronze', 'New Rider Mentor - Brons', '1 iemand geholpen', 'milestone', 'heart', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A010', 'bronze', 'Twee renners, helpende hand', 'manual', '{"visual": "Twee renners, helpende hand", "threshold": {"raw": "1 iemand geholpen", "unit": "", "value": 1.0}, "achievement": "New Rider Mentor"}', 137),
	('A010_silver', 'New Rider Mentor - Zilver', '3 mensen geholpen', 'milestone', 'heart', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A010', 'silver', 'Twee renners, helpende hand', 'manual', '{"visual": "Twee renners, helpende hand", "threshold": {"raw": "3 mensen geholpen", "unit": "m", "value": 3.0}, "achievement": "New Rider Mentor"}', 138),
	('A010_gold', 'New Rider Mentor - Goud', '5 mensen geholpen', 'milestone', 'heart', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A010', 'gold', 'Twee renners, helpende hand', 'manual', '{"visual": "Twee renners, helpende hand", "threshold": {"raw": "5 mensen geholpen", "unit": "m", "value": 5.0}, "achievement": "New Rider Mentor"}', 139),
	('A010_platinum', 'New Rider Mentor - Platinum', '10 mensen geholpen', 'milestone', 'heart', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A010', 'platinum', 'Twee renners, helpende hand', 'manual', '{"visual": "Twee renners, helpende hand", "threshold": {"raw": "10 mensen geholpen", "unit": "m", "value": 10.0}, "achievement": "New Rider Mentor"}', 140),
	('A011_bronze', 'Hill Hunter - Brons', '5 klimmetjes', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A011', 'bronze', 'Korte heuvels', 'manual', '{"visual": "Korte heuvels", "threshold": {"raw": "5 klimmetjes", "unit": "", "value": 5.0}, "achievement": "Hill Hunter"}', 141),
	('A011_silver', 'Hill Hunter - Zilver', '10 klimmetjes', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A011', 'silver', 'Korte heuvels', 'manual', '{"visual": "Korte heuvels", "threshold": {"raw": "10 klimmetjes", "unit": "", "value": 10.0}, "achievement": "Hill Hunter"}', 142),
	('A011_gold', 'Hill Hunter - Goud', '25 klimmetjes', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A011', 'gold', 'Korte heuvels', 'manual', '{"visual": "Korte heuvels", "threshold": {"raw": "25 klimmetjes", "unit": "", "value": 25.0}, "achievement": "Hill Hunter"}', 143),
	('A011_platinum', 'Hill Hunter - Platinum', '50 klimmetjes', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A011', 'platinum', 'Korte heuvels', 'manual', '{"visual": "Korte heuvels", "threshold": {"raw": "50 klimmetjes", "unit": "", "value": 50.0}, "achievement": "Hill Hunter"}', 144),
	('A009_bronze', 'Weekend Warrior - Brons', '100 km weekend', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A009', 'bronze', 'Kalender + fiets', 'auto', '{"visual": "Kalender + fiets", "threshold": {"raw": "100 km weekend", "unit": "km", "value": 100.0}, "achievement": "Weekend Warrior"}', 133),
	('A009_silver', 'Weekend Warrior - Zilver', '200 km weekend', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A009', 'silver', 'Kalender + fiets', 'auto', '{"visual": "Kalender + fiets", "threshold": {"raw": "200 km weekend", "unit": "km", "value": 200.0}, "achievement": "Weekend Warrior"}', 134),
	('A009_gold', 'Weekend Warrior - Goud', '300 km weekend', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A009', 'gold', 'Kalender + fiets', 'auto', '{"visual": "Kalender + fiets", "threshold": {"raw": "300 km weekend", "unit": "km", "value": 300.0}, "achievement": "Weekend Warrior"}', 135),
	('A009_platinum', 'Weekend Warrior - Platinum', '400 km weekend', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A009', 'platinum', 'Kalender + fiets', 'auto', '{"visual": "Kalender + fiets", "threshold": {"raw": "400 km weekend", "unit": "km", "value": 400.0}, "achievement": "Weekend Warrior"}', 136),
	('A012_bronze', 'Mountain Goat - Brons', '1.000 hm', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A012', 'bronze', 'Geit/bergicoon', 'auto', '{"visual": "Geit/bergicoon", "threshold": {"raw": "1.000 hm", "unit": "hm", "value": 1000.0}, "achievement": "Mountain Goat"}', 145),
	('A012_silver', 'Mountain Goat - Zilver', '2.000 hm', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A012', 'silver', 'Geit/bergicoon', 'auto', '{"visual": "Geit/bergicoon", "threshold": {"raw": "2.000 hm", "unit": "hm", "value": 2000.0}, "achievement": "Mountain Goat"}', 146),
	('A013_bronze', 'Alpe Finisher - Brons', 'Alpe d’Huez voltooid', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A013', 'bronze', 'Alpe-haarspelden', 'auto', '{"visual": "Alpe-haarspelden", "threshold": {"raw": "Alpe d’Huez voltooid"}, "achievement": "Alpe Finisher"}', 149),
	('A013_silver', 'Alpe Finisher - Zilver', 'sub 75 min', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A013', 'silver', 'Alpe-haarspelden', 'auto', '{"visual": "Alpe-haarspelden", "threshold": {"raw": "sub 75 min", "unit": "m", "value": 75.0}, "achievement": "Alpe Finisher"}', 150),
	('A013_gold', 'Alpe Finisher - Goud', 'sub 60 min', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A013', 'gold', 'Alpe-haarspelden', 'auto', '{"visual": "Alpe-haarspelden", "threshold": {"raw": "sub 60 min", "unit": "m", "value": 60.0}, "achievement": "Alpe Finisher"}', 151),
	('A013_platinum', 'Alpe Finisher - Platinum', '5× voltooid', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A013', 'platinum', 'Alpe-haarspelden', 'auto', '{"visual": "Alpe-haarspelden", "threshold": {"raw": "5× voltooid", "unit": "", "value": 5.0}, "achievement": "Alpe Finisher"}', 152),
	('A014_bronze', 'Ventoux Finisher - Brons', '1 kant', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A014', 'bronze', 'Kale berg, zendmast', 'auto', '{"visual": "Kale berg, zendmast", "threshold": {"raw": "1 kant", "unit": "", "value": 1.0}, "achievement": "Ventoux Finisher"}', 153),
	('A014_silver', 'Ventoux Finisher - Zilver', '2 kanten', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A014', 'silver', 'Kale berg, zendmast', 'auto', '{"visual": "Kale berg, zendmast", "threshold": {"raw": "2 kanten", "unit": "", "value": 2.0}, "achievement": "Ventoux Finisher"}', 154),
	('A014_gold', 'Ventoux Finisher - Goud', '3 kanten', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A014', 'gold', 'Kale berg, zendmast', 'auto', '{"visual": "Kale berg, zendmast", "threshold": {"raw": "3 kanten", "unit": "", "value": 3.0}, "achievement": "Ventoux Finisher"}', 155),
	('A014_platinum', 'Ventoux Finisher - Platinum', 'Cinglé-stijl', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A014', 'platinum', 'Kale berg, zendmast', 'auto', '{"visual": "Kale berg, zendmast", "threshold": {"raw": "Cinglé-stijl"}, "achievement": "Ventoux Finisher"}', 156),
	('A015_bronze', 'Marmotte Finisher - Brons', 'gefinisht', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A015', 'bronze', 'Alpen, finishvlag', 'auto', '{"visual": "Alpen, finishvlag", "threshold": {"raw": "gefinisht"}, "achievement": "Marmotte Finisher"}', 157),
	('A022_bronze', 'Wind Warrior - Brons', 'windkracht 4', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A022', 'bronze', 'Windlijnen', 'manual', '{"visual": "Windlijnen", "threshold": {"raw": "windkracht 4", "unit": "", "value": 4.0}, "achievement": "Wind Warrior"}', 185),
	('A022_silver', 'Wind Warrior - Zilver', 'windkracht 5', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A022', 'silver', 'Windlijnen', 'manual', '{"visual": "Windlijnen", "threshold": {"raw": "windkracht 5", "unit": "", "value": 5.0}, "achievement": "Wind Warrior"}', 186),
	('A022_gold', 'Wind Warrior - Goud', 'windkracht 6', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A022', 'gold', 'Windlijnen', 'manual', '{"visual": "Windlijnen", "threshold": {"raw": "windkracht 6", "unit": "", "value": 6.0}, "achievement": "Wind Warrior"}', 187),
	('A022_platinum', 'Wind Warrior - Platinum', 'stormachtige rit', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A022', 'platinum', 'Windlijnen', 'manual', '{"visual": "Windlijnen", "threshold": {"raw": "stormachtige rit"}, "achievement": "Wind Warrior"}', 188),
	('A023_bronze', 'Dike Rider - Brons', '50 km dijken', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A023', 'bronze', 'Dijk, water', 'manual', '{"visual": "Dijk, water", "threshold": {"raw": "50 km dijken", "unit": "km", "value": 50.0}, "achievement": "Dike Rider"}', 189),
	('A023_silver', 'Dike Rider - Zilver', '100 km dijken', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A023', 'silver', 'Dijk, water', 'manual', '{"visual": "Dijk, water", "threshold": {"raw": "100 km dijken", "unit": "km", "value": 100.0}, "achievement": "Dike Rider"}', 190),
	('A023_gold', 'Dike Rider - Goud', '150 km dijken', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A023', 'gold', 'Dijk, water', 'manual', '{"visual": "Dijk, water", "threshold": {"raw": "150 km dijken", "unit": "km", "value": 150.0}, "achievement": "Dike Rider"}', 191),
	('A023_platinum', 'Dike Rider - Platinum', '200 km dijken', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A023', 'platinum', 'Dijk, water', 'manual', '{"visual": "Dijk, water", "threshold": {"raw": "200 km dijken", "unit": "km", "value": 200.0}, "achievement": "Dike Rider"}', 192),
	('A024_bronze', 'Polderbeul - Brons', '100 km polder', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A024', 'bronze', 'Molen/polder', 'manual', '{"visual": "Molen/polder", "threshold": {"raw": "100 km polder", "unit": "km", "value": 100.0}, "achievement": "Polderbeul"}', 193),
	('A024_silver', 'Polderbeul - Zilver', '150 km polder', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A024', 'silver', 'Molen/polder', 'manual', '{"visual": "Molen/polder", "threshold": {"raw": "150 km polder", "unit": "km", "value": 150.0}, "achievement": "Polderbeul"}', 194),
	('A024_gold', 'Polderbeul - Goud', '200 km polder', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A024', 'gold', 'Molen/polder', 'manual', '{"visual": "Molen/polder", "threshold": {"raw": "200 km polder", "unit": "km", "value": 200.0}, "achievement": "Polderbeul"}', 195),
	('A024_platinum', 'Polderbeul - Platinum', '300 km polder', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A024', 'platinum', 'Molen/polder', 'manual', '{"visual": "Molen/polder", "threshold": {"raw": "300 km polder", "unit": "km", "value": 300.0}, "achievement": "Polderbeul"}', 196),
	('A025_bronze', 'Coast to Coast - Brons', 'regionale oversteek', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A025', 'bronze', 'Zee naar zee', 'manual', '{"visual": "Zee naar zee", "threshold": {"raw": "regionale oversteek"}, "achievement": "Coast to Coast"}', 197),
	('A025_silver', 'Coast to Coast - Zilver', 'provincie', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A025', 'silver', 'Zee naar zee', 'manual', '{"visual": "Zee naar zee", "threshold": {"raw": "provincie"}, "achievement": "Coast to Coast"}', 198),
	('A025_gold', 'Coast to Coast - Goud', 'landelijk', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A025', 'gold', 'Zee naar zee', 'manual', '{"visual": "Zee naar zee", "threshold": {"raw": "landelijk"}, "achievement": "Coast to Coast"}', 199),
	('A025_platinum', 'Coast to Coast - Platinum', 'internationaal', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A025', 'platinum', 'Zee naar zee', 'manual', '{"visual": "Zee naar zee", "threshold": {"raw": "internationaal"}, "achievement": "Coast to Coast"}', 200),
	('A019_silver', 'Col Collector - Zilver', '5 cols', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A019', 'silver', 'Colbordjes', 'auto', '{"visual": "Colbordjes", "threshold": {"raw": "5 cols", "unit": "", "value": 5.0}, "achievement": "Col Collector"}', 174),
	('A019_gold', 'Col Collector - Goud', '10 cols', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A019', 'gold', 'Colbordjes', 'auto', '{"visual": "Colbordjes", "threshold": {"raw": "10 cols", "unit": "", "value": 10.0}, "achievement": "Col Collector"}', 175),
	('A019_platinum', 'Col Collector - Platinum', '25 cols', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A019', 'platinum', 'Colbordjes', 'auto', '{"visual": "Colbordjes", "threshold": {"raw": "25 cols", "unit": "", "value": 25.0}, "achievement": "Col Collector"}', 176),
	('A032_bronze', 'KOM/QOM Hunter - Brons', 'top 10', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A032', 'bronze', 'Kroon', 'manual', '{"visual": "Kroon", "threshold": {"raw": "top 10", "unit": "", "value": 10.0}, "achievement": "KOM/QOM Hunter"}', 225),
	('A032_silver', 'KOM/QOM Hunter - Zilver', 'podium', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A032', 'silver', 'Kroon', 'manual', '{"visual": "Kroon", "threshold": {"raw": "podium"}, "achievement": "KOM/QOM Hunter"}', 226),
	('A032_gold', 'KOM/QOM Hunter - Goud', 'KOM/QOM', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A032', 'gold', 'Kroon', 'manual', '{"visual": "Kroon", "threshold": {"raw": "KOM/QOM"}, "achievement": "KOM/QOM Hunter"}', 227),
	('A032_platinum', 'KOM/QOM Hunter - Platinum', '10 KOM/QOMs', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A032', 'platinum', 'Kroon', 'manual', '{"visual": "Kroon", "threshold": {"raw": "10 KOM/QOMs", "unit": "", "value": 10.0}, "achievement": "KOM/QOM Hunter"}', 228),
	('A033_bronze', 'Local Legend - Brons', '1 segment', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A033', 'bronze', 'Lauwerkrans', 'manual', '{"visual": "Lauwerkrans", "threshold": {"raw": "1 segment", "unit": "seg", "value": 1.0}, "achievement": "Local Legend"}', 229),
	('A026_silver', 'Night Ride - Zilver', 'finish donker', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A026', 'silver', 'Maan, lampen', 'auto', '{"visual": "Maan, lampen", "threshold": {"raw": "finish donker"}, "achievement": "Night Ride"}', 202),
	('A026_gold', 'Night Ride - Goud', '100 km nacht', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A026', 'gold', 'Maan, lampen', 'auto', '{"visual": "Maan, lampen", "threshold": {"raw": "100 km nacht", "unit": "km", "value": 100.0}, "achievement": "Night Ride"}', 203),
	('A026_platinum', 'Night Ride - Platinum', 'hele nacht', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A026', 'platinum', 'Maan, lampen', 'auto', '{"visual": "Maan, lampen", "threshold": {"raw": "hele nacht"}, "achievement": "Night Ride"}', 204),
	('A031_bronze', 'Segment PR - Brons', '1 PR', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A031', 'bronze', 'Grafiek omhoog', 'auto', '{"visual": "Grafiek omhoog", "threshold": {"raw": "1 PR", "unit": "", "value": 1.0}, "achievement": "Segment PR"}', 221),
	('A031_silver', 'Segment PR - Zilver', '10 PR’s', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A031', 'silver', 'Grafiek omhoog', 'auto', '{"visual": "Grafiek omhoog", "threshold": {"raw": "10 PR’s", "unit": "", "value": 10.0}, "achievement": "Segment PR"}', 222),
	('A031_gold', 'Segment PR - Goud', '50 PR’s', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A031', 'gold', 'Grafiek omhoog', 'auto', '{"visual": "Grafiek omhoog", "threshold": {"raw": "50 PR’s", "unit": "", "value": 50.0}, "achievement": "Segment PR"}', 223),
	('A031_platinum', 'Segment PR - Platinum', '100 PR’s', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A031', 'platinum', 'Grafiek omhoog', 'auto', '{"visual": "Grafiek omhoog", "threshold": {"raw": "100 PR’s", "unit": "", "value": 100.0}, "achievement": "Segment PR"}', 224),
	('A033_silver', 'Local Legend - Zilver', '3 segmenten', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A033', 'silver', 'Lauwerkrans', 'manual', '{"visual": "Lauwerkrans", "threshold": {"raw": "3 segmenten", "unit": "seg", "value": 3.0}, "achievement": "Local Legend"}', 230),
	('A033_gold', 'Local Legend - Goud', '10 segmenten', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A033', 'gold', 'Lauwerkrans', 'manual', '{"visual": "Lauwerkrans", "threshold": {"raw": "10 segmenten", "unit": "seg", "value": 10.0}, "achievement": "Local Legend"}', 231),
	('A033_platinum', 'Local Legend - Platinum', '25 segmenten', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A033', 'platinum', 'Lauwerkrans', 'manual', '{"visual": "Lauwerkrans", "threshold": {"raw": "25 segmenten", "unit": "seg", "value": 25.0}, "achievement": "Local Legend"}', 232),
	('A034_bronze', 'Sprint Power - Brons', '800 W', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A034', 'bronze', 'Explosieve sprint', 'manual', '{"visual": "Explosieve sprint", "threshold": {"raw": "800 W", "unit": "w", "value": 800.0}, "achievement": "Sprint Power"}', 233),
	('A034_silver', 'Sprint Power - Zilver', '1.000 W', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A034', 'silver', 'Explosieve sprint', 'manual', '{"visual": "Explosieve sprint", "threshold": {"raw": "1.000 W", "unit": "w", "value": 1000.0}, "achievement": "Sprint Power"}', 234),
	('A034_gold', 'Sprint Power - Goud', '1.200 W', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A034', 'gold', 'Explosieve sprint', 'manual', '{"visual": "Explosieve sprint", "threshold": {"raw": "1.200 W", "unit": "w", "value": 1200.0}, "achievement": "Sprint Power"}', 235),
	('A034_platinum', 'Sprint Power - Platinum', '1.400 W', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A034', 'platinum', 'Explosieve sprint', 'manual', '{"visual": "Explosieve sprint", "threshold": {"raw": "1.400 W", "unit": "w", "value": 1400.0}, "achievement": "Sprint Power"}', 236),
	('A035_bronze', 'FTP Milestone - Brons', '3 W/kg', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A035', 'bronze', 'Vermogensmeter', 'manual', '{"visual": "Vermogensmeter", "threshold": {"raw": "3 W/kg", "unit": "w", "value": 3.0}, "achievement": "FTP Milestone"}', 237),
	('A035_silver', 'FTP Milestone - Zilver', '4 W/kg', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A035', 'silver', 'Vermogensmeter', 'manual', '{"visual": "Vermogensmeter", "threshold": {"raw": "4 W/kg", "unit": "w", "value": 4.0}, "achievement": "FTP Milestone"}', 238),
	('A035_gold', 'FTP Milestone - Goud', '4,5 W/kg', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A035', 'gold', 'Vermogensmeter', 'manual', '{"visual": "Vermogensmeter", "threshold": {"raw": "4,5 W/kg", "unit": "w", "value": 4.5}, "achievement": "FTP Milestone"}', 239),
	('A035_platinum', 'FTP Milestone - Platinum', '5 W/kg', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A035', 'platinum', 'Vermogensmeter', 'manual', '{"visual": "Vermogensmeter", "threshold": {"raw": "5 W/kg", "unit": "w", "value": 5.0}, "achievement": "FTP Milestone"}', 240),
	('A036_bronze', '20 Minute Beast - Brons', '20 min hard', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A036', 'bronze', 'Stopwatch', 'manual', '{"visual": "Stopwatch", "threshold": {"raw": "20 min hard", "unit": "m", "value": 20.0}, "achievement": "20 Minute Beast"}', 241),
	('A036_silver', '20 Minute Beast - Zilver', 'PR', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A036', 'silver', 'Stopwatch', 'manual', '{"visual": "Stopwatch", "threshold": {"raw": "PR"}, "achievement": "20 Minute Beast"}', 242),
	('A036_gold', '20 Minute Beast - Goud', '5 W/kg', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A036', 'gold', 'Stopwatch', 'manual', '{"visual": "Stopwatch", "threshold": {"raw": "5 W/kg", "unit": "w", "value": 5.0}, "achievement": "20 Minute Beast"}', 243),
	('A036_platinum', '20 Minute Beast - Platinum', 'elite score', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A036', 'platinum', 'Stopwatch', 'manual', '{"visual": "Stopwatch", "threshold": {"raw": "elite score"}, "achievement": "20 Minute Beast"}', 244),
	('A037_bronze', 'Climb PR - Brons', '1 klim-PR', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A037', 'bronze', 'Bergsegment', 'manual', '{"visual": "Bergsegment", "threshold": {"raw": "1 klim-PR", "unit": "", "value": 1.0}, "achievement": "Climb PR"}', 245),
	('A037_silver', 'Climb PR - Zilver', '5 klim-PR’s', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A037', 'silver', 'Bergsegment', 'manual', '{"visual": "Bergsegment", "threshold": {"raw": "5 klim-PR’s", "unit": "", "value": 5.0}, "achievement": "Climb PR"}', 246),
	('A037_gold', 'Climb PR - Goud', '10 klim-PR’s', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A037', 'gold', 'Bergsegment', 'manual', '{"visual": "Bergsegment", "threshold": {"raw": "10 klim-PR’s", "unit": "", "value": 10.0}, "achievement": "Climb PR"}', 247),
	('A037_platinum', 'Climb PR - Platinum', 'iconische klim-PR', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A037', 'platinum', 'Bergsegment', 'manual', '{"visual": "Bergsegment", "threshold": {"raw": "iconische klim-PR"}, "achievement": "Climb PR"}', 248),
	('A040_bronze', 'Power Consistency - Brons', '1 blok', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A040', 'bronze', 'Balkgrafiek', 'auto', '{"visual": "Balkgrafiek", "threshold": {"raw": "1 blok", "unit": "", "value": 1.0}, "achievement": "Power Consistency"}', 257),
	('A040_silver', 'Power Consistency - Zilver', '3 blokken', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A040', 'silver', 'Balkgrafiek', 'auto', '{"visual": "Balkgrafiek", "threshold": {"raw": "3 blokken", "unit": "", "value": 3.0}, "achievement": "Power Consistency"}', 258),
	('A040_gold', 'Power Consistency - Goud', '5 blokken', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A040', 'gold', 'Balkgrafiek', 'auto', '{"visual": "Balkgrafiek", "threshold": {"raw": "5 blokken", "unit": "", "value": 5.0}, "achievement": "Power Consistency"}', 259),
	('A040_platinum', 'Power Consistency - Platinum', 'perfecte pacing', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A040', 'platinum', 'Balkgrafiek', 'auto', '{"visual": "Balkgrafiek", "threshold": {"raw": "perfecte pacing"}, "achievement": "Power Consistency"}', 260),
	('A046_bronze', 'Winter Warrior - Brons', '1 wintermaand', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A046', 'bronze', 'Sneeuwfiets', 'auto', '{"visual": "Sneeuwfiets", "threshold": {"raw": "1 wintermaand", "unit": "w", "value": 1.0}, "achievement": "Winter Warrior"}', 281),
	('A046_silver', 'Winter Warrior - Zilver', '2 maanden', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A046', 'silver', 'Sneeuwfiets', 'auto', '{"visual": "Sneeuwfiets", "threshold": {"raw": "2 maanden", "unit": "m", "value": 2.0}, "achievement": "Winter Warrior"}', 282),
	('A046_gold', 'Winter Warrior - Goud', 'hele winter', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A046', 'gold', 'Sneeuwfiets', 'auto', '{"visual": "Sneeuwfiets", "threshold": {"raw": "hele winter"}, "achievement": "Winter Warrior"}', 283),
	('A047_bronze', 'Training Plan - Brons', '1 week', 'milestone', 'refresh', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A047', 'bronze', 'Checklist', 'manual', '{"visual": "Checklist", "threshold": {"raw": "1 week", "unit": "w", "value": 1.0}, "achievement": "Training Plan"}', 285),
	('A047_silver', 'Training Plan - Zilver', '4 weken', 'milestone', 'refresh', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A047', 'silver', 'Checklist', 'manual', '{"visual": "Checklist", "threshold": {"raw": "4 weken", "unit": "w", "value": 4.0}, "achievement": "Training Plan"}', 286),
	('A047_gold', 'Training Plan - Goud', '8 weken', 'milestone', 'refresh', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A047', 'gold', 'Checklist', 'manual', '{"visual": "Checklist", "threshold": {"raw": "8 weken", "unit": "w", "value": 8.0}, "achievement": "Training Plan"}', 287),
	('A047_platinum', 'Training Plan - Platinum', 'volledig plan', 'milestone', 'refresh', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A047', 'platinum', 'Checklist', 'manual', '{"visual": "Checklist", "threshold": {"raw": "volledig plan"}, "achievement": "Training Plan"}', 288),
	('A048_bronze', 'Recovery Discipline - Brons', '1 herstelrit', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A048', 'bronze', 'Hartslag laag', 'manual', '{"visual": "Hartslag laag", "threshold": {"raw": "1 herstelrit", "unit": "", "value": 1.0}, "achievement": "Recovery Discipline"}', 289),
	('A048_silver', 'Recovery Discipline - Zilver', '5 herstelritten', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A048', 'silver', 'Hartslag laag', 'manual', '{"visual": "Hartslag laag", "threshold": {"raw": "5 herstelritten", "unit": "", "value": 5.0}, "achievement": "Recovery Discipline"}', 290),
	('A048_gold', 'Recovery Discipline - Goud', 'herstelweek', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A048', 'gold', 'Hartslag laag', 'manual', '{"visual": "Hartslag laag", "threshold": {"raw": "herstelweek"}, "achievement": "Recovery Discipline"}', 291),
	('A048_platinum', 'Recovery Discipline - Platinum', 'perfecte taper', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A048', 'platinum', 'Hartslag laag', 'manual', '{"visual": "Hartslag laag", "threshold": {"raw": "perfecte taper"}, "achievement": "Recovery Discipline"}', 292),
	('A049_bronze', 'Heat Trained - Brons', '1 sessie', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A049', 'bronze', 'Zon/thermometer', 'manual', '{"visual": "Zon/thermometer", "threshold": {"raw": "1 sessie", "unit": "", "value": 1.0}, "achievement": "Heat Trained"}', 293),
	('A049_silver', 'Heat Trained - Zilver', '5 sessies', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A049', 'silver', 'Zon/thermometer', 'manual', '{"visual": "Zon/thermometer", "threshold": {"raw": "5 sessies", "unit": "", "value": 5.0}, "achievement": "Heat Trained"}', 294),
	('A049_gold', 'Heat Trained - Goud', '10 sessies', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A049', 'gold', 'Zon/thermometer', 'manual', '{"visual": "Zon/thermometer", "threshold": {"raw": "10 sessies", "unit": "", "value": 10.0}, "achievement": "Heat Trained"}', 295),
	('A049_platinum', 'Heat Trained - Platinum', 'hitteblok voltooid', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A049', 'platinum', 'Zon/thermometer', 'manual', '{"visual": "Zon/thermometer", "threshold": {"raw": "hitteblok voltooid"}, "achievement": "Heat Trained"}', 296),
	('A050_bronze', 'No Excuses - Brons', 'regenrit', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A050', 'bronze', 'Weericonen', 'manual', '{"visual": "Weericonen", "threshold": {"raw": "regenrit"}, "achievement": "No Excuses"}', 297),
	('A050_silver', 'No Excuses - Zilver', 'kouderit', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A050', 'silver', 'Weericonen', 'manual', '{"visual": "Weericonen", "threshold": {"raw": "kouderit"}, "achievement": "No Excuses"}', 298),
	('A050_gold', 'No Excuses - Goud', 'windrit', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A050', 'gold', 'Weericonen', 'manual', '{"visual": "Weericonen", "threshold": {"raw": "windrit"}, "achievement": "No Excuses"}', 299),
	('A050_platinum', 'No Excuses - Platinum', 'alle weersomstandigheden', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A050', 'platinum', 'Weericonen', 'manual', '{"visual": "Weericonen", "threshold": {"raw": "alle weersomstandigheden"}, "achievement": "No Excuses"}', 300),
	('A052_bronze', 'Ride Leader - Brons', 'route delen', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A052', 'bronze', 'Wegkapitein', 'manual', '{"visual": "Wegkapitein", "threshold": {"raw": "route delen"}, "achievement": "Ride Leader"}', 305),
	('A052_silver', 'Ride Leader - Zilver', 'groep leiden', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A052', 'silver', 'Wegkapitein', 'manual', '{"visual": "Wegkapitein", "threshold": {"raw": "groep leiden"}, "achievement": "Ride Leader"}', 306),
	('A052_gold', 'Ride Leader - Goud', '10 ritten leiden', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A052', 'gold', 'Wegkapitein', 'manual', '{"visual": "Wegkapitein", "threshold": {"raw": "10 ritten leiden", "unit": "", "value": 10.0}, "achievement": "Ride Leader"}', 307),
	('A052_platinum', 'Ride Leader - Platinum', 'clubcaptain', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A052', 'platinum', 'Wegkapitein', 'manual', '{"visual": "Wegkapitein", "threshold": {"raw": "clubcaptain"}, "achievement": "Ride Leader"}', 308),
	('A053_bronze', 'Domestique - Brons', '10 min kopwerk', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A053', 'bronze', 'Renner uit de wind', 'manual', '{"visual": "Renner uit de wind", "threshold": {"raw": "10 min kopwerk", "unit": "m", "value": 10.0}, "achievement": "Domestique"}', 309),
	('A053_silver', 'Domestique - Zilver', '30 min', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A053', 'silver', 'Renner uit de wind', 'manual', '{"visual": "Renner uit de wind", "threshold": {"raw": "30 min", "unit": "m", "value": 30.0}, "achievement": "Domestique"}', 310),
	('A053_gold', 'Domestique - Goud', '1 uur', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A053', 'gold', 'Renner uit de wind', 'manual', '{"visual": "Renner uit de wind", "threshold": {"raw": "1 uur", "unit": "uur", "value": 1.0}, "achievement": "Domestique"}', 311),
	('A053_platinum', 'Domestique - Platinum', 'hele rit helper', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A053', 'platinum', 'Renner uit de wind', 'manual', '{"visual": "Renner uit de wind", "threshold": {"raw": "hele rit helper"}, "achievement": "Domestique"}', 312),
	('A054_bronze', 'No Drop Guardian - Brons', '1 renner helpen', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A054', 'bronze', 'Laatste renner', 'manual', '{"visual": "Laatste renner", "threshold": {"raw": "1 renner helpen", "unit": "renner", "value": 1.0}, "achievement": "No Drop Guardian"}', 313),
	('A054_silver', 'No Drop Guardian - Zilver', '3 keer', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A054', 'silver', 'Laatste renner', 'manual', '{"visual": "Laatste renner", "threshold": {"raw": "3 keer", "unit": "", "value": 3.0}, "achievement": "No Drop Guardian"}', 314),
	('A054_gold', 'No Drop Guardian - Goud', '10 keer', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A054', 'gold', 'Laatste renner', 'manual', '{"visual": "Laatste renner", "threshold": {"raw": "10 keer", "unit": "", "value": 10.0}, "achievement": "No Drop Guardian"}', 315),
	('A054_platinum', 'No Drop Guardian - Platinum', 'legendarische helper', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A054', 'platinum', 'Laatste renner', 'manual', '{"visual": "Laatste renner", "threshold": {"raw": "legendarische helper"}, "achievement": "No Drop Guardian"}', 316),
	('A055_bronze', 'Coffee Stop King - Brons', '1 koffiestop', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A055', 'bronze', 'Koffiekop', 'manual', '{"visual": "Koffiekop", "threshold": {"raw": "1 koffiestop", "unit": "", "value": 1.0}, "achievement": "Coffee Stop King"}', 317),
	('A055_silver', 'Coffee Stop King - Zilver', '5 koffiestops', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A055', 'silver', 'Koffiekop', 'manual', '{"visual": "Koffiekop", "threshold": {"raw": "5 koffiestops", "unit": "", "value": 5.0}, "achievement": "Coffee Stop King"}', 318),
	('A055_gold', 'Coffee Stop King - Goud', '25 koffiestops', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A055', 'gold', 'Koffiekop', 'manual', '{"visual": "Koffiekop", "threshold": {"raw": "25 koffiestops", "unit": "", "value": 25.0}, "achievement": "Coffee Stop King"}', 319),
	('A055_platinum', 'Coffee Stop King - Platinum', 'vaste koffiekoning', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A055', 'platinum', 'Koffiekop', 'manual', '{"visual": "Koffiekop", "threshold": {"raw": "vaste koffiekoning"}, "achievement": "Coffee Stop King"}', 320),
	('A056_bronze', 'Mechanic Hero - Brons', 'bandje helpen', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A056', 'bronze', 'Gereedschap', 'manual', '{"visual": "Gereedschap", "threshold": {"raw": "bandje helpen"}, "achievement": "Mechanic Hero"}', 321),
	('A056_silver', 'Mechanic Hero - Zilver', 'ketting helpen', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A056', 'silver', 'Gereedschap', 'manual', '{"visual": "Gereedschap", "threshold": {"raw": "ketting helpen"}, "achievement": "Mechanic Hero"}', 322),
	('A056_gold', 'Mechanic Hero - Goud', '5 pechgevallen', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A056', 'gold', 'Gereedschap', 'manual', '{"visual": "Gereedschap", "threshold": {"raw": "5 pechgevallen", "unit": "", "value": 5.0}, "achievement": "Mechanic Hero"}', 323),
	('A056_platinum', 'Mechanic Hero - Platinum', 'redder van de groep', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A056', 'platinum', 'Gereedschap', 'manual', '{"visual": "Gereedschap", "threshold": {"raw": "redder van de groep"}, "achievement": "Mechanic Hero"}', 324),
	('A058_bronze', 'Cheerleader - Brons', '25 kudos gegeven', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A058', 'bronze', 'Handjes/ster', 'manual', '{"visual": "Handjes/ster", "threshold": {"raw": "25 kudos gegeven", "unit": "", "value": 25.0}, "achievement": "Cheerleader"}', 329),
	('A058_silver', 'Cheerleader - Zilver', '100', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A058', 'silver', 'Handjes/ster', 'manual', '{"visual": "Handjes/ster", "threshold": {"raw": "100", "unit": "", "value": 100.0}, "achievement": "Cheerleader"}', 330),
	('A058_gold', 'Cheerleader - Goud', '500', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A058', 'gold', 'Handjes/ster', 'manual', '{"visual": "Handjes/ster", "threshold": {"raw": "500", "unit": "", "value": 500.0}, "achievement": "Cheerleader"}', 331),
	('A058_platinum', 'Cheerleader - Platinum', '1000', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A058', 'platinum', 'Handjes/ster', 'manual', '{"visual": "Handjes/ster", "threshold": {"raw": "1000", "unit": "", "value": 1000.0}, "achievement": "Cheerleader"}', 332),
	('A059_bronze', 'Ride Reporter - Brons', '1 verslag', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A059', 'bronze', 'Pen + fiets', 'manual', '{"visual": "Pen + fiets", "threshold": {"raw": "1 verslag", "unit": "", "value": 1.0}, "achievement": "Ride Reporter"}', 333),
	('A059_silver', 'Ride Reporter - Zilver', '5 verslagen', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A059', 'silver', 'Pen + fiets', 'manual', '{"visual": "Pen + fiets", "threshold": {"raw": "5 verslagen", "unit": "", "value": 5.0}, "achievement": "Ride Reporter"}', 334),
	('A059_gold', 'Ride Reporter - Goud', '25 verslagen', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A059', 'gold', 'Pen + fiets', 'manual', '{"visual": "Pen + fiets", "threshold": {"raw": "25 verslagen", "unit": "", "value": 25.0}, "achievement": "Ride Reporter"}', 335),
	('A059_platinum', 'Ride Reporter - Platinum', 'clubchroniqueur', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A059', 'platinum', 'Pen + fiets', 'manual', '{"visual": "Pen + fiets", "threshold": {"raw": "clubchroniqueur"}, "achievement": "Ride Reporter"}', 336),
	('A060_bronze', 'Route Builder - Brons', '1 route', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A060', 'bronze', 'Kaartlijn', 'manual', '{"visual": "Kaartlijn", "threshold": {"raw": "1 route", "unit": "", "value": 1.0}, "achievement": "Route Builder"}', 337),
	('A060_silver', 'Route Builder - Zilver', '5 routes', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A060', 'silver', 'Kaartlijn', 'manual', '{"visual": "Kaartlijn", "threshold": {"raw": "5 routes", "unit": "", "value": 5.0}, "achievement": "Route Builder"}', 338),
	('A060_gold', 'Route Builder - Goud', '25 routes', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A060', 'gold', 'Kaartlijn', 'manual', '{"visual": "Kaartlijn", "threshold": {"raw": "25 routes", "unit": "", "value": 25.0}, "achievement": "Route Builder"}', 339),
	('A060_platinum', 'Route Builder - Platinum', 'klassieker gemaakt', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A060', 'platinum', 'Kaartlijn', 'manual', '{"visual": "Kaartlijn", "threshold": {"raw": "klassieker gemaakt"}, "achievement": "Route Builder"}', 340),
	('A061_bronze', 'Explorer - Brons', '10 km nieuw', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A061', 'bronze', 'Nieuwe weg', 'manual', '{"visual": "Nieuwe weg", "threshold": {"raw": "10 km nieuw", "unit": "km", "value": 10.0}, "achievement": "Explorer"}', 341),
	('A061_silver', 'Explorer - Zilver', '100 km nieuw', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A061', 'silver', 'Nieuwe weg', 'manual', '{"visual": "Nieuwe weg", "threshold": {"raw": "100 km nieuw", "unit": "km", "value": 100.0}, "achievement": "Explorer"}', 342),
	('A061_gold', 'Explorer - Goud', '500 km nieuw', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A061', 'gold', 'Nieuwe weg', 'manual', '{"visual": "Nieuwe weg", "threshold": {"raw": "500 km nieuw", "unit": "km", "value": 500.0}, "achievement": "Explorer"}', 343),
	('A061_platinum', 'Explorer - Platinum', '1.000 km nieuw', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A061', 'platinum', 'Nieuwe weg', 'manual', '{"visual": "Nieuwe weg", "threshold": {"raw": "1.000 km nieuw", "unit": "km", "value": 1000.0}, "achievement": "Explorer"}', 344),
	('A062_bronze', 'Tile Hunter - Brons', '10 tegels', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A062', 'bronze', 'Vierkante tegels', 'manual', '{"visual": "Vierkante tegels", "threshold": {"raw": "10 tegels", "unit": "", "value": 10.0}, "achievement": "Tile Hunter"}', 345),
	('A062_silver', 'Tile Hunter - Zilver', '100 tegels', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A062', 'silver', 'Vierkante tegels', 'manual', '{"visual": "Vierkante tegels", "threshold": {"raw": "100 tegels", "unit": "", "value": 100.0}, "achievement": "Tile Hunter"}', 346),
	('A062_gold', 'Tile Hunter - Goud', '1.000 tegels', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A062', 'gold', 'Vierkante tegels', 'manual', '{"visual": "Vierkante tegels", "threshold": {"raw": "1.000 tegels", "unit": "", "value": 1000.0}, "achievement": "Tile Hunter"}', 347),
	('A062_platinum', 'Tile Hunter - Platinum', '5.000 tegels', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A062', 'platinum', 'Vierkante tegels', 'manual', '{"visual": "Vierkante tegels", "threshold": {"raw": "5.000 tegels", "unit": "", "value": 5000.0}, "achievement": "Tile Hunter"}', 348),
	('A063_bronze', 'Max Square - Brons', '5×5', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A063', 'bronze', 'Tegelvierkant', 'manual', '{"visual": "Tegelvierkant", "threshold": {"raw": "5×5", "unit": "", "value": 5.0}, "achievement": "Max Square"}', 349),
	('A063_silver', 'Max Square - Zilver', '10×10', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A063', 'silver', 'Tegelvierkant', 'manual', '{"visual": "Tegelvierkant", "threshold": {"raw": "10×10", "unit": "", "value": 10.0}, "achievement": "Max Square"}', 350),
	('A063_gold', 'Max Square - Goud', '25×25', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A063', 'gold', 'Tegelvierkant', 'manual', '{"visual": "Tegelvierkant", "threshold": {"raw": "25×25", "unit": "", "value": 25.0}, "achievement": "Max Square"}', 351),
	('A063_platinum', 'Max Square - Platinum', '50×50', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A063', 'platinum', 'Tegelvierkant', 'manual', '{"visual": "Tegelvierkant", "threshold": {"raw": "50×50", "unit": "", "value": 50.0}, "achievement": "Max Square"}', 352),
	('A064_bronze', 'Cluster Builder - Brons', 'eerste cluster', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A064', 'bronze', 'Tegelwolk', 'manual', '{"visual": "Tegelwolk", "threshold": {"raw": "eerste cluster"}, "achievement": "Cluster Builder"}', 353),
	('A064_silver', 'Cluster Builder - Zilver', '100 tegels', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A064', 'silver', 'Tegelwolk', 'manual', '{"visual": "Tegelwolk", "threshold": {"raw": "100 tegels", "unit": "", "value": 100.0}, "achievement": "Cluster Builder"}', 354),
	('A064_gold', 'Cluster Builder - Goud', '1.000 tegels', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A064', 'gold', 'Tegelwolk', 'manual', '{"visual": "Tegelwolk", "threshold": {"raw": "1.000 tegels", "unit": "", "value": 1000.0}, "achievement": "Cluster Builder"}', 355),
	('A064_platinum', 'Cluster Builder - Platinum', 'megacluster', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A064', 'platinum', 'Tegelwolk', 'manual', '{"visual": "Tegelwolk", "threshold": {"raw": "megacluster"}, "achievement": "Cluster Builder"}', 356),
	('A065_bronze', 'Province Explorer - Brons', '1 provincie', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A065', 'bronze', 'Kaart', 'manual', '{"visual": "Kaart", "threshold": {"raw": "1 provincie", "unit": "", "value": 1.0}, "achievement": "Province Explorer"}', 357),
	('A065_silver', 'Province Explorer - Zilver', '3 provincies', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A065', 'silver', 'Kaart', 'manual', '{"visual": "Kaart", "threshold": {"raw": "3 provincies", "unit": "", "value": 3.0}, "achievement": "Province Explorer"}', 358),
	('A065_gold', 'Province Explorer - Goud', 'alle NL-provincies', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A065', 'gold', 'Kaart', 'manual', '{"visual": "Kaart", "threshold": {"raw": "alle NL-provincies"}, "achievement": "Province Explorer"}', 359),
	('A065_platinum', 'Province Explorer - Platinum', 'Benelux', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A065', 'platinum', 'Kaart', 'manual', '{"visual": "Kaart", "threshold": {"raw": "Benelux"}, "achievement": "Province Explorer"}', 360),
	('A066_bronze', 'Border Hopper - Brons', '2 landen', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A066', 'bronze', 'Grensbord', 'manual', '{"visual": "Grensbord", "threshold": {"raw": "2 landen", "unit": "", "value": 2.0}, "achievement": "Border Hopper"}', 361),
	('A066_silver', 'Border Hopper - Zilver', '3 landen', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A066', 'silver', 'Grensbord', 'manual', '{"visual": "Grensbord", "threshold": {"raw": "3 landen", "unit": "", "value": 3.0}, "achievement": "Border Hopper"}', 362),
	('A066_gold', 'Border Hopper - Goud', '5 landen', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A066', 'gold', 'Grensbord', 'manual', '{"visual": "Grensbord", "threshold": {"raw": "5 landen", "unit": "", "value": 5.0}, "achievement": "Border Hopper"}', 363),
	('A066_platinum', 'Border Hopper - Platinum', '10 landen', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A066', 'platinum', 'Grensbord', 'manual', '{"visual": "Grensbord", "threshold": {"raw": "10 landen", "unit": "", "value": 10.0}, "achievement": "Border Hopper"}', 364),
	('A067_bronze', 'Every Road - Brons', 'straat/buurt', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A067', 'bronze', 'Stratenkaart', 'manual', '{"visual": "Stratenkaart", "threshold": {"raw": "straat/buurt"}, "achievement": "Every Road"}', 365),
	('A067_silver', 'Every Road - Zilver', 'dorp', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A067', 'silver', 'Stratenkaart', 'manual', '{"visual": "Stratenkaart", "threshold": {"raw": "dorp"}, "achievement": "Every Road"}', 366),
	('A067_gold', 'Every Road - Goud', 'gemeente', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A067', 'gold', 'Stratenkaart', 'manual', '{"visual": "Stratenkaart", "threshold": {"raw": "gemeente"}, "achievement": "Every Road"}', 367),
	('A067_platinum', 'Every Road - Platinum', 'regio', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A067', 'platinum', 'Stratenkaart', 'manual', '{"visual": "Stratenkaart", "threshold": {"raw": "regio"}, "achievement": "Every Road"}', 368),
	('A068_bronze', 'Ferry Rider - Brons', '1 pont', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A068', 'bronze', 'Pont/fiets', 'manual', '{"visual": "Pont/fiets", "threshold": {"raw": "1 pont", "unit": "", "value": 1.0}, "achievement": "Ferry Rider"}', 369),
	('A068_silver', 'Ferry Rider - Zilver', '3 ponten', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A068', 'silver', 'Pont/fiets', 'manual', '{"visual": "Pont/fiets", "threshold": {"raw": "3 ponten", "unit": "", "value": 3.0}, "achievement": "Ferry Rider"}', 370),
	('A068_gold', 'Ferry Rider - Goud', '10 ponten', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A068', 'gold', 'Pont/fiets', 'manual', '{"visual": "Pont/fiets", "threshold": {"raw": "10 ponten", "unit": "", "value": 10.0}, "achievement": "Ferry Rider"}', 371),
	('A068_platinum', 'Ferry Rider - Platinum', 'pontentocht', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A068', 'platinum', 'Pont/fiets', 'manual', '{"visual": "Pont/fiets", "threshold": {"raw": "pontentocht"}, "achievement": "Ferry Rider"}', 372),
	('A069_bronze', 'Bridge Hunter - Brons', '5 bruggen', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A069', 'bronze', 'Brugicoon', 'manual', '{"visual": "Brugicoon", "threshold": {"raw": "5 bruggen", "unit": "", "value": 5.0}, "achievement": "Bridge Hunter"}', 373),
	('A069_silver', 'Bridge Hunter - Zilver', '25 bruggen', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A069', 'silver', 'Brugicoon', 'manual', '{"visual": "Brugicoon", "threshold": {"raw": "25 bruggen", "unit": "", "value": 25.0}, "achievement": "Bridge Hunter"}', 374),
	('A069_gold', 'Bridge Hunter - Goud', '100 bruggen', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A069', 'gold', 'Brugicoon', 'manual', '{"visual": "Brugicoon", "threshold": {"raw": "100 bruggen", "unit": "", "value": 100.0}, "achievement": "Bridge Hunter"}', 375),
	('A069_platinum', 'Bridge Hunter - Platinum', 'iconische bruggen', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A069', 'platinum', 'Brugicoon', 'manual', '{"visual": "Brugicoon", "threshold": {"raw": "iconische bruggen"}, "achievement": "Bridge Hunter"}', 376),
	('A070_bronze', 'Komoot Pioneer - Brons', '1 highlight', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A070', 'bronze', 'Pin op kaart', 'manual', '{"visual": "Pin op kaart", "threshold": {"raw": "1 highlight", "unit": "", "value": 1.0}, "achievement": "Komoot Pioneer"}', 377),
	('A070_silver', 'Komoot Pioneer - Zilver', '5 highlights', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A070', 'silver', 'Pin op kaart', 'manual', '{"visual": "Pin op kaart", "threshold": {"raw": "5 highlights", "unit": "", "value": 5.0}, "achievement": "Komoot Pioneer"}', 378),
	('A070_gold', 'Komoot Pioneer - Goud', '25 highlights', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A070', 'gold', 'Pin op kaart', 'manual', '{"visual": "Pin op kaart", "threshold": {"raw": "25 highlights", "unit": "", "value": 25.0}, "achievement": "Komoot Pioneer"}', 379),
	('A070_platinum', 'Komoot Pioneer - Platinum', 'regio-expert', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A070', 'platinum', 'Pin op kaart', 'manual', '{"visual": "Pin op kaart", "threshold": {"raw": "regio-expert"}, "achievement": "Komoot Pioneer"}', 380),
	('A072_bronze', 'Mud Badge - Brons', 'modderrit', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A072', 'bronze', 'Spatbord/modder', 'manual', '{"visual": "Spatbord/modder", "threshold": {"raw": "modderrit"}, "achievement": "Mud Badge"}', 385),
	('A072_silver', 'Mud Badge - Zilver', 'zware modder', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A072', 'silver', 'Spatbord/modder', 'manual', '{"visual": "Spatbord/modder", "threshold": {"raw": "zware modder"}, "achievement": "Mud Badge"}', 386),
	('A072_gold', 'Mud Badge - Goud', 'fiets volledig vies', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A072', 'gold', 'Spatbord/modder', 'manual', '{"visual": "Spatbord/modder", "threshold": {"raw": "fiets volledig vies"}, "achievement": "Mud Badge"}', 387),
	('A072_platinum', 'Mud Badge - Platinum', 'epische modderdag', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A072', 'platinum', 'Spatbord/modder', 'manual', '{"visual": "Spatbord/modder", "threshold": {"raw": "epische modderdag"}, "achievement": "Mud Badge"}', 388),
	('A073_bronze', 'Hike-a-Bike - Brons', '1 keer lopen', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A073', 'bronze', 'Fiets op schouder', 'manual', '{"visual": "Fiets op schouder", "threshold": {"raw": "1 keer lopen", "unit": "", "value": 1.0}, "achievement": "Hike-a-Bike"}', 389),
	('A073_silver', 'Hike-a-Bike - Zilver', '3 keer', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A073', 'silver', 'Fiets op schouder', 'manual', '{"visual": "Fiets op schouder", "threshold": {"raw": "3 keer", "unit": "", "value": 3.0}, "achievement": "Hike-a-Bike"}', 390),
	('A073_gold', 'Hike-a-Bike - Goud', 'technische rit', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A073', 'gold', 'Fiets op schouder', 'manual', '{"visual": "Fiets op schouder", "threshold": {"raw": "technische rit"}, "achievement": "Hike-a-Bike"}', 391),
	('A073_platinum', 'Hike-a-Bike - Platinum', 'alpiene hike-a-bike', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A073', 'platinum', 'Fiets op schouder', 'manual', '{"visual": "Fiets op schouder", "threshold": {"raw": "alpiene hike-a-bike"}, "achievement": "Hike-a-Bike"}', 392),
	('A074_bronze', 'Bikepacking - Brons', 'dagrit met tassen', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A074', 'bronze', 'Zadeltas', 'manual', '{"visual": "Zadeltas", "threshold": {"raw": "dagrit met tassen"}, "achievement": "Bikepacking"}', 393),
	('A074_silver', 'Bikepacking - Zilver', 'overnachting', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A074', 'silver', 'Zadeltas', 'manual', '{"visual": "Zadeltas", "threshold": {"raw": "overnachting"}, "achievement": "Bikepacking"}', 394),
	('A074_gold', 'Bikepacking - Goud', 'weekend', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A074', 'gold', 'Zadeltas', 'manual', '{"visual": "Zadeltas", "threshold": {"raw": "weekend"}, "achievement": "Bikepacking"}', 395),
	('A074_platinum', 'Bikepacking - Platinum', 'meerdaagse tocht', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A074', 'platinum', 'Zadeltas', 'manual', '{"visual": "Zadeltas", "threshold": {"raw": "meerdaagse tocht"}, "achievement": "Bikepacking"}', 396),
	('A076_bronze', 'Forest Rider - Brons', '25 km bos', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A076', 'bronze', 'Dennenbomen', 'manual', '{"visual": "Dennenbomen", "threshold": {"raw": "25 km bos", "unit": "km", "value": 25.0}, "achievement": "Forest Rider"}', 401),
	('A076_silver', 'Forest Rider - Zilver', '50 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A076', 'silver', 'Dennenbomen', 'manual', '{"visual": "Dennenbomen", "threshold": {"raw": "50 km", "unit": "km", "value": 50.0}, "achievement": "Forest Rider"}', 402),
	('A076_gold', 'Forest Rider - Goud', '100 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A076', 'gold', 'Dennenbomen', 'manual', '{"visual": "Dennenbomen", "threshold": {"raw": "100 km", "unit": "km", "value": 100.0}, "achievement": "Forest Rider"}', 403),
	('A076_platinum', 'Forest Rider - Platinum', 'bosklassieker', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A076', 'platinum', 'Dennenbomen', 'manual', '{"visual": "Dennenbomen", "threshold": {"raw": "bosklassieker"}, "achievement": "Forest Rider"}', 404),
	('A077_bronze', 'Sand Survivor - Brons', 'zandstrook', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A077', 'bronze', 'Zandspoor', 'manual', '{"visual": "Zandspoor", "threshold": {"raw": "zandstrook"}, "achievement": "Sand Survivor"}', 405),
	('A077_silver', 'Sand Survivor - Zilver', 'zandrit', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A077', 'silver', 'Zandspoor', 'manual', '{"visual": "Zandspoor", "threshold": {"raw": "zandrit"}, "achievement": "Sand Survivor"}', 406),
	('A077_gold', 'Sand Survivor - Goud', '50 km zand/gravel', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A077', 'gold', 'Zandspoor', 'manual', '{"visual": "Zandspoor", "threshold": {"raw": "50 km zand/gravel", "unit": "km", "value": 50.0}, "achievement": "Sand Survivor"}', 407),
	('A077_platinum', 'Sand Survivor - Platinum', 'strand/gravel epic', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A077', 'platinum', 'Zandspoor', 'manual', '{"visual": "Zandspoor", "threshold": {"raw": "strand/gravel epic"}, "achievement": "Sand Survivor"}', 408),
	('A078_bronze', 'Rain Adventure - Brons', 'natte rit', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A078', 'bronze', 'Regenwolken', 'manual', '{"visual": "Regenwolken", "threshold": {"raw": "natte rit"}, "achievement": "Rain Adventure"}', 409),
	('A078_silver', 'Rain Adventure - Zilver', 'zware regen', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A078', 'silver', 'Regenwolken', 'manual', '{"visual": "Regenwolken", "threshold": {"raw": "zware regen"}, "achievement": "Rain Adventure"}', 410);
INSERT INTO public.achievement_badges VALUES
	('A078_gold', 'Rain Adventure - Goud', '100 km regen', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A078', 'gold', 'Regenwolken', 'manual', '{"visual": "Regenwolken", "threshold": {"raw": "100 km regen", "unit": "km", "value": 100.0}, "achievement": "Rain Adventure"}', 411),
	('A078_platinum', 'Rain Adventure - Platinum', 'heroïsche regenrit', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A078', 'platinum', 'Regenwolken', 'manual', '{"visual": "Regenwolken", "threshold": {"raw": "heroïsche regenrit"}, "achievement": "Rain Adventure"}', 412),
	('A079_bronze', 'Lost But Found - Brons', 'verkeerd gereden', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A079', 'bronze', 'Kompas', 'manual', '{"visual": "Kompas", "threshold": {"raw": "verkeerd gereden"}, "achievement": "Lost But Found"}', 413),
	('A079_silver', 'Lost But Found - Zilver', 'route herpakt', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A079', 'silver', 'Kompas', 'manual', '{"visual": "Kompas", "threshold": {"raw": "route herpakt"}, "achievement": "Lost But Found"}', 414),
	('A079_gold', 'Lost But Found - Goud', 'omweg afgemaakt', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A079', 'gold', 'Kompas', 'manual', '{"visual": "Kompas", "threshold": {"raw": "omweg afgemaakt"}, "achievement": "Lost But Found"}', 415),
	('A079_platinum', 'Lost But Found - Platinum', 'avontuur gered', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A079', 'platinum', 'Kompas', 'manual', '{"visual": "Kompas", "threshold": {"raw": "avontuur gered"}, "achievement": "Lost But Found"}', 416),
	('A080_bronze', 'Adventure Photographer - Brons', '1 foto', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A080', 'bronze', 'Camera', 'manual', '{"visual": "Camera", "threshold": {"raw": "1 foto", "unit": "", "value": 1.0}, "achievement": "Adventure Photographer"}', 417),
	('A080_silver', 'Adventure Photographer - Zilver', '10 foto’s', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A080', 'silver', 'Camera', 'manual', '{"visual": "Camera", "threshold": {"raw": "10 foto’s", "unit": "", "value": 10.0}, "achievement": "Adventure Photographer"}', 418),
	('A080_gold', 'Adventure Photographer - Goud', '50 foto’s', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A080', 'gold', 'Camera', 'manual', '{"visual": "Camera", "threshold": {"raw": "50 foto’s", "unit": "", "value": 50.0}, "achievement": "Adventure Photographer"}', 419),
	('A080_platinum', 'Adventure Photographer - Platinum', 'iconische fotoreeks', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A080', 'platinum', 'Camera', 'manual', '{"visual": "Camera", "threshold": {"raw": "iconische fotoreeks"}, "achievement": "Adventure Photographer"}', 420),
	('A075_bronze', 'Offroad Century - Brons', '50 km', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A075', 'bronze', 'Bospad', 'auto', '{"visual": "Bospad", "threshold": {"raw": "50 km", "unit": "km", "value": 50.0}, "achievement": "Offroad Century"}', 397),
	('A075_silver', 'Offroad Century - Zilver', '100 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A075', 'silver', 'Bospad', 'auto', '{"visual": "Bospad", "threshold": {"raw": "100 km", "unit": "km", "value": 100.0}, "achievement": "Offroad Century"}', 398),
	('A082_bronze', 'Zwift Route Hunter - Brons', '1 route', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A082', 'bronze', 'Virtuele kaart', 'manual', '{"visual": "Virtuele kaart", "threshold": {"raw": "1 route", "unit": "", "value": 1.0}, "achievement": "Zwift Route Hunter"}', 425),
	('A082_silver', 'Zwift Route Hunter - Zilver', '10 routes', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A082', 'silver', 'Virtuele kaart', 'manual', '{"visual": "Virtuele kaart", "threshold": {"raw": "10 routes", "unit": "", "value": 10.0}, "achievement": "Zwift Route Hunter"}', 426),
	('A082_gold', 'Zwift Route Hunter - Goud', '50 routes', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A082', 'gold', 'Virtuele kaart', 'manual', '{"visual": "Virtuele kaart", "threshold": {"raw": "50 routes", "unit": "", "value": 50.0}, "achievement": "Zwift Route Hunter"}', 427),
	('A082_platinum', 'Zwift Route Hunter - Platinum', 'alle routes', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A082', 'platinum', 'Virtuele kaart', 'manual', '{"visual": "Virtuele kaart", "threshold": {"raw": "alle routes"}, "achievement": "Zwift Route Hunter"}', 428),
	('A086_bronze', 'Zwift Racer - Brons', 'eerste race', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A086', 'bronze', 'Startboog', 'manual', '{"visual": "Startboog", "threshold": {"raw": "eerste race"}, "achievement": "Zwift Racer"}', 441),
	('A086_silver', 'Zwift Racer - Zilver', 'top 10', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A086', 'silver', 'Startboog', 'manual', '{"visual": "Startboog", "threshold": {"raw": "top 10", "unit": "", "value": 10.0}, "achievement": "Zwift Racer"}', 442),
	('A086_gold', 'Zwift Racer - Goud', 'podium', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A086', 'gold', 'Startboog', 'manual', '{"visual": "Startboog", "threshold": {"raw": "podium"}, "achievement": "Zwift Racer"}', 443),
	('A086_platinum', 'Zwift Racer - Platinum', 'winst', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A086', 'platinum', 'Startboog', 'manual', '{"visual": "Startboog", "threshold": {"raw": "winst"}, "achievement": "Zwift Racer"}', 444),
	('A087_bronze', 'Team Time Trial - Brons', 'finish', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A087', 'bronze', 'TTT-formatie', 'manual', '{"visual": "TTT-formatie", "threshold": {"raw": "finish"}, "achievement": "Team Time Trial"}', 445),
	('A087_silver', 'Team Time Trial - Zilver', 'strak team', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A087', 'silver', 'TTT-formatie', 'manual', '{"visual": "TTT-formatie", "threshold": {"raw": "strak team"}, "achievement": "Team Time Trial"}', 446),
	('A087_gold', 'Team Time Trial - Goud', 'podium', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A087', 'gold', 'TTT-formatie', 'manual', '{"visual": "TTT-formatie", "threshold": {"raw": "podium"}, "achievement": "Team Time Trial"}', 447),
	('A087_platinum', 'Team Time Trial - Platinum', 'winst', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A087', 'platinum', 'TTT-formatie', 'manual', '{"visual": "TTT-formatie", "threshold": {"raw": "winst"}, "achievement": "Team Time Trial"}', 448),
	('A085_bronze', 'RoboPacer - Brons', '30 min', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A085', 'bronze', 'Pacergroep', 'auto', '{"visual": "Pacergroep", "threshold": {"raw": "30 min", "unit": "m", "value": 30.0}, "achievement": "RoboPacer"}', 437),
	('A085_silver', 'RoboPacer - Zilver', '1 uur', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A085', 'silver', 'Pacergroep', 'auto', '{"visual": "Pacergroep", "threshold": {"raw": "1 uur", "unit": "uur", "value": 1.0}, "achievement": "RoboPacer"}', 438),
	('A085_gold', 'RoboPacer - Goud', '2 uur', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A085', 'gold', 'Pacergroep', 'auto', '{"visual": "Pacergroep", "threshold": {"raw": "2 uur", "unit": "uur", "value": 2.0}, "achievement": "RoboPacer"}', 439),
	('A085_platinum', 'RoboPacer - Platinum', '4 uur', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A085', 'platinum', 'Pacergroep', 'auto', '{"visual": "Pacergroep", "threshold": {"raw": "4 uur", "unit": "uur", "value": 4.0}, "achievement": "RoboPacer"}', 440),
	('A088_bronze', 'Ride Ons - Brons', '10 ontvangen', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A088', 'bronze', 'Duimpjes', 'auto', '{"visual": "Duimpjes", "threshold": {"raw": "10 ontvangen", "unit": "", "value": 10.0}, "achievement": "Ride Ons"}', 449),
	('A088_silver', 'Ride Ons - Zilver', '50', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A088', 'silver', 'Duimpjes', 'auto', '{"visual": "Duimpjes", "threshold": {"raw": "50", "unit": "", "value": 50.0}, "achievement": "Ride Ons"}', 450),
	('A083_bronze', 'Alpe du Zwift - Brons', 'finish', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A083', 'bronze', 'Virtuele klim', 'auto', '{"visual": "Virtuele klim", "threshold": {"raw": "finish"}, "achievement": "Alpe du Zwift"}', 429),
	('A083_silver', 'Alpe du Zwift - Zilver', 'sub 75', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A083', 'silver', 'Virtuele klim', 'auto', '{"visual": "Virtuele klim", "threshold": {"raw": "sub 75", "unit": "", "value": 75.0}, "achievement": "Alpe du Zwift"}', 430),
	('A083_gold', 'Alpe du Zwift - Goud', 'sub 60', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A083', 'gold', 'Virtuele klim', 'auto', '{"visual": "Virtuele klim", "threshold": {"raw": "sub 60", "unit": "", "value": 60.0}, "achievement": "Alpe du Zwift"}', 431),
	('A083_platinum', 'Alpe du Zwift - Platinum', '25× Alpe', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A083', 'platinum', 'Virtuele klim', 'auto', '{"visual": "Virtuele klim", "threshold": {"raw": "25× Alpe", "unit": "", "value": 25.0}, "achievement": "Alpe du Zwift"}', 432),
	('A089_bronze', 'Workout Finisher - Brons', '1 workout', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A089', 'bronze', 'Workoutblok', 'manual', '{"visual": "Workoutblok", "threshold": {"raw": "1 workout", "unit": "w", "value": 1.0}, "achievement": "Workout Finisher"}', 453),
	('A089_silver', 'Workout Finisher - Zilver', '10 workouts', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A089', 'silver', 'Workoutblok', 'manual', '{"visual": "Workoutblok", "threshold": {"raw": "10 workouts", "unit": "w", "value": 10.0}, "achievement": "Workout Finisher"}', 454),
	('A089_gold', 'Workout Finisher - Goud', 'plan voltooid', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A089', 'gold', 'Workoutblok', 'manual', '{"visual": "Workoutblok", "threshold": {"raw": "plan voltooid"}, "achievement": "Workout Finisher"}', 455),
	('A089_platinum', 'Workout Finisher - Platinum', 'perfect plan', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A089', 'platinum', 'Workoutblok', 'manual', '{"visual": "Workoutblok", "threshold": {"raw": "perfect plan"}, "achievement": "Workout Finisher"}', 456),
	('A091_bronze', 'Gran Fondo Finisher - Brons', 'korte fondo', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A091', 'bronze', 'Startnummer', 'manual', '{"visual": "Startnummer", "threshold": {"raw": "korte fondo"}, "achievement": "Gran Fondo Finisher"}', 461),
	('A091_silver', 'Gran Fondo Finisher - Zilver', 'medio fondo', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A091', 'silver', 'Startnummer', 'manual', '{"visual": "Startnummer", "threshold": {"raw": "medio fondo"}, "achievement": "Gran Fondo Finisher"}', 462),
	('A091_gold', 'Gran Fondo Finisher - Goud', 'gran fondo', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A091', 'gold', 'Startnummer', 'manual', '{"visual": "Startnummer", "threshold": {"raw": "gran fondo"}, "achievement": "Gran Fondo Finisher"}', 463),
	('A091_platinum', 'Gran Fondo Finisher - Platinum', 'zware gran fondo', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A091', 'platinum', 'Startnummer', 'manual', '{"visual": "Startnummer", "threshold": {"raw": "zware gran fondo"}, "achievement": "Gran Fondo Finisher"}', 464),
	('A092_bronze', 'Amstel Gold - Brons', 'lus gereden', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A092', 'bronze', 'Limburgse heuvels', 'manual', '{"visual": "Limburgse heuvels", "threshold": {"raw": "lus gereden"}, "achievement": "Amstel Gold"}', 465),
	('A092_silver', 'Amstel Gold - Zilver', 'toerversie', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A092', 'silver', 'Limburgse heuvels', 'manual', '{"visual": "Limburgse heuvels", "threshold": {"raw": "toerversie"}, "achievement": "Amstel Gold"}', 466),
	('A092_gold', 'Amstel Gold - Goud', 'volledige route', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A092', 'gold', 'Limburgse heuvels', 'manual', '{"visual": "Limburgse heuvels", "threshold": {"raw": "volledige route"}, "achievement": "Amstel Gold"}', 467),
	('A092_platinum', 'Amstel Gold - Platinum', 'snelle finish', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A092', 'platinum', 'Limburgse heuvels', 'manual', '{"visual": "Limburgse heuvels", "threshold": {"raw": "snelle finish"}, "achievement": "Amstel Gold"}', 468),
	('A093_bronze', 'Ronde van Vlaanderen - Brons', 'kasseistrook', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A093', 'bronze', 'Kasseien', 'manual', '{"visual": "Kasseien", "threshold": {"raw": "kasseistrook"}, "achievement": "Ronde van Vlaanderen"}', 469),
	('A093_silver', 'Ronde van Vlaanderen - Zilver', 'meerdere hellingen', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A093', 'silver', 'Kasseien', 'manual', '{"visual": "Kasseien", "threshold": {"raw": "meerdere hellingen"}, "achievement": "Ronde van Vlaanderen"}', 470),
	('A093_gold', 'Ronde van Vlaanderen - Goud', 'cyclo finish', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A093', 'gold', 'Kasseien', 'manual', '{"visual": "Kasseien", "threshold": {"raw": "cyclo finish"}, "achievement": "Ronde van Vlaanderen"}', 471),
	('A093_platinum', 'Ronde van Vlaanderen - Platinum', 'Flandrien', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A093', 'platinum', 'Kasseien', 'manual', '{"visual": "Kasseien", "threshold": {"raw": "Flandrien"}, "achievement": "Ronde van Vlaanderen"}', 472),
	('A094_bronze', 'Luik-Bastenaken-Luik - Brons', 'korte route', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A094', 'bronze', 'Ardennen', 'manual', '{"visual": "Ardennen", "threshold": {"raw": "korte route"}, "achievement": "Luik-Bastenaken-Luik"}', 473),
	('A094_silver', 'Luik-Bastenaken-Luik - Zilver', 'medio', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A094', 'silver', 'Ardennen', 'manual', '{"visual": "Ardennen", "threshold": {"raw": "medio"}, "achievement": "Luik-Bastenaken-Luik"}', 474),
	('A094_gold', 'Luik-Bastenaken-Luik - Goud', 'volledige route', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A094', 'gold', 'Ardennen', 'manual', '{"visual": "Ardennen", "threshold": {"raw": "volledige route"}, "achievement": "Luik-Bastenaken-Luik"}', 475),
	('A094_platinum', 'Luik-Bastenaken-Luik - Platinum', 'heroïsche finish', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A094', 'platinum', 'Ardennen', 'manual', '{"visual": "Ardennen", "threshold": {"raw": "heroïsche finish"}, "achievement": "Luik-Bastenaken-Luik"}', 476),
	('A095_bronze', 'Stelvio Finisher - Brons', 'klim voltooid', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A095', 'bronze', 'Haarspelden', 'auto', '{"visual": "Haarspelden", "threshold": {"raw": "klim voltooid"}, "achievement": "Stelvio Finisher"}', 477),
	('A095_silver', 'Stelvio Finisher - Zilver', 'sterke tijd', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A095', 'silver', 'Haarspelden', 'auto', '{"visual": "Haarspelden", "threshold": {"raw": "sterke tijd"}, "achievement": "Stelvio Finisher"}', 478),
	('A095_gold', 'Stelvio Finisher - Goud', 'Stelvio 4 Life', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A095', 'gold', 'Haarspelden', 'auto', '{"visual": "Haarspelden", "threshold": {"raw": "Stelvio 4 Life", "unit": "", "value": 4.0}, "achievement": "Stelvio Finisher"}', 479),
	('A095_platinum', 'Stelvio Finisher - Platinum', 'dubbele Stelvio', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A095', 'platinum', 'Haarspelden', 'auto', '{"visual": "Haarspelden", "threshold": {"raw": "dubbele Stelvio"}, "achievement": "Stelvio Finisher"}', 480),
	('A097_bronze', 'Paris-Brest-Paris - Brons', 'kwalificatie', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A097', 'bronze', 'Nacht + brevet', 'manual', '{"visual": "Nacht + brevet", "threshold": {"raw": "kwalificatie"}, "achievement": "Paris-Brest-Paris"}', 485),
	('A097_silver', 'Paris-Brest-Paris - Zilver', 'gestart', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A097', 'silver', 'Nacht + brevet', 'manual', '{"visual": "Nacht + brevet", "threshold": {"raw": "gestart"}, "achievement": "Paris-Brest-Paris"}', 486),
	('A097_gold', 'Paris-Brest-Paris - Goud', 'gefinisht', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A097', 'gold', 'Nacht + brevet', 'manual', '{"visual": "Nacht + brevet", "threshold": {"raw": "gefinisht"}, "achievement": "Paris-Brest-Paris"}', 487),
	('A097_platinum', 'Paris-Brest-Paris - Platinum', 'subdoel gehaald', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A097', 'platinum', 'Nacht + brevet', 'manual', '{"visual": "Nacht + brevet", "threshold": {"raw": "subdoel gehaald"}, "achievement": "Paris-Brest-Paris"}', 488),
	('A098_bronze', 'Flandrien Challenge - Brons', '10 segmenten', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A098', 'bronze', 'Kasseikroon', 'manual', '{"visual": "Kasseikroon", "threshold": {"raw": "10 segmenten", "unit": "seg", "value": 10.0}, "achievement": "Flandrien Challenge"}', 489),
	('A098_silver', 'Flandrien Challenge - Zilver', '25 segmenten', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A098', 'silver', 'Kasseikroon', 'manual', '{"visual": "Kasseikroon", "threshold": {"raw": "25 segmenten", "unit": "seg", "value": 25.0}, "achievement": "Flandrien Challenge"}', 490),
	('A098_gold', 'Flandrien Challenge - Goud', '59 segmenten', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A098', 'gold', 'Kasseikroon', 'manual', '{"visual": "Kasseikroon", "threshold": {"raw": "59 segmenten", "unit": "seg", "value": 59.0}, "achievement": "Flandrien Challenge"}', 491),
	('A098_platinum', 'Flandrien Challenge - Platinum', 'binnen 72u', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A098', 'platinum', 'Kasseikroon', 'manual', '{"visual": "Kasseikroon", "threshold": {"raw": "binnen 72u", "unit": "u", "value": 72.0}, "achievement": "Flandrien Challenge"}', 492),
	('A099_bronze', 'Classic Collector - Brons', '1 klassieker', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A099', 'bronze', 'Trofeeënwand', 'manual', '{"visual": "Trofeeënwand", "threshold": {"raw": "1 klassieker", "unit": "", "value": 1.0}, "achievement": "Classic Collector"}', 493),
	('A099_silver', 'Classic Collector - Zilver', '3 klassiekers', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A099', 'silver', 'Trofeeënwand', 'manual', '{"visual": "Trofeeënwand", "threshold": {"raw": "3 klassiekers", "unit": "", "value": 3.0}, "achievement": "Classic Collector"}', 494),
	('A099_gold', 'Classic Collector - Goud', '5 klassiekers', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A099', 'gold', 'Trofeeënwand', 'manual', '{"visual": "Trofeeënwand", "threshold": {"raw": "5 klassiekers", "unit": "", "value": 5.0}, "achievement": "Classic Collector"}', 495),
	('A099_platinum', 'Classic Collector - Platinum', '10 klassiekers', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A099', 'platinum', 'Trofeeënwand', 'manual', '{"visual": "Trofeeënwand", "threshold": {"raw": "10 klassiekers", "unit": "", "value": 10.0}, "achievement": "Classic Collector"}', 496),
	('A100_bronze', 'Legendary Cyclist - Brons', '5 gouden badges', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A100', 'bronze', 'Grote kroon', 'manual', '{"visual": "Grote kroon", "threshold": {"raw": "5 gouden badges", "unit": "", "value": 5.0}, "achievement": "Legendary Cyclist"}', 497),
	('A100_silver', 'Legendary Cyclist - Zilver', '10 gouden', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A100', 'silver', 'Grote kroon', 'manual', '{"visual": "Grote kroon", "threshold": {"raw": "10 gouden", "unit": "", "value": 10.0}, "achievement": "Legendary Cyclist"}', 498),
	('A100_gold', 'Legendary Cyclist - Goud', '25 gouden', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A100', 'gold', 'Grote kroon', 'manual', '{"visual": "Grote kroon", "threshold": {"raw": "25 gouden", "unit": "", "value": 25.0}, "achievement": "Legendary Cyclist"}', 499),
	('A100_platinum', 'Legendary Cyclist - Platinum', '50 platinum', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A100', 'platinum', 'Grote kroon', 'manual', '{"visual": "Grote kroon", "threshold": {"raw": "50 platinum", "unit": "", "value": 50.0}, "achievement": "Legendary Cyclist"}', 500),
	('A001_silver', 'Distance Ride - Zilver', '100 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A001', 'silver', 'Weg, kilometerpaal, racefiets', 'auto', '{"visual": "Weg, kilometerpaal, racefiets", "threshold": {"raw": "100 km", "unit": "km", "value": 100.0}, "achievement": "Distance Ride"}', 102),
	('A001_gold', 'Distance Ride - Goud', '160 km / 100 mi', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A001', 'gold', 'Weg, kilometerpaal, racefiets', 'auto', '{"visual": "Weg, kilometerpaal, racefiets", "threshold": {"raw": "160 km / 100 mi", "unit": "km", "value": 160.0}, "achievement": "Distance Ride"}', 103),
	('A001_platinum', 'Distance Ride - Platinum', '200 km', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A001', 'platinum', 'Weg, kilometerpaal, racefiets', 'auto', '{"visual": "Weg, kilometerpaal, racefiets", "threshold": {"raw": "200 km", "unit": "km", "value": 200.0}, "achievement": "Distance Ride"}', 104),
	('A002_bronze', 'Climbing Ride - Brons', '500 hm', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A002', 'bronze', 'Berg, haarspeldbocht', 'auto', '{"visual": "Berg, haarspeldbocht", "threshold": {"raw": "500 hm", "unit": "hm", "value": 500.0}, "achievement": "Climbing Ride"}', 105),
	('A002_silver', 'Climbing Ride - Zilver', '1.000 hm', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A002', 'silver', 'Berg, haarspeldbocht', 'auto', '{"visual": "Berg, haarspeldbocht", "threshold": {"raw": "1.000 hm", "unit": "hm", "value": 1000.0}, "achievement": "Climbing Ride"}', 106),
	('A002_gold', 'Climbing Ride - Goud', '3.000 hm', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A002', 'gold', 'Berg, haarspeldbocht', 'auto', '{"visual": "Berg, haarspeldbocht", "threshold": {"raw": "3.000 hm", "unit": "hm", "value": 3000.0}, "achievement": "Climbing Ride"}', 107),
	('A002_platinum', 'Climbing Ride - Platinum', '5.000 hm', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A002', 'platinum', 'Berg, haarspeldbocht', 'auto', '{"visual": "Berg, haarspeldbocht", "threshold": {"raw": "5.000 hm", "unit": "hm", "value": 5000.0}, "achievement": "Climbing Ride"}', 108),
	('A003_bronze', 'Long Day Out - Brons', '2 uur', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A003', 'bronze', 'Zon, klok, lange weg', 'auto', '{"visual": "Zon, klok, lange weg", "threshold": {"raw": "2 uur", "unit": "uur", "value": 2.0}, "achievement": "Long Day Out"}', 109),
	('A003_silver', 'Long Day Out - Zilver', '4 uur', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A003', 'silver', 'Zon, klok, lange weg', 'auto', '{"visual": "Zon, klok, lange weg", "threshold": {"raw": "4 uur", "unit": "uur", "value": 4.0}, "achievement": "Long Day Out"}', 110),
	('A003_gold', 'Long Day Out - Goud', '6 uur', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A003', 'gold', 'Zon, klok, lange weg', 'auto', '{"visual": "Zon, klok, lange weg", "threshold": {"raw": "6 uur", "unit": "uur", "value": 6.0}, "achievement": "Long Day Out"}', 111),
	('A003_platinum', 'Long Day Out - Platinum', '10 uur', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A003', 'platinum', 'Zon, klok, lange weg', 'auto', '{"visual": "Zon, klok, lange weg", "threshold": {"raw": "10 uur", "unit": "uur", "value": 10.0}, "achievement": "Long Day Out"}', 112),
	('A005_bronze', 'Solo Warrior - Brons', '50 km solo', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A005', 'bronze', 'Eén renner op open weg', 'auto', '{"visual": "Eén renner op open weg", "threshold": {"raw": "50 km solo", "unit": "km", "value": 50.0}, "achievement": "Solo Warrior"}', 117),
	('A005_silver', 'Solo Warrior - Zilver', '100 km solo', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A005', 'silver', 'Eén renner op open weg', 'auto', '{"visual": "Eén renner op open weg", "threshold": {"raw": "100 km solo", "unit": "km", "value": 100.0}, "achievement": "Solo Warrior"}', 118),
	('A005_gold', 'Solo Warrior - Goud', '150 km solo', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A005', 'gold', 'Eén renner op open weg', 'auto', '{"visual": "Eén renner op open weg", "threshold": {"raw": "150 km solo", "unit": "km", "value": 150.0}, "achievement": "Solo Warrior"}', 119),
	('A005_platinum', 'Solo Warrior - Platinum', '200 km solo', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A005', 'platinum', 'Eén renner op open weg', 'auto', '{"visual": "Eén renner op open weg", "threshold": {"raw": "200 km solo", "unit": "km", "value": 200.0}, "achievement": "Solo Warrior"}', 120),
	('A006_bronze', 'Speed Ride - Brons', '25 km/u over 50 km', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A006', 'bronze', 'Snelheidslijnen', 'auto', '{"visual": "Snelheidslijnen", "threshold": {"raw": "25 km/u over 50 km", "unit": "km", "value": 25.0}, "achievement": "Speed Ride"}', 121),
	('A006_silver', 'Speed Ride - Zilver', '30 km/u over 50 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A006', 'silver', 'Snelheidslijnen', 'auto', '{"visual": "Snelheidslijnen", "threshold": {"raw": "30 km/u over 50 km", "unit": "km", "value": 30.0}, "achievement": "Speed Ride"}', 122),
	('A006_gold', 'Speed Ride - Goud', '30 km/u over 100 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A006', 'gold', 'Snelheidslijnen', 'auto', '{"visual": "Snelheidslijnen", "threshold": {"raw": "30 km/u over 100 km", "unit": "km", "value": 30.0}, "achievement": "Speed Ride"}', 123),
	('A006_platinum', 'Speed Ride - Platinum', '35 km/u over 100 km', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A006', 'platinum', 'Snelheidslijnen', 'auto', '{"visual": "Snelheidslijnen", "threshold": {"raw": "35 km/u over 100 km", "unit": "km", "value": 35.0}, "achievement": "Speed Ride"}', 124),
	('A007_bronze', 'Century Club - Brons', '100 km', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A007', 'bronze', 'Kilometerbord “100”', 'auto', '{"visual": "Kilometerbord “100”", "threshold": {"raw": "100 km", "unit": "km", "value": 100.0}, "achievement": "Century Club"}', 125),
	('A007_silver', 'Century Club - Zilver', '5× 100 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A007', 'silver', 'Kilometerbord “100”', 'auto', '{"visual": "Kilometerbord “100”", "threshold": {"raw": "5× 100 km", "unit": "", "value": 5.0}, "achievement": "Century Club"}', 126),
	('A007_gold', 'Century Club - Goud', '10× 100 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A007', 'gold', 'Kilometerbord “100”', 'auto', '{"visual": "Kilometerbord “100”", "threshold": {"raw": "10× 100 km", "unit": "", "value": 10.0}, "achievement": "Century Club"}', 127),
	('A007_platinum', 'Century Club - Platinum', '25× 100 km', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A007', 'platinum', 'Kilometerbord “100”', 'auto', '{"visual": "Kilometerbord “100”", "threshold": {"raw": "25× 100 km", "unit": "", "value": 25.0}, "achievement": "Century Club"}', 128),
	('A008_bronze', 'Double Century - Brons', '150 km', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A008', 'bronze', 'Lange rechte weg', 'auto', '{"visual": "Lange rechte weg", "threshold": {"raw": "150 km", "unit": "km", "value": 150.0}, "achievement": "Double Century"}', 129),
	('A008_silver', 'Double Century - Zilver', '200 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A008', 'silver', 'Lange rechte weg', 'auto', '{"visual": "Lange rechte weg", "threshold": {"raw": "200 km", "unit": "km", "value": 200.0}, "achievement": "Double Century"}', 130),
	('A008_gold', 'Double Century - Goud', '250 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A008', 'gold', 'Lange rechte weg', 'auto', '{"visual": "Lange rechte weg", "threshold": {"raw": "250 km", "unit": "km", "value": 250.0}, "achievement": "Double Century"}', 131),
	('A008_platinum', 'Double Century - Platinum', '300 km', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A008', 'platinum', 'Lange rechte weg', 'auto', '{"visual": "Lange rechte weg", "threshold": {"raw": "300 km", "unit": "km", "value": 300.0}, "achievement": "Double Century"}', 132),
	('A027_bronze', 'Sunrise Rider - Brons', 'zonsopkomstrit', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A027', 'bronze', 'Oranje horizon', 'auto', '{"visual": "Oranje horizon", "threshold": {"raw": "zonsopkomstrit"}, "achievement": "Sunrise Rider"}', 205),
	('A027_silver', 'Sunrise Rider - Zilver', '3×', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A027', 'silver', 'Oranje horizon', 'auto', '{"visual": "Oranje horizon", "threshold": {"raw": "3×", "unit": "", "value": 3.0}, "achievement": "Sunrise Rider"}', 206),
	('A027_gold', 'Sunrise Rider - Goud', '10×', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A027', 'gold', 'Oranje horizon', 'auto', '{"visual": "Oranje horizon", "threshold": {"raw": "10×", "unit": "", "value": 10.0}, "achievement": "Sunrise Rider"}', 207),
	('A027_platinum', 'Sunrise Rider - Platinum', '25×', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A027', 'platinum', 'Oranje horizon', 'auto', '{"visual": "Oranje horizon", "threshold": {"raw": "25×", "unit": "", "value": 25.0}, "achievement": "Sunrise Rider"}', 208),
	('A028_bronze', 'Sunset Rider - Brons', 'zonsondergangrit', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A028', 'bronze', 'Avondlucht', 'auto', '{"visual": "Avondlucht", "threshold": {"raw": "zonsondergangrit"}, "achievement": "Sunset Rider"}', 209),
	('A028_silver', 'Sunset Rider - Zilver', '3×', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A028', 'silver', 'Avondlucht', 'auto', '{"visual": "Avondlucht", "threshold": {"raw": "3×", "unit": "", "value": 3.0}, "achievement": "Sunset Rider"}', 210),
	('A028_gold', 'Sunset Rider - Goud', '10×', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A028', 'gold', 'Avondlucht', 'auto', '{"visual": "Avondlucht", "threshold": {"raw": "10×", "unit": "", "value": 10.0}, "achievement": "Sunset Rider"}', 211),
	('A028_platinum', 'Sunset Rider - Platinum', '25×', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A028', 'platinum', 'Avondlucht', 'auto', '{"visual": "Avondlucht", "threshold": {"raw": "25×", "unit": "", "value": 25.0}, "achievement": "Sunset Rider"}', 212),
	('A029_bronze', '24 Hour Legs - Brons', '6 uur', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A029', 'bronze', 'Klok + fiets', 'auto', '{"visual": "Klok + fiets", "threshold": {"raw": "6 uur", "unit": "uur", "value": 6.0}, "achievement": "24 Hour Legs"}', 213),
	('A029_silver', '24 Hour Legs - Zilver', '12 uur', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A029', 'silver', 'Klok + fiets', 'auto', '{"visual": "Klok + fiets", "threshold": {"raw": "12 uur", "unit": "uur", "value": 12.0}, "achievement": "24 Hour Legs"}', 214),
	('A029_gold', '24 Hour Legs - Goud', '18 uur', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A029', 'gold', 'Klok + fiets', 'auto', '{"visual": "Klok + fiets", "threshold": {"raw": "18 uur", "unit": "uur", "value": 18.0}, "achievement": "24 Hour Legs"}', 215),
	('A029_platinum', '24 Hour Legs - Platinum', '24 uur', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A029', 'platinum', 'Klok + fiets', 'auto', '{"visual": "Klok + fiets", "threshold": {"raw": "24 uur", "unit": "uur", "value": 24.0}, "achievement": "24 Hour Legs"}', 216),
	('A030_bronze', 'Ultra Starter - Brons', '200 km', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A030', 'bronze', 'Brevetkaart', 'auto', '{"visual": "Brevetkaart", "threshold": {"raw": "200 km", "unit": "km", "value": 200.0}, "achievement": "Ultra Starter"}', 217),
	('A030_silver', 'Ultra Starter - Zilver', '300 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A030', 'silver', 'Brevetkaart', 'auto', '{"visual": "Brevetkaart", "threshold": {"raw": "300 km", "unit": "km", "value": 300.0}, "achievement": "Ultra Starter"}', 218),
	('A030_gold', 'Ultra Starter - Goud', '400 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A030', 'gold', 'Brevetkaart', 'auto', '{"visual": "Brevetkaart", "threshold": {"raw": "400 km", "unit": "km", "value": 400.0}, "achievement": "Ultra Starter"}', 219),
	('A030_platinum', 'Ultra Starter - Platinum', '600 km', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A030', 'platinum', 'Brevetkaart', 'auto', '{"visual": "Brevetkaart", "threshold": {"raw": "600 km", "unit": "km", "value": 600.0}, "achievement": "Ultra Starter"}', 220),
	('A038_bronze', 'Fast Century - Brons', '100 km < 4u', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A038', 'bronze', 'Snelwegmarkering', 'auto', '{"visual": "Snelwegmarkering", "threshold": {"raw": "100 km < 4u", "unit": "km", "value": 100.0}, "achievement": "Fast Century"}', 249),
	('A038_silver', 'Fast Century - Zilver', '< 3u30', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A038', 'silver', 'Snelwegmarkering', 'auto', '{"visual": "Snelwegmarkering", "threshold": {"raw": "< 3u30", "unit": "u", "value": 3.0}, "achievement": "Fast Century"}', 250),
	('A038_gold', 'Fast Century - Goud', '< 3u15', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A038', 'gold', 'Snelwegmarkering', 'auto', '{"visual": "Snelwegmarkering", "threshold": {"raw": "< 3u15", "unit": "u", "value": 3.0}, "achievement": "Fast Century"}', 251),
	('A038_platinum', 'Fast Century - Platinum', '< 3u', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A038', 'platinum', 'Snelwegmarkering', 'auto', '{"visual": "Snelwegmarkering", "threshold": {"raw": "< 3u", "unit": "u", "value": 3.0}, "achievement": "Fast Century"}', 252),
	('A039_bronze', 'Fast 40 - Brons', '40 km < 1u30', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A039', 'bronze', 'Tijdrithelm', 'auto', '{"visual": "Tijdrithelm", "threshold": {"raw": "40 km < 1u30", "unit": "km", "value": 40.0}, "achievement": "Fast 40"}', 253),
	('A039_silver', 'Fast 40 - Zilver', '< 1u15', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A039', 'silver', 'Tijdrithelm', 'auto', '{"visual": "Tijdrithelm", "threshold": {"raw": "< 1u15", "unit": "u", "value": 1.0}, "achievement": "Fast 40"}', 254),
	('A039_gold', 'Fast 40 - Goud', '< 1u05', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A039', 'gold', 'Tijdrithelm', 'auto', '{"visual": "Tijdrithelm", "threshold": {"raw": "< 1u05", "unit": "u", "value": 1.0}, "achievement": "Fast 40"}', 255),
	('A039_platinum', 'Fast 40 - Platinum', '< 1u', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A039', 'platinum', 'Tijdrithelm', 'auto', '{"visual": "Tijdrithelm", "threshold": {"raw": "< 1u", "unit": "u", "value": 1.0}, "achievement": "Fast 40"}', 256),
	('A041_bronze', 'Ride Streak - Brons', '3 dagen', 'milestone', 'refresh', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A041', 'bronze', 'Kalender', 'auto', '{"visual": "Kalender", "threshold": {"raw": "3 dagen", "unit": "dag", "value": 3.0}, "achievement": "Ride Streak"}', 261),
	('A041_silver', 'Ride Streak - Zilver', '7 dagen', 'milestone', 'refresh', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A041', 'silver', 'Kalender', 'auto', '{"visual": "Kalender", "threshold": {"raw": "7 dagen", "unit": "dag", "value": 7.0}, "achievement": "Ride Streak"}', 262),
	('A041_gold', 'Ride Streak - Goud', '14 dagen', 'milestone', 'refresh', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A041', 'gold', 'Kalender', 'auto', '{"visual": "Kalender", "threshold": {"raw": "14 dagen", "unit": "dag", "value": 14.0}, "achievement": "Ride Streak"}', 263),
	('A041_platinum', 'Ride Streak - Platinum', '30 dagen', 'milestone', 'refresh', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A041', 'platinum', 'Kalender', 'auto', '{"visual": "Kalender", "threshold": {"raw": "30 dagen", "unit": "dag", "value": 30.0}, "achievement": "Ride Streak"}', 264),
	('A042_bronze', 'Weekly Rider - Brons', '4 weken', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A042', 'bronze', 'Weekkalender', 'auto', '{"visual": "Weekkalender", "threshold": {"raw": "4 weken", "unit": "w", "value": 4.0}, "achievement": "Weekly Rider"}', 265),
	('A042_silver', 'Weekly Rider - Zilver', '8 weken', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A042', 'silver', 'Weekkalender', 'auto', '{"visual": "Weekkalender", "threshold": {"raw": "8 weken", "unit": "w", "value": 8.0}, "achievement": "Weekly Rider"}', 266),
	('A042_gold', 'Weekly Rider - Goud', '26 weken', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A042', 'gold', 'Weekkalender', 'auto', '{"visual": "Weekkalender", "threshold": {"raw": "26 weken", "unit": "w", "value": 26.0}, "achievement": "Weekly Rider"}', 267),
	('A042_platinum', 'Weekly Rider - Platinum', '52 weken', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A042', 'platinum', 'Weekkalender', 'auto', '{"visual": "Weekkalender", "threshold": {"raw": "52 weken", "unit": "w", "value": 52.0}, "achievement": "Weekly Rider"}', 268),
	('A043_bronze', 'Monthly Distance - Brons', '500 km', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A043', 'bronze', 'Maandmeter', 'auto', '{"visual": "Maandmeter", "threshold": {"raw": "500 km", "unit": "km", "value": 500.0}, "achievement": "Monthly Distance"}', 269),
	('A043_silver', 'Monthly Distance - Zilver', '1.000 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A043', 'silver', 'Maandmeter', 'auto', '{"visual": "Maandmeter", "threshold": {"raw": "1.000 km", "unit": "km", "value": 1000.0}, "achievement": "Monthly Distance"}', 270),
	('A043_gold', 'Monthly Distance - Goud', '1.500 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A043', 'gold', 'Maandmeter', 'auto', '{"visual": "Maandmeter", "threshold": {"raw": "1.500 km", "unit": "km", "value": 1500.0}, "achievement": "Monthly Distance"}', 271),
	('A043_platinum', 'Monthly Distance - Platinum', '2.000 km', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A043', 'platinum', 'Maandmeter', 'auto', '{"visual": "Maandmeter", "threshold": {"raw": "2.000 km", "unit": "km", "value": 2000.0}, "achievement": "Monthly Distance"}', 272),
	('A044_bronze', 'Year Distance - Brons', '5.000 km', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A044', 'bronze', 'Jaarteller', 'auto', '{"visual": "Jaarteller", "threshold": {"raw": "5.000 km", "unit": "km", "value": 5000.0}, "achievement": "Year Distance"}', 273),
	('A044_silver', 'Year Distance - Zilver', '10.000 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A044', 'silver', 'Jaarteller', 'auto', '{"visual": "Jaarteller", "threshold": {"raw": "10.000 km", "unit": "km", "value": 10000.0}, "achievement": "Year Distance"}', 274),
	('A044_gold', 'Year Distance - Goud', '15.000 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A044', 'gold', 'Jaarteller', 'auto', '{"visual": "Jaarteller", "threshold": {"raw": "15.000 km", "unit": "km", "value": 15000.0}, "achievement": "Year Distance"}', 275),
	('A044_platinum', 'Year Distance - Platinum', '20.000 km', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A044', 'platinum', 'Jaarteller', 'auto', '{"visual": "Jaarteller", "threshold": {"raw": "20.000 km", "unit": "km", "value": 20000.0}, "achievement": "Year Distance"}', 276),
	('A045_bronze', 'Elevation Year - Brons', '50.000 hm', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A045', 'bronze', 'Hoogtemeter', 'auto', '{"visual": "Hoogtemeter", "threshold": {"raw": "50.000 hm", "unit": "hm", "value": 50000.0}, "achievement": "Elevation Year"}', 277),
	('A045_silver', 'Elevation Year - Zilver', '100.000 hm', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A045', 'silver', 'Hoogtemeter', 'auto', '{"visual": "Hoogtemeter", "threshold": {"raw": "100.000 hm", "unit": "hm", "value": 100000.0}, "achievement": "Elevation Year"}', 278),
	('A045_gold', 'Elevation Year - Goud', '150.000 hm', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A045', 'gold', 'Hoogtemeter', 'auto', '{"visual": "Hoogtemeter", "threshold": {"raw": "150.000 hm", "unit": "hm", "value": 150000.0}, "achievement": "Elevation Year"}', 279),
	('A045_platinum', 'Elevation Year - Platinum', '250.000 hm', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A045', 'platinum', 'Hoogtemeter', 'auto', '{"visual": "Hoogtemeter", "threshold": {"raw": "250.000 hm", "unit": "hm", "value": 250000.0}, "achievement": "Elevation Year"}', 280),
	('A057_bronze', 'Kudos Magnet - Brons', '10 kudos', 'milestone', 'heart', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A057', 'bronze', 'Duimpjes/hartjes', 'auto', '{"visual": "Duimpjes/hartjes", "threshold": {"raw": "10 kudos", "unit": "", "value": 10.0}, "achievement": "Kudos Magnet"}', 325),
	('A057_silver', 'Kudos Magnet - Zilver', '50 kudos', 'milestone', 'heart', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A057', 'silver', 'Duimpjes/hartjes', 'auto', '{"visual": "Duimpjes/hartjes", "threshold": {"raw": "50 kudos", "unit": "", "value": 50.0}, "achievement": "Kudos Magnet"}', 326),
	('A057_gold', 'Kudos Magnet - Goud', '100 kudos', 'milestone', 'heart', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A057', 'gold', 'Duimpjes/hartjes', 'auto', '{"visual": "Duimpjes/hartjes", "threshold": {"raw": "100 kudos", "unit": "", "value": 100.0}, "achievement": "Kudos Magnet"}', 327),
	('A057_platinum', 'Kudos Magnet - Platinum', '250 kudos', 'milestone', 'heart', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A057', 'platinum', 'Duimpjes/hartjes', 'auto', '{"visual": "Duimpjes/hartjes", "threshold": {"raw": "250 kudos", "unit": "", "value": 250.0}, "achievement": "Kudos Magnet"}', 328),
	('A071_bronze', 'Gravel Starter - Brons', '25 km gravel', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A071', 'bronze', 'Gravelpad', 'auto', '{"visual": "Gravelpad", "threshold": {"raw": "25 km gravel", "unit": "km", "value": 25.0}, "achievement": "Gravel Starter"}', 381),
	('A071_silver', 'Gravel Starter - Zilver', '50 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A071', 'silver', 'Gravelpad', 'auto', '{"visual": "Gravelpad", "threshold": {"raw": "50 km", "unit": "km", "value": 50.0}, "achievement": "Gravel Starter"}', 382),
	('A071_gold', 'Gravel Starter - Goud', '100 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A071', 'gold', 'Gravelpad', 'auto', '{"visual": "Gravelpad", "threshold": {"raw": "100 km", "unit": "km", "value": 100.0}, "achievement": "Gravel Starter"}', 383),
	('A071_platinum', 'Gravel Starter - Platinum', '200 km', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A071', 'platinum', 'Gravelpad', 'auto', '{"visual": "Gravelpad", "threshold": {"raw": "200 km", "unit": "km", "value": 200.0}, "achievement": "Gravel Starter"}', 384),
	('A081_bronze', 'Indoor Starter - Brons', '30 min', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A081', 'bronze', 'Smart trainer', 'auto', '{"visual": "Smart trainer", "threshold": {"raw": "30 min", "unit": "m", "value": 30.0}, "achievement": "Indoor Starter"}', 421),
	('A081_silver', 'Indoor Starter - Zilver', '1 uur', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A081', 'silver', 'Smart trainer', 'auto', '{"visual": "Smart trainer", "threshold": {"raw": "1 uur", "unit": "uur", "value": 1.0}, "achievement": "Indoor Starter"}', 422),
	('A081_gold', 'Indoor Starter - Goud', '2 uur', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A081', 'gold', 'Smart trainer', 'auto', '{"visual": "Smart trainer", "threshold": {"raw": "2 uur", "unit": "uur", "value": 2.0}, "achievement": "Indoor Starter"}', 423),
	('A081_platinum', 'Indoor Starter - Platinum', '4 uur', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A081', 'platinum', 'Smart trainer', 'auto', '{"visual": "Smart trainer", "threshold": {"raw": "4 uur", "unit": "uur", "value": 4.0}, "achievement": "Indoor Starter"}', 424),
	('A084_bronze', 'Indoor Century - Brons', '50 km', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A084', 'bronze', 'Binnenfiets', 'auto', '{"visual": "Binnenfiets", "threshold": {"raw": "50 km", "unit": "km", "value": 50.0}, "achievement": "Indoor Century"}', 433),
	('A084_silver', 'Indoor Century - Zilver', '100 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A084', 'silver', 'Binnenfiets', 'auto', '{"visual": "Binnenfiets", "threshold": {"raw": "100 km", "unit": "km", "value": 100.0}, "achievement": "Indoor Century"}', 434),
	('A084_gold', 'Indoor Century - Goud', '160 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A084', 'gold', 'Binnenfiets', 'auto', '{"visual": "Binnenfiets", "threshold": {"raw": "160 km", "unit": "km", "value": 160.0}, "achievement": "Indoor Century"}', 435),
	('A084_platinum', 'Indoor Century - Platinum', '200 km', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A084', 'platinum', 'Binnenfiets', 'auto', '{"visual": "Binnenfiets", "threshold": {"raw": "200 km", "unit": "km", "value": 200.0}, "achievement": "Indoor Century"}', 436),
	('A012_gold', 'Mountain Goat - Goud', '3.000 hm', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A012', 'gold', 'Geit/bergicoon', 'auto', '{"visual": "Geit/bergicoon", "threshold": {"raw": "3.000 hm", "unit": "hm", "value": 3000.0}, "achievement": "Mountain Goat"}', 147),
	('A012_platinum', 'Mountain Goat - Platinum', '5.000 hm', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A012', 'platinum', 'Geit/bergicoon', 'auto', '{"visual": "Geit/bergicoon", "threshold": {"raw": "5.000 hm", "unit": "hm", "value": 5000.0}, "achievement": "Mountain Goat"}', 148),
	('A017_bronze', 'Everesting Prep - Brons', '2.212 hm', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A017', 'bronze', 'Everest-silhouet', 'auto', '{"visual": "Everest-silhouet", "threshold": {"raw": "2.212 hm", "unit": "hm", "value": 2212.0}, "achievement": "Everesting Prep"}', 165),
	('A017_silver', 'Everesting Prep - Zilver', '4.424 hm', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A017', 'silver', 'Everest-silhouet', 'auto', '{"visual": "Everest-silhouet", "threshold": {"raw": "4.424 hm", "unit": "hm", "value": 4424.0}, "achievement": "Everesting Prep"}', 166),
	('A017_gold', 'Everesting Prep - Goud', '6.000 hm', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A017', 'gold', 'Everest-silhouet', 'auto', '{"visual": "Everest-silhouet", "threshold": {"raw": "6.000 hm", "unit": "hm", "value": 6000.0}, "achievement": "Everesting Prep"}', 167),
	('A017_platinum', 'Everesting Prep - Platinum', '8.848 hm', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A017', 'platinum', 'Everest-silhouet', 'auto', '{"visual": "Everest-silhouet", "threshold": {"raw": "8.848 hm", "unit": "hm", "value": 8848.0}, "achievement": "Everesting Prep"}', 168),
	('A018_bronze', 'Everesting - Brons', 'Quarter', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A018', 'bronze', 'Hoge berg, 8848m', 'auto', '{"visual": "Hoge berg, 8848m", "threshold": {"raw": "Quarter"}, "achievement": "Everesting"}', 169),
	('A018_silver', 'Everesting - Zilver', 'Half', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A018', 'silver', 'Hoge berg, 8848m', 'auto', '{"visual": "Hoge berg, 8848m", "threshold": {"raw": "Half"}, "achievement": "Everesting"}', 170),
	('A018_gold', 'Everesting - Goud', 'Full', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A018', 'gold', 'Hoge berg, 8848m', 'auto', '{"visual": "Hoge berg, 8848m", "threshold": {"raw": "Full"}, "achievement": "Everesting"}', 171),
	('A018_platinum', 'Everesting - Platinum', '10K', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A018', 'platinum', 'Hoge berg, 8848m', 'auto', '{"visual": "Hoge berg, 8848m", "threshold": {"raw": "10K", "unit": "", "value": 10.0}, "achievement": "Everesting"}', 172),
	('A020_bronze', 'Alpine Epic - Brons', '100 km bergen', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A020', 'bronze', 'Alpenweg', 'auto', '{"visual": "Alpenweg", "threshold": {"raw": "100 km bergen", "unit": "km", "value": 100.0}, "achievement": "Alpine Epic"}', 177),
	('A020_silver', 'Alpine Epic - Zilver', '150 km bergen', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A020', 'silver', 'Alpenweg', 'auto', '{"visual": "Alpenweg", "threshold": {"raw": "150 km bergen", "unit": "km", "value": 150.0}, "achievement": "Alpine Epic"}', 178),
	('A020_gold', 'Alpine Epic - Goud', '175 km bergen', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A020', 'gold', 'Alpenweg', 'auto', '{"visual": "Alpenweg", "threshold": {"raw": "175 km bergen", "unit": "km", "value": 175.0}, "achievement": "Alpine Epic"}', 179),
	('A020_platinum', 'Alpine Epic - Platinum', '200 km bergen', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A020', 'platinum', 'Alpenweg', 'auto', '{"visual": "Alpenweg", "threshold": {"raw": "200 km bergen", "unit": "km", "value": 200.0}, "achievement": "Alpine Epic"}', 180),
	('A021_bronze', 'Flatlander - Brons', '100 km vlak', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A021', 'bronze', 'Polderweg', 'auto', '{"visual": "Polderweg", "threshold": {"raw": "100 km vlak", "unit": "km", "value": 100.0}, "achievement": "Flatlander"}', 181),
	('A021_silver', 'Flatlander - Zilver', '200 km vlak', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A021', 'silver', 'Polderweg', 'auto', '{"visual": "Polderweg", "threshold": {"raw": "200 km vlak", "unit": "km", "value": 200.0}, "achievement": "Flatlander"}', 182),
	('A021_gold', 'Flatlander - Goud', '300 km vlak', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A021', 'gold', 'Polderweg', 'auto', '{"visual": "Polderweg", "threshold": {"raw": "300 km vlak", "unit": "km", "value": 300.0}, "achievement": "Flatlander"}', 183),
	('A021_platinum', 'Flatlander - Platinum', '400 km vlak', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A021', 'platinum', 'Polderweg', 'auto', '{"visual": "Polderweg", "threshold": {"raw": "400 km vlak", "unit": "km", "value": 400.0}, "achievement": "Flatlander"}', 184),
	('A046_platinum', 'Winter Warrior - Platinum', 'Festive 500+', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A046', 'platinum', 'Sneeuwfiets', 'auto', '{"visual": "Sneeuwfiets", "threshold": {"raw": "Festive 500+", "unit": "", "value": 500.0}, "achievement": "Winter Warrior"}', 284),
	('A051_bronze', 'Group Ride Hero - Brons', '1 groepsrit', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A051', 'bronze', 'Peloton', 'auto', '{"visual": "Peloton", "threshold": {"raw": "1 groepsrit", "unit": "", "value": 1.0}, "achievement": "Group Ride Hero"}', 301),
	('A051_silver', 'Group Ride Hero - Zilver', '5 groepsritten', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A051', 'silver', 'Peloton', 'auto', '{"visual": "Peloton", "threshold": {"raw": "5 groepsritten", "unit": "", "value": 5.0}, "achievement": "Group Ride Hero"}', 302),
	('A051_gold', 'Group Ride Hero - Goud', '25 groepsritten', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A051', 'gold', 'Peloton', 'auto', '{"visual": "Peloton", "threshold": {"raw": "25 groepsritten", "unit": "", "value": 25.0}, "achievement": "Group Ride Hero"}', 303),
	('A051_platinum', 'Group Ride Hero - Platinum', '100 groepsritten', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A051', 'platinum', 'Peloton', 'auto', '{"visual": "Peloton", "threshold": {"raw": "100 groepsritten", "unit": "", "value": 100.0}, "achievement": "Group Ride Hero"}', 304),
	('A075_gold', 'Offroad Century - Goud', '150 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A075', 'gold', 'Bospad', 'auto', '{"visual": "Bospad", "threshold": {"raw": "150 km", "unit": "km", "value": 150.0}, "achievement": "Offroad Century"}', 399),
	('A075_platinum', 'Offroad Century - Platinum', '200 km', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A075', 'platinum', 'Bospad', 'auto', '{"visual": "Bospad", "threshold": {"raw": "200 km", "unit": "km", "value": 200.0}, "achievement": "Offroad Century"}', 400),
	('A088_gold', 'Ride Ons - Goud', '100', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A088', 'gold', 'Duimpjes', 'auto', '{"visual": "Duimpjes", "threshold": {"raw": "100", "unit": "", "value": 100.0}, "achievement": "Ride Ons"}', 451),
	('A088_platinum', 'Ride Ons - Platinum', '500', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A088', 'platinum', 'Duimpjes', 'auto', '{"visual": "Duimpjes", "threshold": {"raw": "500", "unit": "", "value": 500.0}, "achievement": "Ride Ons"}', 452),
	('A096_bronze', 'Super Randonneur - Brons', '200 km', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A096', 'bronze', 'Brevetstempels', 'auto', '{"visual": "Brevetstempels", "threshold": {"raw": "200 km", "unit": "km", "value": 200.0}, "achievement": "Super Randonneur"}', 481),
	('A096_silver', 'Super Randonneur - Zilver', '300 km', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A096', 'silver', 'Brevetstempels', 'auto', '{"visual": "Brevetstempels", "threshold": {"raw": "300 km", "unit": "km", "value": 300.0}, "achievement": "Super Randonneur"}', 482),
	('A096_gold', 'Super Randonneur - Goud', '400 km', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A096', 'gold', 'Brevetstempels', 'auto', '{"visual": "Brevetstempels", "threshold": {"raw": "400 km", "unit": "km", "value": 400.0}, "achievement": "Super Randonneur"}', 483),
	('A096_platinum', 'Super Randonneur - Platinum', '600 km serie', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A096', 'platinum', 'Brevetstempels', 'auto', '{"visual": "Brevetstempels", "threshold": {"raw": "600 km serie", "unit": "km", "value": 600.0}, "achievement": "Super Randonneur"}', 484),
	('A015_silver', 'Marmotte Finisher - Zilver', 'sub 10 uur', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A015', 'silver', 'Alpen, finishvlag', 'auto', '{"visual": "Alpen, finishvlag", "threshold": {"raw": "sub 10 uur", "unit": "uur", "value": 10.0}, "achievement": "Marmotte Finisher"}', 158),
	('A015_gold', 'Marmotte Finisher - Goud', 'sub 9 uur', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A015', 'gold', 'Alpen, finishvlag', 'auto', '{"visual": "Alpen, finishvlag", "threshold": {"raw": "sub 9 uur", "unit": "uur", "value": 9.0}, "achievement": "Marmotte Finisher"}', 159),
	('A015_platinum', 'Marmotte Finisher - Platinum', 'sub 8 uur', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A015', 'platinum', 'Alpen, finishvlag', 'auto', '{"visual": "Alpen, finishvlag", "threshold": {"raw": "sub 8 uur", "unit": "uur", "value": 8.0}, "achievement": "Marmotte Finisher"}', 160),
	('A016_bronze', 'Dolomiti Rider - Brons', '1 Dolomietenrit', 'milestone', 'route', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A016', 'bronze', 'Rotsige pieken', 'auto', '{"visual": "Rotsige pieken", "threshold": {"raw": "1 Dolomietenrit", "unit": "", "value": 1.0}, "achievement": "Dolomiti Rider"}', 161),
	('A016_silver', 'Dolomiti Rider - Zilver', '3 passen', 'milestone', 'route', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A016', 'silver', 'Rotsige pieken', 'auto', '{"visual": "Rotsige pieken", "threshold": {"raw": "3 passen", "unit": "", "value": 3.0}, "achievement": "Dolomiti Rider"}', 162),
	('A016_gold', 'Dolomiti Rider - Goud', 'Maratona finish', 'milestone', 'route', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A016', 'gold', 'Rotsige pieken', 'auto', '{"visual": "Rotsige pieken", "threshold": {"raw": "Maratona finish"}, "achievement": "Dolomiti Rider"}', 163),
	('A016_platinum', 'Dolomiti Rider - Platinum', 'Queen stage', 'milestone', 'route', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A016', 'platinum', 'Rotsige pieken', 'auto', '{"visual": "Rotsige pieken", "threshold": {"raw": "Queen stage"}, "achievement": "Dolomiti Rider"}', 164),
	('A019_bronze', 'Col Collector - Brons', '1 col', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A019', 'bronze', 'Colbordjes', 'auto', '{"visual": "Colbordjes", "threshold": {"raw": "1 col", "unit": "", "value": 1.0}, "achievement": "Col Collector"}', 173);
INSERT INTO public.achievement_badges VALUES
	('A090_bronze', 'Virtual Everesting - Brons', 'Quarter', 'milestone', 'mountain', 'bronze', '2026-11-09 15:09:14.893+01', 'milestone', 'A090', 'bronze', 'Digitale berg', 'auto', '{"visual": "Digitale berg", "threshold": {"raw": "Quarter"}, "achievement": "Virtual Everesting"}', 457),
	('A090_silver', 'Virtual Everesting - Zilver', 'Half', 'milestone', 'mountain', 'silver', '2026-11-09 15:09:14.893+01', 'milestone', 'A090', 'silver', 'Digitale berg', 'auto', '{"visual": "Digitale berg", "threshold": {"raw": "Half"}, "achievement": "Virtual Everesting"}', 458),
	('A090_gold', 'Virtual Everesting - Goud', 'Full', 'milestone', 'mountain', 'gold', '2026-11-09 15:09:14.893+01', 'milestone', 'A090', 'gold', 'Digitale berg', 'auto', '{"visual": "Digitale berg", "threshold": {"raw": "Full"}, "achievement": "Virtual Everesting"}', 459),
	('A090_platinum', 'Virtual Everesting - Platinum', '10K', 'milestone', 'mountain', 'platinum', '2026-11-09 15:09:14.893+01', 'milestone', 'A090', 'platinum', 'Digitale berg', 'auto', '{"visual": "Digitale berg", "threshold": {"raw": "10K", "unit": "", "value": 10.0}, "achievement": "Virtual Everesting"}', 460),
	('hours_week', 'Zitvleeskampioen', 'Meeste uren op de fiets in een week.', 'moving_time', 'clock', 'sage', '2026-11-09 15:09:16.519+01', 'weekly', NULL, NULL, NULL, 'auto', '{}', 0);


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: achievement_awards; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ai_jobs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ai_usage; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: app_updates; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: strava_bikes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: bike_components; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: birthday_messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: birthday_photos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: birthday_rides; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: birthday_ride_rsvps; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: bokaal_players; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: bokaal_races; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: bokaal_bets; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: bokaal_bonus_answers; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: bokaal_ratings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: calendar_feed_tokens; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: frr_tours; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwift_routes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: club_ladder_event_expectations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: club_ladder_favorite_routes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: club_ladder_fixture_signups; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: club_ladder_matches; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: club_ladder_match_riders; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: club_modules; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.club_modules VALUES
	('training', true, NULL, '2026-11-09 15:09:16.745+01', NULL),
	('bibliotheek', true, NULL, '2026-11-09 15:09:16.745+01', NULL),
	('bekers', true, NULL, '2026-11-09 15:09:16.745+01', NULL),
	('segmenten', true, NULL, '2026-11-09 15:09:16.745+01', NULL),
	('blokkenjacht', true, NULL, '2026-11-09 15:09:16.745+01', NULL),
	('rennersniveau', true, NULL, '2026-11-09 15:09:16.745+01', NULL),
	('live_race', true, NULL, '2026-11-09 15:09:16.745+01', NULL),
	('omnium', true, NULL, '2026-11-09 15:09:16.745+01', NULL),
	('managerspel', true, NULL, '2026-11-09 15:09:16.745+01', NULL),
	('voorspelspel', true, NULL, '2026-11-09 15:09:16.745+01', NULL);


--
-- Data for Name: club_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.club_settings VALUES
	(true, 'Club', 'Club', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-09 15:09:16.781+01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: zwbekers; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: club_stories; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: club_story_photos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: cols; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.cols VALUES
	('col-du-telegraphe', 'Col du Télégraphe', 'FR', 'Alpen', 45.202600, 6.444500, 1566, 850, 'C1', 1500, NULL, '2026-11-09 15:09:15.012+01', 19322487, false, NULL, NULL),
	('mont-ventoux', 'Mont Ventoux', 'FR', 'Provence', 44.173900, 5.278300, 1909, 1610, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 3974623, false, NULL, NULL),
	('col-d-ornon', 'Col d''Ornon', 'FR', 'Alpen', 45.002843, 5.967730, 1371, 800, 'C1', 1500, NULL, '2026-11-09 15:09:15.012+01', 7474038, false, NULL, NULL),
	('col-de-la-loze', 'Col de la Loze', 'FR', 'Alpen', 45.406200, 6.613500, 2304, 1605, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 39492420, false, NULL, NULL),
	('col-de-joux-plane', 'Col de Joux Plane', 'FR', 'Alpen', 46.132800, 6.711400, 1691, 990, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 647664, false, NULL, NULL),
	('col-du-galibier', 'Col du Galibier', 'FR', 'Alpen', 45.064100, 6.407900, 2642, 1245, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 21355204, false, NULL, NULL),
	('col-de-la-madeleine', 'Col de la Madeleine', 'FR', 'Alpen', 45.434200, 6.372000, 1993, 1500, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 37468284, false, NULL, NULL),
	('col-du-tourmalet', 'Col du Tourmalet', 'FR', 'Pyreneeën', 42.904800, 0.141000, 2115, 1268, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 5170240, false, NULL, NULL),
	('col-d-aubisque', 'Col d''Aubisque', 'FR', 'Pyreneeën', 42.976500, -0.339700, 1709, 1190, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 37857865, false, NULL, NULL),
	('passo-del-mortirolo', 'Passo del Mortirolo', 'IT', 'Alpen', 46.248000, 10.299100, 1852, 1300, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 18623173, false, NULL, NULL),
	('passo-gavia', 'Passo Gavia', 'IT', 'Alpen', 46.339500, 10.486200, 2618, 1404, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 25049136, false, NULL, NULL),
	('cote-de-wanne', 'Côte de Wanne', 'BE', 'Ardennen', 50.378900, 5.911900, 510, 220, 'C2', 800, NULL, '2026-11-09 15:09:15.012+01', 16888141, false, NULL, NULL),
	('passo-falzarego', 'Passo Falzarego', 'IT', 'Dolomieten', 46.519700, 12.008600, 2105, 1000, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', NULL, false, 46.539400, 12.131200),
	('col-de-la-croix-de-fer', 'Col de la Croix de Fer', 'FR', 'Alpen', 45.227800, 6.183200, 2067, 1500, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 1736961, false, NULL, NULL),
	('passo-dello-stelvio', 'Passo dello Stelvio', 'IT', 'Alpen', 46.528600, 10.454400, 2758, 1808, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 10123783, false, NULL, NULL),
	('col-d-izoard', 'Col d''Izoard', 'FR', 'Alpen', 44.820000, 6.735000, 2360, 1100, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 37857767, false, NULL, NULL),
	('passo-pordoi', 'Passo Pordoi', 'IT', 'Dolomieten', 46.488600, 11.812500, 2239, 637, 'C1', 1500, NULL, '2026-11-09 15:09:15.012+01', 17625683, false, NULL, NULL),
	('col-de-l-iseran', 'Col de l''Iseran', 'FR', 'Alpen', 45.417800, 7.030600, 2770, 1900, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 15183768, false, NULL, NULL),
	('col-du-grand-saint-bernard', 'Col du Grand-Saint-Bernard', 'CH', 'Alpen', 45.869400, 7.170600, 2469, 1500, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 12952256, false, NULL, NULL),
	('madonna-del-ghisallo', 'Madonna del Ghisallo', 'IT', 'Lombardije', 45.833600, 9.262500, 754, 545, 'C1', 1500, NULL, '2026-11-09 15:09:15.012+01', 625479, false, NULL, NULL),
	('sa-calobra', 'Sa Calobra', 'ES', 'Mallorca', 39.855600, 2.798900, 682, 682, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 653262, false, NULL, NULL),
	('col-du-soulor', 'Col du Soulor', 'FR', 'Pyreneeën', 42.975000, -0.260300, 1474, 1090, 'C1', 1500, NULL, '2026-11-09 15:09:15.012+01', 18478849, false, NULL, NULL),
	('col-de-peyresourde', 'Col de Peyresourde', 'FR', 'Pyreneeën', 42.796900, 0.452500, 1569, 940, 'C1', 1500, NULL, '2026-11-09 15:09:15.012+01', 9874898, false, NULL, NULL),
	('col-d-aspin', 'Col d''Aspin', 'FR', 'Pyreneeën', 42.935800, 0.322500, 1490, 800, 'C1', 1500, NULL, '2026-11-09 15:09:15.012+01', 37857720, false, NULL, NULL),
	('cipressa', 'Cipressa', 'IT', 'Ligurië', 43.858900, 7.911700, 240, 240, 'C2', 1500, NULL, '2026-11-09 15:09:15.012+01', 38830996, false, NULL, NULL),
	('col-de-vars', 'Col de Vars', 'FR', 'Alpen', 44.539400, 6.705800, 2109, 990, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 36908639, false, NULL, NULL),
	('alpe-d-huez', 'Alpe d''Huez', 'FR', 'Alpen', 45.092600, 6.068300, 1860, 1130, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 652851, false, NULL, NULL),
	('col-du-glandon', 'Col du Glandon', 'FR', 'Alpen', 45.239600, 6.175600, 1924, 1450, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 39492114, false, NULL, NULL),
	('zwift-alpe-du-zwift', 'Alpe du Zwift', 'ZW', 'Watopia', NULL, NULL, 1076, 1036, 'HC', 250, NULL, '2026-11-09 15:09:15.031+01', 17267489, true, NULL, NULL),
	('zwift-epic-kom', 'Epic KOM', 'ZW', 'Watopia', NULL, NULL, NULL, 387, 'C2', 250, NULL, '2026-11-09 15:09:15.031+01', 16784833, true, NULL, NULL),
	('zwift-the-grade-kom', 'The Grade KOM', 'ZW', 'Watopia', NULL, NULL, 305, 305, 'C2', 250, NULL, '2026-11-09 15:09:15.031+01', 37033150, true, NULL, NULL),
	('zwift-volcano-kom', 'Volcano KOM', 'ZW', 'Watopia', NULL, NULL, NULL, 120, 'C4', 250, NULL, '2026-11-09 15:09:15.031+01', 14270131, true, NULL, NULL),
	('zwift-titans-grove-kom', 'Titans Grove KOM', 'ZW', 'Watopia', NULL, NULL, NULL, 57, 'local', 250, NULL, '2026-11-09 15:09:15.031+01', 21343975, true, NULL, NULL),
	('zwift-kom', 'Zwift KOM', 'ZW', 'Watopia', NULL, NULL, NULL, 45, 'local', 250, NULL, '2026-11-09 15:09:15.031+01', 12109030, true, NULL, NULL),
	('zwift-radio-tower-kom', 'Radio Tower KOM', 'ZW', 'Watopia', NULL, NULL, NULL, 155, 'C3', 250, NULL, '2026-11-09 15:09:15.031+01', 14120182, true, NULL, NULL),
	('zwift-itza-kom', 'Itza KOM', 'ZW', 'Watopia', NULL, NULL, 95, 75, 'local', 250, NULL, '2026-11-09 15:09:15.031+01', 37039571, true, NULL, NULL),
	('zwift-mayan-mountainside-kom', 'Mayan Mountainside KOM', 'ZW', 'Watopia', NULL, NULL, 62, 62, 'local', 250, NULL, '2026-11-09 15:09:15.031+01', 37049451, true, NULL, NULL),
	('zwift-jarvis-kom', 'Jarvis KOM', 'ZW', 'Watopia', NULL, NULL, NULL, 32, 'local', 250, NULL, '2026-11-09 15:09:15.031+01', 38138480, true, NULL, NULL),
	('col-du-mont-cenis', 'Col du Mont Cenis', 'FR', 'Alpen', 45.256100, 6.900800, 2083, 1330, 'C1', 1500, NULL, '2026-11-09 15:09:15.012+01', 15474001, false, NULL, NULL),
	('col-de-port-de-bales', 'Col de Port de Balès', 'FR', 'Pyreneeën', 42.871200, 0.500500, 1755, 1185, 'HC', 1500, NULL, '2026-11-09 15:09:15.012+01', 16838086, false, NULL, NULL),
	('poggio-di-sanremo', 'Poggio di San Remo', 'IT', 'Ligurië', 43.823600, 7.790300, 162, 120, 'C3', 700, NULL, '2026-11-09 15:09:15.012+01', 626919, false, NULL, NULL),
	('mur-de-huy', 'Mur de Huy', 'BE', 'Ardennen', 50.515500, 5.246700, 178, 128, 'C3', 800, NULL, '2026-11-09 15:09:15.012+01', 617076, false, NULL, NULL),
	('cote-de-la-redoute', 'Côte de la Redoute', 'BE', 'Ardennen', 50.490600, 5.705300, 290, 165, 'C3', 800, NULL, '2026-11-09 15:09:15.012+01', 1269095, false, NULL, NULL),
	('cote-de-stockeu', 'Côte de Stockeu', 'BE', 'Ardennen', 50.401000, 5.924000, 410, 120, 'C3', 800, NULL, '2026-11-09 15:09:15.012+01', 893327, false, NULL, NULL),
	('cauberg', 'Cauberg', 'NL', 'Limburg', 50.857400, 5.822100, 130, 65, 'local', 800, NULL, '2026-11-09 15:09:15.012+01', 642136, false, NULL, NULL),
	('camerig', 'Camerig', 'NL', 'Limburg', 50.769100, 5.931300, 268, 110, 'local', 800, NULL, '2026-11-09 15:09:15.012+01', 866472, false, NULL, NULL),
	('vaalserberg', 'Vaalserberg', 'NL', 'Limburg', 50.754900, 6.019900, 322, 105, 'local', 800, NULL, '2026-11-09 15:09:15.012+01', 23355245, false, NULL, NULL),
	('keutenberg', 'Keutenberg', 'NL', 'Limburg', 50.845500, 5.873800, 110, 90, 'local', 800, NULL, '2026-11-09 15:09:15.012+01', 628031, false, NULL, NULL),
	('eyserbosweg', 'Eyserbosweg', 'NL', 'Limburg', 50.827000, 5.931300, 198, 65, 'local', 800, NULL, '2026-11-09 15:09:15.012+01', 1074096, false, NULL, NULL),
	('cote-du-maquisard', 'Côte du Maquisard', 'BE', 'Ardennen', 50.489400, 5.808800, 368, 154, 'C3', 250, NULL, '2026-11-09 15:09:15.012+01', NULL, false, 50.490400, 5.830500);


--
-- Data for Name: community_role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.community_role_permissions VALUES
	('paying_member', '{events.create,content.create_posts,live.start}', '2026-11-09 15:09:16+01', NULL),
	('community_member', '{content.create_posts,live.start}', '2026-11-09 15:09:16+01', NULL),
	('trainer', '{training.view_assigned,training.create_plans,training.publish_plans,training.ai_generate,content.create_posts}', '2026-11-09 15:09:16+01', NULL),
	('event_organizer', '{content.create_posts,events.create,live.start,polls.manage,src.manage}', '2026-11-09 15:09:16+01', NULL),
	('team_captain', '{competitions.manage,content.create_posts,events.create,live.start,polls.manage,teams.manage_results,teams.manage_roster}', '2026-11-09 15:09:16+01', NULL),
	('community_manager', '{achievements.finalize,calendar.sources,community.manage,competitions.manage,content.create_posts,content.moderate_posts,events.create,events.manage_all,integrations.manage,live.start,media.manage,members.approve,members.manage_roles,notifications.broadcast,omnium.manage,polls.manage,sponsors.manage,src.manage,training.ai_generate,training.create_plans,training.manage_assignments,training.publish_plans,training.view_assigned}', '2026-11-09 15:09:16+01', NULL),
	('board', '{achievements.finalize,calendar.sources,community.manage,competitions.manage,content.create_posts,content.moderate_posts,events.create,events.manage_all,integrations.manage,live.start,media.manage,members.approve,members.manage_roles,notifications.broadcast,omnium.manage,polls.manage,qa.answer,roles.manage_permissions,sponsors.manage,src.manage,teams.create,teams.manage_results,teams.manage_roster,teams.sync_sources,training.ai_generate,training.create_plans,training.manage_assignments,training.publish_plans,training.view_assigned,zwbgame.manage}', '2026-11-09 15:09:16.43+01', NULL);


--
-- Data for Name: event_chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_climbs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_links; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_pacing_generations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_pacing_plans; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_photos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_pois; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_programs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_program_links; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_reminder_sends; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_reports; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_report_comments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_results; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_rsvps; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: event_zones; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: external_event_candidates; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: external_event_participants; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: frr_gc_exclusions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: frr_gc_history; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: frr_gc_standings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: frr_slot_entrants; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: frr_stage_results; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: frr_watch_riders; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: integration_health; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: integration_notices; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: intervals_activities; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: intervals_connections; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: intervals_strength_muscles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: knowledge_topics; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.knowledge_topics VALUES
	('zwift-racen', 'Zwift-racen (ZRL, WTRL)', 'kennis', 1, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('zwift-setup', 'Zwift-setup en smart trainers', 'kennis', 2, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('vermogensmeters', 'Vermogensmeters', 'kennis', 3, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('trainen-met-schema', 'Trainen met schema', 'kennis', 4, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('data-apps', 'Strava, intervals.icu en Garmin', 'kennis', 5, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('voeding-onderweg', 'Eten en drinken onderweg', 'kennis', 6, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('kracht-core', 'Kracht en core', 'kennis', 7, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('bikefit', 'Bikefit en houding', 'kennis', 8, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('sleutelen', 'Sleutelen en onderhoud', 'kennis', 9, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('banden-tubeless', 'Banden en tubeless', 'kennis', 10, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('gravel', 'Gravel en bikepacking', 'kennis', 11, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('bergen-cols', 'Bergen en cols', 'kennis', 12, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('groepsrijden', 'Rijden in een groep', 'kennis', 13, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('toertochten', 'Toertochten en granfondo''s', 'kennis', 14, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('kleding-weer', 'Kleding en slecht weer', 'kennis', 15, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('fietskoffer', 'Fietskoffer of fietstas', 'spullen', 101, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('momentsleutel', 'Momentsleutel', 'spullen', 102, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('fietsendrager', 'Fietsendrager (trekhaak)', 'spullen', 103, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('dakdrager-zuignap', 'Dakdrager met zuignappen (SeaSucker)', 'spullen', 104, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('werkstandaard', 'Werkstandaard', 'spullen', 105, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('camper', 'Camper', 'spullen', 106, 'active', NULL, '2026-11-09 15:09:16.372+01'),
	('wegracen', 'Wegracen en criteriums', 'kennis', 16, 'active', NULL, '2026-11-09 15:09:16.537+01');


--
-- Data for Name: member_tips; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.member_tips VALUES
	('7a30921f-bc29-4974-a61e-8e2aaf478e7b', NULL, 'zwift-racen', NULL, NULL, 'In een race met meerdere rondes: begin achterin en rij in het wiel, dan houd je iets over voor de klimmen en de finale. Aan de eerste klim zie je wie er sterk is.', 'bron', 'published', NULL, '2026-11-09 15:09:15.544+01', '2026-11-09 15:09:15.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/race-lost-zrl-innsbruckring/'),
	('f923d8f2-a536-41da-8282-a2e97b473be7', NULL, 'zwift-racen', NULL, NULL, 'Ga niet achter elke aanval aan, zeker niet op het vlakke. De meeste aanvallen mislukken; laat ploegen met meer renners in de groep het gat dichtrijden.', 'bron', 'published', NULL, '2026-11-09 15:09:14.544+01', '2026-11-09 15:09:14.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/race-lost-zrl-innsbruckring/'),
	('82195e19-5c92-4ab6-a9b7-b5a7eb9255a4', NULL, 'zwift-racen', NULL, NULL, 'Laat het veld vóór een sprint niet te ver weglopen. Wie eerst een gat moet dichten, heeft in de sprint zelf niets meer over.', 'bron', 'published', NULL, '2026-11-09 15:09:13.544+01', '2026-11-09 15:09:13.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/race-lost-makuri-40/'),
	('23b745b5-e66c-4b82-a509-d519b0675065', NULL, 'zwift-racen', NULL, NULL, 'Herstel op vlakke en dalende stukken: in het wiel, hoge cadans, weinig watt. Dan heb je bij de volgende klim of sprint weer wat te geven.', 'bron', 'published', NULL, '2026-11-09 15:09:12.544+01', '2026-11-09 15:09:12.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/race-lost-makuri-40/'),
	('ea2da85d-95a8-421c-9f08-37b0dc916b27', NULL, 'zwift-racen', NULL, NULL, 'Leer vooraf waar de sprints en klimmen liggen en loop je raceplan in je hoofd door. Zeker als je die week meerdere routes rijdt: een vergissing in de race kost punten.', 'bron', 'published', NULL, '2026-11-09 15:09:11.544+01', '2026-11-09 15:09:11.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/race-lost-makuri-40/'),
	('6e946020-27d4-4d73-a7eb-0dcb9723b517', NULL, 'zwift-racen', NULL, NULL, 'Rij in een ontsnapping niet hard op kop voor renners die om dezelfde podiumplekken strijden als jij.', 'bron', 'published', NULL, '2026-11-09 15:09:10.544+01', '2026-11-09 15:09:10.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/race-lost-zrl-innsbruckring/'),
	('04018a8e-9e69-40dc-b560-8cd2d45c059f', NULL, 'zwift-racen', NULL, NULL, 'Een draft boost is niet alleen voor jezelf: gebruik hem ook om een ploeggenoot naar een betere plek te brengen.', 'bron', 'published', NULL, '2026-11-09 15:09:09.544+01', '2026-11-09 15:09:09.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/race-lost-makuri-40/'),
	('46b44333-3042-4784-927d-cb45ad943161', NULL, 'zwift-racen', NULL, NULL, 'Blijf in de sprint in het wiel tot het juiste moment en neem de kortste lijn door de bochten.', 'bron', 'published', NULL, '2026-11-09 15:09:08.544+01', '2026-11-09 15:09:08.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/race-lost-makuri-40/'),
	('79a82702-c31c-4a6c-b04f-01355fcfb3a9', NULL, 'zwift-racen', NULL, NULL, 'Wie te vroeg aangaat, betaalt dat. Een lange solo naar de streep wordt vaak nog ingelopen; soms win je meer met het wiel van wie wel aangaat.', 'bron', 'published', NULL, '2026-11-09 15:09:07.544+01', '2026-11-09 15:09:07.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/race-lost-zrl-innsbruckring/'),
	('0f4485f9-2b22-42ee-99ac-c6a37eb91178', NULL, 'zwift-racen', NULL, NULL, 'Veer: 30 seconden 10% lichter, bewaar hem voor een klim. Draft boost: 40 seconden meer slipstream, gebruik hem in het wiel op snelle vlakke stukken of afdalingen. Aerohelm: 15 seconden 25% minder luchtweerstand, voor de sprint of als je geen wiel hebt.', 'bron', 'published', NULL, '2026-11-09 15:09:06.544+01', '2026-11-09 15:09:06.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/powerups/'),
	('b7f512de-8c97-4012-8e69-4bc26e662027', NULL, 'zwift-racen', NULL, NULL, 'Burrito: 20 seconden geen slipstream voor wie achter je zit, dus gebruik hem bij een aanval. Geest: 15 seconden onzichtbaar; activeer hem eerst en versnel daarna. In de laatste 400 meter werkt de geest niet.', 'bron', 'published', NULL, '2026-11-09 15:09:05.544+01', '2026-11-09 15:09:05.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/powerups/'),
	('c9bd8767-2c41-4d23-bb27-9ff45511a4fe', NULL, 'zwift-racen', NULL, NULL, 'Val in New York niet aan op de roltrappen: Zwift duwt je daar al, dus extra watt levert weinig op, en de veer werkt er zelfs tegen. Korte steile klimmen zoals de Hill KOM werken wel.', 'bron', 'published', NULL, '2026-11-09 15:09:04.544+01', '2026-11-09 15:09:04.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/zrl-r20-w5/'),
	('d2880287-8f10-4f4a-810b-176d319ea291', NULL, 'zwift-racen', NULL, NULL, 'In het wiel heb je minder vermogen nodig dan wie voor je rijdt. Rijdt die 300 W, dan blijf je er vaak bij met 225 tot 250 W. Rij het minimum dat je plek houdt.', 'bron', 'published', NULL, '2026-11-09 15:09:03.544+01', '2026-11-09 15:09:03.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/5-racing-tips/'),
	('d8d925b9-3b94-420b-87ff-3a08e040f3a2', NULL, 'zwift-racen', NULL, NULL, 'Op onverhard in Watopia en Makuri ga je trager en zie je minder door het stof: een goede plek om aan te vallen, als je vooraan zit. Met toets 9 krijg je een camera van bovenaf zonder stof.', 'bron', 'published', NULL, '2026-11-09 15:09:02.544+01', '2026-11-09 15:09:02.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/5-racing-tips/'),
	('e1e00067-d38a-4028-8385-315cb5e8a168', NULL, 'zwift-racen', NULL, NULL, 'Snelste tijd op een segment: begin achterin en schuif naar voren, zodat je aan kop komt terwijl je nog in de slipstream zit. Eerste over de streep win je vaak later in de race, als de groep moe is.', 'bron', 'published', NULL, '2026-11-09 15:09:01.544+01', '2026-11-09 15:09:01.544+01', NULL, 'Zwift Insider', 'https://zwiftinsider.com/zrl-segment-points-tips/');


--
-- Data for Name: knowledge_threads; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: knowledge_messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ladder_pool; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ladder_ranks; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: roster_entries; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ladder_roster_riders; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ladder_withdrawn; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: live_tracker_tokens; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: live_sessions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: live_positions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: maintenance_tips; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.maintenance_tips VALUES
	('4625d0f5-e53d-4f89-83ac-98915edb6031', 'chain', NULL, 'Een ketting rekt niet uit. De pennen en de busjes slijten, waardoor er speling ontstaat en de ketting langer meet. "Kettingrek" is dus een verkeerde naam die nooit meer weggaat.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('8e98c576-8ea9-40e8-970c-cbae7ef5a068', 'chain', NULL, 'De steek van een fietsketting is al ruim een eeuw een halve inch: 12,7 mm van pen tot pen. Een 12-speed ketting is smaller dan een 8-speed, maar per schakel precies even lang.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('0df4c2c6-682d-428c-a330-a742c5fdb05e', 'chain', NULL, 'Vervang bij 0,5% rek voor 11- tot 13-speed en bij 0,75% voor 6- tot 10-speed. Smallere kettingen hebben minder materiaal te verliezen voor het misgaat.', 'pro', 'BikeRadar', 'https://www.bikeradar.com/advice/workshop/how-to-know-when-its-time-to-replace-your-bicycle-chain', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('0316ac4e-7cca-4f21-9a1c-e829a134177f', 'chain', NULL, 'Een ketting op tijd vervangen is de goedkoopste onderhoudsbeurt die er is: doe je het consequent, dan halen je cassette en bladen er twee tot drie.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('da1dde55-4c27-470d-8cef-53a553757b11', 'chain', 'indoor', 'Binnen slijt je ketting het langzaamst van allemaal. Geen zand, geen regen, geen pekel — alleen je eigen vermogen.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('05f40967-be26-4b44-bb1e-7db09f383983', 'cassette', NULL, 'Een versleten ketting vijlt de tanden van je cassette scheef. Zet je er dan een nieuwe ketting op, dan slaat hij over — en mag de cassette alsnog mee.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('487d0d1b-77b6-4114-9541-a0cbfff5c22b', 'cassette', NULL, 'Het verhaal wil dat Tullio Campagnolo in 1927 op de Croce d''Aune zijn wiel niet los kreeg met bevroren handen, en daarna de snelspanner bedacht. Historici twijfelen aan de datum, maar de snelspanner kwam er.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('57555b2a-096d-4ef1-a90b-8d3ee204aa6c', 'chainrings', NULL, 'Kettingbladen gaan het langst mee van de hele aandrijving. Het teken dat ze op zijn: tanden die de vorm van een haaienvin krijgen.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('baa58972-dcc3-4246-aa3b-78d7faed58b8', 'tire_rear', NULL, 'Je achterband draagt het meeste gewicht én al je vermogen. Hij is vaak versleten terwijl de voorband er nog prima uitziet.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('9472576b-0672-40b2-83d4-220f6260ab04', 'tire_front', NULL, 'Een voorband gaat ruwweg twee keer zo lang mee als een achterband. Ze omwisselen kan, maar zet nooit de meest versleten band voorop — daar wil je geen klapband.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('6204cdd1-9acc-4bcb-bef6-e75aebe8468d', 'tire_rear', 'race', 'Breder is niet langzamer. Een 28 mm band rolt bij de juiste druk niet slechter dan een 25 mm, en op echt wegdek meestal beter, omdat je lagere druk kunt rijden zonder over elke oneffenheid te stuiteren.', 'pro', 'SILCA', 'https://silca.cc/blogs/silca/part-4b-rolling-resistance-and-impedance', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('0ba85ad1-9612-48f7-9d52-2d9d5243826e', 'tire_front', NULL, 'Te hard oppompen maakt je op echt asfalt juist langzamer: onder een bepaalde druk win je rolweerstand, erboven verlies je meer aan trillingen dan je wint.', 'pro', 'Velo', 'https://velo.outsideonline.com/road/road-racing/resistance-futile-tire-pressure-width-affect-rolling-resistance/', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('8ae3a450-9de5-44e4-ab8b-b58c6724bc56', 'trainer_tyre', 'indoor', 'Een trainerband haalt 300 tot 500 uur op de rol. Rubber gaat daar niet alleen kapot van afstand maar ook van hitte, dus ook een weinig gebruikte band veroudert.', 'pro', 'Joyful Triathlete', 'https://joyfultriathlete.com/tires-wear-and-damage-with-turbo-trainers/', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('c71abf28-2b44-4abd-807d-59deceb9f278', 'sealant', NULL, 'Sealant is latex met vezeltjes erin. Bij een gaatje sleept de ontsnappende lucht het naar buiten, waar het indroogt tot een propje. Het gat dicht zichzelf terwijl je doorrijdt.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('456dcc43-2e80-46a0-9cba-068d72d63b76', 'sealant', NULL, 'Sealant droogt in drie tot zes maanden uit doordat het water verdampt. Een band die niet lek is geweest kan dus alsnog leeg zijn vanbinnen.', 'pro', 'CyclingAbout', 'https://www.cyclingabout.com/best-tubeless-sealant-for-gravel-road-mtb-tires/', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('5d599cb0-bfdf-4914-bab5-4f33dfae04c3', 'brake_pads_disc', NULL, 'Remblokken zijn het onderdeel met de grootste spreiding van allemaal. In natte herfstmodder halen organische blokken 200 tot 400 km; dezelfde blokken op droog vlak asfalt gaan een veelvoud daarvan mee.', 'pro', 'road.cc', 'https://road.cc/content/feature/all-you-need-know-about-replacing-disc-brake-pads-176649', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('dfc5264d-dd08-45c4-b5ca-f625986c5e9c', 'brake_pads_disc', 'mtb', 'Op technische trails is 500 tot 700 km per set blokken heel normaal. Rijd je ze helemaal op, dan komt metaal op metaal en mag de schijf er ook aan.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('f72b409b-9a8b-46fa-9cff-f79edfdc96aa', 'brake_pads_rim', NULL, 'Bij velgremmen slijt niet alleen het blokje maar ook je velg. Moderne velgen hebben daarom een slijtage-indicator: een groefje of stipje dat verdwijnt als het tijd is.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('b628762f-8c8b-4b04-8f6e-2a67cbd4de4d', 'brake_fluid', NULL, 'DOT-vloeistof trekt water uit de lucht, zo''n 2 tot 3 procent per jaar. Dat water verlaagt het kookpunt fors — vandaar dat je het jaarlijks ververst en niet pas als de rem raar aanvoelt.', 'pro', 'BikeRadar', 'https://www.bikeradar.com/advice/buyers-guides/brake-fluid-mineral-oil-vs-dot', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('8c4bbbcd-c845-4f02-81f2-6c1c3bb61334', 'brake_fluid', NULL, 'Minerale olie neemt juist géén water op. Klinkt beter, maar het water dat er tóch in komt zakt naar het laagste punt — je remklauw — en kookt daar eerder dan de olie zelf.', 'pro', 'Epic Bleed Solutions', 'https://epicbleedsolutions.com/blogs/faq/how-often-should-i-bleed-my-brakes', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('5aff5d22-3ab7-45c7-a06d-8d36be1a5435', 'cables', NULL, 'Kabels slijten niet van kilometers maar van vuil en vocht in de buitenkabel. Een fiets die een winter buiten stond schakelt slechter dan een fiets die er duizend kilometer bij reed.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('8e102b74-35aa-40ec-8ec7-639922463834', 'cables', 'indoor', 'Binnen is zweet de vijand van je kabels. Het is zout, het kruipt overal in en het blijft zitten waar je het niet ziet.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('d2b3acee-bb5b-4e2d-a2ad-38d1fa6594f3', 'bar_tape', NULL, 'Nieuw stuurlint is de goedkoopste manier om je fiets weer als nieuw te laten voelen. Niemand ziet je nieuwe cassette; iedereen ziet je lint.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('67801625-8b50-42c6-bfe9-6f52eb70edbb', 'bar_tape', NULL, 'Monteurs wikkelen van het uiteinde naar het stuur toe, zodat de wikkelrichting meedraait met de kant waar je handen aan trekken. Andersom rolt het na een paar ritten open.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('94ae7c07-a989-484a-95f0-7bbc1a8b1235', 'bar_tape', 'indoor', 'Binnen sneuvelt stuurlint niet van slijtage maar van zweet. Een handdoek over je stuur scheelt meer dan welk merk lint dan ook.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('4bd9d70d-4005-4773-b812-ed5e1b534e3c', 'grips', 'mtb', 'Lock-on handvatten schoven ooit weg als ze nat werden; sinds ze met klembouten vastzitten is dat verleden tijd. De ouderwetse truc met haarlak werkt overigens nog steeds.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('1d3e78c1-1b05-4835-8856-f792cf6ec07b', 'susp_lowers', 'mtb', 'RockShox schrijft de lowers-service voor na 50 rij-uren, Fox na 30 tot 50. Dat zijn draaiuren, geen kilometers: bij drie uur mtb per week zit je er na een maand of vier tegenaan.', 'pro', 'FOX', 'https://tech.ridefox.com/fox_tech_center/owners_manuals/011/Content/Service_Intervals.html', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('2760221c-5531-4bc1-9729-01d5451842a8', 'susp_full', 'mtb', 'Een volledige service volgt bij Fox na 125 uur of jaarlijks, bij RockShox na 100 tot 200 uur. De kalender telt mee omdat olie en afdichtingen ook verouderen als je niet rijdt.', 'pro', 'Flow Mountain Bike', 'https://flowmountainbike.com/features/flows-guide-to-understanding-suspension-service-intervals-and-upgrade-options/', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('29ec3ee3-f59e-4e33-a5ea-1f39ed0008bb', 'shock_service', 'mtb', 'Een demper werkt harder dan een voorvork: kleiner oliehuis, meer warmte, kortere slag. Dat hij eerder aan de beurt is dan je vork is dus geen pech maar natuurkunde.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('d9cb4e50-acee-4029-a5d0-341166d35687', 'dropper', 'mtb', 'De eerste dropperpost was de Hite-Rite uit 1984, van Joe Breeze en Josh Angell: een veer tussen zadelpen en frame. De slogan was "Descend with conviction" en het werd even het best verkochte mtb-accessoire.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('80055709-01dd-417f-a6d4-b30e1d516dc7', 'bottom_bracket', 'indoor', 'Zweet loopt via je bidonbouten langs het frame naar beneden en komt uit bij je trapas. Daar hoort geen zout water, en het lager merkt dat eerder dan jij.', 'pro', 'Zwift Insider', 'https://zwiftinsider.com/dont-let-zwifting-damage-bike/', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('4c31d566-2aee-4fab-8e20-8ffc8ac3c97e', 'headset_check', 'indoor', 'Je balhoofd ligt precies in de druipzone. Zweet laat de bouten vastroesten, en een vastgeroeste balhoofdbout merk je pas als je er iets aan wilt doen.', 'pro', 'Cyclingnews', 'https://www.cyclingnews.com/features/indoor-cycling-tips-five-ways-to-sweatproof-your-bike-for-indoor-riding-and-racing/', NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01'),
	('8ac7cb2c-413c-4c6a-9a27-0e9638a12ca1', 'seatpost_check', 'indoor', 'Een zadelpen die een jaar niet bewogen heeft komt er soms niet meer uit. Af en toe losdraaien en invetten kost een minuut en bespaart een dure noodgreep.', 'algemeen', NULL, NULL, NULL, 'published', NULL, '2026-11-09 15:09:15.399+01', '2026-11-09 15:09:15.399+01');


--
-- Data for Name: media_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: sponsors; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_benefits; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_knowledge; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_knowledge_topics; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_protocols; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_protocol_checks; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_protocol_core_sessions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_questions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_question_askers; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_zwift_bikes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: mobility_exercises; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_exercises VALUES
	('03413be0-f9ae-438a-846d-ef33b67a77b6', 'plank', 'Plank', 'core', 'lumbaal', 'Steun op onderarmen en tenen. Trek je navel licht in en knijp je bilspieren aan, zodat je onderrug niet doorzakt. Schouders recht boven de ellebogen, blik naar de mat. Blijf rustig doorademen.', 'plank', '[]', 30, NULL, false, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('ad8ec05b-6063-453f-b899-d8c799cb5a11', 'side-plank', 'Zijplank', 'core', 'lumbaal', 'Op je zij, steun op één onderarm, elleboog recht onder de schouder. Duw je heup omhoog tot je van enkel tot schouder een rechte lijn maakt. Laat je bovenlichaam niet naar voren draaien.', 'side-plank', '[]', 20, NULL, true, 2, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('f1d5b4e1-f7c7-4b4e-948c-19ec46352ec1', 'bird-dog', 'Bird dog', 'core', 'lumbaal', 'Op handen en knieën. Strek tegelijk je rechterarm en linkerbeen tot ze in het verlengde van je romp staan. Houd je bekken vlak — een bekertje water op je onderrug mag niet omvallen. Rustig terug en wissel.', 'bird-dog', '[]', NULL, 8, true, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('b6b78c50-a425-4fb2-a686-e62a9af1f44d', 'dead-bug', 'Dead bug', 'core', 'lumbaal', 'Op je rug, armen recht omhoog, knieën in een hoek van 90 graden. Laat je rechterarm en linkerbeen langzaam zakken tot net boven de mat, terwijl je onderrug tegen de mat gedrukt blijft. Terug en wissel.', 'dead-bug', '[]', NULL, 10, false, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('83241bad-4813-4a56-af4d-7a9575325fab', 'hollow-hold', 'Hollow hold', 'core', 'lumbaal', 'Op je rug, onderrug stevig tegen de mat. Til schouderbladen en gestrekte benen net van de mat en houd vast. Komt je onderrug los, breng dan je knieën iets dichter naar je toe.', 'hollow-hold', '[]', 20, NULL, false, 3, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('9673ac2d-f8ce-4eb5-a0c2-7924cd57e6db', 'glute-bridge', 'Bruggetje', 'core', 'heup', 'Op je rug, voeten plat op de mat, hielen ongeveer een handbreedte van je billen. Duw via je hielen je heupen omhoog tot knie, heup en schouder één lijn vormen. Knijp bovenin je bilspieren aan en zak gecontroleerd terug.', 'glute-bridge', '[]', NULL, 12, false, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('96c872c8-4739-44f5-886d-85e9f7adf151', 'cat-camel', 'Kat-koe', 'mobiliteit', 'thoracaal', 'Op handen en knieën. Rol je rug langzaam bol vanaf je stuit, kin naar de borst. Rol daarna wervel voor wervel de andere kant op tot een holle rug. Beweeg traag; dit is mobiliteit, geen rekoefening.', 'cat-camel', '[]', NULL, 10, false, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('ab93a2eb-b62d-4adf-8938-5a5b507755bd', 'thoracic-rotation', 'Thoracale rotatie', 'mobiliteit', 'thoracaal', 'Op handen en knieën, één hand achter je hoofd. Draai je elleboog naar de mat, dan zo ver mogelijk naar het plafond, en volg met je blik. Houd je bekken stil — de beweging komt uit je borstwervelkolom.', 'thoracic-rotation', '[]', NULL, 8, true, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('f0e476c7-c9f3-4a08-ab0a-4f68af7611e4', 'thoracic-extension', 'Thoracale extensie', 'mobiliteit', 'thoracaal', 'Zit op je hielen met je onderarmen op een bank of stoel. Laat je borst tussen je armen door zakken tot je rek voelt tussen je schouderbladen. Adem uit en zak bij elke uitademing iets verder.', 'thoracic-extension', '[]', 30, NULL, false, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('b321505f-267e-42d2-8830-865d6b918f05', 'child-pose', 'Kindhouding', 'mobiliteit', 'thoracaal', 'Zit op je hielen, knieën uit elkaar, strek je armen ver naar voren en laat je borst naar de mat zakken. Ontspan je nek. Rustig doorademen naar je onderrug.', 'child-pose', '[]', 60, NULL, false, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('91f1817c-916e-4284-9892-1bb91a0ec45a', 'shoulder-opener', 'Schouderopener', 'mobiliteit', 'schouder', 'Sta rechtop met een handdoek of stok in beide handen, handen ruim uit elkaar. Breng gestrekte armen langzaam over je hoofd naar achteren en terug. Kom je vast te zitten, pak dan breder vast.', 'shoulder-opener', '[]', NULL, 10, false, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('80439eca-47c2-468a-a5f1-7afc0aa781e0', 'hip-flexor-stretch', 'Heupbuigerrek', 'mobiliteit', 'heup', 'Half geknield, achterste knie op de mat, voorste voet plat. Kantel je bekken achterover door je bilspier aan te spannen en schuif dan pas je heup naar voren. Je voelt de rek aan de voorkant van je achterste heup.', 'hip-flexor-stretch', '[]', 45, NULL, true, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('0240f0e2-b6fc-411a-951c-3759943230ff', 'hamstring-stretch', 'Hamstringrek', 'mobiliteit', 'heup', 'Zet één hiel op een verhoging met gestrekt been. Houd je rug recht en kantel vanuit je heupen naar voren tot je rek achter je bovenbeen voelt. Rond je rug niet — dan verplaats je de rek naar je onderrug.', 'hamstring-stretch', '[]', 45, NULL, true, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('b6a66de3-ec53-445d-8351-c4c7ba085c33', 'figure-four', 'Bilspierrek', 'mobiliteit', 'heup', 'Op je rug, leg je rechterenkel over je linkerknie. Pak je linkerbovenbeen vast en trek het naar je toe tot je rek in je rechterbil voelt. Houd je schouders op de mat.', 'figure-four', '[]', 45, NULL, true, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('f1c7c44d-834d-44de-94b3-35340b755e4e', 'ankle-rock', 'Enkelmobiliteit', 'mobiliteit', 'enkel', 'Half geknield, voorste voet plat en ongeveer een handbreedte van een muur. Duw je knie recht over je tenen richting de muur zonder je hiel op te tillen. Terug en herhaal.', 'ankle-rock', '[]', NULL, 10, true, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('cea1d5cd-1970-4360-95b9-7b28e98d3113', 'leg-swing', 'Beenzwaaien', 'activatie', 'heup', 'Sta met steun aan een muur. Zwaai één been ontspannen naar voren en naar achteren, zonder je romp mee te laten draaien. Bouw de uitslag geleidelijk op; forceer niets.', 'leg-swing', '[]', NULL, 12, true, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('3f60cb69-39c8-4c9e-ab43-4f48f67942f9', 'hip-circle', 'Heupcirkels', 'activatie', 'heup', 'Sta op één been met steun. Til de andere knie tot heuphoogte en maak grote, rustige cirkels met je knie — naar buiten en daarna naar binnen. Houd je romp stil.', 'hip-circle', '[]', NULL, 8, true, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('acd258de-6ec1-4c99-842e-800f4a93288b', 'hip-hinge', 'Hip hinge', 'activatie', 'heup', 'Sta met je voeten heupbreed en een stok langs je rug die je achterhoofd, rug en stuit raakt. Duw je heupen naar achteren en buig voorover; de stok houdt op alle drie de punten contact. Dit is de beweging die je op de fiets naar het stuur brengt.', 'hip-hinge', '[]', NULL, 10, false, 2, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('f0360d90-2c6d-4921-a957-9b061079987f', 'squat', 'Squat', 'kracht', 'been', 'Voeten iets breder dan heupbreed, tenen licht naar buiten. Duw je heupen naar achteren en zak tot je bovenbenen ongeveer horizontaal zijn, knieën in de richting van je tenen. Borst omhoog, hielen op de grond. Duw via je hele voet terug omhoog.', 'squat', '[]', NULL, 12, false, 1, true, NULL, '2026-11-09 15:09:15.603+01', '2026-11-09 15:09:15.603+01'),
	('ba7e019d-7333-4320-a455-08fbc1feb8a2', 'split-squat', 'Split squat', 'kracht', 'been', 'Grote stap uit elkaar, achterste hiel los van de grond. Zak recht naar beneden tot je achterste knie net boven de grond hangt; je voorste knie blijft boven je voet. Duw vooral via je voorste hiel terug omhoog.', 'split-squat', '[]', NULL, 8, true, 2, true, NULL, '2026-11-09 15:09:15.603+01', '2026-11-09 15:09:15.603+01'),
	('fdbc9c2b-1584-4884-ba36-c09a2b5bd988', 'step-up', 'Step-up', 'kracht', 'been', 'Zet één voet volledig op een stevige traptrede of bank op kniehoogte. Duw jezelf omhoog met dat been, zonder af te zetten met je achterste voet. Kom gecontroleerd weer naar beneden.', 'step-up', '[]', NULL, 10, true, 1, true, NULL, '2026-11-09 15:09:15.603+01', '2026-11-09 15:09:15.603+01'),
	('ffd592e0-5964-4519-bc94-d8b53db5267c', 'single-leg-bridge', 'Eenbenig bruggetje', 'kracht', 'heup', 'Op je rug, één voet plat op de mat, het andere been gestrekt in het verlengde van je bovenbeen. Duw via je hiel je heup omhoog tot schouder, heup en knie één lijn vormen. Houd je bekken vlak; zakt één kant weg, doe dan minder herhalingen.', 'single-leg-bridge', '[]', NULL, 10, true, 2, true, NULL, '2026-11-09 15:09:15.603+01', '2026-11-09 15:09:15.603+01'),
	('b9571d4c-cc19-4017-a9e5-64262471dee6', 'calf-raise', 'Kuitheffen', 'kracht', 'enkel', 'Sta met je voorvoeten op de rand van een traptrede, met steun aan een muur of leuning. Kom langzaam zo hoog mogelijk op je tenen en zak in drie tellen terug tot net onder de trede.', 'calf-raise', '[]', NULL, 15, false, 1, true, NULL, '2026-11-09 15:09:15.603+01', '2026-11-09 15:09:15.603+01'),
	('8ee2fc41-faf0-44d3-a428-5b77d9c03478', 'single-leg-rdl', 'Eenbenige deadlift', 'kracht', 'heup', 'Sta op één been met een lichte buiging in de knie. Kantel vanuit je heup naar voren terwijl je andere been gestrekt naar achteren gaat, tot je romp bijna horizontaal is. Rug recht, bekken vlak. Kom terug door je bilspier aan te spannen.', 'single-leg-rdl', '[]', NULL, 8, true, 2, true, NULL, '2026-11-09 15:09:15.603+01', '2026-11-09 15:09:15.603+01'),
	('332aa8cb-91a7-485c-a440-436b64bb0126', 'wall-sit', 'Muurzit', 'kracht', 'been', 'Leun met je rug tegen een muur en schuif omlaag tot je knieën een hoek van 90 graden maken, knieën boven je enkels. Houd vast en blijf doorademen.', 'wall-sit', '[]', 40, NULL, false, 1, true, NULL, '2026-11-09 15:09:15.603+01', '2026-11-09 15:09:15.603+01'),
	('6e70fb05-e539-4921-ad55-f27562799f6c', 'barbell-half-squat', 'Halve squat met halter', 'kracht', 'been', 'Stang op je bovenrug, voeten iets breder dan heupbreed. Zak gecontroleerd tot je knieën een hoek van 90 graden maken, borst omhoog, hielen op de grond. Kom krachtig omhoog. Kies een gewicht waarmee de laatste herhaling nog net netjes lukt. Gebruik een rek met veiligheidsstangen of laat iemand meekijken.', 'barbell-half-squat', '[]', NULL, 6, false, 3, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('a65406a8-08da-43b4-8490-2329a0e3b8aa', 'single-leg-press', 'Eenbenige leg press', 'kracht', 'been', 'Eén voet midden op de plaat, rug en bekken tegen de zitting. Laat de plaat zakken tot je knie ongeveer 90 graden is en duw krachtig weg zonder je knie op slot te zetten. Je knie blijft boven je voet. Kies een gewicht waarmee de laatste herhaling nog net netjes lukt.', 'single-leg-press', '[]', NULL, 6, true, 3, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('5dcc6e3a-c8ec-4253-8d81-40bbce632ee1', 'standing-hip-flexion', 'Staande heupbuiging met kabel', 'kracht', 'heup', 'Kabel laag, band om je enkel, rug naar het apparaat. Houd je vast en sta rechtop op je andere been. Trek je knie krachtig omhoog tot je bovenbeen horizontaal is en laat gecontroleerd terugkomen. Je romp blijft stil; leun niet achterover.', 'standing-hip-flexion', '[]', NULL, 6, true, 3, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('c3409c75-e695-45ed-9a81-dc8bf696c33a', 'loaded-calf-raise', 'Kuitheffen met gewicht', 'kracht', 'enkel', 'Stang op je bovenrug of in een kuitenmachine, voorvoeten op een verhoging. Kom zo hoog mogelijk op je tenen en zak gecontroleerd terug tot net onder de rand. Knieën gestrekt maar niet op slot.', 'loaded-calf-raise', '[]', NULL, 6, false, 3, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('f6124ce4-40f4-44b6-a1ff-68088769f9f1', 'goblet-squat', 'Goblet squat', 'kracht', 'been', 'Houd een dumbbell of kettlebell met twee handen tegen je borst. Voeten iets breder dan heupbreed. Zak tot je bovenbenen ongeveer horizontaal zijn, ellebogen tussen je knieën, borst omhoog. Duw via je hele voet terug omhoog.', 'goblet-squat', '[]', NULL, 12, false, 2, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('f1050950-31f5-45fc-8bf6-7e33f1f6affb', 'bulgarian-split-squat', 'Bulgaarse split squat', 'kracht', 'been', 'Achterste voet op een stoel of bank, voorste voet een grote stap ervoor. Dumbbells langs je lichaam. Zak recht naar beneden tot je voorste bovenbeen ongeveer horizontaal is; je voorste knie blijft boven je voet. Duw via je voorste hiel omhoog. Begin zonder gewicht.', 'bulgarian-split-squat', '[]', NULL, 10, true, 3, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('36ea2368-4a90-4f02-a826-095fc47abdef', 'banded-hip-flexion', 'Heupbuiging met band', 'kracht', 'heup', 'Maak een weerstandsband laag vast en doe hem om je enkel, rug naar het ankerpunt. Houd je vast en sta rechtop op je andere been. Trek je knie krachtig omhoog tot je bovenbeen horizontaal is en laat gecontroleerd terugkomen. Je romp blijft stil.', 'banded-hip-flexion', '[]', NULL, 12, true, 2, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('c0087797-3493-4b32-9114-a7e4228d7abf', 'single-leg-calf-raise', 'Eenbenig kuitheffen', 'kracht', 'enkel', 'Sta met één voorvoet op de rand van een traptrede, met steun aan een muur of leuning. Kom zo hoog mogelijk op je tenen en zak in drie tellen terug tot net onder de trede. Te licht? Neem een dumbbell in de hand aan dezelfde kant.', 'single-leg-calf-raise', '[]', NULL, 12, true, 2, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('da47ea5f-453e-495f-b9a8-5ff255cdfdc4', 'countermovement-jump', 'Sprong uit stand', 'kracht', 'been', 'Sta met je voeten op heupbreedte. Zak snel een kwart squat in, zwaai je armen mee en spring zo hoog als je kunt. Land zacht op je voorvoeten, knieën licht gebogen boven je voeten, en sta even stil voor de volgende sprong. Op een stevige, vlakke ondergrond, niet op gladde sokken.', 'countermovement-jump', '[]', NULL, 10, false, 1, true, NULL, '2026-11-09 15:09:16.385+01', '2026-11-09 15:09:16.385+01');


--
-- Data for Name: mobility_series; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_series VALUES
	('5b8f7d5a-702b-499e-b948-f569781d504b', 'fundament', 'Fundament', 'Rompuithoudingsvermogen: de basis, twee tot drie keer per week.', 'stabiliteit', 'rustdag', 10, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('af636333-8692-4745-a1c6-494fa9c8ea7e', 'voor-de-rit', 'Voor de rit', 'Dynamisch klaarmaken zonder vermogen in te leveren.', 'mobiliteit', 'pre_ride', 6, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('7fb1efda-4332-4cc6-8502-3150ee856868', 'na-de-rit', 'Na de rit', 'Heup en rug lang maken na uren in dezelfde houding.', 'mobiliteit', 'post_ride', 8, 1, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('e6dc41b7-814a-456d-ab8f-a2d07a0e7772', 'zithouding', 'Zithouding', 'Voorovergebogen zitten volhouden zonder in je onderrug te zakken.', 'houding', 'rustdag', 12, 2, true, NULL, '2026-11-09 15:09:15.324+01', '2026-11-09 15:09:15.324+01'),
	('0a38ca37-39ea-4304-be48-2f1a1cbc04f0', 'kracht-basis', 'Kracht: basis', 'Beenkracht en romp met je eigen gewicht. Op een rustdag.', 'kracht', 'rustdag', 20, 1, true, NULL, '2026-11-09 15:09:15.603+01', '2026-11-09 15:09:15.603+01'),
	('d97a44af-baf1-4749-b2ae-3c91b91d1b77', 'kracht-klimmen', 'Kracht voor klimmen', 'Lang doorduwen op één been, zoals op een steile helling.', 'kracht', 'rustdag', 30, 2, true, NULL, '2026-11-09 15:09:15.603+01', '2026-11-09 15:09:15.603+01'),
	('aa4356f9-0b2a-4828-b45d-a8efe46924e8', 'kracht-eenbenig', 'Kracht: eenbenig', 'Stabiliteit per been, want trappen doe je om de beurt.', 'kracht', 'rustdag', 25, 2, true, NULL, '2026-11-09 15:09:15.603+01', '2026-11-09 15:09:15.603+01'),
	('64df24d7-6fe8-472f-9703-494ec18d8d38', 'gym-opbouw-1', 'Gym: opbouw 1', 'Week 1 tot 3. Tien herhalingen; de tweede sessie van de week zes, zwaarder.', 'kracht', 'rustdag', 45, 3, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('37ae6383-482c-4538-b4d5-82ccb6e89bc5', 'gym-opbouw-2', 'Gym: opbouw 2', 'Week 4 tot 6. Acht herhalingen; de tweede sessie van de week vijf.', 'kracht', 'rustdag', 45, 3, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('0bd9cb24-8247-4b28-b260-2e4e92d4ee53', 'gym-opbouw-3', 'Gym: opbouw 3', 'Week 7 tot 12. Zes herhalingen; de tweede sessie van de week vier.', 'kracht', 'rustdag', 40, 3, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('7d516f67-949a-4e62-adf4-eb3c5a9888fc', 'gym-onderhoud', 'Gym: onderhoud', 'In het seizoen, één keer per week. Zwaar, maar kort.', 'kracht', 'rustdag', 25, 3, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('9abc2874-e2ea-4789-a21a-6fe1a68bacb7', 'kracht-thuis-gewicht', 'Kracht thuis: met gewicht', 'Dumbbell en band. Elke set tot je er nog twee over hebt.', 'kracht', 'rustdag', 35, 2, true, NULL, '2026-11-09 15:09:16.3+01', '2026-11-09 15:09:16.3+01'),
	('72e7f350-4c2a-446f-923e-407ef8945e96', 'springen', 'Springen voor je botten', 'Vijftig sprongen, drie à vier keer per week. Mag ook op een fietsdag.', 'kracht', 'rustdag', 6, 1, true, NULL, '2026-11-09 15:09:16.385+01', '2026-11-09 15:09:16.385+01');


--
-- Data for Name: mobility_series_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_series_items VALUES
	('67dc5954-835c-475a-bcca-bb9ea4478838', '5b8f7d5a-702b-499e-b948-f569781d504b', '9673ac2d-f8ce-4eb5-a0c2-7924cd57e6db', 0, 2, 12, NULL, 20),
	('f75e01c4-c634-46ea-a377-245e9fe46094', '5b8f7d5a-702b-499e-b948-f569781d504b', 'b6b78c50-a425-4fb2-a686-e62a9af1f44d', 1, 2, 10, NULL, 20),
	('857a2c21-91ee-4bd5-928b-d3d7101db868', '5b8f7d5a-702b-499e-b948-f569781d504b', 'f1d5b4e1-f7c7-4b4e-948c-19ec46352ec1', 2, 2, 8, NULL, 20),
	('6841b071-f676-43f1-8327-f88ec588664d', '5b8f7d5a-702b-499e-b948-f569781d504b', 'ad8ec05b-6063-453f-b899-d8c799cb5a11', 4, 2, NULL, 20, 30),
	('772a73f3-1011-4728-b0fd-6e6cb5d237a5', '5b8f7d5a-702b-499e-b948-f569781d504b', '03413be0-f9ae-438a-846d-ef33b67a77b6', 3, 2, NULL, 30, 30),
	('b4ee410e-7125-4106-8fe0-b23673f54158', 'af636333-8692-4745-a1c6-494fa9c8ea7e', '3f60cb69-39c8-4c9e-ab43-4f48f67942f9', 3, 1, 8, NULL, 10),
	('f44fc12e-d64f-4d4b-a6e2-cb24ab211e5b', 'af636333-8692-4745-a1c6-494fa9c8ea7e', 'cea1d5cd-1970-4360-95b9-7b28e98d3113', 2, 1, 12, NULL, 10),
	('70cb7745-b39b-4df5-b0c5-c7a531a52d81', 'af636333-8692-4745-a1c6-494fa9c8ea7e', 'ab93a2eb-b62d-4adf-8938-5a5b507755bd', 1, 1, 8, NULL, 10),
	('8bb848db-0fed-4950-9b28-55b2d46f8431', 'af636333-8692-4745-a1c6-494fa9c8ea7e', '96c872c8-4739-44f5-886d-85e9f7adf151', 0, 1, 10, NULL, 10),
	('d94499fc-2c36-4ca6-9dfe-6ff34af898bb', 'af636333-8692-4745-a1c6-494fa9c8ea7e', '9673ac2d-f8ce-4eb5-a0c2-7924cd57e6db', 4, 1, 12, NULL, 10),
	('319a4783-40de-4b2b-b45d-5b4e8574df43', '7fb1efda-4332-4cc6-8502-3150ee856868', 'b6a66de3-ec53-445d-8351-c4c7ba085c33', 2, 1, NULL, 45, 10),
	('c2086431-0b62-4e15-8576-0cd282076cdf', '7fb1efda-4332-4cc6-8502-3150ee856868', '0240f0e2-b6fc-411a-951c-3759943230ff', 1, 1, NULL, 45, 10),
	('8e09aae9-3030-401a-86a4-698e3b63024d', '7fb1efda-4332-4cc6-8502-3150ee856868', '80439eca-47c2-468a-a5f1-7afc0aa781e0', 0, 1, NULL, 45, 10),
	('5e5a546d-9617-482a-8e05-8d3b917854a4', '7fb1efda-4332-4cc6-8502-3150ee856868', 'b321505f-267e-42d2-8830-865d6b918f05', 4, 1, NULL, 60, 0),
	('01cdfe80-cb55-4e66-856c-4addf2bb223b', '7fb1efda-4332-4cc6-8502-3150ee856868', 'f0e476c7-c9f3-4a08-ab0a-4f68af7611e4', 3, 1, NULL, 30, 10),
	('e47278e5-ee38-4859-9e8e-8f57499b09d8', 'e6dc41b7-814a-456d-ab8f-a2d07a0e7772', 'acd258de-6ec1-4c99-842e-800f4a93288b', 4, 2, 10, NULL, 20),
	('5cc44887-70fa-4fea-b7b9-530dc4b023de', 'e6dc41b7-814a-456d-ab8f-a2d07a0e7772', 'f1c7c44d-834d-44de-94b3-35340b755e4e', 6, 1, 10, NULL, 10),
	('53e8250e-0d66-4f86-b67d-d32b0bb11876', 'e6dc41b7-814a-456d-ab8f-a2d07a0e7772', '0240f0e2-b6fc-411a-951c-3759943230ff', 5, 1, NULL, 45, 10),
	('de2c1a90-38c1-478c-8a38-005ee8cddfe2', 'e6dc41b7-814a-456d-ab8f-a2d07a0e7772', '91f1817c-916e-4284-9892-1bb91a0ec45a', 3, 1, 10, NULL, 15),
	('e61c8c80-3092-4296-8814-99158ba6cf34', 'e6dc41b7-814a-456d-ab8f-a2d07a0e7772', 'f0e476c7-c9f3-4a08-ab0a-4f68af7611e4', 2, 2, NULL, 30, 15),
	('d06a4c92-dae0-479c-b61f-3d6621b230c4', 'e6dc41b7-814a-456d-ab8f-a2d07a0e7772', 'ab93a2eb-b62d-4adf-8938-5a5b507755bd', 1, 2, 8, NULL, 15),
	('b0565326-d84c-4120-aa20-15f41dd4660f', 'e6dc41b7-814a-456d-ab8f-a2d07a0e7772', '96c872c8-4739-44f5-886d-85e9f7adf151', 0, 1, 10, NULL, 10),
	('f595f345-e4d4-4021-ae0f-dc5ca7320fbc', 'e6dc41b7-814a-456d-ab8f-a2d07a0e7772', 'f1d5b4e1-f7c7-4b4e-948c-19ec46352ec1', 7, 2, 8, NULL, 20),
	('6b5d3a83-0f93-4b0b-b889-6e3efad2493b', '0a38ca37-39ea-4304-be48-2f1a1cbc04f0', 'b9571d4c-cc19-4017-a9e5-64262471dee6', 3, 2, 15, NULL, 45),
	('2c04e12b-2b9a-4a7e-8c45-7a8f0df14d04', '0a38ca37-39ea-4304-be48-2f1a1cbc04f0', 'fdbc9c2b-1584-4884-ba36-c09a2b5bd988', 1, 2, 10, NULL, 45),
	('6fe29d4f-a54e-4e74-81ab-edf9ab0e989d', '0a38ca37-39ea-4304-be48-2f1a1cbc04f0', 'f0360d90-2c6d-4921-a957-9b061079987f', 0, 3, 12, NULL, 60),
	('76370c7d-0e87-4c44-931c-4dce73506ce8', '0a38ca37-39ea-4304-be48-2f1a1cbc04f0', '9673ac2d-f8ce-4eb5-a0c2-7924cd57e6db', 2, 3, 12, NULL, 45),
	('df35c22f-606c-46f2-b76b-d4457bd68d06', '0a38ca37-39ea-4304-be48-2f1a1cbc04f0', '03413be0-f9ae-438a-846d-ef33b67a77b6', 4, 2, NULL, 30, 45),
	('80e01705-e45c-4adc-98f1-57ff55c6b819', 'd97a44af-baf1-4749-b2ae-3c91b91d1b77', '332aa8cb-91a7-485c-a440-436b64bb0126', 3, 2, NULL, 40, 60),
	('87dedb3f-97fb-4e53-a047-7b7f5e993ca8', 'd97a44af-baf1-4749-b2ae-3c91b91d1b77', 'ffd592e0-5964-4519-bc94-d8b53db5267c', 2, 3, 10, NULL, 45),
	('322bb9a2-f09e-4843-9874-80249c063869', 'd97a44af-baf1-4749-b2ae-3c91b91d1b77', 'fdbc9c2b-1584-4884-ba36-c09a2b5bd988', 1, 3, 10, NULL, 45),
	('35d192c3-f82e-4e74-bae7-035dafd29785', 'd97a44af-baf1-4749-b2ae-3c91b91d1b77', 'ba7e019d-7333-4320-a455-08fbc1feb8a2', 0, 3, 8, NULL, 60),
	('fe0c6713-e1cf-46f2-b709-812143eafb8a', 'd97a44af-baf1-4749-b2ae-3c91b91d1b77', 'ad8ec05b-6063-453f-b899-d8c799cb5a11', 4, 2, NULL, 20, 30),
	('d24605dd-f71c-4d79-aa23-81b03f9e8f63', 'aa4356f9-0b2a-4828-b45d-a8efe46924e8', '8ee2fc41-faf0-44d3-a428-5b77d9c03478', 0, 3, 8, NULL, 45),
	('b040f69c-ecd3-48b5-829e-d0857581afb4', 'aa4356f9-0b2a-4828-b45d-a8efe46924e8', 'b9571d4c-cc19-4017-a9e5-64262471dee6', 3, 3, 15, NULL, 45),
	('c20e2dfc-c673-4c72-af69-1d4678aa7978', 'aa4356f9-0b2a-4828-b45d-a8efe46924e8', 'ffd592e0-5964-4519-bc94-d8b53db5267c', 2, 2, 10, NULL, 45),
	('33c0bda8-9123-493f-bfca-4c55287ff37d', 'aa4356f9-0b2a-4828-b45d-a8efe46924e8', 'ba7e019d-7333-4320-a455-08fbc1feb8a2', 1, 2, 8, NULL, 60),
	('4b5a1fcc-d077-45d6-ac9a-3fc32fe99d4e', 'aa4356f9-0b2a-4828-b45d-a8efe46924e8', 'f1d5b4e1-f7c7-4b4e-948c-19ec46352ec1', 4, 2, 8, NULL, 20),
	('4d7995ac-c5a5-4a56-a0b9-bcf12619a3a9', '64df24d7-6fe8-472f-9703-494ec18d8d38', 'c3409c75-e695-45ed-9a81-dc8bf696c33a', 3, 3, 10, NULL, 120),
	('8733feb2-f755-4fc3-b4e2-3f406d10ba23', '64df24d7-6fe8-472f-9703-494ec18d8d38', '5dcc6e3a-c8ec-4253-8d81-40bbce632ee1', 2, 3, 10, NULL, 120),
	('eb986d03-fa3a-42f4-9c65-cc4c0fd4d902', '64df24d7-6fe8-472f-9703-494ec18d8d38', 'a65406a8-08da-43b4-8490-2329a0e3b8aa', 1, 3, 10, NULL, 120),
	('66606750-e3c0-46b2-bf6b-3dffe39cea87', '64df24d7-6fe8-472f-9703-494ec18d8d38', '6e70fb05-e539-4921-ad55-f27562799f6c', 0, 3, 10, NULL, 120),
	('67fe7c54-8fab-4c32-aae2-da1e2602cb70', '37ae6383-482c-4538-b4d5-82ccb6e89bc5', 'c3409c75-e695-45ed-9a81-dc8bf696c33a', 3, 3, 8, NULL, 120),
	('f19a649f-6eb2-4b02-8c0a-2bdf40d6c71a', '37ae6383-482c-4538-b4d5-82ccb6e89bc5', '5dcc6e3a-c8ec-4253-8d81-40bbce632ee1', 2, 3, 8, NULL, 120),
	('400ff03b-a43d-49d8-8fe6-9cd15adccc92', '37ae6383-482c-4538-b4d5-82ccb6e89bc5', 'a65406a8-08da-43b4-8490-2329a0e3b8aa', 1, 3, 8, NULL, 120),
	('39bf9ff1-fa04-4d01-8ffe-110d6c57d5f1', '37ae6383-482c-4538-b4d5-82ccb6e89bc5', '6e70fb05-e539-4921-ad55-f27562799f6c', 0, 3, 8, NULL, 120),
	('cb30bf58-c619-4878-8c87-432f921b040f', '0bd9cb24-8247-4b28-b260-2e4e92d4ee53', 'c3409c75-e695-45ed-9a81-dc8bf696c33a', 3, 3, 6, NULL, 120),
	('0d048c88-8a41-4d38-8cae-d7ba30d010a4', '0bd9cb24-8247-4b28-b260-2e4e92d4ee53', '5dcc6e3a-c8ec-4253-8d81-40bbce632ee1', 2, 3, 6, NULL, 120),
	('68ea163f-a653-42de-a31f-1d18768eb45b', '0bd9cb24-8247-4b28-b260-2e4e92d4ee53', 'a65406a8-08da-43b4-8490-2329a0e3b8aa', 1, 3, 6, NULL, 120),
	('2b034610-206d-43ae-ada5-0c5b9bcc512b', '0bd9cb24-8247-4b28-b260-2e4e92d4ee53', '6e70fb05-e539-4921-ad55-f27562799f6c', 0, 3, 6, NULL, 120),
	('9c27d4d8-c94a-4e98-a7c6-f62137d1f35d', '7d516f67-949a-4e62-adf4-eb3c5a9888fc', 'c3409c75-e695-45ed-9a81-dc8bf696c33a', 3, 2, 5, NULL, 120),
	('4b184405-e3c5-48ce-8eb1-9079dd88f404', '7d516f67-949a-4e62-adf4-eb3c5a9888fc', '5dcc6e3a-c8ec-4253-8d81-40bbce632ee1', 2, 2, 5, NULL, 120),
	('18e3037d-a561-483f-9613-b3c172faf2ea', '7d516f67-949a-4e62-adf4-eb3c5a9888fc', 'a65406a8-08da-43b4-8490-2329a0e3b8aa', 1, 2, 5, NULL, 120),
	('e268c8dc-efaa-4f10-978f-0141bc5c6aa0', '7d516f67-949a-4e62-adf4-eb3c5a9888fc', '6e70fb05-e539-4921-ad55-f27562799f6c', 0, 2, 5, NULL, 120),
	('e6cd51c4-b29b-4687-934f-bffb80540e1b', '9abc2874-e2ea-4789-a21a-6fe1a68bacb7', 'c0087797-3493-4b32-9114-a7e4228d7abf', 3, 3, 12, NULL, 45),
	('7261d80e-8297-4128-895d-84eecee1a834', '9abc2874-e2ea-4789-a21a-6fe1a68bacb7', '36ea2368-4a90-4f02-a826-095fc47abdef', 2, 3, 12, NULL, 45),
	('36f76998-c4b1-4d9e-857c-06d763da45ae', '9abc2874-e2ea-4789-a21a-6fe1a68bacb7', 'f1050950-31f5-45fc-8bf6-7e33f1f6affb', 1, 3, 10, NULL, 75),
	('93b57dcd-428f-47fa-b41f-12aaa99394f5', '9abc2874-e2ea-4789-a21a-6fe1a68bacb7', 'f6124ce4-40f4-44b6-a1ff-68088769f9f1', 0, 3, 12, NULL, 75),
	('bb76d494-2e38-47ce-8263-deab7a55743e', '72e7f350-4c2a-446f-923e-407ef8945e96', 'da47ea5f-453e-495f-b9a8-5ff255cdfdc4', 0, 5, 10, NULL, 30);


--
-- Data for Name: mobility_sessions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: nutrition_foods; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.nutrition_foods VALUES
	('31ede4fb-d3e8-41f1-800b-8f65ab6a49a3', 1, 'Aardappelen rauw', 'g', 88, 19, 1, 2, 0, 1.8, 2, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 6, 0.5, 22, 0.37, 0, 14, 0, 0),
	('df9f7927-20ef-41a5-9a58-f3a6f1726b25', 2, 'Aardappelen nieuwe rauw', 'g', 88, 19, 1, 2, 0, 1.8, 2, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 6, 0.5, 14, 0.2, 0, 25, 0, 0),
	('15728c5d-d2eb-4885-83f0-4a663e55c4a9', 3, 'Aardappelen oude rauw', 'g', 88, 19, 1, 2, 0, 1.8, 2, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 6, 0.5, 17, 0.3, 0, 5, 0, 0),
	('829ccf63-aa86-4e8f-9b79-e41429ff75d7', 4, 'Pasta witte rauw', 'g', 356, 72, 1, 12.3, 1.5, 3, 2, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 15, 2, 53, 1.5, 0, 0, 0, 0),
	('83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 5, 'Rijst witte rauw', 'g', 352, 78, 0, 7, 1, 1.3, 2, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 10, 0.4, 13, 1.8, 0, 0, 0, 0),
	('7b55e74d-656d-4947-860d-5bfbcd90ae0e', 7, 'Andijvie rauw', 'g', 16, 1, 1, 1.5, 0.3, 1.7, 29, 'NEVO-online 2025/9.0', 'Groente', 54, 1.2, 11, 0.55, 0, 1, 0, 0),
	('8d80a26a-9dbe-4f70-b62e-254de8fdbc6a', 8, 'Andijvie gekookt', 'g', 22, 2.3, 1.6, 1.4, 0.5, 1.7, 5, 'NEVO-online 2025/9.0', 'Groente', 60, 0.5, 9, 0.27, 0, 1, 0, 0),
	('133a18b7-6750-462d-9639-57ded6520cb4', 9, 'Asperge witte rauw', 'g', 22, 3, 1, 1, 0.3, 1.7, 1, 'NEVO-online 2025/9.0', 'Groente', 20, 1, 20, 0.5, 0, 30, 0, 0),
	('be7ca13a-37bb-4af1-b483-9aab6e1a6cec', 10, 'Aubergine rauw', 'g', 20, 3, 3, 1, 0, 2, 2, 'NEVO-online 2025/9.0', 'Groente', 10, 0.5, 11, 0.2, 0, 10, 0, 0),
	('deb211d0-1798-4096-ba7f-800138b211a4', 11, 'Aubergine gekookt', 'g', 21, 3, 3, 1, 0, 2.5, 10, 'NEVO-online 2025/9.0', 'Groente', 10, 0.5, 8, 0.1, 0, 4, 0, 0),
	('4f82db72-1118-42db-bdc9-8d34e600aedd', 12, 'Biet rode rauw', 'g', 38, 6, 6, 1.7, 0.1, 2.9, 70, 'NEVO-online 2025/9.0', 'Groente', 10, 0.4, 14, 0.4, 0, 2, 0, 0),
	('6a8b1f7d-e597-43a5-bf90-b0dfc1a3e363', 13, 'Selderij bleek- gekookt', 'g', 14, 2, 1, 1, 0, 1.1, 60, 'NEVO-online 2025/9.0', 'Groente', 80, 0.5, 4, 0.1, 0, 10, 0, 0),
	('23613364-5e2b-48b1-84ab-2ced4de52598', 14, 'Kool bloem- rauw', 'g', 25, 3, 2.4, 1.9, 0.2, 2.2, 8, 'NEVO-online 2025/9.0', 'Groente', 28, 0.3, 12, 0.37, 0, 25, 0, 0),
	('a14abf55-82f3-4a53-b79a-77cb38746610', 15, 'Kool bloem- gekookt', 'g', 22, 1.8, 1.2, 1.8, 0.4, 2.3, 10, 'NEVO-online 2025/9.0', 'Groente', 25, 0.3, 9, 0.26, 0, 22, 0, 0),
	('ca746032-0374-45d6-880f-128c2a114161', 16, 'Kool boeren- gekookt', 'g', 33, 1, 0.9, 2.7, 1.3, 3.5, 6, 'NEVO-online 2025/9.0', 'Groente', 231, 1.1, 13, 0.2, 0, 25, 0, 0),
	('cff84ca3-7281-4b19-a14d-1d9b34062f84', 17, 'Cantharel rauw', 'g', 16, 1, 0, 1.8, 0, 2.5, 5, 'NEVO-online 2025/9.0', 'Groente', 10, 0.5, 7, 0.97, 0, 20, 0, 0),
	('8ebaf17b-22c8-4c07-a27c-033a32105730', 18, 'Cantharel gekookt', 'g', 20, 2, 0, 1.8, 0, 2.5, 5, 'NEVO-online 2025/9.0', 'Groente', 10, 0.5, 7, 0.97, 0, 6, 0, 0),
	('7036c790-6574-48e2-8c8c-05efeb3dd099', 19, 'Champignon rauw', 'g', 18, 0.4, 0.2, 2.3, 0.5, 1.5, 5, 'NEVO-online 2025/9.0', 'Groente', 6, 0.2, 9, 0.3, 0, 4, 0, 0),
	('48283edc-ad72-455f-aa00-e452a3408f53', 20, 'Champignon gekookt', 'g', 21, 0.4, 0.2, 3.8, 0.3, 1.1, 5, 'NEVO-online 2025/9.0', 'Groente', 5, 1, 7, 0.3, 0, 1, 0, 0),
	('5b958908-1fcc-4e38-9b16-765a37858529', 21, 'Kool Chinese rauw', 'g', 17, 2, 0, 1, 0, 2.5, 10, 'NEVO-online 2025/9.0', 'Groente', 125, 1, 11, 0.23, 0, 23, 0, 0),
	('4c8b91e2-9cab-4797-9056-5de7cf54fbff', 22, 'Kool Chinese gekookt', 'g', 17, 2, 0, 1, 0, 2.5, 10, 'NEVO-online 2025/9.0', 'Groente', 125, 1, 11, 0.17, 0, 10, 0, 0),
	('d80b7fa3-e079-4682-9816-efcca7223a0a', 23, 'Doperwten rauw', 'g', 65, 10, 1, 4, 0, 4.7, 10, 'NEVO-online 2025/9.0', 'Groente', 20, 2, 30, 1.1, 0, 25, 0, 0),
	('95c3cbd3-459e-4dde-81c0-87cf911b7b3c', 24, 'Kool groene rauw', 'g', 36, 4.1, 4.1, 2.4, 0.2, 4.1, 7, 'NEVO-online 2025/9.0', 'Groente', 56, 0.5, 14, 0.3, 0, 30, 0, 0),
	('df6dabd5-af9b-4358-b866-e324e8f1da18', 25, 'Kool groene gekookt', 'g', 21, 2.3, 2.3, 1.5, 0.2, 2.2, 5, 'NEVO-online 2025/9.0', 'Groente', 54, 0.4, 9, 0.2, 0, 45, 0, 0),
	('924dff03-793e-4997-8254-3d4c52453f83', 26, 'Selderij knol- gekookt', 'g', 38, 5, 0, 2, 0, 4.9, 80, 'NEVO-online 2025/9.0', 'Groente', 80, 1, 13, 0.1, 0, 6, 0, 0),
	('6011ae77-7bcc-4f94-8940-54bbb5254b92', 27, 'Komkommer z schil rauw', 'g', 15, 2.5, 1.7, 0.6, 0.2, 0.3, 2, 'NEVO-online 2025/9.0', 'Groente', 22, 0.4, 10, 0.22, 0, 1, 0, 0),
	('c7a5ebd8-c2b0-4b91-a2db-af8f8f4755f3', 28, 'Komkommer gekookt', 'g', 17, 3, 3, 1, 0, 0.3, 5, 'NEVO-online 2025/9.0', 'Groente', 20, 0.5, 10, 0.22, 0, 4, 0, 0),
	('1ee06616-a348-4db8-9411-9b9ec6f8ad5f', 29, 'Koolraap gekookt', 'g', 33, 5.8, 5.7, 0.7, 0.1, 3, 4, 'NEVO-online 2025/9.0', 'Groente', 37, 0.2, 8, 0.1, 0, 15, 0, 0),
	('c13db03c-9d48-47d2-81f5-88eb733c9005', 30, 'Koolrabi gekookt', 'g', 31, 4, 0, 2, 0.3, 2, 10, 'NEVO-online 2025/9.0', 'Groente', 90, 1, 43, 0.26, 0, 50, NULL, NULL),
	('49b4ca44-4958-404a-8aa6-f01595053e41', 31, 'Paprika groene rauw', 'g', 19, 2.5, 2.5, 0.8, 0.1, 2.5, 0, 'NEVO-online 2025/9.0', 'Groente', 7, 0.3, 9, 0.23, 0, 71, 0, 0),
	('79d132b1-59f5-4d85-b54f-659d7f3ba3bb', 32, 'Paprika groene gekookt', 'g', 17, 2.3, 2, 0.6, 0.2, 2.2, 2, 'NEVO-online 2025/9.0', 'Groente', 10, 0.5, 8, 0.23, 0, 70, 0, 0),
	('749eb8db-d012-4e34-ad24-830873f30827', 33, 'Rozijnen gedroogd', 'g', 325, 71.7, 69, 3.1, 0.5, 3.7, 25, 'NEVO-online 2025/9.0', 'Fruit', 50, 2, 42, 0.18, 0, 0, 0, 0),
	('b05f1524-f71d-421a-8e0d-fa2bc11e136f', 35, 'Peultjes rauw', 'g', 33, 5, 0, 2, 0, 2.5, 5, 'NEVO-online 2025/9.0', 'Groente', 40, 0.5, 28, 0.5, 0, 35, 0, 0),
	('845f8a2d-0ad7-4e21-88e4-76ce0de46247', 36, 'Postelein gekookt', 'g', 13, 1, 1, 1, 0, 2.5, 30, 'NEVO-online 2025/9.0', 'Groente', 125, 3, 67, 0.17, 0, 4, 0, 0),
	('d4447b12-1947-493f-ba00-919cb4a991ec', 37, 'Prei gekookt', 'g', 22, 2.1, 1.5, 1.1, 0.5, 2.3, 3, 'NEVO-online 2025/9.0', 'Groente', 41, 0.3, 10, 0.19, 0, 5, 0, 0),
	('93a8b003-92ea-4222-ae75-37eaa7487cff', 38, 'Raapstelen rauw', 'g', 17, 1, 0, 2, 0, 2.3, 40, 'NEVO-online 2025/9.0', 'Groente', 100, 3, 10, 0.4, 0, 35, 0, 0),
	('81ccfaf6-aaff-4c14-998f-7cde6cae92c0', 39, 'Raapstelen gekookt', 'g', 17, 1, 0, 2, 0, 2.3, 29, 'NEVO-online 2025/9.0', 'Groente', 100, 3, 10, 0.4, 0, 15, 0, 0),
	('df5e88a9-276e-4481-aeb6-00e05325b3b4', 40, 'Rabarber rauw', 'g', 23, 2, 2, 1, 0, 1.8, 5, 'NEVO-online 2025/9.0', 'Groente', 40, 0.5, 14, 0.1, 0, 6, 0, 0),
	('28437478-fea2-47c0-8b1b-1c1ba00bb2dd', 41, 'Kool rode rauw', 'g', 27, 3, 3, 2, 0, 3.6, 9, 'NEVO-online 2025/9.0', 'Groente', 50, 0.4, 17, 0.3, 0, 60, 0, 0),
	('6200d375-47f3-4439-b104-5659378469a0', 42, 'Kool rode gekookt', 'g', 23, 3, 3, 1.3, 0, 2.9, 9, 'NEVO-online 2025/9.0', 'Groente', 42, 0.3, 11, 0.16, 0, 38, 0, 0),
	('1e9c4ce7-4e04-462b-92fe-c56bc7c49120', 45, 'Schorseneren rauw', 'g', 76, 15, 15, 1, 1, 1.7, 5, 'NEVO-online 2025/9.0', 'Groente', 60, 1.5, 10, 0.2, 0, 4, 0, 0),
	('bfce32f1-c4cf-450d-9630-2a3ac7ccbe5e', 46, 'Sla krop- rauw', 'g', 13, 0.3, 0.3, 1.4, 0.4, 1.2, 8, 'NEVO-online 2025/9.0', 'Groente', 49, 0.7, 15, 0.41, 0, 0, 0, 0),
	('660a3b3d-938c-4e39-a6db-432e3315cb82', 47, 'Sla krop- gekookt', 'g', 22, 2, 2, 2, 0.4, 1.2, 15, 'NEVO-online 2025/9.0', 'Groente', 30, 0.4, 15, 0.41, 0, 1, 0, 0),
	('81006262-2f53-49be-8111-ae2c86ec548c', 48, 'Snijbiet gekookt', 'g', 29, 3, 3, 3, 0, 2.5, 200, 'NEVO-online 2025/9.0', 'Groente', 90, 4, 11, NULL, 0, 6, 0, 0),
	('5184c16f-0e67-4251-ab8e-4584ccdacb6b', 49, 'Bonen snij- rauw', 'g', 22, 2, 0.7, 1.9, 0.1, 2.7, 4, 'NEVO-online 2025/9.0', 'Groente', 40, 0.5, 10, 0.4, 0, 5, 0, 0),
	('ba75b902-52a2-464f-8404-bfc89ccf8172', 50, 'Bonen sperzie- rauw', 'g', 25, 1.8, 1.2, 2.3, 0.2, 3.6, 3, 'NEVO-online 2025/9.0', 'Groente', 70, 0.8, 30, 0.25, 0, 1, 0, 0),
	('2f19d7da-fda2-410c-bde0-ab19b6a889d0', 51, 'Spinazie rauw', 'g', 26, 0.9, 0, 3.2, 0.6, 2, 13, 'NEVO-online 2025/9.0', 'Groente', 105, 2, 55, 1.1, 0, 1, 0, 0),
	('b3c804e3-c3af-408c-85bf-3237458f92a6', 52, 'Spinazie gekookt', 'g', 25, 0.7, 0, 2.9, 0.9, 1.4, 15, 'NEVO-online 2025/9.0', 'Groente', 84, 2.4, 77, 1.2, 0, 7, 0, 0),
	('47db30ec-adf5-44bf-8b4d-847182df8b8c', 53, 'Kool spits- rauw', 'g', 42, 4, 4, 3, 1, 2.5, 10, 'NEVO-online 2025/9.0', 'Groente', 50, 0.5, 12, 0.2, 0, 36, 0, 0),
	('f7b70511-b21e-4d9d-b6ee-29942ec1dc4e', 54, 'Kool spits- gekookt', 'g', 21, 1.6, 1.6, 1.1, 0.6, 2.5, 10, 'NEVO-online 2025/9.0', 'Groente', 39, 0.4, 8, 0.2, 0, 8, 0, 0),
	('abe81a10-9e6d-45f2-ba61-f577de4556bf', 55, 'Spruitjes gekookt', 'g', 47, 5.6, 1.4, 2.3, 0.7, 4.5, 7, 'NEVO-online 2025/9.0', 'Groente', 38, 0.6, 22, 0.31, 0, 132, 0, 0),
	('283a9363-f54b-469d-b48f-ea0c9b953620', 57, 'Mais suiker- gekookt', 'g', 74, 11.6, 8.1, 2.5, 1.4, 2.5, 1, 'NEVO-online 2025/9.0', 'Groente', 11, 0.5, 45, 0.4, 0, 7, 0, 0),
	('7d970cfd-54fd-4495-8c08-850eee35b69d', 58, 'Tauge rauw', 'g', 25, 3.2, 1.8, 2.2, 0.1, 1.2, 6, 'NEVO-online 2025/9.0', 'Groente', 16, 0.4, 15, 0.3, 0, 8, 0, 0),
	('c2a9dba7-f59a-48ab-876b-fba19cacaf46', 59, 'Tauge gekookt', 'g', 17, 1.7, 1.1, 1.8, 0.1, 1.2, 5, 'NEVO-online 2025/9.0', 'Groente', 22, 0.4, 13, 0.26, 0, 4, 0, 0),
	('221ea599-6289-4ac4-97b8-71475916afde', 60, 'Tomaat gewoon rauw', 'g', 20, 2.9, 2.9, 0.7, 0.4, 1.3, 2, 'NEVO-online 2025/9.0', 'Groente', 11, 0.3, 8, 0.15, 0, 15, 0, 0),
	('35ef9ea6-8b3e-416e-8d05-68594b1cb8f3', 61, 'Tomaat gewoon gekookt', 'g', 23, 2.9, 2.8, 0.7, 0.7, 1.3, 2, 'NEVO-online 2025/9.0', 'Groente', 9, 0.6, 8, 0.21, 0, 14, 0, 0),
	('845f8ae1-4786-4a56-a626-128ff15aeac1', 62, 'Bonen tuin- rauw', 'g', 51, 4, 0, 5, 0, 7.3, 5, 'NEVO-online 2025/9.0', 'Groente', 20, 0.9, 28, 0.9, 0, 80, 0, 0),
	('ee790d34-d5bf-478b-8985-1c6a12976110', 63, 'Ui rauw', 'g', 37, 6.3, 4.5, 1.3, 0.2, 2.7, 4, 'NEVO-online 2025/9.0', 'Groente', 29, 0.3, 9, 0.29, 0, 5, 0, 0),
	('52122b91-7a0a-4e74-bc7e-4a9751604323', 64, 'Ui gekookt', 'g', 35, 6.3, 3, 1, 0.2, 2.2, 2, 'NEVO-online 2025/9.0', 'Groente', 24, 0.2, 9, 0.31, 0, 5, 0, 0),
	('a600e4c2-8b9d-4608-b3f4-732e50ed1a2a', 65, 'Sla veld- rauw', 'g', 18, 0.5, 0, 2.6, 0.2, 1.7, 5, 'NEVO-online 2025/9.0', 'Groente', 79, 1.1, 28, 0.32, 0, 8, 0, 0),
	('a7024fdc-173d-45e1-b787-283e08929af4', 67, 'Witlof rauw', 'g', 19, 2.4, 2.4, 1.3, 0.2, 1.2, 2, 'NEVO-online 2025/9.0', 'Groente', 22, 0.2, 10, 0.2, 0, 0, 0, 0),
	('910fc517-66d7-4ebf-85ce-eda4c64cf44a', 68, 'Witlof gekookt', 'g', 16, 2, 2.1, 1.2, 0.2, 1.1, 3, 'NEVO-online 2025/9.0', 'Groente', 24, 0.2, 10, 0.17, 0, 0, 0, 0),
	('75746632-2cf6-41f0-be9e-4bbeb9feca2c', 69, 'Kool witte rauw', 'g', 30, 4, 4, 2, 0, 2.8, 8, 'NEVO-online 2025/9.0', 'Groente', 30, 0.5, 9, 0.23, 0, 29, 0, 0),
	('36722463-638f-4877-9de8-8e9e074715ce', 70, 'Kool witte gekookt', 'g', 16, 1.8, 1.8, 0.9, 0, 2.8, 15, 'NEVO-online 2025/9.0', 'Groente', 51, 0.2, 7, 0.07, 0, 15, 0, 0),
	('7d39002a-f385-4d49-928c-6be07ed2a88c', 71, 'Wortel rauw gem', 'g', 32, 5.3, 4.2, 0.8, 0.3, 2.8, 28, 'NEVO-online 2025/9.0', 'Groente', 25, 0.2, 7, 0.24, 0, 4, 0, 0),
	('59b06440-4e3e-4a6b-8205-335bf34ab676', 72, 'Wortel gekookt gem', 'g', 32, 5.2, 4.9, 0.7, 0.3, 2.9, 26, 'NEVO-online 2025/9.0', 'Groente', 28, 0.2, 7, 0.23, 0, 3, 0, 0),
	('a2056a56-a509-44c6-9e6b-a5a2082d817d', 73, 'Kool zuur- rauw', 'g', 13, 0.6, 0, 1.1, 0, 3.2, 600, 'NEVO-online 2025/9.0', 'Groente', 62, 0.3, 9, 0.12, 0, 25, 0, 0),
	('503bd19c-8fd7-4bf1-8ed2-8d09ae5b2a33', 74, 'Kool zuur- gekookt', 'g', 14, 1, 0, 0.9, 0, 3.2, 289, 'NEVO-online 2025/9.0', 'Groente', 46, 0.4, 8, 0.1, 0, 15, 0, 0),
	('f0e5c065-de95-4b20-8970-4ec48db782f0', 75, 'Groente soep- rauw', 'g', 32, 4.6, 3, 1.5, 0.2, 3.2, 26, 'NEVO-online 2025/9.0', 'Groente', 41, 0.8, 12, 0.39, 0, 17, 0, 0),
	('9d1e7206-2205-4d5e-a9ad-7aa36628a5c5', 80, 'Bloem rijste-', 'g', 369, 83.9, 0.2, 6.2, 0.5, 2, 5, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 6, 0.2, 27, 1, 0, 0, 0, 0),
	('71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 83, 'Ei kippen- rauw gem', 'g', 132, 0.2, 0.2, 12.3, 9.1, 0, 153, 'NEVO-online 2025/9.0', 'Eieren', 57, 2.3, 14, 1.56, 1.1, 0, 0.04, 0),
	('2f98e8a5-9fbe-4941-9134-0963e64b2222', 84, 'Ei kippen- gekookt gem', 'g', 128, 0, 0, 12.3, 8.8, 0, 149, 'NEVO-online 2025/9.0', 'Eieren', 64, 2.4, 15, 1.63, 1.8, 0, 0.03, 0),
	('2798b975-8cea-40fd-bc85-8530e0337a97', 85, 'Eidooier kippen- rauw', 'g', 361, 0.2, 0.2, 16.7, 32.6, 0, 40, 'NEVO-online 2025/9.0', 'Eieren', 150, 5.9, 12, 4.3, 5.6, 0, 0.11, 0),
	('d03e469d-a023-4c05-b5d1-6653714f7309', 86, 'Eidooier kippen- gekookt', 'g', 361, 0, 0, 16, 33, 0, 50, 'NEVO-online 2025/9.0', 'Eieren', 150, 6, 14, 3.6, 5, 0, 0.11, 0),
	('27a4a53d-4aa5-402e-9479-bffee2a647e9', 87, 'Eipoeder kippen-', 'g', 574, 3, 3, 46, 42, 0, 500, 'NEVO-online 2025/9.0', 'Eieren', 225, 11, 46, 5, 6.8, 0, 0.14, 0),
	('891f0095-b9ef-4df7-8c1d-5226fd4ad877', 95, 'Paardenvlees rauw', 'g', 99, 0, 0, 22.4, 1, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 12, 3.2, 23, 4, 0.1, 0, NULL, NULL),
	('4c472432-a028-43af-8d15-537e7a9dba57', 99, 'Schapenvlees >10 g vet rauw gem', 'g', 293, 0, 0, 17, 25, 0, 100, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 2.1, 24, 2.9, 0.2, 0, 0, 0),
	('e65a5f34-6d65-471c-ae84-52e1bde04418', 105, 'Kalfshersenen rauw', 'g', 108, 0, 0, 9, 8, 0, 150, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 15, 2, NULL, NULL, NULL, 0, NULL, NULL),
	('5aea96e2-78df-44fe-87ce-e6e90fec5458', 106, 'Eend m vel rauw', 'g', 388, 0, 0, 13.1, 37.3, 0, 73, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 1.3, 14, 1.3, 0.7, 0, 0, 0),
	('70744bbe-010e-4c57-9bda-3fb95c2f4ded', 107, 'Haas rauw', 'g', 115, 0, 0, 22, 3, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 2, 26, 1.7, 0, 0, 0, 0),
	('63a050f8-9fa2-4952-8627-376553b62217', 108, 'Kip m vel rauw', 'g', 218, 0, 0, 18.3, 16, 0, 74, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 0.8, 21, 1.37, 0.3, 0, 0.04, 0.14),
	('1228c13a-35b5-4cd4-90aa-2bd5332d1174', 109, 'Konijn tam rauw', 'g', 174, 0, 0, 21, 10, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 1.6, 25, 1.4, NULL, 0, 0, 0),
	('f2694350-a30c-48a3-9a53-d115743f0fc3', 110, 'Konijn wild rauw', 'g', 125, 0, 0, 20, 5, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 3.2, 25, 1.4, NULL, 0, 0, 0),
	('2f0ecd38-1633-47c2-ad1b-44d42196f312', 111, 'Mosselen gekookt', 'g', 125, 7.2, 0, 17.2, 3.1, 0, 387, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 67, 3.9, 63, 2.2, 0, 0, 0.39, 0.26),
	('06bd98ad-c69f-47ac-bd0b-4f9ef67c1f7f', 112, 'Paling rauw', 'g', 372, 0, 0, 14, 35.1, 0, 85, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 20, 1, 19, 1.75, 4.9, 2, 1.55, 3),
	('2018b754-d7f8-4469-8fbd-28ba9a8fab2c', 113, 'Haring pan- rauw', 'g', 199, 0, 0, 16, 15, 0, 80, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 100, 2, 32, 0.57, 6.2, 0, 0.93, 1.09),
	('396c97fe-a2e9-4eaf-b4f9-2449d4afb0cc', 114, 'Vis mager 0-5 g vet gem rauw', 'g', 92, 0, 0, 19.7, 1.5, 0, 92, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 27, 0.7, 25, 0.53, 3.4, 0, 0.12, 0.24),
	('666d8740-fe53-447d-81b1-97c8b5ce14cc', 116, 'Vis vet >5 g vet gem rauw', 'g', 242, 0.3, 0, 17.2, 19.1, 0, 201, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 31, 1, 29, 0.85, 6.7, 1, 0.9, 1.56),
	('e333932e-7324-43cd-96f0-83120d8f3b9d', 117, 'Bonen witte/bruine gedroogd', 'g', 314, 44.2, 3.4, 20.1, 2.4, 18.1, 2, 'NEVO-online 2025/9.0', 'Peulvruchten', 80, 5, 148, 2, 0, 0, 0, 0),
	('517db898-812a-4937-9e08-7872fe591884', 118, 'Erwten groene gedroogd', 'g', 315, 43, 6, 21, 2, 20.4, 10, 'NEVO-online 2025/9.0', 'Peulvruchten', 80, 5, 93, 3.5, 0, 0, 0, 0),
	('b8494ea2-3835-4996-a179-20faaf3508e1', 119, 'Kapucijners gedroogd', 'g', 305, 43, 1, 20, 1.5, 19.9, 10, 'NEVO-online 2025/9.0', 'Peulvruchten', 80, 5, 106, 3, 0, 2, 0, 0),
	('b8929810-ea50-49ce-8f5e-cc8cbceb7df5', 120, 'Linzen groene en bruine gedroogd', 'g', 306, 43, 1, 21, 1.5, 18, 5, 'NEVO-online 2025/9.0', 'Peulvruchten', 80, 5, 110, 3.9, 0, 0, 0, 0),
	('d8b8312d-1026-47da-ac0f-9681ba985bc3', 121, 'Aardappelpuree vers bereid m halfvolle melk en margarine', 'g', 83, 13.9, 1.4, 2.2, 1.8, 1.2, 21, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 38, 0.4, 17, 0.35, 0.1, 7, 0, 0),
	('e9a39c06-d7ce-416d-b467-db4b15873774', 122, 'Chips gem', 'g', 538, 52.3, 1.7, 6.3, 32.8, 4, 529, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('5a5e2c2c-1b05-40af-9d38-120159cfa57d', 124, 'Radijs rauw', 'g', 22, 4, 3, 1, 0, 0.9, 25, 'NEVO-online 2025/9.0', 'Groente', 30, 2, 5, 0.2, 0, 20, 0, 0),
	('3aff0621-064c-444a-85d8-6eff0e0fd90f', 125, 'Rammenas rauw', 'g', 30, 5, 1, 2, 0, 1, 50, 'NEVO-online 2025/9.0', 'Groente', 125, 2, 10, 0.28, 0, 30, 0, 0),
	('4b5f23de-9dfb-40ec-a5ca-7abd6a136cd6', 126, 'Sterkers rauw', 'g', 15, 0, 0, 2, 0, 3.3, 80, 'NEVO-online 2025/9.0', 'Groente', 250, 2.5, 44, 0.46, 0, 50, 0, 0),
	('c0592c1d-8b0c-4a2c-bf7a-90830648594e', 127, 'Rauwkost gem', 'g', 20, 2.5, 2.3, 0.9, 0.4, 1.3, 8, 'NEVO-online 2025/9.0', 'Groente', 26, 0.6, 11, 0.31, 0, 17, 0, 0),
	('79de5c19-dc40-45a6-91e7-ea9a76648221', 128, 'Peterselie vers', 'g', 37, 1, 0, 4, 0.8, 5, 25, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 40, 7.1, 23, 0.7, 0, 125, 0, 0),
	('373d74ae-341f-4031-b640-410f3f7078be', 130, 'Asperge witte blik/glas', 'g', 17, 1.9, 1.8, 1.4, 0.3, 1.2, 310, 'NEVO-online 2025/9.0', 'Groente', 15, 0.6, 10, 0.5, 0, 12, 0, 0),
	('b72f9ece-bf99-4fa6-9397-a848c2596366', 131, 'Augurk zuur', 'g', 10, 1, 1, 1, 0, 0.9, 350, 'NEVO-online 2025/9.0', 'Groente', 35, 0.2, 11, 0.3, 0, 0, 0, 0),
	('9d970b0c-00a6-4fb9-a247-2624f48067d5', 132, 'Augurk zoetzuur', 'g', 27, 5.3, 5.2, 0.8, 0, 0.9, 400, 'NEVO-online 2025/9.0', 'Groente', 16, 0.2, 10, 0.18, 0, 2, 0, 0),
	('0dd66912-bea2-404c-888f-084ad5f8efde', 133, 'Champignon blik/glas', 'g', 19, 0.5, 0, 2.2, 0.4, 2.3, 273, 'NEVO-online 2025/9.0', 'Groente', 20, 0.1, 6, 0.6, 0, 2, 0, 0),
	('3ad17ce7-a069-47f0-89b9-b927a46ab92b', 134, 'Doperwten middelfijn blik/glas', 'g', 94, 14, 1, 5, 1, 4.5, 250, 'NEVO-online 2025/9.0', 'Groente', 30, 2, 23, 0.71, 0, 9, 0, 0),
	('76d548de-91f9-484d-9e7b-92afb439856f', 135, 'Doperwten zeer fijn/extra fijn blik/glas', 'g', 78, 9.9, 3.2, 5.6, 0.8, 4.5, 135, 'NEVO-online 2025/9.0', 'Groente', 36, 1.6, 23, 0.95, 0, 9, 0, 0),
	('992357f8-9923-4438-998e-95308530c844', 136, 'Doperwten m wortelen blik/glas', 'g', 56, 7, 3.2, 3.4, 0.5, 4.8, 146, 'NEVO-online 2025/9.0', 'Groente', 29, 1, 13, 0.58, 0, 1, 0, 0),
	('80333136-87f7-4123-9abd-71aa5228952b', 137, 'Olijven groen in water blik/glas', 'g', 113, 0.5, 0.5, 0.9, 11, 4, 1707, 'NEVO-online 2025/9.0', 'Fruit', 61, 1.8, 22, 0.22, 0, 0, 0, 0),
	('408e176c-ff5c-421c-a9e6-ae63ee98490d', 138, 'Bonen snij- blik/glas', 'g', 20, 2.3, 0.4, 1.1, 0.3, 2.1, 156, 'NEVO-online 2025/9.0', 'Groente', 30, 1, 12, 0.2, 0, 2, 0, 0),
	('370f86bf-802e-4be6-8507-c38cf9fcc478', 139, 'Bonen sperzie- blik/glas', 'g', 26, 2.9, 0.8, 1.6, 0.3, 2.6, 162, 'NEVO-online 2025/9.0', 'Groente', 49, 0.5, 12, 0.26, 0, 3, 0, 0),
	('68000de9-6747-41b1-b923-8f27f3486941', 140, 'Spinazie blik/glas', 'g', 31, 1.3, 0.7, 3.2, 0.9, 3, 112, 'NEVO-online 2025/9.0', 'Groente', 200, 1.4, 77, 0.6, 0, 10, 0, 0),
	('149cfb50-7e6c-4988-870d-7c3f9fe8ebea', 141, 'Puree tomaten- geconcentreerd blik', 'g', 87, 15.5, 12.9, 4.5, 0, 3.7, 269, 'NEVO-online 2025/9.0', 'Groente', 49, 2.5, 51, 0.53, 0, 13, 0, 0),
	('341ae7b3-8ec4-4352-b2f9-7ab15f247780', 142, 'Bonen tuin- blik/glas', 'g', 73, 8.5, 2.2, 5.8, 0.6, 5.3, 130, 'NEVO-online 2025/9.0', 'Groente', 47, 0.8, 22, 0.9, 0, 7, 0, 0),
	('56f140f9-728c-484c-84db-f38df29c4d60', 143, 'Wortel blik/glas', 'g', 29, 5.3, 3.8, 0.7, 0.2, 1.8, 153, 'NEVO-online 2025/9.0', 'Groente', 25, 0.2, 5, 0.14, 0, 1, 0, 0),
	('3e7e4f01-96d6-4827-9b1a-dc5e7554937f', 144, 'Ui zilver- zoetzuur glas', 'g', 34, 6.9, 4.8, 0.6, 0.1, 1.4, 335, 'NEVO-online 2025/9.0', 'Groente', 25, 0.6, 5, 0.1, 0, 2, 0, 0),
	('96e49ba0-c4ae-4020-9a9a-e1b5af5bf89b', 145, 'Kool rode blik/glas', 'g', 40, 7.9, 7.5, 0.8, 0.2, 2, 225, 'NEVO-online 2025/9.0', 'Groente', 36, 0.3, 7, 0.13, 0, 13, 0, 0),
	('fc02a9fb-2ca0-4d88-9adf-36cb178c2921', 146, 'Spinazie diepvries gekookt', 'g', 24, 1.7, 0.9, 2.3, 0.4, 2.4, 25, 'NEVO-online 2025/9.0', 'Groente', 162, 1.2, 34, 0.83, 0, 8, 0, 0),
	('28a266ae-c94e-498b-80c4-db72b4edc483', 147, 'Appel z schil gem', 'g', 55, 12, 11.2, 0.2, 0.1, 1.6, 1, 'NEVO-online 2025/9.0', 'Fruit', 3, 0.1, 4, 0.08, 0, 3, 0, 0),
	('127ae810-49f9-4d57-be2c-2419d7390634', 148, 'Aardbeien', 'g', 29, 5.1, 5.1, 0.7, 0, 1.1, 3, 'NEVO-online 2025/9.0', 'Fruit', 15, 0.5, 13, 0.12, 0, 60, 0, 0),
	('77137543-ecae-4613-86d4-a6bf0f34020e', 149, 'Abrikozen m schil', 'g', 44, 8, 8, 0.9, 0.1, 1.7, 0, 'NEVO-online 2025/9.0', 'Fruit', 20, 0.8, 11, 0.1, 0, 5, 0, 0),
	('666c5417-1717-4a9d-a959-24f1541da30b', 150, 'Ananas', 'g', 54, 12, 11.6, 0.5, 0.1, 1.6, 0, 'NEVO-online 2025/9.0', 'Fruit', 12, 0.2, 15, 0.2, 0, 43, 0, 0),
	('0596dc98-58af-471f-ac08-4a7b2e3beafe', 151, 'Banaan', 'g', 92, 20, 15.5, 1.1, 0.3, 1.9, 0, 'NEVO-online 2025/9.0', 'Fruit', 6, 0.3, 28, 0.25, 0, 8, 0, 0),
	('1e7b6dfa-0854-4eb3-9abe-ccb8eb83b5a5', 152, 'Bessen blauwe', 'g', 52, 11, 10, 0.7, 0, 2.4, 1, 'NEVO-online 2025/9.0', 'Fruit', 5, 0.3, 5, 0.2, 0, 10, 0, 0),
	('da6d24d2-e6dd-41a3-8b5a-0feaad117929', 153, 'Bessen rode', 'g', 36, 4.4, 4.4, 1.1, 0, 3.4, 2, 'NEVO-online 2025/9.0', 'Fruit', 20, 1, 13, 0.2, 0, 10, 0, 0),
	('0101caa7-c96e-4856-93b8-80b6f0ec26f0', 154, 'Bessen zwarte', 'g', 53, 8, 7, 0.9, 0, 3.6, 2, 'NEVO-online 2025/9.0', 'Fruit', 30, 1, 17, 0.3, 0, 150, 0, 0),
	('ddccfa93-1a99-45c7-8fe5-62fa86df6792', 155, 'Bessen bos-', 'g', 30, 6, 6, 0.6, 0, 1.8, 1, 'NEVO-online 2025/9.0', 'Fruit', 15, 1, 2, 0.1, 0, 10, 0, 0),
	('c6e11b29-0f4d-4ab5-8d63-563d3127aa67', 156, 'Bessen vossen-', 'g', 57, 8.8, 8.7, 0.8, 1.2, 3.7, 2, 'NEVO-online 2025/9.0', 'Fruit', 15, 0.6, 7, 0.2, 0, 13, 0, 0),
	('a29e4dbd-367e-4a75-9010-1f7e0f47216a', 157, 'Bramen', 'g', 37, 5.1, 5.1, 0.9, 0.2, 3.1, 2, 'NEVO-online 2025/9.0', 'Fruit', 41, 1, 23, 0.2, 0, 12, 0, 0),
	('f6bd9d8e-185b-426f-ba0c-beddaab13af7', 158, 'Citroen', 'g', 36, 3, 2, 0.8, 0.3, 2, 1, 'NEVO-online 2025/9.0', 'Fruit', 10, 0.1, 9, 0.1, 0, 40, 0, 0),
	('a7ac8214-9f46-41ff-b03d-edc3fc7714ac', 159, 'Cranberry vers', 'g', 24, 3.4, 3.4, 0.4, 0.1, 3.6, 1, 'NEVO-online 2025/9.0', 'Fruit', 15, 1, 7, 0.2, 0, 15, 0, 0),
	('3ef7cfc8-1b3b-4e56-9382-5218d5475f1a', 160, 'Druiven m schil gem', 'g', 78, 16.8, 16.3, 0.6, 0.2, 1.8, 3, 'NEVO-online 2025/9.0', 'Fruit', 17, 0.2, 9, 0.2, 0, 2, 0, 0),
	('7614b893-c6df-433d-94f4-1ee9e38548cd', 161, 'Frambozen', 'g', 37, 4.5, 4.5, 1.4, 0.3, 2.5, 3, 'NEVO-online 2025/9.0', 'Fruit', 15, 1.5, 19, 0.3, 0, 32, 0, 0),
	('9e1ac7b6-9924-4659-b2ec-0ca6c5ee6d22', 162, 'Grapefruit', 'g', 37, 6.6, 6.6, 0.9, 0, 1.4, 1, 'NEVO-online 2025/9.0', 'Fruit', 21, 0.1, 10, 0.06, 0, 40, 0, 0),
	('61824e08-0916-4cef-951e-0ffbc9c272c3', 163, 'Kersen zoete', 'g', 57, 11.5, 11.5, 0.9, 0.4, 0.9, 1, 'NEVO-online 2025/9.0', 'Fruit', 20, 0.5, 10, 0.06, 0, 10, 0, 0),
	('4938a839-9e6d-4561-9aa3-04623aeab227', 164, 'Bessen kruis-', 'g', 49, 9, 9, 0.9, 0, 2.4, 3, 'NEVO-online 2025/9.0', 'Fruit', 30, 1, 7, 0.1, 0, 30, 0, 0),
	('dddc1655-5067-4ec0-8ac3-69c1181b13c3', 165, 'Mandarijn', 'g', 46, 9.9, 8.2, 0.7, 0.1, 0.9, 1, 'NEVO-online 2025/9.0', 'Fruit', 25, 0.1, 10, 0.08, 0, 40, 0, 0),
	('94a23b0c-a8c7-48e9-ae6d-2ddcb6a9e62c', 166, 'Meloen net-', 'g', 27, 6, 6, 0.5, 0, 0.4, 15, 'NEVO-online 2025/9.0', 'Fruit', 15, 0.8, 20, 0.16, 0, 12, 0, 0),
	('fb767733-9352-42dd-a447-577ae1af0097', 167, 'Kersen zure', 'g', 52, 11, 11, 1, 0, 2.1, 1, 'NEVO-online 2025/9.0', 'Fruit', 12, 0.4, 10, 0.1, 0, 10, 0, 0),
	('e5261b87-50b8-4257-9a03-5d0c037a238b', 168, 'Peer z schil', 'g', 53, 11.7, 10, 0.3, 0.2, 1.6, 1, 'NEVO-online 2025/9.0', 'Fruit', 5, 0.1, 6, 0.17, 0, 2, 0, 0),
	('3f02c8fe-02de-4377-a95c-b6fa017c5b04', 169, 'Perzik z schil', 'g', 41, 7.9, 7.9, 1, 0, 1.4, 0, 'NEVO-online 2025/9.0', 'Fruit', 4, 0.2, 8, 0.1, 0, 7, 0, 0),
	('315f46e0-17dd-4431-b11a-57bf9e7dac36', 170, 'Pruimen m schil', 'g', 40, 7.3, 7.3, 0.8, 0, 2.2, 0, 'NEVO-online 2025/9.0', 'Fruit', 8, 0.3, 7, 0.09, 0, 5, 0, 0),
	('6bbb0ebf-b080-4a2a-aca7-0b0bf080869c', 171, 'Sinaasappel', 'g', 48, 7.9, 7.7, 0.8, 1, 2, 1, 'NEVO-online 2025/9.0', 'Fruit', 23, 0.1, 10, 0.17, 0, 51, 0, 0),
	('8d96dd2f-d02b-469d-a749-fbf21e1c2cf9', 172, 'Fruit vers citrus- gem', 'g', 48, 8.9, 7.9, 0.8, 0.5, 1.4, 1, 'NEVO-online 2025/9.0', 'Fruit', 24, 0.1, 10, 0.12, 0, 45, 0, 0),
	('78bb8dc4-2977-40ad-8f3b-ec29817c3a7d', 173, 'Fruit vers excl citrus- gem', 'g', 63, 13.5, 11.6, 0.7, 0.2, 1.8, 1, 'NEVO-online 2025/9.0', 'Fruit', 9, 0.3, 14, 0.16, 0, 16, 0, 0),
	('9168c4f0-144c-4c90-ad26-7faa61788231', 174, 'Aardbeien op siroop blik/glas', 'g', 71, 16.9, 16.9, 0.5, 0, 0.9, 9, 'NEVO-online 2025/9.0', 'Fruit', 11, 1.1, 7, 0.1, 0, 29, 0, 0),
	('f1fa0255-6b85-48a8-a44e-43ca997a27e7', 175, 'Abrikozen gedroogd', 'g', 285, 59, 56, 5, 0, 14.4, 25, 'NEVO-online 2025/9.0', 'Fruit', 90, 4, 65, 0.2, 0, 0, 0, 0),
	('d843881e-7a56-440f-bb8c-3c6314edae5b', 176, 'Abrikozen op siroop blik/glas', 'g', 69, 16.1, 16.1, 0.4, 0.1, 1.2, 10, 'NEVO-online 2025/9.0', 'Fruit', 19, 0.2, 5, 0.1, 0, 5, 0, 0),
	('58709e8a-d92b-4306-9aea-74de122cf60c', 177, 'Ananas op siroop blik/glas', 'g', 69, 16.1, 14.8, 0.3, 0.1, 1, 4, 'NEVO-online 2025/9.0', 'Fruit', 10, 0.3, 12, 0.08, 0, 13, 0, 0),
	('6b44abf7-8e71-4c7a-b4fd-91934d729dd5', 178, 'Appeltjes gedroogd', 'g', 292, 65, 51, 2, 0.5, 9.6, 10, 'NEVO-online 2025/9.0', 'Fruit', 50, 1, 16, 0.5, 0, 0, 0, 0),
	('d2ed6d44-9796-4102-83de-e04a06981be8', 179, 'Appelmoes blik/glas', 'g', 76, 17.6, 17.1, 0.2, 0.1, 1.9, 10, 'NEVO-online 2025/9.0', 'Fruit', 4, 0.3, 4, 0.04, 0, 6, 0, 0),
	('d65dc222-8b88-4a6b-8067-85e4fc466d26', 180, 'Bessen bos- op siroop blik/glas', 'g', 66, 15.1, 15.1, 0.3, 0.3, 1, 0, 'NEVO-online 2025/9.0', 'Fruit', 25, 0.5, 5, 0.2, 0, 10, 0, 0),
	('4bbfaca3-806a-4ba1-a77a-3349cd1f9b22', 181, 'Dadels gedroogd', 'g', 305, 70.5, 70.5, 2, 0, 7.5, 10, 'NEVO-online 2025/9.0', 'Fruit', 70, 1.5, 50, 0.3, 0, 0, 0, 0),
	('292db1d7-ed0e-4698-8d92-2103cc6efc8d', 182, 'Frambozen op siroop blik/glas', 'g', 71, 15.7, 15.5, 0.5, 0.3, 1.5, 4, 'NEVO-online 2025/9.0', 'Fruit', 14, 1.7, 11, 0.3, 0, 7, 0, 0),
	('03adaab2-4624-4844-b9a5-e4a8d36e520f', 183, 'Fruitcocktail op siroop blik/glas', 'g', 75, 17.3, 17.3, 0.4, 0, 2, 3, 'NEVO-online 2025/9.0', 'Fruit', 14, 0.3, 5, 0.08, 0, 4, 0, 0),
	('b10cdd2a-3bcd-4f82-91a4-43f4ac140960', 184, 'Kersen op siroop blik/glas', 'g', 63, 14.2, 14.1, 0.6, 0.3, 0.5, 0, 'NEVO-online 2025/9.0', 'Fruit', 15, 0.2, 7, 0.05, 0, 1, 0, 0),
	('ff0ce18f-d787-4712-88a1-a9dad3c1f6ce', 185, 'Krenten gedroogd', 'g', 326, 75, 75, 2, 0, 9, 15, 'NEVO-online 2025/9.0', 'Fruit', 50, 2, 36, 0.23, 0, 0, 0, 0),
	('894da498-9edd-4149-8248-3510dd5ae74c', 186, 'Mandarijnen op siroop blik/glas', 'g', 59, 14, 14, 0.5, 0, 0.3, 6, 'NEVO-online 2025/9.0', 'Fruit', 17, 0.2, 7, 0.12, 0, 15, 0, 0),
	('ff16866c-5e76-4a01-a607-9771bbc0d558', 187, 'Peren gedroogd', 'g', 287, 65, 51, 2, 0, 9.6, 10, 'NEVO-online 2025/9.0', 'Fruit', 100, 1, 35, 0.5, 0, 0, 0, 0),
	('5ef56f7d-08e2-44a8-9b9c-8c9e237dc15b', 188, 'Peren op siroop blik/glas', 'g', 64, 14.7, 14.7, 0.3, 0, 2, 3, 'NEVO-online 2025/9.0', 'Fruit', 14, 0.2, 5, 0.06, 0, 2, 0, 0),
	('00443dd4-61e1-4735-87db-2154182a30b7', 189, 'Perziken op siroop blik/glas', 'g', 62, 14.6, 14, 0.4, 0, 1, 4, 'NEVO-online 2025/9.0', 'Fruit', 3, 0.2, 5, 0.08, 0, 5, 0, 0),
	('2d021c98-137c-45d7-ba7a-73d65556c353', 190, 'Pruimen gedroogd', 'g', 199, 47.9, 38.1, 1.6, 0.4, 5.1, 3, 'NEVO-online 2025/9.0', 'Fruit', 50, 0.4, 30, 0.28, 0, 0, 0, 0),
	('52e4fa81-585e-46fc-8c7a-30db5fbcf68f', 191, 'Pruimen op siroop blik/glas', 'g', 65, 15.5, 15.5, 0.3, 0, 1, 6, 'NEVO-online 2025/9.0', 'Fruit', 9, 0.1, 4, 0.07, 0, 1, 0, 0),
	('d41b050e-1c8c-431f-97d6-d7b14ebd5d6e', 192, 'Tuttifrutti gedroogd', 'g', 256, 56.1, 46.9, 2.7, 0.3, 9, 11, 'NEVO-online 2025/9.0', 'Fruit', 67, 1.6, 38, 0.32, 0, 0, 0, 0),
	('33a663a1-21ca-47c0-85cf-af68ff11236f', 193, 'Vijgen gedroogd', 'g', 259, 54.1, 47.9, 3.3, 0.9, 9.8, 10, 'NEVO-online 2025/9.0', 'Fruit', 162, 2, 68, 0.55, 0, 1, 0, 0),
	('be3e7905-df78-4ade-a3b7-627897ac7ea7', 194, 'Vruchten op siroop gem blik/glas', 'g', 65, 15, 14.7, 0.3, 0.1, 1.5, 3, 'NEVO-online 2025/9.0', 'Fruit', 12, 0.2, 7, 0.07, 0, 5, 0, 0),
	('7513a630-bd90-4695-956b-c35da63e088c', 195, 'Babyvoeding fruit 8 mnd', 'g', 74, 17.1, 13.3, 0.6, 0.1, 1.2, 23, 'NEVO-online 2025/9.0', 'Fruit', 40, 0.3, 10, 0.15, 0, 24, 0, 0),
	('6f6c1bf6-b89b-4954-8186-7c075a227243', 196, 'Kapucijners blik/glas', 'g', 108, 14.8, 0.3, 7.1, 0.8, 6.5, 113, 'NEVO-online 2025/9.0', 'Peulvruchten', 32, 1.2, 27, 0.85, 0, 0, 0, 0),
	('156f6f4c-bc72-4b71-886a-d73d6e9b7403', 197, 'Bonen witte in tomatensaus blik/glas', 'g', 101, 15.2, 3.6, 5.7, 0.6, 6.1, 246, 'NEVO-online 2025/9.0', 'Peulvruchten', 56, 1.6, 37, 0.64, 0, 0, 0, 0),
	('b25afcbf-843f-4346-8258-d42ccba8cdbc', 198, 'Noten amandelen z vliesje ongezouten', 'g', 631, 7.1, 3.8, 21.7, 55.8, 7, 5, 'NEVO-online 2025/9.0', 'Noten en zaden', 283, 3.3, 305, 3.1, 0, 0, 0, 0),
	('f7f8e288-b1ee-42c5-b93b-9a590e77d1ad', 199, 'Noten cashew- ongezouten', 'g', 615, 20.8, 5, 21.2, 48.9, 3.8, 10, 'NEVO-online 2025/9.0', 'Noten en zaden', 44, 6.7, 269, 5.8, 0, 0, 0, 0),
	('ea774c4e-bc19-4b19-a9bb-0b31229cb23f', 200, 'Noten hazel- ongezouten', 'g', 670, 4.8, 4.3, 16.4, 63, 9, 1, 'NEVO-online 2025/9.0', 'Noten en zaden', 160, 3.6, 160, 2.25, 0, 4, 0, 0),
	('ec2b80b1-4721-4742-95bb-91764aa4b2f0', 201, 'Kastanje rauw', 'g', 189, 35, 6, 4, 2.7, 4.1, 5, 'NEVO-online 2025/9.0', 'Noten en zaden', 40, 1, 45, 0.5, 0, 0, 0, 0),
	('3b824247-9c82-4625-b461-336462b88204', 202, 'Kokosnootvlees', 'g', 406, 3, 1, 4, 40, 9, 25, 'NEVO-online 2025/9.0', 'Fruit', 20, 2, 32, 1.1, 0, 0, 0, 0),
	('40b69d47-5cbb-47e8-a9f7-e4b4333e73fd', 203, 'Noten para- ongezouten', 'g', 687, 2.6, 2.3, 14.3, 67.1, 7.5, 1, 'NEVO-online 2025/9.0', 'Noten en zaden', 160, 3.1, 350, 4.06, 0, 1, 0, 0),
	('6f7c3f57-e9eb-44f5-b719-68679a884506', 204, 'Pinda''s ongezouten', 'g', 627, 11.8, 4.8, 25.2, 51.7, 6.8, 0, 'NEVO-online 2025/9.0', 'Noten en zaden', 56, 1.9, 216, 3.3, 0, 0, 0, 0),
	('9dd180a7-0d5d-461e-abbb-1f750c1d5ef7', 205, 'Studentenhaver', 'g', 496, 38, 36.1, 11, 32.1, 5.6, 13, 'NEVO-online 2025/9.0', 'Noten en zaden', 115, 2.7, 155, 1.72, 0, 1, 0, 0),
	('b5a4bb62-78fa-4305-a825-459dc1d50375', 206, 'Noten wal- ongezouten', 'g', 706, 5.1, 2.9, 15.9, 68.1, 4.6, 0, 'NEVO-online 2025/9.0', 'Noten en zaden', 117, 3.4, 196, 3.4, 0, 0, 0, 0),
	('1d8d93ad-2895-4008-adee-f9e4092152ec', 207, 'Noten gemengd ongezouten', 'g', 658, 8.9, 4, 18.1, 59.6, 6.7, 4, 'NEVO-online 2025/9.0', 'Noten en zaden', 151, 4, 231, 3.69, 0, 1, 0, 0),
	('644322e3-f078-42bb-81f0-bddb9f2c86e6', 208, 'Meel boekweit-', 'g', 344, 64.5, 1.4, 12.8, 2.8, 4.7, 0, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 15, 2.3, 190, 1.4, 0, 0, 0, 0),
	('99b148d9-7369-4afb-9dec-7f9468dae8c3', 209, 'Ontbijtproduct Cornflakes Kellogg''s', 'g', 378, 84, 8, 7, 0.9, 3, 440, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 5, 8, 10, 0.2, 8.4, 0, 0, 0),
	('cd8f0db5-3fe9-432e-a197-06a161129b6d', 210, 'Custardpoeder', 'g', 352, 86, 0.1, 0.4, 0.7, 0, 480, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 9, 0.1, 3, 0.02, 0, 0, 0, 0),
	('3dcced6e-1f5f-4279-9d9e-ba9a58bd2c05', 212, 'Gort parel- rauw', 'g', 335, 63.5, 1.4, 9.1, 2, 13.4, 2, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 23, 1.9, 71, 2, 0, 0, 0, 0),
	('a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 213, 'Vlokken haver-', 'g', 366, 59.2, 0.8, 12.8, 6.2, 11.1, 2, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 49, 3.5, 120, 2.5, 0, 0, 0, 0.04),
	('7e60ed9a-22bc-49da-9332-412c787ef396', 215, 'Maizena', 'g', 354, 86.9, 0, 0.3, 0.4, 0.8, 13, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 9, 0.1, 3, 0.02, 0, 0, 0, 0),
	('d028cbf9-68ca-4132-92f6-e396b19b1354', 216, 'Puddingpoeder voor kookpudding', 'g', 374, 93, 52, 0.2, 0.1, 0.4, 220, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 4, 0.1, 2, 0.02, 0, 0, 0, 0),
	('8f87809b-4876-4e0e-af26-1b65771f7070', 217, 'Bloem rogge-', 'g', 332, 69, 0.6, 5.8, 1.2, 11, 0, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 20, 0.9, 30, 0.9, 0, 0, 0, 0),
	('1ce0d2d4-92a0-4105-90e6-42b6dc456f9d', 218, 'Meel rogge-', 'g', 314, 56.6, 1.2, 9.1, 1.5, 19, 0, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 37, 2.5, 101, 2.5, 0, 0, 0, 0),
	('2dfe03ec-f212-4318-82b4-150a2743cdbb', 219, 'Tapioca parels droog', 'g', 354, 87.8, 0, 0.2, 0, 0.9, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 20, 1.6, 1, 0.12, 0, 0, NULL, NULL),
	('fd6dcd0c-06f8-412b-8324-31ea3989c6d4', 220, 'Bloem tarwe-', 'g', 345, 71.3, 0.6, 10.2, 1.2, 4.2, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 18, 1, 21, 0.55, 0, 0, 0, 0),
	('1c031257-3d58-42f7-aa4a-8c8e3290b5a3', 222, 'Meel tarwe- volkoren', 'g', 344, 65.3, 1.1, 11.6, 1.7, 10.4, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 28, 2.8, 88, 1.9, 0, 1, 0, 0),
	('56216a35-8902-434f-8c00-4dda8a69de65', 223, 'Bindmiddel gem', 'g', 344, 71.7, 0.6, 9.8, 1.1, 4, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 18, 1, 20, 0.53, 0, 0, 0, 0),
	('b923ce10-235f-488f-b50a-8f3f93b3c2bd', 224, 'Ontbijtproduct Olvarit pap fijne granen 6+ mnd', 'g', 367, 69.6, 1.3, 12.4, 2.1, 10, 4, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 28, 2.8, 110, 2.2, 0, 1, 0, 0),
	('dcc68bc1-55e0-4a9c-bf4c-de2e7423b838', 225, 'Volkoren graanontbijt', 'g', 349, 64, 4.6, 14, 1.9, 10, 208, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 40, 3.9, 96, 2.7, 0, 0, 0, 0),
	('c7633458-63ae-41ac-a04b-86bcb0e76da9', 226, 'Aardappelzetmeel', 'g', 327, 81.1, 0, 0.3, 0.2, 0, 4, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 5, 0.4, 4, 0.02, 0, 0, 0, 0),
	('9b2c332d-ef51-4d19-b1b5-f250e8efdd80', 227, 'Beschuit naturel', 'g', 408, 76.1, 12.2, 14.1, 4.7, 2.8, 203, 'NEVO-online 2025/9.0', 'Brood', 26, 1.8, 25, 0.9, 0, 0, 0, 0),
	('9a60995f-6953-48a0-bd8e-03b6ae951b3b', 228, 'Cracker cream-', 'g', 448, 68.8, 1.5, 9.1, 14.5, 3, 413, 'NEVO-online 2025/9.0', 'Brood', 110, 1.7, 25, 0.7, 0, 0, 0, 0),
	('d14d0762-0163-4ad5-b8f7-d2425b439b4b', 229, 'Knackebrod gem', 'g', 376, 63.6, 3.3, 11.6, 5.6, 12.7, 412, 'NEVO-online 2025/9.0', 'Brood', 73, 3.2, 93, 2.52, 0, 0, 0, 0),
	('26b4752b-e751-47fb-9b57-3d77408e2879', 230, 'Tarwebroodje wit zacht', 'g', 262, 46.1, 3.3, 9.7, 3.5, 3.7, 431, 'NEVO-online 2025/9.0', 'Brood', 42, 0.9, 22, 0.71, 0, 0, 0, 0),
	('26414024-9e56-4c9a-8608-ac7d41d74ed2', 231, 'Kiemen tarwe-', 'g', 346, 27.8, 10, 29.2, 9.5, 16.3, 7, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 54, 8.9, 250, 14, 0, 0, 0, 0),
	('0353ba11-09a9-462d-8308-dbbf78254488', 232, 'Broodje koffie-', 'g', 349, 48.4, 27.7, 5.8, 14.1, 2.7, 300, 'NEVO-online 2025/9.0', 'Gebak en koek', 20, 1.5, 27, 0.63, 0, 0, 0, 0),
	('d9986270-40ad-40e0-bd90-bf1f3cfa35c5', 233, 'Tarwekrentenbrood wit', 'g', 273, 53.3, 23.8, 7.8, 2.4, 3.3, 354, 'NEVO-online 2025/9.0', 'Brood', 56, 1.5, 27, 0.63, 0, 0, 0, 0);
INSERT INTO public.nutrition_foods VALUES
	('32608ce8-420e-4615-8c23-e384c4931e4a', 234, 'Biscuit baby- Liga Baby 6-12 mnd', 'g', 394, 73.5, 22, 6.5, 7.6, 2.9, 214, 'NEVO-online 2025/9.0', 'Gebak en koek', 48, 1, 20, 0.8, 0, 0, 0, 0),
	('30417961-d4ca-4d32-8ff7-1effd79350ed', 235, 'Biscuit dreumes- Liga Kind 12-36 mnd', 'g', 411, 71, 23, 8.5, 9.4, 4.2, 160, 'NEVO-online 2025/9.0', 'Gebak en koek', 240, 1, 45, 0.8, 0.1, 0, 0, 0),
	('82c22535-d308-47f8-b2d3-3445928449b9', 236, 'Tarwebrood bruin', 'g', 239, 43.3, 1.9, 9.9, 1.8, 4.9, 406, 'NEVO-online 2025/9.0', 'Brood', 30, 1.4, 44, 1, 0, 0, 0, 0),
	('c2868982-3319-4238-93f1-3d37d856195e', 238, 'Cracker Matzes', 'g', 376, 78.8, 0.4, 11, 1, 4, 2, 'NEVO-online 2025/9.0', 'Brood', 15, 2, 25, 0.6, 0, 0, 0, 0),
	('e47fe418-a55d-4269-9e78-c2f123db13b2', 240, 'Koek ontbijt-', 'g', 308, 69.5, 37.3, 3, 1.2, 3.6, 232, 'NEVO-online 2025/9.0', 'Gebak en koek', 17, 0.7, 16, 0.65, 0.1, 0, 0, 0),
	('d76ab1c7-48a1-46b3-b2a1-4140278e7a58', 241, 'Tarwebrood wit melk', 'g', 257, 47.9, 2.9, 9.6, 2.4, 2.6, 408, 'NEVO-online 2025/9.0', 'Brood', 119, 0.9, 23, 0.58, 0, 0, 0, 0),
	('e5b35afd-836d-493e-89ae-2846ff348ee4', 242, 'Roggebrood volkoren', 'g', 193, 35.6, 8.2, 5.6, 1.3, 8.3, 293, 'NEVO-online 2025/9.0', 'Brood', 33, 2.7, 57, 1.5, 0, 0, 0, 0),
	('510f1354-a446-4033-abf2-73e0d8c68ef6', 243, 'Roggetarwebrood bruin', 'g', 233, 42.8, 2.7, 8.2, 1.5, 7.7, 351, 'NEVO-online 2025/9.0', 'Brood', 34, 2, 55, 1.43, 0, 0, 0, 0),
	('2d30f4cc-48c1-4609-b456-bc3336a55362', 244, 'Tarwerozijnenbrood wit', 'g', 272, 52.2, 24.3, 7.7, 2.7, 4, 347, 'NEVO-online 2025/9.0', 'Brood', 50, 1.7, 27, 0.61, 0, 0, 0, 0),
	('15abaec4-e4d8-407f-964a-839ace070857', 246, 'Tarwebrood volkoren gem v fijn en grof', 'g', 235, 39, 1.9, 11.1, 2.3, 6.7, 383, 'NEVO-online 2025/9.0', 'Brood', 35, 2, 66, 1.41, 0, 0, 0, 0),
	('a2318e41-7498-4c47-ad3f-8127d7e52d00', 248, 'Tarwebrood wit water', 'g', 248, 48.1, 2.2, 9, 1.6, 2.6, 408, 'NEVO-online 2025/9.0', 'Brood', 29, 0.8, 19, 0.6, 0, 0, 0, 0),
	('4fb1a882-559b-4c69-87e3-628924873711', 249, 'Tarwemoutbrood bruin', 'g', 249, 46.6, 2.9, 9.4, 1.9, 4, 392, 'NEVO-online 2025/9.0', 'Brood', 49, 1.5, 32, 1, 0, 0, 0, 0),
	('caedf305-fb92-4649-88f6-9277f4a80f0c', 250, 'Broodje amandel- (v bladerdeeg)', 'g', 393, 38.6, 23.7, 6.9, 23, 2, 207, 'NEVO-online 2025/9.0', 'Gebak en koek', 61, 1, 58, 0.79, 1.3, 1, 0, 0),
	('ce2e5655-efca-4224-800c-047b3baa44b2', 251, 'Taart appel- v zandtaartdeeg z roomboter', 'g', 226, 31.9, 20.8, 3.4, 9, 1.6, 113, 'NEVO-online 2025/9.0', 'Gebak en koek', 23, 1, 13, 0.28, 0.9, 2, 0, 0),
	('35662085-f276-4c35-9730-171035da792f', 252, 'Biscuit', 'g', 437, 75.5, 18.6, 7.6, 11, 2.5, 402, 'NEVO-online 2025/9.0', 'Gebak en koek', 48, 1, 20, 0.59, 0, 0, 0.01, 0),
	('2ca9f298-dd5c-469f-bcea-95e3ff6ce3ae', 253, 'Cake z roomboter', 'g', 397, 42.8, 25.1, 5.6, 22.3, 1, 413, 'NEVO-online 2025/9.0', 'Gebak en koek', 21, 0.9, 10, 0.55, 2.3, 0, 0.01, 0),
	('6ab8b0fa-ca37-4b71-a68c-7b50dc28d2db', 254, 'Koek eier-', 'g', 307, 66.8, 38.2, 5.9, 1.4, 1.6, 90, 'NEVO-online 2025/9.0', 'Gebak en koek', 37, 0.7, 13, 0.47, 0.2, 0, 0, 0),
	('8f53cfab-71a5-417d-b03a-9fb7d4b74add', 255, 'Taart slagroom-', 'g', 316, 31.4, 23.1, 4.6, 18.9, 0.8, 60, 'NEVO-online 2025/9.0', 'Gebak en koek', 56, 0.6, 12, 0.44, 0.4, 0, 0, 0),
	('5454d4fc-cf55-47c1-9910-796539c26593', 256, 'Taart creme au beurre-', 'g', 431, 44, 35.9, 3.6, 26.6, 0.4, 87, 'NEVO-online 2025/9.0', 'Gebak en koek', 23, 0.6, 7, 0.42, 0.4, 0, 0.03, 0),
	('3ea13bdf-afcb-4c62-a113-3ba4d9c026b6', 257, 'Koek gevulde gem', 'g', 411, 59.9, 31.8, 6.4, 15.8, 2, 150, 'NEVO-online 2025/9.0', 'Gebak en koek', 39, 0.9, 28, 0.54, 0.1, 0, 0.01, 0),
	('ad146dc3-2014-4b20-8fda-6bf8f4105e29', 258, 'Koekje gem', 'g', 475, 65.2, 31.5, 5.7, 20.7, 2.6, 282, 'NEVO-online 2025/9.0', 'Gebak en koek', 41, 1.3, 26, 0.62, 0.2, 0, 0.01, 0),
	('6ad08600-6d6f-4db1-a001-253905782e43', 259, 'Kokosmakronen', 'g', 455, 59, 53.1, 4, 21.2, 5.9, 55, 'NEVO-online 2025/9.0', 'Gebak en koek', 10, 0.7, 41, 0.4, 0, 0, 0, 0),
	('4c40dd23-6c3a-4dbf-826e-8347fb9799fa', 260, 'Lange vingers', 'g', 402, 84.8, 53.1, 7.2, 3.5, 1, 69, 'NEVO-online 2025/9.0', 'Gebak en koek', 40, 2, 17, 0.6, 0.5, 0, 0, 0),
	('2d8cc175-de3a-4ce5-945c-0216b10a94a6', 261, 'Speculaas gem', 'g', 469, 65.1, 27.5, 5, 20.3, 3, 351, 'NEVO-online 2025/9.0', 'Gebak en koek', 35, 1.2, 13, 0.44, 0.2, 0, 0, 0),
	('463610be-44ac-49cb-9b5f-6c3e22181c03', 262, 'Sprits m roomboter', 'g', 493, 50.5, 21.2, 4.8, 29.8, 1.7, 165, 'NEVO-online 2025/9.0', 'Gebak en koek', 17, 0.6, 10, 0.35, 0.2, 0, 0.03, 0),
	('a630e3b4-b38d-4dc2-92cd-237e11b9bc31', 263, 'Biscuit tarwe-/volkoren-', 'g', 459, 70.7, 21.6, 7.8, 14.9, 5.5, 338, 'NEVO-online 2025/9.0', 'Gebak en koek', 30, 1.8, 64, 1.35, 0, 0, 0.01, 0),
	('9ee30bf8-5a88-4030-84ec-f6c2a1f86bee', 264, 'Biscuit zoute', 'g', 472, 56.7, 6.9, 8.1, 23, 2.6, 892, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 38, 1.6, 24, 0.59, 0, 0, 0, 0.01),
	('e20e50f2-6fe2-468c-bc9f-f19fec95096d', 265, 'Bladerdeeg z roomboter, bereid', 'g', 499, 46.3, 0.3, 7.9, 31, 1.8, 627, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 19, 0.6, 12, 0.3, 0, 0, 0, 0.01),
	('7d8dcd9a-f6f5-4351-adb6-d764d107d5de', 266, 'Broodje saucijzen-', 'g', 356, 28.5, 0.5, 7.2, 23.4, 1.4, 625, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 13, 1.1, 17, 2.17, 0.4, 5, 0, 0),
	('7dbdb105-8048-4fbe-9f3c-b2cdadf78036', 267, 'Pepsels', 'g', 382, 69.5, 3.3, 11.9, 5.3, 4.2, 1660, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 36, 1, 21, 0.55, 0, 0, 0, 0),
	('bad101c3-cfcc-4ebe-893d-a91f162cde8e', 269, 'Kroepoek naturel', 'g', 516, 62, 7.5, 3.5, 28, 1, 984, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 25, 3.4, 18, NULL, 0, 0, 0, 0),
	('897353c4-d49a-4d54-a15b-1a32eb6cc101', 270, 'Melk rauwe', 'g', 71, 4.4, 4.4, 3.4, 4.4, 0, 39, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 123, 0, 12, 0.37, 0, 0, 0, 0),
	('def9b861-1869-4c35-a8aa-ac896962fc07', 271, 'Melk koffie- Becel', 'g', 112, 11, 11, 7.1, 4.4, 0, 124, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 247, 0, 24, 0.85, 0, 0, NULL, NULL),
	('b51f00ce-595b-4240-b37c-b2c02fc30690', 272, 'Melk chocolade- volle', 'g', 82, 10.7, 10.5, 3.3, 2.8, 0.5, 45, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 100, 0.6, 19, 0.46, 0, 2, 0, 0),
	('c48eccc6-bc9d-4639-948e-352a453c60c4', 273, 'Melk chocolade- magere', 'g', 62, 11.4, 11.4, 3.3, 0.3, 0.5, 51, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 98, 0.2, 18, 0.46, 0, 1, 0, 0),
	('f9fcb187-f0c9-4f0b-9c26-323317d49744', 274, 'Creamer koffie-', 'g', 560, 58.4, 9.6, 2.1, 35.3, 0, 333, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 2, 0.2, 0, 0.15, 0, 0, 0, 0),
	('938d634c-567c-4375-9873-65f5011b26d8', 276, 'Vla chocolade- volle', 'g', 88, 13.4, 8.2, 2.4, 2.6, 0.8, 50, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 80, 0.8, 17, 0.46, 0, 0, 0, 0),
	('a75dcdbf-5af9-4c3f-b7b6-322f25b77139', 278, 'Yoghurt volle', 'g', 56, 3.4, 2.4, 3.8, 2.7, 0, 39, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 145, 0, 12, 0.5, 0, 0, 0, 0),
	('a35083cd-1926-4988-b82c-7694bcd66332', 279, 'Melk volle', 'g', 61, 4.5, 4.5, 3.3, 3.4, 0, 42, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 124, 0, 12, 0.46, 0, 0, 0, 0),
	('02647fde-e7d8-4336-a395-b1c89061d0a5', 280, 'Melk koffie- volle', 'g', 145, 11.4, 11.4, 7.5, 7.7, 0, 125, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 271, 0.1, 29, 0.99, 0, 1, 0.01, 0),
	('198c3af6-7e97-4adf-bb73-6653eaebb570', 281, 'Melk gecondenseerde m suiker', 'g', 330, 54.7, 54.7, 8.1, 8.8, 0, 99, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 290, 0.2, 29, 1, 0, 4, 0.01, 0),
	('0b06a36c-0a83-431d-8bc8-d53154ff672d', 282, 'Vla vanille- volle', 'g', 86, 12.8, 8.1, 2.3, 2.8, 0.4, 52, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 89, 0, 9, 0.3, 0, 0, 0, 0),
	('f044a9fb-3767-4486-bfbd-d8747f10bbcc', 284, 'Yoghurt vruchten- magere', 'g', 67, 12.4, 10.7, 3, 0.2, 0.6, 35, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 113, 0, 11, 0.39, 0, 0, 0, 0),
	('4425644e-b636-4061-9842-84912e7ff35a', 285, 'Melk koffie- halfvolle', 'g', 110, 11.2, 11.2, 7, 4.1, 0, 129, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 211, 0.1, 21, 0.65, 0, 1, 0, 0),
	('65ff7454-59bc-41df-b1d1-e9ce05936a35', 286, 'Melk halfvolle', 'g', 45, 4.7, 4.7, 3.4, 1.4, 0, 42, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 123, 0, 12, 0.41, 0, 1, 0, 0),
	('1f98acae-cbfe-45d8-a48b-34bab317cfc5', 288, 'Pap havermout- bereid m volle melk ongezoet', 'g', 94, 10.3, 4.1, 4.3, 3.7, 1.2, 37, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 116, 0.4, 24, 0.68, 0, 0, 0, 0.01),
	('b8804b7d-934c-45ea-89e9-0421139d0443', 289, 'Melk karne-', 'g', 30, 3.6, 3.6, 3, 0.2, 0, 36, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 109, 0, 10, 0.41, 0, 0, 0, 0),
	('50c25701-5edb-479b-9761-85e7a48c7379', 290, 'Pap karnemelkse bloem-', 'g', 52, 7.8, 3.1, 3.7, 0.5, 0.1, 41, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 99, 0, 10, 0.31, 0, 1, 0, 0),
	('961d2e5c-33b5-45e0-bc0e-02af65ca9090', 291, 'Topping m suiker poeder Klop-Klop', 'g', 535, 63.4, 53.3, 4.4, 29.3, 0, 52, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0),
	('3657ece7-e5d1-421d-b2e1-a2f600a48369', 292, 'Melk koffie- magere', 'g', 57, 4.3, 4.3, 9.9, 0, 0, 37, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 280, 0, 18, 0.98, 0, 3, 0, 0),
	('b28af6a6-ef14-440b-9e4b-36e7b1951efc', 293, 'Room koffie-', 'g', 210, 3.8, 3.8, 3.3, 20.2, 0, 63, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 97, 0, 9, 0.36, 0.1, 0, 0.01, 0),
	('aea3ae97-6837-4b3b-bae5-35db7c5488b2', 294, 'Melk magere', 'g', 35, 4.9, 4.9, 3.7, 0.1, 0, 44, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 126, 0, 12, 0.46, 0, 0, 0, 0),
	('c7cd789e-d024-4ba2-9f91-51b9f6a000d2', 295, 'Melkpoeder magere', 'g', 349, 50.5, 50.5, 35.4, 0.6, 0, 500, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 1130, 0.2, 113, 3.75, 0, 7, 0, 0),
	('e56d733f-db32-44cb-889b-fe1de247f961', 296, 'Melkpoeder volle', 'g', 478, 37, 37, 23.9, 26, 0, 290, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 846, 0.2, 83, 2.8, 0.1, 9, 0.02, 0),
	('401d332d-73e4-4155-ba61-d35e257da6db', 297, 'Melk moeder-', 'g', 66, 7.4, 7.4, 1.1, 3.5, 0, 20, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 28, 0.1, 4, 0.4, 0.1, 6, 0, 0.01),
	('26213428-7ea1-4daa-9cbd-06a1ecf1ba82', 298, 'Pap rijste-', 'g', 86, 12, 3.9, 3.1, 2.9, 0.1, 76, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 103, 0.1, 12, 0.41, 0, 1, 0, 0),
	('9093d0ca-8078-45dc-b1e8-a32b1b77c7c4', 299, 'Room slag- onbereid', 'g', 339, 3.1, 3.1, 2.3, 35.3, 0, 36, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 78, 0, 8, 0.18, 0.1, 1, 0.02, 0),
	('9c6bb0a3-d77e-4e89-892a-ac713808bca3', 300, 'Yoghurt Bulgaarse volle', 'g', 77, 4.5, 4.5, 4.5, 4.3, 0, 56, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 150, 0, 12, 0.5, 0, 0, 0, 0),
	('48e78c63-b415-4965-87d8-1ba663190bcd', 301, 'Yoghurt magere', 'g', 37, 4, 4, 4.1, 0.2, 0, 43, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 152, 0, 13, 0.61, 0, 1, 0, 0),
	('00226e96-5efb-4223-a18d-a3abfbfef0d4', 303, 'IJs room/vanille- gem', 'g', 216, 25.3, 20.1, 2.9, 11.3, 0.5, 49, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 94, 0.1, 11, 0.26, 0, 0, 0, 0),
	('6f195f5a-856c-4dc7-b09c-a3256343c6b1', 304, 'Kaas strooi- Zwitserse', 'g', 228, 0, 0, 55, 0.7, 0, 3200, 'NEVO-online 2025/9.0', 'Kaas', 800, 0.2, NULL, 3.9, 0.1, 0, 0, 0),
	('4c825261-f67d-4d51-b1a3-f200345460c8', 305, 'Kwark magere', 'g', 51, 3.8, 3.1, 8.4, 0, 0, 37, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 139, 0, 12, 0.57, 0, 0, 0, 0),
	('c83c816e-891c-4e92-bd1b-5eb38ab59355', 306, 'Kwark halfvolle', 'g', 77, 4, 4, 7.5, 3.2, 0, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 137, 0, 12, 0.55, 0.1, 0, 0, 0),
	('9cf00794-dda9-4391-a123-3580bd7debb8', 307, 'Kwark volle', 'g', 118, 3.6, 2.8, 7.5, 8, 0, 35, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 134, 0, 11, 0.53, 0.1, 0, 0.01, 0),
	('124a5452-a19a-4413-85cd-3835c359440d', 308, 'Olie arachide-', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, 0, 0),
	('92816d62-02fe-4ad7-a476-f440b6cb14e8', 310, 'Boter ongezouten', 'g', 737, 1.1, 1.1, 0.7, 81.2, 0, 5, 'NEVO-online 2025/9.0', 'Vetten en oliën', 17, 0.1, 2, 0.09, 0.3, 0, 0.08, 0),
	('54011d4f-3b6a-4fdb-8ac3-5e0c5e035ba8', 313, 'Olie soja-', 'g', 894, 0, 0, 0.3, 99.2, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 4, 0, 0, 0, 0, 0, 0, 0),
	('d37febeb-bb5f-48f9-9575-44d262305b75', 314, 'Vet varkens- uitgesmolten', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0.5, 1.5, 0, 0, 0),
	('bf8dcb47-7161-496f-9b01-1abf7077b3a2', 315, 'Vet rund- uitgesmolten', 'g', 891, 0, 0, 0, 99, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0.76, 0, 0, 0, 0),
	('433559fa-d29e-41aa-bb77-05f6a6af6ba0', 317, 'Olie zonnebloem-', 'g', 897, 0, 0, 0.3, 99.5, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, 0, 0),
	('6f28e60b-a7c4-4e80-8026-aea5776a8baf', 319, 'Cornedbeef', 'g', 208, 0.9, 0.9, 24.3, 11.9, 0, 802, 'NEVO-online 2025/9.0', 'Vleeswaren', 10, 4, 15, 5.5, 0.5, 0, 0.01, 0),
	('beb62133-0629-46a9-8671-d5bf3f135dc6', 320, 'Fazant rauw', 'g', 223, 0, 0, 31, 11, 0, 100, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 50, 8, NULL, NULL, NULL, 0, 0, 0),
	('6b40eed8-31af-4d57-9a6d-6346ecc87af8', 322, 'Frikandel bereid m vloeibaar frituurvet', 'g', 251, 6.7, 0.9, 13.8, 18.4, 1.8, 1012, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 108, 2.1, 28, 1.5, 0.4, 1, 0, 0.01),
	('3ced76fa-8b59-4170-9abf-5fe7c23537a8', 324, 'Worst rook- gekookt gem', 'g', 304, 2.6, 0.3, 14.1, 26.3, 0.5, 868, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 22, 1.3, 16, 2.45, 0.4, 25, 0.01, 0),
	('9c106505-4593-42c4-8b00-a171011eba2a', 326, 'Kroket vlees- bereid m vloeibaar frituurvet', 'g', 272, 20.9, 2.6, 8.9, 16.6, 1.9, 545, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 15, 1.2, 17, 1.2, 0, 0, 0, 0),
	('f8ca3ad4-5318-4dba-9667-702272ae929d', 328, 'Ham rauwe', 'g', 188, 1.2, 0.3, 24.6, 9.5, 0, 1917, 'NEVO-online 2025/9.0', 'Vleeswaren', 5, 0.9, 29, 2.3, 0.4, 4, 0.01, 0),
	('1d7f9164-4324-487e-8c62-4909938a4c88', 330, 'Kalkoen rauw', 'g', 141, 0, 0, 21.8, 6, 0, 66, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 2, 26, 1.94, 0.5, 3, 0, 0),
	('b88ce1ee-e639-436a-8545-70e1bf918a53', 333, 'Lever runder- gekookt (vleeswaar)', 'g', 133, 2, 0, 20, 5, 0, 906, 'NEVO-online 2025/9.0', 'Vleeswaren', 10, 8.1, 19, 0.5, 4.3, 15, 0.01, 0.01),
	('78d4020d-3def-435b-b5a2-0f7b6d7356c3', 334, 'Lever varkens- gekookt (vleeswaar)', 'g', 132, 3.9, 4, 19.8, 4.1, 0, 1325, 'NEVO-online 2025/9.0', 'Vleeswaren', 10, 23.3, 21, 0.67, 1.5, 15, 0, 0),
	('dc88e533-aa8a-40f2-ae19-eb9abb3e2e52', 335, 'Pastei lever-', 'g', 318, 1.7, 0.1, 14.2, 28.3, 0, 800, 'NEVO-online 2025/9.0', 'Vleeswaren', 12, 3.5, 9, 1.5, 0.9, 0, 0, 0),
	('85b8d701-7b10-485f-8c6c-5be2a47ec0be', 336, 'Luncheon meat blik', 'g', 279, 3.3, 0, 12.9, 23.8, 0.2, 920, 'NEVO-online 2025/9.0', 'Vleeswaren', 39, 1, 10, 1.5, 0.7, 27, 0, 0.01),
	('559c069a-69d3-4a9e-ad11-553a93de6cd0', 337, 'Patrijs rauw', 'g', 248, 0, 0, 35, 12, 0, 100, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 45, 8, NULL, NULL, NULL, 0, 0, 0),
	('2430d02f-cdfe-4e86-831f-ab7d5267d295', 338, 'Pekelvlees', 'g', 184, 0.1, 0.1, 17.3, 12.7, 0, 1200, 'NEVO-online 2025/9.0', 'Vleeswaren', 10, 4, NULL, NULL, 0.4, 0, 0.01, 0),
	('42b9ffd2-612f-460f-b779-aa03ed808b47', 339, 'Ree wild rauw', 'g', 122, 0, 0, 22.4, 3.6, 0, 84, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 20, 3, 25, 2.4, 0.4, 0, NULL, NULL),
	('88de5a94-eee9-494b-9a2c-525ed0493219', 340, 'Runderrookvlees', 'g', 108, 0.5, 0.5, 22, 2, 0, 1800, 'NEVO-online 2025/9.0', 'Vleeswaren', 5, 2.5, 21, 3.3, 0.1, 0, 0, 0),
	('34697b5b-6092-40ae-9bc4-5f91e82c5784', 343, 'Spek rook- vet rauw', 'g', 678, 0, 0, 5, 73.2, 0, 1176, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 3, 0.4, 2, 0.31, 2.6, 0, 0, 0),
	('4e98bbb2-41b5-40fa-8750-df57c19d25b1', 344, 'Vleeswaren gem', 'g', 239, 2.7, 0.8, 16.6, 17.9, 0.2, 991, 'NEVO-online 2025/9.0', 'Vleeswaren', 16, 1.9, 17, 2.34, 0.6, 14, 0.01, 0),
	('28001082-f938-4b1e-be6d-c1deadfd639f', 347, 'Bokking gerookt', 'g', 242, 0.3, 0.3, 20.8, 17.5, 0, 1625, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 100, 0.8, 32, 0.87, 8.9, 0, 0.9, 1),
	('837dc1b2-4781-42c1-8e56-fc61d5e4ae5c', 348, 'Garnalen Hollandse gekookt', 'g', 94, 0.1, 0.1, 19.8, 1.6, 0, 953, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 134, 0.2, 35, 1.8, 0.1, 0, 0.23, 0.16),
	('6e0a7d25-6a55-4162-9b5e-0d95c26d548f', 349, 'Haringfilet in tomatensaus blik', 'g', 201, 5.4, 4.5, 12, 14.6, 0.5, 454, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 64, 1.4, 23, 0.53, 6.2, 4, 1.15, 1.41),
	('2ee5f36b-2392-4dcb-83b6-4f3232946ce5', 350, 'Haring gezouten', 'g', 172, 2.8, 0, 17.6, 10.1, 0, 1097, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 51, 1.4, 40, 0.73, 6.2, 0, 0.33, 0.42),
	('cbc8c403-f430-413c-9f98-2cea5b04d556', 351, 'Krab in water blik', 'g', 85, 0, 0, 18.1, 1.4, 0, 691, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 120, 2.8, 32, 5.7, 0, 0, 0.19, 0.14),
	('61f33438-e134-4ccd-87c8-e721ff5f79f9', 352, 'Kreeft gekookt', 'g', 86, 0, 0, 19.7, 0.8, 0, 216, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 125, 1.7, 53, 1.4, 0, 0, 0.15, 0.11),
	('31f72488-1220-4f67-89ee-5d6a920c11d3', 353, 'Makreel rauw', 'g', 233, 0, 0, 18, 17.9, 0, 85, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 20, 1, 37, 0.5, 8, 0, 0.85, 1.67),
	('f0debdb6-ff0c-41be-8f0d-ddb3b829b506', 354, 'Oesters', 'g', 57, 4, 0, 6, 1.9, 0, 500, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 70, 7, 32, 59.2, 1, 0, 0.03, 0.01),
	('c9ce14d9-c0e3-43cd-9e27-2e894254bb00', 355, 'Sardines in olie blik', 'g', 231, 0, 0, 21.7, 16, 0, 458, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 500, 3.1, 46, 2.2, 3.3, 0, 1.14, 1.04),
	('01a7a4e0-b1f4-4485-ad88-90b33904e49d', 356, 'Lever schelvis- blik', 'g', 409, 0, 0, 7, 42.3, 0, 250, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 12, 2, NULL, NULL, NULL, 0, 4.49, 5.86),
	('2747ce59-0e35-4516-b60f-d0c95990a75c', 357, 'Stokvis geweekt', 'g', 138, 0, 0, 32.5, 0.9, 0, 147, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', NULL, 0.5, NULL, NULL, NULL, 2, 0.11, 0.26),
	('9e474652-b7fe-4a2e-befa-e61cae950448', 358, 'Eiwit kippenei rauw', 'g', 44, 0.4, 0.4, 10.5, 0, 0, 159, 'NEVO-online 2025/9.0', 'Eieren', 12, 0.1, 10, 0.09, 0, 0, 0, 0),
	('89e2e091-8c09-4a1d-b6d6-d1537476dc94', 369, 'Loempia gefrituurd in plantaardige olie', 'g', 181, 18.6, 2.9, 7.1, 8.2, 2, 608, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 34, 1, 16, 0.73, 0.4, 5, 0, 0),
	('719a525b-d12a-4847-acda-7c1f3a3a59c2', 372, 'Babyvoeding maaltijd 8 mnd', 'g', 74, 9.7, 1.8, 3.4, 2.1, 1.7, 61, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 32, 0.7, 16, 0.55, NULL, 2, NULL, NULL),
	('499758a3-3708-4a3d-b08a-cb496a70306f', 374, 'Suiker basterd- bruine', 'g', 396, 99, 99, 0, 0, 0, 25, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 2, 0, 0.1, 0, 0, 0, 0),
	('93c23cce-f296-4bf9-b6a8-97d247df98b6', 375, 'Suiker basterd- witte', 'g', 396, 99, 99, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 0, 0, 0, 0, 0, 0, 0),
	('aaa2b55e-69dd-4f92-8413-77afd93db7b0', 377, 'Suiker kristal-', 'g', 400, 100, 100, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 0.1, 2, 0.01, 0, 0, 0, 0),
	('7cb35967-7975-42bf-9b98-af8a89601a84', 378, 'Stroop keuken-', 'g', 328, 82, 82, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 50, 10, 3, 0.1, 0, 0, 0, 0),
	('c6fa5b11-e7b1-4c29-a5df-0a2d2282bcd0', 381, 'Stroop suiker-', 'g', 300, 75, 75, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 0, NULL, 0.1, 0, 0, 0, 0),
	('909e0921-8bbb-4e90-9d68-963096793582', 382, 'Advocaat', 'g', 236, 23.6, 23.6, 4.3, 3.2, 0, 55, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 20, 0.8, 4, 0.47, 0.4, 0, 0.02, 0),
	('c4be345c-ac38-42af-859d-c10829a1c0ea', 383, 'Sap appel-', 'g', 46, 11.2, 10.5, 0.1, 0, 0, 4, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 8, 0.1, 6, 0.03, 0, 0, 0, 0),
	('9e8a9250-5f84-4ee6-86b2-d8ff31f71124', 385, 'Vruchtendrank rode bessen', 'g', 57, 14, 14, 0, 0, 0.4, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 7, 0, 10, 0.2, 0, 0, 0, 0),
	('e047e036-3fff-449c-971f-ff15179ac2f0', 386, 'Jenever bessen-', 'g', 184, 18, 18, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('9ac32f12-6046-4d4c-993d-e9bce1965c64', 387, 'Vruchtendrank zwarte bessen', 'g', 61, 15, 15, 0, 0, 0.4, 5, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 20, 0, 6, 0.3, 0, 30, 0, 0),
	('9e92124a-87b3-4eba-8d59-d46837d7150a', 388, 'Sap rode bessen-', 'g', 42, 10, 10, 0.2, 0, 0.6, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 12, 1, 13, NULL, 0, 12, 0, 0),
	('fff85e04-2523-4156-96dc-0856246b587d', 389, 'Bier oud bruin', 'g', 38, 5.5, 3.6, 0.5, 0, 0.2, 3, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 2, 0.1, 4, 0, 0, 0, 0, 0),
	('260a526c-1348-442b-a927-488c6933b0e0', 390, 'Bier pils', 'g', 44, 3, 0, 0.4, 0, 0.3, 3, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 3, 0, 8, 0.03, 0, 0, 0, 0),
	('5e402acf-c9b1-4617-a0af-465abbee7822', 391, 'Brandewijn', 'g', 231, 0, 0, 0, 0, 0, 2, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0.2, 0, 0, 0, 0),
	('df34f707-d17b-4748-aa82-75b5ee05650f', 392, 'Campari', 'g', 180, 10, 10, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, NULL, NULL, 0, 0, 0, 0),
	('37b040d3-9295-4723-ba61-4db614b6a979', 393, 'Jenever citroen-', 'g', 180, 3, 3, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('0ef286a0-c3e9-4797-8803-7194ddd19d08', 394, 'Cognac', 'g', 224, 0, 0, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('d7c01bd5-7514-4411-890a-59997b93c3a8', 395, 'Frisdrank m suiker m cafeine', 'g', 41, 10.4, 10.4, 0, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 0, 0, 0, 0, 0, 0),
	('ae610a10-a198-4233-ba51-9c59d81a9045', 396, 'Sap druiven-', 'g', 65, 15.9, 15.9, 0.2, 0, 0.2, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 13, 0.6, 8, 0.1, 0, 4, 0, 0),
	('4e912df2-ca12-4873-87c8-02b863fb82d8', 399, 'Vruchtendrank frambozen', 'g', 57, 14, 14, 0, 0, 0.4, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 9, 0, NULL, NULL, 0, 0, 0, 0),
	('19c24c4a-60fa-47da-911c-077fd316da1a', 400, 'Frisdrank m suiker z cafeine', 'g', 37, 9.2, 9.2, 0, 0, 0, 3, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 2, 0, 0, 0, 0, 0, 0, 0),
	('c267dfe1-6b2e-465b-9ba6-73a1de84d919', 401, 'Jenever jonge', 'g', 196, 0, 0, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('baab9c84-f0c5-41fc-80af-7aed10e02fc7', 402, 'Jenever oude', 'g', 200, 1, 1, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('cf65d418-9f72-427d-9da5-5c16b208a350', 403, 'Likeur 15-25 vol% alc', 'g', 242, 29, 29, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('da85cc2a-8ef0-4e04-a40a-4f0919d2c1f7', 405, 'Muskaatwijn', 'g', 162, 13.7, 13.7, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, NULL, NULL, 0, 0, 0, 0),
	('b552c699-a543-439f-a745-d46afa7331f6', 407, 'Port', 'g', 156, 13, 13, 0, 0, 0, 4, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 4, 0.4, 11, 0.21, 0, 0, 0, 0),
	('452b2ab0-b792-4d5c-8d8e-f19f57437b93', 408, 'Rum', 'g', 234, 0, 0, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0.02, 0, 0, 0, 0),
	('3732d360-b46f-4240-b93b-8c100aece19b', 409, 'Sherry', 'g', 111, 3.2, 3.2, 0, 0, 0, 27, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 8, 0.5, 8, 0.04, 0, 0, 0, 0),
	('a91cdfad-83f1-4882-bcc4-aa4830e31b06', 410, 'Sap sinaasappel- gepasteuriseerd', 'g', 45, 9.5, 9.1, 0.6, 0.1, 0.3, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 12, 0.1, 12, 0.08, 0, 31, 0, 0),
	('6e5e92de-e572-401b-b3b3-cfd73c86723a', 413, 'Sap tomaten-', 'g', 16, 3.2, 3.2, 0.7, 0, 0.4, 360, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 13, 0.3, 10, 0.12, 0, 8, 0, 0),
	('be1ea83d-e2b3-48c1-ba16-f613fa9069fd', 415, 'Vermouth zoete', 'g', 150, 16.5, 16.5, 0, 0, 0, 28, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 6, 0.4, 6, 0.03, 0, 0, 0, 0),
	('2df8173b-6421-412c-b81f-c335cdff51e7', 416, 'Vieux', 'g', 200, 1, 1, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('afa39d9f-6e15-4fb8-9421-ab19569612ca', 417, 'Limonade vruchten- m suiker', 'g', 41, 10.3, 10.3, 0, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0, 0, 5, 0, 0),
	('3fabe5ea-da2e-40fe-b818-a7bb24313cda', 421, 'Whisky', 'g', 245, 0, 0, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 2, 0, 0, 0.01, 0, 0, 0, 0),
	('8855eecf-f6fa-468d-bbee-2986d3bb02ca', 422, 'Wijn rode', 'g', 76, 0.2, 0.2, 0.1, 0, 0, 7, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 8, 0.6, 10, 0.05, 0, 0, 0, 0),
	('672e1ee3-6a9b-4c62-b42b-0d4299e37b1d', 423, 'Wijn witte droge', 'g', 67, 0.6, 0.6, 0.1, 0, 0, 4, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 12, 0.6, 8, 0.04, 0, 0, 0, 0),
	('d3cec667-a85c-425f-99d5-c45d14aefa3f', 425, 'Frisdrank Rivella', 'g', 4, 1, 1, 0, 0, 0, 10, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 18, 0.2, 3, NULL, 0, 0, 0, 0),
	('995c1ee8-4820-4bdf-aeb5-52f80ffb863d', 427, 'Stroop appel- rinse', 'g', 280, 65.9, 58, 1.8, 0, 4.6, 48, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 24, 13.8, 82, 0.81, 0, 1, 0, 0),
	('225b1e43-234c-41e1-ab83-c5ac07e55821', 428, 'Saus barbecue-', 'g', 95, 22.2, 17.6, 0.9, 0.1, 1, 655, 'NEVO-online 2025/9.0', 'Hartige sauzen', 13, 0.9, 19, NULL, 0, 2, 0, 0),
	('09c618a5-e2ea-4d64-a716-0a7f5f057eba', 429, 'Bouillonblokje', 'g', 273, 21.2, 7.1, 8.1, 17.2, 0.5, 19687, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 40, 1.2, 32, 0.8, 0, 0, 0, 0),
	('03ebc8b9-2f16-484d-8db8-154b354b25cd', 430, 'Cacaopoeder', 'g', 379, 10.5, 0, 18.5, 21.7, 34, 100, 'NEVO-online 2025/9.0', 'Diversen', 150, 10.5, 525, 7, 0, 0, 0, 0),
	('82152e43-07ac-4690-8d6f-d161d6f357fe', 431, 'Chocolade melk-', 'g', 548, 52, 49, 7, 34.1, 2.8, 70, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 162, 3.2, 50, 1.1, 0, 1, 0, 0),
	('296572d3-a227-4db9-a7e5-f2967923e2f5', 432, 'Chocolade puur', 'g', 531, 46.7, 41.7, 6.5, 33.7, 7.2, 10, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 50, 3.2, 89, 1.3, 0, 1, 0, 0),
	('f759ca3a-f93d-450f-b51f-a82b5bdc8934', 433, 'Vlokken chocolade- melk', 'g', 454, 72, 70, 5.8, 15, 3.5, 49, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 110, 4.4, 64, 0.31, 0, 0, 0, 0),
	('48212dc3-7056-4caa-bf07-2d631f8930cc', 434, 'Boter chocolade-', 'g', 515, 53.6, 32.4, 1.6, 32.2, 2.4, 200, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 12, 0.9, 39, 0.51, 1, 0, 0, 0),
	('074e1195-6a34-40c4-94ca-09a22cd292d8', 435, 'Vlokken chocolade- puur', 'g', 444, 67, 64, 5.2, 15.5, 7, 25, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 34, 7.9, 109, 0.66, 0, 0, 0, 0),
	('c5c55831-fcf5-426b-a4e8-7a37eced7bfc', 436, 'Pasta chocolade- hazelnoot', 'g', 562, 53.9, 50.2, 5.7, 35.3, 2.9, 53, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 116, 4.5, 74, 1.3, 0, 1, 0, 0),
	('a154c6aa-d730-40bb-a08e-0606d2e774ab', 437, 'Saus cocktail/party/tafel- 25% olie', 'g', 293, 13.7, 11, 0.7, 26.1, 0.2, 497, 'NEVO-online 2025/9.0', 'Hartige sauzen', 8, 0.2, 2, 0.11, 0.1, 0, 0, 0),
	('cd3271c3-a714-41d3-8781-bfd8f78a9467', 439, 'Gelatine', 'g', 352, 0, 0, 88, 0, 0, 50, 'NEVO-online 2025/9.0', 'Diversen', 0, 0, 11, NULL, 0, 0, 0, 0),
	('306550d9-a61c-4be7-9466-68c6a8689c99', 440, 'Gember op siroop blik/glas', 'g', 288, 69, 67, 1.8, 0, 2.5, 50, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 30, 0, 43, 0.34, 0, 0, 0, 0),
	('c263c070-a0f6-4924-9463-af3586477beb', 441, 'Gistextract Marmite', 'g', 238, 19.2, 0.5, 38.4, 0.1, 3.1, 3920, 'NEVO-online 2025/9.0', 'Diversen', 95, 0.4, 187, 2.1, 0, 0, 0, 0),
	('b10439f1-bd9b-4008-b65c-d57215e0d525', 442, 'Hagelslag vruchten-', 'g', 393, 98.2, 98.2, 0.1, 0, 0, 0, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 1, 0.1, 0, 0.01, 0, 0, 0, 0),
	('f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 443, 'Honing', 'g', 321, 80, 80, 0.3, 0, 0, 10, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 7, 0.8, 2, 0.62, 0, 4, 0, 0),
	('38732325-3366-4437-84b8-8541a507a2eb', 444, 'Pasta chocolade- puur', 'g', 575, 51.4, 50, 3, 38.6, 4.1, 80, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 23, 4.6, 73, 1.27, 0, 0, 0, 0),
	('641d7368-148c-4a12-ab0a-885982b4cbc9', 445, 'Jam', 'g', 248, 60.8, 51.2, 0.3, 0.1, 1.2, 10, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 8, 0.4, 4, 0.04, 0, 3, 0, 0),
	('a1aab0ae-7a1c-4c11-a687-3c5c88912d62', 446, 'Kauwgom', 'g', 280, 70, 70, 0, 0, 0, 1, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 5, 0, NULL, 0, 0, 0, 0),
	('f4b746d9-14ff-4db0-ab45-30a1dda39b03', 516, 'Kaas smeer- 40+', 'g', 227, 2, 2, 16, 17, 0, 650, 'NEVO-online 2025/9.0', 'Kaas', 500, 0.1, 23, 3, 0.2, 1, 0, 0),
	('31b11340-b4fa-4e42-ac0c-0e8ecf8638da', 447, 'Kauwgom z suiker', 'g', 171, 66.4, 0, 0.1, 0.6, 2.4, 14, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 5, 0, NULL, 0, 0, 0, 0),
	('75fd634f-1c5d-472a-bfb9-8b46b32043b7', 449, 'Kokosbrood', 'g', 426, 58.7, 41.4, 3.2, 18.6, 5.6, 40, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 14, 1.4, 48, 1.75, 0, 0, 0, 0),
	('be9e5358-43e1-4df2-bf0a-20bb3c888ee0', 450, 'Zuurtjes', 'g', 380, 95, 71, 0, 0, 0, 25, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 4, 0.2, 2, 0.04, 0, 0, 0, 0),
	('23eb53e7-3c3c-45f7-bf92-9842d38ea230', 451, 'Mayonaise', 'g', 664, 3.6, 3.4, 1.1, 71.6, 0.2, 301, 'NEVO-online 2025/9.0', 'Hartige sauzen', 13, 0.5, 2, 0.29, 0.2, 0, 0, 0),
	('b5e539f1-4778-4d9d-9e5c-6cf7daf6877f', 453, 'Pepermunt', 'g', 395, 98.2, 98.2, 0.6, 0, 0, 9, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 7, 0.2, 3, 0.04, 0, 0, 0, 0),
	('babfacd2-e8f0-42b6-86c9-15bb455f2bcf', 454, 'Piccalilly', 'g', 53, 8.2, 5.3, 1.3, 1.3, 1.8, 480, 'NEVO-online 2025/9.0', 'Hartige sauzen', 16, 0.6, 6, 0.1, 0, 0, 0, 0),
	('0465308a-9097-44e8-a8e4-acaf770f38a4', 455, 'Pindakaas', 'g', 654, 10, 5.2, 22.5, 56.4, 8, 248, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 45, 1.8, 145, 2.6, 0, 0, 0, 0.1),
	('7e08a74f-8368-485f-a35a-93510b2ed531', 457, 'Jam rozenbottel- m vit C', 'g', 260, 62, 62, 1.8, 0.3, 1, 25, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 20, 1, 8, 0.05, 0, 160, 0, 0),
	('d3722762-4af2-41ce-b2b4-9a183593f98b', 458, 'Saus sla- 25% olie', 'g', 278, 8.9, 6.5, 0.4, 26.7, 0.2, 572, 'NEVO-online 2025/9.0', 'Hartige sauzen', 10, 0.2, 2, 0.21, 0, 0, 0, 0),
	('0463f0d9-9575-4b2f-8e11-b8724d8d52a4', 461, 'Toffee', 'g', 401, 85.6, 65.2, 0.6, 6.2, 0.1, 14, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 4, 0.2, 2, 0.04, 0, 0, 0, 0),
	('1cbfdb0e-17ce-4963-8490-fb223f38c761', 462, 'Ketchup tomaten-', 'g', 77, 17.7, 14.3, 1, 0, 0.8, 608, 'NEVO-online 2025/9.0', 'Hartige sauzen', 13, 0, 19, 0.1, 0, 2, 0, 0),
	('a12298f7-69d8-4e9e-8f9a-5426d12af8e3', 463, 'Siroop vruchtenlimonade-', 'g', 233, 58.2, 57.3, 0, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0, 4, 0.05, 0, 0, 0, 0),
	('3aa0888d-daa2-430e-9f6a-73d02e519aaa', 464, 'Broodbeleg zoet gem', 'g', 422, 64.2, 58.1, 3, 16.5, 2.5, 38, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 58, 3.4, 48, 0.82, 0, 2, 0, 0),
	('d0fc0852-7c65-4968-a536-be1d9409a95d', 465, 'Saus frites- 25% olie', 'g', 296, 12, 6.8, 0.5, 27.3, 0.2, 559, 'NEVO-online 2025/9.0', 'Hartige sauzen', 8, 0.2, 2, 0.11, 0.1, 0, 0.05, 0),
	('8a5c8879-a18c-48e1-acde-187850b67a8b', 466, 'Saus frites- 35% olie', 'g', 375, 12, 7.6, 0.7, 36, 0, 550, 'NEVO-online 2025/9.0', 'Hartige sauzen', 10, 0.2, 9, 0.11, 0.1, 0, 0, 0),
	('7dfe8ddf-f6b5-48c8-b603-d8ba6fb5a8ab', 467, 'Pannenkoek huishoudelijk bereid m margarine', 'g', 206, 29.2, 4.9, 8.3, 5.8, 1.6, 217, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 106, 0.8, 21, 0.73, 0.5, 0, 0, 0),
	('fdecb9b7-6558-4188-abee-09e5de201ed0', 468, 'Tompouce', 'g', 315, 36.5, 23.8, 3.8, 16.9, 0.9, 201, 'NEVO-online 2025/9.0', 'Gebak en koek', 42, 0.3, 7, 0.23, 1.5, 0, 0.01, 0),
	('802c0088-1cc4-4eb6-8120-d8ba3aeb4701', 469, 'Babi pangang z rijst', 'g', 131, 6.7, 5.7, 10.2, 7, 0.4, 300, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 5, 1.4, 14, 1.64, 0.2, 9, 0, 0),
	('4ea1d736-8e6f-4ca9-9011-ae8ed732eb4d', 470, 'Bami goreng z ei', 'g', 168, 26.3, 4.8, 6.6, 3.8, 1.4, 164, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 11, 0.6, 7, 1.21, 0, 4, 0, 0),
	('98711430-89d9-45d4-bb19-1f6511881ee2', 471, 'Nasi goreng m ei', 'g', 144, 22.4, 0.7, 4.4, 3.9, 0.9, 365, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 17, 0.4, 11, 0.77, 0.1, 4, 0, 0),
	('a571d29c-b87a-45c3-a0b8-9daf149e6068', 472, 'Tjap tjoi z rijst', 'g', 61, 3.2, 2.5, 3.9, 3.4, 0.9, 244, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 16, 0.4, 9, 0.27, 0, 6, 0, 0),
	('38e49b44-cfcd-452c-9d7e-b3c592ccf4bd', 473, 'Foe yong hai z rijst', 'g', 96, 4.6, 3.3, 4.8, 6.2, 1.3, 344, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 28, 1.1, 11, 0.62, 0.5, 7, 0.01, 0),
	('4a67041e-41b4-4085-9afb-f05a68e253a0', 474, 'Oliebol gevuld m krenten en rozijnen', 'g', 259, 37.9, 12.3, 5.9, 8.7, 2.5, 305, 'NEVO-online 2025/9.0', 'Gebak en koek', 61, 0.8, 19, 0.49, 0.1, 0, 0, 0),
	('ffd23be9-0225-46a6-a4c5-419ca890bc00', 475, 'Lever kippen- rauw', 'g', 128, 1, 0, 19.1, 5.4, 0, 106, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 9.7, 22, 3.19, 0.8, 28, 0, 0),
	('37ac6385-966d-4ca2-8582-da5c242fd4d3', 479, 'Melk karne- m vruchten', 'g', 51, 8.2, 8.2, 3.3, 0.5, 0, 45, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 104, 0.1, 11, 0.33, 0, 2, 0, 0),
	('219f5b0a-34e8-46f3-9dc0-9f87bde3ac5c', 480, 'Biscuit fourre omhuld m chocolade', 'g', 500, 67.7, 42.5, 5.4, 22.6, 1.9, 180, 'NEVO-online 2025/9.0', 'Gebak en koek', 32, 1.3, 23, 0.57, 0, 0, 0, 0),
	('bd1019c5-4bb1-4ab9-97b4-9985a65b21a2', 481, 'Koek Bastogne', 'g', 493, 72.2, 39.7, 4.9, 20.1, 1.9, 321, 'NEVO-online 2025/9.0', 'Gebak en koek', 14, 0.5, 12, 0.43, 0.2, 0, 0.02, 0),
	('e21618b6-557d-4e51-9ce6-27a77c5cbdb1', 482, 'Spekkie', 'g', 334, 78.3, 68.2, 4.1, 0.4, 0.3, 4, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 41, 0.4, 5, 0.1, 0, 0, 0, 0),
	('022c5272-2847-4fea-b097-fd9aa7fb2fd0', 484, 'Spread fruit- minder suiker', 'g', 118, 27.7, 27.4, 0.5, 0.2, 1.7, 16, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 10, 0.2, 10, 0, 0, 3, 0, 0),
	('d3fddbb4-b0d8-4370-93e4-50b33c587223', 485, 'IJs room/vanille- cornet m chocola en nootjes', 'g', 302, 38.9, 23.9, 3.9, 14.3, 0.9, 42, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 75, 0.9, 30, 0.39, 0, 0, 0, 0),
	('2f641132-ea8e-405c-98a9-aed826a683be', 486, 'Vlaai vruchten-', 'g', 228, 41.6, 19.8, 2.9, 5.1, 1.1, 228, 'NEVO-online 2025/9.0', 'Gebak en koek', 22, 0.4, 10, 0.18, 0.4, 0, 0, 0),
	('54ba9e79-1bb7-480b-a83e-a97ed7e7e119', 487, 'Candybar Mars', 'g', 449, 70.2, 61.7, 4.1, 16.6, 1.3, 168, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 118, 1.7, 35, 0.6, 0, 0, 0, 0),
	('5f653826-efc9-47d1-92f6-9edf66704055', 488, 'Puddingpoeder instant chocolade', 'g', 363, 80, 61, 3.4, 2.2, 4.8, 1120, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 22, 1.6, 76, 0.99, 0, 0, 0, 0),
	('ed214a5e-4366-4a6c-b1dd-d686c433fc85', 489, 'Vlaai rijste-', 'g', 211, 34.5, 17.5, 4.5, 6, 0.7, 262, 'NEVO-online 2025/9.0', 'Gebak en koek', 67, 0.6, 15, 0.89, 0.5, 0, 0.01, 0.01),
	('0eb3f7d8-b912-4489-8de7-e167269f99c9', 497, 'Siroop vruchtenlimonade- vruchtenmix m rozenbottel', 'g', 185, 45.6, 44.8, 0.3, 0, 0.6, 5, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 8, 0.3, 5, 0.05, 0, 96, 0, 0),
	('b6114d5f-f69b-4077-b4bc-f7573dd8a855', 498, 'Siroop vruchtenlimonade- Roosvicee Fruitkracht Ferro', 'g', 222, 55.2, 54.4, 0.2, 0, 0.3, 8, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 74.4, NULL, NULL, 0, 64, 0, 0),
	('5a51bf34-1159-4fa4-b7fb-21169c24e40b', 500, 'Siroop vruchtenlimonade- Roosvicee Fruitkracht Pruimen', 'g', 225, 56, 55.2, 0.2, 0, 0.2, 4, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 8, 0.1, NULL, NULL, 0, 48, 0, 0),
	('07d592f8-336f-477c-ad0b-48b1251425dd', 511, 'Kaas Edammer 40+', 'g', 324, 0, 0, 25.5, 24.3, 0, 1032, 'NEVO-online 2025/9.0', 'Kaas', 896, 0.1, 31, 3.8, 0.3, 1, 0, 0),
	('1053f7e3-8f86-4f4b-b748-c3e0c27cd7d4', 513, 'Kaas Goudse 48+ gem', 'g', 370, 0, 0, 22.9, 30.6, 0, 670, 'NEVO-online 2025/9.0', 'Kaas', 819, 0.2, 33, 3.47, 0.3, 0, 0, 0),
	('0ddd978d-4a66-4e05-9ad4-3e715b6a83a6', 514, 'Kaas 20+ Leidse/Friese nagel-', 'g', 240, 0, 0, 33.1, 11.9, 0, 787, 'NEVO-online 2025/9.0', 'Kaas', 1136, 0.1, 28, 4.5, 0.1, 1, 0, 0),
	('f8dc2b30-c921-453b-8bf8-fedde472657c', 515, 'Kaas smeer- volvet 48+', 'g', 260, 2.1, 2.1, 13.4, 21.7, 0.5, 931, 'NEVO-online 2025/9.0', 'Kaas', 467, 0.1, 21, 2, 0, 1, 0, 0),
	('36a356b5-da56-4b05-a120-54d3b0ba825d', 517, 'Kaas smeer- 20+', 'g', 137, 1.7, 1.7, 17.2, 6.8, 0, 800, 'NEVO-online 2025/9.0', 'Kaas', 548, 0.1, 21, 2.2, 0.1, 1, 0, 0);
INSERT INTO public.nutrition_foods VALUES
	('c83eb39d-d197-4296-823a-5612b135bdcc', 520, 'Drop zoute', 'g', 330, 68.1, 44.2, 12.2, 0.2, 3.1, 123, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 117, 2.9, 40, 0.28, 0, 0, 0, 0),
	('bb7e7322-3f67-41fa-909d-95ef427f06a8', 521, 'Drop dubbelzoute', 'g', 330, 68.1, 44.2, 12.2, 0.2, 3.1, 150, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 117, 2.9, 40, 0.28, 0, 0, 0, 0),
	('8597c29c-a9a4-48af-a216-54cf31b51fcc', 522, 'Drop zoete', 'g', 333, 74.6, 51.5, 7.3, 0.4, 1, 126, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 132, 3.5, 35, 0.29, 0, 0, 0, 0),
	('024c055d-249e-4089-b4b7-fb050f9e30de', 523, 'Stophoest', 'g', 396, 98.4, 91.4, 0.6, 0, 0, 9, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 7, 0.2, 3, NULL, 0, 0, 0, 0),
	('cfda4756-5165-43b5-bd25-f7e4fd5c440b', 524, 'Chocolade in krokant suikerlaagje M&M''s', 'g', 487, 68.6, 66.4, 4.6, 20.7, 2.7, 87, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 165, 1.6, 48, 0.96, NULL, 0, 0, 0),
	('c226fa31-76cc-45b3-9e97-1e92264027ab', 525, 'Candybar Milky Way', 'g', 448, 71.9, 65.1, 4, 15.9, 0.6, 227, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 90, 1.1, 21, 0.47, 0, 0, 0, 0),
	('302afe44-8528-4912-a4a6-5a1f7240546d', 526, 'Candybar Bounty', 'g', 486, 58.3, 48, 3.7, 26.1, 1.5, 104, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 57, 1.5, 39, 0.59, 0, 0, 0, 0),
	('d8719dec-3f74-4ee0-bb65-210dc08d8027', 528, 'Candybar Snickers', 'g', 484, 60.2, 51.6, 8.7, 22.9, 1.3, 222, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 98, 1.2, 72, 1.31, 0, 0, 0, 0),
	('0ba369b9-8586-4a88-8689-2d9139c40369', 530, 'Bakmix voor pannenkoeken', 'g', 332, 68.1, 0.4, 9.5, 1.3, 5.1, 330, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 66, 1, 33, 0.66, 0, 0, 0, 0),
	('f8e18884-4e34-49d0-9300-1ab0192f8830', 531, 'Bakmix voor poffertjes', 'g', 329, 68, 1.7, 9.3, 1.1, 5.1, 480, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 66, 1, 33, 0.66, 0, 0, 0, 0),
	('3d1e5ed9-4da0-4d62-be1e-2c9f454c55d0', 532, 'Pudding chocolade-', 'g', 112, 19.3, 13.5, 3.4, 2, 1.4, 39, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 105, 0.4, 30, 0.6, 0, 0, 0, 0),
	('b00a77d6-2de0-4af1-be6a-2a9c7cd71a2e', 535, 'Cacaopoeder gezoet', 'g', 376, 80.6, 78.1, 4.5, 2.6, 6, 87, 'NEVO-online 2025/9.0', 'Diversen', 42, 7.8, 113, 1.9, 0, 0, 0, 0),
	('56444085-7669-4397-a5bd-821a59f4c875', 538, 'Rabarbermoes m suiker', 'g', 82, 19, 19, 0.5, 0, 2, 0, 'NEVO-online 2025/9.0', 'Groente', 33, 0.1, 11, 0.15, 0, 5, 0, 0),
	('db0fc190-b8b5-4e35-8596-25a540777836', 539, 'Dessertsaus vruchten-', 'g', 189, 46.3, 37, 0.3, 0.1, 0.7, 4, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 8, 0.4, 2, 0.05, 0, 3, 0, 0),
	('e72f308f-d306-4227-b047-f19e777d1630', 540, 'Dessertsaus chocolade-', 'g', 269, 60.8, 48.3, 2.1, 1.9, 0.5, 9, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 23, 4.6, 73, NULL, 0, 0, 0, 0),
	('409387ac-bacb-4e4e-aee1-d209dece308d', 541, 'Pindakaas m stukjes pinda', 'g', 651, 15, 10, 20, 55, 7.9, 240, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 46, 0.8, 130, 2.4, 0, 0, 0, 0.1),
	('2555ba51-69d8-4c7d-bbad-410fbeffda72', 546, 'Noten borrel-', 'g', 532, 43.7, 8, 13.2, 32.7, 4.8, 655, 'NEVO-online 2025/9.0', 'Noten en zaden', 47, 2.2, 91, 1.5, 0, 0, 0, 0.07),
	('d9851082-5108-40ff-9c8f-2748e1346336', 548, 'Saus schaschlik-', 'g', 109, 25.9, 21.8, 0.8, 0, 0.9, 840, 'NEVO-online 2025/9.0', 'Hartige sauzen', 17, 2.2, 23, NULL, 0, 2, 0, 0),
	('832efe4b-2621-431a-970d-6ad67bf9c2c3', 555, 'Topping m suiker opgeklopt Klop-Klop', 'g', 111, 12.5, 11.2, 3.5, 5.2, 0, 44, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 106, 0, 10, 0.36, 0, 1, 0, 0),
	('e5b9bd78-d15b-4740-8ab4-10cee2e6d4b3', 556, 'Kaas Camembert 45+', 'g', 306, 0, 0, 25, 22.8, 0, 790, 'NEVO-online 2025/9.0', 'Kaas', 600, 0.2, 20, 3, 0.1, 0, 0.01, 0),
	('36578cc7-289a-44ac-800d-3fe7006cd0f1', 557, 'Selderij bleek- rauw', 'g', 14, 2, 1, 1, 0, 1.1, 60, 'NEVO-online 2025/9.0', 'Groente', 80, 0.5, 12, 0.1, 0, 25, 0, 0),
	('c5cfe882-e40a-41ff-bbb0-0b5230084dea', 558, 'Selderij knol- rauw', 'g', 38, 5, 0, 2, 0, 4.9, 80, 'NEVO-online 2025/9.0', 'Groente', 80, 1, 21, 0.31, 0, 12, 0, 0),
	('b065b06e-1451-44aa-b19b-e2323e17e138', 559, 'Koolraap rauw', 'g', 30, 5, 4.9, 0.7, 0.1, 3, 15, 'NEVO-online 2025/9.0', 'Groente', 53, 0.1, 9, 0.3, 0, 0, 0, 0),
	('1583a88c-ea7b-4ba4-bd5a-6b2e145ac758', 560, 'Koolrabi rauw', 'g', 31, 4.7, 4.5, 0.9, 0.3, 2.8, 15, 'NEVO-online 2025/9.0', 'Groente', 48, 0.2, 8, 0.1, 0, 17, NULL, NULL),
	('7de775e9-8e68-46aa-bcb6-e52dd7421c95', 561, 'Postelein rauw', 'g', 13, 1, 1, 1, 0, 2.5, 30, 'NEVO-online 2025/9.0', 'Groente', 125, 3, 68, 0.17, 0, 20, 0, 0),
	('81ec7b61-3826-4cb5-888b-01f88fda1a05', 562, 'Prei rauw', 'g', 28, 3.5, 3, 1.5, 0.2, 3, 4, 'NEVO-online 2025/9.0', 'Groente', 39, 0.4, 11, 0.4, 0, 7, 0, 0),
	('ac58f8b3-16c4-4058-a479-fdfbabd6567c', 563, 'Snijbiet rauw', 'g', 29, 3, 3, 3, 0, 2.5, 200, 'NEVO-online 2025/9.0', 'Groente', 90, 4, 11, NULL, 0, 35, 0, 0),
	('b81a8d6f-d2d4-4917-be75-7d358502b5df', 564, 'Spruitjes rauw', 'g', 46, 5.6, 1.4, 2.3, 0.7, 4.1, 7, 'NEVO-online 2025/9.0', 'Groente', 30, 0.6, 8, 0.4, 0, 150, 0, 0),
	('06c6ba4a-4dbe-4fd6-b97b-1ce925e2504b', 566, 'Worst knak- blik/glas', 'g', 201, 3.8, 0.3, 12, 15.4, 0.1, 780, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 22, 1.1, 10, 1.4, 0.7, 0, 0, 0),
	('b270c49a-0501-482b-bff8-f089e7f646d7', 567, 'Worst boterham-', 'g', 306, 3.5, 0.7, 11.6, 26.9, 0.2, 866, 'NEVO-online 2025/9.0', 'Vleeswaren', 18, 1.3, 13, 1.7, 0.7, 38, 0.03, 0),
	('11263e31-7d5b-41e8-8eed-b2a714c7621e', 568, 'Worst bloed-', 'g', 386, 9.5, 0.5, 12.4, 32.6, 2.5, 793, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 15, 6.6, 16, 0.7, 0.6, 0, 0.01, 0.01),
	('7b5395df-8d74-4d8b-8917-5126e610fb39', 570, 'Candybar Nuts', 'g', 497, 62.3, 55.2, 4.6, 24.8, 3.3, 20, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 123, 1.9, 49, 0.78, 0, 0, 0, 0),
	('7a104ecc-f7e1-4942-9e2f-1da47c302f4e', 575, 'Spread sandwich- naturel', 'g', 235, 14, 14, 1.6, 19, 0.8, 532, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 56, 2, 18, NULL, 0.1, 4, 0, 0),
	('5a881fc5-a271-4db6-acc0-e22f707f9349', 577, 'Salade huzaren-', 'g', 149, 13.7, 3.8, 2.1, 9.1, 2.1, 432, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 10, 0.7, 14, 0.28, 0.1, 1, NULL, NULL),
	('74aa9e04-c41f-4720-8861-c38243e4fa9b', 583, 'Ketchup hot chilli', 'g', 101, 23.3, 22.8, 1.2, 0.1, 0.8, 1240, 'NEVO-online 2025/9.0', 'Hartige sauzen', 13, 0, 19, 0.1, 0, 2, 0, 0),
	('c7f8a213-f011-46d1-8da6-bc7fcbdc000d', 584, 'Ketchup curry-', 'g', 129, 29.9, 25.5, 0.8, 0.3, 1.5, 647, 'NEVO-online 2025/9.0', 'Hartige sauzen', 13, 0, 19, 0.1, 0, 2, 0, 0),
	('dd3672a4-2bbf-49f8-9e52-f21fa930281e', 590, 'Zemelen tarwe-', 'g', 274, 20.5, 2.7, 15.4, 4.4, 45.4, 3, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 81, 11, 410, 10, 0, 0, 0, 0),
	('27c1133c-ecf8-4dc5-ae15-4e73f0339398', 591, 'Ontbijtproduct All-Bran Plus Kellogg''s', 'g', 334, 48, 18, 14, 3.5, 27, 360, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 60, 8.8, 274, 4, 6.3, 0, 0, 0),
	('1b9ed028-a329-4421-a638-fb531bd9cc0f', 593, 'Kaas Brie 50+', 'g', 318, 0, 0, 23, 25.1, 0, 828, 'NEVO-online 2025/9.0', 'Kaas', 400, 0.5, 10, 2, 0.3, 0, 0, 0),
	('80d44b00-790e-4b70-ae21-390f5710e72e', 595, 'Cacaoproduct poeder Ovomaltine', 'g', 370, 75, 51.7, 11.2, 1.7, 4.9, 300, 'NEVO-online 2025/9.0', 'Diversen', 380, 4.6, 300, NULL, 0, 60, 0, 0),
	('c671f073-1d01-4656-86c9-c0c79182c931', 596, 'Knackebrod goudbruin', 'g', 410, 72.3, 5.2, 12.3, 6.6, 5.8, 432, 'NEVO-online 2025/9.0', 'Brood', 100, 3, 90, 2.4, 0, 0, 0, 0),
	('42f82bbc-bf9d-46af-b3ea-d793bb97af7c', 598, 'Water 0-50 mg calcium p liter', 'g', 0, 0, 0, 0, 0, 0, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 4, 0, 1, 0, 0, 0, 0, 0),
	('bcc91354-aa14-4238-8f3e-b14ddf35da96', 599, 'Water 50-100 mg calcium p liter', 'g', 0, 0, 0, 0, 0, 0, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 0, 1, 0, 0, 0, 0, 0),
	('60f623a4-7d9f-4610-8629-bcc29216ccd3', 600, 'Water >100 mg calcium p liter', 'g', 0, 0, 0, 0, 0, 0, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 13, 0, 1, 0, 0, 0, 0, 0),
	('8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 601, 'Olie olijf-', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, 0, 0),
	('ede9a1c1-3626-4981-8d49-c21959795e3d', 602, 'Zalm blik', 'g', 146, 0, 0, 20.4, 7.2, 0, 397, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 91, 0.9, 25, 0.8, 10.9, 0, 0.59, 0.92),
	('fa709987-4a4a-4c4f-9c39-005bcc07cb99', 603, 'Paling gerookt', 'g', 351, 0, 0, 19.1, 30.5, 0, 583, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 26, 0.5, 10, 3.47, 20.4, 0, 0.96, 1.05),
	('0f22992a-b630-487e-bae7-8928f37352d7', 604, 'Makreel gestoomd', 'g', 315, 0.5, 0, 19.5, 26.1, 0, 250, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 20, 1.2, 26, 0.48, 4.3, 0, 1.68, 2.89),
	('faf74d11-410a-4904-8025-80bbbd84b694', 605, 'Krentjebrij Bessola', 'g', 75, 17, 13, 0.6, 0.3, 1, 3, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 9, 0.3, 7, 0.1, 0, 0, 0, 0),
	('dac712ba-a7a3-4aa8-8c86-67419101b737', 606, 'Olie Becel Blend Classic', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, NULL, NULL),
	('c18f2bdf-796a-431d-828f-45d2f1aa5dfd', 607, 'Olie saffloer-', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, 0, 0),
	('a3e7183a-7ded-4b0d-83aa-b11fdeeeff59', 608, 'Olie mais/maiskiem-', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, 0, 0),
	('48ecf878-42f8-4634-b61e-38f53188e8a3', 609, 'Nasischijf diepvries gefrituurd in plantaardige olie', 'g', 298, 30.7, 0, 5.8, 16.7, 0.7, 776, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 39, 1.7, NULL, NULL, 0.1, 0, 0, 0),
	('e9fd43ca-2c97-4e4f-9433-ca645af2e79a', 610, 'Bamibal gefrituurd in plantaardige olie', 'g', 275, 30, 2, 7, 14, 0.7, 776, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 39, 1.7, 7, 1.21, 0.2, 6, 0, 0),
	('59d31b31-94cb-4394-b05c-1bcc785d38c6', 616, 'Saus sate- kant-en-klaar bereid', 'g', 247, 23.5, 19.5, 7.5, 13.2, 2.4, 551, 'NEVO-online 2025/9.0', 'Hartige sauzen', 35, 0.7, 56, 0.81, 0, 0, 0, 0.03),
	('1eba51ba-6f9c-4b09-a1a7-8264faef839c', 618, 'Zoutje luchtig aardappelbasis Nibb-it', 'g', 482, 65, 1.4, 3.3, 22.5, 3.3, 940, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 20, 1.2, 43, 0.6, 0, 0, 0, 0),
	('a689bf62-15ba-4948-b0f2-29c0dcfe07ac', 619, 'Zoutje aardappel- Wokkels', 'g', 493, 69, 1.4, 3.4, 22, 2.8, 1080, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 20, 1.2, 37, 0.6, 0, NULL, 0, 0),
	('067a6850-87bb-4450-9cee-a41e89f27d7a', 620, 'Fritessticks gem', 'g', 522, 60.5, 1.5, 6.5, 27.5, 3.3, 614, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('a0790efb-692d-46b8-818b-e9260f88fa57', 621, 'Pinda''s omhuld m chocolade in krokant suikerlaagje M&M''s', 'g', 511, 59.1, 53.6, 9.8, 25.3, 3.9, 36, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 130, 1.6, 69, 1.1, 0, 0, NULL, NULL),
	('e6f2b4a3-6a43-4583-b3ff-0283048165fe', 622, 'Puddingpoeder instant overige smaken', 'g', 387, 94, 74, 0.2, 1.1, 0, 1120, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 1, 0.2, 2, 0.01, 0, 0, 0, 0),
	('4e19dbf9-29c3-4b3d-97f4-658b6d3be225', 630, 'Popcorn naturel gepoft z olie', 'g', 386, 72, 1.1, 13, 4, 5, 3, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 11, 1.1, 86, 0.1, 0, 0, 0, 0),
	('946f5a3f-d805-467c-9869-c55ca9b0ddbe', 633, 'Bokkenpootje', 'g', 454, 61.6, 44.2, 5.5, 20.3, 1.5, 54, 'NEVO-online 2025/9.0', 'Gebak en koek', 50, 0.7, 43, 0.46, 0.3, 0, 0, 0),
	('00f51aa1-15de-4c38-a783-78423b055d47', 634, 'Koek kokos-', 'g', 517, 53, 28, 6, 30.8, 2, 230, 'NEVO-online 2025/9.0', 'Gebak en koek', 60, 0.7, 12, 0.42, 0.2, 0, 0.03, 0),
	('59f481fd-f50f-4c6a-bcc6-2de7e4d1ba17', 635, 'Koekje krakeling', 'g', 497, 61.1, 26.6, 6.7, 24.8, 1.3, 323, 'NEVO-online 2025/9.0', 'Gebak en koek', 13, 0.5, 14, 0.27, 0.1, 0, 0.02, 0),
	('a62a7c00-a355-4748-9f5d-d0f675b7f530', 636, 'Koek muesli-', 'g', 394, 54.1, 21.2, 6.5, 16.1, 3.3, 100, 'NEVO-online 2025/9.0', 'Gebak en koek', 45, 2.3, 45, NULL, NULL, 0, 0.02, 0),
	('e816067c-1c05-4e4e-9afa-ef68157409a6', 638, 'Worst cervelaat-', 'g', 375, 1.3, 0.6, 17.8, 33, 0.7, 1361, 'NEVO-online 2025/9.0', 'Vleeswaren', 29, 1.5, 16, 2.34, 0.9, 9, 0, 0),
	('da1e65ce-a91a-444b-9409-a9b4cc3b2ddb', 639, 'Spek ontbijt-', 'g', 312, 0.5, 0.5, 15.7, 27.5, 0, 1347, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 0.6, 13, 1.7, 0.7, 0, 0, 0),
	('633eb934-0668-4330-9c55-1492903205d0', 640, 'Worst lever-', 'g', 294, 1.8, 0.1, 14.5, 25.3, 0.5, 721, 'NEVO-online 2025/9.0', 'Vleeswaren', 13, 5.4, 12, 2.44, 0.9, 15, 0.02, 0),
	('2095d008-034f-446a-90bb-ceff846793cc', 641, 'Bacon', 'g', 188, 0.5, 0.3, 18.5, 12.4, 0, 1524, 'NEVO-online 2025/9.0', 'Vleeswaren', 10, 0.7, 17, 1, 0.3, 0, 0, 0),
	('ff5762d0-d3ac-47d4-afd9-d18395805459', 642, 'Pate room-', 'g', 360, 5.7, 1.7, 9.6, 33, 1.1, 800, 'NEVO-online 2025/9.0', 'Vleeswaren', 12, 6.8, 9, 2.7, 1.2, 40, 0.03, 0),
	('5f0f1d5b-5bb3-4548-9498-24947a5e5cbb', 643, 'Casselerrib gerookt/gekookt', 'g', 130, 2.8, 2.8, 18.3, 5.1, 0, 723, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 0.7, 22, 1.7, 0.1, 25, 0, 0),
	('840fdfaf-2809-4e35-86b0-2f7bd303c543', 644, 'Koffie bereid', 'g', 1, 0.1, 0.1, 0.2, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 4, 0.2, 6, 0.01, 0, 0, 0, 0),
	('f15aa45d-7a0e-47e2-9d0f-9e4b25670ac7', 645, 'Thee bereid', 'g', 0, 0, 0, 0, 0, 0, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0.01, 0, 0, 0, 0),
	('8c4a2f92-c976-4df0-8cda-8ef3eec88df9', 650, 'Kool rode m appeltjes diepvries gekookt', 'g', 57, 9.9, 8.8, 1.1, 1, 2.2, 200, 'NEVO-online 2025/9.0', 'Groente', 34, 0.4, 8, 0.15, 0, 20, 0, 0),
	('92e7d282-86be-4b72-b11c-85c6e72c0e08', 651, 'Spinazie a la creme diepvries gekookt', 'g', 44, 0.8, 0.2, 2.9, 3, 1.3, 212, 'NEVO-online 2025/9.0', 'Groente', 83, 2.2, 72, 1.13, 0, 7, 0, 0),
	('5ac79c7c-e2c9-4354-a68c-aff48b9ea7e0', 653, 'Ontbijtproduct Rice Krispies Kellogg''s', 'g', 389, 86, 7.9, 7, 1.2, 2.9, 400, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 10, 8, 50, 1, 8.4, 0, 0, 0),
	('a84f48f7-649b-4a42-9a96-cb949308a895', 654, 'Kaas huttenkase', 'g', 92, 2.3, 2.3, 11.2, 3.9, 0, 370, 'NEVO-online 2025/9.0', 'Kaas', 75, 0.3, 7, 0.23, 0.1, 0, 0, 0),
	('a516965e-31fd-471c-8626-29e4201cd6a1', 655, 'Beschuit volkoren/meergranen', 'g', 394, 69, 12, 14, 5, 8.5, 240, 'NEVO-online 2025/9.0', 'Brood', 26, 2.2, 99, 0.57, 0, 0, 0, 0),
	('8212cae3-bd31-4001-b031-7b35c61cc50a', 657, 'Yoghurtdrank', 'g', 57, 12, 11.9, 1.6, 0.1, 0.5, 39, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 71, 0, 8, 0.19, 0, 0, 0, 0),
	('b7f9c0a1-b7d6-423d-8622-291a2d3973d8', 658, 'Rijst witte gekookt', 'g', 146, 32.2, 0, 3.2, 0.3, 0.7, 4, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 12, 0.2, 9, 0.75, 0, 0, 0, 0),
	('a6c97cbc-a735-483f-a1df-84a3fab1929d', 659, 'Pasta witte gem gekookt', 'g', 142, 27.7, 0.7, 5.1, 0.9, 1.4, 4, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 16, 0.7, 19, 0.64, 0, 0, 0, 0),
	('7355e70b-fabb-4342-8a27-6a12b821ce0c', 660, 'Bonen bruine blik/glas', 'g', 120, 18, 0.9, 6.5, 0.7, 7.9, 119, 'NEVO-online 2025/9.0', 'Peulvruchten', 50, 1.6, 34, 0.54, 0, 0, 0, 0),
	('5ccfc071-5872-4b34-b75a-91cb66a26c4a', 664, 'Sap grapefruit-', 'g', 34, 7.3, 7.3, 0.5, 0, 0.4, 3, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 11, 0.3, 9, 0.03, 0, 26, 0, 0),
	('3cf7cd0f-1037-4777-9d7b-bb178062d1c9', 665, 'Banaan bak- rijp rauw', 'g', 138, 32, 15, 1.3, 0, 2.3, 4, 'NEVO-online 2025/9.0', 'Fruit', 3, 0.6, 37, 0.1, 0, 18, 0, 0),
	('f7db29b5-5479-40c3-87a6-56e04fc7af8b', 667, 'Cassave rauw', 'g', 142, 33.5, 1.4, 0.6, 0.2, 1.7, 5, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 18, 0.5, 21, 0.6, 0, 31, 0, 0),
	('40c5448d-015a-4f3c-8887-5310132649df', 668, 'Taro rauw', 'g', 119, 26.2, 1.1, 1.4, 0.2, 3.5, 4, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 25, 0.8, 33, 1.3, 0, 13, 0, 0),
	('61336959-de25-4d3b-8af8-a33605d845f8', 669, 'Yam rauw', 'g', 124, 28.2, 0.7, 1.5, 0.3, 1.3, 2, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 15, 0.7, 15, 0.3, 0, 4, 0, 0),
	('9917268a-d1ad-4318-a6b8-001f310f3289', 670, 'Pomtajer rauw', 'g', 136, 31, 5, 2, 0, 2, 17, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.9, NULL, 0.5, 0, 16, 0, 0),
	('802a343b-5924-4e1d-97f9-4f1f1e4f7ad9', 671, 'Aardappel zoete rauw', 'g', 91, 19.7, 5.5, 1.2, 0.3, 2.4, 40, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 24, 0.7, 18, 0.3, 0, 23, 0, 0),
	('5f4a77b4-2ac3-4033-bf1f-bc30729e35e5', 672, 'Agoemawiwiri rauw', 'g', 60, 7, 3, 5, 1, 1.4, NULL, 'NEVO-online 2025/9.0', 'Groente', 200, 9.9, NULL, NULL, 0, 61, NULL, NULL),
	('69590c29-a405-42e8-adcf-1531c992fc11', 673, 'Amsoi rauw', 'g', 32, 3.2, 0.7, 2.5, 0.3, 3.2, 25, 'NEVO-online 2025/9.0', 'Groente', 130, 2.1, 32, 0.23, 0, 71, 0, 0),
	('cca423df-0fcd-4341-866a-0006bf2dfd7b', 674, 'Antroewa rauw', 'g', 30, 6, 2, 1, 0, 1.2, 3, 'NEVO-online 2025/9.0', 'Groente', 25, 0.8, 11, 0.2, 0, 3, 0, 0),
	('31251371-e829-474a-9643-56e747594e96', 675, 'Dagoeblad rauw', 'g', 34, 5, 0, 3, 0, 1.1, 45, 'NEVO-online 2025/9.0', 'Groente', 75, 2.5, NULL, NULL, 0, 16, 0, 0),
	('d011b673-b76c-44ee-817c-9960dd5b81b9', 676, 'Kaisoi rauw', 'g', 32, 5, 5, 3, 0, 0.1, 24, 'NEVO-online 2025/9.0', 'Groente', 80, 0.4, 24, NULL, 0, 27, 0, 0),
	('729abe2c-03d1-4590-89a2-56c11839a37d', 677, 'Klaroen rauw', 'g', 56, 7, 3, 4, 1, 1.5, 4, 'NEVO-online 2025/9.0', 'Groente', 315, 5.6, 55, 0.6, 0, 12, NULL, NULL),
	('f9d7a50c-1b0c-484f-b4ca-8f5320f95074', 679, 'Kousenband rauw', 'g', 43, 7, 0, 3, 0, 1.3, 6, 'NEVO-online 2025/9.0', 'Groente', 55, 1.4, 44, 0.37, 0, 1, 0, 0),
	('b8234796-e3be-45dd-a517-c15a0e2b263f', 680, 'Okra rauw', 'g', 23, 1.8, 1.5, 1.9, 0.2, 3.2, 7, 'NEVO-online 2025/9.0', 'Groente', 82, 0.6, 57, 0.58, 0, 23, 0, 0),
	('6fc03d37-dd8b-44c0-96d2-eaf4c01ffd98', 681, 'Poeng rauw', 'g', 31, 6, 2, 1, 0, 1.5, 3, 'NEVO-online 2025/9.0', 'Groente', 20, 0.5, 9, 0.7, 0, 16, 0, 0),
	('78751e6f-7829-48e4-bf55-584953be8c7d', 682, 'Pompoen rauw', 'g', 14, 2, 1.7, 0.7, 0.2, 1, 2, 'NEVO-online 2025/9.0', 'Groente', 29, 0.4, 10, 0.2, 0, 14, 0, 0),
	('d525c9bf-91d8-4804-8b46-71f7999e4066', 683, 'Sopropo rauw', 'g', 15, 0.9, 0.8, 1, 0.2, 2.8, 5, 'NEVO-online 2025/9.0', 'Groente', 19, 0.4, 17, 0.8, 0, 84, 0, 0),
	('b02d3e1c-731e-47fc-bed0-3d7f212d99ba', 684, 'Tajerblad rauw', 'g', 19, 2, 1, 2, 0, 1.4, 9, 'NEVO-online 2025/9.0', 'Groente', 180, 1.9, 45, 0.9, 0, 27, 0, 0),
	('25cd4198-7c5b-44db-898c-ff95f2f37021', 685, 'Bonen black eyed gedroogd', 'g', 367, 62, 2, 23, 2, 4.4, 22, 'NEVO-online 2025/9.0', 'Peulvruchten', 75, 5.8, NULL, NULL, 0, 0, 0, 0),
	('9d3441d6-8faa-4819-8fd1-3e16df2d2eb7', 686, 'Erwten split- gele/groene gedroogd', 'g', 359, 61, 6, 22, 2, 4.7, 16, 'NEVO-online 2025/9.0', 'Peulvruchten', 80, 5.8, NULL, NULL, 0, 0, 0, 0),
	('e8d19d0c-9340-4e29-a524-e8df8aa4ff65', 689, 'Avocado', 'g', 186, 1.8, 0.5, 2, 18.4, 3.1, 5, 'NEVO-online 2025/9.0', 'Groente', 15, 0.5, 26, 0.6, 0, 3, 0, 0),
	('5279c91b-bc2f-49cf-a84f-f7d425a2f8bd', 690, 'Guave (met roze vruchtvlees)', 'g', 75, 10.9, 8.9, 2.6, 1, 5.3, 2, 'NEVO-online 2025/9.0', 'Fruit', 18, 0.3, 22, 0.23, 0, 228, 0, 0),
	('92ac863a-d25c-48ad-95b7-4b833a4c73de', 691, 'Limoen', 'g', 41, 7.7, 1.7, 0.7, 0.2, 2.8, 2, 'NEVO-online 2025/9.0', 'Fruit', 33, 0.6, 11, 0.1, 0, 29, 0, 0),
	('393db066-5ff8-4b95-a61b-d687430eac2a', 692, 'Mango', 'g', 66, 14.3, 13.9, 0.6, 0.2, 1.6, 1, 'NEVO-online 2025/9.0', 'Fruit', 14, 0.2, 11, 0.07, 0, 23, 0, 0),
	('cf560d05-763d-4997-984d-49d004f8680e', 693, 'Papaja', 'g', 39, 7.8, 7.8, 0.5, 0.3, 1.7, 1, 'NEVO-online 2025/9.0', 'Fruit', 20, 0.3, 21, 0.08, 0, 61, 0, 0),
	('4310e3a8-3627-462e-ab3d-735e94781051', 694, 'Tamarinde', 'g', 301, 72, 10, 3, 0, 0.3, 3, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 55, 0.1, NULL, NULL, 0, 6, 0, 0),
	('910c09d4-c548-4bb8-96d0-5b42364dd5cc', 695, 'Meel cassave-', 'g', 354, 82.7, 3, 0.9, 0.5, 7.7, 13, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 75, 4, 34, 0.41, 0, 4, 0, 0),
	('c0d206ca-14ef-4e25-be1f-74f360996a0d', 696, 'Meel mais-', 'g', 363, 76.7, 1.4, 6.1, 1.7, 8.3, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 3, 0.9, 42, 0.76, 0, 0, 0, 0),
	('68f65e4f-0ec8-4498-9239-ce16c55ebaf6', 697, 'Bojo cassavetaart Surinaams', 'g', 214, 31, 16.2, 1.9, 8.6, 2.3, 24, 'NEVO-online 2025/9.0', 'Gebak en koek', 25, 0.8, 17, 0.43, 0.2, 8, 0, 0),
	('79d18ae3-8cd7-4926-9cc9-60b00df63866', 698, 'Rundvlees gezouten rauw Surinaams', 'g', 201, 0, 0, 14.5, 15.8, 0.2, 4800, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 50, 7.9, NULL, NULL, NULL, 0, 0.01, 0),
	('3442b3cc-2776-4bf2-a817-f4882412f0d7', 699, 'Rundvlees gezouten gedroogd Surinaams', 'g', 305, 0, 0, 65, 5, 0, 4800, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 95, 9.7, NULL, NULL, NULL, 0, 0, 0),
	('4c955fd6-e504-412b-8234-1b44f3b89226', 702, 'Garnalen gezouten gedroogd', 'g', 274, 1, 0, 63, 2, 0, 4330, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 680, 4.9, 290, 3.7, NULL, 0, 0.29, 0.2),
	('deb7f589-a929-459f-bd75-606cd86ba06e', 703, 'Bakkeljauw (gedroogde gezouten kabeljauw)', 'g', 355, 0, 0, 82, 3, 0, 7027, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 685, 4.9, NULL, NULL, NULL, 0, 0.35, 0.85),
	('2319c9dc-9dd7-4ef2-a9ef-3e5af2501886', 704, 'Garnalenpasta trassie', 'g', 208, 2.5, 1, 37, 5, 2.7, 14360, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 100, 3.1, 4, NULL, 0, NULL, 0.73, 0.5),
	('987667b0-6f7c-4d89-91c1-b29bf4f550db', 712, 'Rijst zilvervlies- rauw', 'g', 357, 73.5, 1, 8.3, 2.6, 3, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 12, 1.3, 157, 0.8, 0, 0, 0, 0),
	('beedd80b-0880-4fc6-9010-2a9944cc99f2', 713, 'Wafel stroop- gem', 'g', 473, 70.2, 36.7, 3.8, 19.3, 1.6, 256, 'NEVO-online 2025/9.0', 'Gebak en koek', 17, 0.5, 10, 0.31, 0.3, 0, 0, 0),
	('66f3a202-e848-492b-8489-68314e422313', 714, 'Kaas blauwschimmel Roquefort', 'g', 357, 0, 0, 19, 31, 0, 1600, 'NEVO-online 2025/9.0', 'Kaas', 608, 0.4, 27, 3.7, 0.3, 0, 0.02, 0),
	('2e23bd77-6af4-4bea-ac19-9a0641a06197', 716, 'Kaas Saint Paulin/Port Salut', 'g', 341, 0, 0, 21.5, 28.2, 0, 667, 'NEVO-online 2025/9.0', 'Kaas', 627, 0, 32, 4, 0.3, 0, 0.02, 0),
	('d5546e69-9972-44f7-8397-f703d5f503fc', 717, 'Chocolade melk- m hazelnoten', 'g', 562, 50.2, 46.9, 7.7, 35.9, 3.7, 40, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 161, 3.3, 69, 1.3, 0, 2, 0, 0),
	('90ff3661-2751-4b46-a022-b2228d5176c8', 718, 'Kaas Parmezaanse', 'g', 404, 0, 0, 40, 27, 0, 1000, 'NEVO-online 2025/9.0', 'Kaas', 1000, 0.7, 44, 3.6, 0.3, 0, 0.02, 0),
	('31e54b24-b24a-4060-821d-0ef0455b7944', 719, 'Kaas room- zachte Mon Chou', 'g', 316, 2.4, 2.4, 6.8, 31, 0, 240, 'NEVO-online 2025/9.0', 'Kaas', 200, 0.3, 10, NULL, 0.3, 0, 0.02, 0),
	('c7b7020c-006a-467d-9348-c76ee2a255ca', 721, 'Kaas Limburgse', 'g', 283, 2, 2, 21, 21, 0, 1000, 'NEVO-online 2025/9.0', 'Kaas', 700, 0.1, 20, 2, 0.4, 1, 0.01, 0),
	('464493ed-e5c9-45c3-993b-b8c846b6af05', 722, 'Kaas Gruyere', 'g', 433, 1.4, 1.4, 29, 34.5, 0, 500, 'NEVO-online 2025/9.0', 'Kaas', 900, 0.3, NULL, 5.1, 0.3, 0, 0.02, 0),
	('b6c6f87a-853d-468f-a864-a8d075ef9928', 724, 'Kaas Emmentaler', 'g', 387, 0, 0, 29, 30, 0, 450, 'NEVO-online 2025/9.0', 'Kaas', 1020, 0.3, 43, 5.1, 0.3, 1, 0, 0),
	('5193f7c2-6507-4b64-92fd-8ad10c331702', 725, 'Kaas Cheddar', 'g', 415, 0.1, 0.1, 25.5, 34.4, 0, 670, 'NEVO-online 2025/9.0', 'Kaas', 720, 0.3, 25, 2.3, 0.3, 0, 0.02, 0),
	('d102979e-ab84-4239-a177-bc655f7e7f5a', 726, 'Kaas blauwschimmel Bluefort', 'g', 405, 0, 0, 17.9, 37, 0, 1000, 'NEVO-online 2025/9.0', 'Kaas', 600, 0.4, 50, 3, 0.2, 0, 0.02, 0),
	('01ac22d1-37f8-4e5c-a74c-bb9bf34c073e', 727, 'Bonbon m likeur', 'g', 383, 49.2, 46.8, 3.3, 16.6, 3.6, 5, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 27, 1.6, 51, 0.11, 0, 1, 0, 0),
	('05331dd7-7f22-491e-9bbb-e3d90da206a3', 728, 'Kaas room- zachte Boursin', 'g', 411, 3, 3, 7.5, 41, 0, 530, 'NEVO-online 2025/9.0', 'Kaas', 60, 0.3, 5, 3, 0.4, 0, 0, 0),
	('a7e85487-9311-4901-9b15-32512c0f9f53', 729, 'Halvanaise', 'g', 400, 9, 5, 1, 40, 0.2, 750, 'NEVO-online 2025/9.0', 'Hartige sauzen', 24, 0.8, 9, 0.11, 0.1, 0, 0, 0),
	('c2ce1081-37a3-4aa9-b3b2-5a0bf7c93d7a', 736, 'Pudding vanille-', 'g', 89, 13.7, 9.5, 3.9, 2, 0, 49, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 105, 0.3, 11, 0.49, 0.2, 0, 0, 0),
	('5980d21b-6c06-485f-a7ca-dd04f30d1eeb', 737, 'Aardappelpuree instant- gem bereid', 'g', 83, 14.1, 2.3, 2.9, 1.5, 1.1, 70, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 63, 0.3, 17, 0.34, 0, 1, 0, 0),
	('c2c6c992-ddf7-4d87-9394-87cdee162fda', 747, 'Mineraalwater m en z koolzuur gem', 'g', 0, 0, 0, 0, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 3, 0, 1, 0, 0, 0, 0, 0),
	('ece14b69-250e-40fe-8f28-118577530f29', 749, 'Vlaaivulling blik', 'g', 99, 23, 19, 0.5, 0.1, 1.3, 10, 'NEVO-online 2025/9.0', 'Fruit', 10, 0.3, 6, 0.06, 0, 16, 0, 0),
	('4541af9d-b52a-41fb-96a9-da576ef5db98', 750, 'Marshmallows', 'g', 329, 77.3, 63.1, 4.6, 0.1, 0.2, 2, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 18, 1.6, 2, 0, 0, 0, 0, 0),
	('f9cc2320-4f9e-4a77-88b7-645bdd9b2b5c', 751, 'Drop Engelse', 'g', 394, 82, 65, 3.7, 5.2, 2, 57, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 170, 4.2, 76, 0.38, 0, 0, 0, 0),
	('28825716-cf92-4640-90a4-7406ad74c9d3', 752, 'Winegum/fruitgom', 'g', 319, 74.2, 49.2, 5, 0.2, 0.2, 26, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 6, 0.2, 1, 0.07, 0, 0, 0, 0),
	('3af93e6f-c4c1-4730-8a63-1449ed8761e3', 757, 'Soep heldere m soepgroente en vermicelli', 'g', 17, 2.5, 0.7, 0.7, 0.4, 0.6, 295, 'NEVO-online 2025/9.0', 'Soepen', 12, 0.2, 5, 0.12, 0, 7, 0, 0),
	('3eab9ed3-1d3d-498c-888d-3d1133c0b857', 758, 'Soep heldere m vlees (rund/kip)', 'g', 39, 0.3, 0.1, 4.9, 2, 0, 315, 'NEVO-online 2025/9.0', 'Soepen', 6, 0.4, 6, 0.77, 0.1, 0, 0, 0.01),
	('d07ea3b0-362f-46bd-8021-72f06c565b4b', 759, 'Soep heldere m soepgroente', 'g', 10, 1, 0.6, 0.4, 0.3, 0.6, 301, 'NEVO-online 2025/9.0', 'Soepen', 12, 0.2, 4, 0.08, 0, 7, 0, 0),
	('6db6911a-92bc-4b30-8a2b-6b9a99d41453', 760, 'Soep heldere m vlees (rund/kip) en vermicelli', 'g', 46, 1.9, 0.2, 5.1, 2, 0.1, 308, 'NEVO-online 2025/9.0', 'Soepen', 6, 0.4, 8, 0.79, 0.1, 0, 0, 0.01),
	('6363a4dc-0b24-44c1-9007-d0db8f93d130', 761, 'Soep heldere m vlees (rund/kip) en soepgroente', 'g', 36, 0.9, 0.6, 4.1, 1.7, 0.5, 250, 'NEVO-online 2025/9.0', 'Soepen', 11, 0.4, 7, 0.67, 0.1, 6, 0, 0.01),
	('da4c825a-1050-41b8-ab01-2a768ed631bb', 762, 'Soep heldere m vlees (rund/kip), soepgroente en vermicelli', 'g', 42, 2.1, 0.6, 4.4, 1.7, 0.5, 254, 'NEVO-online 2025/9.0', 'Soepen', 11, 0.5, 8, 0.7, 0.1, 6, 0, 0.01),
	('c5bc0148-8b36-4b6d-9fd6-cf137a53a9b0', 763, 'Soep gebonden m soepgroente', 'g', 36, 2.7, 0.6, 0.7, 2.4, 0.7, 298, 'NEVO-online 2025/9.0', 'Soepen', 12, 0.2, 4, 0.09, 0.2, 6, 0, 0),
	('7e702764-847b-4b83-b794-9fcf1dad90fa', 764, 'Soep gebonden m vlees (rund/kip)', 'g', 64, 2.1, 0.1, 4.9, 3.9, 0.1, 311, 'NEVO-online 2025/9.0', 'Soepen', 6, 0.4, 7, 0.74, 0.3, 0, 0, 0.01),
	('16b9bd22-6c8a-435e-97b3-0e5c13714780', 765, 'Soep maaltijd- m peulvruchten z vlees', 'g', 58, 7, 0.9, 3.3, 1, 3.8, 273, 'NEVO-online 2025/9.0', 'Soepen', 28, 0.9, 18, 0.51, 0, 2, 0, 0),
	('347a9da2-6cfb-43c8-aa76-81631abb810f', 766, 'Soep maaltijd- m peulvruchten en vlees', 'g', 99, 9.3, 1.9, 6.3, 3.3, 3.4, 279, 'NEVO-online 2025/9.0', 'Soepen', 28, 0.9, 30, 0.86, 0.1, 2, 0, 0),
	('f0c52551-f615-4e02-943b-0a56cfb9a7d6', 767, 'Mousse chocolade- huishoudelijk bereid', 'g', 301, 27.4, 25.6, 8.9, 16.8, 2.6, 83, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 52, 2.5, 40, 1.34, 0.9, 0, 0.02, 0),
	('ab7b8259-7de8-4199-a389-92348df46377', 782, 'Worst thee-', 'g', 329, 0.5, 0.5, 12, 31, 0, 1000, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 1.3, 2, 0.31, 0.9, 38, 0, 0.01),
	('7cc548ae-263a-4058-bee4-1536b183cd70', 783, 'Worst paling-', 'g', 308, 4, 1.5, 13, 26.6, 0.1, 930, 'NEVO-online 2025/9.0', 'Vleeswaren', 10, 1.5, 11, 2.45, 0.7, 0, 0.03, 0),
	('1495017a-c177-4610-82c5-6b1f5f212dc5', 784, 'Ham achter-', 'g', 134, 2.5, 0.4, 18, 5.7, 0.1, 859, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 0.7, 22, 1.7, 0.1, 25, 0.01, 0.01),
	('f802b2d3-9b9c-4f4e-ae00-99edc69e5ced', 785, 'Ham schouder-', 'g', 133, 2.4, 0.6, 16.4, 6.2, 0.4, 826, 'NEVO-online 2025/9.0', 'Vleeswaren', 9, 0.8, 19, 2.2, 0.1, 27, 0.01, 0),
	('49749d35-768a-43e8-92fb-9b87ff5fd974', 787, 'Ragout m vlees', 'g', 101, 3.9, 0.2, 8.4, 5.7, 0.2, 224, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 11, 0.3, 11, 0.78, 0.5, 0, NULL, NULL),
	('27a5c632-e6b2-4a98-9586-e2224e20aac8', 788, 'Goulash', 'g', 112, 2.5, 1.6, 10.5, 6.6, 0.7, 286, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 18, 1, 17, 1.8, 0.5, 12, NULL, NULL),
	('2645751a-82d7-45c8-8548-6898ac21761c', 789, 'Koek boter-', 'g', 456, 49.7, 25.2, 4.6, 26.1, 1.5, 157, 'NEVO-online 2025/9.0', 'Gebak en koek', 19, 0.5, 9, 0.33, 0.2, 0, 0.03, 0),
	('8f334731-2d6d-44fa-9cdf-67c2772d7a09', 790, 'Amandelspijs m ei', 'g', 446, 45.1, 43.4, 10.3, 24.2, 2.9, 18, 'NEVO-online 2025/9.0', 'Diversen', 125, 1.6, 130, 1.47, 0.1, 3, 0, 0),
	('fe517e80-1ac4-4176-9c57-9dd5e1770eef', 791, 'Soep heldere m vermicelli', 'g', 15, 2.4, 0.3, 0.5, 0.4, 0.1, 377, 'NEVO-online 2025/9.0', 'Soepen', 6, 0.1, 3, 0.06, 0, 0, 0, 0),
	('7e491d61-49a8-4933-9c54-d3913263ea79', 792, 'Soep gebonden m vlees (rund/kip) en soepgroente', 'g', 55, 3.2, 0.5, 2.9, 3.3, 0.6, 250, 'NEVO-online 2025/9.0', 'Soepen', 5, 0.4, 8, 0.56, 0.2, 6, 0, 0.01),
	('c54c4bd3-00fe-479a-89c2-4e43a88e8109', 796, 'Worst incl leverproducten gem', 'g', 343, 2.5, 0.8, 15.7, 29.9, 0.3, 1079, 'NEVO-online 2025/9.0', 'Vleeswaren', 26, 2.3, 14, 2.25, 0.8, 16, 0.02, 0.01),
	('de09d864-68a1-4fbc-acdb-baec39fd9bcc', 797, 'Soep op groentebasis bereid pakje', 'g', 23, 3.3, 1.3, 0.5, 0.8, 0.1, 289, 'NEVO-online 2025/9.0', 'Soepen', 5, 0.1, 4, 0.08, 0.1, 2, 0, 0),
	('c6cf518c-0fe9-421a-8b4c-ec345edd877c', 798, 'Soep op vleesbasis bereid pakje', 'g', 13, 2, 0.1, 0.7, 0.2, 0.4, 304, 'NEVO-online 2025/9.0', 'Soepen', 5, 0.5, 5, 0.12, 0, 0, 0, 0),
	('6473ef12-0611-4a4d-891a-ffee154d188c', 799, 'Soep op peulvruchtenbasis bereid pakje', 'g', 45, 6.2, 0.9, 2.7, 0.5, 2.5, 264, 'NEVO-online 2025/9.0', 'Soepen', 13, 0.8, 12, 0.32, 0.2, 2, 0, 0),
	('681848b4-19f1-40d3-823b-2cf75a36f2f1', 800, 'Soep op groentebasis kant-en-klaar blik/zak/pak', 'g', 47, 5.7, 3.1, 1.3, 1.9, 0.8, 281, 'NEVO-online 2025/9.0', 'Soepen', 18, 0.3, 6, 0.18, 0.1, 4, 0, 0),
	('8278dd01-8db1-4ca0-af13-808bced551eb', 801, 'Soep op vleesbasis kant-en-klaar blik/zak/pak', 'g', 25, 2.5, 0.4, 2, 0.7, 0.2, 292, 'NEVO-online 2025/9.0', 'Soepen', 9, 0.4, 4, 0.12, 0, 0, 0, 0),
	('0baab681-0cc7-4fa5-bcae-0041b8c3a2f3', 802, 'Soep op peulvruchtenbasis kant-en-klaar blik/zak/pak', 'g', 80, 9.5, 2.8, 4, 2.3, 3, 293, 'NEVO-online 2025/9.0', 'Soepen', 21, 0.8, 15, 0.28, 0.2, 1, 0, 0),
	('c19a1fcb-0927-4d29-864e-95e4e5bf9a0a', 804, 'Kaas schapen- vers', 'g', 238, 0, 0, 17, 18.8, 0, 1300, 'NEVO-online 2025/9.0', 'Kaas', 450, 0.7, 25, 2, 0.1, 0, 0, 0),
	('4f85ebb9-7ace-4bc8-943d-76ea3e02373b', 805, 'Kruidenbitter Jagermeister', 'g', 294, 14, 14, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, NULL, NULL, 0, 0, 0, 0),
	('b3110e32-0a02-4123-a6a4-539152d28bae', 807, 'Spread fruit- m zoetstof', 'g', 156, 59.2, 5.4, 0.4, 0.2, 1.2, 5, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 8, 0.4, 8, 0.05, 0, 3, 0, 0),
	('260ab64b-a992-4848-bf2e-dfddf2c59f9a', 809, 'Santen kokoscreme vast', 'g', 686, 12.9, 5.1, 6.8, 67.3, 0.5, 16, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 3, 0.7, 26, 0.32, 0, 0, 0, 0),
	('d700ab96-343a-474a-b9e4-645da28e17cd', 810, 'Filet americain', 'g', 240, 3, 1.3, 14.2, 18.8, 0.9, 713, 'NEVO-online 2025/9.0', 'Vleeswaren', 14, 2, 15, 4.8, 0.9, 12, 0.02, 0),
	('f935f960-9cf2-48bc-a009-b9d88a1d2eeb', 811, 'Pasta volkoren rauw', 'g', 344, 64, 3.7, 13.3, 2.2, 7.5, 9, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 32, 3.2, 82, 1.9, 0, 0, 0, 0),
	('2655d3ce-bfe2-4e29-b6cf-743520ad36d1', 812, 'Room zure', 'g', 134, 3.4, 3.4, 3, 12, 0, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 104, 0, 11, 0.31, 0.1, 1, 0.01, 0),
	('0d95d4f2-265f-4baa-a439-7be633e98726', 813, 'Schol rauw', 'g', 76, 0, 0, 16.4, 1.2, 0, 147, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 17, 0.1, 21, 0.5, 1.1, 0, 0.1, 0.09),
	('88cc89b5-b25a-41b6-a23a-87e0fefa97d1', 814, 'Vissticks gebakken in zonnebloemolie', 'g', 239, 13.9, 1, 16.4, 13, 0.4, 380, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 16, 0.9, 32, 0.58, 1.4, 0, 0.09, 0.18),
	('e9aaf941-c879-4558-aef0-3ee126aa6f96', 815, 'Vissticks onbereid', 'g', 194, 17, 0.5, 13, 8, 0.8, 308, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 26, 0.9, 29, 0.62, 2.7, 0, 0.09, 0.19),
	('e1eab009-e012-4f63-97a7-c9b25cea5a54', 817, 'Schol gebakken', 'g', 194, 2, 0, 22, 10.9, 0, 110, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 101, 0.9, 30, 1, 1.1, 2, NULL, NULL),
	('62a1c8d2-8bf9-4411-8175-e3697891d5eb', 818, 'Lekkerbekje gefrituurd in plantaardige olie', 'g', 210, 8.2, 0.3, 19, 11.2, 0.2, 400, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 101, 0.7, 30, 0.6, 1.4, 0, 0, 0),
	('b70882c3-d767-4ac5-bd78-12d246679115', 819, 'Kabeljauw gekookt', 'g', 105, 1, 0, 23, 1, 0, 108, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 29, 0.5, 26, 0.3, 1.1, 0, 0.12, 0.29),
	('18b8cd6f-6eda-4555-8736-106ee31d40dc', 820, 'Kabeljauw rauw', 'g', 75, 0, 0, 17.5, 0.6, 0, 91, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 12, 0.1, 25, 0.3, 0, 0, 0.07, 0.17),
	('3bd3e7d7-7152-408f-a837-a5942ca3b5a1', 822, 'Bokking bak- gebakken', 'g', 299, 3, 0.2, 21.6, 22.2, 0.1, 483, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 18, 1.1, 24, 0.45, 8, 0, 0.91, 1.01),
	('fe9258cf-e191-4504-ab65-79e372a21a44', 823, 'Peper zwarte/witte', 'g', 332, 52, 0, 11, 3, 26.4, 44, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 437, 21.6, NULL, NULL, 0, NULL, NULL, NULL),
	('2627853f-25d2-476b-9ad3-df6f402bd664', 824, 'Mosterd', 'g', 129, 6.6, 2.7, 6.7, 7.8, 3, 1424, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 84, 2, 88, 1.1, 0, 0, 0, 0),
	('31da42d9-a202-4d45-a08d-0eb1fdc1649a', 825, 'Nootmuskaat', 'g', 536, 45, 0, 6, 36, 4, 16, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 184, 3, NULL, NULL, 0, NULL, NULL, NULL),
	('c3d7d0cb-54e6-4a34-b7ec-73de1b7bd6c9', 826, 'Kaneel', 'g', 316, 56, 0, 4, 3, 24.4, 26, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 1228, 38.1, 61, 1.97, 0, 28, NULL, NULL),
	('b1896ce0-252d-4b27-a524-17d1f0757cae', 827, 'Komijnzaad gedroogd', 'g', 427, 34, 0, 18, 22, 10.5, 168, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 931, 66.4, 370, 4.2, 0, 8, NULL, NULL),
	('3aa758dc-8389-4ee8-9f66-5a166c648c5e', 828, 'Kruidnagel', 'g', 431, 52, 0, 6, 20, 9.6, 243, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 646, 8.7, NULL, NULL, 0, 81, NULL, NULL),
	('e074e40d-f116-420e-8bcf-414a8d27babd', 829, 'Bieslook vers', 'g', 62, 8, 0, 4, 1, 2.3, 3, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 167, 1.3, 32, NULL, 0, 47, 0, 0),
	('2e426ad1-3014-45cc-8996-321ec5333982', 830, 'Knoflook rauw', 'g', 158, 31, 1, 6.4, 0.5, 2.1, 17, 'NEVO-online 2025/9.0', 'Groente', 11, 1.7, 25, 1.16, 0, 0, 0, 0),
	('6e08df8b-cfaf-48aa-b42c-246930fd20cb', 831, 'Kervel vers', 'g', 44, 3.6, 0.6, 4, 1, 2.4, 10, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', NULL, 1.6, NULL, NULL, 0, 35, 0, 0),
	('b365fe28-dd8b-40e8-87ee-9f612b03ab89', 832, 'Gemberwortel', 'g', 81, 15.7, 1.7, 1.8, 0.8, 2, 13, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 16, 0.6, 43, 0.34, 0, 5, 0, 0),
	('af765e47-7948-4d75-8170-cc2c6fa82dd9', 833, 'Appelcarre', 'g', 278, 38.6, 21.6, 3.7, 11.7, 1.7, 165, 'NEVO-online 2025/9.0', 'Gebak en koek', 12, 0.5, 8, 0.15, 1.1, 2, 0, 0),
	('5d6ff47c-ac8d-435d-b0d4-63ca2ee25395', 835, 'Taart kwark-', 'g', 218, 21.4, 14, 5.5, 12.2, 0.5, 93, 'NEVO-online 2025/9.0', 'Gebak en koek', 81, 0.4, 10, 0.39, 1.2, 0, 0, 0),
	('b6bcf2f2-420c-4618-9b81-e7637b0a69e0', 836, 'Koekje zand-', 'g', 479, 53.5, 22.3, 4.6, 27, 1.9, 334, 'NEVO-online 2025/9.0', 'Gebak en koek', 8, 0.5, 9, 0.24, 2.5, 0, 0, 0),
	('90e1adc9-e896-46fd-ad29-5d62d319f0b8', 838, 'Sesamzaad z schil', 'g', 632, 1.8, 1.6, 22.7, 57.4, 8.9, 26, 'NEVO-online 2025/9.0', 'Noten en zaden', 37, 5.8, 335, 5.75, 0, 0, 0, 0),
	('ef33617a-e36f-4970-a9fd-4599e4ccf290', 839, 'Bonen soja- gedroogd', 'g', 418, 15.8, 0, 35.9, 18.6, 22, 5, 'NEVO-online 2025/9.0', 'Peulvruchten', 225, 8.4, 250, 4.3, 0, 0, 0, 0),
	('fc0b9de5-bb44-4864-aebe-b2febe87f97c', 841, 'Zout m toegevoegd jodium', 'g', 0, 0, 0, 0, 0, 0, 39000, 'NEVO-online 2025/9.0', 'Diversen', 2, 0.1, 0, 0.1, 0, 0, 0, 0),
	('d7e2f5bf-0bb3-4133-a98b-4544f5c1dd65', 842, 'Bouillonpoeder', 'g', 197, 17.8, 10.2, 20.2, 5.1, 0, 22283, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 47, 2.8, 44, 0.4, 0, 0, 0, 0),
	('0623c66e-6775-47f8-bd7e-374e33153dd7', 843, 'Broodje worsten- diepvries bereid in oven', 'g', 369, 38, 3, 11, 19, 0.9, 402, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 20, 1.3, 20, 2.17, 0.2, 0, 0, 0);
INSERT INTO public.nutrition_foods VALUES
	('5df9cb28-9078-435f-8df7-9f9b173b808b', 844, 'Dressing naturel z olie', 'g', 32, 7.9, 7.4, 0, 0, 0, 760, 'NEVO-online 2025/9.0', 'Hartige sauzen', 7, 0, 1, NULL, 0, 0, 0, 0),
	('a3bb22b3-2d8e-41b4-b1cf-54b04bcd6dc7', 845, 'Candybar Twix', 'g', 495, 64.6, 48.6, 4.5, 23.9, 1.5, 163, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 109, 1.3, 24, 0.53, 0, 1, 0, 0),
	('69aed66b-1c5b-4802-98d8-0a520390ce98', 847, 'Gierst rauw', 'g', 368, 69.4, 0.6, 11.8, 4.2, 2.6, 0, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 10, 4.8, 100, 3.4, 0, 0, 0, 0),
	('729e6075-0016-4b27-87b7-2f629e376580', 848, 'Grapefruit op siroop blik/glas', 'g', 66, 15.5, 15.5, 0.5, 0, 0.9, 10, 'NEVO-online 2025/9.0', 'Fruit', 17, 0.7, 7, 0.4, 0, 30, 0, 0),
	('2f12a8a0-2ac5-47ec-9715-d1dd6a66da34', 849, 'Venkel rauw', 'g', 17, 2, 2, 1, 0, 2.4, 11, 'NEVO-online 2025/9.0', 'Groente', 70, 1.4, 8, 0.25, 0, 5, 0, 0),
	('e0027957-b3fd-4449-830e-a1e454644a23', 850, 'Groente zoetzuur atjar tjampoer glas', 'g', 42, 7.6, 7, 1, 0.2, 2.4, 406, 'NEVO-online 2025/9.0', 'Groente', 26, 0.1, 4, 0.05, 0, 9, 0, 0),
	('bdada517-8b2e-4909-a096-ff24a43c338d', 851, 'Paprika zoetzuur glas', 'g', 16, 2, 2, 0.9, 0.1, 1.7, 600, 'NEVO-online 2025/9.0', 'Groente', 17, 0.4, 11, 0.18, 0, 47, 0, 0),
	('b166faa6-4fce-4ef5-b3c8-a3096497e3f0', 852, 'Salade selderij- lunch/borrel', 'g', 206, 9.1, 6.5, 1, 17.6, 3.2, 353, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 30, 0.7, 8, 0.13, 0.1, 1, 0, 0),
	('681a330a-a06f-4897-b0ee-1594e86f48c3', 853, 'Gado gado z rijst en z ei', 'g', 103, 5, 3.3, 3.7, 7, 2.3, 149, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 36, 0.7, 28, 0.55, 0, 10, 0, 0.01),
	('01e8fc3d-b425-4a79-9467-1e4645a47a34', 854, 'Taart vruchten- v biscuitdeeg m slagroom', 'g', 228, 21.8, 17.7, 3.1, 14.1, 0.8, 53, 'NEVO-online 2025/9.0', 'Gebak en koek', 46, 0.5, 16, 0.35, 0.2, 6, 0.01, 0),
	('37f69c53-d7ca-4634-a278-9e3559a146be', 855, 'Speculaas gevulde', 'g', 437, 47.1, 28.3, 7.2, 23.9, 2.2, 282, 'NEVO-online 2025/9.0', 'Gebak en koek', 59, 1.3, 57, 0.79, 1.4, 1, 0, 0),
	('baa01713-0ae6-4934-baf3-e92a9dc13718', 856, 'Rosti onbereid', 'g', 123, 21.5, 2.2, 2.5, 2.5, 2.2, 40, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 8, 0.4, 10, 0.37, 0, 5, 0, 0),
	('a0f82be2-bc56-4d7c-9689-0065a1dbbed5', 857, 'Madeira', 'g', 166, 10, 10, 0, 0, 0, 4, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0.4, 10, 0.14, 0, 0, 0, 0),
	('81c5d935-f0b3-4851-9be2-74884043ac54', 858, 'Juspoeder', 'g', 342, 55.2, 5.1, 10.8, 8.2, 2.4, 7356, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 0, 0, NULL, NULL, 0, 0, 0, 0),
	('19d0b702-5db4-4d29-9533-1997e3b4968a', 859, 'Aroma vloeibaar', 'g', 70, 6.4, 4.8, 10.6, 0.1, 0.5, 7800, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 100, 0, NULL, NULL, 0, 0, 0, 0),
	('eab0845c-7e22-49d4-864b-1deb6649d281', 860, 'Aroma strooi-', 'g', 176, 25, 15, 9.9, 3.9, 0.6, 23600, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 60, 3.7, 10, 0.2, 0, 1, 0, 0),
	('1d42e27e-079c-4391-ad6c-7d5d528ad92c', 861, 'Sap bieten-', 'g', 34, 7.7, 7.4, 0.9, 0, 0, 18, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 3, 0.6, 22, 0.3, 0, 3, 0, 0),
	('753f7bfb-b482-43b6-81f9-766bc3899508', 862, 'Milkshake m vers fruit', 'g', 97, 17.2, 16.1, 2.4, 1.9, 0.4, 29, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 82, 0.1, 13, 0.3, 0, 9, 0, 0),
	('a58fc175-6f4d-445b-8bbb-b86fbc8b9261', 863, 'Yoghurt vruchten- volle', 'g', 97, 12.7, 10.8, 3.7, 3.1, 0.6, 46, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 125, 0.1, 12, 0.43, 0, 1, 0, 0),
	('5ef502c5-f613-4081-8340-da743297f887', 865, 'Sate kip- m saus bereid', 'g', 175, 9.1, 6.2, 13.1, 9.3, 1.2, 564, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 20, 1.6, 48, 0.78, 0.1, 0, 0, 0),
	('510074e7-8ab9-431f-8cb4-7e9262ec7e82', 866, 'Fruitgom pectine gesuikerd', 'g', 341, 84.2, 62.8, 0.3, 0.3, 0.7, 62, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', NULL, 0, NULL, NULL, 0, NULL, 0, 0),
	('6b997770-831a-4b08-bbdc-c00f774078c6', 867, 'Lijnzaad', 'g', 477, 13, 0, 19, 31, 34.8, 28, 'NEVO-online 2025/9.0', 'Noten en zaden', 255, 5.7, 181, 7.8, 0, 0, 0, 0),
	('0767d544-b07e-4017-a0b3-92468f6c45a4', 869, 'Meel soja-', 'g', 429, 7.6, 6.8, 39.1, 22.9, 17.9, 0, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 180, 4.8, 220, 4.4, 0, 0, 0, 0),
	('758b89e4-f9c4-497e-9f8d-db85490aa9bd', 870, 'Drink soja- z suiker', 'g', 35, 1, 0.9, 3.4, 1.8, 0.6, 11, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 17, 0.5, 18, 0.35, 0, 0, 0, 0),
	('a571b69b-1a85-40ff-ad56-6a8954ab879a', 871, 'Sojapasta miso', 'g', 130, 6.2, 6, 11.7, 5, 6.6, 5138, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 69, 5.1, 82, 1.4, 0.3, 0, 0, 0),
	('97f8d948-9e1f-485a-ab7d-3a712fc7086b', 872, 'Zonnebloempitten', 'g', 647, 13, 0, 18, 56.5, 7.4, 62, 'NEVO-online 2025/9.0', 'Noten en zaden', 79, 4.9, 363, 5.4, 0, 0, 0, 0),
	('bc904eae-d54a-4395-8d3e-50bc4611fb8a', 873, 'Biscuit meergranen- Liga Evergreen krenten', 'g', 390, 67, 28, 6.9, 9.1, 6.3, 140, 'NEVO-online 2025/9.0', 'Gebak en koek', 270, 8.4, 45, 1.8, 0, 0, 0, 0),
	('55ad9435-76a1-4a03-a249-866d3a23e8e8', 875, 'Appel m schil gem', 'g', 56, 12, 10.4, 0.3, 0.2, 2, 1, 'NEVO-online 2025/9.0', 'Fruit', 4, 0.1, 5, 0.08, 0, 5, 0, 0),
	('02a2e126-3b30-4092-a729-0b7700400ff7', 876, 'Pinda''s gezouten', 'g', 620, 13.2, 5.2, 24.8, 50.5, 6.8, 350, 'NEVO-online 2025/9.0', 'Noten en zaden', 48, 1.7, 188, 2.8, 0, 0, 0, 0),
	('19464e20-7314-46b2-a004-add9305ec76e', 878, 'Croissants uit blik afgebakken', 'g', 421, 46, 5.1, 7, 22.6, 2.6, 490, 'NEVO-online 2025/9.0', 'Brood', 42, 0.9, 34, 0.72, 0, 0, 0, 0),
	('ae247aab-b15a-4004-99c7-046a8a678a94', 879, 'Boter gezouten', 'g', 737, 1.1, 1.1, 0.7, 81.2, 0, 400, 'NEVO-online 2025/9.0', 'Vetten en oliën', 17, 0.1, 2, 0.09, 0.3, 0, 0.08, 0),
	('5edfee8e-ed6c-4f07-ae3b-b91b0b75594b', 880, 'Smeltjus onbereid pakje', 'g', 650, 4, 0.5, 1, 70, 0, 1366, 'NEVO-online 2025/9.0', 'Vetten en oliën', NULL, 0.2, NULL, 0.26, 0, NULL, NULL, NULL),
	('bc97b0a1-4580-4010-a143-e99dc3739655', 882, 'Kaas Kernhemmer 60+', 'g', 443, 0, 0, 18.6, 40.6, 0, 600, 'NEVO-online 2025/9.0', 'Kaas', 600, 0.4, 27, 4, 0.3, 0, 0, 0),
	('1a53f979-02bf-4df0-b6b3-f6601e1a81ac', 883, 'Kaas Old Amsterdam 48+', 'g', 404, 0, 0, 26, 33, 0, 880, 'NEVO-online 2025/9.0', 'Kaas', 871, 0.2, 38, 3.7, 0.3, 0, 0, 0),
	('76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 884, 'Paprika rode rauw', 'g', 25, 4.3, 4.3, 0.8, 0.1, 1.8, 1, 'NEVO-online 2025/9.0', 'Groente', 7, 0.4, 12, 0.32, 0, 150, 0, 0),
	('78711a6c-458d-4acf-8f2f-a48d3863ef41', 885, 'Paprika rode gekookt', 'g', 28, 5.1, 4.2, 0.9, 0.1, 1.7, 2, 'NEVO-online 2025/9.0', 'Groente', 9, 0.4, 10, 0.27, 0, 119, 0, 0),
	('e8ebb365-188b-4986-926c-919d798cbf26', 893, 'Sate varkens- m saus bereid', 'g', 158, 9.3, 5.8, 11.9, 7.9, 1.2, 571, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 20, 0.7, 39, 1.64, 0.2, 0, 0, 0.02),
	('e3d6c99b-d40f-44cb-9d3c-efe527a81cd7', 898, 'Pasteibakje roomboter-', 'g', 570, 43.4, 1, 8.9, 39.6, 2.4, 400, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 15, 0.5, 12, 0.32, 0, 0, 0.04, 0),
	('d09d7298-2f87-49cd-bef2-30655caec4d2', 899, 'Pasteibakje z roomboter', 'g', 566, 43.9, 0.9, 8.4, 39.1, 2.5, 440, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 19, 0.6, 12, 0.3, 0, 0, 0, 0.01),
	('8de4ffcf-e723-4779-90ae-9405b9167484', 901, 'Broodje worsten-', 'g', 382, 34.2, 2.9, 11.8, 21.8, 0.9, 655, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 20, 1.3, 20, 2.17, 0.2, 0, 0, 0),
	('f1dc9aca-d9ee-42fb-a503-c8a36900c6c6', 908, 'Soepballetjes blik', 'g', 189, 3.5, 0.1, 10, 15, 0.2, 650, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 29, 2.1, 12, NULL, NULL, 6, 0, 0),
	('c76c25a5-7695-47ba-ba6d-8af6edac2d25', 912, 'Pudding frambozen- m rode bessensaus', 'g', 104, 17.6, 15.3, 3.4, 2.2, 0, 68, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 98, 0.3, 8, 0.4, 0, 1, 0, 0),
	('abecb676-1ec2-44a9-846c-a68a6b303057', 917, 'Kwark vruchten- halfvolle', 'g', 109, 12.8, 10.7, 5.9, 3.5, 0.8, 30, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 107, 0, 10, 0.4, 0, 0, 0, 0),
	('8c33ed22-0d7b-4169-860c-ed9ef740fc2b', 918, 'Schol gekookt', 'g', 98, 1, 0, 19, 2, 0, 110, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 53, 0.4, 22, 0.6, 1.1, 2, 0.15, 0.15),
	('2b91bcb2-e994-438b-8991-930ecc0be3f7', 919, 'Koolvis (Atlantisch) gekookt', 'g', 114, 0, 0, 25, 1.5, 0, 95, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 10, 0.4, 44, 0.6, 1.4, 0, 0.24, 0.39),
	('e1c025df-a1e6-409e-ae48-d40efbfe48cb', 920, 'Broccoli gekookt', 'g', 27, 0.8, 0, 3.9, 0.3, 2.7, 5, 'NEVO-online 2025/9.0', 'Groente', 33, 0.9, 19, 0.62, 0, 38, 0, 0),
	('41de54ea-857a-4200-baa3-6879f0733b02', 921, 'Broccoli rauw', 'g', 27, 0.7, 0.5, 2.9, 0.7, 3.1, 5, 'NEVO-online 2025/9.0', 'Groente', 38, 0.6, 12, 0.32, 0, 47, 0, 0),
	('9393fcea-e145-4480-b7b0-19c16f6a24b7', 922, 'Courgette rauw', 'g', 18, 2.3, 2.3, 1.3, 0.2, 0.9, 1, 'NEVO-online 2025/9.0', 'Groente', 30, 0.8, 22, 0.3, 0, 16, 0, 0),
	('2f3ef021-88b1-4f40-bf08-288c448f77b2', 923, 'Sap peren-', 'g', 39, 9.5, 9.5, 0.1, 0, 0.1, 3, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0.2, 5, 0.07, 0, 0, 0, 0),
	('ee32076c-825f-4ea3-b017-9cf1754aa5ec', 925, 'Koek ontbijt- volkoren', 'g', 308, 67.7, 36.9, 3.1, 1.7, 4.5, 200, 'NEVO-online 2025/9.0', 'Gebak en koek', 43, 2.7, 50, 0.57, 0.1, 0, 0, 0),
	('cdc315b4-b76c-40c7-a5b3-bedeb06c5aad', 927, 'Kaas 20+ natriumarm', 'g', 264, 0, 0, 36.7, 13, 0, 50, 'NEVO-online 2025/9.0', 'Kaas', 1223, 0.1, 40, 3.8, 0.1, 1, 0, 0),
	('c0f692f9-7e0e-4765-9ffe-5fed34a7f8c4', 928, 'Kaas 40+ natriumarm', 'g', 339, 0, 0, 29.4, 24.6, 0, 50, 'NEVO-online 2025/9.0', 'Kaas', 953, 0.1, 28, 3.8, 0.3, 1, 0, 0),
	('7404bb25-ed49-4b98-bd1e-b8a413acb1ea', 929, 'Chocolade melk- suikervrij', 'g', 485, 47.8, 9, 7.1, 34.7, 6.7, 79, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 250, 4, 100, 0.11, 0, 1, 0, 0),
	('ab49e704-1f0b-48b4-b1c5-98eeecf4b0a3', 930, 'Wijn pleegzusterbloed-', 'g', 154, 14, 14, 0, 0, 0, 7, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 5, 10, 10, NULL, 0, 0, 0, 0),
	('a315b4c6-1b67-426a-9826-07a46f7f905a', 931, 'Kwark vruchten- magere', 'g', 80, 10.3, 8.3, 8.6, 0.2, 0.3, 31, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 110, 0.1, 11, 0.51, 0, 0, 0, 0),
	('14c03499-81d9-473d-8b0b-ae5cc97609bc', 938, 'Pudding griesmeel- m rode bessensaus', 'g', 113, 20.5, 16.2, 2.8, 2.2, 0.1, 92, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 72, 0, 7, 0.28, 0, 1, 0, 0),
	('63fd5da0-ba6d-4bbc-bc44-617e38caad7e', 940, 'Pudding vanille- m aardbeiensaus', 'g', 112, 18.8, 17, 4.1, 2.3, 0, 68, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 101, 0, 8, 0.81, 0, 1, 0, 0),
	('af3bbffe-e040-4e76-817f-9635eaedac62', 943, 'Bitterbal bereid in oven', 'g', 302, 23, 3, 11, 18, 1.9, 726, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 15, 1.2, 17, 1.2, 0, 0, 0, 0),
	('ccb359d5-cbb3-4292-9c84-d21dde018d6c', 944, 'Kroket vlees- bereid in oven', 'g', 204, 20.9, 2.6, 8.9, 9, 1.9, 545, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 15, 1.2, 17, 1.2, 0, 0, 0, 0),
	('8d64331a-8a90-4993-aa93-f88e6e7a288a', 948, 'Rosti bereid z vet', 'g', 149, 22.8, 2.3, 1.9, 5.1, 2.2, 40, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.4, 21, 0.37, 0, 5, 0, 0),
	('1db0da17-20e8-4c1e-a61c-b6c2d736b3bd', 950, 'Gist vers', 'g', 66, 1, 0, 11.4, 0.4, 6.2, 16, 'NEVO-online 2025/9.0', 'Diversen', 25, 5, 59, 3.2, 0, 0, 0, 0),
	('1481a3df-f0ea-4f0a-a53d-15e2a3dcb34d', 951, 'Bonen sperzie- gekookt', 'g', 25, 2.2, 1.2, 1.8, 0.4, 2.9, 2, 'NEVO-online 2025/9.0', 'Groente', 54, 0.8, 27, 0.37, 0, 1, 0, 0),
	('49fb72c5-05d2-48d8-ac05-8079cdb3c51f', 952, 'Kool boeren- diepvries gekookt', 'g', 37, 2.5, 0, 2, 1.6, 2.5, 10, 'NEVO-online 2025/9.0', 'Groente', 150, 1, 8, 0.2, 0, 15, 0, 0),
	('a596ac94-cc0e-469b-8822-c2a0175a29d6', 953, 'Doperwten diepvries gekookt', 'g', 92, 14.8, 1, 6, 0, 4.5, 6, 'NEVO-online 2025/9.0', 'Groente', 32, 1.8, 27, 0.8, 0, 14, 0, 0),
	('53a7c795-4dbf-4087-975e-4d16e6af73c8', 954, 'Bonen sperzie- diepvries gekookt', 'g', 34, 5.4, 1.2, 1.8, 0.1, 2.1, 5, 'NEVO-online 2025/9.0', 'Groente', 69, 0.7, 20, 0.25, 0, 5, 0, 0),
	('5dc91315-5eeb-4f64-a026-097043d27f6c', 957, 'Asperge witte gekookt', 'g', 21, 3, 1, 1, 0.3, 1.2, 5, 'NEVO-online 2025/9.0', 'Groente', 20, 1, 13, 0.7, 0, 10, 0, 0),
	('463fd7b9-2936-4051-9ba3-b8c07bfcee51', 958, 'Biet rode gekookt', 'g', 30, 4.6, 4.6, 1.2, 0.1, 2.9, 62, 'NEVO-online 2025/9.0', 'Groente', 22, 0.3, 13, 0.34, 0, 3, 0, 0),
	('de396fe5-ce95-4522-8f15-6c0064405e70', 959, 'Kool boeren- rauw', 'g', 33, 1.6, 0.4, 3, 0.6, 4.7, 28, 'NEVO-online 2025/9.0', 'Groente', 180, 1, 34, 0.4, 0, 100, 0, 0),
	('3142ef36-f1db-4fd3-a30e-113760328407', 960, 'Schorseneren gekookt', 'g', 84, 17, 17, 1, 1, 1.7, 5, 'NEVO-online 2025/9.0', 'Groente', 60, 1.5, 16, 0.3, 0, 4, 0, 0),
	('a68c72b6-0e6b-4b01-bd66-aea3a7a9ed3c', 961, 'Bonen snij- gekookt', 'g', 23, 1.9, 0, 1.8, 0, 4.2, 2, 'NEVO-online 2025/9.0', 'Groente', 37, 0.5, 18, 0.28, 0, 5, 0, 0),
	('434be2b6-eceb-41d0-87cf-5a94ef45eb5c', 962, 'Bonen tuin- gekookt', 'g', 45, 4, 0, 5, 0, 4.7, 5, 'NEVO-online 2025/9.0', 'Groente', 20, 0.8, 19, 0.7, 0, 30, 0, 0),
	('f9098035-53b7-44e6-b4c9-09185ac6ba85', 963, 'Doperwten gekookt', 'g', 69, 11, 1, 4, 0, 4.5, 10, 'NEVO-online 2025/9.0', 'Groente', 20, 2, 29, 1, 0, 25, 0, 0),
	('834e2961-6870-4ca7-8968-a769cefc23a8', 964, 'Peultjes gekookt', 'g', 33, 5, 0, 2, 0, 2.5, 5, 'NEVO-online 2025/9.0', 'Groente', 40, 0.5, 29, 1, 0, 35, 0, 0),
	('a299a205-4e64-4827-94a0-8b6f7d422c8c', 966, 'Courgette gekookt', 'g', 19, 2.3, 2.3, 1.5, 0.1, 1.1, 1, 'NEVO-online 2025/9.0', 'Groente', 20, 0.5, 22, 0.31, 0, 3, 0, 0),
	('532f73f3-3c17-44c2-a298-8c96cb9fdb77', 967, 'Venkel gekookt', 'g', 17, 2, 2, 1, 0, 2.4, 70, 'NEVO-online 2025/9.0', 'Groente', 70, 1.4, 7, 0.4, 0, 3, 0, 0),
	('c4d0f22a-dd79-4f2f-9689-715a0d593f6f', 969, 'Kapucijners gekookt', 'g', 127, 15.7, 0.6, 9.5, 0.9, 8.9, 3, 'NEVO-online 2025/9.0', 'Peulvruchten', 39, 2.1, 46, 1.56, 0, 0, 0, 0),
	('a3791d1a-76c0-46ba-9b5f-1ca65e24d09f', 970, 'Linzen groene en bruine gekookt', 'g', 99, 11.6, 0, 8.8, 0.7, 5.3, 9, 'NEVO-online 2025/9.0', 'Peulvruchten', 23, 2.9, 34, 1.4, 0, 0, 0, 0),
	('0cd33311-a879-4f30-957f-20da8d3adbd1', 971, 'Bonen soja- gekookt', 'g', 123, 4.6, 0, 10.6, 5.5, 6.5, 3, 'NEVO-online 2025/9.0', 'Peulvruchten', 70, 2.5, 74, 1.27, 0, 0, 0, 0),
	('d1194dcb-7645-42a3-a0e3-2b5fddfb12f5', 972, 'Erwten groene gekookt', 'g', 126, 17.2, 2.4, 8.4, 0.8, 8.2, 5, 'NEVO-online 2025/9.0', 'Peulvruchten', 35, 2, 38, 1.4, 0, 0, 0, 0),
	('d0cbe0b0-3df0-4344-b23d-1186ce3b093e', 975, 'Knackebrod sesam', 'g', 421, 67.8, 3.5, 12.8, 9.8, 5.1, 417, 'NEVO-online 2025/9.0', 'Brood', 100, 2.3, 70, 1.8, 0, 0, 0, 0),
	('57524334-d2b9-480f-abcd-8414d449cd4c', 976, 'Knackebrod lichtgewicht', 'g', 334, 59, 2, 10, 1.5, 22, 400, 'NEVO-online 2025/9.0', 'Brood', 50, 2.7, 110, 2.5, 0, 0, 0, 0),
	('a1ef359b-2f64-423c-a65a-1700d2b5d6dd', 980, 'Sportvoeding reep Isostar Energy Bar', 'g', 399, 72.5, 37.8, 5, 9.3, 3, 245, 'NEVO-online 2025/9.0', 'Gebak en koek', 70, 0.8, 30, 1, 0, 50, 0, 0),
	('031a95a6-e26b-4071-80c8-7500b6a3bdd9', 982, 'Aardappelen z schil gekookt gem', 'g', 83, 17.4, 0.2, 1.9, 0.3, 1.6, 4, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.5, 19, 0.33, 0, 9, 0, 0),
	('7c76cb95-1e2c-4913-b3ef-e5751dd03be2', 995, 'Soep op groentebasis natriumarm bereid', 'g', 22, 4, 1.2, 0.8, 0.2, 0.7, 10, 'NEVO-online 2025/9.0', 'Soepen', 5, 0.1, 4, 0.08, 0.1, 2, 0, 0),
	('2931013d-110f-4a16-a8b3-445d3866b77a', 1007, 'Granaatappel', 'g', 91, 17, 12, 1, 1, 3.4, 1, 'NEVO-online 2025/9.0', 'Fruit', 8, 0.5, 11, 0.4, 0, 7, 0, 0),
	('52e01d43-9756-4332-ad7f-2a14cce2aae0', 1008, 'Toetje m room', 'g', 105, 15.3, 12.5, 2.5, 3.8, 0.2, 58, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 89, 0, 9, 0.3, 0, 0, 0, 0),
	('7b676919-4675-4ccd-b41d-1e3d097fd6b5', 1010, 'Vijgen vers', 'g', 84, 19, 19, 1, 0, 2, 1, 'NEVO-online 2025/9.0', 'Fruit', 54, 0.6, 15, 0.3, 0, 3, 0, 0),
	('28f01405-2305-4a35-a5be-f173c18e102a', 1011, 'Roggebrood volkoren natriumarm', 'g', 201, 37.6, 8.2, 5.6, 1.3, 8.3, 4, 'NEVO-online 2025/9.0', 'Brood', 33, 2.7, 57, 1.5, 0, 0, 0, 0),
	('b7a114ae-5501-421a-a035-8b2501d4fa0d', 1013, 'Paneermeel', 'g', 357, 69.9, 4.1, 11.6, 1.6, 8.1, 340, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 27, 2, 55, 1.3, 0, 0, 0, 0.01),
	('33aec519-f9a3-40fd-988d-fcdd19fc8de1', 1014, 'Rijst zilvervlies- gekookt', 'g', 131, 26.4, 0, 3.1, 1, 2.1, 5, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 16, 0.4, 39, 0.81, 0, 0, 0, 0),
	('09d87984-60c6-49fd-8227-0b4e8a499505', 1015, 'Tarwe gebroken bulgur rauw', 'g', 340, 63.4, 0.4, 12.3, 1.3, 12.5, 17, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 35, 2.5, 164, 1.93, 0, 0, 0, 0),
	('41e57784-a0da-4999-9f9e-d7eec0ca1f08', 1017, 'Tarweroggebrood volkoren', 'g', 234, 40.9, 2.3, 9.7, 1.9, 7.2, 367, 'NEVO-online 2025/9.0', 'Brood', 34, 2, 61, 1.42, 0, 0, 0, 0),
	('7b41ebaa-e63d-4a5b-89a7-99011f09083d', 1018, 'Vlokken rogge-', 'g', 318, 57, 1, 8.1, 1.7, 21.2, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 30, 2.4, 96, 3, 0, 0, 0, 0),
	('f0a6a917-5427-4bbc-a380-437f45293dd7', 1019, 'Grutten boekweit-', 'g', 353, 76.4, 0.3, 7.5, 1.4, 2.3, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 11, 2, 80, 2.5, 0, 0, 0, 0),
	('7089fab8-137e-4555-a86b-72349b21331c', 1020, 'Meel bak- zelfrijzend', 'g', 334, 69.2, 0.3, 9.8, 1, 4.1, 610, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 18, 0.8, 19, 0.48, 0, 0, 0, 0),
	('6b823e53-f9f7-4e82-821a-1c07e294319f', 1021, 'Artisjok rauw', 'g', 49, 9.5, 9.5, 2, 0, 1.5, 47, 'NEVO-online 2025/9.0', 'Groente', 53, 1.5, 22, 0.5, 0, 8, 0, 0),
	('ada08210-1ac8-4459-bb82-a8acc0396af2', 1022, 'Beschuit natriumarm', 'g', 399, 71, 8, 14, 6, 2.3, 37, 'NEVO-online 2025/9.0', 'Brood', 26, 1.8, 25, 0.9, 0, 0, 0, 0),
	('ec671ff2-f4ab-43b5-8885-45856199285c', 1023, 'Bloem rijste- verrijkt m vit B1', 'g', 380, 85.3, 0.4, 7.5, 0.9, 0.5, 6, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 6, 0.2, 27, 1, 0, 0, 0, 0),
	('f5b16a0a-b020-4206-b3cd-ff21f2f6a7ce', 1025, 'Gist gedroogd', 'g', 390, 36, 0, 48, 6, 0, 50, 'NEVO-online 2025/9.0', 'Diversen', 80, 20, 230, NULL, 0, 0, 0, 0),
	('0d75aff1-a02b-480d-b4d0-6cbd41011306', 1056, 'Kiwi groene', 'g', 62, 10.8, 10.3, 0.9, 0.8, 2.3, 3, 'NEVO-online 2025/9.0', 'Fruit', 30, 0.5, 14, 0.21, 0, 79, 0, 0),
	('9a42c5a3-87f0-4603-bd6d-f431c9967177', 1057, 'Kaki / Sharonvrucht', 'g', 77, 18.6, 18.6, 0.5, 0, 0.5, 1, 'NEVO-online 2025/9.0', 'Fruit', 10, 0.1, 11, 0.1, 0, 16, 0, 0),
	('1f4d4d6c-6808-4786-a098-185f61c40836', 1065, 'Glucosepoeder', 'g', 364, 91, 91, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 0, NULL, NULL, 0, 0, 0, 0),
	('b7511612-9545-4eae-b7f8-7867c08d44d2', 1067, 'Orisel-Junior p 100 ml Nutricia', 'ml', 9, 2.2, 2.2, 0, 0, 0, 138, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 0, 0, 0, 0, 0, 0, 0, 0),
	('48dfbff3-73e7-400e-a8f5-608be61a15b0', 1068, 'Orisel p 100 ml Nutricia', 'ml', 9, 2.2, 2.2, 0, 0, 0, 206, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 0, 0, 0, 0, 0, 0, 0, 0),
	('e64ee399-d03b-455c-8ae8-8a3df0302019', 1074, 'Passievrucht', 'g', 52, 5.7, 5.7, 2.6, 0.4, 3.3, 19, 'NEVO-online 2025/9.0', 'Fruit', 11, 1.3, 29, 0.8, 0, 23, 0, 0),
	('dfabd01e-2332-4a61-8d57-1cee18be2d5e', 1076, 'Kefir', 'g', 40, 3.1, 3.1, 3.5, 1.5, 0, 47, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 0, 12, 0.41, 0, 1, 0, 0),
	('f4c96d2f-1303-45a3-8162-7ce2ba8cbb2b', 1087, 'Sla mol- rauw', 'g', 55, 8, 8, 3, 1, 1.2, 76, 'NEVO-online 2025/9.0', 'Groente', 150, 3.1, 36, 1.2, 0, 40, 0, 0),
	('53041dfb-5e70-49ec-bf62-e0bf3b1f864b', 1090, 'Lychee', 'g', 72, 16.1, 16.1, 0.9, 0.1, 1, 1, 'NEVO-online 2025/9.0', 'Fruit', 5, 0.3, 18, 0.18, 0, 23, 0, 0),
	('7f59e951-b3c8-440b-85e1-9710e559142e', 1094, 'Pate/smeerworst vegetarisch obv voedingsgist', 'g', 218, 9.3, 0.5, 4.6, 17.5, 2.8, 580, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', NULL, NULL, NULL, NULL, 0, NULL, 0, 0),
	('7b52954e-4cd1-4a09-a0bb-933f552ea788', 1095, 'Erwten kikker- gekookt', 'g', 138, 15.9, 0.3, 7.6, 3, 8.8, 3, 'NEVO-online 2025/9.0', 'Peulvruchten', 59, 1.8, 42, 1.29, 0, 0, NULL, NULL),
	('54d5d2cc-07ca-45b9-895b-3982cdc54f48', 1096, 'Zalm gerookt', 'g', 188, 0.8, 0, 21.8, 10.8, 0, 1000, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 9, 0.2, 32, 0.42, 4, 0, 0.47, 0.79),
	('63401948-4ec0-43c7-b801-c637bce80576', 1097, 'Kaviaar', 'g', 281, 0, 0, 24, 20.5, 0, 2120, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', NULL, 1, NULL, NULL, NULL, 0, 1.41, 2.29),
	('ab2c6c72-c163-4280-9bb4-2a71082ef75f', 1098, 'Inktvis rauw', 'g', 73, 0, 0, 16, 1, 0, 110, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 27, 0.6, 28, 1.1, 0, 0, 0.11, 0.24),
	('405f0659-9133-4a21-b65f-8648cfbad6d8', 1099, 'Kumquat', 'g', 52, 9.1, 9.1, 0.9, 0.5, 3.8, 6, 'NEVO-online 2025/9.0', 'Fruit', 25, 0.6, 13, 0.1, 0, 39, 0, 0),
	('2e01056f-3a15-433e-bff3-821de7a6361c', 1100, 'Haring in (zoet)zuur', 'g', 208, 0, 0, 16, 16, 0, 818, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 38, 1.4, 5, 0.3, 6.2, 0, 0.25, 0.29),
	('385862e1-6314-46c4-b80b-fa9e2b942eab', 1101, 'Slakken wijngaard-', 'g', 85, 2, 0, 16, 1.4, 0, 70, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 10, 3.5, 48, 1, 0, 0, 0.12, 0),
	('bc5ed075-1dbf-46c4-bf60-904fcb788cc7', 1104, 'Kaas rook- 45+', 'g', 331, 1.8, 1, 21.2, 26.2, 0.1, 1044, 'NEVO-online 2025/9.0', 'Kaas', 603, 0.1, 41, 3, 0.3, 1, 0, 0),
	('db129539-e101-41e0-8643-c098498a2a23', 1105, 'Meloen water-', 'g', 36, 8, 8, 0.5, 0, 0.6, 2, 'NEVO-online 2025/9.0', 'Fruit', 10, 0.4, 8, 0.2, 0, 6, 0, 0),
	('1aeb3306-740f-4d09-89af-3cdbb33d00d2', 1106, 'Meloen suiker-', 'g', 30, 6.3, 6.3, 0.9, 0, 0.6, 20, 'NEVO-online 2025/9.0', 'Fruit', 13, 0.6, 11, 0.17, 0, 32, 0, 0),
	('035051c1-390e-40d4-a8d2-256d91ae7bae', 1108, 'Kaas Rambol', 'g', 291, 2.3, 2.1, 13.6, 25, 0.7, 866, 'NEVO-online 2025/9.0', 'Kaas', 443, 0.4, 33, 2.1, 0, 1, 0, 0),
	('f47f98bc-aa07-4514-b419-4ba0bd95e69b', 1109, 'Kaas smeer- 60+ Kiri', 'g', 330, 2, 2, 8.5, 32, 0, 610, 'NEVO-online 2025/9.0', 'Kaas', 500, 0.1, 9, NULL, 0, 1, 0, 0),
	('7dd06700-29dc-460e-8181-68b66aea5617', 1110, 'Kaas Stilton', 'g', 388, 0.1, 0.1, 21.3, 33.4, 0, 850, 'NEVO-online 2025/9.0', 'Kaas', 285, 0.3, 18, 1.75, 0.2, 0, 0.02, 0),
	('cb4e36d9-ffc8-428c-8395-487670df3eb6', 1111, 'Kaas Camembert 30+', 'g', 223, 0, 0, 24, 14, 0, 900, 'NEVO-online 2025/9.0', 'Kaas', 600, 0.2, 20, 3, 0.1, 1, 0.01, 0),
	('54006030-b06d-471c-a4a1-129890795cc1', 1112, 'Kaas rauwmelkse 48+', 'g', 392, 0, 0, 26, 32, 0, 880, 'NEVO-online 2025/9.0', 'Kaas', 870, 0.1, 30, 4, 0.3, 1, 0, 0),
	('46da90d3-7190-48cc-9b21-3ab2f4056aac', 1113, 'Kaas 48+ natriumarm', 'g', 381, 0, 0, 26.1, 30.7, 0, 50, 'NEVO-online 2025/9.0', 'Kaas', 847, 0.1, 40, 3, 0.3, 1, 0, 0),
	('04fc5417-e622-4e3b-8436-213a9918ece9', 1116, 'Meloen op siroop blik/glas', 'g', 80, 19, 19, 0.5, 0, 1, 15, 'NEVO-online 2025/9.0', 'Fruit', 15, 0.8, 6, 0.16, 0, 12, 0, 0),
	('a6df2b47-7f19-40e9-ac7f-9c0bf73565f9', 1119, 'Doperwten extra fijn natriumarm blik/glas', 'g', 51, 6.5, 3, 4, 0, 4.7, 40, 'NEVO-online 2025/9.0', 'Groente', 36, 1.6, 23, 0.95, 0, 9, 0, 0),
	('6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 1127, 'Sap citroen- vers', 'g', 47, 8, 2, 0.4, 0, 0.3, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 11, 0.1, 7, 0.13, 0, 53, 0, 0),
	('6be6b008-d54a-4406-962e-44781057607c', 1132, 'Sap tomatengroenten-', 'g', 21, 4, 3, 1, 0, 0.4, 365, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 13, 0.3, 27, NULL, 0, 8, 0, 0),
	('3f6f093b-e6f5-439d-bbfd-7c882b846ce0', 1133, 'Champignon natriumarm blik/glas', 'g', 18, 0.2, 0.1, 2.1, 0.4, 2.8, 24, 'NEVO-online 2025/9.0', 'Groente', 20, 0.1, 6, 0.6, 0, 2, 0, 0),
	('13a18dc1-368e-4213-b1aa-d4e60be5d15b', 1134, 'Kruidenbitter Berenburg', 'g', 189, 0, 0, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('fef69ae8-c567-4dda-9e50-e18eb852fddb', 1136, 'Andijvie diepvries onbereid', 'g', 9, 0.3, 0, 1, 0, 1.7, 29, 'NEVO-online 2025/9.0', 'Groente', 54, 0.5, 10, 0.34, 0, 1, 0, 0),
	('ced2e18c-bbc6-47a8-8400-a00cae3bef9c', 1139, 'Doperwten m wortelen diepvries onbereid', 'g', 58, 7.1, 2.2, 3.8, 0.4, 5.2, 10, 'NEVO-online 2025/9.0', 'Groente', 29, 1, 18, 0.5, 0, 10, 0, 0),
	('e3e60762-b6fd-4698-8091-b308b6239169', 1141, 'Groentemix Mexico Melange diepvries onbereid', 'g', 85, 12, 2, 4.5, 0.9, 5.3, 10, 'NEVO-online 2025/9.0', 'Groente', NULL, 1.5, NULL, NULL, 0, 12, 0, 0),
	('61db6a7c-45eb-46d9-9cf8-cfc900360256', 1143, 'Bonen snij- diepvries onbereid', 'g', 28, 3.6, 1.3, 1.9, 0.1, 2.7, 11, 'NEVO-online 2025/9.0', 'Groente', 40, 1, 10, 0.2, 0, 15, 0, 0),
	('709a8a0c-b55b-4813-9868-9ca180267eea', 1144, 'Groente soep- diepvries onbereid', 'g', 25, 3, 2, 2, 0, 2.6, 25, 'NEVO-online 2025/9.0', 'Groente', NULL, 1, 14, NULL, 0, 10, 0, 0),
	('c8d0b2fd-e80d-40d5-8975-b77ab703f484', 1146, 'Spinazie gesneden diepvries onbereid', 'g', 20, 1.1, 0.4, 2.3, 0.3, 2.1, 27, 'NEVO-online 2025/9.0', 'Groente', 125, 1.5, 35, 0.7, 0, 15, 0, 0),
	('b6e74f29-837d-41ba-a607-3b26f247b07f', 1147, 'Spruitjes diepvries gekookt', 'g', 47, 5.6, 1.4, 2.3, 0.7, 4.5, 7, 'NEVO-online 2025/9.0', 'Groente', 29, 1, 13, 0.38, 0, 60, 0, 0),
	('ece4e234-266e-4eed-b97e-ca1a40da0b16', 1148, 'Bonen tuin- diepvries onbereid', 'g', 87, 9.3, 1, 7.5, 0.6, 7.3, 3, 'NEVO-online 2025/9.0', 'Groente', 20, 1, 36, 1, 0, 20, 0, 0),
	('d4aed3b2-9afc-458b-a441-1f4900ffecf8', 1150, 'Aardappelschijfjes/-partjes ed diepvries onbereid', 'g', 134, 21.2, 0.6, 2.5, 3.8, 2.5, 40, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 6, 0.5, 22, 0.36, 0, 13, 0, 0),
	('d5933cfe-4fce-4237-8131-2498920d3207', 1151, 'Vleeswaren >30 g vet gem', 'g', 393, 2.6, 1.1, 16.4, 35.1, 0.5, 1193, 'NEVO-online 2025/9.0', 'Vleeswaren', 26, 2.4, 15, 2.45, 0.9, 11, 0.01, 0),
	('e9bfaa99-280d-4ad1-b1fa-b3f78d1093c4', 1152, 'Worst salami', 'g', 392, 0.9, 0.8, 18.7, 34.8, 0, 1349, 'NEVO-online 2025/9.0', 'Vleeswaren', 35, 1.5, 18, 3, 0.9, 0, 0, 0),
	('048f3818-ee14-4a8a-8c02-4f2e8f5d6910', 1155, 'Gehakt gebraden (vleeswaar)', 'g', 304, 5.6, 2, 12.8, 25.6, 0.3, 951, 'NEVO-online 2025/9.0', 'Vleeswaren', 29, 2.1, 13, 5.24, 1.3, 16, 0.01, 0.01),
	('7d7bd0b5-fbc9-4c27-ab18-a0bf08a35b6b', 1156, 'Sap tomatengroenten- natriumarm', 'g', 21, 4, 3, 1, 0, 0.4, 22, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 19, 0.4, NULL, NULL, 0, 18, 0, 0),
	('fcfe2c73-7bec-49b5-8262-0467c41339cf', 1157, 'Augurk zoetzuur natriumarm', 'g', 17, 2.8, 2.8, 1.1, 0, 0.9, 40, 'NEVO-online 2025/9.0', 'Groente', 16, 0.2, 10, 0.18, 0, 2, 0, 0),
	('962a7e01-a4b3-42e3-8fae-bcdb0b55a503', 1158, 'Ui zilver- zoetzuur natriumarm glas', 'g', 21, 3, 2, 1, 0, 2.7, 40, 'NEVO-online 2025/9.0', 'Groente', 25, 0.6, 5, 0.1, 0, 2, 0, 0),
	('902074de-8e7f-479c-8308-15b7adeff3e2', 1159, 'Ui zilver- zoetzuur z suiker glas', 'g', 21, 3, 0, 1, 0, 2.7, 335, 'NEVO-online 2025/9.0', 'Groente', 25, 0.6, 5, 0.1, 0, 2, 0, 0),
	('e85b87ce-7857-4f63-8c25-652c8b941205', 1160, 'Augurk zoetzuur z suiker', 'g', 14, 1.1, 0.9, 1.2, 0.3, 1.2, 277, 'NEVO-online 2025/9.0', 'Groente', 35, 0.2, 11, 0.3, 0, 0, 0, 0),
	('316a4c0c-0d81-4cc4-aeac-b4444f34fdc1', 1161, 'Komkommerschijven zoetzuur glas', 'g', 9, 1, 1, 0.7, 0, 0.9, 400, 'NEVO-online 2025/9.0', 'Groente', 16, 0.2, 7, 0.18, 0, 2, 0, 0),
	('efdc9c89-7e23-4007-973a-30462ffe26f4', 1162, 'Worst gekookte', 'g', 357, 3.7, 1.1, 11.3, 33, 0, 894, 'NEVO-online 2025/9.0', 'Vleeswaren', 18, 1.3, 11, 1.34, 0.7, 0, 0.03, 0),
	('926dbdc4-dcbb-4f90-b531-119f06cbf05c', 1171, 'Vleeswaren 20-30 g vet gem', 'g', 310, 2.9, 0.7, 13.7, 26.9, 0.2, 935, 'NEVO-online 2025/9.0', 'Vleeswaren', 23, 2.6, 12, 2.31, 0.8, 21, 0.02, 0),
	('b84ebabd-c6ac-49de-b8f5-7cf012a0a329', 1172, 'Vleeswaren 10-20 g vet gem', 'g', 213, 3.2, 0.8, 14.9, 15.5, 0.3, 848, 'NEVO-online 2025/9.0', 'Vleeswaren', 16, 1.6, 14, 2.86, 0.6, 4, 0.01, 0.02),
	('09efa50e-b2e8-4e0c-8e63-700c28e3cca7', 1182, 'Appelmoes z suiker blik/glas', 'g', 48, 10.7, 9.9, 0.2, 0, 1.4, 1, 'NEVO-online 2025/9.0', 'Fruit', 4, 0.1, 3, 0.07, 0, 3, 0, 0),
	('663402e9-8100-4cab-a101-7ea6962c8c48', 1187, 'Bamboespruiten blik/glas', 'g', 33, 6, 0, 2, 0, 0.5, 4, 'NEVO-online 2025/9.0', 'Groente', 33, 0.4, 3, 0.65, 0, 4, 0, 0),
	('4117296a-b217-4fb4-bd4e-5c013eb189ce', 1211, 'Vleeswaren <10 g vet gem', 'g', 144, 2.5, 0.9, 18.4, 6.5, 0.2, 943, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 1.2, 22, 2.36, 0.3, 13, 0.01, 0),
	('c7c519ba-86b0-412e-8693-f32d50afb209', 1212, 'Zout mineraal- natriumarm LoSalt', 'g', 0, 0, 0, 0, 0, 0, 13100, 'NEVO-online 2025/9.0', 'Diversen', 0, 0, NULL, NULL, 0, 0, 0, 0),
	('7e7c8388-a85e-4cd7-a038-efbe881f6f40', 1213, 'Ketjap zout', 'g', 211, 50, 49, 2.8, 0, 0, 5440, 'NEVO-online 2025/9.0', 'Hartige sauzen', 60, 5, NULL, NULL, 0, 0, 0, 0),
	('a07d9155-9ad9-4538-b0b0-2a8dd8503159', 1214, 'Ketjap zoet natriumarm', 'g', 238, 55, 55, 4.5, 0, 0.1, 80, 'NEVO-online 2025/9.0', 'Hartige sauzen', 60, 5.3, NULL, NULL, 0, 0, 0, 0),
	('1d143628-0f18-4a6b-8dad-f0067ea07e2e', 1215, 'Ketjap zoet', 'g', 234, 55, 55, 3.5, 0, 0, 2841, 'NEVO-online 2025/9.0', 'Hartige sauzen', 47, 5.3, 37, 0.2, 0, 0, 0, 0),
	('5508ac8a-c0f1-4727-9cd1-8325e6275fae', 1216, 'Smaakversterker mononatriumglutamaat Ve-tsin', 'g', 0, 0, 0, 0, 0, 0, 14000, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', NULL, 0, NULL, NULL, 0, 0, 0, 0),
	('6cbbe985-ead5-46c0-a57c-5be8fa388a89', 1220, 'Basilicum gedroogd', 'g', 244, 10.1, 1.7, 23, 4.1, 37.7, 76, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 2240, 89.8, 711, 7.1, 0, 1, 0, 0),
	('3b55eec0-51f6-4d49-98ff-65afa2252bd8', 1221, 'Chilipoeder', 'g', 373, 32, 0, 12, 17, 22, 30, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 278, 14.2, NULL, NULL, 0, 64, NULL, NULL),
	('f0532c1f-9587-4275-b89e-f4c41c163be2', 1223, 'Kerrie djawa', 'g', 370, 36.5, 0, 12, 14, 25, 52, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 530, 29.6, NULL, NULL, 0, NULL, NULL, NULL),
	('4a1f47c6-55f1-4608-86b0-e172794bf296', 1224, 'Kervel gedroogd', 'g', 303, 38, 0, 23, 4, 11.3, 83, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 1346, 32, NULL, NULL, 0, NULL, NULL, NULL),
	('4140a33b-e73f-40ac-99d0-3c15aa046b84', 1225, 'Peper cayenne- rood', 'g', 379, 32, 0, 12, 17, 24.9, 30, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 148, 7.8, NULL, NULL, 0, 76, NULL, NULL),
	('fdbb5f58-b28f-4378-bb78-9d1c6bb24060', 1226, 'Majoraan gedroogd', 'g', 319, 42, 0, 13, 7, 18.1, 77, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 1990, 82.7, NULL, NULL, 0, 51, NULL, NULL),
	('96c0d1af-365d-4ae5-9ccb-c031daa7c8ae', 1227, 'Mosterd natriumarm', 'g', 126, 3.1, 0, 6.5, 9.5, 1, 25, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 84, 2, 88, 1.1, 0, 0, 0, 0),
	('f67ac7ac-5063-454e-a03e-773e527b7e3f', 1228, 'Oregano gedroogd', 'g', 360, 49, 0, 11, 10, 15, 15, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 1576, 44, NULL, NULL, 0, NULL, NULL, NULL),
	('0335d990-6aee-4a17-9cef-a9113fcce874', 1229, 'Paprikapoeder', 'g', 359, 35, 0, 15, 13, 20.9, 34, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 177, 23.6, NULL, NULL, 0, 71, NULL, NULL),
	('b60815b8-bde9-4ca9-ba04-ec02b45007d5', 1230, 'Peterselie gedroogd', 'g', 309, 41, 0, 22, 4, 10.3, 180, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 1468, 97.9, NULL, NULL, 0, 122, 0, 0),
	('03e5cea3-0088-4547-a824-33ba71dc8b90', 1231, 'Rozemarijn gedroogd', 'g', 374, 46, 0, 5, 15, 17.6, 50, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 1280, 29.2, NULL, NULL, 0, 61, NULL, NULL),
	('7ade49cc-df77-4148-862e-2f587b323b47', 1232, 'Sambal oelek', 'g', 36, 4.9, 3.5, 1.6, 0.7, 1.9, 4560, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 18, 0.5, 12, 0.2, 0, 144, 0, 0),
	('9ebf7019-9d53-48a1-955a-0f948da244e8', 1233, 'Sambal oelek natriumarm', 'g', 50, 4, 0, 3, 2, 1.9, 50, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', NULL, 0.5, NULL, NULL, 0, NULL, NULL, NULL),
	('7e36db26-377c-4088-9c45-dc88c1c0d134', 1234, 'Sambal gebakken', 'g', 250, 15.5, 12.4, 4.4, 18.5, 1.9, 2904, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 18, 0.5, NULL, NULL, 0, NULL, 0, 0),
	('337b2383-3af0-412f-b234-b2fc68772a6e', 1235, 'Selderij blad- vers', 'g', 16, 2, 2, 1, 0, 1.8, 80, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 80, 0.1, 10, 1.2, 0, 60, 0, 0),
	('dd0d2953-5a76-4b25-855b-e7c9d29badf9', 1236, 'Serehpoeder', 'g', 216, 30, 30, 5, 3, 24.4, 20, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 206, NULL, NULL, NULL, 0, NULL, NULL, NULL),
	('2c7b0ae2-79d9-4023-9f69-d241466626ae', 1238, 'Worst lever- hausmacher', 'g', 266, 5.2, 1, 15.4, 20.4, 0, 721, 'NEVO-online 2025/9.0', 'Vleeswaren', 13, 5.4, 12, 2.44, 0.9, 0, 0, 0),
	('eb21d3df-7461-42e8-8092-bf3f185b3256', 1239, 'Worst smeerlever-', 'g', 319, 3, 0.2, 12.3, 28.6, 0.3, 680, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 5.6, 10, 2.3, 0.9, 32, 0.03, 0),
	('d7e6cee0-c04c-4869-84ed-864b7d4ca4e9', 1242, 'Vruchten op eigen sap blik/glas', 'g', 48, 10.3, 10.3, 0.6, 0.1, 1.7, 1, 'NEVO-online 2025/9.0', 'Fruit', 10, 0.4, 7, 0.07, 0, 4, 0, 0),
	('509ab315-362f-4135-8157-e7db77675ef0', 1253, 'Knackebrod vezelrijk', 'g', 350, 48, 2.5, 13, 6.5, 23.9, 495, 'NEVO-online 2025/9.0', 'Brood', 160, 5.7, 190, 4, 0, 0, 0, 0),
	('cff02fe0-3097-4a89-97f4-7413b6f405d2', 1255, 'Makreel in water blik', 'g', 257, 0, 0, 18.6, 20.3, 0, 416, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 20, 2, 13, 2.7, 4.3, 0, 1.13, 2.13),
	('1ee3f8dc-24a6-4e45-937f-ffcc5dccc611', 1256, 'Marsepein', 'g', 420, 64.2, 60.8, 5.3, 15.3, 2.2, 13, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 88, 1.1, 96, 0.97, 0, 0, 0, 0),
	('c1061192-50d3-4d31-8c0a-40af9a511369', 1260, 'Mayonaiseproduct m yoghurt', 'g', 281, 13, 10, 0.9, 25, 0.3, 680, 'NEVO-online 2025/9.0', 'Hartige sauzen', 10, 0.2, 2, 0.26, 0, 0, 0, 0),
	('a2d7ebcc-05b6-4138-ab0c-915caf00aa3b', 1261, 'Zuigelingenvoeding Nutrilon 1 p 100 ml', 'ml', 66, 7.3, 7.3, 1.3, 3.4, 0.6, 17, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 55, 0.5, 5, 0.51, 1.2, 9, NULL, 0.01),
	('0574fa64-2395-44c0-a72d-ccffe4c59886', 1278, 'Babyvoeding maaltijd 6 mnd', 'g', 72, 8.7, 2.7, 3.3, 2.3, 1.9, 39, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 36, 0.6, 18, 0.65, NULL, 3, NULL, NULL),
	('bd6e4846-d5ff-4c97-9778-f21a8c05ec83', 1279, 'Kindervoeding maaltijd 15 mnd', 'g', 70, 9, 1.4, 3.6, 1.9, 1.5, 57, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 29, 0.8, 16, 0.51, NULL, 2, NULL, NULL),
	('629ae4a2-8c6f-4948-8ef2-70ff9bb3fe62', 1280, 'Babyvoeding fruit 4 mnd', 'g', 58, 13, 11.4, 0.5, 0.1, 1.8, 3, 'NEVO-online 2025/9.0', 'Fruit', 40, 0.3, 11, 0.14, 0, 13, 0, 0),
	('0a4fea93-3a7b-406b-948f-5201fb66a825', 1281, 'Babyvoeding groente 4 mnd', 'g', 50, 9.7, 5.9, 1.3, 0.2, 2.3, 16, 'NEVO-online 2025/9.0', 'Groente', 31, 1, 18, 0.34, 0, 18, 0, 0),
	('424b5c95-03aa-4bc7-8951-0027b4196041', 1294, 'Vruchtendrank m zuivel Taksi m suiker', 'g', 32, 7.9, 7.9, 0.1, 0, 0, 12, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 11, 0, 2, 0.02, 0, 13, 0, 0),
	('596e2ca5-278b-46be-910c-1f0de3710c3d', 1297, 'Spek rook- vet bereid', 'g', 505, 0, 0, 25, 45, 0, 1176, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', NULL, 0.4, NULL, NULL, 1, 0, 0, 0),
	('a9fad7a0-1137-48b5-928e-9317e0b2aaac', 1302, 'Kaas room- zachte Paturain', 'g', 354, 2.3, 2.3, 7, 35.3, 0, 440, 'NEVO-online 2025/9.0', 'Kaas', 98, 0.7, NULL, NULL, 0.4, 0, 0, 0),
	('4a93a0fc-20b8-4856-895e-17f3396a907f', 1305, 'Kip z vel rauw', 'g', 139, 0, 0, 20.5, 6.3, 0, 92, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 0.8, 25, 1.37, 0.3, 0, 0.02, 0.05),
	('97f088f4-d7e3-4826-97fb-c164b21843d1', 1306, 'Kip soep- m vel rauw', 'g', 247, 0, 0, 19, 19, 0, 70, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 0.8, 21, 1.37, 0.3, 0, 0.05, 0.17),
	('ceb8f563-bece-4a71-b23d-7a94cbd98f1b', 1310, 'Scholfilet gebakken/gestoofd', 'g', 112, 0.5, 0, 18.9, 3.8, 0, 110, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 74, 0.3, 22, 0.68, 2, 0, NULL, NULL),
	('f014d25d-ba9b-42ed-aa07-5bd51a4aa7e9', 1311, 'Hagelslag chocolade- gem', 'g', 449, 69.3, 62.9, 5.7, 15.3, 5.2, 37, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 70, 6.5, 96, 1.19, 0, 0, 0, 0),
	('ef6cad7f-525f-4e71-86af-8884eabd895d', 1312, 'Cracker luchtige Cracottes natural', 'g', 381, 75, 6.3, 12, 2.8, 4.1, 713, 'NEVO-online 2025/9.0', 'Brood', 42, 4.4, 32, 0.5, 0, 0, 0, 0),
	('6db35760-5bcb-4ab3-8919-43fb92d54c91', 1314, 'Ei kippen- gebakken', 'g', 220, 0.9, 0.9, 14.4, 17.6, 0, 160, 'NEVO-online 2025/9.0', 'Eieren', 59, 2.3, 13, 1.3, 1.4, 0, NULL, NULL),
	('1ee94a65-7f3b-4293-8c7f-858b6bef54c4', 1315, 'Kabeljauwfilet gebakken/gestoofd', 'g', 118, 0.6, 0, 21.5, 3.3, 0, 108, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 13, 0.2, 27, 0.5, NULL, NULL, NULL, NULL),
	('e1ad68f9-637e-47f0-8619-ab4b91faca89', 1317, 'Kip/bout z vel gegrild', 'g', 188, 0.6, 0, 28.5, 7.9, 0, 92, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 0.8, 26, 1.5, 0.7, 0, 0, 0),
	('400faaee-1e25-49e0-a6dc-ceb4d9423b2a', 1321, 'Biscuit haver- Liga HaverKick', 'g', 397, 65, 31.8, 5, 12, 4.7, 132, 'NEVO-online 2025/9.0', 'Gebak en koek', 340, 7.9, 50, 1.5, 0, 0, 0, 0);
INSERT INTO public.nutrition_foods VALUES
	('11d78b7d-d824-40e7-a742-7e9d48b94b67', 1326, 'Gehakt hoh rul gebakken', 'g', 317, 0.4, 0.4, 30.1, 21.6, 0.6, 312, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 29, 2.1, 31, 5.24, 1.3, 6, 0.01, 0.01),
	('8b523ead-6823-4578-aa27-37f973696930', 1338, 'Ontbijtproduct Olvarit pap tarwe en rogge 8+ mnd', 'g', 376, 72, 5.4, 11.6, 2.1, 11.1, 4, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 28, 2.8, 109, 2.4, 0, 1, 0, 0),
	('432bd7bf-9bbc-4d39-8c60-ac1b0c63725b', 1356, 'Biscuit meergranen- Liga Evergreen ov smaken', 'g', 387, 68, 32, 6.4, 8.6, 6.3, 136, 'NEVO-online 2025/9.0', 'Gebak en koek', 260, 8, 45, 0.2, 0, 0, 0, 0),
	('a92b0e0f-dc44-4047-b3b6-c8949eb2713f', 1361, 'Tarwebrood wit Turks', 'g', 250, 49.3, 2.1, 8.5, 1.5, 3, 477, 'NEVO-online 2025/9.0', 'Brood', 23, 1.1, 19, 0.59, 0, 0, 0, 0),
	('ca3044c3-0c54-4355-9e3a-1756f5781a36', 1364, 'Turks fruit', 'g', 372, 92.9, 69, 0, 0, 0.3, 25, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 4, 0.2, 2, 0.04, 0, 0, 0, 0),
	('359c5885-cff9-4bf1-a7b8-bd0741375e2a', 1365, 'Baklava', 'g', 461, 49.2, 39.6, 10.4, 24.5, 1, 149, 'NEVO-online 2025/9.0', 'Gebak en koek', 98, 1.5, 95, 1.12, 0.2, 0, 0.01, 0),
	('e9d87d58-58b1-41f3-bc1c-6c10a8e9f2fe', 1366, 'Tulumba tatlisi gefrituurde soesjes Turks', 'g', 391, 54.8, 31.9, 4.4, 16.9, 1.1, 53, 'NEVO-online 2025/9.0', 'Gebak en koek', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('1006d87e-b10b-496b-b860-935317a2e8fc', 1367, 'Worst droge sucuk Turks', 'g', 446, 6.7, 0, 20.4, 37.5, 0, 1522, 'NEVO-online 2025/9.0', 'Vleeswaren', 29, 3.2, NULL, NULL, 0.9, 0, 0.03, 0),
	('0b852e09-6a77-4731-859b-0ea0af4c040e', 1368, 'Worst salam Turks', 'g', 271, 6.5, 0, 14.8, 20.6, 0, 1102, 'NEVO-online 2025/9.0', 'Vleeswaren', 29, 2.2, NULL, NULL, 0.9, 0, 0.02, 0),
	('c32b990c-7946-4d54-b6a8-59e759412b15', 1369, 'Kikkererwten geroosterd leblebi Turks', 'g', 400, 53.6, 4.8, 21.3, 8.1, 13.7, NULL, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 59, 1.8, NULL, NULL, 0, 0, 0, 0),
	('548ba96a-5784-45f7-a38a-650058b5a5ee', 1370, 'Druivenblad glas', 'g', 33, 1.8, 1.8, 3.3, 0, 6.3, 7158, 'NEVO-online 2025/9.0', 'Groente', 390, 2.3, NULL, NULL, 0, 15, 0, 0),
	('68cacf95-2fae-4be1-83b7-04e3bd9f8b68', 1371, 'Tafelzuur tursu Turks', 'g', 24, 3.9, 3.9, 0.6, 0, 2.9, 987, 'NEVO-online 2025/9.0', 'Groente', NULL, 0.2, NULL, NULL, 0, NULL, 0, 0),
	('701e783c-a6e4-479c-a146-b41a71fb4d38', 1375, 'Gehakt runder- kofte Turks bereid', 'g', 251, 8.2, 0, 25.8, 12.6, 0.7, 734, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 18, 3.4, NULL, NULL, 0.5, NULL, NULL, NULL),
	('3d895fb8-fee4-429d-88ec-df9aab030911', 1376, 'Gehakt schapen- kofte Turks bereid', 'g', 203, 3.8, 0, 22.6, 10.6, 0.9, 787, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 14, 2.6, NULL, NULL, 0.4, NULL, NULL, NULL),
	('8de7e272-419c-4586-8b4c-576cce6024a9', 1377, 'Groenteschotel m vlees turlu Turks bereid', 'g', 74, 6.8, 4.7, 4.1, 2.9, 1.9, 346, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 14, 0.5, NULL, NULL, NULL, 2, NULL, NULL),
	('837b9fe2-107a-4604-be2e-e92df76bc648', 1380, 'Dessert soja- verrijkt m calcium en vitamines', 'g', 85, 13.4, 10.5, 3.1, 1.9, 0.9, 55, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 120, 0.4, 15, 0.23, 0.8, 0, 0, 0),
	('bf5ca8f9-e340-4dfd-8921-c983d0dd3cc6', 1381, 'Drink soja- m suiker verrijkt m calcium en vitamines', 'g', 37, 3, 2.8, 3, 1.4, 0.4, 32, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 110, 0.3, 14, 0.22, 0.7, 0, 0, 0),
	('c797d677-fd0e-4ab2-8bb7-dc4be068001b', 1382, 'Kaas 30+ gem', 'g', 280, 0, 0, 30.1, 17.7, 0, 676, 'NEVO-online 2025/9.0', 'Kaas', 1021, 0.2, 40, 4.17, 0.2, 0, 0, 0),
	('91937f1d-e43d-4d01-8d2e-adef4ab83039', 1389, 'Drop gem', 'g', 333, 73.2, 49.9, 8.4, 0.4, 1.5, 126, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 129, 3.4, 36, 0.29, 0, 0, 0, 0),
	('e5a63a25-08bf-4995-8108-b3a63b94b24f', 1390, 'Gehaktbal runder- m ei gebakken', 'g', 308, 5.2, 0.4, 27, 19.8, 0.6, 206, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 19, 3, 32, 5.97, 1.7, 5, 0, 0),
	('218b8748-c8be-42a5-944c-794daeb67630', 1391, 'Spek mager bereid', 'g', 424, 0.3, 0, 25.7, 35.5, 0, 102, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 0.8, 23, 2.3, 1.2, 0, 0, 0),
	('acce9d95-8933-4752-80bf-0bb6ce8a0212', 1392, 'Kipfilet bereid', 'g', 158, 0, 0, 30.9, 3.8, 0, 53, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 0.7, 35, 0.74, 0.2, 0, 0, 0),
	('a0caa91b-18e4-491d-b6e6-4fdd0a9b1cf2', 1393, 'Ui gebakken in plantaardige olie', 'g', 58, 5.4, 5.4, 1.3, 3, 2.2, 27, 'NEVO-online 2025/9.0', 'Groente', 26, 0.3, 9, 0.18, 0.2, 5, 0, 0),
	('8bfdf54e-58fe-4fa8-ae22-6ea5a7fcce0a', 1395, 'Roggebrood volkoren/roggetarwebrood bruin gem', 'g', 196, 36.1, 7.9, 5.8, 1.3, 8.2, 297, 'NEVO-online 2025/9.0', 'Brood', 33, 2.6, 57, 1.49, 0, 0, 0, 0),
	('20c2cc2e-2b54-4517-a90f-b181e9873e4f', 1397, 'Tomaat gestoofd', 'g', 59, 1.9, 1.9, 0.9, 5.1, 1.3, 2, 'NEVO-online 2025/9.0', 'Groente', 10, 0.2, 10, 0.1, 0.5, 11, 0, 0),
	('c953b58b-5a14-4c61-95a8-d8464c13f6d9', 1398, 'Kool boeren- glas', 'g', 25, 0.9, 0.2, 2.4, 0.6, 3, 100, 'NEVO-online 2025/9.0', 'Groente', 159, 0.6, 13, 0.48, 0, 25, 0, 0),
	('da76d6bb-da21-4f37-9680-6b623c664034', 1399, 'Sla ijsberg- rauw', 'g', 14, 1.4, 1.4, 1, 0.2, 1.2, 17, 'NEVO-online 2025/9.0', 'Groente', 21, 0.3, 10, 0.28, 0, 0, 0, 0),
	('f961a924-cde2-445a-9293-6ce8f78f5475', 1400, 'Runderbiefstuk rauw', 'g', 108, 0, 0, 22.9, 1.8, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 2.3, 28, 3.99, 0.5, 0, 0, 0),
	('4d67544e-5743-4344-9bf8-e45a506308f6', 1401, 'Runderbiefstuk v de haas rauw', 'g', 116, 0, 0, 23.7, 2.3, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 1.9, 26, 4.31, 0.5, 0, 0, 0),
	('993e7b6e-d0db-40e9-aa88-ab9ba8cac719', 1402, 'Runderentrecote rauw', 'g', 165, 0, 0, 23, 8.1, 0, 54, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 1.7, 26, 3.85, 0.5, 0, 0, 0),
	('1eb56dbc-5e7b-4693-8346-2d3bb4007ada', 1404, 'Runderbaklappen rauw', 'g', 103, 0, 0, 21.2, 2, 0, 57, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 2.1, 26, 4.6, 0.4, 0, 0, 0),
	('006a3e67-02bb-495a-8cba-42d497399ab4', 1405, 'Gehakt runder- rauw', 'g', 225, 0.2, 0.2, 18.9, 16.5, 0.3, 110, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 2, 20, 4.33, 0.7, 8, 0, 0),
	('0ad7825a-3897-429e-97bd-5527380c1b9b', 1406, 'Runderklapstuk rauw', 'g', 137, 0, 0, 19.8, 6.4, 0, 63, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 1.7, 25, 3.96, 0.5, 0, 0, 0),
	('cc4403c8-8861-4e38-af11-1cd2f4de3ca5', 1407, 'Lever runder- rauw', 'g', 129, 1.9, 0.4, 21, 4.2, 0, 75, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 6, 21, 4.1, 0.7, 19, 0.01, 0.01),
	('ea49f5ba-99b0-4fb4-a59c-17518f90ca73', 1408, 'Runderpoulet rauw', 'g', 106, 0, 0, 22.1, 2, 0, 67, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 1.9, 26, 4.31, 0.5, 3, 0, 0),
	('de1332ab-7b17-4dd7-915a-5a0b9feb341e', 1409, 'Runderrollade rauw', 'g', 109, 0.2, 0.2, 23.2, 1.7, 0.3, 391, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 1.5, 28, 4.14, 0.4, 1, 0, 0),
	('83b24140-6933-40c7-9366-5b1b3ff4ed74', 1410, 'Runderrosbief rauw', 'g', 122, 0, 0, 22.9, 3.4, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 2, 26, 3.47, 0.5, 0, 0, 0),
	('0a07bdc4-9727-404f-9e8a-579fb320bdfa', 1411, 'Runderschenkel rauw', 'g', 117, 0, 0, 22.6, 3, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 1.9, 26, 4.31, 0.4, 0, 0, 0),
	('5d4a550e-1643-438f-94de-5512d707c0f3', 1412, 'Runderriblappen rauw', 'g', 166, 0, 0, 20.1, 9.5, 0, 63, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 2.1, 21, 6.61, 0.5, 0, 0, 0),
	('3ed0be81-fb9e-45f8-b113-51a27997d24a', 1413, 'Runder doorregen lappen rauw', 'g', 147, 0, 0, 20.6, 7.2, 0, 67, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 2, 22, 6.58, 0.4, 0, 0.01, 0),
	('2a358d8f-d384-4917-bea0-564d95ce7014', 1414, 'Rundersukadelappen rauw', 'g', 135, 0, 0, 21.3, 5.5, 0, 70, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 2.4, 22, 6.57, 0.4, 0, 0.01, 0),
	('3b6b46d3-b08d-41a1-a3cb-6859b42743c2', 1415, 'Rundertartaar rauw', 'g', 137, 0.3, 0.3, 21.1, 5.7, 0.1, 84, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 2.5, 24, 4.77, 0.6, 14, 0, 0),
	('89083962-834b-40db-a193-c2a1c5da1963', 1416, 'Rundertong rauw', 'g', 188, 0, 0, 17.3, 13.2, 0, 80, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 2.5, 18, 3.4, 0.3, NULL, 0, 0),
	('b348cff6-b6c9-4323-8bbf-8ac9e4a83044', 1417, 'Varkensbraadworst rauw', 'g', 226, 0.6, 0.5, 16.8, 17.2, 0.3, 643, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 0.9, 20, 2.29, 0.7, 24, 0, 0.01),
	('3e86f367-6fac-40a0-92a8-bf10097677a7', 1418, 'Varkensfiletlappen rauw', 'g', 128, 0, 0, 23.3, 3.9, 0, 51, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 0.4, 28, 1.55, 0.3, 0, 0, 0),
	('0bc260a4-7084-4abb-a6ca-fbf4b991a886', 1419, 'Varkensfricandeau rauw', 'g', 120, 0, 0, 22.9, 3.2, 0, 54, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 1.1, 24, 1.74, 0.3, 0, 0, 0),
	('0323ad56-c909-42e0-a5bb-d0d8b097b21a', 1420, 'Varkenshamlappen rauw', 'g', 114, 0, 0, 22.2, 2.8, 0, 54, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 0.8, 28, 2.37, 0.3, 0, 0, 0),
	('ea836ec2-804e-4843-9eba-6b73d256faf0', 1421, 'Gehakt varkens- rauw', 'g', 177, 0.3, 0.3, 20.1, 10.7, 0, 184, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 0.9, 25, 2.27, 0.4, 20, 0.01, 0.01),
	('ec206e2b-0c3d-4158-9177-1f8a445e9408', 1422, 'Varkenshaas rauw', 'g', 105, 0, 0, 22.4, 1.7, 0, 91, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 0.7, 28, 1.74, 0.3, 0, 0, 0),
	('f326ee88-5194-4047-aa44-7a5042f266ca', 1423, 'Varkenshamschijf rauw', 'g', 191, 0, 0, 19.8, 12.4, 0, 62, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 0.4, 23, 3.03, 0.3, 0, 0, 0),
	('a99efd43-582b-45f4-bd26-0e39dad88ca0', 1424, 'Varkenshaaskarbonade rauw', 'g', 156, 0, 0, 23.2, 7, 0, 51, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 0.5, 28, 1.61, 0.3, 0, 0, 0),
	('096f00c3-04f9-4ebc-804b-fd068d90fe5c', 1425, 'Varkensschouderkarbonade rauw', 'g', 186, 0, 0, 19.1, 12.2, 0, 62, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 1, 23, 3.03, 0.3, 0, 0, 0.01),
	('df21f43b-b6ef-4c12-96c9-a2868ea8e840', 1426, 'Lever varkens- rauw', 'g', 129, 0.2, 0.2, 21.3, 4.8, 0, 114, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 17.8, 22, 7.69, 1, 19, 0, 0),
	('c8ab5e9a-85ab-44fe-8203-125068d1f552', 1427, 'Varkenskrabbetjes rauw', 'g', 250, 0, 0, 18.3, 19.6, 0, 62, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', NULL, 1.4, NULL, NULL, 0.3, NULL, 0, 0.01),
	('c6d8ef82-8718-4b67-8cbc-ab8a161f915b', 1429, 'Varkensoester rauw', 'g', 115, 0, 0, 23.5, 2.4, 0, 54, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 1.1, 24, 1.74, 0.3, 0, 0, 0),
	('93b54ea6-3e9c-49e1-b419-d39529c35b33', 1430, 'Varkensschouderlappen rauw', 'g', 133, 0, 0, 20.7, 5.5, 0, 60, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 0.8, 27, 2.6, 0.4, 0, 0, 0),
	('af2ebadc-49ec-46a3-972f-2cad0580ad79', 1431, 'Vink sla- rauw', 'g', 266, 3.3, 1.3, 15.3, 21.2, 0.4, 653, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 19, 1, 19, 2.12, 0.7, 8, 0, 0.01),
	('87d2872c-10fd-435f-a7ef-15f6030af741', 1432, 'Speklap rauw', 'g', 320, 0, 0, 16.5, 28.2, 0, 64, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 0.5, 19, 1.81, 0.9, 0, 0, 0.01),
	('7c12b6cd-f78c-4831-a0fa-7083ec2761ca', 1434, 'Gehakt hoh rauw', 'g', 233, 0.3, 0.3, 19.2, 17.2, 0.3, 177, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 1.3, 19, 3.22, 0.6, 8, 0, 0),
	('4cbc30a2-ff1e-44bf-aa21-88e0831d9050', 1435, 'Hamburger rauw', 'g', 239, 2.2, 0.9, 16.8, 18, 0.6, 758, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 14, 1.8, 19, 3.37, 0.5, 17, 0, 0),
	('b98ec0df-9531-4e2e-a8fc-9caa58830646', 1436, 'Kalfsentrecote rauw', 'g', 150, 0, 0, 21.4, 7.2, 0, 53, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 0.6, 24, 2.54, 0.3, 0, 0, 0),
	('c25e4ca6-a091-4095-938f-7bf532efa6c5', 1437, 'Vink kalfs- rauw', 'g', 159, 0, 0, 20.7, 8.5, 0, 599, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 1.4, 24, 2.65, 0.6, 5, 0.01, 0),
	('06821d91-e88b-40a0-be4a-463c14b0f1a4', 1438, 'Kalfsfricandeau rauw', 'g', 111, 0, 0, 22, 2.6, 0, 52, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 0.5, 27, 2.48, 0.4, 1, 0, 0),
	('7f8e9125-5ba5-4807-9eed-40e0363ce182', 1439, 'Lever kalfs- rauw', 'g', 108, 2, 0, 17.7, 3.3, 0, 71, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 8, 21, 4.1, 0.4, 19, 0.01, 0.01),
	('93104637-6ed0-4083-a9d1-474ca4d9fef8', 1440, 'Kalfsschenkel rauw', 'g', 112, 0, 0, 21.3, 2.9, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 1.5, 26, 4.31, 0.4, 3, 0, 0),
	('99ff45b5-0305-4fd2-8fb6-ff266f8aeb1d', 1441, 'Kalfstong rauw', 'g', 168, 0, 0, 17.6, 10.9, 0, 93, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 1.6, 17, 3.4, 0.3, 3, 0, 0),
	('a0db01e3-f103-4c2d-ad7d-d81e15ac6e55', 1442, 'Kalfszwezerik rauw', 'g', 89, 0, 0, 18.4, 1.7, 0, 75, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', NULL, 1.5, NULL, NULL, 0.6, NULL, 0, 0),
	('2e98d638-f4de-404a-ac0f-bced91af10d2', 1443, 'Lamsbout rauw', 'g', 174, 0, 0, 19.2, 10.8, 0, 58, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 1.4, 22, 2.8, 0.2, 0, 0, 0),
	('585a86e4-0b30-43fc-86ad-171d6c831450', 1444, 'Gehakt lams-/schapen- rauw', 'g', 218, 0, 0, 19.3, 15.7, 0, 69, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 17, 2, 21, 3.95, 0.4, 0, 0, 0),
	('b1d83dbe-732e-4aa1-a424-cd4402d6b191', 1445, 'Lamskarbonade rauw', 'g', 223, 0, 0, 19.2, 16.3, 0, 56, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 1.4, 19, 2, 0.2, 0, 0, 0),
	('f6927572-a362-4c23-a1a7-692a5c43f0cd', 1446, 'Lamszadel rauw', 'g', 256, 0, 0, 18.6, 20.2, 0, 56, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 15, 1.4, 21, 2.5, 0.2, 0, 0, 0),
	('90891820-1a3c-4291-a09f-3f85c434becb', 1447, 'Lamsschouder rauw', 'g', 187, 0, 0, 20, 11.9, 0, 63, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 1.4, 20, 4.2, 0.2, 0, 0, 0),
	('2ab15f75-5469-409d-9be8-d319498c389f', 1450, 'Chocolade puur suikervrij', 'g', 454, 42.1, 0.7, 5.3, 33, 14.7, 16, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 150, 3.2, 89, 1.3, 0, 1, 0, 0),
	('816ffc2e-57b9-45cf-9a34-849c4beaba48', 1451, 'Chocolade melk- m hazelnoten z suiker', 'g', 498, 46.5, 9.6, 8.9, 35.4, 8, 92, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 220, 4, 76, 1.35, 0, 2, 0, 0),
	('06fb1567-43be-4696-9fc4-fedf71b0a8cc', 1454, 'Biet rode zoetzuur glas', 'g', 37, 7.6, 6.6, 0.5, 0.1, 1.8, 176, 'NEVO-online 2025/9.0', 'Groente', 19, 0.3, 13, 0.3, 0, 3, 0, 0),
	('88c1ff1c-22cb-4a91-b7de-8247a3518e68', 1455, 'Aardappelpureepoeder gem', 'g', 368, 70.2, 2.2, 8.6, 4.6, 6.3, 310, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 54, 1.4, 68, 0.95, 0, 5, 0, 0),
	('e39a8057-d4df-49a8-92e0-c8f51289eb9a', 1456, 'Frites voorgebakken diepvries onbereid', 'g', 146, 24.4, 0.4, 2.3, 3.8, 2.5, 34, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.5, 21, 0.37, 0, 17, 0, 0),
	('99121c24-c53f-4de3-a945-cee13770f71f', 1457, 'Aardappelen gebakken', 'g', 119, 16.5, 0.2, 1.8, 4.8, 1.5, 32, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.5, 18, 0.31, 0.2, 8, 0, 0),
	('915c1829-088e-4ce8-b8d2-6d5e2d51e4b5', 1458, 'Seitan gekruid', 'g', 198, 4, 0.5, 28.4, 7.2, 2.1, 653, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 36, 1.7, 25, 1.41, 0, 0, 0, 0),
	('7e9f81da-057f-4fa3-91b4-439eefdb8af0', 1459, 'Tarwekrentenbrood volkoren', 'g', 253, 46.2, 16.5, 9.3, 1.9, 7.1, 309, 'NEVO-online 2025/9.0', 'Brood', 38, 2, 60, 1.17, 0, 0, 0, 0),
	('8b4e06a1-147e-4411-9b0e-bfe3cc7a850c', 1460, 'Koek ontbijt- gember', 'g', 318, 70.7, 41.8, 2.7, 2.1, 2.6, 190, 'NEVO-online 2025/9.0', 'Gebak en koek', 18, 0.6, 20, 0.6, 0.1, 0, 0, 0),
	('f5fb1124-5100-4fdb-b7c5-6e1de8d7e46d', 1461, 'Pasta sesam- tahin m toegevoegd zout', 'g', 585, 1.8, 1.6, 21.9, 51.7, 12.4, 361, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 37, 9, 353, 5.4, 0, 0, 0, 0),
	('2f1306ce-a986-467f-92b1-3df70ab02354', 1462, 'Sap ananas-', 'g', 47, 11.2, 10.8, 0.5, 0, 0.3, 21, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 15, 0.4, 10, 0.07, 0, 18, 0, 0),
	('1cba4911-1c92-4c94-83b2-078a9f2ff645', 1463, 'Vruchtendrank 2 of meer vruchten', 'g', 43, 10.7, 10.7, 0.2, 0, 0.1, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 0.1, 4, 0.07, 0, 6, 0, 0),
	('5c35470d-876d-46f1-9e89-7168237c242c', 1464, 'Melk chocolade- halfvolle', 'g', 76, 11.9, 11.1, 3.3, 1.6, 0.5, 48, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 105, 0.6, 18, 0.49, 0.1, 0, 0, 0),
	('c533479c-5c01-4f3b-bd73-e5ea3c65f9ca', 1465, 'Likeur <15 vol% alc', 'g', 200, 29, 29, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('dafcab21-8fe7-45ff-9868-bc915cf7cf4c', 1466, 'Likeur >25 vol% alc', 'g', 291, 29, 29, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('4bcb1c08-89a0-4193-88ee-37b8f9fe2153', 1468, 'Bier zwaar >7 vol% alcohol', 'g', 64, 4.3, 0.1, 0.5, 0, 0.3, 2, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 3, 0, 8, 0.03, 0, 0, 0, 0),
	('2118cda0-60f6-484e-9ec9-1f4abd813f33', 1469, 'Room banketbakkers-', 'g', 143, 22.9, 16.7, 3.6, 4.1, 0.2, 50, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 100, 0.3, 11, 0.53, 0.2, 0, 0.01, 0),
	('aa46a9a4-4a01-4c16-af3d-2bf8ef73294e', 1470, 'Berliner bol', 'g', 293, 44.4, 18.9, 5.3, 10, 1.7, 248, 'NEVO-online 2025/9.0', 'Gebak en koek', 47, 0.8, 13, 0.54, 0.6, 1, 0.01, 0),
	('8ca2d008-d6f2-49de-b4b2-d491fba1ec13', 1471, 'Biscuit m chocolade', 'g', 479, 65.8, 29.3, 7.3, 20, 3.2, 267, 'NEVO-online 2025/9.0', 'Gebak en koek', 77, 1.8, 37, 0.81, 0, 0, 0.01, 0),
	('54f4d598-3aa7-4a8c-82a0-7f5ea37bed9d', 1472, 'Creme au beurre', 'g', 567, 40.4, 40.4, 0.6, 44.8, 0, 6, 'NEVO-online 2025/9.0', 'Vetten en oliën', 16, 0.1, 3, 0.07, 0.2, 0, 0.04, 0),
	('64eb1ab8-59f2-4885-a6f6-4133bf850fdf', 1473, 'Donut ongevuld', 'g', 358, 35.5, 4.8, 6, 21.1, 1.1, 280, 'NEVO-online 2025/9.0', 'Gebak en koek', 76, 1.2, 21, 0.6, 0.8, 0, 0, 0),
	('0c46be95-bb8a-4c31-bc93-5ce134e8d298', 1474, 'IJs water-', 'g', 75, 18, 17, 0.2, 0.2, 0.2, 2, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 5, 0, 2, 0.02, 0, 2, 0, 0),
	('2c11ec71-7fc3-4448-9a47-1728e32fcb71', 1475, 'Soes slagroom-', 'g', 283, 15.1, 8, 4.1, 22.9, 0.4, 146, 'NEVO-online 2025/9.0', 'Gebak en koek', 46, 0.5, 8, 0.4, 1, 0, 0.02, 0),
	('329506c1-8a85-4556-b735-5da4fe01531c', 1476, 'Taart schuim- m creme au beurre', 'g', 391, 50.7, 49, 4.6, 18.7, 1, 58, 'NEVO-online 2025/9.0', 'Gebak en koek', 47, 0.5, 43, 0.46, 0.5, 0, 0.01, 0),
	('aa98dd03-b854-4614-85df-1ded0deaef23', 1477, 'Koekje suikervrij', 'g', 433, 63.7, 0, 6.6, 21.4, 3.4, 207, 'NEVO-online 2025/9.0', 'Gebak en koek', 41, 1.3, 26, 0.62, 0.1, 0, 0.02, 0),
	('bebd3d8c-f3cd-4b94-9d8a-b4725c170bbd', 1478, 'Vlaai kruimel- m vruchten', 'g', 199, 30.9, 15.8, 3.3, 6.4, 1.7, 139, 'NEVO-online 2025/9.0', 'Gebak en koek', 22, 0.6, 10, 0.29, 0.6, 3, 0, 0),
	('7f306d39-52c0-4e6c-a514-469d533ec67d', 1479, 'Taart Mon Chou-', 'g', 330, 33.2, 23.6, 2.5, 20.5, 1.2, 108, 'NEVO-online 2025/9.0', 'Gebak en koek', 42, 0.5, 15, 0.28, 0.5, 4, 0.01, 0),
	('a236e74c-543a-462e-ba27-fce19f16d083', 1480, 'Koekje PiM''s sinaasappel', 'g', 373, 60, 49, 3.6, 12.5, 2.9, 160, 'NEVO-online 2025/9.0', 'Gebak en koek', 22, 1.8, 30, 0.55, 0.9, 0, 0, 0),
	('3261679a-2a07-42af-91be-83686e280bd0', 1481, 'Wafel rijst- naturel m (zee)zout', 'g', 392, 81.3, 1, 7.8, 3.2, 3.5, 164, 'NEVO-online 2025/9.0', 'Brood', 18, 0.9, 132, 2, 0, 0, 0, 0),
	('3ba723c8-7e0c-4e9f-ad58-82ea7f6d0bdc', 1483, 'Stamppot boerenkool z vlees bereid', 'g', 82, 11.6, 0.4, 1.9, 2.6, 2, 17, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 66, 0.6, 16, 0.27, 0.1, 12, 0, 0),
	('d165db42-d9cc-4448-84db-a72e70d1840a', 1484, 'Uitjes gebakken kant-en-klaar', 'g', 590, 40, 10.5, 6, 44, 4.9, 430, 'NEVO-online 2025/9.0', 'Groente', 42, 1.2, 28, 0.9, 0, 0, 0, 0),
	('3c311b10-7306-47d2-8936-aba93f0868ee', 1485, 'Stamppot wortel/ui z vlees bereid', 'g', 63, 10, 1.9, 1.1, 1.6, 1.9, 20, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 17, 0.3, 12, 0.23, 0.1, 5, 0, 0),
	('31f90148-82ad-4c5e-a0e7-7534f3998f06', 1486, 'Stamppot zuurkool z vlees bereid', 'g', 68, 10.1, 0.5, 1.5, 2, 1.8, 95, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 28, 0.4, 14, 0.24, 0.2, 9, 0, 0),
	('65520514-d3bd-48c4-8dad-4a6a0a115cb2', 1487, 'Kaas Brie 60+', 'g', 369, 1, 1, 17, 33, 0, 471, 'NEVO-online 2025/9.0', 'Kaas', 250, 0.3, 20, 3, 0.3, 0, 0.02, 0),
	('99ea504a-eec4-41a6-8a3b-e7c265bf90ec', 1488, 'Kaassouffle diepvries onbereid', 'g', 304, 32.8, 1.8, 8.1, 15.4, 1.1, 676, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 148, 0.3, 15, 0.7, 0.2, 0, 0, 0),
	('7a5a5052-a40e-4839-aca5-c294ee2dfdc8', 1489, 'Kaas verse light 8% vet', 'g', 132, 2.5, 2.5, 11.3, 8.5, 0, 590, 'NEVO-online 2025/9.0', 'Kaas', 98, 0.7, 34, 0.2, 0.1, 0, 0, 0),
	('ea58cec5-7364-4b85-9400-eca843f4ad8f', 1491, 'Lasagne bolognese koelverse maaltijd', 'g', 162, 12.1, 1.2, 9, 8.4, 1, 310, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 55, 0.6, 16, 1.05, 0.1, 9, 0, 0),
	('4cd6c23c-9c8e-4109-80eb-db19a881dc36', 1492, 'Jus gem ongebonden bereid z juspoeder', 'g', 340, 0.3, 0.3, 0.2, 37.6, 0, 153, 'NEVO-online 2025/9.0', 'Hartige sauzen', 7, 0, 1, 0, 2.9, 0, NULL, NULL),
	('86f65c8f-756e-44d3-bda1-64208e65b855', 1493, 'Taart hartige v brooddeeg m groente/kaas/ei', 'g', 159, 13.5, 1.1, 7.9, 7.8, 1.4, 405, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 146, 0.8, 17, 1, 0.4, 5, 0.01, 0),
	('9d1d89d6-3bef-41bd-a0ed-ecf7ac8a608e', 1496, 'Salade vis- lunch/borrel', 'g', 304, 6.9, 4.1, 8.6, 26.8, 0.3, 617, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 18, 0.6, 15, 0.43, 1, 1, 0.09, 0.15),
	('72137f22-ffb8-4e0b-aae2-ded4853e1bd7', 1497, 'Salade ham-prei- lunch/borrel', 'g', 243, 7, 4, 3.6, 21.9, 1.9, 507, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 25, 0.4, 8, 0.35, 0.1, 3, 0, 0),
	('0af3f25e-d453-4591-a1c6-2ccb89338330', 1498, 'Salade kip-kerrie- lunch/borrel', 'g', 285, 6.9, 4.2, 8.8, 24.3, 1.8, 476, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 16, 0.4, 18, 0.43, 0.1, 1, 0.01, 0.04),
	('d101c033-bbb2-4d14-9bdd-5ac3f999fa77', 1499, 'Salade ei- lunch/borrel', 'g', 255, 5.6, 2.5, 7.3, 22.3, 1.3, 454, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 25, 2, 7, 1.36, 1.4, 0, 0.03, 0),
	('c882ca63-1840-4bce-9f9f-d7481a7a932f', 1812, 'Nectarine', 'g', 36, 6.5, 6.5, 1, 0.1, 1.1, 1, 'NEVO-online 2025/9.0', 'Fruit', 5, 0.2, 9, 0.11, 0, 1, 0, 0),
	('e1daf08a-a387-4944-accb-156628197065', 1501, 'Mix kruiden- m gedroogde groente onbereid', 'g', 311, 57, 32.7, 9.5, 3.8, 5.2, 5373, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 200, 4.4, 95, 1.5, 0, 36, 0, 0),
	('8717651c-289c-4f2b-aeaf-5dea81d93c1e', 1502, 'Yoghurt halfvolle', 'g', 50, 4.3, 4.3, 4.2, 1.5, 0, 51, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 139, 0.1, 12, 0.45, 0, 2, 0, 0),
	('eaf2ae09-a29b-4ffd-b47c-08e35a73415e', 1505, 'Chips light naturel', 'g', 490, 63.5, 0.2, 7.3, 22, 4.2, 570, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('ec0ad971-838c-4a7e-8b17-101c173d1f0b', 1506, 'Soesje kaas-', 'g', 317, 8.6, 0.3, 6, 28.5, 0.5, 220, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 100, 0.6, 9, 0.74, 1.2, 0, 0.02, 0),
	('4db324fc-be53-419f-9d33-f181466c1083', 1507, 'Borstplaat room-', 'g', 346, 79, 79, 0.7, 3.1, 0, 10, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 22, 0, 2, 0.07, 0, 0, 0, 0),
	('c1e55056-3741-41fa-a4d4-2da1b408a413', 1508, 'Bonbon', 'g', 512, 51.8, 50.1, 5.5, 30.7, 3.3, 40, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 118, 1.7, 35, 0.6, 0, 0, 0, 0),
	('a58c77a0-cc58-4953-9afa-40ad7768ede4', 1509, 'Mueslireep m chocolade', 'g', 472, 61.7, 29.6, 7.9, 20.2, 5.8, 213, 'NEVO-online 2025/9.0', 'Gebak en koek', 52, 3.1, 102, 1.92, 0, 0, 0.01, 0),
	('5a233fb5-882d-4cf4-94eb-c8249c0dd591', 1512, 'Schnitzel vegetarisch obv soja/tarwe onbereid verrijkt m ijzer en vit B12', 'g', 192, 14.5, 1.3, 15.5, 7, 4.7, 536, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 83, 3.9, 58, 1.2, 0, 3, 0, 0),
	('eb14426b-da96-4cc4-a66c-8dc3c42cec77', 1515, 'Saus op basis roux bereid', 'g', 84, 6.5, 2.6, 2.4, 5.3, 0.2, 137, 'NEVO-online 2025/9.0', 'Hartige sauzen', 71, 0.1, 8, 0.26, 0.2, 0, 0, 0),
	('66e7e12c-d25c-4624-ba7a-a7f0e6423641', 1516, 'Saus op basis groentenat/melk bereid z vet', 'g', 46, 7.2, 2.8, 2.2, 0.9, 0.1, 118, 'NEVO-online 2025/9.0', 'Hartige sauzen', 75, 0, 8, 0.25, 0, 0, 0, 0),
	('0e6c5c58-c477-4f9c-8ef2-4b3789620d40', 1517, 'Saus op basis pakje <3% vet bereid', 'g', 62, 10.6, 6, 1.7, 1.4, 0.2, 523, 'NEVO-online 2025/9.0', 'Hartige sauzen', 26, 0.4, 10, 0.16, 0, 4, 0, 0),
	('0d54be7a-cdeb-4615-80b8-ab15884b998b', 1518, 'Saus op basis pakje >3% vet bereid', 'g', 76, 7.8, 2.3, 1.2, 4.4, 0.2, 530, 'NEVO-online 2025/9.0', 'Hartige sauzen', 8, 0.2, 5, 0.1, 0, 1, 0, 0),
	('09f654c4-6061-4d4a-a12b-79c0cb80ca2c', 1519, 'Bier alcoholvrij <0,1 vol% alcohol', 'g', 26, 6.1, 3.2, 0.3, 0, 0.1, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 4, 0.01, 0, 0, 0, 0),
	('fd4f7403-3240-443d-b87d-b27e3582a7ae', 1520, 'Bier alcoholarm 0,1-1,2 vol% alcohol', 'g', 22, 4.5, 0.9, 0.3, 0, 0.3, 1, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 5, 0, 4, 0.01, 0, 0, 0, 0),
	('62d2a49b-eb85-49ea-a552-4d0db2798955', 1521, 'Limonade vruchten- light', 'g', 3, 0.7, 0.7, 0, 0, 0, 11, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 0, 2, 0, 0, 5, 0, 0),
	('fd3e759c-861f-436c-ade9-a88c73b23ec3', 1522, 'Frisdrank light z cafeine', 'g', 0, 0, 0, 0, 0, 0, 9, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0.2, 0, 0, 0, 0, 0, 0),
	('8e386513-87e6-4e56-ab1f-fba275c0c083', 1523, 'Frisdrank light m cafeine', 'g', 0, 0, 0, 0, 0, 0, 8, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 0, 0, 0, 0, 0, 0),
	('ea19b59a-24cc-4ad0-a1d1-b17369ec40e6', 1524, 'Saus tomaten- kant-en-klaar glas', 'g', 68, 6.9, 5.5, 1.6, 3.3, 1.8, 331, 'NEVO-online 2025/9.0', 'Hartige sauzen', 10, 0.5, 8, 0.17, 0, 11, 0, 0),
	('5e5d2b7b-0258-4070-9059-a8a9a1202b9c', 1528, 'Bouillon v blokje bereid', 'g', 5, 0.3, 0.1, 0.1, 0.3, 0, 397, 'NEVO-online 2025/9.0', 'Soepen', 0, 0, 0, 0.02, 0, 0, 0, 0),
	('a37af302-2aa6-44c8-834e-3fcd75ed1d9d', 1530, 'Boterproduct halfvolle', 'g', 337, 0.7, 0.7, 0.3, 37, 0, 145, 'NEVO-online 2025/9.0', 'Vetten en oliën', 11, 0.1, 1, 0, 0.1, 0, 0.04, 0),
	('b9712a4a-6d95-4eb4-9c3e-7edec2a48cce', 1531, 'Stamppot rauwe andijvie z vlees bereid', 'g', 65, 12.7, 0.7, 1.9, 0.4, 1.5, 13, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 28, 0.7, 17, 0.39, 0, 6, 0, 0),
	('7b5b57c2-ec17-4c22-a8cd-4fbbea112fe6', 1533, 'Taart hartige v bladerdeeg m groente/kaas/ei', 'g', 215, 12.7, 1.2, 8.7, 14.1, 1.1, 530, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 164, 0.8, 17, 1.07, 0.4, 6, 0.01, 0),
	('efe30cd9-e8fd-49d5-8e4f-6ece446a1367', 1536, 'Runderbiefstuk bereid', 'g', 146, 0, 0, 29.3, 3.2, 0, 53, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 2.8, 32, 5.53, 0.5, 0, 0, 0),
	('8cb154a7-268f-4fdd-9055-f23672544c4e', 1538, 'Runderentrecote bereid', 'g', 192, 0, 0, 31, 7.5, 0, 59, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 11, 2.3, 30, 5.19, 0.6, 0, 0.01, 0),
	('9727fcf5-c96d-43df-a760-7158b7c03f76', 1539, 'Runderbaklappen bereid', 'g', 140, 0, 0, 27.5, 3.3, 0.2, 67, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 2.7, 30, 5.96, 0.5, 0, 0, 0),
	('9d847028-b638-43d1-8b01-2cd4b5aaf9f0', 1540, 'Gehakt runder- rul gebakken', 'g', 331, 0.3, 0.3, 30.4, 23.1, 0, 182, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 15, 3.2, 32, 6.96, 1.9, 6, 0, 0),
	('1dacf7b2-6762-4f01-8277-df5c2b09b8d1', 1541, 'Runderklapstuk bereid', 'g', 187, 0, 0, 29.6, 7.6, 0.1, 78, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 14, 2.3, 31, 5.47, 0.7, 0, 0, 0),
	('0ac22e4f-30fa-4156-8fc8-2d5b42cc1c78', 1542, 'Lever runder- bereid', 'g', 161, 0, 0, 28.1, 5.4, 0.2, 90, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 8.1, 25, 5.49, 4.3, 12, 0.01, 0.01),
	('80051e11-5734-4ee5-91e9-0a57c7cf6bf3', 1543, 'Runderpoulet bereid', 'g', 216, 0, 0, 30.9, 10.2, 0.1, 97, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 2.6, 37, 6.02, 1.4, 2, 0, 0),
	('1a819dcf-2ed2-44d3-bdf6-9709026f2803', 1544, 'Runderrollade gebakken', 'g', 157, 0.2, 0.2, 33.5, 2.3, 0.5, 323, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 2.2, 27, 5.96, 0.4, 1, 0, 0),
	('70b6675d-2d1b-45c4-a9eb-eaae23d8d89a', 1545, 'Runderrosbief bereid', 'g', 156, 0.2, 0.2, 27.2, 5.1, 0, 105, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 2, 26, 5.6, 0.5, 0, 0, 0),
	('da76ef98-358c-4d08-b404-636433b7d100', 1546, 'Runderschenkel bereid', 'g', 140, 0, 0, 27.5, 3.3, 0.2, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 2.6, 30, 5.96, 0.5, 0, 0, 0),
	('8246ab20-b1b5-4f1b-ba99-62dec3f5c3f8', 1547, 'Runderriblappen bereid', 'g', 230, 0, 0, 34.1, 10.4, 0, 63, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 14, 3.6, 24, 11.21, 0.6, 0, 0, 0),
	('b5e463be-a778-4940-98b3-fa0067d98629', 1548, 'Runder doorregen lappen bereid', 'g', 212, 0, 0, 34.6, 8.2, 0, 62, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 3.4, 25, 10.85, 0.5, 0, 0.01, 0),
	('0eedfb5d-5b48-4c89-b5a5-6945fa43d857', 1549, 'Rundersukadelappen bereid', 'g', 189, 0, 0, 33.4, 6.1, 0, 65, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 3.7, 23, 10.33, 0.4, 0, 0.01, 0),
	('85873e06-c1e4-4353-9361-1837cd1b8b48', 1550, 'Rundertartaar bereid', 'g', 186, 0.3, 0.3, 30.1, 7.2, 0, 105, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 3.5, 30, 6.78, 0.8, 9, 0, 0),
	('e93d9982-835a-46e4-83cc-d33ebfb7e4d3', 1551, 'Varkensbraadworst bereid', 'g', 246, 0.6, 0.5, 22.4, 17.1, 0, 732, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 18, 1.2, 24, 3.05, 1.1, 14, 0, 0.01),
	('f5764085-4d53-49c3-9e83-c25306fbbb73', 1552, 'Varkensfiletlappen bereid', 'g', 157, 0, 0, 28.7, 4.7, 0.1, 57, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 0.5, 31, 1.91, 0.3, 0, 0, 0),
	('3619278b-82f8-4cb7-a9c8-d11a40d98d7d', 1553, 'Varkensfricandeau bereid', 'g', 158, 0, 0, 31.2, 3.7, 0, 54, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 1.5, 32, 2.23, 0.6, 0, 0, 0),
	('5ce77ec7-dd92-49bf-96c8-1c8ccd795d96', 1554, 'Varkenshamlappen bereid', 'g', 167, 0, 0, 31.1, 4.7, 0, 62, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 1, 33, 3.25, 0.6, 0, 0, 0),
	('3baf03b8-e4aa-4e63-b0cc-9d54a7a19258', 1555, 'Gehakt varkens- gebakken', 'g', 243, 0.2, 0.2, 26.4, 15.2, 0.1, 247, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 1.1, 33, 2.98, 1.1, 12, 0, 0),
	('2095f14c-6d14-4806-a950-d5387a7cd5f9', 1556, 'Varkenshaas bereid', 'g', 142, 0, 0, 28.7, 3, 0.1, 103, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 0.9, 32, 2.23, 0.4, 0, 0, 0),
	('3726898a-8e44-4d00-aa92-0e496a3cdfd0', 1557, 'Varkenshamschijf bereid', 'g', 308, 0, 0, 37.1, 17.7, 0, 62, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 14, 0.6, 30, 2.21, 1, 0, 0, 0.01),
	('7cf42010-7184-4e65-a3c2-0340b4f91890', 1558, 'Varkenshaaskarbonade bereid', 'g', 179, 0, 0, 28.5, 7.3, 0.1, 57, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 0.6, 30, 1.98, 0.3, 0, 0, 0),
	('21a5c4fc-c641-4d3d-ad87-9c3c53524c78', 1559, 'Varkensschouderkarbonade bereid', 'g', 308, 0, 0, 37.1, 17.7, 0, 95, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 1.9, 37, 6.37, 1, 0, 0, 0.01),
	('e83aad86-0856-4f83-bfd8-8c329eedc0f7', 1560, 'Lever varkens- bereid', 'g', 164, 0, 0, 27.9, 5.8, 0.1, 131, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 23.3, 26, 10.07, 1.5, 11, 0, 0),
	('34ffba1c-13fc-4253-acff-1f168a5298ef', 1561, 'Varkenskrabbetjes bereid', 'g', 246, 0.6, 0.5, 22.4, 17.1, 0, 62, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 18, 1.1, 24, 3.05, 1, 0, 0, 0.01),
	('c4dd7e92-ef7c-42ca-b4bd-23878ae52500', 1563, 'Varkensoester bereid', 'g', 142, 0, 0, 28.7, 3, 0.1, 54, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 1.5, 32, 2.23, 0.6, 0, 0, 0),
	('e73f1f3e-ec1b-4333-9140-fa84da002c99', 1564, 'Varkensschouderlappen bereid', 'g', 170, 0, 0, 27.6, 6.6, 0, 72, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 1, 31, 3.46, 0.5, 0, 0, 0),
	('1e1a2b95-0691-4872-8fc9-2721ba56d96a', 1565, 'Vink sla- gebakken', 'g', 277, 1, 0.4, 20.7, 21.1, 0, 759, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 28, 1.3, 23, 2.88, 1.1, 5, 0, 0),
	('3ab7326b-eafb-4315-8832-f32d4e51d4be', 1568, 'Gehaktbal hoh m ei gebakken', 'g', 262, 5.3, 0.5, 20.5, 17.4, 1.1, 314, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 19, 1.8, 23, 3, 1.1, 16, NULL, NULL),
	('9c24f334-711c-442f-943f-27ad4f67ec21', 1569, 'Hamburger bereid', 'g', 255, 0.9, 0.4, 22.5, 17.9, 0.1, 795, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 20, 2.5, 23, 4.98, 0.6, 10, 0, 0),
	('241fb076-bc11-468d-9ff3-f2ce05a94213', 1570, 'Kalfsentrecote bereid', 'g', 166, 0, 0, 27.5, 6.3, 0, 59, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 0.9, 27, 3.25, 0.8, 0, 0, 0),
	('c088d533-54fa-4fdc-827b-9ac6654fa272', 1571, 'Vink kalfs- gebakken', 'g', 186, 0.3, 0.3, 30.1, 7.2, 0, 689, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 1.4, 30, 6.78, 0.8, 5, 0, 0),
	('8bb0a73b-2ca4-4836-a538-018bf5894b42', 1572, 'Kalfsfricandeau bereid', 'g', 121, 0, 0, 25.2, 2.2, 0, 55, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 0.6, 29, 2.99, 0.7, 0, 0, 0),
	('138135ff-c644-474e-9c1e-02742b444c16', 1573, 'Lever kalfs- bereid', 'g', 172, 2, 0, 27.9, 5.8, 0.1, 71, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 7.5, 26, 10.07, 4.3, 11, 0.01, 0.01),
	('bbe4d8ea-3b69-4039-b8b4-c771baf95d25', 1574, 'Kalfsschenkel bereid', 'g', 140, 0, 0, 27.5, 3.3, 0.2, 67, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 2.1, 30, 5.96, 0.5, NULL, 0, 0),
	('acb078df-8fa7-4acb-be47-68986ce629b5', 1575, 'Lamsbout bereid', 'g', 256, 0, 0, 25.6, 17.1, 0, 58, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 1.7, 23, 4, 0.2, 0, NULL, NULL),
	('0dd92480-6cc2-4574-84ca-2cd65ba94c5e', 1576, 'Gehakt lams- gebakken', 'g', 252, 0.3, 0.3, 30.4, 14.4, 0, 69, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 15, 1.4, 32, 6.96, 0.4, 0, NULL, NULL),
	('00872d52-9a7f-48e4-a9a2-087370b4f6c5', 1577, 'Lamskarbonade bereid', 'g', 350, 0, 0, 25.8, 27.5, 0, 56, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 20, 1.7, 27, 4.6, 0.2, 0, NULL, NULL),
	('aae050bf-25b4-4d09-a6c2-c023985198db', 1578, 'Lamszadel bereid', 'g', 308, 0, 0, 24.7, 23.2, 0, 56, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 27, 1.7, 25, 3.4, 0.2, 0, NULL, NULL),
	('d6692d84-7fad-4612-94d0-20f45670c1cb', 1579, 'Lamsschouder bereid', 'g', 284, 0, 0, 27.9, 19.1, 0, 63, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 1.7, 25, 6.4, 0.2, 0, NULL, NULL),
	('929e2db5-6bb7-4cb4-8920-fdec4fbc8ca4', 1583, 'Mosselen gebakken/gefrituurd in plantaardige olie', 'g', 268, 7.2, 0, 17.2, 19, 0, 387, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 27, 3.9, 36, 1.2, NULL, 0, 0, 0),
	('e30e0b6c-535c-4950-a0a2-13daf7514f3d', 1584, 'Inktvisringen gefrituurd in plantaardige olie', 'g', 440, 13.8, 2.1, 26.2, 31.1, 0.2, 185, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 27, 1, 36, 1.2, NULL, 0, 0, 0.01),
	('aeca31fb-85fd-4c13-90cb-259f8b1b7f23', 1585, 'Heilbot gerookt', 'g', 211, 0, 0, 19.4, 14.8, 0, 406, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 13, 0.9, 23, 0.5, 9, 0, 0.33, 0.45),
	('2b393503-17f0-439b-ad3e-486cc74b96d0', 1586, 'Makreelfilet gerookt', 'g', 301, 0, 0, 21.1, 24.1, 0, 746, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 33, 1.2, 38, 0.9, 8.2, 0, 1.46, 2.44),
	('fcf695c0-9882-45e7-ab70-023f324a353f', 1587, 'Zalm kweek- rauw', 'g', 179, 0, 0, 20, 11, 0, 46, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 7, 0.3, 26, 0.48, 7.9, 0, 0.59, 0.82),
	('e3a49a30-759f-4b55-b264-ef81d233919e', 1588, 'Ansjovis in olie blik', 'g', 208, 0.1, 0.1, 25, 11.9, 0.1, 6095, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 12, 1.6, 33, 1.1, 11, 0, 0.17, 0.53),
	('07f2dfea-bd7e-42bf-8e31-b7704ef14211', 1589, 'Tonijn in olie blik', 'g', 206, 0.1, 0.1, 27, 10.8, 0.1, 393, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 12, 1.6, 33, 1.1, 2.1, 0, 0, 0.06),
	('d56aa88a-95cf-43b0-ba94-5ebab9d692d1', 1590, 'Tonijn in water blik', 'g', 109, 0, 0, 24.9, 1, 0, 272, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 10, 1.5, 27, 0.9, 1.1, 0, 0.04, 0.21),
	('58131596-4564-4c51-914a-2a8af7e44caf', 1595, 'Chili con carne', 'g', 134, 10.5, 1.9, 8.3, 5.6, 4.3, 109, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 31, 1.2, 26, 1.15, 0.2, 13, NULL, NULL),
	('1c88a4f6-ec93-4ed0-b0f1-da002aa79614', 1599, 'Fructosepoeder', 'g', 396, 99, 99, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 0, 0, 0, 0, 0, 0, 0),
	('2e19f23c-2935-453d-a50b-edbfaf4d84a1', 1601, 'Gehaktbal runder- z ei gebakken', 'g', 304, 5.5, 0.7, 26.5, 19.4, 0.6, 200, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 23, 2.8, 32, 5.9, 1.6, 5, 0, 0),
	('3d7a730e-61b1-463e-87f6-d8b2e0027e52', 1605, 'Bokking gestoomd', 'g', 231, 0.5, 0, 20.8, 16.2, 0, 188, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 20, 1.2, 26, 0.48, 8.9, 0, 1.01, 1.13),
	('f22ba1d9-52f8-4e83-986c-0247454a0815', 1607, 'Sprotfilet gerookt', 'g', 212, 0, 0, 19.9, 14.8, 0, 1628, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 9, 1.1, 37, 1.7, 13, 0, 0.52, 0.71),
	('2015bf35-2b8d-4242-9ead-dd84db2916ff', 1608, 'Makreel bereid in magnetron z toev', 'g', 248, 0, 0, 24.4, 16.7, 0, 153, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 20, 1, 28, 0.7, 4.3, 0, 0.78, 1.35),
	('94345c55-e35f-46de-9929-2434f902d989', 1609, 'Makreel in olie blik', 'g', 267, 0.1, 0.1, 20, 20.7, 0.1, 420, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 12, 1.6, 33, 2.7, 4.3, 0, 0.97, 1.97),
	('e4c67af6-7b56-4036-b1cd-0b505cbd3c61', 1610, 'Zalm kweek- bereid in magnetron z toev', 'g', 220, 0, 0, 25.2, 13.2, 0, 53, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 12, 0.3, 34, 0.47, 4.6, 2, 0.74, 1.33),
	('eaad5933-17dc-4f14-bcab-48e7cf08806c', 1611, 'Forel bereid in magnetron z toev', 'g', 140, 0, 0, 24.5, 4.6, 0, 74, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 35, 0.4, 32, 0.57, 9.4, 1, 0.2, 0.8),
	('4789f64c-97a1-40d4-8c12-29060034f40c', 1612, 'Forel regenboog- bereid in magnetron z toev', 'g', 167, 0, 0, 23.7, 8, 0, 88, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 20, 1, NULL, NULL, 9.4, 0, 0.17, 0.25),
	('581c29d5-47d3-4616-a0fc-2eb06264686a', 1613, 'Kabeljauw bereid in magnetron z toev', 'g', 98, 0, 0, 23.5, 0.4, 0, 108, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 16, 0.2, 32, 0.5, 1.1, 0, 0.04, 0.08),
	('11e993d0-72ca-4a79-9566-648ed2a6b7d5', 1614, 'Schelvis bereid in magnetron z toev', 'g', 100, 0, 0, 22.3, 1.2, 0, 73, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 27, 0.4, 25, 0.53, NULL, NULL, 0.06, 0.35),
	('0e02807e-9f2e-446e-b914-002e5a76cb91', 1615, 'Koolvis (Atlantisch) bereid in magnetron z toev', 'g', 108, 0, 0, 24.5, 1.2, 0, 134, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 15, 0.5, 48, 0.71, 0.6, 0, 0.1, 0.33),
	('e09abb76-c1d3-4919-91b1-9db9225200f1', 1616, 'Wijting bereid in magnetron z toev', 'g', 101, 0, 0, 22.1, 1.4, 0, 110, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 27, 0.5, 25, 0.53, 0, 0, 0.13, 0.47);
INSERT INTO public.nutrition_foods VALUES
	('e6ba9f7d-fcf3-46cd-b973-c9c2aad096fb', 1617, 'Schol bereid in magnetron z toev', 'g', 140, 0, 0, 29, 2.6, 0, 110, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 53, 0.5, 22, NULL, 1.1, 2, 0.2, 0.2),
	('5520885e-2623-47bd-9738-d6439f75f079', 1618, 'Schar/tongschar bereid in magnetron z toev', 'g', 119, 0, 0, 23.9, 2.6, 0, 110, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 27, 0.7, NULL, NULL, NULL, 2, 0.27, 0.35),
	('7e7e7e9b-5284-4fc7-8e52-08bcd304aaa5', 1619, 'Tong bereid in magnetron z toev', 'g', 116, 0, 0, 24.5, 2.1, 0, 120, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 27, 0.4, 25, 0.46, 8, 2, 0.14, 0.16),
	('4b0ccea6-76d0-4fab-82c6-a33a6f09e050', 1620, 'Bot bereid in magnetron z toev', 'g', 106, 0, 0, 21.9, 2, 0, 120, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 27, 0.7, 25, 0.6, 0, 2, 0.18, 0.11),
	('ff4c872f-a647-46cc-a634-83f540840145', 1621, 'Poon bereid in magnetron z toev', 'g', 171, 0, 0, 26.1, 7.4, 0, 78, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 83, 0.5, NULL, NULL, 9.4, 1, 0.46, 1.01),
	('016758c3-5ac1-4367-b791-2eb93f771394', 1622, 'Baars rood- bereid in magnetron z toev', 'g', 128, 0, 0, 22.3, 4.3, 0, 347, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 34, 0.3, 27, 0.35, 1.4, 0, 0.36, 0.46),
	('c70e4c4a-a4cb-42b8-b7a6-a3de75d9756a', 1623, 'Zeewolf bereid in magnetron z toev', 'g', 127, 0, 0, 25.2, 2.9, 0, 142, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 18, 0.6, 36, 0.9, 0.7, 0, 0.37, 0.28),
	('7308740c-ada0-4916-8be4-fb8540abf543', 1624, 'Paling bereid in magnetron z toev', 'g', 207, 0, 0, 24.3, 12.2, 0, 60, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 20, 1, 19, 1.75, 4.9, 2, 0.44, 0.44),
	('c151fab3-a1ad-4be5-8573-748a6b57a0b2', 1625, 'Paling zee- bereid in magnetron z toev', 'g', 199, 0, 0, 24.3, 11.4, 0, 60, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 20, 1, 19, 1.75, 4.9, 2, 0.77, 1.87),
	('c6d7ca7b-792c-4d7f-bf5d-a263f0823efb', 1627, 'Kuit/hom gebakken', 'g', 262, 3.9, 0, 13.9, 21.2, 0.2, 2120, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL),
	('44cc54cc-9208-4598-88cb-b250d5190c94', 1628, 'Kuit/hom v bokking', 'g', 155, 0, 0, 24.5, 6.3, 0, 2120, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', NULL, NULL, NULL, NULL, NULL, NULL, 0.34, 0.55),
	('5a809e97-b3e3-43bf-a160-49213e4ed245', 1629, 'Kuit vis- gekleurd glas', 'g', 126, 0, 0, 19, 5.5, 0, 2120, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', NULL, NULL, NULL, NULL, NULL, NULL, 0.14, 0.13),
	('5192aa9f-c893-4f22-98a3-8dcbce8be4f4', 1630, 'Mosselen in zuur glas', 'g', 106, 2.2, 0, 17.2, 3.1, 0, 370, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 67, 3.9, 63, 2.2, 0, 0, 0.39, 0.26),
	('f45a7862-de9c-4b4c-b967-4ada0799a0b9', 1631, 'Garnalen in water blik', 'g', 115, 0.1, 0.1, 24.3, 1.9, 0, 647, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 134, 0.2, 35, 1.8, 0.1, 0, 0.18, 0.21),
	('a1ab017f-9f76-4d42-a4e7-32fd6676c413', 1632, 'Inktvis pijl- bereid in magnetron z toev', 'g', 146, 0, 0, 25.8, 4.7, 0, 110, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 25, 0.6, 55, 2.2, 0, 0, 0.5, 1.13),
	('8daa8782-7849-4d08-857e-205251017e75', 1633, 'Kip m vel bereid', 'g', 226, 0, 0, 25.3, 13.8, 0, 74, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 1.2, 25, 2.18, NULL, 0, NULL, NULL),
	('34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 1634, 'Kipfilet rauw', 'g', 109, 0, 0, 23.3, 1.8, 0, 53, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 0.6, 30, 0.65, 0.3, 0, 0, 0),
	('2f5e50aa-5eba-4acb-af52-7241d76fae68', 1635, 'Kip z vel bereid', 'g', 183, 0, 0, 27.3, 8.2, 0, 92, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 1.1, 25, 2.2, NULL, 0, NULL, NULL),
	('544f3893-c032-484b-9453-eb69ae7816af', 1641, 'Kiprollade bereid', 'g', 166, 1.7, 0, 24, 7, 0, 673, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', NULL, 0.7, 24, 1.77, NULL, NULL, NULL, NULL),
	('54aee3f6-4f33-4eb9-b4b2-2605a3eac858', 1642, 'Kiprollade rauw', 'g', 175, 0.2, 0, 20.6, 10.3, 0, 457, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 0.6, 24, 0.91, 0.3, 0, 0.03, 0.09),
	('ad58af53-7420-4ec9-91cb-35633facff19', 1643, 'Kipnuggets bereid in oven', 'g', 259, 18.4, 2, 14.4, 13.7, 2.5, 550, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 25, 0.9, 25, 0.74, 0.3, 0, 0, 0),
	('1e280512-5768-4b42-a098-fb1200eb958c', 1644, 'Kipnuggets bereid m frituurvet', 'g', 277, 12.2, 0, 17.5, 17.1, 2.5, 474, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 25, 0.8, 23, 0.73, 0.3, 0, 0, 0),
	('9e4a9ce4-7e98-4c08-b926-8b94c58f4b4f', 1645, 'Kipburger gepaneerd bereid', 'g', 307, 9.9, 0, 14.5, 23.2, 0, 756, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', NULL, 1.2, 19, 1.2, NULL, NULL, 0, 0),
	('c28a1839-19de-4ca9-b69b-b33295b4811c', 1646, 'Varkenslappen bereid', 'g', 204, 0.4, 0, 29.8, 9.2, 0, 60, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 1.3, 24, 3.8, 0.5, 0, 0, 0.01),
	('a571371a-421e-4951-b187-d4a3b4c02bdd', 1647, 'Varkensribkarbonade bereid', 'g', 177, 0, 0, 28.4, 7.1, 0.1, 59, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 14, 0.6, 30, 2.21, 0.3, 0, 0, 0),
	('c1e996f0-6b8e-4d7f-bd81-12fa588fcf45', 1650, 'Kaas geiten- verse', 'g', 207, 1, 1, 13.4, 16.6, 0, 399, 'NEVO-online 2025/9.0', 'Kaas', 101, 0.6, 11, 0.5, 0.1, 0, 0, 0),
	('c15a21e7-fd4a-46c6-b3af-9daeb781101b', 1651, 'Stroop gerstemout-', 'g', 283, 66.4, 53.3, 4.4, 0, 0, 48, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 22, 0.6, 59, 0.1, 0, NULL, 0, 0),
	('86c38214-0e71-4efb-8c3d-38518371e57c', 1652, 'Stroop maismout-', 'g', 287, 69.4, 53.8, 2.3, 0, 0, 50, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 10, 0.5, 28, 0.1, 0, NULL, 0, 0),
	('6e74b7cf-5216-4fdb-b3f5-6fb2d2d3d78a', 1653, 'Stroop rijstmout-', 'g', 292, 72.6, 44.5, 0.3, 0, 0, 14, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 20, 1, 9, 0.2, 0, NULL, 0, 0),
	('26d2c1d5-9d7c-44d0-8b78-5d607d297081', 1655, 'Diksap geconcentreerd', 'g', 242, 60, 60, 0.2, 0, 0.4, 8, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 48, NULL, 31, NULL, 0, 0, 0, 0),
	('1fdb5a0f-beed-4410-a646-aab873c0ed89', 1656, 'Sap wortel-', 'g', 29, 6.4, 6.4, 0.4, 0.2, 0, 37, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 17, 0.5, 8, 0.1, 0, 0, 0, 0),
	('30c442aa-58cc-4a07-8aac-436896bda393', 1657, 'Sap zuurkool-', 'g', 7, 1.1, 0.7, 0.7, 0, 0, 279, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 35, 1.1, 9, 0.1, 0, 16, 0, 0),
	('4c069bbd-b6d3-4c18-9f16-4f98225e6169', 1663, 'Rundvlees <5 g vet rauw gem', 'g', 108, 0, 0, 22.6, 2, 0, 59, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 2.2, 27, 4.13, 0.5, 0, 0, 0),
	('2f37cb76-f1dd-4141-9022-01c26d991299', 1664, 'Rundvlees >5 g vet rauw gem', 'g', 218, 1.5, 0.5, 18.4, 15.3, 0.4, 312, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 11, 2, 20, 4.18, 0.6, 11, 0, 0),
	('6a3a5f78-5c59-4c2e-b786-8aad9a70a85a', 1665, 'Rundvlees <10 g vet bereid gem', 'g', 163, 0, 0, 30.2, 4.7, 0, 70, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 3, 30, 6.77, 0.5, 1, 0, 0),
	('16e837c9-9d5c-4c93-91d4-9b72a747f516', 1666, 'Rundvlees >10 g vet bereid gem', 'g', 290, 1.2, 0.3, 26.9, 19.7, 0.1, 405, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 18, 2.9, 29, 6.19, 1.3, 7, 0, 0),
	('5dd54984-c905-4f04-9824-e32a40b9740d', 1667, 'Varkensvlees <5 g vet rauw gem', 'g', 126, 2.8, 0.7, 21.8, 3, 0.3, 186, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 0.7, 29, 1.87, 0.3, 0, 0, 0),
	('b5d009d8-e5da-4462-853b-6731d0d467e4', 1668, 'Varkensvlees 5-14 g vet rauw gem', 'g', 165, 0.5, 0.2, 20, 9.1, 0.3, 175, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 16, 0.9, 26, 2.7, 0.4, 2, 0, 0),
	('2bc7262b-d00b-4c67-ba1f-fa304da3bd96', 1669, 'Varkensvlees >15 g vet rauw gem', 'g', 283, 0.5, 0.3, 16.1, 24, 0.2, 608, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 0.7, 18, 1.85, 0.8, 12, 0, 0.01),
	('94f5adea-61f2-45ef-b4de-c706ad69b233', 1670, 'Varkensvlees <10 g vet bereid gem', 'g', 158, 0, 0, 28.8, 4.7, 0.1, 72, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 0.9, 32, 2.58, 0.4, 0, 0, 0),
	('94971ecb-4024-427c-85ad-4af8214ce300', 1671, 'Varkensvlees 10-19 g vet bereid gem', 'g', 260, 0.3, 0.3, 28.4, 16.1, 0, 417, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 20, 1.4, 32, 4.06, 1.1, 6, 0, 0.01),
	('1cb3b702-e57d-4fd4-8205-2d7fbe73fc25', 1672, 'Varkensvlees >19 g vet bereid gem', 'g', 365, 1.1, 0.1, 21.2, 30.5, 0.2, 828, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 16, 0.9, 21, 2.38, 0.9, 12, 0, 0),
	('a25d4e1f-f8d4-4884-af15-2a9b7aa3219e', 1673, 'Kalfsvlees <5 g vet gem rauw', 'g', 105, 0, 0, 22, 1.8, 0, 59, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 1, 26, 3.45, 0.4, 1, 0, 0),
	('d9101e0c-03fe-40a3-bcf2-f014aa26f4ca', 1674, 'Kalfsvlees >5 g vet gem rauw', 'g', 159, 0, 0, 20.4, 8.6, 0, 525, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 1.3, 23, 2.7, 0.6, 5, 0.01, 0),
	('84f5879d-399c-4ccf-a3cc-489f3326aaa1', 1675, 'Lamsvlees >10 g vet rauw gem', 'g', 221, 0, 0, 19.3, 16, 0, 66, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 16, 1.8, 21, 3.47, 0.3, 0, 0, 0),
	('b2b04f72-18ac-4911-b415-c87935d335f9', 1676, 'Vlees <5 g vet excl lever rauw gem', 'g', 113, 0.7, 0.2, 22.8, 2.1, 0.1, 87, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 0.9, 29, 1.55, 0.3, 0, 0, 0),
	('7e808020-9008-4549-8021-2f4852a62ad2', 1677, 'Vlees >5 g vet excl lever rauw gem', 'g', 211, 1.1, 0.3, 18.6, 14.7, 0.3, 275, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 11, 1.3, 21, 2.88, 0.5, 7, 0.01, 0.02),
	('eedc6979-eeba-4512-a8fa-a410c108d191', 1678, 'Aardappelschijfjes diepvries gefrituurd in plantaardige olie', 'g', 229, 28, 0.2, 3.1, 10.9, 3.2, 34, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.5, 21, 0.37, 0, 7, 0, 0),
	('174fe965-bf81-4c37-bc2b-61bba79b377e', 1679, 'Frites oven- diepvries bereid in oven', 'g', 213, 32.6, 0.3, 3.8, 6.6, 4.2, 156, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 11, 0.7, 29, 0.45, 0, 2, 0, 0),
	('9f8bf53a-29dc-450c-9b16-b8876c5c079c', 1680, 'Aardappelkroketten diepvries bereid', 'g', 239, 28.2, 0.9, 3.4, 12, 2.2, 466, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 44, 0.9, NULL, NULL, 0, 5, 0, 0),
	('1cd9dea1-a21e-4056-a79f-38890e6cbe91', 1687, 'Opvolgmelk Nutrilon 2 p 100 ml', 'ml', 68, 8.6, 6.5, 1.4, 3, 0.6, 23, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 65, 1, 5, 0.51, 1.4, 10, NULL, 0.01),
	('b0bb639a-a159-4ce5-9f79-73aa66f22e47', 1699, 'Koekje kaas-', 'g', 495, 41.9, 3.5, 13.3, 30.1, 1.8, 1030, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 232, 1.2, 32, 1.5, 0.4, 0, 0, 0),
	('e05f913b-094b-41b0-bf32-9a0fdf41c68a', 1719, 'Melk halfvolle verrijkt m calcium', 'g', 46, 4.9, 4.9, 3.4, 1.5, 0, 39, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 194, 0, 12, 0.41, 0, 1, 0, 0),
	('71c4ba96-0cfa-4d58-bad0-e52c4f8e940c', 1720, 'Vla volle overige smaken', 'g', 87, 13.6, 8, 2.1, 2.6, 0.5, 45, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 74, 0, 8, 0.23, 0, 0, 0, 0),
	('3144f534-f0b1-4783-8e9c-11a67f2ac5ae', 1721, 'Yoghurt vanille- halfvolle', 'g', 72, 11.4, 9.2, 2.9, 1.3, 0.3, 31, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 106, 0, 10, 0.36, 0, 0, 0, 0),
	('3a83f851-f013-4d08-ae62-f0ec7c4e8114', 1722, 'Pap griesmeel-', 'g', 93, 14, 9.5, 3, 2.9, 0.1, 56, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 96, 0, 10, 0.33, 0, 1, 0, 0),
	('0996beb8-5b78-4e21-88c9-b24b6bc9f99e', 1723, 'Kaas 20+', 'g', 246, 0, 0, 34.5, 12, 0, 683, 'NEVO-online 2025/9.0', 'Kaas', 1059, 0.1, 42, 4.7, 0.1, 1, 0, 0),
	('3c025ae4-58fb-4f5f-9df1-214100f6fc6f', 1724, 'Kaas 50+', 'g', 380, 0, 0, 22.9, 32.1, 0, 710, 'NEVO-online 2025/9.0', 'Kaas', 713, 0.3, 35, 3.63, 0.3, 0, 0, 0),
	('581eeae1-42a0-4e12-a90b-5c973797888f', 1725, 'Kaas gaten- Hollandse 45+', 'g', 370, 0, 0, 27.6, 28.5, 0, 540, 'NEVO-online 2025/9.0', 'Kaas', 887, 0.2, 36, 3.87, 0.3, 1, 0, 0),
	('2614bb2d-27c3-4b4b-bb30-93240bca92e0', 1726, 'Kaas 40+ Leidse/Friese nagel-', 'g', 341, 0, 0, 27.3, 25.7, 0, 898, 'NEVO-online 2025/9.0', 'Kaas', 936, 0.1, 28, 3.3, 0.3, 1, 0, 0),
	('57facca0-7b4e-434c-9a8a-7fbab95e3e15', 1764, 'Babyvoeding fruit 12 mnd', 'g', 64, 14.4, 12.7, 0.6, 0.1, 1.6, 16, 'NEVO-online 2025/9.0', 'Fruit', 29, 0.2, 7, 0.06, 0, 12, 0, 0),
	('fce359f8-ead3-40c5-85ce-157c28a4342f', 1770, 'Kindervoeding maaltijd 18 mnd', 'g', 82, 10.5, 2.1, 3.3, 2.6, 1.6, 130, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 31, 0.8, 17, 0.43, NULL, NULL, 0, 0),
	('71629520-4db7-49e6-96ff-f22307b5ad19', 1771, 'Leverkaas/Berliner leverworst', 'g', 319, 4.5, 0.3, 12.3, 27.6, 0.2, 890, 'NEVO-online 2025/9.0', 'Vleeswaren', 11, 6.9, 12, 2.9, 2, 17, 0.03, 0),
	('9bf24d02-e365-4498-a584-05d89f038eb5', 1772, 'Varkensfricandeau gebraden (vleeswaar)', 'g', 117, 1.3, 1.3, 21.6, 2.8, 0.4, 997, 'NEVO-online 2025/9.0', 'Vleeswaren', 7, 1.5, 32, 2.23, 0.6, 0, 0, 0),
	('dde9fd9c-6abe-4cab-b6fb-1b163cac8169', 1773, 'Zult zure', 'g', 264, 1.7, 0, 12.5, 23, 0, 760, 'NEVO-online 2025/9.0', 'Vleeswaren', 53, 1, 7, 1.3, 1.1, 0, 0, 0),
	('2f634625-b9f8-451e-9ad3-dabaada5efbb', 1774, 'Worst tongen-', 'g', 247, 2, 2, 17.2, 18.8, 0.1, 887, 'NEVO-online 2025/9.0', 'Vleeswaren', 18, 1.2, 24, 3.05, 1.1, 0, 0.02, 0),
	('44cc47c8-a458-4775-b1a2-44aae6871a39', 1775, 'Spek ontbijt- gegrild', 'g', 261, 0.5, 0.5, 15.2, 22.1, 0, 830, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 0.6, 13, 1.7, 1.2, 0, 0, 0),
	('c0c3275d-b9a3-4749-8333-c886e6a936ad', 1776, 'Ham achter- gegrild', 'g', 119, 1.8, 1.8, 18.9, 3.9, 0.1, 906, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 0.7, 22, 1.7, 0.1, 0, 0, 0),
	('6106d5ab-09c3-4655-8ba3-fbac8f8c45bb', 1777, 'Ham been-', 'g', 127, 2.2, 1.2, 18.3, 5, 0.1, 813, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 0.7, 22, 1.7, 0.1, 25, 0.01, 0.01),
	('0451d282-ece0-4f54-af6b-0bf095b2d472', 1779, 'Knackebrod volkoren', 'g', 363, 64, 3.1, 10.9, 4, 13.7, 389, 'NEVO-online 2025/9.0', 'Brood', 40, 3, 80, 2.5, 0, 0, 0, 0),
	('15dc298c-7801-42a4-8d77-ff7e3b7926a3', 1788, 'Varkensribkarbonade rauw', 'g', 150, 0, 0, 22.6, 6.6, 0, 52, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 0.4, 27, 1.77, 0.3, 0, 0, 0),
	('a9e921a3-1d55-4562-8718-56542b8148b7', 1789, 'Varkensschnitzel ongepaneerd bereid', 'g', 142, 0, 0, 28.3, 3.2, 0.1, 59, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 0.7, 33, 2.07, 0.4, 0, 0, 0),
	('f378f984-1a91-4107-95f1-72de50ae5648', 1790, 'Varkensschnitzel ongepaneerd rauw', 'g', 109, 0, 0, 22.6, 2, 0, 52, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 0.6, 30, 1.65, 0.3, 0, 0, 0),
	('c5fc154e-bd48-498b-802b-f1f885608236', 1791, 'Room spuitbus m suiker', 'g', 305, 11, 11, 2.3, 28, 0, 30, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 74, 0, 8, 0.18, 0.1, 1, 0.02, 0),
	('c957ad79-172d-42b6-a4c4-828b9633e62e', 1792, 'Maaltijdvervanger Modifast Intensive Muesli', 'g', 358, 38, 6.7, 35, 5.8, 6.7, 733, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 600, 12, 233, 10, 3.3, 50, NULL, NULL),
	('99513fe0-6c7e-4388-9162-bd11ef48eaf7', 1802, 'Knackebrod Sandwich Wasa', 'g', 476, 46.8, 3.2, 10.7, 25, 10.3, 533, 'NEVO-online 2025/9.0', 'Brood', 152, 3.6, 42, 2.2, NULL, NULL, NULL, NULL),
	('2c8a273c-6026-4683-9c98-550813da555c', 1803, 'Saus oosterse kant-en-klaar glas/zak', 'g', 64, 13.3, 11.3, 1.5, 0.4, 0.7, 544, 'NEVO-online 2025/9.0', 'Hartige sauzen', 7, 2, 5, 0.9, 0, 18, 0, 0),
	('cedba23f-3e4b-4430-9140-32b3b28d0e49', 1808, 'Creme fraiche', 'g', 293, 2.8, 2.8, 2.6, 30, 0, 37, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 78, 0, 8, 0.18, 0.1, 1, 0.02, 0),
	('e25192af-dc81-49f2-9e5c-993ea00dad97', 1809, 'Kaas 45+', 'g', 357, 0, 0, 25.4, 27.3, 0, 720, 'NEVO-online 2025/9.0', 'Kaas', 830, 0.4, 23, 4.6, 0.3, 0, 0, 0),
	('544f38c3-acf3-4bd7-8745-80c8898ae9d9', 1810, 'Siroop vruchtenlimonade- Karvan Cevitam', 'g', 177, 44, 44, 0.1, 0, 0.1, 7, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 7, 0.1, 3, 0.02, 0, 48, 0, 0),
	('8a6b9783-f94b-4089-a0d2-9dbd13d2809e', 1811, 'Kousenband gekookt', 'g', 29, 2.5, 2.4, 2.7, 0.2, 3.5, 3, 'NEVO-online 2025/9.0', 'Groente', 46, 1.1, 39, 0.57, 0, 9, 0, 0),
	('adb96dc9-7da8-4f11-a80b-07d04089edb0', 1813, 'Melkdrank Yakult original', 'g', 66, 15, 13.2, 1.3, 0, 0, 16, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 47, 0, 4, 0.14, 0, 0, 0, 0),
	('3532cc14-31b4-4f2c-8164-96d859149d5a', 1832, 'Yoghurtdrank Vifit vruchten', 'g', 55, 8.3, 8.1, 3.1, 0.8, 1, 42, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 100, 0, 10, 0.29, 0.4, 1, 0, 0),
	('e3e008f0-11e2-4c16-8abe-e727df2a42b2', 1876, 'Salade komkommer- lunch/borrel', 'g', 238, 6.5, 5, 0.8, 23, 0.5, 360, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 22, 0.3, 7, 0.19, 0.1, 1, 0, 0),
	('df6e86de-0dc2-4309-a482-4a76408a7a71', 1877, 'Salade vlees- lunch/borrel', 'g', 286, 8.2, 4.9, 5, 25.7, 0.4, 653, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 14, 0.5, 7, 0.56, 0.2, 12, 0.01, 0),
	('e4ddedf1-5b1f-4a35-85c3-889359fc561b', 1878, 'Vruchtendrank Roosvicee Multivit', 'g', 36, 8.6, 8.5, 0.1, 0.1, 0, 10, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 3, 0.1, 2, 0.02, 0, 12, 0, 0),
	('a43f7ce1-3d92-42d0-9ccc-9b3eb19da410', 1879, 'Aroma strooi- natriumarm', 'g', 235, 27.9, 26.7, 22.1, 3.6, 1.1, 63, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 32, 6.1, 16, 0.2, 0, 2, 0, 0),
	('7a9c5788-7267-47c7-ab00-404c847c7f39', 1883, 'Bouillonpoeder natriumarm', 'g', 348, 67.4, 6, 5.3, 6.3, 0.6, 3385, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 19, 3.3, 31, 0.1, 0, NULL, NULL, NULL),
	('2cf179d6-7a91-4f75-bee0-7ce0c9878f52', 1885, 'Water gem', 'g', 0, 0, 0, 0, 0, 0, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0, 0, 0, 0, 0),
	('f7678f80-251b-42c9-87ec-f45cc8e7af10', 1886, 'Chutney mango-', 'g', 215, 52, 52, 0.7, 0.1, 1.4, 1200, 'NEVO-online 2025/9.0', 'Hartige sauzen', 9, 1.1, 19, 0, 0, 0, 0, 0),
	('1696c509-b3a0-418f-bbb4-e5e8c6881758', 1887, 'Dadels vers', 'g', 139, 31.3, 31.3, 1.5, 0.1, 3.6, 7, 'NEVO-online 2025/9.0', 'Fruit', 24, 0.3, 24, 0.2, 0, 14, 0, 0),
	('37fa98b6-2791-495f-af8e-1c4bcbbd2d7d', 1888, 'Carambola', 'g', 37, 7.2, 7.1, 0.5, 0.3, 1.7, 2, 'NEVO-online 2025/9.0', 'Fruit', 5, 0.6, 6, 0.1, 0, 31, 0, 0),
	('d674a06d-2c56-4645-87ae-515ad073dfb0', 1889, 'Couscous rauw', 'g', 363, 72.1, 2.2, 12, 2.1, 3.7, 4, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 28, 2, 59, 1.8, 0, 0, 0, 0),
	('cb43c367-0fcc-4e29-a653-946ecf1b9321', 1890, 'Gerst hele korrel rauw', 'g', 330, 59.7, 1.7, 10.6, 2.1, 14.8, 4, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 50, 6, 91, 3.3, 0, 0, 0, 0),
	('f5a938a6-2e36-4d9e-aad9-247804e8bafb', 1891, 'Mierikswortel rauw', 'g', 80, 11, 7.3, 4.5, 0.3, 7.5, 8, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 120, 2, 36, 1.4, 0, 120, NULL, NULL),
	('4a9e8306-a906-47ce-9cb1-ff1aff5805cb', 1892, 'Paksoi rauw', 'g', 14, 1.4, 1.4, 1, 0.2, 1.2, 7, 'NEVO-online 2025/9.0', 'Groente', 54, 0.6, 7, 0.2, 0, 21, 0, 0),
	('f523716f-abb7-4663-8ed9-2b7c71de482f', 1893, 'Kaas Bel Paese', 'g', 374, 0.1, 0.1, 25.4, 30.2, 0, 630, 'NEVO-online 2025/9.0', 'Kaas', 604, 0.6, NULL, 2.5, 0.2, 0, 0.02, 0),
	('8991fb6a-6c55-4a09-808e-117d7cdc5f71', 1894, 'Bonen kidney- rode gedroogd', 'g', 295, 36.9, 2.4, 22.1, 1.4, 23.4, 18, 'NEVO-online 2025/9.0', 'Peulvruchten', 100, 6.4, 150, 3, 0, 4, 0, 0),
	('d50eba62-0d45-4490-8be1-073f5dd00433', 1895, 'Noten pecan- ongebrand ongezouten', 'g', 721, 4.4, 4, 9.2, 72, 9.6, 0, 'NEVO-online 2025/9.0', 'Noten en zaden', 70, 2.5, 121, 4.53, 0, 1, 0, 0),
	('4b064d2b-4c4b-4fed-8cc1-f884f1fd3c79', 1896, 'Noten pistache- gezouten', 'g', 592, 10.8, 5.7, 23.8, 48.3, 9.5, 660, 'NEVO-online 2025/9.0', 'Noten en zaden', 131, 4.3, 136, 2.9, 0, 0, 0, 0),
	('7549f802-b17f-4c92-8c3c-918feafd9fc9', 1897, 'Zeewier kelp rauw', 'g', 47, 8.3, 0.6, 1.7, 0.6, 1.3, 233, 'NEVO-online 2025/9.0', 'Groente', 168, 2.9, 121, 1.23, 0, 3, 0, 0),
	('8a342c7b-3fa9-443c-ac5f-e2c88054a171', 1898, 'Zeewier agar agar gedroogd', 'g', 336, 73.2, 3, 6.2, 0.3, 7.7, 102, 'NEVO-online 2025/9.0', 'Groente', 625, 21.4, 770, 5.8, 0, 0, 0.09, 0),
	('32cb2a3a-0a92-4e6e-8e69-4d91ba79e17a', 1899, 'Jacobsschelpen rauw', 'g', 83, 2.4, 0, 16.8, 0.8, 0, 161, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 24, 0.3, 56, 0.95, NULL, 3, 0.09, 0.09),
	('c898ec59-21bc-475d-9301-1e813f7c680f', 1900, 'Geitenvlees rauw gem', 'g', 103, 0, 0, 20.6, 2.3, 0, 82, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 12, 2.8, NULL, 4, NULL, 0, 0, 0),
	('00b7c9a4-363a-4bd3-bc0b-d1b20d3b5c15', 1901, 'Nier varkens- rauw', 'g', 86, 0, 0, 15.5, 2.7, 0, 200, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 6.4, 17, 2.4, 1, 7, NULL, NULL),
	('dc97e677-4089-4017-87c0-3eda9e437006', 1902, 'Nier runder- rauw', 'g', 88, 0, 0, 17.2, 2.1, 0, 170, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 11, 7.2, 16, 1.9, 1, 8, 0, 0),
	('98b623e9-16b8-462b-a365-a53b5904e3d7', 1903, 'Nier lams- rauw', 'g', 91, 0, 0, 17, 2.6, 0, 150, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 5.5, 18, 2.5, 0.1, 9, NULL, NULL),
	('c90a42eb-3d18-414b-a07f-47ddbed1c6c3', 1904, 'Groenten gekookt gem', 'g', 30, 3.6, 2.2, 1.7, 0.4, 2.4, 29, 'NEVO-online 2025/9.0', 'Groente', 38, 0.6, 16, 0.36, 0, 18, 0, 0),
	('6f1c61d7-ca0a-4870-897c-771bc3a43169', 1905, 'Groenten rauw gem', 'g', 20, 2.6, 2.4, 1, 0.4, 1.4, 9, 'NEVO-online 2025/9.0', 'Groente', 27, 0.6, 11, 0.3, 0, 18, 0, 0),
	('e3976a21-b8ae-4f12-8a05-4d22ba25e1e9', 1906, 'Fruit vers incl citrus- gem', 'g', 61, 12.8, 11.1, 0.7, 0.2, 1.7, 1, 'NEVO-online 2025/9.0', 'Fruit', 11, 0.2, 13, 0.15, 0, 20, 0, 0),
	('edd6c0cb-809f-4859-a2da-e00a84243cd9', 1907, 'Vleeswaren excl leverproducten gem', 'g', 230, 2.6, 0.9, 16.9, 16.7, 0.2, 1037, 'NEVO-online 2025/9.0', 'Vleeswaren', 17, 1.2, 18, 2.26, 0.5, 12, 0.01, 0),
	('487e8cc6-c937-4892-932c-85362b72c108', 1908, 'Vleeswaren <10 g vet excl leverprod gem', 'g', 133, 2.5, 0.8, 18.4, 5.3, 0.1, 998, 'NEVO-online 2025/9.0', 'Vleeswaren', 7, 0.9, 23, 1.97, 0.1, 14, 0, 0),
	('318d72e6-64c5-4a5a-80be-3f317c47a8ad', 1909, 'Worst excl leverproducten gem', 'g', 352, 2.5, 0.9, 16.3, 30.7, 0.3, 1174, 'NEVO-online 2025/9.0', 'Vleeswaren', 30, 1.4, 15, 2.21, 0.8, 14, 0.01, 0.01),
	('287bd860-a129-46cd-a152-bc6ee7247087', 1910, 'Vleeswaren 20-30 g vet excl leverprod gem', 'g', 311, 3.2, 1, 13.8, 26.9, 0.1, 1046, 'NEVO-online 2025/9.0', 'Vleeswaren', 29, 1.3, 13, 2.31, 0.8, 22, 0.01, 0),
	('c0932ea3-ebea-463f-9ca1-482a443cfeab', 1911, 'Vleeswaren >30 g vet excl leverprod gem', 'g', 395, 2, 0.9, 17.6, 35.1, 0.3, 1262, 'NEVO-online 2025/9.0', 'Vleeswaren', 36, 1.5, 16, 2.36, 0.9, 7, 0.01, 0),
	('bed38a7e-7696-4942-9fce-db5b633caa65', 1912, 'Saus Chinese zoetzure huishoudelijk bereid', 'g', 32, 6.9, 3.5, 0.4, 0.3, 0.2, 382, 'NEVO-online 2025/9.0', 'Hartige sauzen', 3, 0.2, 3, 0.05, 0, 1, 0, 0),
	('84d466fc-d956-4920-8327-f18fa80e0a3d', 1913, 'Saus sate- huishoudelijk bereid m water m vet', 'g', 295, 10.8, 8.5, 8.7, 23.3, 3.2, 482, 'NEVO-online 2025/9.0', 'Hartige sauzen', 25, 1.1, 58, 1.02, 0, 1, 0, 0.04),
	('ddb414d8-cb48-48b4-85ed-8d648f4adc86', 1914, 'Brooddeeg (bodem voor pizza/hartige taart) onbereid', 'g', 231, 37.6, 0.3, 5.6, 5.9, 2.3, 207, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 12, 0.6, 12, 0.35, 0, 0, 0, 0),
	('98ea7d08-b739-44b0-be6e-ad35ef319cfd', 1915, 'Soes ongevuld', 'g', 223, 13.8, 0.2, 6, 15.9, 0.8, 252, 'NEVO-online 2025/9.0', 'Gebak en koek', 26, 1, 9, 0.63, 1.8, 0, 0.01, 0),
	('9ce31e5b-54b3-4612-9489-00c3611192d5', 1916, 'Room slag- geklopt m suiker', 'g', 348, 16.5, 16.5, 2, 30.4, 0, 31, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 67, 0, 7, 0.15, 0.1, 1, 0.02, 0),
	('f482e975-49ff-4e53-95a7-b4634a824469', 1917, 'Vlaaibodem Limburgse', 'g', 297, 41.3, 4.9, 7.3, 10.9, 2.3, 465, 'NEVO-online 2025/9.0', 'Gebak en koek', 49, 1, 16, 0.67, 1, 0, 0.01, 0),
	('a10b8014-7307-4db5-9a81-e1d4a5aded65', 1932, 'Sap sinaasappel- m vruchtvlees', 'g', 42, 8.7, 8.7, 0.7, 0, 0.4, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 8, 0.1, 11, 0.08, 0, 24, 0, 0),
	('9b25e707-8f18-4f09-b807-42f8f560d17f', 1933, 'Sap tomatengroenten- Appelsientje Tomatientje', 'g', 14, 2.5, 2.5, 0.7, 0, 0.8, 222, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 12, 0.3, 27, NULL, 0, 15, 0, 0),
	('cc8702b4-d096-4790-b632-332427657706', 1934, 'Sap tomaten- Appelsientje Zontomaat', 'g', 17, 2.8, 2.8, 0.9, 0, 0.9, 219, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 11, 0.4, 11, 0.12, 0, 15, 0, 0),
	('ca6a91fc-90e5-42a2-8784-dbe9f53e3bb6', 1935, 'Noten gemengd gezouten', 'g', 656, 11, 4.4, 18.3, 58.3, 6.8, 352, 'NEVO-online 2025/9.0', 'Noten en zaden', 117, 4, 219, 3.94, 0, 0, 0, 0),
	('884d386f-ad7e-45ad-af17-1940bcb219d4', 1936, 'Kalkoenfilet rauw', 'g', 110, 0, 0, 24.8, 1.2, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 1, 26, 0.9, 0, 2, 0, 0),
	('36baf022-7ca5-4c54-b305-9c57a6bd4615', 1937, 'Chips tortilla naturel', 'g', 480, 61.8, 1.1, 6.8, 22, 4.3, 283, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 5, 2.3, 32, 0.23, 0, 0, 0, 0),
	('fb4a450f-72c8-41e7-a6bd-292eca8af228', 1938, 'Saus sate- op basis pakje bereid', 'g', 148, 19.8, 4.7, 4.2, 5.6, 1, 853, 'NEVO-online 2025/9.0', 'Hartige sauzen', 29, 0.4, 24, 0.45, 0, 0, 0, 0),
	('fe29a870-191e-46fa-9a01-ccd1c1df5b0b', 1939, 'Kaas blauwschimmel Gorgonzola', 'g', 359, 0.1, 0.1, 19.4, 31.2, 0, 1450, 'NEVO-online 2025/9.0', 'Kaas', 612, 0.3, NULL, 2.5, 0.2, 0, 0.02, 0),
	('15a3585c-9a92-4ef8-86d2-b5ec59da7832', 1943, 'Zoutjes Japanse mix m pinda''s', 'g', 421, 75.6, 2.3, 10.9, 8, 1.6, 525, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 20, 1, 48, 1.49, 0, 0, 0, 0),
	('01f35166-9bf2-4e26-a53f-beecddb54e2c', 1945, 'Broodje pudding-', 'g', 214, 38, 9.9, 5.2, 4.3, 1.4, 194, 'NEVO-online 2025/9.0', 'Gebak en koek', 81, 0.5, 15, 0.57, 0.1, 0, 0, 0),
	('16911b33-07ac-45b1-b569-19ef4348e338', 1953, 'Plantaardig alternatief voor vruchten-/vanilleyoghurt obv soja m suiker verrijkt m calcium en vitamines', 'g', 66, 8.7, 7.7, 3.4, 1.7, 0.8, 54, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 130, 0.4, 17, 0.29, 0.9, 0, 0, 0),
	('d5ebda3e-377e-4ab2-bf69-52ddb346a4c5', 1955, 'Kaas Mozzarella gemaakt v koemelk', 'g', 253, 0.7, 0.7, 18.7, 19.5, 0, 480, 'NEVO-online 2025/9.0', 'Kaas', 160, 0.4, 10, 2.6, 0.2, 0, 0.01, 0),
	('a50f81b4-22ff-4627-8840-1197fdfa98d2', 1956, 'Halvarineproduct Becel pro-activ', 'g', 362, 0.3, 0.3, 0.3, 40, 0.2, 8, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('23fdd827-956a-4c04-b147-73b14e2190ea', 1957, 'Vla slagroom-', 'g', 120, 15.1, 12.1, 2.7, 5.4, 0, 47, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 117, 0, 10, 0.31, 0, 1, 0, 0),
	('b7476cd6-844b-48b6-9277-78eec7984f6b', 1958, 'Pap karnemelkse gorte-', 'g', 53, 8.1, 3.1, 3.6, 0.5, 0.3, 39, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 98, 0, 10, 0.3, 0, 1, 0, 0),
	('d627000c-97fc-470c-9dfc-72e5c5c1f46d', 1961, 'Halvarineproduct Blue Band Goede Start', 'g', 347, 1.1, 0.3, 0.3, 38, 0, 152, 'NEVO-online 2025/9.0', 'Vetten en oliën', 603, 0.1, 2, 0, 7.5, 0, 0, 0),
	('172bd08a-ffb6-4801-b7a5-14bd835a27b5', 1962, 'Hagelslag chocolade- melk', 'g', 455, 70.3, 64.7, 6.3, 15.6, 3.7, 51, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 116, 4.5, 66, 1.1, 0, 0, 0, 0),
	('f3ced93e-ac34-4561-bb73-7f32f7d0037c', 1963, 'Hagelslag chocolade- puur', 'g', 446, 67.4, 60.5, 5.8, 15.3, 6.6, 27, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 36, 8.1, 119, 1.27, 0, 0, 0, 0),
	('90b6eb2e-9a65-4c5a-b2fe-7b133fa68784', 1964, 'Pasta chocolade- melk', 'g', 570, 61, 61, 2.4, 35, 0.5, 38, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 97, 1.7, 42, 1.3, 0, 0, 0, 0),
	('454c4140-4e45-4c9e-9a43-4f5a4922a497', 1965, 'Biscuit melk- Liga Milkbreak', 'g', 444, 62, 20, 9.2, 17, 3, 352, 'NEVO-online 2025/9.0', 'Gebak en koek', 450, 4.7, 28, NULL, 0.1, 0, 0, 0),
	('5d695779-d6b7-403f-b6ec-5e2f92a69057', 1969, 'Cake m roomboter', 'g', 401, 42.9, 25.3, 5.8, 22.7, 1, 463, 'NEVO-online 2025/9.0', 'Gebak en koek', 36, 0.8, 11, 0.56, 0.5, 0, 0.03, 0),
	('193148a4-7253-49be-aa58-a98dfd294535', 1972, 'Koekje roomboter- gem', 'g', 448, 60.7, 31.3, 5.3, 20.1, 1.7, 205, 'NEVO-online 2025/9.0', 'Gebak en koek', 29, 0.7, 18, 0.43, 0, 0, 0.01, 0),
	('69d31e89-ec09-483e-9552-0a3265a0ee0d', 1973, 'Opvolgmelk Nutrilon 3 p 100 ml', 'ml', 66, 8.4, 6.4, 1.3, 2.9, 0.5, 23, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 63, 1, 5, 0.49, 1.4, 10, NULL, 0.01),
	('2d686888-db46-494a-9554-d3d476ea6183', 1991, 'Ontbijtproduct Olvarit pap 8 granen 12+ mnd', 'g', 378, 72.6, 5.4, 11.5, 2.2, 10.7, 4, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 26, 2.2, 90, 2.2, 0, 1, 0, 0),
	('1ec7b980-badb-4722-b7bf-118859fabc27', 1999, 'Ontbijtproduct Frosties Kellogg''s', 'g', 375, 87, 37, 4.5, 0.6, 2, 332, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 3, 8, 10, 0.3, 8.4, 0, 0, 0),
	('49f5ef18-3194-4007-a499-f3ecf88aaebe', 2002, 'Ontbijtproduct Coco pops Kellogg''s', 'g', 386, 84, 17, 6.3, 1.9, 3.8, 260, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 35, 8, 50, 1, 8.4, 0, 0, 0),
	('d8eee523-d342-48f8-abce-69e0063e8f69', 2004, 'Ontbijtproduct All-Bran Fruit ''n Fibre Kellogg''s', 'g', 380, 69, 24, 8, 6, 9, 400, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 30, 8, 70, 1.5, 6.3, 0, 0, 0),
	('1ae653ef-e0f9-402d-8f41-f8f52969c957', 2005, 'Ontbijtproduct Special K Original Kellogg''s', 'g', 392, 84, 15, 8, 1.3, 6, 336, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 60, 14, 40, 1.5, 8.4, 0, 0, 0),
	('7e64a3bb-f0de-499a-a7d7-639572ba7f7b', 2006, 'Ontbijtproduct Smacks Kellogg''s', 'g', 377, 81, 34, 7.1, 1.6, 5, 8, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 18, 8, 60, 1.5, 8.3, 0, 0, 0),
	('ac029dab-1093-4383-adf3-7390f0b848d9', 2007, 'Ontbijtproduct Honey pops Loops Kellogg''s', 'g', 396, 76, 22, 9.3, 4.4, 7.5, 256, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 28, 8, 70, 2, 8.3, 0, 0, 0),
	('7d4a4f0a-8b6f-4037-95c1-8234d7d99980', 2009, 'Taart vruchten- v zandgebak', 'g', 248, 31.3, 16.6, 3.1, 11.8, 1.7, 145, 'NEVO-online 2025/9.0', 'Gebak en koek', 21, 0.7, 12, 0.33, 1.1, 20, 0, 0),
	('344e68b8-9891-4862-bba8-a6765568a7fc', 2010, 'Taart vruchten- v cakedeeg', 'g', 197, 25.1, 14.1, 2.6, 9.2, 1.6, 119, 'NEVO-online 2025/9.0', 'Gebak en koek', 10, 0.4, 7, 0.25, 0.9, 2, 0, 0),
	('6131fb0f-be67-45ba-992a-578e2f2fc5b4', 2012, 'Maaltijdvervanger Modifast Intensive Pudding', 'g', 355, 35.6, 23.9, 36.8, 4.9, 10.6, 787, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 957, 12.8, 248, 10.6, 3.6, 53, NULL, NULL),
	('785ccd85-0d27-40d8-991a-630f6243d498', 2013, 'Maaltijdvervanger milkshake Modifast Intensive', 'g', 355, 35.7, 25.7, 36.8, 4.9, 10.6, 787, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 638, 12.8, 248, 10.6, 3.6, 53, NULL, NULL),
	('63104db3-3809-4239-97ea-8f38055be6f5', 2024, 'Sportvoeding Isostar Actifood', 'g', 204, 49.8, 12, 0.6, 0, 1.4, 4, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 9, 0.6, 0, NULL, 0, 46, 0, 0),
	('76b28d0a-b635-40ff-8c36-e5292c29b36e', 2027, 'Sportvoeding Isostar Powertabs', 'g', 320, 79.9, 70.5, 0, 0, 0, 1430, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 360, 0, 156, 0, 0, 80, 0, 0),
	('ad47a568-c46d-496e-884f-dd6b6c3d7054', 2030, 'Gehakt fijn- vegetarisch obv mycoproteine onbereid', 'g', 95, 0.7, 0, 14.1, 2.5, 6.5, 34, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 187, 0.3, 43, 6.23, 0, 0, 0, 0),
	('c45e27f3-6505-46d9-865a-ec50ec9c07d9', 2031, 'Stukjes vegetarisch obv mycoproteine onbereid', 'g', 86, 1.5, 0, 12.6, 2.1, 5.5, 233, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 138, 0.3, 32, 5.37, 0, 0, 0, 0),
	('6728948f-9b7d-454a-860b-f085ebc20fe3', 2041, 'Sportdrank AA-Drink Isotone', 'g', 23, 5.7, 5.4, 0, 0, 0, 49, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 12, 0, 8, 0, 0, 15, 0, 0),
	('d6a09550-67f8-4299-8218-7358ca1278f9', 2042, 'Sportdrank hypertone m koolhydraten', 'g', 59, 14.8, 14.5, 0, 0, 0, 8, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 7, 0, 1, 0, 0, 25, 0, 0),
	('e2a845fa-c7a1-4194-b866-6a157e31cb38', 2047, 'Gehakt fijn- vegetarisch obv soja onbereid', 'g', 148, 5.8, 2, 20, 3, 8.9, 520, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 140, 2.7, 110, 0.96, 0, 0, 0, 0),
	('838cfe82-9c72-4953-a0d1-2ce252106f6e', 2048, 'Pinda''s dry roasted', 'g', 577, 11, 3.5, 24, 47, 7, 800, 'NEVO-online 2025/9.0', 'Noten en zaden', 48, 1.7, 173, 3.2, 0, 0, 0, 0),
	('d1b5b5e5-d858-4e24-ad57-5dfc1179e9c2', 2049, 'Rijst meergranen- rauw', 'g', 351, 74, 1, 9, 1.5, 2.7, 20, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 12, 1.3, 94, 0.8, 0, 0, 0, 0),
	('ccf18a18-86c0-4037-a8d2-5124006f067d', 2051, 'Ontbijtproduct Brinta Wake Up drinkontbijt', 'g', 350, 72.5, 24, 5.7, 1.2, 13.4, 3, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 0, 9.3, 96, 1.9, 0, 54, 0, 0),
	('0d9dc8f3-0c61-47e8-b323-8acc70877fc6', 2054, 'Babyvoeding maaltijd 12 mnd', 'g', 72, 9.6, 1.6, 3.6, 1.7, 1.6, 64, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('2c6bfba1-1931-4394-9416-e5907189cf73', 2056, 'Babyvoeding fruit 6 mnd', 'g', 65, 14.5, 11.9, 0.6, 0.2, 1.4, 11, 'NEVO-online 2025/9.0', 'Fruit', 40, 0.3, 11, 0.14, 0, 18, 0, 0),
	('39cd050f-6c9b-4f85-a818-05c1954b73f2', 2057, 'Lamsvlees <10 g vet rauw gem', 'g', 158, 0, 0, 20.7, 8.3, 0, 70, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 12, 1.8, 22, 3.2, 0.2, 0, 0, 0),
	('28858f9d-c2aa-4a3b-97c1-7b3bf35290ac', 2058, 'Schapenvlees <10 g vet gem rauw', 'g', 160, 0, 0, 20.5, 8.7, 0, 70, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 12, 2.1, 22, 3.2, 0.1, 0, 0, 0),
	('328e87e7-3cf2-4b45-bbdd-e7c7ac202b54', 2059, 'Halvarine 40% vet <17 g verz vetz gezouten', 'g', 356, 0.5, 0.1, 0.1, 39.2, 0.1, 191, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.3, 0, 0, 0),
	('4f7f3008-48af-410e-85ce-226617ec74b2', 2060, 'Halvarineproduct 35% vet <10g verz vetz ongezouten', 'g', 320, 1.2, 0, 0, 35, 0, 3, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('5e07fde9-e71f-4b70-bbd2-1c36643926ee', 2063, 'Margarine 80% vet >24 g verz vetz gezouten', 'g', 719, 0.3, 0.3, 0.1, 79.7, 0, 486, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('85bfbf26-a3a8-4a6c-89d8-e99e00c64dad', 2066, 'Bak- en braadvet vloeib 97% vet <17g verz vetz gezouten', 'g', 878, 0.9, 0.7, 0.5, 96.9, 0, 393, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('eacd24f0-3656-4a6b-98fa-21ed6691be83', 2067, 'Bak- en braadvet vast 97% vet >17 g verz vetz gezouten', 'g', 873, 0.5, 0.4, 0.3, 96.7, 0, 324, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('1782e016-4b7e-46d1-8fc2-9d5ecf3f858c', 2068, 'Vet frituur- vloeibaar', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, NULL, NULL),
	('e2be9603-437e-4f05-902c-674a232a554f', 2069, 'Vet frituur- vast', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, 0, 0),
	('f50ff14a-8203-4ccd-87b7-7ed62d00655f', 2072, 'Margarineproduct 60% vet <17 g verz vetz ongez', 'g', 541, 0.1, 0.1, 0.1, 60, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('12758c0b-7fc6-48fd-8d48-b2045be38a56', 2077, 'Margarine vloeibaar 80% vet <17 g verz vetz gezouten', 'g', 735, 0, 0, 0, 81.6, 0, 414, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('4f7a2442-f6ef-43fe-8ad4-02688eae54f1', 2079, 'Drinkontbijt Coolbest FruitOntbijt', 'g', 53, 11.6, 9.2, 0.8, 0.2, 1, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 0.3, NULL, NULL, 0, 31, 0, 0),
	('9508d46d-b4b2-4677-a14a-d9291bb4fd01', 2081, 'Ontbijtproduct Cornflakes', 'g', 373, 82.7, 4.7, 7.1, 0.6, 4, 370, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 3, 0.2, 10, 0.19, 0, 0, 0, 0),
	('98069ef1-7b89-46d3-8e8b-641f66f46b5c', 2083, 'Mayonaiseproduct m olijfolie', 'g', 642, 1.9, 1.5, 1.1, 70, 0.1, 324, 'NEVO-online 2025/9.0', 'Hartige sauzen', 13, 0.5, 2, 0.29, 0.2, 0, NULL, NULL),
	('2578886e-1492-4e9a-8536-c8346073d326', 2086, 'IJsthee m suiker 5-<7 g KH', 'g', 25, 6.2, 6.1, 0, 0, 0, 41, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 2, 0, 0, 0, 0, 0, 0, 0),
	('81a8b5b5-95cc-4f52-bcbf-858d98eb3bd2', 2087, 'IJsthee light', 'g', 2, 0.2, 0.2, 0.1, 0.1, 0, 30, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0.2, 0, 0, 0, 0, 0, 0),
	('b1ee4352-da5c-4936-8584-af3b396cc163', 2088, 'IJsthee m suiker en zoetstof', 'g', 18, 4.1, 4, 0.1, 0.1, 0, 20, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 2, 0, 0, 0, 0, 0, 0, 0),
	('767c3c44-fd30-481a-b135-167babad82ca', 2089, 'Struisvogelvlees rauw', 'g', 121, 0.4, 0.4, 22.9, 3.1, 0, 81, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 4.5, 22, 2, NULL, 0, 0.01, 0),
	('bd8118c4-1dd8-4fb3-9e2c-5d16108bc6dd', 2090, 'Kip drumstick m vel rauw', 'g', 147, 0, 0, 19.1, 7.9, 0, 86, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 0.9, 22, 1.93, 0.3, 0, 0.02, 0.07),
	('433748f8-0ba2-4733-93c5-65e70e719dd4', 2106, 'Frites bereid m hard vet', 'g', 256, 28, 0.2, 3.1, 13.9, 3.2, 34, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.5, 21, 0.37, 0, 17, 0, 0),
	('9fe4d45c-fe05-4c60-bfa7-233054154df2', 2107, 'Frites bereid m vloeibaar vet', 'g', 264, 28, 0.2, 3.1, 14.8, 3.2, 34, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.5, 21, 0.37, 0, 17, 0, 0),
	('e91d1b2a-140b-4007-8192-d204b1259a7b', 2108, 'Frites bereid gem', 'g', 263, 28, 0.2, 3.1, 14.7, 3.2, 34, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.5, 21, 0.37, 0, 17, 0, 0),
	('277a317d-414e-4a48-ba4e-a5c1e70f2371', 2109, 'Cassave gekookt', 'g', 128, 30.4, 1.3, 0.5, 0.2, 1.5, 4, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 17, 0.5, 18, 0.3, 0, 17, 0, 0),
	('6528b53e-0082-47d4-9f65-a10ea4fa40c1', 2110, 'Taro gekookt', 'g', 102, 22.4, 0.9, 1.2, 0.2, 3, 3, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 27, 0.8, 31, 1.3, 0, 7, 0, 0),
	('69590239-61dd-4733-a7b1-b257895af05f', 2111, 'Yam gekookt', 'g', 144, 33, 0.7, 1.7, 0.3, 1.4, 17, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 12, 0.4, 12, 0.4, 0, 4, 0, 0),
	('4e3a7d43-44b7-4f91-af90-6fe6b2494c54', 2112, 'Aardappel zoete gekookt', 'g', 63, 12.3, 9, 1.7, 0.2, 2.7, 37, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 58, 0.5, 20, 0.3, 0, 3, 0, 0),
	('f334e62d-ecb3-4bd2-bd67-7e248a46e9ce', 2113, 'Pompoen gekookt', 'g', 14, 1.8, 1.7, 0.6, 0.3, 1.1, 2, 'NEVO-online 2025/9.0', 'Groente', 23, 0.1, 7, 0.2, 0, 7, 0, 0),
	('7a427a6a-5afc-4e36-a551-35278bee3c3a', 2134, 'Limonade vruchten- Dubbelfrisss', 'g', 22, 5.5, 5.5, 0, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0, 0, 2, 0, 0),
	('53421cef-9df5-42dc-8934-ebc37f47bb5b', 2135, 'Limonade vruchten- Tintelfruit m suiker', 'g', 22, 5.4, 5.3, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0, 0, 15, 0, 0),
	('01409a59-acde-46c1-bb7b-ce6818865a75', 2137, 'Limonade vruchten- Tintelfruit light', 'g', 12, 2.9, 2.8, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 0.1, 2, 0, 0, 15, 0, 0),
	('e170ab94-a067-483a-9cd3-b538ea9d9c96', 2141, 'Mineraalwater m zoetstof', 'g', 0, 0, 0, 0, 0, 0, 7, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0, 0, NULL, 0, 0, 0, 0),
	('7d8d8947-dc99-4cb4-b157-16978a0616ef', 2142, 'Wijn witte zoete', 'g', 96, 5.9, 5.9, 0.2, 0, 0, 13, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 14, 0.6, 11, 0, 0, 0, 0, 0),
	('62d1ebb5-8f19-4378-886f-cbde239780c7', 2144, 'Sap appel- verrijkt m vit C', 'g', 45, 11.1, 10.7, 0.2, 0, 0.1, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 8, 0.1, 5, 0.03, 0, 23, 0, 0);
INSERT INTO public.nutrition_foods VALUES
	('42aa6f75-7459-4eef-906d-fdc0e0e07658', 2147, 'Zoutjes Japanse mix z pinda''s', 'g', 387, 86, 1.9, 8.5, 0.9, 0.8, 610, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 14, 0.8, 21, 1.2, 0, 0, 0, 0),
	('930c0849-9e5c-4753-98fe-d4c33e758e98', 2157, 'Pasta volkoren gekookt', 'g', 134, 23.7, 0.4, 5.6, 0.9, 4.2, 5, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 25, 1.7, 47, 1.3, 0, 0, 0, 0),
	('0bc0fdc1-630c-41f5-acdc-9f576f120409', 2158, 'Couscous gekookt', 'g', 121, 24, 0.7, 4, 0.7, 1.2, 2, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 13, 0.7, 20, 0.6, 0, 0, 0, 0),
	('edaae908-c0e3-4573-8e15-247449465bbf', 2159, 'Gierst gekookt', 'g', 123, 23.1, 0.2, 3.9, 1.4, 0.9, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 6, 1.6, 34, 1.13, 0, 0, 0, 0),
	('a8be6f4a-077b-4840-9b2b-507f355e3b00', 2162, 'Cafe noir', 'g', 420, 89, 62.4, 3.4, 5.4, 0.8, 210, 'NEVO-online 2025/9.0', 'Gebak en koek', 29, 0.6, 13, 0.36, 0, 0, 0.01, 0),
	('3a775bd5-7df9-4e31-8f8a-bd7cacc52758', 2163, 'Zoutje mais- Bugles', 'g', 537, 55, 5, 6.3, 32, 1.8, 865, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 8, 0.8, 6, 0.13, 0, 0, 0, 0),
	('38a61dbd-4194-4b54-af8c-b9438ec91982', 2173, 'Chips op basis v aardappelvlokken', 'g', 522, 51.8, 3, 4.2, 32.5, 2.6, 517, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('51747c1f-3d2b-428c-9ea8-bdb73ad99ee3', 2176, 'Pijnboompitten', 'g', 675, 9.8, 4.9, 16.5, 61.9, 6.3, 4, 'NEVO-online 2025/9.0', 'Noten en zaden', 26, 5.5, 233, 4.25, 0, 2, 0, 0),
	('ede7c8b4-6aed-4d43-a283-9d6f2fbf28e0', 2177, 'Basilicum vers', 'g', 48, 5.1, 5.1, 3.1, 0.8, 3.9, 9, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 250, 5.5, 11, 0.7, 0, 26, NULL, NULL),
	('fb1fbbad-c6bd-41ac-8135-79d7590b8bc6', 2178, 'Pesto groene', 'g', 444, 4.4, 2.7, 9, 42.8, 2.6, 880, 'NEVO-online 2025/9.0', 'Hartige sauzen', 216, 3.2, 50, 1.45, 0, 13, 0, 0),
	('df743329-3fcc-4d0b-bd56-c558a64b32dd', 2190, 'Brownie m noten', 'g', 447, 50.9, 41.8, 5.1, 24.3, 2.2, 141, 'NEVO-online 2025/9.0', 'Gebak en koek', 27, 1.3, 32, 0.85, 1.4, 0, 0.01, 0),
	('d43b968f-db71-4fe6-ab67-7f48bcfe22c4', 2208, 'Zuigelingenvoeding Hero Baby Standaard 1 p 100 ml', 'ml', 67, 7.2, 6.6, 1.4, 3.5, 0.3, 20, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 50, 0.8, 6, 0.6, 1.2, 9, NULL, 0.01),
	('02b3d410-b211-4a34-a113-a6f95ac43e0a', 2209, 'Opvolgmelk Hero Baby Standaard 2 p 100 ml', 'ml', 69, 9.2, 6.3, 1.6, 2.8, 0.3, 24, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 71, 1.1, 8, 0.7, 1.3, 13, NULL, 0),
	('036c8a65-33f2-44b3-8d36-6811d6acbada', 2210, 'Opvolgmelk Hero Baby Standaard 3 p 100 ml', 'ml', 70, 8.8, 6.6, 1.8, 3, 0.3, 27, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 65, 1, 7, 0.71, 1.5, 11, NULL, 0),
	('108ce172-89ba-4474-828b-5b4aa287f34c', 2218, 'Sportdrank Extran Energy', 'g', 43, 10.8, 9.4, 0, 0, 0, 9, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 3, 0, 0, 0, 0, 21, 0, 0),
	('c3f5d918-fcff-4294-a7a6-24f21bac8e8e', 2219, 'Sportdrank Extran Hydro', 'g', 22, 5.5, 5, 0, 0, 0, 51, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 3, 0, 0, 0, 0, 16, 0, 0),
	('c86c0381-e959-4801-81c5-b01158f2bc80', 2221, 'Biscuit baby- en dreumes- Bolletje', 'g', 428, 70.5, 22, 8.5, 12, 2, 50, 'NEVO-online 2025/9.0', 'Gebak en koek', 360, 9.5, 20, 0.59, 0, 0, NULL, NULL),
	('dcf6692a-c630-455a-a5b2-d4e1156d0f63', 2227, 'Biscuit fourre', 'g', 473, 73.2, 34.5, 5.5, 17.1, 2, 213, 'NEVO-online 2025/9.0', 'Gebak en koek', 22, 1, 13, 0.63, 0.6, 0, 0.02, 0),
	('ba04cb48-0ed4-4b01-9955-a011aeb03771', 2228, 'Koekje Scholiertje', 'g', 493, 62.5, 38, 6.3, 23.5, 3.6, 230, 'NEVO-online 2025/9.0', 'Gebak en koek', 58, 0.4, 38, 0.88, 0, 0, 0.01, 0),
	('49fc96c5-0803-4df2-8e19-a3a08a65a9e4', 2229, 'Cracker VitaLU', 'g', 445, 67, 2.1, 12.3, 12.3, 8.4, 752, 'NEVO-online 2025/9.0', 'Brood', 40, 3, 77, 2.4, 0, 0, 0, 0),
	('d04456d5-57b3-451d-b625-9d8c3370c994', 2231, 'Wafel rijst- m chocolade', 'g', 502, 60.3, 25.3, 6.8, 24.9, 4.6, 50, 'NEVO-online 2025/9.0', 'Brood', 71, 2.3, 95, 1.52, 0, 1, 0, 0),
	('2068c645-3616-4f86-8292-6f427de06432', 2232, 'Biscuit fruit-', 'g', 396, 76.3, 36.7, 5.5, 7.1, 2.6, 200, 'NEVO-online 2025/9.0', 'Gebak en koek', 35, 1.4, 26, 0.3, 0, 0, 0, 0),
	('73c22119-2277-493a-a38b-a770f038420b', 2233, 'Koek ontbijt- m rozijnen', 'g', 315, 71.5, 42.3, 2.7, 1.2, 3.7, 167, 'NEVO-online 2025/9.0', 'Gebak en koek', 20, 0.9, 19, 0.6, 0.1, 0, 0, 0),
	('07ea9c95-3bab-4496-a71e-c6e60537edeb', 2234, 'Graanreep Hero B''tween', 'g', 444, 62, 31.9, 6.9, 17.7, 4.6, 181, 'NEVO-online 2025/9.0', 'Gebak en koek', 110, 2.2, 65, 1.3, 0.2, 1, 0, 0),
	('fd2d35c0-f85e-4e9c-9143-c934bc3398d6', 2235, 'Graanreep z suiker', 'g', 339, 67.3, 2.4, 7.3, 10.3, 4.9, 147, 'NEVO-online 2025/9.0', 'Gebak en koek', 70, 3.3, 119, 2.56, 0, 0, 0, 0),
	('80585596-da2b-4bde-9beb-1dfebc28a6a2', 2237, 'Graanreep Special K Kellogg''s', 'g', 400, 79.5, 35.5, 4.6, 6.5, 2.6, 233, 'NEVO-online 2025/9.0', 'Gebak en koek', 35, 5.6, 30, 1, NULL, NULL, NULL, NULL),
	('3dd980f0-3077-48ed-ab8c-1c08df38b8de', 2238, 'Graanreep m melk Kellogg''s', 'g', 417, 72.3, 36.7, 6, 11.3, 1.1, 267, 'NEVO-online 2025/9.0', 'Gebak en koek', 635, 11.1, 30, 1.17, NULL, NULL, NULL, NULL),
	('2004a957-7deb-4ca6-ac92-bb13eeee407a', 2239, 'Mueslireep', 'g', 455, 64.8, 25.7, 8.2, 16.8, 6, 256, 'NEVO-online 2025/9.0', 'Gebak en koek', 39, 3.1, 110, 2.1, 0, 0, 0.02, 0),
	('87a53d1f-468d-47b2-ba2a-cdc85c03cdd0', 2240, 'Melk geiten- volle', 'g', 64, 4.3, 4.3, 3.3, 3.7, 0, 49, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 100, 0.1, 13, 0.5, 0.1, 1, 0, 0),
	('3f06fde5-78f4-4589-8c8d-75756e54b914', 2241, 'Yoghurtsnack Breaker', 'g', 102, 13.3, 12.3, 3.4, 3.5, 0.6, 42, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 125, 0.1, 12, 0.43, 0, 1, 0, 0),
	('d9210c46-5ab0-4148-a4e0-ddb77ed73681', 2244, 'Yoghurt room- m vruchten', 'g', 141, 13.7, 11.8, 2.9, 7.8, 0.9, 32, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 104, 0, 10, 0.34, 0, 0, 0.01, 0),
	('b48c68a0-3a59-4b71-b64f-b3aa81d4254d', 2246, 'Kwark vruchten-/vanille- magere m zoetstof', 'g', 47, 4.1, 3.3, 7.2, 0.1, 0.3, 46, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 154, 0, 14, 0.61, 0, 0, 0, 0),
	('f9d36344-aa53-471d-8d57-7a20b91e0cec', 2248, 'Kwark vruchten- Danoontje', 'g', 96, 9.9, 9.2, 6.4, 3, 0.8, 32, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 0, 10, 0.4, 1.3, 0, 0, 0),
	('04783e9c-0282-42b3-87f5-40824699d582', 2250, 'IJs Festini', 'g', 100, 24, 20, 0.2, 0.2, 0.8, 2, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 7, 0.1, 2, 0.01, 0, 36, 0, 0),
	('2ebdf3ae-f8c8-40a9-af9b-8de42d53f15c', 2251, 'IJs room/vanille- m chocoladecoating', 'g', 324, 34, 29.8, 4.3, 18.7, 1, 60, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 127, 0.8, 24, 0.54, 0, 1, 0, 0),
	('31b88691-c515-4a72-a51b-3a17875be266', 2252, 'IJs room/vanille- m fruitcoating', 'g', 134, 24, 22.3, 1.5, 3.5, 0.2, 42, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 57, 0.1, 7, 0.16, 0, 1, 0, 0),
	('20f577fc-dfc1-44d7-928f-e35d0a2511d5', 2254, 'Yoghurtdrank m zoetstof', 'g', 24, 3.4, 3.3, 2.7, 0, 0, 39, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 101, 0, 10, 0.3, 0, 1, 0, 0),
	('6168e5c6-229d-4d99-98f1-b6add2e78148', 2255, 'Yoghurtdrank m zoetstof Fristi', 'g', 24, 3.2, 3.1, 1.8, 0, 2, 48, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 74, 0.1, 10, 0.3, 0, 1, 0, 0),
	('0a764693-cdad-47b2-9ff9-8f606a46590f', 2257, 'Drinkontbijt Goede Morgen Vifit', 'g', 55, 7.9, 7, 3.4, 0.8, 1.1, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 0.1, 9, 0.29, 0.4, 1, 0, 0),
	('7cb6affc-1520-4a7c-bcab-2b1b915958bc', 2258, 'Yoghurtdrank Actimel naturel', 'g', 70, 10.8, 10.8, 3, 1.6, 0, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 0.1, 12, 0.45, 0.8, 2, 0, 0),
	('a695d720-1141-4441-bef0-e7d8b0ba4792', 2261, 'Drink soja- Groeidrink 1-3+ Alpro', 'g', 60, 8, 2.4, 2.4, 2, 0.4, 15, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 115, 2, 14, 0.22, 1.5, 12, 0, 0),
	('b0622533-c56c-4b98-a1b0-b663d159aa76', 2262, 'Plantaardig alternatief voor room obv soja', 'g', 161, 2.6, 1.2, 2.2, 15.7, 0.5, 53, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 13, 0.4, 13, 0.25, 0, 0, 0, 0),
	('ce7a05cc-9108-4a88-821e-9e8549553d75', 2264, 'Kaas 10+', 'g', 187, 0.2, 0.2, 32.2, 6.4, 0, 865, 'NEVO-online 2025/9.0', 'Kaas', 1050, 0.1, 35, 4.5, 0.1, 0, 0, 0),
	('ba6d4743-3a75-44db-a35e-9e193044fece', 2265, 'Melkdrank Yakult Balance', 'g', 58, 14, 4.4, 1.2, 0, 0, 20, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 43, 0, 4, 0.14, 1.2, 0, 0, 0),
	('8c195bbc-d3da-4306-88ee-9e7e4a9db532', 2266, 'Chocolade witte', 'g', 552, 58.1, 58.1, 6.4, 32.6, 0, 116, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 260, 0.2, 28, 1, 0.1, 1, 0, 0),
	('dc89b484-d376-457a-b7b1-24bc2449ba7f', 2267, 'Vla magere m zoetstof', 'g', 47, 8.2, 4.3, 3.4, 0, 0.4, 62, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 89, 0, 7, 0.38, 0, 1, 0, 0),
	('ffa0ae02-3108-450f-ac52-54964f0bdffe', 2268, 'Creme fraiche halfvolle', 'g', 165, 4, 4, 3.1, 15, 0, 43, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 101, 0, 10, 0.32, 0.1, 2, 0.01, 0),
	('42df88db-eb4b-4ae4-8ff6-cc8bb0a60340', 2271, 'Pasta glutenvrij rauw', 'g', 358, 73.7, 0.4, 9, 2.5, 2.2, 50, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 6, 0.9, 31, 0.51, 0, 0, 0, 0),
	('23289d85-9b85-4c55-923a-ad3f01fbf953', 2272, 'Taartbodem v biscuitdeeg', 'g', 263, 48.4, 30.3, 7.5, 4.2, 0.8, 186, 'NEVO-online 2025/9.0', 'Gebak en koek', 33, 1.3, 12, 0.84, 0.8, 0, 0.01, 0),
	('5c6a7a51-7f6e-4fcb-b9f4-ecd3bc62b234', 2275, 'Room kook-', 'g', 212, 5, 3.2, 2.4, 20.2, 0.1, 50, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 88, 0.1, 8, 0.3, 0.1, 1, 0.01, 0),
	('ee18648b-9aad-4f8a-9588-2f25b958991b', 2276, 'Room kook- light', 'g', 101, 5.8, 4.4, 3.2, 7.2, 0, 48, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 102, 0.1, 11, 0.38, 0, 2, 0.01, 0),
	('4de7b220-236c-4a8e-8059-ef544008af77', 2278, 'Yoghurt volle Activia m granen/muesli', 'g', 104, 12.6, 11.1, 3.6, 3.6, 2.3, 44, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 0.1, 12, 0.43, 0, 1, 0, 0),
	('9c34938a-06fd-4f37-b1a1-57f2e53c1990', 2279, 'Room kook- Blue Band Finesse voor koken', 'g', 160, 4, 2.5, 2, 15, 0.3, 39, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 66, 0, 6, 0.2, 0, 1, 0, 0),
	('40ca4860-7fdb-4c4b-bec2-124304c4cdf2', 2287, 'Siroop vruchtenlimonade- m suiker en zoetstof 40-45 g KH', 'g', 170, 42.5, 42.1, 0, 0, 0, 6, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0, 4, 0.05, 0, 0, 0, 0),
	('1a235b78-2046-4616-bcf7-d6a1a717f94c', 2289, 'Siroop vruchtenlimonade- light', 'g', 8, 1.8, 0.9, 0, 0, 0.1, 6, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0, 4, 0.05, 0, 0, 0, 0),
	('f208f75e-689c-4f22-ad12-29a61fee1825', 2290, 'Kokosmelk', 'g', 173, 2.5, 1.5, 1.4, 17.4, 0.5, 15, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 3, 0.7, 26, 0.32, 0, 0, 0, 0),
	('180d9937-f8ef-4124-926a-3f991ebadc9c', 2292, 'Snoepje suikervrij', 'g', 240, 89.3, 0.2, 1.1, 2.1, 0, 82, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 4, 0.2, 2, 0.04, 0, 0, 0, 0),
	('0b827a30-5ba4-4a3c-8656-b967f6f08493', 2293, 'Tomaat in blik', 'g', 24, 3.7, 3.6, 1.1, 0.4, 0.7, 20, 'NEVO-online 2025/9.0', 'Groente', 11, 0.5, 9, 0.17, 0, 11, 0, 0),
	('c03d3ed4-af1e-4a0c-81ac-be99584b7ede', 2296, 'Koolvis (Atlantisch) rauw', 'g', 82, 0, 0, 18, 1.1, 0, 68, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 7, 0.3, 32, 0.4, 1.4, 0, 0.17, 0.28),
	('154a6fb5-b0d5-48da-9dd0-59a7b474c07a', 2297, 'Tonijn rauw', 'g', 101, 0, 0, 23.7, 0.7, 0, 47, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 16, 1.3, 33, 0.7, 3.2, 0, 0.03, 0.13),
	('9b9d9f8d-2c7c-4971-b6c3-4360f0df6a8d', 2298, 'Tong rauw (vis)', 'g', 76, 0, 0, 14.7, 1.9, 0, 100, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 17, 0.5, 17, 0.4, 1.1, 0, 0.08, 0.21),
	('4a01d854-79d7-440d-a82f-15915ad33001', 2299, 'Tilapia rauw', 'g', 86, 0, 0, 17.9, 1.6, 0, 52, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 18, 0.2, 28, 0.34, 24.3, 0, 0.01, 0.05),
	('43d8875b-fd3e-4308-abad-01858ea5230c', 2300, 'Worst rook- magere gekookt', 'g', 254, 3.3, 0.2, 14, 20.5, 0, 915, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 24, 1.1, 14, 1.9, 0.3, 30, 0, 0),
	('3e7c1465-43a7-4d46-81ac-917e65ca4f01', 2301, 'Worst rook- runder gekookt', 'g', 240, 2, 0.2, 13, 20, 0, 933, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 19, 2.8, 27, 5.81, 0.3, 7, 0.02, 0),
	('217fab1a-3933-447f-832c-aabad92e43ec', 2302, 'Worst knak- magere blik/glas', 'g', 136, 6, 0.2, 12, 7, 0.3, 800, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 22, 1.1, 10, 1.4, 0.6, 0, 0, 0),
	('ec6e2a8f-e2cd-4f68-b9c0-220eb9f45b7d', 2303, 'Worst gekookte magere', 'g', 221, 3, 1, 14, 17, 0.1, 800, 'NEVO-online 2025/9.0', 'Vleeswaren', 18, 1.3, 11, 1.34, 0.7, 0, 0.02, 0),
	('5ce37a0b-4b6f-4b56-a27a-7753db21d7ca', 2304, 'Worst cervelaat- magere', 'g', 241, 0.1, 0.1, 23, 16.5, 0, 1102, 'NEVO-online 2025/9.0', 'Vleeswaren', 29, 1.5, 16, 2.34, 0.7, 9, 0, 0),
	('e20afa94-6188-4b29-888e-7820d7e1b941', 2306, 'Worst boterham- magere', 'g', 163, 6.4, 5.1, 11.6, 10.1, 0, 833, 'NEVO-online 2025/9.0', 'Vleeswaren', 18, 1.3, 13, 1.7, 0.2, 38, 0.01, 0),
	('d08c0c39-af9c-437a-89eb-2c656559cfc0', 2308, 'Yoghurtdrank Becel pro-activ', 'g', 45, 4.5, 4.4, 3, 1.5, 1, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 113, 0, 12, 0.36, 0, 1, NULL, NULL),
	('35af11da-8b4a-409e-9525-416915a2c737', 2311, 'Breezer', 'g', 74, 9.9, 9.8, 0, 0, 0, 2, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 4, 0, 1, 0, 0, 0, 0, 0),
	('3b7c3862-41e3-4120-a7ad-c6cbc11e9a0f', 2312, 'Roti v bloem (sada roti)', 'g', 307, 48.8, 0.2, 6.9, 8.6, 2.9, 431, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 14, 0.6, 14, 0.34, 0, 0, 0, 0),
	('6d9a050a-cfbe-4a5e-9cad-f57e4fdb70eb', 2313, 'Rundvlees gezouten gekookt Surinaams', 'g', 271, 0, 0, 27.4, 17.9, 0, 3207, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 15, 1.6, 16, 6.4, 0.6, 0, 0.02, 0),
	('0bb313c3-d813-4f97-b96c-ab4f5a62096b', 2314, 'Erwten split- gele gekookt', 'g', 126, 18.6, 0, 8.4, 0.6, 6.4, 6, 'NEVO-online 2025/9.0', 'Peulvruchten', 20, 1.1, 31, 0.9, 0, 0, 0, 0),
	('a88cb937-f834-4db4-a17a-14c12517a865', 2315, 'Pomtajer bereid z vet', 'g', 99, 17.2, 0, 3.4, 0.3, 7.2, 17, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 51, 1, 49, 0.5, 0, 0, 0, 0),
	('20c7013f-84b3-402c-bdf7-f4f0c61a810d', 2316, 'Tajerblad bereid z vet', 'g', 38, 0.9, 0, 4.6, 1.1, 3.4, 122, 'NEVO-online 2025/9.0', 'Groente', 354, 1, 39, 1.3, 0, 0, 0, 0),
	('c0640bb4-53e8-4d5b-84fe-a8f955b68504', 2317, 'Bruine bonen m rijst Surinaams', 'g', 147, 16.6, 0.9, 7.7, 4.8, 3.3, 178, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 26, 0.9, 21, 0.83, 0.1, 1, 0.01, 0.01),
	('227df0a2-e320-46cb-b879-ef39fdca1964', 2318, 'Roti v bloem en aardappel', 'g', 218, 35.9, 0.3, 4.9, 5.6, 2.4, 259, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 12, 0.6, 16, 0.34, 0, 4, 0, 0),
	('6dff6860-7892-4f37-bb80-66ac124d3c21', 2319, 'Saus m gele spilterwten Dahl Surinaams', 'g', 151, 17.5, 0.2, 7.7, 4.2, 6.2, 75, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 27, 1.4, 28, 0.82, 0, 0, 0, 0),
	('79ab7f02-50b1-4424-b7e4-75aaeaffbda7', 2320, 'Ovenschotel m pomtajer Pom Surinaams', 'g', 119, 6.8, 1.5, 8.4, 5.9, 2.4, 245, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 22, 0.8, 24, 1.1, 0.1, 5, 0.01, 0.02),
	('e29d91a1-ca1f-4b4c-9778-547780b8a13f', 2321, 'Groente-vlees schotel Moksi-alesi Surinaams', 'g', 123, 14.2, 0.9, 7.8, 3.4, 1.9, 526, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 62, 0.8, 19, 1.2, 0.1, 3, 0.04, 0.03),
	('829838a4-8c12-4019-b27d-eb76b2bd55c7', 2322, 'Aardappelpuree instant- bereid m halfvolle melk', 'g', 96, 16.5, 4.2, 4.1, 1.3, 1.1, 109, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 108, 0.2, 21, 0.46, 0, 1, 0, 0),
	('a4827194-93ef-4a95-a7b9-8514d141b955', 2323, 'Aardappelpuree instant- bereid m water', 'g', 71, 11.8, 0.5, 1.7, 1.6, 1, 32, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 19, 0.3, 14, 0.23, 0, 1, 0, 0),
	('40022617-ffa0-4f92-8486-e398998e11c0', 2324, 'Aardappelpuree vers bereid m halfvolle melk z vet', 'g', 74, 14.1, 1.4, 2.3, 0.6, 1.2, 14, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 39, 0.4, 18, 0.35, 0, 7, 0, 0),
	('c1092034-a846-4e5b-8b0e-3a0d85459055', 2325, 'Aardappelen m schil gekookt gem', 'g', 74, 15.4, 1, 1.4, 0.3, 1.8, 10, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 13, 0.6, 18, 0.3, 0, 9, 0, 0),
	('f167f62d-443b-4541-90b6-5b2b778cc5bd', 2326, 'Aardappelkroketten diepvries onbereid', 'g', 169, 24.8, 1.7, 2.7, 6, 2.1, 354, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 35, 0.6, 22, 0.48, 0, 5, 0, 0),
	('e1718f61-9c41-4bf0-a264-b0013c5041fc', 2329, 'Koek ontbijt- minder suiker', 'g', 287, 59.2, 24.2, 3.2, 1.5, 12, 238, 'NEVO-online 2025/9.0', 'Gebak en koek', 17, 0.7, 16, 0.65, 0.1, 0, 0, 0),
	('bca4a1b0-7640-41eb-9ffc-1962e28b9eb1', 2331, 'Bamigroenten gekookt', 'g', 19, 2, 1.6, 1.2, 0.2, 2.1, 8, 'NEVO-online 2025/9.0', 'Groente', 36, 0.3, 10, 0.17, 0, 9, 0, 0),
	('d594ebec-d529-4491-a56b-d93710f807a9', 2333, 'Gehakt rauw gem', 'g', 222, 0.2, 0.2, 19.3, 15.9, 0.2, 148, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 1.4, 20, 3.3, 0.6, 7, 0, 0.01),
	('47b2ddf8-c1cc-4e9a-aa0a-c0dd9144b63f', 2334, 'Gehaktbal half-om-half m ei en paneermeel rauw', 'g', 237, 5.2, 0.6, 18.3, 15.7, 0.8, 187, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 1.4, 22, 3, 0.6, 7, NULL, NULL),
	('e320995e-ca4e-4b96-8958-fe5edcaf98f6', 2335, 'Vlees gem excl lever rauw', 'g', 181, 0.9, 0.3, 19.9, 10.8, 0.2, 218, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 1.2, 24, 2.47, 0.5, 5, NULL, NULL),
	('e94964ff-0034-4c69-b216-260f0333debe', 2336, 'Rundvlees gem rauw', 'g', 201, 1.3, 0.4, 19.1, 13.2, 0.3, 273, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 2, 22, 4.17, 0.6, 9, 0, NULL),
	('83f00cf0-d6e1-4988-a817-5c29bdcc658b', 2337, 'Gehaktbal runder- m ei en paneermeel rauw', 'g', 230, 5.1, 0.5, 18, 15, 0.8, 128, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 12, 2, 22, 3.98, 0.7, 7, NULL, 0),
	('c648daaa-a7a9-48bc-bf05-8b175638c298', 2339, 'Vink runder- rauw', 'g', 209, 3.2, 0.9, 16.6, 14.2, 0.8, 599, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 1.9, 20, 3.85, 0.6, 6, 0.01, 0),
	('d3db37ac-0a7f-43e6-8323-f865d8a5a7e4', 2340, 'Varkensschnitzel gepaneerd rauw', 'g', 142, 8.1, 2, 20.6, 2.8, 1, 417, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 11, 0.7, 30, 1.67, 0.3, 0, 0, 0),
	('6d4c64a8-03f2-4d32-83d5-ae1c6395c9f5', 2341, 'Kipfilet gepaneerd rauw', 'g', 131, 5.6, 0.3, 21.5, 2.3, 0.6, 84, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 0.9, 31, 0.78, 0.4, 0, NULL, NULL),
	('ec98b907-3135-410c-a7dd-8d13bc1705b3', 2342, 'Kipfilet omhuld m beslag rauw', 'g', 115, 3.2, 0.4, 21, 2, 0.2, 54, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 17, 0.7, 28, 0.67, 0.3, 0, 0, 0),
	('97fcf7c4-93f3-46c3-8ccf-cabd727305a0', 2343, 'Pudding gelatine-', 'g', 59, 13, 13, 1.8, 0, 0, 2, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 4, 0, 1, 0, 0, 0, 0, 0),
	('c2487b45-33c3-44e4-a4ab-88b407b994f4', 2344, 'Varkens cordon bleu rauw', 'g', 153, 5.8, 0.4, 20.4, 5.2, 0.7, 194, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 77, 0.8, 30, 1.81, 0.4, 2, 0, 0),
	('2ab36408-f05c-4e12-81f9-1f9b989c8be2', 2345, 'Pinda''s suiker-', 'g', 536, 47.1, 42.9, 15.1, 31, 4.1, 0, 'NEVO-online 2025/9.0', 'Noten en zaden', 33, 1.2, 130, 1.98, 0, 0, 0, 0),
	('3d935147-765f-4506-b74f-99e4653e4724', 2346, 'Sla gem rauw', 'g', 16, 1, 0.9, 1.6, 0.3, 1.4, 17, 'NEVO-online 2025/9.0', 'Groente', 67, 0.8, 17, 0.33, 0, 1, 0, 0),
	('a202388b-4f78-4780-9aa2-fc81332e3377', 2347, 'Tortellini gekookt', 'g', 155, 23.3, 0.6, 7.7, 3.1, 1.3, 204, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 65, 0.8, 20, 0.91, 0.1, 1, 0, 0),
	('a6bde929-19e1-4f79-831b-4f9261cb4d7b', 2348, 'Tarwebrood volkoren gem v fijn en grof m pompoenpitten', 'g', 275, 34.7, 1.8, 13.4, 7.6, 6.9, 339, 'NEVO-online 2025/9.0', 'Brood', 36, 2.7, 122, 2.18, 0, 0, 0, 0),
	('67947e89-6da8-42e8-b4f3-8c22b707a69c', 2349, 'Meergranenbrood gem v wit en bruin m zaden m extra lijnzaad', 'g', 287, 36, 1.8, 13.1, 7.9, 9.6, 359, 'NEVO-online 2025/9.0', 'Brood', 70, 2.2, 71, 2.02, 0, 0, 0, 0),
	('72c32450-5970-44a5-9544-aa02db69a296', 2350, 'Meergranenbrood gem v wit en bruin m zaden', 'g', 261, 39.1, 2.1, 12.3, 4.8, 6.2, 403, 'NEVO-online 2025/9.0', 'Brood', 46, 1.8, 56, 1.24, 0, 0, 0, 0),
	('8bfe1e41-d04b-46b0-a378-6ff39a027356', 2351, 'Tarwebrood wit gem v melk- en waterwit', 'g', 250, 48.1, 2.3, 9.1, 1.7, 2.6, 408, 'NEVO-online 2025/9.0', 'Brood', 44, 0.8, 20, 0.6, 0, 0, 0, 0),
	('3aa96d55-6020-4329-a0d4-b83ac30b4f6b', 2352, 'Tarwekrentenbrood wit m spijs', 'g', 303, 51.7, 27.7, 8.2, 6.1, 4.3, 293, 'NEVO-online 2025/9.0', 'Brood', 62, 1.5, 43, 0.71, 0, 0, 0, 0),
	('a2571ca0-1e64-4dbd-8c68-67a174cfcd72', 2353, 'Tarwemueslibrood bruin/volkoren', 'g', 295, 42.5, 16.7, 10.6, 7.6, 6.9, 325, 'NEVO-online 2025/9.0', 'Brood', 53, 2.9, 60, 1.2, 0, 0, 0, 0),
	('3b066cb4-2723-4f58-8adc-4406698c74c6', 2354, 'Tarwenotenbrood volkoren', 'g', 298, 34.5, 2.2, 12.2, 10.9, 6.7, 326, 'NEVO-online 2025/9.0', 'Brood', 52, 2.3, 91, 1.75, 0, 0, 0, 0),
	('7641ad6b-16d7-4bc1-9b22-b2053da2e6a6', 2355, 'Tarwesuikerbrood wit', 'g', 306, 60.5, 28.5, 7.9, 3, 2.5, 341, 'NEVO-online 2025/9.0', 'Brood', 33, 0.9, 17, 0.6, 0, 0, 0, 0),
	('d1530b38-fb75-451f-884d-e80e30f377cc', 2356, 'Tarwestokbrood wit m kaas en uien', 'g', 243, 35.9, 3, 10, 6, 2.3, 390, 'NEVO-online 2025/9.0', 'Brood', 145, 0.6, 20, 0.95, 0.1, 1, 0, 0),
	('cd650200-24ba-47b8-b183-d4d998ff1108', 2357, 'Tarwebrood volkoren gem v fijn en grof m zonnebloempitten', 'g', 284, 35.9, 1.6, 11.9, 8.7, 6.8, 345, 'NEVO-online 2025/9.0', 'Brood', 40, 2.3, 101, 1.88, 0, 0, 0, 0),
	('a31c176c-ce4d-4bc2-8169-bd58cb70cdfd', 2358, 'Tarwebrood wit gem v melk- en waterwit m zonnebloempitten', 'g', 297, 43.9, 2, 10.2, 8.3, 3.2, 367, 'NEVO-online 2025/9.0', 'Brood', 48, 1.3, 60, 1.17, 0, 0, 0, 0),
	('2bff17d7-b135-4009-9054-06ec56b62633', 2359, 'Wrap/tortilla obv tarwe naturel', 'g', 298, 50.8, 3.2, 8.5, 5.5, 4.1, 460, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 52, 0.7, 18, 0.45, 0, 0, 0, 0),
	('1e4e2d72-f4fa-4053-a140-de45a66415aa', 2360, 'Wafel rijst- m karamel', 'g', 394, 87, 28, 5.5, 2.4, 1.4, 200, 'NEVO-online 2025/9.0', 'Brood', 14, 0.7, 100, 1.5, 0, 0, 0, 0),
	('439d2174-baac-46b5-b558-e1e2d19f0cc8', 2362, 'Frikandel diepvries onbereid', 'g', 235, 6.1, 1, 13.1, 17.2, 1.7, 852, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 102, 2, 27, 1.4, 0.3, 2, 0.01, 0.01),
	('9318af04-d8c2-4e7b-a400-81405f81a170', 2363, 'Gehakt cordon bleu rauw', 'g', 270, 10.8, 0.6, 14.8, 18.4, 1.1, 526, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 64, 0.8, 21, 1.73, 0.5, 10, 0, 0),
	('89d8030d-a5c4-4d96-9132-0ed629d86faf', 2364, 'Kipschnitzel gepaneerd rauw', 'g', 156, 5.6, 0.3, 19.1, 6.1, 0.6, 116, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 16, 1.1, 26, 1.38, 0.4, 0, 0.02, 0.05),
	('3c48bc70-7b38-4c75-9eaf-e2bb809ba898', 2365, 'Kip cordon bleu rauw', 'g', 150, 4.4, 0.3, 22, 4.8, 0.5, 195, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 81, 0.7, 31, 1.08, 0.2, 2, 0, 0),
	('1d0ea823-2296-4e38-ae44-757c64402d42', 2367, 'Pindakaas light', 'g', 535, 13.7, 5.2, 18, 39.6, 25.8, 230, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 45, 1.8, 111, 2.15, 0, 0, 0, 0.07),
	('a7e71606-a613-433b-841f-22912957701b', 2369, 'Soepstengel', 'g', 401, 71.3, 1.9, 12.5, 6.6, 3.3, 850, 'NEVO-online 2025/9.0', 'Brood', 26, 1.8, 25, 0.9, 0, 0, 0, 0),
	('3d0e593c-34c6-42ed-bb67-2e7e34e11c6f', 2370, 'Zoutje luchtig maisbasis', 'g', 518, 60.7, 4.5, 7.5, 27, 1.1, 737, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 30, 1.3, 18, 0.4, 0, 0, 0, 0),
	('56923761-5f13-4271-be51-a3958dc44f42', 2371, 'Tiramisu', 'g', 248, 30.7, 21.7, 4.5, 10.6, 0.7, 75, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 58, 0.6, 19, 0.51, 0.3, 0, 0.01, 0),
	('ba63af13-ec42-4c78-9f32-05761f2ed447', 2372, 'Rozijnen omhuld m chocolade melk-', 'g', 429, 61.8, 59, 5, 17.3, 3.2, 48, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 106, 2.6, 46, 0.64, 0, 1, 0, 0),
	('7813ea74-940c-4f30-91db-9310b554f075', 2373, 'After eight', 'g', 419, 74.6, 72.1, 2.1, 12.2, 1, 31, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 64, 1.3, 20, 0.43, 0, 0, 0, 0),
	('f90dd00a-bdbd-4cb6-ae47-ea2a58fa6bd8', 2374, 'Chocolade melk- m rozijnen', 'g', 501, 55.9, 53, 6.2, 27.4, 3, 61, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 139, 3, 48, 0.92, 0, 1, 0, 0),
	('b19cce5b-f04d-4d98-8076-7a9ac47ac525', 2375, 'Chocolade puur m hazelnoten', 'g', 565, 36.2, 32.4, 9, 41, 7.6, 8, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 78, 3.3, 107, 1.54, 0, 1, 0, 0),
	('9f924be4-a3fb-4d4b-960a-7ef0eb3f137c', 2376, 'Chocolade melk- m gepofte rijst', 'g', 531, 55.2, 43.8, 7.1, 30.7, 2.9, 80, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 146, 2.9, 59, 1.2, 0, 1, 0, 0),
	('3f05dfc2-60ad-46f6-92ca-9716bf1bde9a', 2377, 'Tomaat gedroogd in olie blik/glas, uitgelekt', 'g', 197, 9.4, 6.3, 4.4, 14, 8, 540, 'NEVO-online 2025/9.0', 'Groente', 47, 2.7, 81, 0.78, 0, 39, 0, 0),
	('52929e1e-647a-4dae-a1ab-3706f1aee018', 2378, 'Tomaat zongedroogd', 'g', 331, 55.8, 37.6, 14.1, 3, 12.3, 2059, 'NEVO-online 2025/9.0', 'Groente', 110, 9.1, 194, 1.99, 0, 39, 0, 0),
	('ad4d1254-4052-4ac4-8420-9e926110f577', 2379, 'Rozijnen gedroogd geweekt', 'g', 258, 59.5, 57.2, 2.5, 0.4, 3.1, 21, 'NEVO-online 2025/9.0', 'Fruit', 42, 1.7, 35, 0.15, 0, 0, 0, 0),
	('c57254cf-0897-471c-8717-0c850ee5b05b', 2380, 'Toffee m chocolade', 'g', 427, 77.8, 60.5, 1.8, 11.7, 1.5, 13, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 13, 0.8, 20, 0.29, 0, 0, 0, 0),
	('370a0f07-83e0-472e-bce1-f8078366fff7', 2381, 'Pate smeer- magere', 'g', 187, 10, 1.3, 9.7, 12, 0.3, 853, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 7.5, 15, 0.77, 0.5, 5, 0, 0),
	('b4d081e9-2202-4f24-9c14-b5503cc7a63c', 2382, 'Tarwebrood bruin m zonnebloempitten', 'g', 287, 39.7, 1.7, 10.9, 8.3, 5.2, 365, 'NEVO-online 2025/9.0', 'Brood', 35, 1.9, 82, 1.52, 0, 0, 0, 0),
	('e62abb06-02b1-4249-b3e3-d75dc1b5cce6', 2383, 'Noga m chocolade', 'g', 489, 64.2, 62.4, 7.2, 21.8, 3.3, 3, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 86, 1.6, 101, 1.1, 0, 0, 0, 0),
	('a9ca9e18-58b0-436a-afae-b08908700c96', 2384, 'Drop m pepermunt', 'g', 375, 90.4, 82.8, 2.8, 0.1, 0.3, 48, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 48, 1.3, 13, 0.12, 0, 0, 0, 0),
	('5d5ef421-9509-43a2-a050-e9376870db7f', 2385, 'Salmiakkogel/-lolly', 'g', 375, 92.3, 68.3, 1.2, 0, 0.3, 35, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 15, 0.5, 6, 0.06, 0, 0, 0, 0),
	('0a14b546-f975-4b1a-9905-729f0f25a340', 2386, 'Noga', 'g', 469, 72.1, 71.1, 6.5, 16.7, 2.1, 2, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 85, 1, 93, 0.94, 0, 0, 0, 0),
	('d6ce3bc7-ee76-421d-9f3b-b19a8ad30877', 2387, 'Popcorn zoete gepoft z olie', 'g', 389, 78.7, 24.8, 9.9, 3, 3.8, 2, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 8, 0.9, 66, 0.08, 0, 0, 0, 0),
	('573d85d1-28db-4508-a3af-e46a033abe7d', 2389, 'Siroop vruchtenlimonade- Albert Heijn', 'g', 164, 41, 40.3, 0.1, 0, 0.1, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0, 4, 0.05, 0, 38, 0, 0),
	('957df832-986e-4f9d-9d0c-b8d979545f20', 2391, 'Cake marmer-', 'g', 396, 44.9, 28.3, 5.6, 21.2, 1.7, 386, 'NEVO-online 2025/9.0', 'Gebak en koek', 22, 1.1, 19, 0.65, 2.1, 0, 0.01, 0),
	('827fe605-86f2-4f7b-960b-56f554082d9f', 2392, 'Cake appel- z roomboter', 'g', 260, 30.5, 19.5, 3.5, 13.5, 1.3, 248, 'NEVO-online 2025/9.0', 'Gebak en koek', 14, 0.6, 7, 0.36, 1.4, 1, 0.01, 0),
	('a9ee0bed-a563-4958-b2a2-43e281cfade3', 2393, 'Cake rozijnen-', 'g', 384, 47.1, 31.7, 5.3, 19.1, 1.4, 355, 'NEVO-online 2025/9.0', 'Gebak en koek', 25, 1.1, 14, 0.49, 2, 0, 0.01, 0),
	('93414eb9-d609-4efa-b56a-7d3d391586e4', 2394, 'Soes bananen-', 'g', 245, 16.1, 9.5, 3.5, 18.4, 0.7, 116, 'NEVO-online 2025/9.0', 'Gebak en koek', 38, 0.5, 12, 0.37, 0.8, 2, 0.01, 0),
	('fb2fd647-6ab5-44c6-af64-9a2bfba933d4', 2395, 'Soes slagroom- m chocolade', 'g', 303, 17.6, 10.7, 4.2, 23.8, 1, 135, 'NEVO-online 2025/9.0', 'Gebak en koek', 46, 0.8, 15, 0.47, 0.9, 0, 0.01, 0),
	('72d91782-90a3-4758-b106-abb8d32822eb', 2396, 'Taart chocolade- m slagroom', 'g', 337, 32.9, 25, 4.8, 20.4, 1.5, 55, 'NEVO-online 2025/9.0', 'Gebak en koek', 55, 0.9, 20, 0.53, 0.4, 0, 0, 0),
	('01d9901b-e747-4e39-84b6-26784e8ea8ab', 2397, 'Koek ontbijt- m noten', 'g', 337, 66.2, 37.6, 4, 5.4, 3.9, 192, 'NEVO-online 2025/9.0', 'Gebak en koek', 29, 1, 34, 0.87, 0.1, 0, 0, 0),
	('6323cc50-4a6c-41fd-a1d1-1a823914a2ff', 2398, 'Koek ontbijt- m kandij', 'g', 312, 71.5, 39.3, 2.8, 1, 2.6, 170, 'NEVO-online 2025/9.0', 'Gebak en koek', 14, 0.6, 14, 0.56, 0.1, 0, 0, 0),
	('b835731e-0e66-479a-9646-0e00bfa4773d', 2399, 'Spekkoek m roomboter', 'g', 422, 25.1, 20.2, 5.3, 33.3, 0.3, 171, 'NEVO-online 2025/9.0', 'Gebak en koek', 31, 0.9, 8, 0.64, 0.7, 0, 0.04, 0),
	('03631ef8-3e5a-441b-b1cc-31f7d03f481e', 2400, 'Croissant chocolade-', 'g', 434, 44.3, 13.4, 8.9, 24, 2.7, 383, 'NEVO-online 2025/9.0', 'Brood', 41, 1.4, 29, 0.81, 0, 0, 0, 0),
	('6fb35391-6d52-44ba-be40-d4e3877a8ba1', 2401, 'Koek m gelei/appelvulling', 'g', 398, 65.5, 40.3, 3.3, 13.3, 1.5, 223, 'NEVO-online 2025/9.0', 'Gebak en koek', 31, 1.1, 19, 0.45, 0.1, 1, 0.01, 0),
	('e3c36aaf-28a7-4b8a-bfc1-bad2da0ffa88', 2402, 'Kappertjes', 'g', 43, 4.9, 0.4, 2.4, 0.9, 3.2, 2964, 'NEVO-online 2025/9.0', 'Groente', 40, 1.7, 33, 0.32, 0, 4, 0, 0),
	('feba194d-efd8-4a28-9ad2-a68f76d484f5', 2403, 'Koek Glace-', 'g', 427, 59.5, 38.4, 3.6, 19.2, 0.8, 210, 'NEVO-online 2025/9.0', 'Gebak en koek', 16, 0.7, 8, 0.41, 1.7, 0, 0.01, 0),
	('6118c766-661c-404e-b743-2bd289dbb0d6', 2405, 'Koekje chocolate chip cookie', 'g', 501, 60.6, 31.2, 6.3, 25.3, 2.9, 314, 'NEVO-online 2025/9.0', 'Gebak en koek', 89, 2.9, 48, 1, 0.1, 0, 0, 0),
	('15b1f7a2-b62d-4b75-865f-07c63071f5ad', 2406, 'Koekje kinder- gem', 'g', 450, 70.6, 22.4, 7.6, 14.8, 2.2, 244, 'NEVO-online 2025/9.0', 'Gebak en koek', 48, 1, 23, 0.67, 0, 0, 0, 0),
	('40fd3959-5178-492e-81e8-2932eed35aae', 2409, 'Sprits m chocolade', 'g', 541, 61.5, 28.8, 4.7, 30.3, 1.7, 204, 'NEVO-online 2025/9.0', 'Gebak en koek', 34, 0.9, 15, 0.44, 0.2, 0, 0.03, 0),
	('fcdccdae-46c1-4174-8d87-302f7c9c96c5', 2410, 'Schuimzoenen', 'g', 439, 71.4, 51.5, 2.2, 15.3, 3.4, 17, 'NEVO-online 2025/9.0', 'Gebak en koek', 16, 1.1, 51, 0.69, 0, 0, NULL, NULL),
	('7c654d6e-1ceb-4903-a847-a739fec863fd', 2412, 'Kletskop', 'g', 492, 59.2, 44.5, 5.7, 25.4, 2, 13, 'NEVO-online 2025/9.0', 'Gebak en koek', 52, 1.6, 53, 0.67, 0.1, 0, 0.02, 0),
	('8f87eeae-fa4b-42f2-8c2b-a714506978ed', 2413, 'Mergpijpje gevuld m cake en creme', 'g', 457, 62.7, 55.3, 2.7, 21.6, 0.6, 84, 'NEVO-online 2025/9.0', 'Gebak en koek', 14, 0.7, 15, 0.36, 0.2, 0, 0, 0),
	('acdc0f44-26db-4a69-b32e-cbd40b264989', 2416, 'IJs room- stracciatella', 'g', 248, 26.8, 21.9, 3.3, 13.9, 1.2, 43, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 93, 0.4, 18, 0.39, 0, 0, 0.01, 0),
	('3b76be9c-27b8-4c0d-8457-e1de2b56f40f', 2417, 'Koek oranje-', 'g', 375, 66.3, 44, 4.7, 9.7, 1.8, 170, 'NEVO-online 2025/9.0', 'Gebak en koek', 38, 0.8, 38, 0.51, 0.9, 1, NULL, NULL),
	('1e1ea219-b167-454d-b183-9b3ac9bc8ffd', 2418, 'Saus warm vloeibaar kant-en-klaar <12% vet', 'g', 91, 6.4, 1.4, 1.3, 6.6, 0.1, 460, 'NEVO-online 2025/9.0', 'Hartige sauzen', 9, 0.3, 5, 0.11, 0, 1, 0, 0),
	('789061b8-27e2-45aa-9b7d-345f3e58aa8d', 2419, 'Saus kaas- op basis roux bereid', 'g', 127, 5.6, 2.2, 5.5, 9.1, 0.2, 217, 'NEVO-online 2025/9.0', 'Hartige sauzen', 183, 0.1, 12, 0.74, 0.2, 0, 0, 0),
	('0e12011a-2c52-4caa-a278-b222b9944575', 2420, 'Saus warm vloeibaar kant-en-klaar >12% vet', 'g', 195, 5.2, 1.5, 1.2, 18.8, 0.2, 611, 'NEVO-online 2025/9.0', 'Hartige sauzen', 6, 0.2, 4, 0.09, NULL, 0, 0, 0),
	('6b2a63a2-866b-410a-bcde-affc2a647e30', 2422, 'Halvarineproduct Becel Omega-3 Plus', 'g', 353, 2.6, 0.3, 0.3, 38, 0, 16, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0.38, 0.38),
	('3aad8134-a957-4608-8a96-c1371aeb2315', 2424, 'Hagelslag chocolade- wit', 'g', 455, 78.4, 78.4, 5.5, 13.2, 0, 100, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 116, 4.5, 66, 1.1, 0, 0, 0, 0),
	('542ce8c9-15d4-4e0f-9908-79b67465cfb4', 2425, 'Wafel galette-', 'g', 480, 65.2, 29.1, 6.9, 20.9, 2, 330, 'NEVO-online 2025/9.0', 'Gebak en koek', 12, 0.6, 10, 0.34, 1.9, 0, 0, 0),
	('d501e336-366a-479a-b95c-f5c8f5e27e8a', 2427, 'Schuddebuikjes Bolletje', 'g', 486, 70, 30.1, 5, 20, 3, 351, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 35, 1.2, 13, 0.44, 0.2, 0, 0, 0),
	('ee2fca92-edd7-4dad-bf45-39f365bbcd36', 2428, 'Wafel melk-hazelnootchocolade Knoppers', 'g', 548, 52, 34.4, 8.8, 33.3, 2.5, 180, 'NEVO-online 2025/9.0', 'Gebak en koek', 98, 1.5, 40, 0.88, 0, 1, 0, 0),
	('d9bb321e-5033-44b2-b80a-a6a601cfd0e9', 2429, 'Cake m noten', 'g', 449, 36, 20.9, 8.1, 29.8, 2.2, 331, 'NEVO-online 2025/9.0', 'Gebak en koek', 47, 1.5, 54, 1.17, 1.8, 0, 0.01, 0),
	('2b6843ff-ffc9-4b9b-a5aa-d9f5897732a3', 2430, 'Beignet banaan-', 'g', 282, 20.6, 9.3, 2.9, 20.5, 1.4, 12, 'NEVO-online 2025/9.0', 'Gebak en koek', 29, 0.4, 18, 0.32, 0, 3, 0, 0),
	('82f7e40d-14ec-4065-8297-02a464d6a62c', 2431, 'Taart slagroom- omhuld m marsepein', 'g', 342, 39.6, 32.5, 4.8, 18, 1.2, 48, 'NEVO-online 2025/9.0', 'Gebak en koek', 64, 0.7, 33, 0.57, 0.3, 0, 0, 0),
	('ba6c5320-e07b-4eda-ac42-7cfc517a9c0b', 2432, 'Taart noten-', 'g', 467, 46.7, 24.9, 7.6, 27.2, 2.5, 124, 'NEVO-online 2025/9.0', 'Gebak en koek', 42, 1.3, 51, 1.01, 0.2, 0, 0.02, 0),
	('775e2cac-2d39-43e1-8793-331ed163aade', 2433, 'Drink rijst- z suiker verrijkt m calcium en vitamines', 'g', 53, 11.3, 4, 0.3, 0.7, 0.2, 37, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 89, 0, 2, 0.07, 0.7, 0, 0, 0),
	('db22b637-7450-4cdc-b56a-0310d739969d', 2435, 'Frisdrank m suiker en zoetstof 2-<5 g KH z cafeine', 'g', 12, 2.9, 2.7, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 2, 0, 0, 0, 0, 0, 0, 0),
	('7678ef12-8f11-436c-b876-51138e1650ca', 2436, 'Limonade vruchten- m suiker en zoetstof 4-6 g KH', 'g', 18, 4.6, 4.6, 0, 0, 0, 3, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0, 0, 5, 0, 0),
	('3369703e-fde1-4d60-8624-7d1e7f38b18b', 2437, 'Limonade vruchten- Capri-Sun Multivitamin', 'g', 20, 4.9, 4.9, 0, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0, 0, 5, 0, 0),
	('4756d9ef-cb50-49ef-8768-0ea00c2e2244', 2441, 'Siroop vruchtenlimonade- bereid 1 op 7', 'g', 28, 7, 6.9, 0, 0, 0, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 4, 0, 1, 0.01, 0, 0, 0, NULL),
	('7c54bb3a-89bd-4da4-8741-b308b8a28f2e', 2444, 'Thee kruiden- oplos gezoet bereid', 'g', 19, 4.7, 4.6, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0, 0, 0, 0, 0),
	('80548eef-ef33-4a25-8e40-2f74d672a638', 2445, 'Saus boter-', 'g', 180, 3.1, 0.3, 0.6, 18.3, 0.2, 295, 'NEVO-online 2025/9.0', 'Hartige sauzen', 5, 0.1, 1, 0.05, 0.1, 0, 0.02, 0),
	('fcbce5d3-f844-49e4-9964-a67ddfe7403a', 2447, 'Saus v halfvolle melk en maizena', 'g', 57, 7.8, 4.5, 3.3, 1.4, 0, 41, 'NEVO-online 2025/9.0', 'Hartige sauzen', 119, 0, 12, 0.4, 0, 1, 0, 0),
	('98c0274b-bfcf-44e2-8220-52055ab9b17f', 2449, 'Jus 25% vet ongebonden bereid m juspoeder', 'g', 230, 4.8, 0.6, 1, 22.9, 0.2, 699, 'NEVO-online 2025/9.0', 'Hartige sauzen', 6, 0, 1, 0, 1.7, 0, NULL, NULL),
	('2b1dbab2-2e74-482e-a0e9-3677ab5e30e4', 2450, 'Jus 50% vet ongebonden bereid m juspoeder', 'g', 431, 4.9, 0.7, 1.1, 45.1, 0.2, 788, 'NEVO-online 2025/9.0', 'Hartige sauzen', 7, 0, 1, 0, 3.4, 0, NULL, NULL),
	('9afc2925-6139-4861-9b27-f5d9b88aa40f', 2451, 'Jus 25% vet gebonden bereid m juspoeder', 'g', 233, 7, 0.6, 1, 22.3, 0.2, 680, 'NEVO-online 2025/9.0', 'Hartige sauzen', 6, 0, 1, 0, 1.7, 0, NULL, NULL),
	('8c2553b7-52f8-4b56-bc36-826413a7a2ae', 2452, 'Jus 25% vet gebonden bereid z juspoeder', 'g', 223, 2.7, 0.2, 0.1, 23.5, 0, 97, 'NEVO-online 2025/9.0', 'Hartige sauzen', 6, 0, 1, 0, 1.8, 0, NULL, NULL),
	('5704dad5-da31-47bb-b1d4-976613c610b2', 2453, 'Jus 50% vet gebonden bereid z juspoeder', 'g', 436, 2.9, 0.3, 0.3, 47.1, 0, 192, 'NEVO-online 2025/9.0', 'Hartige sauzen', 7, 0, 1, 0, 3.6, 0, NULL, NULL),
	('891711dd-31c4-420e-b4f6-2d87ec8a5eb0', 2454, 'Jus 75% vet gebonden bereid z juspoeder', 'g', 650, 3.2, 0.5, 0.4, 70.6, 0, 287, 'NEVO-online 2025/9.0', 'Hartige sauzen', 9, 0.1, 2, 0, 5.4, 0, NULL, NULL),
	('104c9e30-5ed3-47b1-a8bb-68eb412f55b1', 2455, 'Saus Aardappel Anders gem', 'g', 171, 3.9, 1.1, 1.5, 16.6, 0.2, 453, 'NEVO-online 2025/9.0', 'Hartige sauzen', 27, 0.1, 4, 0.24, 0, 2, 0, 0),
	('0e4cc548-49a5-4f06-9041-e6112b8fdf52', 2456, 'Jus 5% vet gebonden bereid z juspoeder', 'g', 53, 2.6, 0, 0, 4.7, 0, 21, 'NEVO-online 2025/9.0', 'Hartige sauzen', 5, 0, 1, 0, 0.4, 0, NULL, NULL),
	('876ce0bb-6d64-4517-b480-4e4fc1a0cce0', 2457, 'Saus sate huishoudelijk bereid m hv melk z vet', 'g', 297, 12.8, 10.5, 10.2, 22, 3.3, 510, 'NEVO-online 2025/9.0', 'Hartige sauzen', 70, 1.2, 64, 1.2, 0, 1, 0, 0.04),
	('df4b3d9e-2b50-47cf-b6c2-312340944147', 2458, 'Saus sate huishoudelijk bereid m water z vet', 'g', 280, 11.1, 8.7, 8.9, 21.4, 3.3, 494, 'NEVO-online 2025/9.0', 'Hartige sauzen', 26, 1.1, 59, 1.04, 0, 1, NULL, NULL),
	('e8e718cf-114b-4736-bba1-c4bee7395e91', 2459, 'Jus 50% vet ongebonden bereid z juspoeder', 'g', 439, 0.4, 0.4, 0.3, 48.5, 0, 197, 'NEVO-online 2025/9.0', 'Hartige sauzen', 7, 0, 1, 0, 3.7, 0, NULL, NULL),
	('016e2c4d-b01b-4c96-8d12-3aef9a046d32', 2460, 'Jus 75% vet ongebonden bereid z juspoeder', 'g', 658, 0.6, 0.5, 0.4, 72.7, 0, 295, 'NEVO-online 2025/9.0', 'Hartige sauzen', 9, 0.1, 2, 0, 5.6, 0, NULL, NULL),
	('ff656000-fdc6-4e59-a661-3ef64528056f', 2461, 'Jus 50% vet gebonden bereid m juspoeder', 'g', 429, 7.1, 0.7, 1.1, 43.9, 0.2, 768, 'NEVO-online 2025/9.0', 'Hartige sauzen', 7, 0, 1, 0, 3.3, 0, NULL, NULL),
	('3ff762ad-b8c5-4ace-a611-db5296a394ba', 2462, 'Jus 5% vet ongebonden bereid z juspoeder', 'g', 44, 0, 0, 0, 4.8, 0, 21, 'NEVO-online 2025/9.0', 'Hartige sauzen', 5, 0, 1, 0, 0.4, 0, NULL, NULL),
	('15860452-3712-4a91-8f62-4421d09bf939', 2466, 'Dressing vinaigrette-', 'g', 596, 0.4, 0.3, 0.5, 65.1, 0.1, 693, 'NEVO-online 2025/9.0', 'Hartige sauzen', 4, 0.2, 5, 0.08, 0, 0, 0, 0),
	('f0559893-78ee-487c-a9fc-38376f682608', 2467, 'Saus frites- ca 13% olie', 'g', 158, 9.4, 3.1, 0.3, 13.1, 0.8, 510, 'NEVO-online 2025/9.0', 'Hartige sauzen', 10, 0.2, 2, 0.21, 0, 0, 0.03, 0),
	('279c26d1-0e59-4d2c-b2b2-6d377cbd8c3d', 2468, 'Dressing honing/mosterd-', 'g', 299, 15, 14, 1.2, 26, 0, 640, 'NEVO-online 2025/9.0', 'Hartige sauzen', 17, 0.4, 14, 0.23, 0.1, 0, 0, 0),
	('ec57c576-9088-4021-902b-a4c3f310b7aa', 2470, 'Saus frites- 5% olie', 'g', 100, 9.8, 2.9, 0.8, 5.3, 5, 760, 'NEVO-online 2025/9.0', 'Hartige sauzen', 8, 0.2, 2, 0.11, 0, 0, 0.01, 0),
	('c253be58-d95d-47ae-81b1-55ac7392b25b', 2471, 'Mayonaiseproduct ca 35% olie', 'g', 338, 10.5, 5.6, 0.5, 32.7, 0, 480, 'NEVO-online 2025/9.0', 'Hartige sauzen', 10, 0.2, 2, 0.21, 0, 0, 0, 0),
	('68fb4719-7b55-458f-a200-403f57b1810f', 2472, 'Olie wok-', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, 0, 0.02);
INSERT INTO public.nutrition_foods VALUES
	('e0876446-13f9-46f1-99c1-6470f6064ec6', 2473, 'Pasta kruiden-/boemboe', 'g', 306, 25.6, 17, 4, 20.4, 1.7, 1721, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 9, 0.2, 3, 0.09, 0, 6, 0, 0),
	('c99c1727-a992-4907-aeae-c50f9760b9f3', 2476, 'Koffie cappuccino vers bereid', 'g', 31, 2.3, 2.3, 1.8, 1.7, 0, 22, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 64, 0.1, 9, 0.23, 0, 0, 0, 0),
	('72a5220e-a52d-4d51-ac78-6cf7db4a8eea', 2477, 'Koffie cappuccino oplos- bereid', 'g', 37, 4.7, 3.5, 1.2, 1.3, 0.3, 30, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 63, 0.1, 10, 0.2, 0, 0, 0, 0),
	('3e628c15-312c-42bb-8c03-a1b3fc9c8b9d', 2478, 'Koffie cappuccino oplos- poeder', 'g', 407, 52.4, 38.5, 13.9, 14.9, 3.8, 313, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 648, 0.6, 106, 2.16, 0, 4, 0, 0),
	('040835aa-de36-4151-9835-9fde4480d916', 2480, 'Energydrink Golden Power/Bullit/Freeway', 'g', 44, 10.7, 10.3, 0.2, 0, 0, 75, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 2, 0, 0, 0, 0, 0, 0, 0),
	('a7520d39-595c-41e8-b522-94feb77ceae0', 2483, 'Vruchtendrank ACE', 'g', 44, 10.9, 10.9, 0.2, 0, 0.1, 40, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0.1, 3, 0.03, 0, 36, 0, 0),
	('0ba39fb8-6c9f-4908-a51c-a2816b2cd4ba', 2687, 'Kruidnoten m chocolade puur', 'g', 482, 63.4, 35.9, 6.1, 21.7, 4.3, 342, 'NEVO-online 2025/9.0', 'Gebak en koek', 49, 2, 51, 0.91, 0, 0, NULL, 0),
	('1e7e61b3-75a5-41ca-8270-d301ad7d5597', 2487, 'Soep op groente- en vleesbasis kant-en-klaar blik/zak/pak', 'g', 41, 5.3, 2.5, 2, 1.2, 0.7, 324, 'NEVO-online 2025/9.0', 'Soepen', 13, 0.4, 5, 0.15, 0.1, 2, 0, 0),
	('0b48e35a-0be6-43d6-9baf-c45e47140b80', 2488, 'Soep op groente- en vleesbasis bereid pakje', 'g', 18, 2.7, 0.7, 0.6, 0.5, 0.3, 296, 'NEVO-online 2025/9.0', 'Soepen', 5, 0.3, 5, 0.1, 0.1, 1, 0, 0),
	('2819ea2c-c009-4d1e-880b-0e6edacdf1d4', 2489, 'Pasta speculoos-', 'g', 579, 56.6, 34.2, 3.2, 37.5, 1, 197, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 116, 4.5, 74, 1.3, 0, 1, 0, 0),
	('a754f06e-1cd2-4154-b509-64c0d226cd59', 2490, 'Vruchtendrank multivit 12vr nectar light', 'g', 23, 5.4, 5.3, 0.2, 0, 0.2, 3, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 0.1, 4, 0.07, 0, 15, 0, 0),
	('36e318d4-6556-4e1b-9a51-6ff16a3133d4', 2491, 'Vruchtendrank m zoetstof 5-<8 g KH', 'g', 28, 6.9, 6.6, 0.1, 0, 0.2, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 0.1, 4, 0.07, 0, 6, 0, 0),
	('b6da3cf9-e9c5-44c8-87dd-d169b29babf9', 2493, 'Aardappelpureepoeder z melkpoeder z vet', 'g', 364, 78.4, 1.9, 7.9, 0.5, 7, 460, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 27, 1.2, 66, 0.7, 0, 5, 0, 0),
	('4ffb9cb5-ac5d-4c70-b274-0ac18ceefd58', 2495, 'Melk chocolade- m halfvolle melk en gezoete cacaopoeder', 'g', 78, 12.2, 12, 3.5, 1.6, 0.6, 47, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 115, 0.8, 22, 0.56, 0, 1, 0, 0),
	('e2456d52-c96a-4e2a-9af9-cfb9b429a930', 2496, 'Zuiveldrank Fruitmelk Campina', 'g', 54, 9.2, 9.2, 3.3, 0.5, 0, 44, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 109, 0, 11, 0.37, 0, 2, 0, 0),
	('38357f1b-37fd-4ae8-9780-382b6c77da62', 2498, 'Tomaat gezeefd pak', 'g', 39, 6.3, 6, 1.8, 0.3, 2, 110, 'NEVO-online 2025/9.0', 'Groente', 11, 0.5, 9, 0.17, 0, 11, 0, 0),
	('beff2a94-5572-4bd2-a0a4-134dbe150638', 2499, 'Aardappelpureepoeder m melkpoeder m vet', 'g', 373, 62, 2.5, 9.2, 8.6, 5.5, 160, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 80, 1.6, 70, 1.2, 0, 5, 0, 0),
	('041a95a0-acdc-43f7-a648-d6d0d8848417', 2501, 'Yoghurt vruchten- halfvolle', 'g', 79, 11.6, 11, 4.2, 1.5, 0.1, 47, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 119, 0, 12, 0.41, 0, 1, 0, 0),
	('4a24c6d0-3345-4978-a45d-0a8590025f43', 2503, 'Yoghurt Griekse volle', 'g', 122, 3.8, 3.8, 3.8, 10, 0, 53, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 118, 0, 11, 0.43, 0, 0, 0.01, 0),
	('8e338cb2-e3d1-4a76-837f-143345597785', 2504, 'Kwark vruchten- volle', 'g', 125, 13.3, 11.8, 5.7, 5.1, 0.5, 33, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 112, 0, 10, 0.44, 0.1, 0, 0, 0),
	('cde58626-7a22-48c6-98b2-a9abc868d8b1', 2505, 'Fruit gedroogd op brandewijn', 'g', 201, 27.2, 26.8, 0.6, 0.1, 1.3, 5, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 12, 0.5, 9, 0.11, 0, 1, 0, 0),
	('575c5468-12a0-4d43-90e6-f7e2be7ef13a', 2507, 'Sap multivruchten-', 'g', 47, 10.7, 10.2, 0.4, 0.1, 0.3, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 11, 0.2, 9, 0.07, 0, 12, 0, 0),
	('86808ab0-840e-41cf-81a0-e3e696eacc44', 2513, 'Cider', 'g', 55, 6.4, 6, 0.1, 0, 0, 4, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 10, 0.4, 7, 0.03, 0, 0, 0, 0),
	('87c035cd-0c81-4ed9-aab9-a5ed84b3d4ee', 2514, 'Diksap bereid 1 op 13', 'g', 17, 4.2, 4.2, 0, 0, 0, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 8, 0, 3, 0, 0, 0, 0, 0),
	('8a3789f0-a0c1-4083-8034-e8a513793be8', 2515, 'Vruchtendrank multivit nectar light Surango', 'g', 21, 5, 4.9, 0.2, 0, 0.1, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 0.1, 4, 0.08, 0, 9, 0, 0),
	('98440a07-9064-45bf-aa08-1ea8fa6110d5', 2516, 'Kaas smeer- 15+ Balans ERU', 'g', 132, 3.3, 3, 17.3, 5.5, 0, 750, 'NEVO-online 2025/9.0', 'Kaas', 580, 0.1, 17, 1.76, 0.1, 1, 0, 0),
	('07cab28a-20c4-4953-b682-cdb69162dd4b', 2517, 'Kaas smeer- Kids ERU', 'g', 169, 2.3, 2.3, 15, 11.1, 0, 750, 'NEVO-online 2025/9.0', 'Kaas', 800, 0.1, 21, 3, 0.2, 1, 0, 0),
	('7e03681e-af01-4806-a9c7-ac605f0ee9ee', 2518, 'Kaas geiten- hard', 'g', 396, 0.1, 0.1, 22.4, 32.5, 0, 757, 'NEVO-online 2025/9.0', 'Kaas', 806, 0.2, 46, 3.7, 0, 0, 0, 0),
	('1e5829bf-1ff0-481f-a437-569ca583371a', 2519, 'Vla halfvolle alle smaken', 'g', 85, 15.1, 10.9, 2.3, 1.7, 0.4, 53, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 89, 0, 9, 0.3, 0, 0, 0, 0),
	('6d3058f7-2345-4e42-b8e3-3cbdfadabf27', 2520, 'Pudding luchtige', 'g', 179, 22, 17.9, 4.2, 8.1, 0.9, 60, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 83, 0.3, 12, 0.31, 0, 0, 0, 0),
	('688104d2-d612-43b9-aee1-4bf3464c872b', 2521, 'Pap lammetjes- bereid m volle melk', 'g', 84, 9.8, 4.1, 3.9, 3.2, 0.3, 38, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 115, 0.1, 13, 0.47, 0, 0, 0, 0),
	('bf42874f-efbe-48dc-8bd9-6933cfadcd6b', 2522, 'Vlaflip dubbel- Campina', 'g', 96, 15, 11.7, 2.9, 2.6, 0.3, 66, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 117, 0, 8, 0.23, 0, 0, 0, 0),
	('3130e0f7-08f0-4abd-ad78-fdb420f0d7cb', 2524, 'Peper Spaanse rauw', 'g', 30, 4.2, 4.2, 1.8, 0.3, 1.8, 12, 'NEVO-online 2025/9.0', 'Groente', 16, 1, 21, 0.3, 0, 144, 0, 0),
	('35efb459-2cfc-4754-8478-21d8b3df9c39', 2525, 'Vet frituur- horeca', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, 0, 0),
	('fd87c4a1-700e-4d3d-aa99-6b30ea80dce6', 2527, 'Biscuit hartig Sultana Crunchers', 'g', 413, 70.5, 9.7, 8.5, 10.3, 2.2, 1067, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 39, 1, 21, 0.58, 0, 1, 0, 0),
	('073dcfcc-cada-4b98-925d-0bccf97b9bb3', 2528, 'Croutons', 'g', 491, 58.6, 3.8, 11.8, 22.3, 4, 988, 'NEVO-online 2025/9.0', 'Brood', 20, 1.4, 20, 0.7, 0, 0, 0, 0),
	('5642f97d-7c41-43b3-9944-c120a3505306', 2529, 'Chips oven-', 'g', 411, 72.8, 8, 6.4, 9.3, 5.1, 420, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('e3dae579-7bcf-4cab-be42-8058c9faad3f', 2530, 'Maltesers', 'g', 500, 61.5, 51.9, 8.3, 24.3, 1.2, 171, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 110, 1.2, 48, 0.8, 0, 0, 0, 0),
	('d9dbd32f-591c-4004-9899-96bce086f64c', 2531, 'Vlokken chocolade- gem', 'g', 452, 71.6, 69.6, 5.5, 14.9, 3.9, 48, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 87, 5.5, 78, 0.42, 0, 0, 0, 0),
	('800547d4-e1be-4f15-b99d-c03359018f2c', 2532, 'Drop suikervrij', 'g', 167, 61, 0.1, 1, 0.2, 1, 60, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 132, 3.5, 35, 0.29, 0, 0, 0, 0),
	('8ef045ac-13bb-4435-a047-748bd101a66a', 2533, 'Winegum m drop', 'g', 334, 79.6, 55.1, 3.5, 0.2, 0, 22, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 6, 0.2, 1, 0, 0, 0, 0, 0),
	('18ae3b8a-38cf-4fd1-823b-d859953072a9', 2535, 'Cacaopoeder gezoet Nesquik', 'g', 376, 79, 75, 5, 3, 6.5, 160, 'NEVO-online 2025/9.0', 'Diversen', 38, 17, 113, 7.6, 11, 95, 0, 0),
	('e0ee2d01-a8bc-424e-817c-c7fa0e0b6fd6', 2537, 'Vlaflip v vla en yoghurt', 'g', 77, 12.3, 10.6, 3.4, 1.5, 0, 52, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 117, 0, 10, 0.42, 0, 1, 0, 0),
	('6f345134-e31b-4b73-8974-6ff27cf3eb88', 2538, 'Pudding huishoudelijk bereid m hv melk', 'g', 92, 17, 14.2, 2.9, 1.4, 0, 191, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 106, 0, 11, 0.36, 0, 0, 0, 0),
	('0efd47f3-1b85-4ed3-991c-e7305d870741', 2539, 'Vla zacht & luchtig', 'g', 142, 16, 9.9, 2.9, 7.4, 0.2, 51, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 110, 0, 11, 0.23, 0, 2, 0.01, 0),
	('fc253da3-85fd-40ab-badd-3cdbbf07750a', 2540, 'Soep noodle- bereid', 'g', 86, 11.7, 1.1, 1.7, 3.4, 0.7, 365, 'NEVO-online 2025/9.0', 'Soepen', 7, 0.2, 7, 0.22, 0, 0, 0, 0),
	('ffdaa8c0-792c-47b0-a6bb-174aba243be9', 2541, 'Worst boterham- vegetarisch verrijkt m ijzer en vit B12', 'g', 181, 4.6, 1, 6.6, 14.7, 1.8, 680, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 48, 4.3, 12, 0.45, 0, 7, 0, 0),
	('e160d338-d8fa-4046-8c74-1e422ab095f5', 2547, 'Bamibal/bamischijf diepvries onbereid', 'g', 165, 29, 4, 5.8, 2.8, 0.5, 467, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 39, 1.7, 7, 1.21, 0.2, 6, NULL, NULL),
	('ac6031a6-aba6-4724-bf5b-1d52d8d966ba', 2548, 'Kroket vlees- diepvries onbereid', 'g', 187, 18.9, 1.7, 7.6, 8.7, 1.5, 535, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 13, 1, 16, 1.1, 0, 0, 0, 0),
	('1e3839ba-ee6a-4e54-b65a-b9c5d4761d80', 2549, 'Loempia diepvries onbereid', 'g', 152, 21.2, 2.5, 6.1, 4.5, 1.3, 400, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 34, 1, 16, 0.73, 0.4, 5, NULL, NULL),
	('ef365a8b-ffe5-4f2f-b1df-feb9eefa3d27', 2551, 'Croissant ham-kaas-', 'g', 378, 35.7, 3.8, 11.2, 20.6, 2.1, 513, 'NEVO-online 2025/9.0', 'Brood', 83, 0.7, 19, 1.03, 0, 2, 0, 0),
	('3cd064a9-2efc-4010-bc7f-68ce15f1bbb8', 2552, 'Kipkorn diepvries onbereid', 'g', 293, 16.5, 0.9, 11.6, 19.7, 2, 640, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 7, 0.5, 12, 0.91, 0, 0, 0, 0),
	('fa057a54-4be3-475a-958a-7ff652f8086e', 2553, 'Broodje kaas- v bladerdeeg', 'g', 481, 39.8, 0.3, 10, 30.9, 1.5, 633, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 131, 0.5, 15, 0.74, 0, 0, 0, 0.01),
	('05629c04-d6e0-4f44-b788-a8619dc3e281', 2555, 'Viandel onbereid Mora', 'g', 300, 17, 1, 9.5, 21.2, 1.5, 1000, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 11, 0.8, 17, 1, 0.2, 1, 0, 0),
	('3093a325-738c-49c5-a255-d7c1bd5f6010', 2556, 'Biscuit meergranen- LU Time Out', 'g', 484, 64.3, 27.3, 7.6, 20.8, 4.8, 465, 'NEVO-online 2025/9.0', 'Gebak en koek', 30, 1.8, 50, 1.5, 0, 0, 0.02, 0),
	('8476c8b5-baa9-4806-a2ca-11ede977560d', 2557, 'Margarine 80% vet >24 g verz vetz ongezouten', 'g', 724, 0.3, 0.2, 0.2, 80.2, 0, 7, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('b9a38f01-d96f-414b-a8ec-5cc81afc0307', 2558, 'Margarine vlb 80% vet <17 g verz vetz ongezouten', 'g', 738, 0.1, 0.1, 0, 82, 0, 10, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('cc1c785a-a579-4e78-8050-4c2789baf879', 2559, 'Halvarineproduct Bewust light 30% vet <10g verz vetz ongezouten', 'g', 275, 1.1, 0.2, 0.1, 30, 0.3, 10, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, NULL, NULL),
	('ab72f708-242d-4612-a424-d665801085a2', 2560, 'Appelflap m bladerdeeg z roomboter', 'g', 305, 38, 14.5, 4, 14.8, 1.7, 299, 'NEVO-online 2025/9.0', 'Gebak en koek', 13, 0.4, 9, 0.18, 0, 1, 0, 0),
	('905df230-30fe-4797-871f-dd77dd25f552', 2561, 'Soep gebonden z vulling', 'g', 41, 2.7, 0.3, 0.6, 3, 0.1, 367, 'NEVO-online 2025/9.0', 'Soepen', 4, 0.1, 1, 0.05, 0, 0, 0, 0),
	('853f6662-8fa8-41c5-a72d-f9cc3fbeb52a', 2562, 'Bak- en braadvet vlb 97% vet <17g verz vetz ongezouten', 'g', 883, 0.5, 0.5, 0.4, 97.7, 0, 43, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('e2c021f6-5445-41f6-83f7-a59636d8cfa4', 2563, 'Bak- en braadvet vast 97% vet >17 g verz vetz ongezouten', 'g', 880, 0.7, 0.7, 0.4, 97.3, 0, 16, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('df6f17cb-cd75-4ebd-a839-9e55614785f1', 2565, 'Margarine 80% vet <24 g verz vetz ongezouten', 'g', 720, 0, 0, 0, 80, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('d0fb4e59-8558-43e3-878f-dcac16329fbf', 2566, 'Halvarine 40% vet <17g verz vetz ongezouten', 'g', 360, 0, 0, 0, 40, 0.1, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('f627e6b3-5dae-4c3d-80e8-1cf82e64b52b', 2567, 'Halvarineproduct Albert Heijn smeerbaar cholesterol verlagend', 'g', 317, 0.2, 0.2, 0, 35, 0.4, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('ab31108b-d874-41af-8b17-0948aaf675db', 2568, 'Vlaai kruimel- m pudding', 'g', 286, 43, 20.5, 5.2, 10, 1.3, 206, 'NEVO-online 2025/9.0', 'Gebak en koek', 53, 0.7, 12, 0.51, 0.9, 0, 0.01, 0),
	('a78a3c49-ec0e-44b7-91e0-4a5170cbb83d', 2569, 'Koek ontbijt- m noten en vruchten', 'g', 343, 63.7, 37.1, 4.5, 6.9, 3.9, 189, 'NEVO-online 2025/9.0', 'Gebak en koek', 33, 1.2, 40, 0.91, 0.1, 0, 0, 0),
	('68224576-4911-4b0c-88cf-a36cf2a64bdc', 2570, 'Vlaai pudding- m vruchten', 'g', 146, 24.7, 14.5, 2.9, 3.6, 1.4, 122, 'NEVO-online 2025/9.0', 'Gebak en koek', 41, 0.5, 10, 0.32, 0.3, 3, 0, 0),
	('9cd4795d-d07f-4756-a2d0-91a0865a1dd3', 2571, 'Cake bitterkoekjes-', 'g', 398, 45.3, 27.7, 5.8, 21.3, 1.2, 373, 'NEVO-online 2025/9.0', 'Gebak en koek', 24, 0.9, 14, 0.55, 2.1, 0, 0.01, 0),
	('21a89228-6406-4d48-b427-8574fda3052c', 2573, 'Saus knoflook- 20-<30% olie', 'g', 246, 13.4, 8.2, 0.8, 21, 0, 550, 'NEVO-online 2025/9.0', 'Hartige sauzen', 10, 0.2, 2, 0.26, 0, 0, 0, 0),
	('af3298f9-d637-41dd-96c3-a0da571d9255', 2575, 'Aardappelpuree vers bereid m volle melk en margarine', 'g', 87, 13.9, 1.3, 2.2, 2.3, 1.2, 21, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 38, 0.4, 17, 0.36, 0.1, 7, 0, 0),
	('5e1d0a7c-fc9d-4738-b345-a44a5b0e6d8c', 2577, 'Cake appel- m roomboter', 'g', 263, 30.6, 19.7, 3.6, 13.7, 1.3, 278, 'NEVO-online 2025/9.0', 'Gebak en koek', 23, 0.5, 8, 0.37, 0.3, 1, 0.02, 0),
	('e07d89ab-d858-443c-922d-126f232ceeff', 2580, 'Jus 5% vet gebonden bereid m juspoeder', 'g', 76, 6.8, 0.4, 0.9, 5, 0.2, 610, 'NEVO-online 2025/9.0', 'Hartige sauzen', 5, 0, 1, 0, 0.3, 0, NULL, NULL),
	('684798cf-9c89-4a8e-b295-f26837da2104', 2581, 'Pannenkoek volkoren huishoudelijk bereid m vloeibare margarine', 'g', 181, 22.4, 3, 6.6, 6.6, 3.1, 161, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 86, 1.1, 40, 0.99, 0.5, 1, NULL, NULL),
	('d612a415-ca74-4bda-a6ba-12fdf8429b5f', 2582, 'Pannenkoek volkoren huishoudelijk bereid m margarine', 'g', 180, 22.4, 3, 6.6, 6.5, 3.1, 165, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 85, 1.1, 40, 0.99, 0.5, 1, 0, 0),
	('7fbdfff4-3e8b-4a4f-a7bf-a3a48d1d91e8', 2583, 'Koek pinda-', 'g', 513, 51.9, 24.8, 10.6, 28.4, 3.7, 211, 'NEVO-online 2025/9.0', 'Gebak en koek', 45, 1.5, 73, 1.29, 0.1, 0, 0.01, 0),
	('c3a1f556-7c69-4930-9dc5-29ffd0257d6c', 2588, 'Jus 25% vet ongebonden bereid z juspoeder', 'g', 219, 0.2, 0.2, 0.1, 24.2, 0, 100, 'NEVO-online 2025/9.0', 'Hartige sauzen', 6, 0, 1, 0, 1.9, 0, NULL, NULL),
	('4e0ddf37-c22a-4d00-b91f-c64d0061a145', 2595, 'Candybar KitKat', 'g', 520, 59, 48.6, 7.1, 27.7, 3, 84, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 86, 2.4, 53, 0.99, 0, 1, 0, 0),
	('222d9b42-3dbd-43a8-8121-58fcde22e8f1', 2605, 'Dressing olijfolie-azijn', 'g', 607, 0.5, 0.3, 0.4, 66.4, 0.1, 60, 'NEVO-online 2025/9.0', 'Hartige sauzen', 4, 0.1, 5, 0.08, 0, 0, 0, 0),
	('a22443c5-6f10-4c17-bdff-af0b2b887c2f', 2606, 'Mix voor marinade poeder onbereid', 'g', 285, 50.5, 24.8, 8.4, 4.3, 5.1, 9565, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 200, 4.4, 95, 1.5, 0, 36, 0, 0),
	('8bc5d915-482c-464c-89ae-6ea472a55ada', 2607, 'Koekje m noten en chocolade', 'g', 517, 55.5, 28.5, 7.5, 28.7, 3.3, 283, 'NEVO-online 2025/9.0', 'Gebak en koek', 95, 3, 67, 1.27, 0.1, 0, 0, 0),
	('8ca9ec18-5548-4556-b844-3f6c7515b0cb', 2609, 'Koekje m noten', 'g', 509, 64.9, 29.8, 6.6, 24.1, 3.1, 215, 'NEVO-online 2025/9.0', 'Gebak en koek', 54, 1.6, 48, 0.96, 0.2, 0, NULL, NULL),
	('11a97954-f8eb-4ad8-bcc4-7ad10d3c356d', 2610, 'Wijn rose', 'g', 71, 2.5, 2.5, 0.1, 0, 0, 4, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 12, 1, 7, 0, 0, 0, 0, 0),
	('5bce61ee-3813-4752-82f7-f45c2c907a88', 2611, 'Saus Joppie-', 'g', 346, 22.8, 12.1, 0.8, 28, 0, 559, 'NEVO-online 2025/9.0', 'Hartige sauzen', 8, 0.2, 2, 0.11, 0.1, 0, 0, 0),
	('42d5a7a5-576e-4b84-ba51-dd7b649853c3', 2612, 'Tapenade v olijven', 'g', 326, 5.2, 4.5, 1.8, 32.4, 3.3, 1010, 'NEVO-online 2025/9.0', 'Hartige sauzen', 38, 1.2, 16, 0.18, 0, 1, 0, 0.01),
	('0b65280d-1d0e-493d-addc-1ee56ca31058', 2613, 'Mix seasoning Mexicaans onbereid', 'g', 318, 48.8, 25.4, 12, 5.7, 11.5, 5438, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 200, 4.4, 95, 1.5, 0, 36, 0, 0),
	('3bb95e2f-12c3-44d6-ba4b-5bfe63b4b8c7', 2614, 'Salsa tomatendipsaus', 'g', 45, 9.3, 5.3, 0.9, 0.2, 1.6, 725, 'NEVO-online 2025/9.0', 'Hartige sauzen', 10, 0.5, 12, 0, 0, 1, 0, 0),
	('8b52bf24-dc72-4af7-a5e9-48fb9ad2f513', 2615, 'Azijn', 'g', 22, 0.6, 0.6, 0.4, 0, 0, 5, 'NEVO-online 2025/9.0', 'Diversen', 3, 0.1, 4, 0.1, 0, 0, 0, 0),
	('66518599-ce49-43f8-afc5-147f64b9570b', 2953, 'Zout zee-', 'g', 0, 0, 0, 0, 0, 0, 33800, 'NEVO-online 2025/9.0', 'Diversen', 51, 3, 37, 0.08, 0, 0, 0, 0),
	('6537b2b6-1f74-4150-bcd5-3c7e25f9d41e', 2617, 'Broodje bapao vlees', 'g', 252, 38.1, 7.3, 8.9, 6.7, 1.9, 364, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 22, 1.1, 19, 1.15, 0.1, 1, 0, 0.01),
	('fe6826f1-8037-446c-b106-7aca7315e595', 2619, 'Berenklauw rauw', 'g', 154, 5.4, 2.1, 11.3, 9.4, 1.5, 697, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 19, 1, 16, 1.89, 0.4, 6, NULL, 0),
	('c33f801a-b5d1-4128-b505-6d8f9a2fb0b2', 2622, 'Taart appel- v zandtaartdeeg m roomboter', 'g', 225, 31.9, 20.9, 2.4, 9.1, 1.6, 61, 'NEVO-online 2025/9.0', 'Gebak en koek', 14, 0.4, 9, 0.22, 0.1, 2, 0.01, 0),
	('99ca8d36-f69b-46fc-9aef-28dbb4525154', 2633, 'Koffie oplos- poeder', 'g', 114, 3.1, 3.1, 7.8, 0.2, 34.1, 100, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 160, 4.4, 390, 0.57, 0, 0, 0, 0),
	('241d484a-ef5c-4da9-bd98-c86c1ba903d4', 2634, 'Vruchtendrank 2 of meer vruchten verrijkt m vit C', 'g', 48, 11.4, 11.2, 0.2, 0.1, 0.2, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 7, 0.1, 5, 0.07, 0, 16, 0, 0),
	('27723b46-f823-4323-91c1-a01103aeddd2', 2639, 'Smoothie vruchten', 'g', 56, 12.3, 10.9, 0.7, 0.2, 1.3, 19, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 10, 0.3, 8, 0.07, 0, 30, 0, 0),
	('4e229729-751a-4f3d-b550-a4c106ee2c22', 2640, 'Smoothie vruchten m zuivel', 'g', 51, 10.3, 10.3, 1.3, 0.1, 1.2, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 26, 0.2, 9, 0.13, 0, 41, 0, 0),
	('bb900827-9545-4a15-8626-b31109024406', 2641, 'Frisdrank m suiker en zoetstof 2-<5 g KH m cafeine', 'g', 11, 2.6, 2.6, 0, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 0, 0, 0, 0, 0, 0),
	('50a7525b-45b3-4fcd-bde1-462b4410319e', 2646, 'Sportdrank Aquarius', 'g', 29, 7.1, 7.1, 0, 0, 0, 24, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 1, 0, 0, 0, 0, 0, 0, 0),
	('34a2cd99-3f3d-48b1-9c33-f3bd5c7a2276', 2647, 'Koffie automaat- m suiker en melk', 'g', 28, 5.3, 4.3, 0.2, 0.7, 0, 8, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 3, 0.2, 6, 0.01, 0, 0, 0, 0),
	('e032deae-c266-4ca5-945b-a132342aa14e', 2648, 'Koffie automaat- m melk', 'g', 12, 1.3, 0.3, 0.2, 0.7, 0, 8, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 3, 0.2, 6, 0.01, 0, 0, 0, 0),
	('347e6fec-7c57-46a2-a622-d0af9a8d12b4', 2649, 'Thee kruiden- oplos gezoet poeder', 'g', 372, 92.9, 92.1, 0, 0, 0.1, 7, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0.1, 2, 0.01, 0, 0, 0, 0),
	('74b6c845-83e7-4d88-b36f-560aa2634d29', 2650, 'Jus z vet bereid m juspoeder', 'g', 28, 4.6, 0.4, 0.9, 0.7, 0.2, 609, 'NEVO-online 2025/9.0', 'Hartige sauzen', 4, 0, 1, 0, 0, 0, 0, 0),
	('b6218a32-f80f-4ee3-8fe1-d926e88844cb', 2651, 'Saus cocktail/party/tafel- >25% olie', 'g', 374, 15.9, 9.7, 1.2, 33.9, 0.3, 493, 'NEVO-online 2025/9.0', 'Hartige sauzen', 10, 0.2, 2, 0.21, 0, 0, 0, 0),
	('9c4b2fd1-16dd-4fbf-9ef1-7b33e7006408', 2653, 'Wafel rijst- gekruid', 'g', 402, 74.4, 4, 7.9, 7.7, 1.7, 756, 'NEVO-online 2025/9.0', 'Brood', 33, 0.9, 116, 1.63, 0, 0, 0, 0),
	('e6eb49a9-2691-47bc-a864-554692ecb91a', 2654, 'Kipfilet (vleeswaar)', 'g', 125, 3.4, 1, 17.5, 4.4, 0, 932, 'NEVO-online 2025/9.0', 'Vleeswaren', 7, 0.7, 24, 1.77, 0.2, 0, 0, 0),
	('d3bdd81c-d404-40ba-bda3-f63e15260f1a', 2655, 'Yoghurt 0% vet Activia m vruchten', 'g', 53, 7.5, 7, 4.6, 0.1, 0.6, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 173, 0, 11, 0.39, 0, 0, 0, 0),
	('1b6f5adf-dd3e-4048-b9ad-d8055cc69ef3', 2656, 'Hagelslag chocolade- mix wit en puur', 'g', 449, 73.9, 65.9, 3.2, 14.7, 4.3, 33, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 76, 6.3, 93, 1.19, 0, 0, 0, 0),
	('c455ffb2-ea48-467e-b043-9b4f62579c65', 2657, 'Pasta duo- m chocolade', 'g', 576, 59.5, 57.4, 1.8, 36.5, 1.3, 39, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 97, 1.7, 42, 1.3, 0, 0, 0, 0),
	('8dd29a7a-67a1-44bc-826e-c3b7efff8228', 2658, 'Pasta duo- z chocolade', 'g', 567, 62.5, 62.2, 0.8, 34.9, 0.1, 73, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 34, 0.1, 5, 0.12, 0, 0, 0, 0),
	('55db116a-fe5d-4896-a990-10ef1f8bfd51', 2659, 'Snoep schuim-/gum-', 'g', 336, 78.5, 49.2, 4.9, 0.2, 0.1, 0, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 6, 0.2, 1, 0, 0, 0, 0, 0),
	('ccfc8dfd-d5a2-433a-93c3-bf94494934a0', 2660, 'Winegum m schuimlaag', 'g', 333, 78.5, 63.5, 4.8, 0, 0, 7, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 6, 0.2, 1, 0, 0, 0, 0, 0),
	('9b6d3477-733d-477b-935f-dc58475cf0e3', 2661, 'Wafel Luikse-', 'g', 446, 57.1, 29.5, 5.7, 21.3, 1.5, 270, 'NEVO-online 2025/9.0', 'Gebak en koek', 18, 0.8, 9, 0.47, 2.3, 0, 0.01, 0),
	('ed53502b-f13d-4312-a61b-bd8b3eff4340', 2662, 'Wafel zachte/suiker-/flash-', 'g', 493, 53.8, 36.4, 7.6, 27.3, 0.9, 297, 'NEVO-online 2025/9.0', 'Gebak en koek', 28, 0.6, 10, 0.42, 0.3, 0, 0.02, 0),
	('b9335c6d-9586-493d-bd93-1f2d37bdf496', 2665, 'Frisdrank m suiker en zoetstof 5-<8 g KH m cafeine', 'g', 27, 6.5, 6.5, 0.3, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 0, 0, 0, 0, 0, 0),
	('d04f0a36-db74-49f0-b7ea-b9008d1cab1c', 2667, 'Dressing sla- 20% olie m yoghurt', 'g', 258, 12.3, 9.4, 1.2, 22.7, 0, 591, 'NEVO-online 2025/9.0', 'Hartige sauzen', 10, 0.2, 2, 0.26, 0, 0, 0, 0),
	('cead04d0-ad93-49aa-aa8e-1fcc7d99d446', 2671, 'Mix voor nasi/bami onbereid', 'g', 300, 45.8, 23.1, 11, 5.8, 10.6, 7132, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 162, 4.9, 57, NULL, 0, 19, 0, 0),
	('d5e00390-2348-4e00-8136-4eb54f16d42d', 2672, 'Energydrink Red Bull', 'g', 44, 11, 11, 0, 0, 0, 40, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 0, 0, 0, 0, 0, 0),
	('78c0c862-b9b0-469e-9cb0-8819fdfa67b9', 2673, 'Energydrink Red Bull sugarfree', 'g', 0, 0, 0, 0, 0, 0, 40, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 0, 0, 0, 0, 0, 0),
	('1be08978-cffd-4484-ab7f-38eb0863df34', 2675, 'Muesli krokante m noten', 'g', 454, 60.1, 13, 10.2, 17.5, 8, 36, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 50, 3.1, 109, 2.27, 0, 0, 0, 0.01),
	('dc464ce6-5a8f-4d75-9c00-7304e72c1c6b', 2676, 'Muesli krokante m chocolade', 'g', 445, 60.4, 12.4, 10.2, 16.1, 8.6, 102, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 39, 3, 93, 2, 0, 0, 0, 0.01),
	('9e45ef0f-830f-4825-8bf8-302fdebf9f8a', 2677, 'Muesli krokante m noten en chocolade', 'g', 436, 63, 16.7, 10.7, 13.9, 8.4, 6, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 42, 3, 98, 2.09, 0, 0, 0, 0.01),
	('5e4b0968-4fca-4a51-b101-504c1dc3e30a', 2678, 'Zuivelspread naturel/kruiden', 'g', 248, 3.1, 3.1, 5.1, 23.9, 0.1, 252, 'NEVO-online 2025/9.0', 'Kaas', 89, 0.2, 8, 1.83, 0.2, 0, 0.02, 0),
	('16181efc-170e-446c-ac7e-febdaf894b14', 2679, 'Zuivelspread naturel/kruiden light', 'g', 175, 4.2, 3.5, 8.1, 13.8, 0.3, 367, 'NEVO-online 2025/9.0', 'Kaas', 102, 0.4, 22, 0.27, 0.1, 0, 0.01, 0),
	('119d2258-41e8-4bb5-9d0e-a1ae12bd3a0c', 2681, 'Mix kruiden- Wereldgerechten onbereid', 'g', 312, 50.4, 20.1, 11.8, 5.1, 8.5, 5959, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 200, 4.4, 95, 1.5, 0, 36, 0, 0),
	('b96b95d9-aed8-4ab8-9109-7e1e654df3f7', 2682, 'Rijst meergranen- gekookt', 'g', 140, 29.6, 0.4, 3.6, 0.6, 1.1, 9, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 8, 0.5, 38, 0.32, 0, 0, 0, 0),
	('d250fb36-3979-423f-9a23-2e327877b6e0', 2683, 'Ontbijtproduct Coco pops Chocos Kellogg''s', 'g', 380, 77, 22, 10, 2.2, 6, 268, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 35, 8, 40, 1, 8.3, 0, 0, 0),
	('443b5c9e-1897-4a33-b53b-509670d206b5', 2684, 'Ontbijtproduct Special K chocolade Kellogg''s', 'g', 417, 81, 19, 8, 5.6, 5.7, 262, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 65, 12, 50, 1.5, 7, 1, 0, 0),
	('be579623-9612-43a5-b727-a4f78ef118c7', 2685, 'Abrikozen gedroogd geweekt', 'g', 159, 33, 31.4, 2.8, 0, 8.1, 15, 'NEVO-online 2025/9.0', 'Fruit', 53, 2.2, 37, 0.11, 0, 0, 0, 0),
	('ca0e0139-038d-4c12-9937-41f277d5bdf0', 2686, 'Appelmoes z suiker m zoetstof blik/glas', 'g', 48, 11, 11, 0.2, 0, 1, 0, 'NEVO-online 2025/9.0', 'Fruit', 4, 0.1, 3, 0.06, 0, 2, 0, 0),
	('2d868a09-8dd2-4068-8f91-73642b993b31', 2688, 'Kruidnoten m chocolade melk-', 'g', 490, 65.8, 39.2, 6.4, 21.8, 2.3, 369, 'NEVO-online 2025/9.0', 'Gebak en koek', 99, 2, 34, 0.82, 0, 0, 0, 0),
	('113e631c-81df-491f-8bac-026bf96e8bd5', 2691, 'Kauwbonbon fruitsmaak', 'g', 395, 82.9, 56.8, 1, 6.6, 0.1, 10, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 4, 0.2, 2, 0.04, 0, 0, 0, 0),
	('f52f6708-e306-4203-a920-c61610e44793', 2696, 'Koekje bitter-', 'g', 411, 68.7, 50.6, 7, 11.5, 2.3, 12, 'NEVO-online 2025/9.0', 'Gebak en koek', 52, 0.8, 54, 0.63, 0, 0, NULL, NULL),
	('9012fc42-b4f6-4df2-9dbf-481311668428', 2698, 'Cake chocolade- z roomboter', 'g', 396, 46.5, 30.8, 5.6, 20.3, 2.3, 363, 'NEVO-online 2025/9.0', 'Gebak en koek', 24, 1.2, 29, 0.76, 2, 0, 0.01, 0),
	('86fc989b-6838-4979-921e-c2f83a319326', 2699, 'Frou frou', 'g', 534, 60.4, 37.7, 4.3, 30.5, 0.7, 132, 'NEVO-online 2025/9.0', 'Gebak en koek', 22, 1, 13, 0.63, 0.6, 0, 0, 0),
	('18895a9f-9db7-4497-8368-b420d2be260e', 2700, 'Biscuit Sultana Yofruit', 'g', 412, 74.1, 40.7, 5.1, 10.1, 2.2, 173, 'NEVO-online 2025/9.0', 'Gebak en koek', 330, 1.4, 26, 0.3, 0, 0, 0, 0),
	('840aab70-5a17-4c26-8af3-ca9784b1e0fe', 2701, 'Kruidnoten m chocolade witte', 'g', 491, 68.5, 43.3, 6.1, 21.2, 1.1, 390, 'NEVO-online 2025/9.0', 'Gebak en koek', 144, 0.6, 24, 0.77, 0, 1, NULL, 0),
	('838e4599-5b9f-4783-b854-fdd08cb2b4bc', 2703, 'Tarwebrood volkoren gem v fijn en grof m zaden', 'g', 274, 35.5, 1.7, 12.5, 7.4, 7.9, 341, 'NEVO-online 2025/9.0', 'Brood', 46, 2.5, 101, 2.08, 0, 0, 0, 0),
	('e48daeac-18ab-42f7-a523-e279278f5ebe', 2704, 'Tarwebrood bruin m zaden', 'g', 278, 39.2, 1.7, 11.4, 7, 6.4, 361, 'NEVO-online 2025/9.0', 'Brood', 41, 2, 82, 1.72, 0, 0, 0, 0),
	('809e22c5-6dcf-4581-9e96-9999483dde61', 2705, 'Ontbijtproduct All-Bran flakes Kellogg''s', 'g', 358, 65, 14, 11, 2.2, 17, 264, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 30, 8, 130, 2.5, 8.4, 0, 0, 0),
	('9c7031f4-c0ac-46cf-b898-16dd66f4c1ea', 2706, 'Chips/kroepoek cassave', 'g', 474, 67.5, 7.9, 1.4, 21.4, 2.7, 940, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 52, 0.7, 46, 0.85, 0, 17, 0, 0),
	('b7639cee-ccb3-4802-927b-65aaa5edbda0', 2707, 'Tarwemaisbrood wit m zonnebloempitten', 'g', 307, 41.2, 2.3, 11.6, 9.6, 4.8, 389, 'NEVO-online 2025/9.0', 'Brood', 38, 1.6, 73, 1.42, 0, 0, 0, 0),
	('74d86cf6-3d50-4fa7-94e9-e25825ce38b1', 2708, 'Sla rode rauw', 'g', 18, 2.3, 0.5, 1.3, 0.2, 0.9, 25, 'NEVO-online 2025/9.0', 'Groente', 33, 1.2, 12, 0.2, 0, 4, 0, 0),
	('b5bee61e-a2e6-4979-96c6-d59b69733110', 2710, 'Kool rode m appeltjes blik/glas', 'g', 58, 11.9, 10.2, 0.8, 0.3, 2.2, 200, 'NEVO-online 2025/9.0', 'Groente', 35, 0.3, 10, 0.14, 0, 32, 0, 0),
	('aeb46f0e-7542-4d70-a30b-f4bd3040fd13', 2711, 'Margarineproduct Albert Heijn Balans', 'g', 405, 0, 0, 0, 45, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('6b7195eb-4170-4e95-810d-49176361720b', 2712, 'Margarineproduct vloeibaar <60% vet <17 g verz vetz ongezouten', 'g', 507, 0.3, 0.3, 0.3, 56, 0.5, 12, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('a3e13fe6-a46b-4925-8ae4-1caa0f36a3cb', 2713, 'Margarineproduct vloeibaar <60% vet <17 g verz vetz gezouten', 'g', 507, 0.3, 0.3, 0.3, 56, 0.5, 600, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('f3d7d3a0-68f9-4bee-97de-7acd7d057da0', 2714, 'Biscuit meergranen- Liga Evergreen crunchy', 'g', 395, 59.7, 27, 6.6, 12.3, 9.5, 250, 'NEVO-online 2025/9.0', 'Gebak en koek', 76, 8.8, 66, 0.2, 0, 0, 0.02, 0),
	('7973f55d-cab7-4e6a-a414-1b56f81eac1d', 2715, 'Meringue', 'g', 382, 95, 95, 0.5, 0, 0, 8, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 1, 0.1, 2, 0.01, 0, 0, 0, 0),
	('bb12d848-9faa-45f4-a03a-2347f6201ff8', 2721, 'Donut m glazuur', 'g', 358, 40.8, 13.2, 5.4, 19, 1, 252, 'NEVO-online 2025/9.0', 'Gebak en koek', 68, 1.1, 19, 0.54, 0.7, 0, 0, 0),
	('50290e91-c843-4a3d-803e-ebfd16d46876', 2722, 'Wafel Luikse m chocolade', 'g', 457, 55.8, 31.1, 5.8, 22.9, 2.3, 236, 'NEVO-online 2025/9.0', 'Gebak en koek', 23, 1.1, 19, 0.58, 2, 0, 0.01, 0),
	('dd88533d-bc4a-4d6c-b490-93a00adff604', 2724, 'IJsthee m suiker 4-<5 g KH', 'g', 18, 4.5, 4.5, 0, 0, 0, 10, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 2, 0, 0, 0, 0, 0, 0, 0),
	('b393b113-ce11-440a-848a-6a009c74117f', 2726, 'Wortel bospeen rauw', 'g', 31, 5, 4.8, 0.9, 0.3, 2.5, 23, 'NEVO-online 2025/9.0', 'Groente', 23, 0.3, 7, 0.28, 0, 4, 0, 0),
	('2348aa9f-b437-4441-a6aa-a75de65c432c', 2727, 'Wortel bospeen gekookt', 'g', 30, 4.8, 4.7, 0.8, 0.2, 2.7, 19, 'NEVO-online 2025/9.0', 'Groente', 25, 0.2, 7, 0.3, 0, 3, 0, 0),
	('9600b6d9-6f7d-4f94-b2f0-2bf2d72305a2', 2728, 'Wortel winterpeen rauw', 'g', 34, 5.7, 3.1, 0.6, 0.3, 3.3, 36, 'NEVO-online 2025/9.0', 'Groente', 31, 0.2, 7, 0.16, 0, 3, 0, 0),
	('8fe394e7-0efb-4e63-a5e9-e11511af3325', 2729, 'Wortel winterpeen gekookt', 'g', 34, 5.6, 5, 0.6, 0.3, 3.1, 32, 'NEVO-online 2025/9.0', 'Groente', 32, 0.2, 7, 0.17, 0, 2, 0, 0),
	('9ea3a655-9c05-485f-a295-7bafccd865cc', 2730, 'Tomaat tros- rauw', 'g', 22, 3, 2.8, 0.7, 0.5, 1.2, 1, 'NEVO-online 2025/9.0', 'Groente', 8, 0.2, 8, 0.1, 0, 16, 0, 0),
	('7dc567be-ddf5-432c-a567-a2def6028cb6', 2731, 'Tomaat kers- rauw', 'g', 30, 3.9, 4, 0.9, 0.8, 1.9, 3, 'NEVO-online 2025/9.0', 'Groente', 7, 0.4, 11, 0.12, 0, 24, 0, 0),
	('16434995-6cff-4f89-8606-9f31618660b7', 2732, 'Tomaat vlees- rauw', 'g', 19, 2.3, 2.4, 0.6, 0.5, 1.3, 2, 'NEVO-online 2025/9.0', 'Groente', 9, 0.7, 7, 0.27, 0, 15, 0, 0),
	('3be72dda-6307-4a1b-b906-4d690095d4bb', 2733, 'Tomaat vlees- gekookt', 'g', 22, 2.9, 3, 0.7, 0.5, 1.3, 1, 'NEVO-online 2025/9.0', 'Groente', 10, 0.6, 8, 0.27, 0, 18, 0, 0),
	('452ba7c8-e42f-44d7-ad87-c8fcd35d4163', 2734, 'Tomaat rauw gem', 'g', 25, 3.4, 3.4, 0.8, 0.6, 1.6, 2, 'NEVO-online 2025/9.0', 'Groente', 8, 0.3, 9, 0.13, 0, 20, 0, 0),
	('df21432e-2d24-4bb2-bb22-5bd57f386415', 2735, 'Tomaat gekookt gem', 'g', 23, 2.9, 2.8, 0.7, 0.7, 1.3, 2, 'NEVO-online 2025/9.0', 'Groente', 9, 0.6, 8, 0.21, 0, 14, 0, 0),
	('22873273-d7c5-4a2c-964d-6915e90e7d82', 2736, 'Sla rucola rauw', 'g', 22, 0, 0, 3.6, 0.4, 1.9, 33, 'NEVO-online 2025/9.0', 'Groente', 271, 2.6, 41, 0.49, 0, 2, 0, 0),
	('2d14c4cb-e761-4545-a79c-44b465e2b9fb', 2737, 'Ui sla- rauw', 'g', 31, 4.2, 4.1, 1.5, 0.4, 2.4, 6, 'NEVO-online 2025/9.0', 'Groente', 91, 0.8, 14, 0.35, 0, 8, 0, 0),
	('9f945967-0b52-4812-8213-f9b7ec188d9a', 2738, 'Ui sla- gekookt', 'g', 26, 3.5, 2.1, 1.2, 0.3, 2.3, 27, 'NEVO-online 2025/9.0', 'Groente', 50, 0.8, 13, 0.74, 0, 9, 0, 0),
	('9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 2739, 'Komkommer m schil rauw', 'g', 13, 1.3, 1.3, 0.7, 0.4, 0.6, 2, 'NEVO-online 2025/9.0', 'Groente', 20, 1.1, 11, 0.63, 0, 4, 0, 0),
	('c187453c-4ec0-4108-a04e-469f2f8dca1c', 2740, 'Paprika gele rauw', 'g', 25, 3.9, 3.9, 0.7, 0.2, 2.5, 1, 'NEVO-online 2025/9.0', 'Groente', 8, 0.4, 11, 0.25, 0, 114, 0, 0),
	('e527fa43-cdf3-413c-96ac-043df4ffe3ff', 2741, 'Paprika gele gekookt', 'g', 27, 4.6, 4.6, 0.8, 0.1, 2.2, 1, 'NEVO-online 2025/9.0', 'Groente', 8, 0.4, 11, 0.05, 0, 111, 0, 0),
	('2df4c6f5-5615-4612-adc4-0f3795f9d8f6', 2742, 'Paprika rauw gem', 'g', 25, 4.2, 4.2, 0.8, 0.1, 1.9, 1, 'NEVO-online 2025/9.0', 'Groente', 7, 0.4, 12, 0.3, 0, 140, 0, 0),
	('5fd42075-f8c0-4e57-b9bf-ba2ca4769b81', 2743, 'Paprika gekookt gem', 'g', 27, 4.8, 4.1, 0.9, 0.1, 1.8, 2, 'NEVO-online 2025/9.0', 'Groente', 9, 0.4, 10, 0.23, 0, 114, 0, 0),
	('b1184469-7695-47e5-90c3-571b6b0e8d4a', 2744, 'Aardappelen Nicola z schil gekookt', 'g', 80, 16.6, 0.6, 1.7, 0.4, 1.7, 5, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.4, 19, 0.24, 0, 15, 0, 0),
	('f43d2919-8d1f-421d-a62f-940b0df600bb', 2745, 'Aardappelen Eigenheimer z schil gekookt', 'g', 75, 15.7, 0, 1.8, 0.2, 1.8, 3, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 7, 0.3, 18, 0.27, 0, 7, 0, 0),
	('7e0c62cd-4025-4c3a-a14b-ad3c2432159d', 2746, 'Aardappelen Red Baron z schil gekookt', 'g', 91, 19.1, 0.3, 1.8, 0.5, 1.3, 6, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 14, 0.9, 18, 0.43, 0, 7, 0, 0),
	('2d71fa40-192c-427c-a212-3d78d4ef6a97', 2747, 'Aardappelen kruimig z schil gekookt gem', 'g', 81, 17, 0, 2, 0.2, 1.8, 3, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 7, 0.4, 21, 0.33, 0, 7, 0, 0),
	('7fa8698e-8e6b-4b44-9068-9efc4fec27e7', 2748, 'Peer m schil', 'g', 55, 11.7, 9.5, 0.2, 0.3, 2.2, 1, 'NEVO-online 2025/9.0', 'Fruit', 6, 0.2, 7, 0.17, 0, 3, 0, 0),
	('0216e404-97e3-4aab-b7c8-8a403fcde1b7', 2749, 'Druiven blauwe m schil', 'g', 75, 16.8, 16.8, 0.6, 0.1, 2.1, 5, 'NEVO-online 2025/9.0', 'Fruit', 21, 0.2, 10, 0.12, 0, 2, 0, 0),
	('4a1b3f73-e083-415b-bc27-d07536ae566f', 2750, 'Druiven witte m schil', 'g', 76, 16.9, 15.6, 0.5, 0.4, 1.4, 1, 'NEVO-online 2025/9.0', 'Fruit', 13, 0.3, 8, 0.29, 0, 1, 0, 0),
	('79aab67e-4583-417b-9d99-ad9f397d69dc', 2751, 'Appel Elstar m schil', 'g', 55, 12, 10.2, 0.3, 0.2, 1.9, 1, 'NEVO-online 2025/9.0', 'Fruit', 5, 0.1, 5, 0.14, 0, 5, 0, 0),
	('f7bec304-f6e9-49f4-939b-babf86edec2a', 2752, 'Appel Elstar z schil', 'g', 55, 12.4, 11.8, 0.2, 0.2, 1.5, 1, 'NEVO-online 2025/9.0', 'Fruit', 4, 0.1, 4, 0.06, 0, 3, 0, 0),
	('fa584bd3-16ec-4b78-a662-95bc5d976635', 2753, 'Appel Jonagold m schil', 'g', 55, 12.1, 10.5, 0.2, 0.2, 2, 1, 'NEVO-online 2025/9.0', 'Fruit', 4, 0.1, 5, 0.03, 0, 6, 0, 0),
	('d119fed1-ff29-4d4f-ac27-20042a3bbe0a', 2754, 'Appel Jonagold z schil', 'g', 52, 11.6, 10.5, 0.2, 0.1, 1.7, 0, 'NEVO-online 2025/9.0', 'Fruit', 3, 0.2, 4, 0.1, 0, 4, 0, 0),
	('339e8fd3-114d-47b4-88c6-d8f6b6086e01', 2755, 'Sap sinaasappel- vers geperst', 'g', 44, 9.1, 8.9, 0.6, 0.1, 0.3, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 11, 0.1, 12, 0.07, 0, 48, 0, 0),
	('c3082c45-434c-47e0-a5e6-f5dbb79d7546', 2756, 'Kaas Goudse 48+ jong', 'g', 364, 0, 0, 22.8, 29.6, 0, 558, 'NEVO-online 2025/9.0', 'Kaas', 792, 0.2, 32, 3.48, 0.3, 0, 0, 0),
	('7f0acb28-a420-4a73-9937-6824df085a61', 2757, 'Kaas Goudse 48+ jong belegen', 'g', 370, 0, 0, 22.7, 29.9, 0, 646, 'NEVO-online 2025/9.0', 'Kaas', 811, 0.2, 33, 3.5, 0.3, 0, 0, 0),
	('058705bf-8cce-4977-988b-1eb9851cf015', 2758, 'Kaas Goudse 48+ belegen', 'g', 377, 0, 0, 22.5, 30.8, 0, 718, 'NEVO-online 2025/9.0', 'Kaas', 826, 0.1, 32, 3.3, 0.3, 0, 0, 0),
	('0315d12c-efad-4c85-b38c-4537c13718ba', 2759, 'Kaas Goudse 48+ oud', 'g', 414, 0.1, 0.1, 24.6, 33.7, 0, 834, 'NEVO-online 2025/9.0', 'Kaas', 871, 0.2, 38, 3.7, 0.3, 0, 0, 0),
	('e17f7473-101e-4f31-85e2-d34a76d09457', 2760, 'Melk chocolade- automaat', 'g', 66, 10.8, 9.7, 3, 1, 1.2, 49, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 95, 0.7, 17, 0.44, 0, 0, 0, 0),
	('c6136212-1655-4cb6-98f0-a17d57e51808', 2761, 'Koek gevulde m roomboter', 'g', 415, 58.7, 32.3, 7.1, 16.5, 1.9, 158, 'NEVO-online 2025/9.0', 'Gebak en koek', 49, 0.9, 33, 0.57, 0, 0, 0.02, 0),
	('510a245b-995f-44c1-b268-6507ebf4ac74', 2762, 'Koek gevulde z roomboter', 'g', 406, 61.7, 30.9, 5.2, 14.9, 2.1, 138, 'NEVO-online 2025/9.0', 'Gebak en koek', 23, 0.8, 19, 0.49, 0.2, 0, 0, 0),
	('d1681221-b521-462d-979b-2f01170f2fff', 2763, 'Speculaas m roomboter', 'g', 484, 65.2, 29, 5.5, 21.7, 3, 460, 'NEVO-online 2025/9.0', 'Gebak en koek', 46, 1.3, 15, 0.57, 0, 0, 0, 0),
	('b19a6eb2-880e-481d-91f2-a0f5b1cf9e42', 2764, 'Speculaas z roomboter', 'g', 467, 65.1, 27.3, 5, 20.1, 3, 339, 'NEVO-online 2025/9.0', 'Gebak en koek', 33, 1.2, 13, 0.43, 0.2, 0, 0, 0),
	('12b6de9d-ef6d-4825-9739-29cc28b130e7', 2765, 'Pangasius bereid in magnetron z toev', 'g', 89, 0, 0, 18.6, 1.6, 0, 241, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 10, 0.1, 22, 0.41, 0.1, 1, 0.25, 0.14),
	('4a9373e3-1783-4b75-9195-0ad775fd12ea', 2766, 'Worst rook- varkens gekookt', 'g', 340, 2.8, 0.3, 14.3, 30.1, 0.7, 864, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 24, 1.1, 14, 1.9, 0.7, 30, 0, 0),
	('2fb7e84e-8b3b-4eda-986b-7f40ea42114a', 2767, 'Worst rook- varkens ambachtelijke slagerij gekookt', 'g', 311, 1, 0.2, 15.2, 27.1, 1.2, 677, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 1.1, 15, 2.1, 0.5, 12, 0.03, 0),
	('a3610bd7-5dc7-4ec1-81df-bc43d16ad412', 2768, 'Worst ossen-', 'g', 166, 1.1, 0.4, 18.6, 9.4, 1.2, 1235, 'NEVO-online 2025/9.0', 'Vleeswaren', 9, 2.2, 19, 4.8, 0.3, 45, 0.02, 0),
	('06eab20c-dfe9-4ee7-afee-30f137b2de2f', 2769, 'Ei kippen- scharrel rauw', 'g', 132, 0.2, 0.2, 12.3, 9.1, 0, 154, 'NEVO-online 2025/9.0', 'Eieren', 58, 2.3, 15, 1.6, 1.1, 0, 0.05, 0),
	('462b9813-3d91-43bb-89d1-e339c2664e98', 2770, 'Ei kippen- scharrel gekookt', 'g', 125, 0, 0, 12.2, 8.5, 0, 150, 'NEVO-online 2025/9.0', 'Eieren', 63, 2.4, 15, 1.6, 1.6, 0, 0.03, 0),
	('d43289cd-2a38-4cbc-a2a7-5bc9a36fd4cc', 2771, 'Ei kippen- biologisch rauw', 'g', 135, 0.2, 0.2, 12.3, 9.5, 0, 143, 'NEVO-online 2025/9.0', 'Eieren', 50, 2, 12, 1.5, 1.7, 0, 0.04, 0.01),
	('cde31b7b-07f3-4151-8fc8-dd407018ea57', 2772, 'Ei kippen- biologisch gekookt', 'g', 136, 0, 0, 12.7, 9.5, 0, 144, 'NEVO-online 2025/9.0', 'Eieren', 62, 2.5, 15, 1.6, 2.3, 0, 0.05, 0.01),
	('1efa9f34-3f28-4521-8ab7-f16876aa7701', 2773, 'Ei kippen- mais rauw', 'g', 129, 0.2, 0.2, 12.2, 8.8, 0, 155, 'NEVO-online 2025/9.0', 'Eieren', 56, 2.1, 14, 1.3, 1, 0, 0.02, 0),
	('ddf5a7a1-6a4a-4357-9c41-b21b0d3ac49f', 2774, 'Ei kippen- mais gekookt', 'g', 148, 0, 0, 13, 10.7, 0, 144, 'NEVO-online 2025/9.0', 'Eieren', 72, 2.7, 16, 1.9, 2.1, 0, 0.04, 0);
INSERT INTO public.nutrition_foods VALUES
	('f81f2176-af57-48ae-bc6d-6517732ce9e1', 2775, 'Biscuit tarwe-/digestive- m chocolade', 'g', 488, 63.8, 28.2, 6.5, 22.2, 3.3, 390, 'NEVO-online 2025/9.0', 'Gebak en koek', 59, 3.1, 48, 0.96, 0, 0, 0.02, 0),
	('02b7a2d6-a350-454b-bbe8-6376dff8b6e5', 2776, 'Vlaai appelkruimel-', 'g', 304, 45.6, 22, 3.9, 11.4, 1.9, 240, 'NEVO-online 2025/9.0', 'Gebak en koek', 20, 0.7, 12, 0.4, 0.5, 7, 0, 0),
	('cb34290e-c954-4faf-bd2d-0e1cbf7ab294', 2777, 'Vlaai wener bodem m bakkersroom', 'g', 295, 33, 20, 4.1, 16, 1.6, 166, 'NEVO-online 2025/9.0', 'Gebak en koek', 58, 0.5, 12, 0.41, 0.2, 0, 0, 0),
	('c321a509-bbf4-4863-8947-4ee688627a8d', 2778, 'Vlaai zachte bodem m bakkersroom', 'g', 253, 30.8, 16.8, 3.5, 12.5, 1.4, 162, 'NEVO-online 2025/9.0', 'Gebak en koek', 59, 0.5, 12, 0.36, 0.2, 1, 0, 0),
	('70b15025-9e17-4eec-88c1-35728420acd2', 2779, 'Pasta witte z ei gekookt', 'g', 146, 28.7, 0.8, 5.2, 0.8, 1.4, 3, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 15, 0.6, 18, 0.6, 0, 0, 0, 0),
	('6cc4fe9f-a704-438a-abfb-54a95706dec3', 2780, 'Pasta witte m ei gekookt', 'g', 124, 23.4, 0.3, 4.7, 0.8, 2.2, 5, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 21, 1.2, 31, 0.9, NULL, 0, 0, 0),
	('ec297287-e8ec-4aa9-87a8-f695c273434a', 2781, 'Pasta witte vers gekookt', 'g', 129, 23.9, 0.2, 4.9, 1.3, 1.3, 3, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 18, 0.6, 15, 0.7, NULL, 0, 0, 0),
	('d6c4138a-525d-45d3-9645-0ad3db2b17a6', 2782, 'Tarwebrood volkoren grof', 'g', 236, 38.9, 1.8, 11.3, 2.4, 6.8, 384, 'NEVO-online 2025/9.0', 'Brood', 36, 2, 65, 1.38, 0, 0, 0, 0),
	('26034e72-15e0-41e2-b7ae-3d74ab0640d6', 2783, 'Meergranenbrood wit m zaden', 'g', 267, 40.4, 2.2, 12.5, 5, 5.4, 412, 'NEVO-online 2025/9.0', 'Brood', 46, 1.7, 52, 1.18, 0, 0, 0, 0),
	('56d732d0-9ec0-48e1-839f-7b851d0c6b35', 2784, 'Meergranenbrood bruin m zaden', 'g', 255, 37.8, 2, 12.2, 4.5, 7.1, 395, 'NEVO-online 2025/9.0', 'Brood', 45, 1.9, 61, 1.29, 0, 0, 0, 0),
	('a2af7ecd-447e-4281-8a52-038a0fd72237', 2785, 'Tarwemaisbrood wit', 'g', 261, 44.9, 2.6, 10.8, 3.2, 4.5, 433, 'NEVO-online 2025/9.0', 'Brood', 33, 1.2, 34, 0.89, 0, 0, 0, 0),
	('6e717308-5bc3-4c17-8f07-ccfc03a4ea20', 2786, 'Tarwebrood gem v bruin en volkoren m pompoenpitten', 'g', 254, 33.3, 1.9, 13.9, 5.5, 7.8, 349, 'NEVO-online 2025/9.0', 'Brood', 36, 2.3, 83, 1.52, 0, 0, 0, 0),
	('35ea1ca0-426a-4373-8b6d-891b0ee639b2', 2787, 'Tarwebrood gem v bruin en volkoren m zonnebloempitten', 'g', 272, 36, 2.4, 12.5, 6.7, 8.7, 355, 'NEVO-online 2025/9.0', 'Brood', 46, 1.7, 63, 1.34, 0, 0, 0, 0),
	('09294d52-5786-45dc-8432-5b48da3e3523', 2788, 'Tarwedesembrood volkoren', 'g', 235, 40.5, 2.1, 9.3, 2.6, 6, 378, 'NEVO-online 2025/9.0', 'Brood', 32, 2.5, 62, 1.47, 0, 0, 0, 0),
	('3b266299-a737-4b93-97a8-d55202355257', 2789, 'Tarwe ciabatta wit ongevuld', 'g', 255, 48.9, 2.2, 9.1, 1.8, 3.3, 408, 'NEVO-online 2025/9.0', 'Brood', 30, 0.8, 19, 0.61, 0, 0, 0, 0),
	('d7c3f40c-27b7-494e-9d28-b4253567d8d0', 2790, 'Tarwebrood wit pita', 'g', 245, 50.1, 2.4, 8.6, 0.7, 2.1, 414, 'NEVO-online 2025/9.0', 'Brood', 15, 1.3, 16, 0.5, 0, 0, 0, 0),
	('2b4e3d7d-0716-4b3a-9a5f-4c40dc2165aa', 2791, 'Stol m spijs z noten', 'g', 276, 53.8, 24.9, 7.7, 2.4, 3.9, 354, 'NEVO-online 2025/9.0', 'Brood', 82, 1.9, 27, 0.62, 0, 0, 0, 0),
	('bad78d0c-d08c-47b4-a2c2-acc09b99a87b', 2792, 'Stol m spijs m noten', 'g', 288, 51.9, 25.2, 7.8, 4.3, 4.8, 324, 'NEVO-online 2025/9.0', 'Brood', 79, 2.1, 32, 0.71, 0, 0, 0, 0),
	('bc499741-23bd-45f8-abb5-9f5b198f52c0', 2793, 'Tarwestokbrood wit', 'g', 270, 53.6, 2.9, 9.7, 1.2, 2.8, 437, 'NEVO-online 2025/9.0', 'Brood', 26, 0.8, 20, 0.61, 0, 0, 0, 0),
	('24cb8e88-1a60-4a8d-ad1c-a95cf9d79c09', 2794, 'Tarwestokbrood bruin', 'g', 258, 49.8, 3, 9.8, 1.4, 3.8, 406, 'NEVO-online 2025/9.0', 'Brood', 59, 1.3, 31, 0.82, 0, 0, 0, 0),
	('18659477-d952-4ba3-8860-0b448df645ac', 2795, 'Tarwebroodje wit hard', 'g', 279, 54.9, 3, 9.9, 1.5, 2.9, 411, 'NEVO-online 2025/9.0', 'Brood', 45, 0.9, 23, 0.71, 0, 0, 0, 0),
	('e4e3ff3d-bcd0-46ae-9ed2-dca215d879b3', 2796, 'Tarwebroodje bruin hard', 'g', 278, 52.8, 2.8, 11, 1.5, 4.9, 390, 'NEVO-online 2025/9.0', 'Brood', 53, 1.4, 40, 0.94, 0, 0, 0, 0),
	('18a9a741-26ba-4124-a37f-f80fa482516e', 2797, 'Tarwebroodje bruin zacht', 'g', 258, 42.3, 3.2, 11, 3.8, 5.3, 375, 'NEVO-online 2025/9.0', 'Brood', 40, 1.4, 45, 1.11, 0, 0, 0, 0),
	('4e426375-736d-4673-9d40-2e2271602325', 2798, 'Tarwebroodje volkoren zacht', 'g', 247, 39.5, 3.3, 11.3, 3.2, 7.3, 359, 'NEVO-online 2025/9.0', 'Brood', 54, 2.2, 68, 1.44, 0, 0, 0, 0),
	('45211ac1-c6b7-424c-b759-8fcc3c406f4b', 2799, 'Meergranenbroodje bruin hard', 'g', 294, 43.8, 2.5, 12.9, 5.9, 6.8, 381, 'NEVO-online 2025/9.0', 'Brood', 57, 1.7, 60, 1.31, 0, 0, 0, 0),
	('553a5ce3-1d02-4684-958a-1e3ea834e408', 2800, 'Meergranenbroodje bruin zacht', 'g', 283, 38.7, 3.1, 13.4, 6.8, 6.4, 381, 'NEVO-online 2025/9.0', 'Brood', 69, 1.5, 54, 1.28, 0, 0, 0, 0),
	('26c2f262-ee65-46e7-9e8c-d868d8bb24d3', 2801, 'Croissant roomboter-', 'g', 414, 42.2, 5.5, 9.5, 22.5, 2.7, 423, 'NEVO-online 2025/9.0', 'Brood', 27, 0.7, 18, 0.68, 0, 0, 0, 0),
	('9e126c63-c4c8-4f86-81d2-262be60d3a81', 2802, 'Croissant z roomboter', 'g', 392, 42.3, 3.4, 9.8, 19.9, 2.2, 511, 'NEVO-online 2025/9.0', 'Brood', 21, 0.7, 17, 0.7, 0, 0, 0, 0),
	('88f8356c-1a46-4c38-9528-2ae97187670b', 2803, 'Tarwekrentenbol wit', 'g', 268, 51.1, 31.8, 8.4, 2.5, 4.1, 333, 'NEVO-online 2025/9.0', 'Brood', 54, 1.6, 28, 0.64, 0, 0, 0, 0),
	('9428398f-0850-4644-ac53-49fee70de2b4', 2804, 'Tarwemueslibol bruin/volkoren', 'g', 290, 43.9, 22.7, 10.7, 6.6, 5.8, 337, 'NEVO-online 2025/9.0', 'Brood', 63, 2.3, 58, 1.18, 0, 0, 0, 0),
	('ab2ef07b-e70d-40a3-b152-04c1461424ca', 2805, 'Maanzaad', 'g', 455, 2.4, 2.3, 19.2, 35.6, 24, 14, 'NEVO-online 2025/9.0', 'Noten en zaden', 1740, 9.4, 449, 4.94, 0, 0, 0, 0),
	('ac54336b-af31-4550-afab-8fb4047572aa', 2806, 'Pompoenpitten', 'g', 574, 2.7, 1.6, 30.3, 47.2, 8.5, 10, 'NEVO-online 2025/9.0', 'Noten en zaden', 42, 8, 535, 7.94, 0, 0, 0, 0),
	('cd4c1f61-3a38-4313-9351-706d3fb6da06', 2807, 'Spijs gem', 'g', 434, 44.8, 44.8, 9.9, 22, 8.6, 32, 'NEVO-online 2025/9.0', 'Diversen', 86, 1.3, 110, 1.08, NULL, NULL, 0, 0),
	('4416ff22-4e0c-4559-8126-ce828eb01443', 2809, 'Muesli m fruit/naturel', 'g', 341, 56.6, 7.3, 10.7, 5.3, 12, 2, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 39, 3.1, 110, 2.1, 0, 0, 0, 0.02),
	('7c9560e0-9367-4be2-b81b-3992739da848', 2810, 'Wafel stroop- z roomboter', 'g', 483, 71.5, 37.9, 3.6, 19.9, 1.9, 266, 'NEVO-online 2025/9.0', 'Gebak en koek', 18, 0.4, 10, 0.29, 0.6, 0, 0, 0),
	('bcdeba2c-4c8d-4122-abc6-c790521163de', 2811, 'Tarwebrood volkoren fijn', 'g', 233, 39.2, 1.9, 10.9, 2.2, 6.6, 382, 'NEVO-online 2025/9.0', 'Brood', 33, 2, 67, 1.44, 0, 0, 0, 0),
	('50477405-c05f-426b-b06d-09dbf1bc7d8e', 2812, 'Tarwekrenten/rozijnenbrood wit gem m spijs', 'g', 303, 51.3, 27.9, 8.2, 6.2, 4.6, 291, 'NEVO-online 2025/9.0', 'Brood', 59, 1.5, 43, 0.71, 0, 0, 0, 0),
	('63f4907b-025e-4233-8993-266a23694e2a', 2813, 'Tarwekrenten/rozijnenbrood wit gem', 'g', 272, 52.8, 24.1, 7.8, 2.6, 3.6, 350, 'NEVO-online 2025/9.0', 'Brood', 53, 1.6, 27, 0.62, 0, 0, 0, 0),
	('ab2e7dd2-4271-4489-ad72-f87eb8a0dba2', 2814, 'Tarwerozijnenbrood wit m spijs', 'g', 303, 50.8, 28.1, 8.1, 6.4, 4.8, 288, 'NEVO-online 2025/9.0', 'Brood', 56, 1.6, 43, 0.7, 0, 0, 0, 0),
	('103d5115-3e9a-4704-94c1-3d6e4e843337', 2815, 'Tarwebrood bruin tijger-', 'g', 243, 44.2, 2, 9.9, 1.9, 4.9, 413, 'NEVO-online 2025/9.0', 'Brood', 31, 1.4, 43, 1, 0, 0, 0, 0),
	('a3b4bf67-3cb9-4f42-9918-edebb74ab8f6', 2816, 'Tarwebrood wit tijger-', 'g', 252, 48.7, 2.2, 9, 1.7, 2.7, 409, 'NEVO-online 2025/9.0', 'Brood', 31, 0.8, 19, 0.63, 0, 0, 0, 0),
	('74e3e874-8c86-4fc2-a1a9-495ce0940da3', 2817, 'Stol m spijs gem m en z noten', 'g', 282, 52.8, 25.1, 7.7, 3.4, 4.4, 339, 'NEVO-online 2025/9.0', 'Brood', 80, 2, 30, 0.67, 0, 0, 0, 0),
	('7c25b924-1399-44d9-b66c-121d09302da8', 2818, 'Croissant gem', 'g', 403, 42.2, 4.5, 9.6, 21.2, 2.5, 467, 'NEVO-online 2025/9.0', 'Brood', 24, 0.7, 17, 0.69, 0, 0, 0, 0),
	('2e6001ef-1560-4e1b-8c91-fd6ead39eeb9', 2819, 'Zout z toegevoegd jodium', 'g', 0, 0, 0, 0, 0, 0, 39000, 'NEVO-online 2025/9.0', 'Diversen', 2, 0.1, 0, 0.1, 0, 0, 0, 0),
	('9f7093b5-8e2c-4a28-b7d2-666f03ac4b5a', 2820, 'Wafel stroop- m roomboter', 'g', 462, 69, 35.5, 3.9, 18.6, 1.3, 245, 'NEVO-online 2025/9.0', 'Gebak en koek', 15, 0.6, 10, 0.33, 0, 0, 0, 0),
	('ce5c2a57-0fdd-4e00-9328-bf9b0ac0d5d4', 2821, 'Tarwebrood bruin m pompoenpitten', 'g', 278, 38.4, 1.9, 12.3, 7.2, 5.4, 359, 'NEVO-online 2025/9.0', 'Brood', 31, 2.2, 102, 1.82, 0, 0, 0, 0),
	('7828e650-4c72-4cc0-8bd1-1da80e9a35e4', 2822, 'Yoghurt vruchten-/vanille- magere m zoetstof', 'g', 35, 4.8, 3.5, 3.4, 0, 0.1, 53, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 0.1, 12, 0.52, 0, 1, 0, 0),
	('f99583bd-c475-405e-94cd-fbde6315747a', 2823, 'Yoghurt stracciatella- volle', 'g', 128, 15.4, 14.8, 3.3, 5.6, 0.3, 60, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 121, 0.1, 12, 0.44, 0, 0, 0, 0),
	('a547973c-8aff-4aa5-a3c9-bd2a8de90127', 2826, 'Kipschnitzel sate gepaneerd rauw', 'g', 206, 16.5, 2.8, 14.8, 8.5, 2.4, 203, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 15, 0.9, 38, 0.79, 0.1, 0, 0, 0.01),
	('c95ccc6a-f7a1-4cd9-90ee-d6ba01ff0215', 2827, 'Varkensschnitzel sate gepaneerd rauw', 'g', 231, 16.7, 2.9, 13.3, 11.8, 2.5, 258, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 19, 1.1, 36, 1.71, 0.2, 1, 0, 0.01),
	('c19276b2-1164-4b62-908e-7e8e329a479b', 2828, 'Likeur m room 15-25 vol% alc', 'g', 294, 22.7, 18.2, 2.7, 11.8, 0, 73, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 27, 0, 3, 0.06, 0, 0, 0.01, 0),
	('8bdca55f-ab09-4b99-b540-47bb4d0613f6', 2829, 'Chocoladereep gevuld Kinder', 'g', 567, 52.1, 47.5, 8.9, 35.7, 1.3, 121, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 273, 1.2, 38, 1.05, 0, 2, 0, 0),
	('5b647caa-5446-48b4-b645-636a4bd0a93a', 2830, 'Croissant kaas-', 'g', 401, 39, 4.1, 10.6, 21.9, 2.3, 482, 'NEVO-online 2025/9.0', 'Brood', 84, 0.7, 19, 0.9, 0, 0, 0, 0),
	('044741b6-bfdd-4d29-a4c0-bd8882d32da7', 2831, 'Siroop vruchtenlimonade- m suiker en zoetstof 10-15 g KH', 'g', 47, 11.7, 11.7, 0, 0, 0, 48, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0, 4, 0.05, 0, 0, 0, 0),
	('593bc702-f601-4159-ab06-0580cd3346e9', 2832, 'Cake chocolade- m roomboter', 'g', 400, 46.7, 30.9, 5.8, 20.6, 2.3, 407, 'NEVO-online 2025/9.0', 'Gebak en koek', 37, 1.1, 30, 0.77, 0.4, 0, 0.02, 0),
	('8ba4a77d-6613-4ad8-ab6c-9e21eed3f83e', 2834, 'Aardappelbolletjes/-wafeltjes ed diepvries onbereid', 'g', 175, 24.3, 0.8, 2.6, 6.9, 2.8, 347, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.5, 18, 0.31, 0, 8, 0, 0),
	('b2c8fc8e-f311-4901-a6a0-455ddd271bcd', 2835, 'IJskoffie', 'g', 72, 10.2, 9.1, 2.7, 2.3, 0, 47, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 93, 0.1, 10, 0.33, 0, 0, 0, 0),
	('3525a061-58a6-41f7-8a7c-2a3d836a0380', 2836, 'Worst grill- m kaas', 'g', 331, 2.7, 0.5, 14.3, 29.3, 0, 1100, 'NEVO-online 2025/9.0', 'Vleeswaren', 122, 1.2, 15, 1.93, 0.7, 33, 0.02, 0),
	('4ea63d9a-9855-495b-a8bc-b44f6b5c22d0', 2837, 'Bier m vruchtensmaak', 'g', 52, 6, 2.4, 0.3, 0, 0.5, 3, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 4, 0.1, 8, 0.03, 0, 2, 0, 0),
	('7ac9bc6d-60ab-4f47-a9df-3ca3a295e5ff', 2840, 'Kool rode m appeltjes huishoudelijk bereid', 'g', 52, 8.3, 8, 0.9, 1.1, 2.4, 6, 'NEVO-online 2025/9.0', 'Groente', 28, 0.3, 8, 0.13, 0, 26, 0, 0),
	('9e7abd0f-4022-4325-b5c0-915d4880a131', 2843, 'Ananas op eigen sap blik/glas', 'g', 59, 13.9, 13.1, 0.4, 0.1, 0.8, 4, 'NEVO-online 2025/9.0', 'Fruit', 12, 0.2, 15, 0.2, 0, 35, 0, 0),
	('a65eb8ac-cad8-418d-8120-32a1ee66d503', 2844, 'Noten macadamia- ongezouten', 'g', 753, 5.4, 4.1, 7.8, 76.1, 8, 4, 'NEVO-online 2025/9.0', 'Noten en zaden', 70, 2.7, 118, 1.29, 0, 1, 0, 0),
	('1a454fec-7e6b-4969-b17e-66bc455f4a6a', 2846, 'Vruchtendrank m zuivel Taksi m zoetstof', 'g', 10, 2.3, 2.3, 0.1, 0, 0.1, 16, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 14, 0, 3, 0.02, 0, 12, 0, 0),
	('ef56f8c0-133f-4e68-9836-69a674ed1939', 2851, 'Sap vruchten- mild multifruit m vit C', 'g', 49, 11.7, 11.6, 0.4, 0.1, 0.2, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 11, 0, 10, NULL, 0, 17, 0, 0),
	('02b9b8b1-18a0-47cd-91a3-373fd6be78a2', 2858, 'Drink soja- light verrijkt m calcium en vitamines Alpro', 'g', 29, 1.8, 1.7, 2.1, 1.2, 1.1, 44, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 120, 0.2, 26, 0.15, 0.8, 0, 0, 0),
	('a33b1487-f046-47bf-8347-7237c325ed14', 2859, 'Pannenkoek kaas- huishoudelijk bereid', 'g', 239, 23.3, 3.9, 11.3, 10.8, 1.3, 309, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 250, 0.6, 23, 1.29, 0.5, 0, 0, NULL),
	('301e74ba-3127-4061-849a-6bdc82f0cd97', 2862, 'Pannenkoek appel-rozijnen- huishoudelijk bereid', 'g', 200, 30.2, 9.1, 7.3, 5, 1.7, 188, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 94, 0.8, 20, 0.65, 0.4, 1, 0, 0),
	('9fb03b61-cb61-4775-b25b-2cf93e35ce2d', 2863, 'Taart appel-noten', 'g', 346, 39.3, 22.9, 5.5, 18.1, 2.1, 118, 'NEVO-online 2025/9.0', 'Gebak en koek', 33, 1.1, 32, 0.64, 0.5, 1, 0.01, 0),
	('eb507dfb-7b5a-41d6-bf75-3297db94bc14', 2864, 'Koek stroop- m chocolade', 'g', 497, 63.7, 43.4, 4, 24.9, 1.4, 200, 'NEVO-online 2025/9.0', 'Gebak en koek', 78, 1.6, 27, 0.64, 0.2, 1, NULL, 0),
	('629312b7-6883-4d40-b78c-7bafa339fd1a', 2868, 'Pannenkoek huishoudelijk bereid m vloeibare margarine', 'g', 176, 24.2, 2.8, 5.7, 5.9, 1.6, 159, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 95, 0.5, 18, 0.55, 0.5, 0, NULL, NULL),
	('da72c447-588e-4179-be2c-52078f061bfe', 2869, 'Beignet appel-', 'g', 265, 17, 7.4, 2.5, 20.4, 1.3, 93, 'NEVO-online 2025/9.0', 'Gebak en koek', 28, 0.3, 7, 0.24, 0, 1, 0, 0),
	('4aac7198-7c09-493d-8f3b-0a65a68bbe1d', 2870, 'Candybar Lion', 'g', 493, 65.5, 53.1, 5.5, 22.9, 1.3, 130, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 109, 1.3, 24, 0.53, 0, 1, 0, 0),
	('e4beee7f-5696-4764-8e28-0f8ace65f0dd', 2873, 'Dessertsaus karamel-', 'g', 302, 63.9, 56.7, 2.7, 3.9, 0, 37, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 128, 0, 11, 0.9, 0, 0, 0, 0),
	('f6363a0c-7db1-4610-8cfa-76ae55a84878', 2875, 'Fruitsnack Knijpfruit/Slurpfruit', 'g', 63, 14.2, 12.8, 0.4, 0.2, 1.6, 17, 'NEVO-online 2025/9.0', 'Fruit', 4, 0.1, 4, 0.06, 0, 3, 0, 0),
	('46af8f6f-afa5-45fc-a7c3-a83e1927a177', 2876, 'Brioche', 'g', 338, 50, 25, 8.5, 11, 2.5, 410, 'NEVO-online 2025/9.0', 'Brood', 33, 0.9, 17, 0.6, 0, 0, 0, 0),
	('e8aa1077-26cf-4b68-9132-45438c699e19', 2877, 'Ontbijtproduct Weetabix original', 'g', 362, 69, 4.2, 12, 2, 10, 112, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 28, 12, 88, 1.9, 0, 1, 0, 0),
	('4bd72bb0-13a2-4ede-be68-444db2a0a0d8', 2880, 'Koffie wiener melange oplos poeder', 'g', 427, 65.9, 44.3, 9.4, 13.6, 1.8, 300, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 361, 0.9, 93, 1.4, 0, 3, 0, 0),
	('4473cf24-eaff-46be-9f05-97039f3414ee', 2881, 'Koffie wiener melange oplos bereid', 'g', 46, 7.1, 4.7, 1, 1.5, 0.2, 34, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 43, 0.1, 10, 0.15, 0, 0, 0, 0),
	('166716ee-edcf-4b5d-929b-601a2b67eeb0', 2883, 'Runderrookvlees licht gezouten', 'g', 116, 0.7, 0.6, 22.8, 2.5, 0, 1203, 'NEVO-online 2025/9.0', 'Vleeswaren', 5, 2.5, 21, 3.3, 0.1, 0, 0, 0),
	('59b9c672-54d1-41f9-ab58-b3c31678f61a', 2884, 'Suiker riet-', 'g', 400, 99.5, 99.5, 0.5, 0, 0, 5, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 29, 0.9, 9, 0.1, 0, 0, 0, 0),
	('982949fc-c212-4ead-a052-ff7ee81c46df', 2885, 'Cranberrycompote gezoet', 'g', 172, 41.9, 36.9, 0.4, 0.1, 1.2, 13, 'NEVO-online 2025/9.0', 'Fruit', 8, 0.5, 4, 0.09, 0, 7, 0, 0),
	('c15fe49b-5791-4f34-a59e-0033c0398a0c', 2886, 'Noten cashew- gezouten', 'g', 615, 20.8, 5, 21.2, 48.9, 3.8, 272, 'NEVO-online 2025/9.0', 'Noten en zaden', 44, 6.7, 269, 5.8, 0, 0, 0, 0),
	('9334fcd9-7295-4e78-8425-2f780781460b', 2887, 'Noten amandelen z vliesje gezouten', 'g', 631, 7.1, 3.8, 21.7, 55.8, 7, 435, 'NEVO-online 2025/9.0', 'Noten en zaden', 283, 3.3, 305, 3.1, 0, 0, 0, 0),
	('d94421ab-eb7a-41a1-b95c-6b2db10cc289', 2888, 'Plantaardig alternatief voor yoghurt obv soja m suiker verrijkt m calcium en vitamines', 'g', 47, 3.6, 2.6, 3.7, 1.9, 0.6, 53, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 140, 0.5, 19, 0.32, 0.8, 0, 0, 0),
	('b1aab78d-48c7-47bd-a32f-c7411d711f97', 2890, 'Cranberry gedroogd gezoet', 'g', 335, 77.6, 64.6, 0.5, 1.4, 5, 5, 'NEVO-online 2025/9.0', 'Fruit', 10, 0.5, 5, 0.11, 0, 0, NULL, NULL),
	('626d7339-e754-4838-9536-e756bb12433f', 2891, 'Koek jode-', 'g', 505, 65.2, 30.6, 4.5, 24.9, 1.2, 348, 'NEVO-online 2025/9.0', 'Gebak en koek', 8, 0.5, 9, 0.24, 2.3, 0, 0, 0),
	('88e52a75-2e30-4485-a9a4-64f4b0df596d', 2892, 'Wafel penny-', 'g', 562, 47, 28, 5.8, 38.5, 2, 180, 'NEVO-online 2025/9.0', 'Gebak en koek', 53, 1.5, 21, 0.73, 0, 0, NULL, NULL),
	('f29d770b-7f21-4ccd-8b1b-23cf43816e16', 2893, 'Cake Indische', 'g', 313, 60.8, 32.2, 4.3, 5.7, 0.7, 200, 'NEVO-online 2025/9.0', 'Gebak en koek', 11, 0.6, 10, 0.3, 0.6, 0, 0, 0),
	('24740c74-761e-44e5-b48a-f205c2a43c67', 2894, 'Biscuit digestive-', 'g', 492, 65.4, 17, 6.7, 21.8, 3.6, 437, 'NEVO-online 2025/9.0', 'Gebak en koek', 30, 1.8, 64, 1.35, 0, 0, 0.02, 0),
	('a48893f5-0a15-49ed-a382-a1009d86f458', 2895, 'Halvarineproduct AH omega-3', 'g', 345, 0.8, 0, 0, 38, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0.38, 0.53),
	('76dcee9a-3fc3-4994-ae42-a063244f65a1', 2897, 'Limonade vruchten- Ocean Spray Cranberry classic', 'g', 37, 9.3, 9.3, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0, 0, 12, 0, 0),
	('6e88225c-2c03-4f7c-8660-cb3f7ff0dea8', 2898, 'Paardenrookvlees', 'g', 103, 0.9, 0.9, 21.7, 1.4, 0, 1710, 'NEVO-online 2025/9.0', 'Vleeswaren', 4, 6.1, 20, 2.7, 0.1, 0, 0, 0),
	('4ef2b7ee-ba7b-45d4-aaab-b6a7168a68f3', 2899, 'Balkenbrij', 'g', 165, 14.9, 4.6, 6.4, 8.5, 1.1, 727, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 1.9, 37, 1.21, 0.4, 1, 0, 0),
	('2ca09f43-13c8-4d9b-b4f7-228752a05175', 2900, 'Mais blik/glas', 'g', 91, 14.8, 5.2, 2.9, 1.5, 3.2, 133, 'NEVO-online 2025/9.0', 'Groente', 11, 0.5, 45, 0.4, 0, 7, 0, 0),
	('26a38a42-8615-46f5-9682-c091e95cd58e', 2901, 'Runderbraadworst gebakken', 'g', 228, 0.3, 0.2, 23.8, 14.6, 0.1, 679, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 22, 2.5, 22, 5.24, 1.3, 15, 0, 0),
	('8a108fac-5434-406a-8935-5c5f61985a9c', 2902, 'Runderborstlappen bereid', 'g', 217, 0, 0, 36.8, 7.7, 0, 54, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 10, 3.1, 29, 6.69, 0.4, 0, 0, 0),
	('8064fc79-f2a1-42f9-b5a7-d063adff11db', 2903, 'Vink runder- gebakken', 'g', 223, 0.5, 0.2, 22.4, 14.5, 0, 689, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 19, 2.5, 23, 5.18, 0.9, 4, 0.01, 0),
	('efc2963c-7ea5-4411-9946-9a6396a91c8e', 2904, 'Runder T-bone steak bereid', 'g', 254, 0, 0, 33.6, 13.3, 0, 86, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 24, 2.8, 31, 5.62, 0.7, 0, 0, 0),
	('83b2b5de-4a5f-43e1-96fb-79959261a496', 2905, 'Runder ribeye steak bereid', 'g', 214, 0, 0, 29.6, 10.6, 0, 63, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 2.6, 28, 6.65, 0.7, 0, 0, 0),
	('318b8e49-f434-481d-8ee6-3b410889b80a', 2906, 'Shoarmavlees varkens- bereid', 'g', 239, 0.6, 0.4, 28.2, 13.8, 0.1, 571, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 31, 1.6, 39, 3.86, 1.3, 1, 0, 0),
	('99ca90b0-cb52-4eaf-beef-536c4c250ebd', 2907, 'Spek rook- mager bereid', 'g', 379, 0, 0, 23.1, 31.9, 0, 1676, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 11, 0.6, 23, 2.44, 1.2, 5, 0, 0.01),
	('50cc0089-ab09-47ce-b68c-2891727ec4a6', 2908, 'Spareribs varkens- bereid', 'g', 249, 0.1, 0.1, 29.5, 14.5, 0.1, 114, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 33, 1.2, 29, 4.1, 0.5, 1, 0, 0.01),
	('8b2307f3-9b24-4623-a42c-293291d422ee', 2909, 'Varkenspoulet bereid', 'g', 280, 0, 0, 37.4, 14.5, 0.1, 105, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 9, 1.4, 48, 4.52, 1.3, 1, 0, 0),
	('e4d708d5-ee41-4e8b-80bb-8e513bb6612a', 2910, 'Kalfsvleesreepjes gebakken', 'g', 185, 0, 0, 27.1, 8.5, 0.2, 70, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 0.7, 36, 2.69, 1, 1, 0, 0),
	('530fd26b-a8c3-4355-b671-ebedd0d1b63f', 2911, 'Kalfssukadelappen bereid', 'g', 158, 0, 0, 27, 5.5, 0.1, 58, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 0.8, 26, 4.77, 0.3, 0, 0, 0),
	('e9c31f10-3c31-4bf5-b5fe-a20e06b226d6', 2912, 'Kalfsbraadworst gebakken', 'g', 237, 0.4, 0.3, 22.9, 16, 0, 689, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 17, 1.2, 23, 3.63, 1.4, 9, 0, 0),
	('90bae5ec-9d33-4c02-935b-d77ee521a972', 2913, 'Kalfsriblappen bereid', 'g', 197, 0, 0, 27, 9.9, 0, 67, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 11, 1, 26, 4.26, 0.5, 0, 0, 0),
	('3dd56b4a-17ce-41d5-9004-4739b69ef022', 2914, 'Kalfslappen mager bereid', 'g', 142, 0, 0, 28.4, 3.1, 0.1, 71, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 1.2, 29, 4.73, 0.5, 0, 0, 0),
	('b9ef05d3-1677-4d30-9b81-b2014c3537f5', 2915, 'Kalfsoester bereid', 'g', 143, 0, 0, 28.8, 3.1, 0.1, 61, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 7, 1.4, 30, 3.86, 0.4, 0, 0, 0),
	('22f5942a-6eb8-4898-b50f-ddfaa1a37cfc', 2916, 'Cracker VitaLU verrijkt m calcium', 'g', 419, 67.5, 17.3, 12, 9.2, 9, 250, 'NEVO-online 2025/9.0', 'Brood', 203, 3, 94, 2.4, 0, 0, 0, 0),
	('7f2835b7-117d-483a-a9c2-48cce3ce0be5', 2921, 'Yoghurtdrank 7-9g KH', 'g', 39, 7.8, 7.6, 1.8, 0, 0, 41, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 76, 0.1, 8, 0.19, 0, 1, 0, 0),
	('04a208c5-6d9e-4924-850a-183de75aeeab', 2922, 'Aardappelen vastkokend z schil gekookt gem', 'g', 86, 17.9, 0.5, 1.8, 0.5, 1.5, 6, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 11, 0.6, 18, 0.34, 0, 11, 0, 0),
	('a6765a89-418f-43e3-a503-f99d5a8f5a47', 2923, 'Chips naturel', 'g', 541, 51.3, 0.5, 6.4, 33.5, 4.1, 451, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('0e7abb5c-090e-45c8-b07f-601c64ae12df', 2924, 'Chips paprika ea smaken', 'g', 536, 53.1, 2.6, 6.3, 32.3, 4, 586, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('4f263285-b74c-4e86-9ccf-e54d38a13054', 2925, 'Kaas Mascarpone', 'g', 455, 0.3, 0.3, 7.6, 47, 0, 86, 'NEVO-online 2025/9.0', 'Kaas', 68, 0.2, 10, 0.4, 0.3, 0, 0.03, 0),
	('1e793745-aeed-4b01-bba2-37510c3ee9c0', 2926, 'Chips light paprika ea smaken', 'g', 481, 63.5, 2.3, 7.2, 21, 4.6, 562, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('442d4f79-140d-4f9b-a588-ba1272df3b33', 2927, 'Fritessticks naturel', 'g', 515, 61, 0.4, 6.5, 26.6, 3, 547, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('f0fa6493-fa73-4b38-8901-750e66a8a36f', 2928, 'Fritessticks paprika', 'g', 529, 60, 2.5, 6.5, 28.5, 3.5, 677, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('b315833d-45d0-43b1-bc14-32257171875a', 2929, 'Chips Lays Sensations diverse smaken', 'g', 511, 58, 2.6, 6.8, 27.1, 3.9, 863, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 27, 2.3, 60, 1.3, 0, 11, 0, 0),
	('75092348-cf85-4eab-86f4-565eac81e2e0', 2930, 'Pasta chocolade- wit', 'g', 592, 53, 53, 4.6, 40, 0.6, 54, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 97, 0.2, 28, 1, 0, 0, 0, 0),
	('8773146c-c8ef-443a-b753-c8ee6b4affd3', 2932, 'Soep 1-kops bereid', 'g', 40, 5.4, 1.6, 1, 1.6, 0.2, 338, 'NEVO-online 2025/9.0', 'Soepen', 5, 0.3, 5, 0.09, 0.1, 1, 0, 0),
	('66f0ebd6-bfdb-4edf-a7d3-3038edbd4548', 2933, 'Koek eier- volkoren/meergranen', 'g', 305, 59.3, 33.4, 8, 3.2, 3.8, 153, 'NEVO-online 2025/9.0', 'Gebak en koek', 27, 1.4, 23, 0.9, 0.5, 0, 0.01, 0),
	('e1565ac3-647c-487c-97d0-6c44f824b1b9', 2934, 'Halvarineproduct Becel pro-activ calorie light', 'g', 216, 2, 0.3, 0.3, 23, 0.2, 8, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('d6f4a348-926e-43d1-9c71-d9f2053df3eb', 2935, 'Yoghurt volle Activia naturel', 'g', 68, 4.7, 4.7, 3.9, 3.5, 0, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 141, 0, 12, 0.5, 0, 0, 0, 0),
	('1ad40837-1ea9-41e0-a04c-b0c93439bd3f', 2936, 'Yoghurtdrank Activia', 'g', 64, 10.8, 10.6, 3, 0.9, 0.5, 44, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 106, 0, 8, 0.19, 0, 0, 0, 0),
	('c1a79a78-1e3f-4aa1-bfc7-f45ea67c8bee', 2937, 'Toast Melba naturel', 'g', 398, 79.3, 3.2, 12.7, 2.4, 4.1, 652, 'NEVO-online 2025/9.0', 'Brood', 26, 1.8, 25, 0.9, 0, 0, 0, 0),
	('95e17bf3-a647-467b-b72e-b3d51b80b2a3', 2938, 'Toast Melba overige soorten', 'g', 403, 64.9, 2.7, 15.4, 7.2, 8.2, 700, 'NEVO-online 2025/9.0', 'Brood', 26, 1.8, 25, 0.9, 0, 0, 0, 0),
	('d73a86df-ea1a-430f-b262-393171cc4c28', 2939, 'Plantaardig alternatief voor roomijs/yoghurtijs obv kokos', 'g', 195, 21.8, 19.9, 1.4, 11.2, 0.7, 12, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 6, 0.5, 22, 0.31, 0, 0, 0, 0),
	('0f3eedb8-8bcd-46e7-86e9-5e80eef87cda', 2942, 'Pizza m kaas en groenten diepvries onbereid', 'g', 232, 25.9, 2, 9.3, 9.7, 1.9, 375, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 127, 0.6, 16, 0.91, 0, 4, 0, 0),
	('7729837a-2c3a-4797-a144-ed09732aa56f', 2943, 'Pizza m vlees diepvries onbereid', 'g', 228, 26.5, 2.4, 9.2, 9, 2, 603, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 73, 0.6, 14, 0.92, 0.1, 3, 0, 0),
	('94923732-0530-45aa-a063-da637bd4f075', 2944, 'Pizza m vis diepvries onbereid', 'g', 225, 25.3, 2.1, 9.6, 9, 1.9, 393, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 76, 0.7, 17, 0.76, 0.3, 2, 0, 0.01),
	('2e254257-85a9-405f-aba5-5610c4725c2a', 2945, 'Pizza salami diepvries onbereid', 'g', 259, 27.4, 2.1, 9.9, 11.8, 2, 489, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 76, 0.6, 13, 0.93, 0.1, 3, 0, 0),
	('3538cc0b-9c44-432f-bdcf-6b17c882b05d', 2946, 'Pizza hawaii diepvries onbereid', 'g', 221, 27.4, 4.4, 8.5, 8.2, 1.8, 397, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 72, 0.5, 13, 0.74, 0, 5, 0, 0),
	('a3fa96de-97db-46cd-827d-6b27c8a3cb36', 2947, 'Rolmops', 'g', 182, 0.5, 0.3, 16, 12.8, 0.5, 780, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 34, 1.2, 6, 0.28, 4.9, 0, 0.2, 0.24),
	('7d3e81dd-fb2d-45d4-a66d-d73873c27c67', 2948, 'Salade ei- maaltijd', 'g', 193, 11.7, 4, 4.3, 14.1, 1.4, 526, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 23, 0.9, 14, 0.59, 0.4, 5, 0.01, 0),
	('fc4e8b44-3270-4010-bcad-ca3b19980a73', 2949, 'Salade zalm- maaltijd', 'g', 199, 15.9, 3.9, 3.1, 13.2, 2.1, 471, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 10, 0.4, 16, 0.26, 0.5, 6, 0.07, 0.13),
	('fadc6fa4-fab2-4e33-a8dc-86a8974b94ac', 2950, 'Salade vlees- maaltijd', 'g', 168, 14.2, 4.3, 3.8, 10.2, 2.3, 440, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 12, 0.8, 17, 1.16, 0.2, 7, 0, 0),
	('c7998712-0650-4bb4-a5d7-e19260c8ac8e', 2952, 'Kruidnoten m chocolade gem', 'g', 488, 65.9, 39.5, 6.2, 21.6, 2.6, 367, 'NEVO-online 2025/9.0', 'Gebak en koek', 97, 1.5, 36, 0.83, 0, 0, 0, 0),
	('74f34142-1651-4296-b1bf-a294001365ac', 2954, 'Appeltjes gedroogd geweekt', 'g', 85, 18.9, 14.8, 0.6, 0.1, 2.8, 4, 'NEVO-online 2025/9.0', 'Fruit', 18, 0.3, 5, 0.15, 0, 0, 0, 0),
	('9895281e-890c-40cf-a434-162048829996', 2955, 'Peren gedroogd geweekt', 'g', 83, 18.9, 14.8, 0.6, 0, 2.8, 4, 'NEVO-online 2025/9.0', 'Fruit', 32, 0.3, 11, 0.15, 0, 0, 0, 0),
	('c5d04830-88bf-4d41-820f-d9f26f2c617b', 2956, 'Pruimen gedroogd geweekt', 'g', 57, 13.9, 11, 0.5, 0.1, 1.5, 2, 'NEVO-online 2025/9.0', 'Fruit', 18, 0.1, 9, 0.08, 0, 0, 0, 0),
	('4bef6022-12dd-47c1-996e-c824ac5c41fd', 2957, 'Tuttifrutti gedroogd geweekt', 'g', 96, 21.2, 17.7, 1, 0.1, 3.4, 5, 'NEVO-online 2025/9.0', 'Fruit', 28, 0.6, 15, 0.12, 0, 0, 0, 0),
	('433f71ab-5d23-474e-b38b-2bc113777b84', 2983, 'Dreumesmelk Nutrilon 4 p 100 ml', 'ml', 65, 8.5, 6.7, 1.5, 2.6, 0.8, 26, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 120, 1.2, 10, 0.9, 3.1, 15, NULL, 0.01),
	('ff484acf-97de-42dc-a8f9-13232b9f2064', 2984, 'Peutermelk Nutrilon 5 p 100 ml', 'ml', 50, 6.5, 5.1, 1.3, 1.9, 0.8, 20, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 120, 1.2, 10, 0.9, 3.1, 15, NULL, 0.01),
	('136eda72-fab4-4cdd-9ea1-46312d690697', 2995, 'Kaas smeer- 45+', 'g', 231, 1, 1, 14.3, 18.9, 0, 725, 'NEVO-online 2025/9.0', 'Kaas', 450, 0.1, 21, 2, 0.2, 1, 0, 0),
	('fbb3e045-e92c-4b89-aa51-36ef49384b8f', 2996, 'Worst Chorizo', 'g', 358, 3.4, 3, 20.7, 29.1, 0, 1537, 'NEVO-online 2025/9.0', 'Vleeswaren', 29, 1.5, 16, 2.34, 0.9, 9, 0, 0),
	('b614b14b-a796-4643-9e2e-9a5715c6eb73', 2997, 'Worst grill-', 'g', 310, 3.1, 0.7, 13.2, 27.2, 0, 1038, 'NEVO-online 2025/9.0', 'Vleeswaren', 18, 1.3, 13, 1.7, 0.7, 38, 0.03, 0),
	('5ab19126-e350-47bc-9e34-796e7b637604', 3001, 'Kalkoenfilet (vleeswaar)', 'g', 113, 3.2, 3.2, 19.8, 2.4, 0, 972, 'NEVO-online 2025/9.0', 'Vleeswaren', 6, 2, 26, 1.94, 0.5, 3, 0, 0),
	('4c1c4b95-5a6a-4940-8639-ea8d842e8834', 3002, 'Spek katen-', 'g', 309, 1.2, 1.2, 14, 27.6, 0, 704, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 0.6, 13, 1.7, 0.7, 0, 0, 0.01),
	('bd7471bf-4f56-46af-a722-f3ae1a12721d', 3003, 'Worst knak- runder blik/glas', 'g', 180, 7, 0.3, 13, 11, 0.3, 850, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 22, 1.1, 10, 1.4, 0.7, 0, 0.01, 0),
	('0a83e399-5a66-4c31-88fb-115ed9d85f55', 3007, 'Tarwebrood bruin koolhydraatverlaagd', 'g', 241, 21, 0.5, 17.2, 8.9, 3.8, 444, 'NEVO-online 2025/9.0', 'Brood', 45, 1.9, 61, 1.29, 0, 0, NULL, NULL),
	('1248691f-45e3-4dd8-8930-d9cbacde79d9', 3009, 'Shandy', 'g', 42, 9.7, 9.7, 0, 0, 0, 1, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 2, 0, 1, 0, 0, 0, 0, 0),
	('ba85271d-8aad-4b97-90ae-8b5bdd0bcd00', 3016, 'Kalfsschnitzel ongepaneerd rauw', 'g', 104, 0, 0, 22.4, 1.6, 0, 60, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 1.1, 27, 3.37, 0.3, 1, 0, 0),
	('6776aede-353f-4c76-86cc-65ed2f8b4002', 3017, 'Gehakt kalfs- rauw', 'g', 214, 0.3, 0.3, 19, 15.1, 0.3, 90, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 1, 20, 2.82, 0.8, 9, 0, 0),
	('fdedf3fd-4c95-4fe8-bc30-5c076014f209', 3018, 'Kalfsoester rauw', 'g', 108, 0, 0, 22.9, 1.9, 0, 53, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 1.1, 27, 3.06, 0.3, 1, 0, 0),
	('8fd0902e-1226-4dca-bb9e-41f81eb2a64a', 3019, 'Kalfslappen mager rauw', 'g', 104, 0, 0, 21.8, 1.9, 0, 61, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 0.9, 25, 3.64, 0.4, 1, 0, 0),
	('85ba4581-693d-4f99-a792-383f85ef551d', 3020, 'Kalfsriblappen rauw', 'g', 167, 0, 0, 20.6, 9.4, 0, 57, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 0.8, 23, 3.25, 0.4, 1, 0, 0),
	('a156cdd4-ee09-472b-bb07-f2277d2210f3', 3021, 'Kalfsbraadworst rauw', 'g', 217, 0.5, 0.4, 17.2, 16.1, 0.5, 608, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 12, 0.9, 20, 2.74, 0.9, 16, 0, 0),
	('31db8818-72d5-44ad-9f39-21876d6b93ed', 3022, 'Kalfssukadelappen rauw', 'g', 117, 0, 0, 17.7, 5.1, 0, 63, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 0.5, 26, 3.13, 0.4, 1, 0, 0),
	('0368dc56-67bb-43a4-8d23-b63cb1033cef', 3023, 'Kalfsvleesreepjes rauw', 'g', 98, 0, 0, 22, 1.1, 0, 54, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 0.5, 29, 2.19, 0.3, 1, 0, 0),
	('f0cf5e06-ed2d-4d47-82ed-4c9ede781175', 3024, 'Varkenspoulet rauw', 'g', 123, 0, 0, 21.5, 4.1, 0, 57, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 0.8, 27, 2.6, 0.3, 1, 0, 0),
	('3a991e24-2bcc-4fe3-950a-9ea022ff6343', 3025, 'Spek rook- mager rauw', 'g', 325, 0, 0, 15.3, 29.4, 0, 1303, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 6, 0.4, 17, 1.62, 0.7, 8, 0, 0.01),
	('f1b3fa49-0d5b-4358-9a66-726886fdcfe8', 3026, 'Speklap bereid in eigen vet', 'g', 435, 0, 0, 29.1, 35.4, 0, 102, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 0.9, 31, 3.08, 1, 0, 0, 0.01),
	('e6314c5e-59ac-4d5b-83b9-35be84886ff3', 3027, 'Shoarmavlees varkens- rauw', 'g', 146, 0.6, 0.5, 19.9, 7, 0.6, 400, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 21, 1.1, 28, 2.73, 0.5, 2, 0, 0),
	('fae84211-cd73-4ea1-bace-92d98d901c54', 3028, 'Runderborstlappen rauw', 'g', 152, 0, 0, 22.3, 7, 0, 54, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 1.9, 26, 4.06, 0.4, 0, 0.01, 0),
	('5a5ea65a-34ea-4899-bb36-d318f99bf24d', 3029, 'Gehakt kalfs- rul gebakken', 'g', 286, 0.2, 0.2, 27.1, 19.6, 0.1, 133, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 13, 1.4, 28, 4.04, 2, 6, 0, 0),
	('b5a254a7-d1e7-48a5-8682-e3049ba4d70d', 3030, 'Runderbraadworst rauw', 'g', 207, 1, 0.4, 18.1, 14.6, 0, 603, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 16, 1.9, 19, 3.98, 0.9, 26, 0, 0),
	('c8694a16-d5b9-40bb-a3ce-db5762530a52', 3031, 'Spareribs varkens- rauw', 'g', 200, 0.1, 0.1, 20.4, 13, 0.4, 89, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 22, 0.9, 23, 2.84, 0.3, 2, 0, 0.01),
	('cd2b218c-77c1-4288-9ba6-b209556bfc02', 3032, 'Runder ribeye steak rauw', 'g', 170, 0, 0, 21.2, 9.4, 0, 50, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 4, 1.8, 23, 4.76, 0.5, 0, 0, 0),
	('5b9afefd-e5c6-4e5c-a509-7885b6ffe404', 3033, 'Runder T-bone steak rauw', 'g', 189, 0, 0, 22, 11.2, 0, 63, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 15, 1.8, 23, 3.69, 0.4, 0, 0, 0),
	('9f24d076-9867-44f6-b075-e2f5d3f61900', 3034, 'Gehakt mager runder- rauw', 'g', 182, 0.3, 0.3, 20, 11.1, 0.5, 149, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 2.2, 20, 4.76, 0.5, 9, 0, 0),
	('5fa39c7b-aa6a-49b9-83d0-65662cec95e4', 3035, 'Gehakt mager runder- rul gebakken', 'g', 293, 0.4, 0.4, 29.6, 19.1, 0.5, 207, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 20, 3, 29, 6.87, 1.4, 6, 0, 0),
	('07f6e7e2-6e2a-4a7c-b7f2-6163e53fefcc', 3036, 'Jus 75% vet gebonden bereid m juspoeder', 'g', 625, 7.3, 0.9, 1.2, 65.6, 0.2, 855, 'NEVO-online 2025/9.0', 'Hartige sauzen', 8, 0.1, 1, 0, 5, 0, NULL, NULL),
	('05159139-b45e-489d-b7de-09ded1b95a94', 3037, 'Jus 75% vet ongebonden bereid m juspoeder', 'g', 632, 5.1, 0.9, 1.2, 67.4, 0.2, 878, 'NEVO-online 2025/9.0', 'Hartige sauzen', 8, 0.1, 1, 0, 5.1, 0, NULL, NULL),
	('b01a5ea9-95fb-455a-bd4a-899d1beca9fe', 3038, 'Jus 5% vet ongebonden bereid m juspoeder', 'g', 69, 4.6, 0.5, 0.9, 5.1, 0.2, 627, 'NEVO-online 2025/9.0', 'Hartige sauzen', 5, 0, 1, 0, 0.3, 0, NULL, NULL),
	('2e846000-0cf4-4ab4-8b73-353a3d4c5339', 3039, 'Kalfsschnitzel ongepaneerd bereid', 'g', 144, 0, 0, 29.4, 2.9, 0.1, 71, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 1.4, 31, 4.42, 0.4, 0, 0, 0),
	('e1f064d5-099a-400a-b133-28d3cfbf2ccb', 3040, 'Schnitzel vegetarisch obv melk gevuld m kaas onbereid verrijkt m ijzer', 'g', 218, 16.6, 1, 14.8, 9.6, 3, 560, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 647, 2.1, 18, 0.96, 0, 0, 0, 0),
	('5cc4c7c3-c3bc-4148-a9e8-140934953f8c', 3041, 'Schnitzel vegetarisch obv melk gevuld diverse smaken onbereid verrijkt m ijzer', 'g', 206, 19.8, 3.8, 11.4, 8.3, 3.8, 520, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 515, 2.1, 18, 0.96, 0, 1, 0, 0),
	('c84b2271-f448-41a3-80e1-f8c444f1e8d4', 3042, 'Pizza Turkse z toevoegingen', 'g', 204, 33.7, 3.4, 7.6, 3.7, 2.8, 678, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 20, 1.1, 20, 1, 0.1, 10, 0, NULL),
	('078c79a2-99e0-4e09-b501-a7e8db45d578', 3043, 'Yoghurt Turkse 4% vet', 'g', 69, 3.3, 3.3, 3.9, 4.2, 0, 51, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 146, 0, 15, 0.5, 0.1, 0, 0, 0),
	('6f8abd0f-10d5-4206-9308-f2d3abc010b7', 3044, 'Kaas Turkse 60+ obv koemelk blik', 'g', 287, 0.4, 0.4, 12.7, 26, 0, 804, 'NEVO-online 2025/9.0', 'Kaas', 194, 0, 10, 1.1, 0.1, 0, 0.01, 0),
	('7970c3bc-733f-459e-ac9e-61e31db44ab2', 3045, 'Kaas schapen-/geiten- Turkse 50+ blik', 'g', 297, 0.1, 0.1, 15.5, 26.1, 0, 879, 'NEVO-online 2025/9.0', 'Kaas', 245, 0.1, 13, 1.3, 0.1, 0, 0, 0),
	('52611f9b-ff8d-4b2f-9b29-1ea03038c4d5', 3046, 'Tarwebrood bruin Turks', 'g', 248, 44.2, 3.1, 10.6, 1.7, 7, 477, 'NEVO-online 2025/9.0', 'Brood', 61, 2, 64, 1.4, 0, 0, 0, 0),
	('e986e755-e332-424e-9b9b-861a2773d04d', 3047, 'Yoghurt Turkse 10% vet', 'g', 119, 3.1, 3.1, 3.5, 10.1, 0, 43, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 126, 0, 12, 0.4, 0.1, 0, 0, 0),
	('9783e0cc-268e-48f5-9263-69417da887d2', 3048, 'Paprika oranje rauw', 'g', 28, 4.7, 4.7, 0.8, 0.3, 1.7, 0, 'NEVO-online 2025/9.0', 'Groente', 7, 0.4, 12, 0.24, 0, 133, 0, 0),
	('5dc24750-3414-4941-b0c9-358defdb9c7a', 3049, 'Bonen witte blik/glas', 'g', 105, 14, 0.4, 6.9, 0.8, 7.1, 120, 'NEVO-online 2025/9.0', 'Peulvruchten', 65, 2.2, 35, 0.76, 0, 5, 0, 0),
	('20ff19e5-7189-48e1-99c1-1b235709f751', 3050, 'Pap havermout- bereid m halfvolle melk ongezoet', 'g', 79, 10.5, 4.2, 4.4, 2, 1.2, 38, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 115, 0.4, 24, 0.63, 0, 0, 0, 0),
	('40345d85-a2d1-491f-be10-3f972941507d', 3051, 'Olie lijnzaad-', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, 0, 0),
	('be710eac-14d2-416d-8d50-421f0b7d2966', 3052, 'Boterproduct melange ongezouten', 'g', 676, 0.9, 0.9, 0.7, 74.3, 0, 7, 'NEVO-online 2025/9.0', 'Vetten en oliën', 26, 0.1, 3, 0.11, 0.2, 0, 0.05, 0),
	('9a691ad6-c261-4fa3-a97f-8c26328dfde8', 3056, 'Tarwebrood bruin natriumarm', 'g', 239, 43.3, 1.9, 9.9, 1.8, 4.9, 3, 'NEVO-online 2025/9.0', 'Brood', 30, 1.4, 44, 1, 0, 0, 0, 0),
	('6bc2b0a3-a8b0-450b-8a03-c3069cfba08d', 3058, 'Zemelen haver-', 'g', 375, 52.2, 1.4, 16.2, 7.4, 17.5, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 85, 8, 230, 5, 0, 0, 0, 0),
	('5cf9f3f4-48a5-40df-a37a-0fe768fa4419', 3060, 'Appelflap m bladerdeeg m roomboter', 'g', 311, 43, 14.9, 2.6, 13.7, 1.9, 197, 'NEVO-online 2025/9.0', 'Gebak en koek', 11, 0.4, 9, 0.19, 0, 1, 0.01, 0),
	('9ab27016-6c79-4c81-91e2-d848b2976f89', 3063, 'Siroop ahorn-', 'g', 269, 67.2, 60.7, 0, 0.1, 0, 9, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 67, 1.2, 14, 0.7, 0, 0, 0, 0),
	('c6dfa0f9-439b-4835-b2b8-fbdfa8576b34', 3064, 'Stroop appel- verrijkt m ijzer', 'g', 287, 67.6, 55.8, 1.6, 0, 5.2, 28, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 24, 24.8, 82, 0.81, 0, 1, 0, 0),
	('6c09999c-7f48-4f56-a9e8-fa38cd9c146d', 3066, 'Room spuitbus minder vet m suiker', 'g', 222, 11.3, 11.3, 2.6, 18.5, 0.1, 44, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 74, 0, 8, 0.18, 0.1, 1, 0.01, 0),
	('d042e307-a5ed-4ee3-b3ea-82794d868165', 3067, 'Snoepje room- hard', 'g', 414, 83.9, 83.9, 0.5, 8.6, 0.1, 350, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 10, 0.1, 3, 0.03, 0, 0, 0.01, 0),
	('861fa28c-35d1-4c02-8319-1bfbe2957f44', 3069, 'Groente soep- gekookt', 'g', 31, 4.6, 2.7, 1.1, 0.3, 2.8, 21, 'NEVO-online 2025/9.0', 'Groente', 38, 0.4, 9, 0.22, 0, 4, 0, 0),
	('378fdbc4-2c2c-4706-b869-3f1edb64bba5', 3070, 'Tonijn bereid z vet', 'g', 122, 0, 0, 29.2, 0.6, 0, 54, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 4, 0.9, 42, 0.45, 3.2, 0, 0.02, 0.11),
	('14029cbd-8440-4c8c-9f6e-5a5ad241d595', 3071, 'Tilapia bereid z vet', 'g', 128, 0, 0, 26.2, 2.7, 0, 56, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 14, 0.7, 34, 0.41, 24.3, 0, 0.01, 0.08),
	('ec55e0aa-a8ef-4b36-af45-3c838b6b5e0d', 3072, 'Gefrituurde peulvruchtensnack Bara Surinaams', 'g', 284, 39.8, 0.7, 7.3, 9.6, 4.5, 311, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 18, 0.9, 23, 0.54, 0, 4, 0, 0);
INSERT INTO public.nutrition_foods VALUES
	('0ce85682-9f38-493b-8032-68b0a303c154', 3073, 'Bonen mung- gekookt', 'g', 102, 13.3, 0.5, 7.6, 0.4, 7.6, 2, 'NEVO-online 2025/9.0', 'Peulvruchten', 24, 1.4, 43, 0.9, 0, 1, 0, 0),
	('a68c6e85-9d1e-4927-82b0-8a3375724b27', 3074, 'Yoghurt volle Activia m vruchten/vanille', 'g', 94, 12.2, 11.9, 3.8, 3, 0.6, 54, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 139, 0.1, 12, 0.43, 0, 1, 0, 0),
	('a5ac830c-2ab1-45e6-8271-acc3ac8d89b8', 3075, 'Kaassouffle bereid m vlb frituurvet', 'g', 359, 29.8, 1.6, 7.3, 23.1, 1, 614, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 134, 0.3, 14, 0.63, 0.2, 0, NULL, NULL),
	('59d0b4af-d43b-4da2-818e-e4d946478bac', 3076, 'Bladerdeeg m roomboter, bereid', 'g', 511, 57, 1.1, 5.1, 28.7, 2.3, 413, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 15, 0.5, 12, 0.32, 0.1, 0, 0.03, 0),
	('583ffa68-33da-45a7-9ab7-2da51cca2462', 3080, 'Knackebrod glutenvrij Fette Croccanti Schar', 'g', 368, 79.1, 5.3, 7.4, 1.9, 2.3, 700, 'NEVO-online 2025/9.0', 'Brood', 7, 0.8, 30, 0.6, 0, 0, NULL, NULL),
	('7a15185c-4a1d-4e59-8015-261a43cab97c', 3084, 'Vleeswaren 10-20 g vet excl leverprod gem', 'g', 200, 3.3, 0.5, 15.3, 14, 0.1, 922, 'NEVO-online 2025/9.0', 'Vleeswaren', 17, 1.5, 13, 1.97, 0.4, 0, 0.01, 0.02),
	('5f2bf9b2-f863-484e-bc44-b0562c8af559', 3085, 'Amsoi gekookt', 'g', 21, 1.8, 0.5, 2, 0.2, 2, 16, 'NEVO-online 2025/9.0', 'Groente', 80, 0.8, 15, 0.22, 0, 26, 0, 0),
	('6eedcbc4-7121-41ff-9f7d-df37f5e75106', 3086, 'Paksoi gekookt', 'g', 17, 1.7, 0.8, 1.6, 0.2, 1, 34, 'NEVO-online 2025/9.0', 'Groente', 93, 1, 11, 0.17, 0, 26, 0, 0),
	('646cf024-2bfb-4a07-85ef-c34be1faf8ed', 3115, 'Peutermelk Hero Baby 4 p 100 ml', 'ml', 64, 8.2, 5.6, 1.5, 2.7, 0.2, 23, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 60, 1.2, 6, 0.67, 1.3, 10, NULL, 0),
	('2d85a64b-b3da-4df7-92d0-d090e5d229f8', 3117, 'Peutermelk Hero Baby 5 p 100 ml', 'ml', 64, 8.2, 5.6, 1.5, 2.7, 0.2, 23, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 60, 1.5, 6, 0.67, 1.3, 14, NULL, 0),
	('facf6411-0e03-4623-9131-18b0ae374108', 3127, 'Pastinaak rauw', 'g', 71, 11, 5.4, 1.8, 1.1, 4.7, 10, 'NEVO-online 2025/9.0', 'Groente', 41, 0.6, 23, 0.3, 0, 17, 0, 0),
	('df4e7894-57bf-4897-9d66-def6bd7aab16', 3128, 'Pastinaak gekookt', 'g', 68, 11.4, 5.6, 1.6, 1.2, 2.6, 4, 'NEVO-online 2025/9.0', 'Groente', 50, 0.6, 23, 0.3, 0, 10, 0, 0),
	('95d0f1b0-ec38-4af9-90a9-f9b485544010', 3129, 'Dreumesmelk Nestle groeimelk 1+ p 100 ml', 'ml', 70, 8.5, 5.2, 1.9, 3.1, NULL, 28, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 104, 1.3, 6, 0.76, 2.1, 9, NULL, NULL),
	('5b9d4780-bcc3-48ad-8a8e-abf72ee0760c', 3130, 'Dreumesmelk Nestle groeimelk 2+ p 100 ml', 'ml', 71, 9.9, 4.9, 2.1, 2.5, NULL, 40, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 104, 1.3, 13, 0.73, 1.1, 9, NULL, NULL),
	('8c586f3e-e224-4d75-a69c-d86ceb2b5a8f', 3134, 'Sopropo gekookt', 'g', 18, 2.3, 2, 0.8, 0.2, 2, 6, 'NEVO-online 2025/9.0', 'Groente', 9, 0.4, 16, 0.77, 0, 33, 0, 0),
	('4db7676a-0865-4ad9-ab6e-3e885eea3125', 3135, 'Okra gekookt', 'g', 22, 2, 2, 1.9, 0.2, 2.5, 6, 'NEVO-online 2025/9.0', 'Groente', 77, 0.3, 36, 0.43, 0, 16, 0, 0),
	('6fc34d03-82f8-4004-a52a-9a0055aea979', 3137, 'Bakkeljauw (gedroogde gezouten kabeljauw) geweekt gekookt', 'g', 138, 0, 0, 32.5, 0.9, 0, 400, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 22, 1.8, 35, 0.5, 1.1, 0, 0.11, 0.26),
	('a4be9a6d-ddd8-4651-b178-f544057dd9c9', 3138, 'Saus ketjap-', 'g', 253, 61, 60, 1.6, 0.1, 1, 1120, 'NEVO-online 2025/9.0', 'Hartige sauzen', 5, 0.5, 4, 0.02, 0, 0, 0, 0),
	('85a112cf-8f28-4a9e-a655-761e3861ca31', 3139, 'Gehakt kippen- rauw', 'g', 147, 0, 0, 21.5, 6.8, 0, 80, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 0.6, 22, 1.1, 0.3, 0, 0.02, 0.06),
	('bd3cf02e-3c9e-49de-bec2-e48b1e1a027b', 3152, 'Margarineproduct 60% vet >17g verz vetz gezouten', 'g', 532, 0.2, 0.2, 0.2, 59, 0, 129, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('beb2eefc-3467-4ae5-beea-fb07a585d610', 3153, 'Quinoa rauw', 'g', 354, 57.2, 4.9, 14.1, 6.1, 7, 5, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 47, 4.6, 197, 3.1, 0, 0, 0, 0.05),
	('f6fcad08-2ceb-43ce-aa71-fe03a5c73ea3', 3154, 'Quinoa gekookt', 'g', 114, 18.5, 0.9, 4.4, 1.9, 2.8, 7, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 17, 1.5, 64, 1.09, 0, 0, 0, 0.02),
	('cfacd52e-f7fd-4609-8c42-facd39a739e1', 3155, 'Kaas 30+ jong', 'g', 280, 0, 0, 30.1, 17.7, 0, 677, 'NEVO-online 2025/9.0', 'Kaas', 1020, 0.2, 40, 4.15, 0.2, 0, 0, 0),
	('66eedd75-17d0-4cda-b811-c62b4794c624', 3156, 'Zuigelingenvoeding Kruidvat Standaard 1 p 100 ml', 'ml', 67, 7.6, 7, 1.3, 3.3, 0.6, 20, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 51, 0.6, 6, 0.53, 1.2, 10, NULL, 0.01),
	('551f23ba-d9f8-4d4a-83a7-e190d21ea11b', 3157, 'Opvolgmelk Kruidvat Standaard 2 p 100 ml', 'ml', 69, 8.9, 6.5, 1.4, 3, 0.6, 23, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 61, 1.1, 6, 0.8, 1.4, 10, NULL, 0.01),
	('eb2c6d11-ad4f-4461-95c3-9d9c2cd79ff2', 3158, 'Opvolgmelk Kruidvat Standaard 3 p 100 ml', 'ml', 71, 9, 6.5, 1.5, 3.1, 0.6, 23, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 61, 1.1, 7, 0.8, 1.5, 11, NULL, 0.01),
	('b91ba80b-944b-458a-8db6-6fd84629d291', 3163, 'Kaas 30+ jong belegen', 'g', 278, 0, 0, 29.3, 17.9, 0, 565, 'NEVO-online 2025/9.0', 'Kaas', 1050, 0.1, 40, 5, 0.2, 0, 0, 0),
	('15fcd639-0e6f-4cde-9b86-9841aaa485aa', 3164, 'Kaas 30+ belegen', 'g', 306, 0, 0, 31.9, 19.8, 0, 696, 'NEVO-online 2025/9.0', 'Kaas', 1033, 0.2, 40, 4.47, 0.2, 0, 0, 0),
	('fa60d7da-9a4e-4846-bd46-f064b15b4578', 3165, 'Kaas 30+ oud', 'g', 307, 0, 0, 31.7, 20, 0, 810, 'NEVO-online 2025/9.0', 'Kaas', 1130, 0.2, 40, 5, 0.2, 0, 0, 0),
	('b1291820-e13d-4bcd-a6d9-e57971bb3c54', 3166, 'Kaasproduct m plantaardige vetten Kees jong belegen', 'g', 387, 0, 0, 29, 30.1, 0, 600, 'NEVO-online 2025/9.0', 'Kaas', 1150, 0.1, NULL, NULL, NULL, NULL, 0, 0),
	('e3a249be-6fe0-4b8a-aa42-92cc078b6aa2', 3167, 'Kaasproduct m plantaardige vetten Kees oud', 'g', 403, 0, 0, 31, 31, 0, 640, 'NEVO-online 2025/9.0', 'Kaas', 1160, 0.2, NULL, NULL, NULL, NULL, 0, 0),
	('d58f667a-0909-416d-9b01-2008916cd080', 3174, 'Spread sandwich- overige smaken', 'g', 186, 14.9, 13.5, 1.6, 13.2, 0.9, 771, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 56, 2, 18, NULL, 0.1, 4, 0, 0),
	('cab278d8-e0c1-43e4-b97c-d79784b621f3', 3175, 'Salade coleslaw', 'g', 191, 7.1, 4.6, 1.4, 16.9, 1.9, 277, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 22, 0.3, 7, 0.2, 0, 14, 0, 0),
	('103d469f-fc2d-47f6-baf8-36aba9ee517b', 3176, 'Plantaardig alternatief voor room obv soja Alpro Cuisine Light', 'g', 61, 2.5, 0.7, 2, 4.7, 0.4, 56, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 13, 0.4, 13, 0.25, 0, 0, 0, 0),
	('fbc9fbd4-eb87-490f-ab74-ba186344e419', 3180, 'Drink soja- z suiker verrijkt m calcium en vitamines', 'g', 34, 0.6, 0.4, 3.4, 1.8, 0.6, 35, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 120, 0.5, 18, 0.35, 0.8, 0, 0, 0),
	('f1d895b4-1f3a-4703-abe0-341888da1e5c', 3184, 'Bonen kidney- rode blik/glas', 'g', 116, 15.1, 1.8, 8.2, 0.7, 8.5, 109, 'NEVO-online 2025/9.0', 'Peulvruchten', 61, 1.9, 39, 1.06, 0, 0, 0, 0),
	('bb307cdd-855d-46b6-95db-95b29d7e57d5', 3185, 'Erwten kikker- blik/glas', 'g', 140, 17.9, 0.3, 7.9, 2.5, 7.2, 110, 'NEVO-online 2025/9.0', 'Peulvruchten', 53, 1.7, 37, 1.3, 0, 6, NULL, NULL),
	('cc869410-f9b2-4296-9838-209a3fb2041c', 3190, 'Tarwebrood volkoren verrijkt m vit D en vezel Vollerkoren', 'g', 231, 35.6, 1.1, 10.6, 3, 9.4, 420, 'NEVO-online 2025/9.0', 'Brood', 33, 2, 68, 1.44, 1.5, 0, 0, 0),
	('051a5e22-5c86-48e1-8b76-59eba2448190', 3191, 'Pasta verrijkt m vezel rauw', 'g', 336, 64, 3.5, 11, 1.5, 11, 10, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 15, 2, 53, 1.5, 0, 0, 0, 0),
	('a59bb9ef-a7b7-4e58-b8db-0b8c75b12915', 3192, 'Bouillon 1-kops bereid', 'g', 6, 0.9, 0.2, 0.3, 0.1, 0.1, 342, 'NEVO-online 2025/9.0', 'Soepen', 0, 0, 0, 0, 0, 0, 0, 0),
	('1ba2caae-b279-4f53-9f3d-3134b86da922', 3194, 'Meergranenbrood bruin m zaden verrijkt m ijzer en vitamines Vikorn Vitaminebrood', 'g', 265, 39.9, 1.3, 11.4, 5.5, 5, 424, 'NEVO-online 2025/9.0', 'Brood', 46, 3.5, 52, 1.18, 1.6, 0, 0, 0),
	('a5472e50-3678-4c28-bdb1-59a1513432ec', 3195, 'Meergranenbrood bruin m zaden verrijkt m ijzer en vitamines Vikorn Volvezel', 'g', 268, 39.4, 2.2, 11.1, 5.8, 6.8, 431, 'NEVO-online 2025/9.0', 'Brood', 46, 3.3, 52, 1.18, 1.6, 0, 0, 0),
	('01bc34f5-cf01-4b3e-9441-6c084faaeaf7', 3198, 'Mispel', 'g', 50, 10.6, 10.6, 0.5, 0.2, 1.7, 6, 'NEVO-online 2025/9.0', 'Fruit', 30, 0.5, 11, 0.05, 0, 1, 0, 0),
	('47ce2003-7fef-4cef-8bbe-5473aa9c3cd5', 3199, 'Ansjovis rauw', 'g', 125, 0, 0, 20.4, 4.8, 0, 104, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 147, 3.3, 41, 1.72, 11, 0, 0.46, 0.9),
	('9d9c5a82-8525-4b29-b6e9-bd5ef12d7150', 3200, 'Tarwe gebroken bulgur gekookt', 'g', 80, 14.1, 0.1, 3.1, 0.2, 4.5, 5, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 10, 1, 32, 0.57, 0, 0, 0, 0),
	('ce6b8663-c6fe-442e-a929-ab287fc36b96', 3201, 'Yoghurtdrank Ayran Turks', 'g', 33, 2, 1.4, 2.3, 1.6, 0, 141, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 88, 0, 8, 0.3, 0, 0, 0, 0),
	('64b415ec-43a6-4e5f-8f52-a091d8915d1b', 3202, 'Manti gevulde pasta gekookt Turks', 'g', 145, 23.4, 0.8, 7.4, 2.2, 1.3, 10, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 16, 0.7, 20, 1.25, 0, 0, 0, NULL),
	('da649a48-2b82-4118-8733-244c8ebe9cef', 3203, 'Rundvlees gezouten gedroogd gekruid Pastirma Turks', 'g', 155, 2, 2, 30, 3, 0, 1800, 'NEVO-online 2025/9.0', 'Vleeswaren', 5, 2, 26, 3.47, 0.3, 1, 0, 0),
	('5696ec0e-222b-4250-900c-cfe70aee37d7', 3204, 'Gehakt runder- ambachtelijke slagerij rauw', 'g', 180, 0.3, 0.3, 20, 10.9, 0.5, 149, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 8, 2.2, 20, 4.76, 0.5, 9, 0, 0),
	('34c508bc-719a-4cbf-8f24-5538ac920a14', 3206, 'Mihoen gekookt', 'g', 103, 23, 0, 1.8, 0.2, 1, 19, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 4, 0.1, 3, 0.25, 0, 0, 0, 0),
	('d9325545-0203-4fa2-a43b-08029f9656cd', 3207, 'Hummus naturel', 'g', 320, 11.3, 0.8, 7.7, 25.8, 5.4, 476, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 29, 2, 62, 1.17, 0, 2, 0, 0),
	('c0ea41d8-0393-420b-a24a-8005942d9039', 3208, 'Zeekraal rauw', 'g', 14, 1.1, 1.1, 0.7, 0.2, 2.5, 1020, 'NEVO-online 2025/9.0', 'Groente', 34, 4.9, 75, 0.48, 0, NULL, NULL, NULL),
	('3da869c2-5ceb-45d7-811b-ed1d5a10abf5', 3209, 'Tarwebrood volkoren fijn m zaden', 'g', 273, 35.7, 1.7, 12.3, 7.3, 7.8, 340, 'NEVO-online 2025/9.0', 'Brood', 44, 2.5, 102, 2.11, 0, 0, 0, 0),
	('cb9b5ef2-c319-4a40-bb69-64e259e0186b', 3210, 'Tarwebrood volkoren fijn m zonnebloempitten', 'g', 283, 36.1, 1.6, 11.8, 8.6, 6.7, 344, 'NEVO-online 2025/9.0', 'Brood', 39, 2.3, 103, 1.91, 0, 0, 0, 0),
	('483befba-4489-4c0c-86cd-5de88dd1f8e9', 3211, 'Tarwebrood volkoren grof m zaden', 'g', 276, 35.4, 1.7, 12.6, 7.5, 8, 342, 'NEVO-online 2025/9.0', 'Brood', 47, 2.5, 100, 2.06, 0, 0, 0, 0),
	('2508a764-f55d-4892-a101-1fc79ffbdb92', 3212, 'Tarwebrood volkoren grof m zonnebloempitten', 'g', 285, 35.8, 1.6, 12.1, 8.8, 6.8, 346, 'NEVO-online 2025/9.0', 'Brood', 41, 2.3, 100, 1.85, 0, 0, 0, 0),
	('8c7d1cca-be8a-4cf9-afb3-2460d09b3675', 3213, 'Tarwebrood volkoren grof m pompoenpitten', 'g', 276, 34.6, 1.8, 13.6, 7.7, 7, 339, 'NEVO-online 2025/9.0', 'Brood', 37, 2.7, 121, 2.16, 0, 0, 0, 0),
	('5527b7df-016c-4d77-907e-6bf396faf81a', 3214, 'Bier wit', 'g', 47, 3.7, 0, 0.5, 0, 0.3, 3, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 3, 0, 8, 0.03, 0, 0, 0, 0),
	('02befe2b-38b0-404f-86b8-d5ccda99a795', 3215, 'Wodka', 'g', 234, 0, 0, 0, 0, 0, 1, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 0, 0, 0, 0, 0, 0, 0, 0),
	('a0206539-7018-4d74-bc6c-6f8849a0fb4c', 3216, 'Erwten split- groene gekookt', 'g', 122, 16.6, 0.6, 7.9, 1.2, 6.6, 2, 'NEVO-online 2025/9.0', 'Peulvruchten', 18, 2.5, 39, 1.02, 0, 0, 0, 0),
	('618f7e0b-e124-4e4d-9608-2fe28814c2f0', 3218, 'Vruchtendrank appelnectar', 'g', 37, 9.1, 8.9, 0, 0, 0, 8, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 0.1, 3, 0.01, 0, 0, 0, 0),
	('8e337a23-4afc-4bfd-a4ab-ec121c83275e', 3219, 'Kiwi gele', 'g', 66, 12.4, 12.3, 1, 0.3, 1.4, 3, 'NEVO-online 2025/9.0', 'Fruit', 17, 0.2, 12, 0.08, 0, 135, 0, 0),
	('7fc460ec-93c0-480b-8088-ca86f48f9cb9', 3220, 'Asperge groene rauw', 'g', 28, 2.8, 2.8, 3, 0.1, 2.1, 2, 'NEVO-online 2025/9.0', 'Groente', 24, 1, 12, 0.8, 0, 24, 0, 0),
	('d9f8dd87-fc19-4e99-b56c-cfc5338b3883', 3221, 'Olijven zwart in water blik/glas', 'g', 162, 1.7, 0, 0.9, 14, 12.5, 904, 'NEVO-online 2025/9.0', 'Fruit', 58, 3.3, 70, 0.13, 0, 1, 0, 0),
	('b050ef63-6f18-43f0-a95c-445c9f7abf7a', 3222, 'Pesto rode', 'g', 368, 7, 5.7, 5, 35, 2.4, 930, 'NEVO-online 2025/9.0', 'Hartige sauzen', 101, 1.4, 35, 0.82, 0, 11, 0, 0),
	('3b26de50-20e6-4212-9356-0b05f7c03e94', 3223, 'Worst grill- kip', 'g', 209, 4.4, 1.1, 13.8, 15, 0.3, 965, 'NEVO-online 2025/9.0', 'Vleeswaren', 13, 0.8, 21, 1.37, 0.3, 0, 0.04, 0.13),
	('1468c564-1302-432b-bef5-848a2f8845be', 3224, 'Groente roerbakmix Hollandse gekookt', 'g', 26, 3.2, 2.4, 1.6, 0.3, 2.3, 10, 'NEVO-online 2025/9.0', 'Groente', 31, 0.5, 12, 0.29, 0, 29, 0, 0),
	('b17a4894-32da-459b-8966-f4baafc3d780', 3225, 'Groente roerbakmix Italiaanse gekookt', 'g', 27, 3.9, 2.9, 1.1, 0.3, 2.1, 6, 'NEVO-online 2025/9.0', 'Groente', 26, 0.4, 12, 0.27, 0, 26, 0, 0),
	('1fc33f76-6dba-4367-bdba-262f28a3df5c', 3226, 'Groente roerbakmix oosterse gekookt', 'g', 22, 2.8, 2.1, 1, 0.2, 2.3, 8, 'NEVO-online 2025/9.0', 'Groente', 34, 0.3, 10, 0.2, 0, 24, 0, 0),
	('68adb51c-b1fd-4f33-bc2d-747c3cf53c74', 3227, 'Zeewier nori gedroogd', 'g', 254, 10.5, 0.6, 31.5, 1.5, 36.3, 1980, 'NEVO-online 2025/9.0', 'Groente', 318, 37.2, 486, 4.52, 0.6, 57, NULL, NULL),
	('f8eee9f0-f4ee-47fe-bd39-89c8d071d663', 3228, 'Noodles instant bereid', 'g', 227, 27.8, 1.1, 3.4, 11.1, 1.4, 800, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 24, 0.9, 20, 0.53, 0, 1, 0, 0),
	('19b8cbd6-dafc-45a3-8324-70522137b35a', 3229, 'Salade kip-sate- lunch/borrel', 'g', 262, 16.5, 13.3, 9.6, 17.3, 1, 438, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 17, 0.4, 33, 0.53, 0, 2, 0, 0),
	('c76a1683-c92c-409f-af7c-ae9428b8c882', 3230, 'Salade zalm- lunch/borrel', 'g', 338, 5.2, 3.2, 9.3, 31, 0.4, 580, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 12, 0.4, 14, 0.3, 1.6, 1, 0.24, 0.41),
	('d0722d2b-022d-4eee-9186-69e2ce39bf62', 3231, 'Salade tonijn- lunch/borrel', 'g', 288, 6.2, 4.3, 11.4, 24.1, 0.3, 538, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 11, 0.7, 20, 0.33, 1.4, 0, 0.01, 0.05),
	('9b631f5c-7aa3-4f45-8a10-9ed2eda1976c', 3232, 'Salade krab- lunch/borrel', 'g', 282, 11.5, 5, 5.2, 24, 0.1, 605, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 24, 0.6, 10, 0.74, 0.2, 0, 0.03, 0.03),
	('70e14b2d-0b1c-456f-a4ba-a41be6a73743', 3233, 'Salade garnalen- lunch/borrel', 'g', 299, 5.9, 4.2, 6.7, 27.6, 0.3, 800, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 33, 0.5, 15, 0.46, 0.1, 1, 0.05, 0.04),
	('d48ebb6a-085e-4f0a-a38a-eb2990afff49', 3235, 'Popcorn zoute gepoft z olie', 'g', 377, 70.3, 1.1, 12.7, 3.9, 4.9, 935, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 11, 1.1, 84, 0.1, 0, 0, 0, 0),
	('357925d0-d44b-4cc6-97b1-dd74d59d5055', 3236, 'Tarwestokbrood wit m kruidenboter kant-en-klaar', 'g', 303, 39.4, 2.3, 7.8, 12.2, 2.3, 560, 'NEVO-online 2025/9.0', 'Brood', 25, 0.7, 17, 0.53, 0.1, 0, 0.01, 0),
	('eecf6986-7124-41b7-a2f1-4e9e9d4234af', 3237, 'Oliebol ongevuld', 'g', 245, 32.2, 2.2, 6.5, 9.6, 1.9, 355, 'NEVO-online 2025/9.0', 'Gebak en koek', 63, 0.6, 16, 0.55, 0.1, 0, 0, 0),
	('e62047a3-2e1e-43b3-84c1-4c74bfb7248e', 3238, 'Brownie ongevuld', 'g', 421, 55.4, 45.5, 4.4, 19.8, 1.7, 154, 'NEVO-online 2025/9.0', 'Gebak en koek', 21, 1.1, 20, 0.55, 1.5, 0, 0.01, 0),
	('61328d8b-64a7-4884-a24d-5a2c23203d4b', 3239, 'Taai-taai', 'g', 353, 79.9, 37.6, 5.3, 0.9, 2.1, 132, 'NEVO-online 2025/9.0', 'Gebak en koek', 17, 0.7, 16, 0.65, 0.1, 0, 0, 0),
	('abdb82d2-279b-4662-b0de-3b795b672dab', 3240, 'Melk halfvolle lactosevrij', 'g', 44, 4.4, 4.4, 3.4, 1.5, 0, 45, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 117, 0, 12, 0.41, 0, 1, 0, 0),
	('175e32bb-41e1-426f-99ab-6b99c198f8e5', 3241, 'Boter kruiden-', 'g', 623, 2.1, 1.6, 1.2, 67.7, 0.5, 353, 'NEVO-online 2025/9.0', 'Vetten en oliën', 17, 0.1, 2, 0.09, 0.3, 0, 0.07, 0),
	('730e3c20-110e-4d84-be76-31aa88bd7be6', 3242, 'Stroop schenk-', 'g', 288, 72, 72, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 0, NULL, 0.1, 0, 0, 0, 0),
	('c703c999-8863-4f67-bbe0-9cd9136c30f0', 3243, 'Olie kokos-', 'g', 892, 0, 0, 0, 99.1, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 1, 0.1, 0, 0.02, 0, 0, 0, 0),
	('84ea8bb2-e50a-4176-a1dc-57b501332c0f', 3244, 'Fudge/karamel zachte', 'g', 435, 70.8, 63.8, 1.9, 16, 0.3, 206, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 126, 0.2, 13, 0.5, 0, 0, 0, 0),
	('b302fdf0-62b8-486d-9f1b-24b1c864ea66', 3245, 'Muisjes gestampte/roze&witte/blauwe&witte', 'g', 402, 92, 79, 2, 2.4, 2.2, 7, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 97, 5.6, 27, 0.8, 0, 3, 0, 0),
	('c474dfc3-5acc-454b-a0ae-b4b72703626f', 3246, 'Vlokken chocolade- mix wit en puur', 'g', 450, 75.2, 71.8, 3.2, 14.4, 3.5, 34, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 72, 6.2, 87, 0.49, 0, 0, 0, 0),
	('48482e73-5296-4e57-9616-44000398602a', 3247, 'Siroop vruchtenlimonade- m suiker en zoetstof 20-25 g KH', 'g', 94, 23.3, 23.2, 0.1, 0, 0, 3, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0, 4, 0.05, 0, 0, 0, 0),
	('e7cd1f8c-c634-4306-9c70-92b0321f0b06', 3248, 'Siroop vruchtenlimonade- m 45-50 mg vit C', 'g', 238, 59.6, 59.3, 0, 0, 0, 3, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0, 4, 0.05, 0, 48, 0, 0),
	('f5b34839-262f-42c5-8da8-f7055436e1e5', 3249, 'Mentos', 'g', 387, 92.5, 69, 0, 1.9, 0, 40, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 4, 0.2, 2, 0.04, 0, 0, 0, 0),
	('74f0e9de-4090-463a-b199-6499d9429620', 3250, 'Pasta glutenvrij gekookt', 'g', 143, 29.5, 0.2, 3.6, 1, 0.9, 21, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 5, 0.4, 13, 0.2, 0, 0, 0, 0),
	('b00655da-4be8-4df0-ac74-8a88755908e2', 3251, 'Pasta verrijkt m vezel gekookt', 'g', 134, 25.6, 1.4, 4.4, 0.6, 4.4, 5, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 9, 0.8, 22, 0.6, 0, 0, 0, 0),
	('0455ffc9-e4e0-4270-8838-2b3ed0aa3789', 3252, 'Surimi', 'g', 122, 15.5, 3.7, 6.8, 3.6, 0.3, 710, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 19, 0.4, 12, 0.19, 0.3, NULL, 0, 0),
	('aa0cfff9-eb56-4882-9078-8aa22be45b55', 3253, 'Chips tortilla overige smaken', 'g', 487, 56.6, 3.2, 6.6, 25, 4.6, 687, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 5, 2.3, 32, 0.23, 0, 0, 0, 0),
	('0061b9b9-e2f9-4501-8407-7ed3255a0cff', 3254, 'Groente roerbakmix champignon gekookt', 'g', 25, 2.6, 1.6, 1.9, 0.3, 1.9, 6, 'NEVO-online 2025/9.0', 'Groente', 25, 0.7, 9, 0.27, 0, 11, 0, 0),
	('25331cce-d51b-47f3-a9f6-937c76f1dbbd', 3256, 'Sardines gegrild', 'g', 171, 0, 0, 25.3, 7.8, 0, 140, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 130, 1.7, 34, 1.4, 12.3, 0, 0.89, 1.77),
	('c71dc560-e97a-4ac9-b76c-c4a2ce59e3a8', 3257, 'Vis vet >5 g vet gem bereid in magnetron z toev', 'g', 202, 0, 0, 24.7, 11.5, 0, 82, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 29, 0.8, 17, 0.78, 6.3, 1, 0.56, 1.04),
	('3ff36a3f-c771-435b-8dd6-bb104fbfadc1', 3258, 'Filodeeg onbereid', 'g', 286, 57.9, 3, 8, 1.9, 2.4, 253, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 63, 1.5, 23, 0.59, 0, 0, 0, 0),
	('a906c05b-01c7-4868-aea2-c40d382f9a9c', 3259, 'Melkdrank Yakult Plus', 'g', 45, 10.2, 4.1, 1.3, 0, 3.1, 19, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 43, 0, 4, 0.14, 0, 36, 0, 0),
	('e73c3b55-319f-4d09-839f-3b0469d4785b', 3267, 'Bier Radler', 'g', 39, 6.5, 5.7, 0.4, 0, 0.1, 2, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 4, 0, 4, 0.02, 0, 2, NULL, 0),
	('0b905d65-2ff2-4876-a0e4-7fcde4981337', 3268, 'Bier bok-', 'g', 61, 5.2, 1.2, 0.6, 0, 0.3, 2, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 3, 0, 8, 0.03, 0, 0, 0, 0),
	('e5fb206e-d630-43bf-b09a-971854034801', 3282, 'Yoghurt halfvolle lactosevrij', 'g', 42, 2, 2, 4.5, 1.5, 0, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 0.1, 12, 0.45, 0, 2, 0, 0),
	('5fc450c1-d6d8-454c-9110-cd8078cf0eb3', 3316, 'Yoghurtdrank Actimel vruchten', 'g', 72, 11.7, 11.6, 2.7, 1.5, 0.5, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 0, 10, 0.29, 0.8, 0, 0, 0),
	('7f53beba-7313-407c-b8da-5048b37d2402', 3318, 'Koolvis (Alaska) rauw', 'g', 72, 0, 0, 16.4, 0.7, 0, 68, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 12, 0.2, 30, 0.4, 0, 0, 0.05, 0.11),
	('24419d10-07ed-4b2e-ad20-1ade6cb3e937', 3319, 'Koolvis (Alaska) gestoomd', 'g', 120, 0, 0, 27.4, 1.2, 0, 114, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 20, 0.3, 49, 0.6, 0, 0, 0.08, 0.19),
	('18415048-2a84-405b-9441-765a4920171f', 3320, 'Garnalen roze gekookt', 'g', 70, 0, 0, 15.4, 0.9, 0, 588, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 65, 1, 36, 1, 0, 0, 0.14, 0.1),
	('7510ba05-0a82-4e9c-81bb-813ca9c64ed3', 3321, 'Tongschar rauw', 'g', 73, 0, 0, 16.7, 0.7, 0, 115, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 17, 0.1, 26, 0.3, NULL, 0, 0.05, 0.05),
	('a85749c8-3928-4834-b3c0-3d1080fe8c79', 3322, 'Pangasius rauw', 'g', 74, 0, 0, 14.9, 1.6, 0, 204, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 10, 0.1, 29, 0.3, 1.4, 0, 0, 0.01),
	('5109e7ce-2e67-40c2-8802-1567abbc33e0', 3323, 'Rostirondjes diepvries onbereid', 'g', 178, 24.5, 1, 2, 7.3, 3.4, 433, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.5, 21, 0.37, 0, 17, 0, 0),
	('0a66b06d-e4ea-4d32-b7d4-7dd7f45884ee', 3324, 'Vleeswaren natriumarm', 'g', 179, 3.5, 1.5, 16.1, 11.1, 0.2, 49, 'NEVO-online 2025/9.0', 'Vleeswaren', 14, 1.4, 18, 2.5, 0.4, 9, 0.01, 0),
	('6db4ec15-732e-4ffb-8382-0dcc7bb69dd3', 3325, 'Wafel rijst- naturel z zout', 'g', 390, 81.8, 1, 6.6, 3, 4.7, 3, 'NEVO-online 2025/9.0', 'Brood', 18, 0.9, 132, 2, 0, 0, 0, 0),
	('75d3c46e-2c7d-44f8-993c-5421f48b824d', 3326, 'Tarwebrood volkoren fijn m pompoenpitten', 'g', 274, 34.9, 1.8, 13.2, 7.5, 6.8, 338, 'NEVO-online 2025/9.0', 'Brood', 34, 2.7, 123, 2.21, 0, 0, 0, 0),
	('afb3f088-da14-4184-9742-fd98cbd28b38', 3327, 'Tarwebrood gem v bruin en volkoren', 'g', 237, 41.1, 1.9, 10.5, 2, 5.8, 394, 'NEVO-online 2025/9.0', 'Brood', 32, 1.7, 55, 1.2, 0, 0, 0, 0),
	('8b9fbdbe-8d11-412f-b5ad-f3083f02c4b7', 3328, 'Tarwebrood gem v bruin en volkoren m zaden', 'g', 276, 37.4, 1.7, 11.9, 7.2, 7.1, 351, 'NEVO-online 2025/9.0', 'Brood', 43, 2.3, 92, 1.9, 0, 0, 0, 0),
	('945a3aa0-4b44-4d72-858e-3df7262d430d', 3330, 'Halvarineproduct Vita d''Or Goed begin', 'g', 347, 1.1, 0.1, 0, 38, 0.1, 132, 'NEVO-online 2025/9.0', 'Vetten en oliën', 600, 0.1, 2, 0, 7.5, 0, 0, 0),
	('05327d68-9db7-4aab-ab85-6ae21a12a193', 3331, 'Artisjokharten blik/glas', 'g', 27, 1.5, 0.7, 2.1, 0.4, 4.8, 389, 'NEVO-online 2025/9.0', 'Groente', 28, 1, 25, 0.39, 0, 3, 0, 0),
	('12867258-f72a-4f5c-9707-29d6c520e199', 3332, 'Sla romaine rauw', 'g', 17, 1.2, 1.2, 1.2, 0.3, 2.1, 8, 'NEVO-online 2025/9.0', 'Groente', 33, 1, 14, 0.23, 0, 4, 0, 0),
	('84ff0fd6-8ffe-4bc8-b773-8a4f6093807c', 3333, 'Aardappel(product) naturel voorgekookt koelvers', 'g', 80, 16.6, 0.6, 1.7, 0.4, 1.7, 80, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.4, 19, 0.24, 0, 15, 0, 0),
	('44000874-6c0c-4981-9a9b-fff8bf917206', 3334, 'Olie rijst-', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0.1, 0, 0, 0, 0, 0, 0),
	('4ce3fc26-742e-41ea-a7b9-891b9d17e92c', 3335, 'Olie frituur-', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0, 0, 0, 0, 0),
	('dec14401-3107-4d7c-9ac4-ff200a29e048', 3336, 'Olijven gem in water blik/glas', 'g', 122, 0.8, 0.4, 0.9, 11.6, 5.6, 1559, 'NEVO-online 2025/9.0', 'Fruit', 61, 2.1, 31, 0.2, 0, 0, 0, 0),
	('4cf6e77b-efe9-4f1e-940b-0772d34fd719', 3340, 'Halvarine 40% vet <17 g verz vetz verrijkt m vit E gezouten', 'g', 360, 0, 0, 0, 40, 0, 120, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('26353145-72f5-48e3-81d5-897177a28484', 3341, 'Meloen cantaloupe', 'g', 38, 7.9, 7.9, 0.8, 0.2, 0.9, 16, 'NEVO-online 2025/9.0', 'Fruit', 9, 0.2, 12, 0.18, 0, 37, 0, 0),
	('b0c900e8-febe-4b61-b7cf-22a91f54bb52', 3342, 'Bak- en braadvet Vita d''Or Vlees&jus vloeibaar', 'g', 878, 0.9, 0.9, 0.3, 97, 0, 228, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 6.5, 0, 0, 0),
	('1a9ba895-a1b7-43d2-892c-9b5fc5cdf4d5', 3343, 'Saus chili-', 'g', 149, 35.8, 34.3, 0.3, 0.3, 0.7, 916, 'NEVO-online 2025/9.0', 'Hartige sauzen', 5, 0.2, 4, 0.08, 0, 27, 0, 0),
	('79477220-fcc4-493f-a5d8-584468a4c340', 3344, 'Saus knoflook- 30-<40% olie', 'g', 378, 12, 8.8, 1, 36.2, 0.2, 654, 'NEVO-online 2025/9.0', 'Hartige sauzen', 8, 0.2, 2, 0.11, 0.1, 0, 0, 0),
	('117edbb2-476a-49ad-a0bd-4c8b6026231a', 3345, 'Runderrosbief (vleeswaar)', 'g', 156, 0.2, 0.2, 27.2, 5.1, 0, 105, 'NEVO-online 2025/9.0', 'Vleeswaren', 5, 2, 26, 5.6, 0.5, 0, 0, 0),
	('12951a46-3801-440d-8735-4c0cb048ef15', 3346, 'Ontbijtproduct Special flakes m chocolade', 'g', 404, 73.4, 15.6, 8.8, 6.7, 7.4, 171, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 25, 2.1, 64, 1.68, 0, 1, 0, 0),
	('f93bd8ba-3728-4a91-90a4-74f117260f10', 3349, 'Saus bolognese- kant-en-klaar glas', 'g', 101, 8.5, 6.5, 4.3, 5.3, 0.8, 451, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 18, 1, 16, 1.07, 0.2, 10, 0, 0),
	('408b3208-5856-45df-ad94-c0db6d010292', 3350, 'Hagelslag chocolade- extra puur', 'g', 424, 53.7, 49.7, 7.8, 18.3, 6.6, 7, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 36, 8.1, 119, 1.27, 0, 0, 0, 0),
	('f4d28bdb-5345-4387-ae1e-b9f009afd8fb', 3351, 'Marmelade', 'g', 260, 63.9, 59.6, 0.3, 0.2, 0.8, 45, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 8, 0.4, 4, 0.04, 0, 3, 0, 0),
	('f795f254-0328-453c-986e-f9ebf62f6ff2', 3352, 'Soeppoeder', 'g', 372, 54.2, 11.6, 9.6, 12.1, 4, 4485, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 99, 1.3, 28, 0.7, 0, 0, 0, 0),
	('5e93521a-01e3-45e8-a688-c095e09c1b99', 3353, 'Zoutje luchtig mais- Organix Goodies', 'g', 452, 73.2, 3, 8.2, 13.7, 1.6, 39, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 30, 1.3, 18, 0.4, 0, 0, 0, 0),
	('16be5cd0-6934-4a05-a736-266d22feb273', 3355, 'Vlokken chocolade- wit', 'g', 458, 77, 77, 5.9, 14, 0, 88, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 110, 4.4, 64, 0.31, 0, 0, 0, 0),
	('44550553-1671-4e7e-a5c9-3a24f91948ea', 3356, 'Kaas Heks''n-', 'g', 356, 9.7, 7.8, 1.9, 34.3, 0.4, 387, 'NEVO-online 2025/9.0', 'Kaas', 42, 0.5, 7, NULL, 0.2, 5, 0.01, 0),
	('6afd5439-4234-4bb0-b34a-525e2c810751', 3357, 'Siroop gember-', 'g', 215, 52.2, 50.7, 0, 0.4, 1.2, 4, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 0, 4, 0.05, 0, 0, 0, 0),
	('872db65c-6006-44bb-a323-f99df5d26b9e', 3358, 'Schuimpje', 'g', 366, 89.2, 76.8, 2.1, 0.1, 0, 19, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 6, 0.2, 1, 0.07, 0, 0, 0, 0),
	('d621e2d0-8adf-49cf-bc2c-ba95cb3fcf6d', 3359, 'Kokoswater naturel', 'g', 18, 4.5, 4, 0, 0, 0, 32, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 10, 0, 8, 0.04, 0, NULL, 0, 0),
	('dd7fb9de-93d8-4f2c-a209-535979e1c1a7', 3360, 'Stroop appel- peren', 'g', 253, 60.3, 52.5, 1.1, 0, 3.8, 30, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 24, 3.1, 82, 0.81, 0, 1, 0, 0),
	('a088ecaf-37d6-489f-9f78-9326a01d4418', 3362, 'Kaas Feta', 'g', 274, 0.6, 0.6, 16.6, 22.8, 0, 988, 'NEVO-online 2025/9.0', 'Kaas', 360, 0.2, 20, 0.9, 0.5, 0, 0, 0),
	('12c41407-f10a-46e8-9fbc-43e019cd4f4f', 3363, 'Nasischijf diepvries onbereid', 'g', 197, 31.4, 3.2, 5.3, 5.4, 0.7, 640, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 39, 1.7, NULL, NULL, 0.1, 0, 0, 0),
	('71c7371d-805e-4c9c-83b9-40d691d9504e', 3364, 'Yoghurtdrank verrijkt m calcium', 'g', 55, 11.7, 10.5, 1.8, 0, 0, 41, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 118, 0, 8, 0.19, 0, 0, 0, 0),
	('2ac164fe-d599-4e95-93b5-125de29fe5f2', 3366, 'Vruchtendrank m zuivel m suiker en zoetstof', 'g', 32, 7.8, 7.8, 0.1, 0, 0, 16, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 11, 0, 2, 0.02, 0, 15, 0, 0),
	('d41ac47e-1879-4f52-997b-abd9661c3df8', 3367, 'Kroket oven- vlees diepvries onbereid', 'g', 247, 21.5, 1.1, 8.1, 14, 1.2, 506, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 13, 1, 16, 1.1, 0, 0, 0, 0),
	('b4b713c1-4efa-4b64-a403-42433a3313de', 3368, 'Kaas room- m kruiden 25-30 g vet', 'g', 291, 3.4, 3.2, 5.3, 28.4, 0, 552, 'NEVO-online 2025/9.0', 'Kaas', 200, 0.3, 10, NULL, 0.3, 0, 0.02, 0),
	('06b5dfe5-ea62-458a-86aa-74b1c579010c', 3369, 'IJs sorbet-', 'g', 126, 30.8, 28.7, 0.2, 0.1, 0.9, 8, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 54, 0.1, 8, 0.48, 0, 2, 0, 0),
	('7ea0582c-bb44-4dcc-a12b-74b6784401e0', 3370, 'Kaas witte 45+', 'g', 247, 0.6, 0.6, 17.1, 19.6, 0, 1136, 'NEVO-online 2025/9.0', 'Kaas', 160, 0.4, NULL, 2.6, 0.2, 0, 0.01, 0),
	('6c704274-f9aa-4514-af45-12f6a5a82235', 3371, 'Bitterbal oven- diepvries onbereid', 'g', 246, 21.3, 1.1, 7.9, 14.1, 1.2, 495, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 13, 1, 16, 1.1, 0, 0, 0, 0),
	('99a729bf-3b21-4cda-bbf5-d8fc39b3df70', 3372, 'Halvarineproduct Vita d''Or Bewust light', 'g', 270, 0, 0, 0, 30, 0.1, 12, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, NULL, NULL),
	('93265699-eb06-4644-8749-372aeeeac43a', 3373, 'Broodje frikandel- bladerdeegbasis', 'g', 327, 25.4, 4.4, 8, 21.2, 0.9, 524, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 50, 1.1, 18, 0.72, 0.1, 1, NULL, NULL),
	('d79f5d60-d46f-4dd6-a6a5-11d653de0c5e', 3374, 'Focaccia', 'g', 266, 38.4, 2.5, 7.7, 8.7, 1.7, 507, 'NEVO-online 2025/9.0', 'Brood', 9, 0.6, 12, 0.5, 0, 1, 0, 0),
	('2628b504-8820-4828-a6b1-f229e5c18cb7', 3375, 'Zoutje bladerdeeg-', 'g', 501, 53, 4.4, 10, 27, 2.9, 800, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 15, 0.5, 12, 0.32, 0.1, 0, NULL, NULL),
	('b4365b69-3f06-4f81-b6e7-516795ed0206', 3376, 'Olie sesam-', 'g', 898, 0, 0, 0.2, 99.7, 0, 2, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 0, 0, 0, 0, NULL, NULL),
	('bdbba3fb-55a4-42cd-8c9f-65d94c36255a', 3377, 'Kaas Ricotta', 'g', 141, 3.9, 3.5, 8, 10.3, 0, 164, 'NEVO-online 2025/9.0', 'Kaas', 240, 0.4, 13, 1.3, NULL, NULL, 0.01, 0),
	('331025fa-df63-4aa0-b8a9-337d0a7c740d', 3378, 'Pinda''s omhuld m melkchocolade', 'g', 568, 35.5, 30, 16.1, 39.1, 4.8, 48, 'NEVO-online 2025/9.0', 'Noten en zaden', 122, 2.7, 112, 1.93, 0, 1, 0, 0),
	('85f881fe-7409-4ff5-b82d-a031e35457ae', 3382, 'Dreumesmelk Kruidvat 4 p 100 ml', 'ml', 68, 8.9, 6.5, 1.5, 2.8, 0.6, 22, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 61, 1.2, 6, 0.93, 1.7, 15, NULL, 0.01),
	('0c2ea7eb-1049-42a8-8edf-dfdbeef6e3dd', 3383, 'Peutermelk Kruidvat 5 p 100 ml', 'ml', 51, 6.9, 4.7, 1.2, 1.9, 0.6, 17, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 68, 1.1, 4, 1.1, 1.7, 15, NULL, 0.01),
	('e0a363cd-630b-4ea8-810a-df2f4f99dc32', 3442, 'Ontbijtproduct Tresor Kellogg''s', 'g', 452, 69, 25.5, 7.3, 15.5, 3.7, 380, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('d9d54443-d123-409d-b0ec-15b0127b684a', 3444, 'Ontbijtproduct Honey pops Kellogg''s', 'g', 384, 85, 22, 5.2, 1.5, 4.6, 160, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', NULL, 8, 10, 0.2, 8.3, 0, 0, 0),
	('f44fa8fb-66e2-4ff4-a17a-e5d837c32287', 3445, 'Bessen goji- gedroogd', 'g', 343, 64.1, 45.6, 14.3, 0.4, 13, 298, 'NEVO-online 2025/9.0', 'Fruit', 190, 6.8, NULL, NULL, 0, 48, NULL, NULL),
	('98553073-f5bd-4b30-bc95-3c1d33c1d102', 3446, 'Hennepzaad', 'g', 592, 4.7, 1.5, 31.6, 48.8, 4, 5, 'NEVO-online 2025/9.0', 'Noten en zaden', 70, 8, 700, 9.9, 0, 1, NULL, NULL),
	('81077b2b-5138-4974-87d0-78b3baa230f3', 3447, 'Chiazaad gedroogd', 'g', 443, 7.7, NULL, 16.5, 30.7, 34.4, 16, 'NEVO-online 2025/9.0', 'Noten en zaden', 631, 7.7, 335, 4.58, 0, 2, NULL, NULL),
	('29b312c5-4b0f-480d-8e72-f6d32ab9a4ee', 3448, 'Bessen moerbei- rauw', 'g', 45, 8.1, 8.1, 1.4, 0.4, 1.7, 10, 'NEVO-online 2025/9.0', 'Fruit', 39, 1.9, 18, 0.12, 0, 36, 0, 0),
	('08be6c0c-d0f8-46c9-9c8f-dd38c805a95d', 3449, 'Olie koolzaad-/raapzaad-', 'g', 899, 0, 0, 0, 99.9, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0.1, 0, 0, 0, 0, 0, 0),
	('2e1fd463-0853-4d2b-a2d7-12558dcca0e4', 3450, 'Munt vers', 'g', 49, 5.1, 5.1, 3.8, 0.7, 3.5, 15, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 210, 9.5, 80, 1.11, 0, 31, 0, 0),
	('f9837bdf-260f-4c43-8f39-fefc0377d06b', 3451, 'Olie palm-', 'g', 899, 0, 0, 0, 99.9, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0.4, 0, 0, 0, 0, 0, 0),
	('98f11a7c-15ec-4bd8-81c9-2c1f9fa8f88c', 5039, 'Koffie latte macchiato vers bereid', 'g', 46, 3.4, 3.4, 2.5, 2.5, 0, 32, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 94, 0.1, 11, 0.35, 0, 0, 0, 0),
	('8d8300b1-039e-48ed-873b-a8cb9fbbe588', 5040, 'Tarwebrood volkoren tijger-', 'g', 238, 40.4, 1.9, 10.8, 2.3, 6.4, 391, 'NEVO-online 2025/9.0', 'Brood', 34, 2, 65, 1.42, 0, 0, 0, 0),
	('b2dff464-b7b8-4312-b9fe-1026eca5a73a', 5041, 'Olie plantaardig gem', 'g', 898, 0, 0, 0.1, 99.7, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0.1, 0, 0, 0, 0, 0, 0),
	('b5851f59-c856-4f4f-8aa5-ecf2dffd7f39', 5042, 'Drop m schuim', 'g', 334, 76.6, 50.4, 6.1, 0.3, 0.6, 63, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 69, 1.8, 18, 0.15, 0, 0, 0, 0),
	('73fe0c55-be66-414c-81c0-1b8eb0b7a3e1', 5043, 'Tarwemaisbrood wit m zaden', 'g', 298, 40.7, 2.3, 12.2, 8.2, 6, 385, 'NEVO-online 2025/9.0', 'Brood', 44, 1.8, 73, 1.63, 0, 0, 0, 0),
	('d34e7488-8a39-4657-aaf2-b1828725242c', 5044, 'Tarwebrood wit gem v melk- en waterwit m zaden', 'g', 288, 43.5, 2.1, 10.7, 6.9, 4.3, 363, 'NEVO-online 2025/9.0', 'Brood', 54, 1.5, 60, 1.37, 0, 0, 0, 0),
	('b3d8c352-557b-4cea-97d7-d05f3cd92945', 5048, 'Aardappel(product) gekruid voorgekookt koelvers', 'g', 80, 16.6, 0.6, 1.7, 0.4, 1.7, 284, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 9, 0.4, 19, 0.24, 0, 15, 0, 0),
	('f13c6ea8-449a-4a83-a183-7962b22ca757', 5049, 'Noten amandelen m vliesje ongezouten', 'g', 622, 5, 4.4, 25.4, 53.4, 10.2, 2, 'NEVO-online 2025/9.0', 'Noten en zaden', 248, 3, 232, 2.85, 0, 0, 0, 0),
	('f582afca-2e7a-4cb9-8ad0-acb67ee1d0e5', 5050, 'Noten para- gezouten', 'g', 687, 2.6, 2.3, 14.3, 67.1, 7.5, 400, 'NEVO-online 2025/9.0', 'Noten en zaden', 160, 3.1, 350, 4.06, 0, 1, 0, 0),
	('1ba4a86c-83e5-43bf-a661-cf50a8aed5ed', 5051, 'Biscuit melk- AH/Jumbo', 'g', 488, 62, 21.3, 9.9, 21, 5.5, 183, 'NEVO-online 2025/9.0', 'Gebak en koek', 425, 8.1, 28, NULL, 0.1, 0, 0, 0),
	('19a87cf7-7d3b-4fec-bb2b-c837cc280e82', 5054, 'Thee automaat- m suiker', 'g', 15, 3.7, 3.7, 0, 0, 0, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0.01, 0, 0, 0, 0),
	('b63cbb20-c0fc-4723-bf08-095f754a2b11', 5059, 'Koffie automaat- m suiker', 'g', 16, 3.8, 3.8, 0.2, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 3, 0.2, 6, 0.01, 0, 0, 0, 0),
	('2c387146-1fab-4204-abab-238b8c2651a7', 5062, 'Soep tomaten- m vermicelli', 'g', 24, 3.6, 1.6, 0.8, 0.6, 0.8, 336, 'NEVO-online 2025/9.0', 'Soepen', 8, 0.4, 6, 0.16, 0, 8, 0, 0),
	('4226b10b-e903-449d-ad3b-1c75622cc420', 5063, 'Biscuit ontbijt- Liga Belvita', 'g', 446, 67.7, 23, 7.7, 14.8, 5.5, 417, 'NEVO-online 2025/9.0', 'Gebak en koek', 300, 5, 148, 1.35, 0, 0, 0, 0),
	('bfca54c9-0e24-4a8b-a1d8-232b028b5ca1', 5064, 'Kikkers/muizen fondant m chocolade', 'g', 393, 84.7, 77.5, 1, 5.3, 0.9, 49, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 7, 0.5, 13, 0.17, 0, 0, 0, 0),
	('de4c8147-a6b4-49a6-882e-21bf956196f4', 5065, 'Sap vruchten- Healthy People Cranberry', 'g', 49, 12, 11.7, 0.1, 0, 0, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 11, 0.2, 9, 0.07, 0, 6, 0, 0),
	('46726c0b-0d63-4ca9-9efa-0a1227e5fe17', 5068, 'Bier Radler alcoholvrij', 'g', 34, 8.3, 7.2, 0.2, 0, 0, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 2, 0.01, 0, 2, 0, 0),
	('801b3a96-6695-4d17-a5d3-c092882433d4', 5072, 'Rijst noten- rauw m geconfijt fruit, noten en zaden', 'g', 385, 51.7, 5.1, 7.9, 15.1, 5.6, 52, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 39, 1.8, 113, 2.62, 0, 0, 0, 0),
	('c61155a6-a6b4-4bba-b0ab-97f528db2865', 5074, 'Salade kaas- lunch/borrel', 'g', 422, 6.8, 4.3, 9, 39.4, 0.4, 656, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 275, 0.3, 23, 1.26, 0.1, 0, 0, 0),
	('966a83b0-2524-4146-9c90-35fe84ff09ef', 5079, 'Perzik m schil', 'g', 40, 7.2, 7.2, 1, 0.1, 2, 1, 'NEVO-online 2025/9.0', 'Fruit', 7, 0.4, 9, 0.1, 0, 31, 0, 0),
	('63783d9d-a953-4498-9e4d-c5981b0ae978', 5082, 'Vruchtendrank sap m water', 'g', 22, 5, 4.9, 0.2, 0, 0.1, 2, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 8, 0.1, 5, 0.03, 0, 6, 0, 0),
	('a286fafd-e4e9-46a1-9f8f-3bd6d6708e73', 5083, 'Koek ontbijt- m chocolade', 'g', 316, 67.1, 39.4, 2.8, 3.3, 3.5, 207, 'NEVO-online 2025/9.0', 'Gebak en koek', 27, 0.9, 19, 0.68, 0.1, 0, 0, 0),
	('49ba0c30-ca83-4c01-832c-5d846eed3438', 5084, 'Pap Nestle Pyjamapapje kant-en-klaar', 'g', 83, 12.3, 6.5, 2.3, 2.7, 0.4, 25, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 117, 2, NULL, 0.79, 1.6, 13, 0, 0),
	('f2f615fc-79d0-4b2b-b3ba-37b284f98e4b', 5088, 'Gehakt rul vegetarisch obv soja onbereid verrijkt m ijzer en vit B12 De Vegetarische Slager', 'g', 125, 2.9, 2, 24, 0.5, 6.4, 520, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 140, 7, 110, 0.96, 0, 0, 0, 0),
	('1fce4f30-8d9c-4013-907c-a8101eb281b9', 5089, 'Suiker poeder-', 'g', 396, 99, 99, 0, 0, 0, 4, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', NULL, 0.1, 2, 0.01, 0, 0, 0, 0),
	('aa58cd79-1c84-4eca-aa96-b8c9fd7d6698', 5091, 'Chocolade gevuld m karamel Rolo', 'g', 477, 68.4, 58.7, 4.4, 20.4, 1.2, 120, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 84, 1.6, 26, 0.56, 0, 1, 0, 0),
	('284596ff-5d33-4092-9372-94b7caa061ef', 5094, 'Varkensrollade (vleeswaar)', 'g', 129, 1.1, 0.8, 19.7, 5.1, 0.1, 969, 'NEVO-online 2025/9.0', 'Vleeswaren', 8, 0.7, 22, 1.7, 0.1, 25, 0, 0),
	('7e354635-131f-4ade-a1dd-c481fe094ceb', 5095, 'Cracker mini- naturel', 'g', 442, 69.3, 2.1, 10.9, 12.9, 2.7, 625, 'NEVO-online 2025/9.0', 'Brood', 110, 1.7, 25, 0.7, 0, 0, 0, 0),
	('989b3120-0509-4506-8795-8717d4f24874', 5098, 'Cracker mini- m smaakje', 'g', 435, 68.3, 1.8, 10.4, 12.6, 3.5, 1026, 'NEVO-online 2025/9.0', 'Brood', 110, 1.7, 25, 0.7, 0, 0, 0, 0),
	('c63f85d7-827a-41dc-b17b-4e96403c189a', 5099, 'Aardappelschijfjes/-partjes ed gekruid diepvries onbereid', 'g', 134, 21.2, 0.6, 2.5, 3.8, 2.5, 201, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 6, 0.5, 22, 0.36, 0, 13, 0, 0),
	('aad66d1f-3846-478f-884b-801ac5560486', 5100, 'Tapenade v tomaten', 'g', 291, 12.2, 10.5, 3.1, 24.7, 4, 960, 'NEVO-online 2025/9.0', 'Hartige sauzen', 25, 1.3, 41, 0.41, 0, 21, 0, 0),
	('4a238ce2-8a2c-48cd-8e1c-fbdbdfb34cd9', 5101, 'Drink rijst- z suiker', 'g', 65, 13.7, 5.5, 0.3, 1, 0.3, 30, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 4, 0, 2, 0.04, 0, 0, 0, 0),
	('8747aba3-75d9-4809-acfa-964763f9658b', 5102, 'Aioli', 'g', 726, 2.9, 2, 1.5, 78.6, 0.1, 432, 'NEVO-online 2025/9.0', 'Hartige sauzen', 13, 0.5, 2, 0.29, 0.2, 0, 0, 0);
INSERT INTO public.nutrition_foods VALUES
	('c9ed4826-d796-432d-8964-a8857f8807de', 5104, 'Knackebrod Oerknack Bolletje', 'g', 427, 60.3, 5.1, 15, 12.3, 7.5, 408, 'NEVO-online 2025/9.0', 'Brood', 100, 2.3, 70, 1.8, 0, 0, 0, 0),
	('b69024df-d7a3-4ed1-bf08-5882ef54b6dd', 5106, 'Beschuit boeren-', 'g', 440, 56, 6, 16, 15, 8.5, 220, 'NEVO-online 2025/9.0', 'Brood', 43, 3, 161, 1.92, 0, 0, 0, 0),
	('da08366f-ea66-41e7-b8e3-b5b12b6d1d89', 5110, 'Noten wal- gezouten', 'g', 706, 5.1, 2.9, 15.9, 68.1, 4.6, 400, 'NEVO-online 2025/9.0', 'Noten en zaden', 117, 3.4, 196, 3.4, 0, 0, 0, 0),
	('6d313b0f-dd31-4fca-bf16-4c259beecd8a', 5111, 'Noten macadamia gezouten', 'g', 753, 5.4, 4.1, 7.8, 76.1, 8, 384, 'NEVO-online 2025/9.0', 'Noten en zaden', 70, 2.7, 118, 1.29, 0, 1, 0, 0),
	('e0c2235d-eb5f-424f-bb04-ac7dd16fef13', 5112, 'Noten pistache ongezouten', 'g', 592, 10.8, 5.7, 23.8, 48.3, 9.5, 6, 'NEVO-online 2025/9.0', 'Noten en zaden', 131, 4.3, 136, 2.9, 0, 0, 0, 0),
	('e11e603b-a4c1-4716-9d85-8321b877a282', 5113, 'Noten amandelen m vliesje gezouten', 'g', 622, 5, 4.4, 25.4, 53.4, 10.2, 201, 'NEVO-online 2025/9.0', 'Noten en zaden', 248, 3, 232, 2.85, 0, 0, 0, 0),
	('2897a111-9a1b-413f-b660-3dbfd757d215', 5116, 'Drink amandel- m suiker verrijkt m calcium en vitamines', 'g', 23, 2.9, 2.9, 0.4, 1.1, 0.2, 50, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 119, 0.1, 5, 0.06, 0.7, 0, 0, 0),
	('947582da-0189-4750-a3f0-812548bf83e8', 5119, 'Drink amandel- z suiker verrijkt m calcium en vitamines', 'g', 13, 0.5, 0.4, 0.3, 1.1, 0.2, 59, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 86, 0, 3, 0.03, 0.8, 0, 0, 0),
	('03edf202-d1a3-465c-b5c0-90e4ea56ee26', 5120, 'Kiwi gem', 'g', 64, 11.4, 11, 1, 0.6, 2, 3, 'NEVO-online 2025/9.0', 'Fruit', 26, 0.4, 13, 0.17, 0, 98, 0, 0),
	('b6dc1174-272b-4de9-9400-043007b0dce7', 5121, 'Guacamole', 'g', 153, 2.5, 1.2, 1.7, 14.5, 2.6, 240, 'NEVO-online 2025/9.0', 'Hartige sauzen', 18, 0.4, 21, 0.49, 0, 7, 0, 0),
	('4074a310-7663-428d-a9da-328d053ad0c0', 5122, 'Glazuur suiker-', 'g', 354, 88.4, 88.4, 0, 0, 0, 4, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 1, 0.1, 2, 0.01, 0, 0, 0, 0),
	('96fc6520-7aa9-4358-8d53-8acaf64d4e07', 5126, 'Ontbijtproduct Cornflakes Plus/1 de Beste', 'g', 375, 83, 5.9, 7.8, 0.5, 3.8, 360, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 3, 7, 10, 0.19, 0, 0, 0, 0),
	('6fd87c2d-f3a4-48b4-80c1-0b9aa45d4cb5', 5127, 'Boterproduct melange gezouten', 'g', 675, 0.9, 0.8, 0.7, 74.3, 0, 440, 'NEVO-online 2025/9.0', 'Vetten en oliën', 26, 0.1, 3, 0.11, 0.2, 0, 0.05, 0),
	('fd169ceb-2ba0-4ce9-9c2b-3637bc0f8963', 5133, 'Ontbijtproduct Honey hoops Crownfield', 'g', 386, 76.8, 19.7, 9.1, 3, 7.7, 80, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 18, 1.9, 61, 1.31, 0, 1, 0, 0),
	('0ad920ec-d295-4067-915b-ea510df485ef', 5134, 'Ontbijtproduct Chocoschelpjes G''woon', 'g', 381, 75.6, 19.9, 10, 2.9, 6.4, 288, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 26, 3.1, 62, 1.33, 0, 0, 0, 0),
	('6ceb997a-b890-4923-95a8-f93fac2e5c6c', 5139, 'Siroop vruchtenlimonade- m zoetstof Karvan Cevitam', 'g', 25, 5.9, 5.5, 0.2, 0, 0.1, 67, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 7, 0.1, 3, 0.02, 0, 38, 0, 0),
	('742778bd-f097-45e3-a5f4-7311a5c8de06', 5140, 'Wafel rijst- m vruchtensmaak Organix', 'g', 390, 88, 9.6, 6.8, 1.1, 0.3, 2, 'NEVO-online 2025/9.0', 'Brood', 14, 0.7, 100, 1.5, 0, 0, 0, 0),
	('26ee5a72-b531-4de1-adab-688dbadc0fb9', 5141, 'Tzatziki', 'g', 156, 4.1, 3, 4, 13.4, 0.6, 385, 'NEVO-online 2025/9.0', 'Hartige sauzen', 88, 0.1, 10, 0.36, 0, 1, 0.01, 0),
	('83630145-bc43-4dda-88f5-71866213d975', 5143, 'Cake madeleine cakereepjes Lotus', 'g', 424, 49.4, 22.2, 6.2, 21.4, 4.5, 328, 'NEVO-online 2025/9.0', 'Gebak en koek', 21, 0.9, 10, 0.55, 2.3, 0, NULL, NULL),
	('7ee0d103-6743-4ba3-9303-f6fc9d46e84d', 5146, 'Kruidnoten', 'g', 442, 77.1, 31.2, 5.8, 11.8, 2, 614, 'NEVO-online 2025/9.0', 'Gebak en koek', 48, 1, 20, 0.59, 0, 0, 0, 0),
	('22c1bbe1-0128-4de6-87c4-554e591d753b', 5147, 'Chocolade extra puur', 'g', 578, 27.2, 22.4, 9.2, 45.4, 11.8, 16, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 50, 3.2, 89, 1.3, 0, 1, 0, 0),
	('be145eb6-1278-4791-abaa-ba97d10bd9d3', 5149, 'Bakmix voor pannenkoeken meergranen-', 'g', 339, 63.8, 1, 11.4, 2, 10.2, 260, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 28, 2.5, 82, 1.82, 0, 1, 0, 0),
	('24d5ba52-cc68-4481-a6f0-84c001337be9', 5152, 'IJs room- m karamel en noten', 'g', 243, 29.8, 27.1, 3.2, 12.3, 0.3, 110, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 99, 0.1, 16, 0.41, 0, 0, 0.01, 0),
	('89166b12-a097-41c7-9184-15c41cd8497b', 5153, 'Saus oester-', 'g', 105, 24.3, 20.2, 1.5, 0.2, 0.3, 3347, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 25, 0.2, 4, 0.09, NULL, 0, 0, 0),
	('60e32fb4-1277-4855-bf3f-4004e14db6b0', 5156, 'Anijszaad', 'g', 384, 35.4, 31.5, 17.6, 15.9, 14.6, 16, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 646, 37, 170, 5.3, 0, 21, 0, 0),
	('9e273c18-35a4-4533-9789-f65c1de6e7ac', 5158, 'Noten pecan- gebrand m olie gezouten', 'g', 750, 4.3, 4, 9.2, 75.2, 9.5, 272, 'NEVO-online 2025/9.0', 'Noten en zaden', 67, 2.5, 121, 4.53, 0, 1, 0, 0),
	('71e3f034-9225-48bd-bade-c6c47beac21e', 5160, 'Rijst noten- gekookt m geconfijt fruit, noten en zaden', 'g', 206, 30.8, 3, 5.6, 6.3, 2, 7, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 26, 0.9, 59, 1.33, 0, 0, 0, 0),
	('01353d50-dc5c-4312-9fc2-cfbef01fe13b', 5163, 'Gehaktbal varkens- m ei en paneermeel rauw', 'g', 187, 5.1, 0.5, 19.1, 9.9, 0.6, 194, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 11, 1, 27, 2.17, 0.4, 17, 0.01, 0.01),
	('8bc92825-9164-4a52-b17b-d57ecb4b2bcd', 5164, 'Ontbijtproduct Honingringetjes 1 de Beste', 'g', 381, 76.7, 19.4, 9, 2.8, 6.5, 256, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 25, 7, 71, 1.71, 0, 0, 0, 0),
	('4208bba7-0e17-4c9c-a68c-87f1019d1a1f', 5165, 'Worst met-', 'g', 484, 2.7, 1.4, 22.3, 42.5, 0.8, 1379, 'NEVO-online 2025/9.0', 'Vleeswaren', 29, 1.5, 16, 2.34, 0.9, 9, 0, 0),
	('4a0c6203-797e-43d0-8967-67e3f68c10f3', 5167, 'Bonen black eyed blik/glas', 'g', 126, 18.9, 0.3, 7.8, 0.9, 5.7, 100, 'NEVO-online 2025/9.0', 'Peulvruchten', 51, 1.7, 43, 1.18, 0, 2, 0, 0),
	('7517c3c9-8f51-4571-af98-cd20c5f2baa7', 5168, 'Bonen bruine gekookt', 'g', 108, 15.2, 0.5, 6.1, 0.7, 8.1, 2, 'NEVO-online 2025/9.0', 'Peulvruchten', 44, 2.3, 40, 0.71, 0, 0, 0, 0),
	('de678c04-29c2-47da-8bd2-1da02a00ee27', 5169, 'Linzen bruine blik/glas', 'g', 112, 15.6, 0.2, 7.6, 0.8, 5.8, 109, 'NEVO-online 2025/9.0', 'Peulvruchten', 39, 2.3, 23, 1, 0, 6, 0, 0),
	('e83a40b2-5f65-4c06-80f2-0487b8383dd8', 5170, 'Bonen cannellini blik/glas', 'g', 113, 15, 0.6, 7.1, 1.1, 7.1, 106, 'NEVO-online 2025/9.0', 'Peulvruchten', 69, 2.7, 43, 0.93, 0, 0, 0, 0),
	('115f6e92-3977-42be-9c67-b4ff7e0b28bb', 5171, 'Bonen chili- blik/glas', 'g', 106, 15.8, 2.8, 6.3, 0.8, 5.1, 283, 'NEVO-online 2025/9.0', 'Peulvruchten', 43, 1.6, 36, 0.66, 0, 0, 0, 0),
	('343ccc92-dc9e-4ef0-9467-881b015d8106', 5172, 'Kapucijners jonge blik/glas', 'g', 93, 13.2, 1.3, 5.7, 0.7, 5.5, 132, 'NEVO-online 2025/9.0', 'Peulvruchten', 37, 1.2, 24, 0.82, 0, 3, 0, 0),
	('80422ffb-8a9f-47bf-8503-2c3e282bb279', 5173, 'Bonen kidney- rode gekookt', 'g', 115, 13.9, 0.9, 8.3, 0.7, 9.8, 2, 'NEVO-online 2025/9.0', 'Peulvruchten', 60, 2.3, 52, 1.26, 0, 0, 0, 0),
	('ac7cad01-f364-4c60-8ce6-8f052b4b7204', 5174, 'Linzen rode gekookt', 'g', 110, 16.1, 0.4, 7.7, 0.6, 4.8, 2, 'NEVO-online 2025/9.0', 'Peulvruchten', 12, 2.6, 27, 1.37, 0, 0, 0, 0),
	('d9fc268a-0347-4217-992c-3e47c90283c6', 5175, 'Bonen witte gekookt', 'g', 113, 13.4, 0.6, 7.8, 1, 9.9, 2, 'NEVO-online 2025/9.0', 'Peulvruchten', 65, 2, 48, 1.05, 0, 0, 0, 0),
	('d79b096e-ca69-4507-aa45-f615b0fa95ed', 5176, 'Bonen zwarte blik/glas', 'g', 113, 14.1, 0.8, 7.9, 1, 8, 95, 'NEVO-online 2025/9.0', 'Peulvruchten', 74, 2.2, 42, 1.03, 0, 0, 0, 0),
	('41b24ecc-c425-4250-8e39-9fb725ca8623', 5177, 'Soep erwten- m vlees', 'g', 77, 6.3, 0.5, 4.9, 3, 2.8, 166, 'NEVO-online 2025/9.0', 'Soepen', 16, 1.1, 15, 0.44, 0, 1, 0, 0),
	('00efaa74-a1e4-4f74-a011-eebdfe1da657', 5182, 'Berenklauw bereid m vloeibaar frituurvet', 'g', 213, 4.9, 1.4, 10.3, 16.6, 1.2, 648, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 16, 0.9, 15, 1.75, 0.3, 6, NULL, NULL),
	('91d3b7f3-a4ac-4e84-a2f5-881f58638f3e', 5183, 'Kipkorn bereid m vloeibaar vet', 'g', 381, 16.5, 0.9, 11.6, 29.7, 0.8, 640, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 6, 0.5, 12, 0.91, 0, 0, 0, 0),
	('7aaa4a33-316e-409c-9205-166f1bf4a242', 5195, 'Vet kippen-', 'g', 900, 0, 0, 0, 100, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0.5, 0, 0, 0, 0),
	('cb3a25dd-ead3-4f2c-9d02-f715b41fbd0b', 5196, 'Olie palmpit-', 'g', 899, 0, 0, 0, 99.9, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0.4, 0, 0, 0, 0, 0, 0),
	('9afa9205-ac5c-4c22-969c-c69b85e1101a', 5197, 'Peuterplusmelk Nutrilon 6 p 100 ml', 'ml', 46, 6, 4.7, 1.2, 1.7, 0.8, 18, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 110, 1.1, 9, 0.82, 2.9, 14, NULL, 0.01),
	('8f1e6f6f-b0b5-4706-a794-39d457d1a54b', 5198, 'Zuigelingenvoeding Hero Baby Nutrasense Standaard 1 p 100 ml', 'ml', 66, 7.2, 7.1, 1.3, 3.5, 0.3, 16, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 44, 0.4, 4, 0.4, 1.2, 11, NULL, 0.01),
	('33234a58-3f0c-48c0-a76e-428046a9c1ae', 5199, 'Opvolgmelk Hero Baby Nutrasense Standaard 2 p 100 ml', 'ml', 70, 9.5, 6.7, 1.4, 2.9, 0.2, 24, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 60, 1.2, 8, 0.7, 1.3, 13, NULL, 0),
	('e625fd8a-404c-4232-87e6-22821bcdef07', 5200, 'Peutermelk Hero Baby Nutrasense 3 p 100 ml', 'ml', 62, 8.2, 5.5, 1.3, 2.6, 0.2, 24, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 108, 1, 7, 0.67, 1.5, 11, NULL, 0),
	('1ae5af57-5147-4112-a248-f07c3d9ee7f9', 5201, 'Peutermelk Hero Baby Nutrasense 4 p 100 ml', 'ml', 50, 6.7, 4.5, 1.1, 2.1, 0.1, 19, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 88, 0.8, 5, 0.54, 1.2, 9, NULL, 0),
	('8f1cb6d3-e7c0-4d48-aa29-82c08aae12c3', 5202, 'Zuigelingenvoeding Hipp Biologisch Combiotik 1 p 100 ml', 'ml', 66, 7.3, 7.2, 1.3, 3.5, 0.3, 20, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 50, 0.5, 5, 0.5, 1.2, 10, NULL, NULL),
	('47084ffc-f87e-484f-969e-077bd366ffbd', 5203, 'Opvolgmelk Hipp Biologisch Combiotik 2 p 100 ml', 'ml', 70, 7.9, 7.8, 1.5, 3.5, 0.4, 20, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 73, 1, 6, 0.5, 1.2, 10, NULL, NULL),
	('06e3ffca-a6dd-4c1b-ad79-8fdc2303298e', 5204, 'Opvolgmelk Hipp Biologisch Combiotik 3 p 100 ml', 'ml', 66, 8, 7.8, 1.4, 3, 0.5, 20, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 80, 1.2, 7, 0.7, 1.3, 10, NULL, NULL),
	('057000e2-7816-493d-b121-8db6bc2586df', 5205, 'Zuigelingenvoeding Jumbo Standaard 1 p 100 ml', 'ml', 67, 7.4, 7.3, 1.4, 3.4, 0.6, 21, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 51, 0.5, 6, 0.5, 1.2, 11, NULL, 0.01),
	('ef7feab3-7d6e-4719-b898-5c841b901974', 5206, 'Opvolgmelk Jumbo Standaard 2 p 100 ml', 'ml', 69, 8.8, 8.6, 1.4, 3, 0.6, 20, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 60, 1, 6, 0.5, 1.4, 10, NULL, 0.01),
	('611ef692-c256-4426-a11f-f7a1f6f3194d', 5207, 'Opvolgmelk Jumbo Standaard 3 p 100 ml', 'ml', 70, 8.8, 6.5, 1.5, 3.1, 0.6, 23, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 65, 1, 6, 0.5, 1.5, 10, NULL, 0.01),
	('15b6d555-e4e6-4eae-a91b-7b8d21da0ec4', 5208, 'Dreumesmelk Jumbo Standaard 4 p 100 ml', 'ml', 66, 8.4, 6.2, 1.5, 2.8, 0.8, 24, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 92, 1.2, 6, 0.9, 1.7, 15, NULL, 0.01),
	('955cbaba-820b-40c4-94bf-243e1bb8a33f', 5209, 'Peutermelk Jumbo Standaard 5 p 100 ml', 'ml', 62, 8.2, 6.1, 1.2, 2.5, 0.8, 20, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 75, 1.2, 5, 0.9, 1.8, 17, NULL, 0.01),
	('dbe9c36a-e79c-490a-8e3f-7f956ce23160', 5210, 'Zuigelingenvoeding Albert Heijn Standaard 1 p 100 ml', 'ml', 66, 7, 7, 1.4, 3.5, 0.4, 19, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 45, 0.7, 5, 0.58, 1.1, 13, NULL, 0.01),
	('8e1eb6d4-2a52-4082-a8ac-523630804b26', 5211, 'Opvolgmelk Albert Heijn Standaard 2 p 100 ml', 'ml', 65, 7.9, 5.9, 1.6, 2.9, 0.4, 27, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 74, 1.1, 7, 0.81, 1.1, 14, NULL, 0.01),
	('a1388209-7c35-46ef-a501-110286da1390', 5212, 'Opvolgmelk Albert Heijn Standaard 3 p 100 ml', 'ml', 69, 8.4, 6.7, 1.9, 3, 0.4, 32, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 81, 1, 9, 0.8, 1.2, 15, NULL, 0.01),
	('e2e2cef2-6679-4cbe-9498-4eedca69e324', 5213, 'Dreumesmelk Albert Heijn Standaard 4 p 100 ml', 'ml', 69, 8.8, 6.1, 1.6, 3, 0.3, 19, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 76, 1, 4, 0.58, 1.2, 11, NULL, NULL),
	('b964b7b2-ab0b-4ea9-94d0-c67aa09dbc3e', 5214, 'Zuigelingenvoeding Albert Heijn Biologisch Standaard 1 p 100 ml', 'ml', 67, 7.2, 7.2, 1.5, 3.6, 0, 26, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 49, 0.8, 7, 0.62, 1, 13, NULL, NULL),
	('ea90f323-c1dc-49fa-bf96-1c5b64695d87', 5215, 'Opvolgmelk Albert Heijn Biologisch Standaard 2 p 100 ml', 'ml', 68, 7.5, 5.3, 1.7, 3.5, NULL, 26, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 65, 1, 6, 0.81, 1.1, 14, NULL, NULL),
	('917518f9-606b-4c9e-981a-ec1e9e9fd432', 5216, 'Opvolgmelk Albert Heijn Biologisch Standaard 3 p 100 ml', 'ml', 69, 7.7, 4.5, 1.9, 3.4, 0, 29, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 76, 1, 7, 0.83, 1.1, 14, NULL, NULL),
	('34e9727e-4f65-4a97-9c81-c5c9fa797560', 5217, 'Zuigelingenvoeding Bonbebe Standaard 1 p 100 ml', 'ml', 67, 7.6, 7, 1.3, 3.3, 0.6, 20, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 51, 0.6, 6, 0.53, 1.2, 10, NULL, 0.01),
	('31eae07f-6141-44b5-aceb-e08c0ece6db3', 5218, 'Opvolgmelk Bonbebe Standaard 2 p 100 ml', 'ml', 69, 8.9, 6.5, 1.4, 3, 0.6, 23, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 61, 1.1, 6, 0.8, 1.4, 10, NULL, 0.01),
	('d3cb6e38-a29d-457b-9305-612072002b2f', 5219, 'Opvolgmelk Bonbebe Standaard 3 p 100 ml', 'ml', 71, 9, 6.5, 1.5, 3.1, 0.6, 23, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 61, 1.1, 7, 0.8, 1.5, 11, NULL, 0.01),
	('004364df-13b6-43f2-9f70-c2d710a3cb8e', 5220, 'Dreumesmelk Bonbebe Standaard 4 p 100 ml', 'ml', 68, 8.9, 6.5, 1.5, 2.8, 0.8, 22, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 61, 1.2, 6, 0.93, 1.7, 15, NULL, 0.01),
	('35290d09-4afd-4e1d-b6cf-2d87e8f825b4', 5224, 'Zuigelingenvoeding Etos Standaard 1 p 100 ml', 'ml', 66, 7, 7, 1.4, 3.5, 0.4, 19, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 45, 0.7, 5, 0.58, 1.1, 13, NULL, 0.01),
	('68f4f5c2-f27a-4805-a379-b541b5052f70', 5225, 'Opvolgmelk Etos Standaard 2 p 100 ml', 'ml', 65, 7.9, 5.9, 1.6, 2.9, 0.4, 27, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 74, 1.1, 7, 0.81, 1.1, 14, NULL, 0.01),
	('9e24b8a0-ab88-47ec-aadf-e38892699580', 5226, 'Opvolgmelk Etos Standaard 3 p 100 ml', 'ml', 69, 8.4, 6.7, 1.9, 3, 0.4, 32, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 81, 1, 9, 0.8, 1.2, 15, NULL, 0.01),
	('38851084-33f7-4e8f-bfba-b3e543aee700', 5227, 'Dreumesmelk Etos Standaard 4 p 100 ml', 'ml', 69, 8.8, 6.1, 1.6, 3, 0.3, 19, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 76, 1, 4, 0.58, 1.2, 11, NULL, NULL),
	('7221ed18-cedb-43aa-aa6c-1a54abf5bb17', 5228, 'Zuigelingenvoeding Etos Biologisch Standaard 1 p 100 ml', 'ml', 67, 7.2, 7.2, 1.5, 3.6, 0, 26, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 49, 0.8, 7, 0.62, 1, 13, NULL, NULL),
	('aeb34b9b-8ed0-4003-8cac-fca2cac17ae3', 5229, 'Opvolgmelk Etos Biologisch Standaard 2 p 100 ml', 'ml', 68, 7.5, 5.3, 1.7, 3.5, 0, 26, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 65, 1, 6, 0.81, 1.1, 14, NULL, NULL),
	('3d3c1310-48bb-4fd8-80ec-78f3827de290', 5230, 'Opvolgmelk Etos Biologisch Standaard 3 p 100 ml', 'ml', 69, 7.7, 4.5, 1.9, 3.4, 0, 29, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 76, 1, 7, 0.83, 1.1, 14, NULL, NULL),
	('30492b57-b409-41e1-8de3-48fa1fa1813a', 5234, 'Kaas Danish Blue', 'g', 350, 0, 0, 20.5, 29.5, 0, 1470, 'NEVO-online 2025/9.0', 'Kaas', 619, 0.1, 23, 4.04, 0.3, 0, 0.02, 0),
	('bfcb9eff-fb3c-4e91-bee5-9b727f683803', 5235, 'Melk halfvolle verrijkt m calcium en vit D', 'g', 47, 4.7, 4.7, 3.5, 1.6, 0, 47, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 170, 0, 12, 0.41, 0.7, 1, 0, 0),
	('337dcbe5-b09d-40f0-9eed-3ef99bf148db', 5236, 'Taart appel- zandtaardeeg gem', 'g', 225, 31.9, 20.9, 2.9, 9.1, 1.6, 89, 'NEVO-online 2025/9.0', 'Gebak en koek', 19, 0.8, 11, 0.25, 0.5, 2, 0.01, 0),
	('fa6c28c4-fc96-4f93-8daf-6245bb3cd00c', 5237, 'Cake naturel gem', 'g', 398, 42.8, 25.2, 5.7, 22.5, 1, 427, 'NEVO-online 2025/9.0', 'Gebak en koek', 25, 0.9, 10, 0.55, 1.8, 0, 0.01, 0),
	('fe24873a-d963-48d9-af68-9401b3d7ddd9', 5238, 'Bladerdeeg gem bereid', 'g', 500, 46.6, 0.3, 7.8, 30.9, 1.8, 620, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 18, 0.6, 12, 0.3, 0, 0, 0, 0.01),
	('9d84793a-bfdc-4b2c-bbd2-c609eec225b5', 5239, 'Cake appel- gem', 'g', 261, 30.5, 19.6, 3.5, 13.5, 1.3, 258, 'NEVO-online 2025/9.0', 'Gebak en koek', 17, 0.6, 7, 0.36, 1, 1, 0.01, 0),
	('815e13c0-ac21-44db-9483-880704852e04', 5240, 'Appelflap gem', 'g', 307, 39.3, 14.6, 3.6, 14.5, 1.7, 273, 'NEVO-online 2025/9.0', 'Gebak en koek', 12, 0.4, 9, 0.19, 0, 1, 0, 0),
	('8e154322-8ff6-4cab-a775-214a64834052', 5241, 'Irish coffee', 'g', 166, 6.7, 6.7, 0.7, 8.7, 0, 11, 'NEVO-online 2025/9.0', 'Alcoholische dranken', 21, 0.2, 5, 0.06, 0, 0, 0.01, 0),
	('3db73064-378d-4ef0-93c2-f3fff32db2b4', 5242, 'Cake chocolade- gem', 'g', 396, 46.5, 30.8, 5.7, 20.3, 2.3, 368, 'NEVO-online 2025/9.0', 'Gebak en koek', 25, 1.2, 29, 0.76, 1.8, 0, 0.01, 0),
	('b16209ef-0d04-4797-aa85-3a8d77c717d0', 5244, 'Kaasfondue huishoudelijk bereid', 'g', 323, 1.8, 0.8, 21.4, 24.2, 0, 356, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 699, 0.4, 14, 3.77, 0.2, 1, 0.01, 0),
	('9bd07d01-abff-45b7-8e98-58db4a4d31b1', 5245, 'Melk chocolade- halfvolle m zoetstof', 'g', 48, 4.5, 4.5, 3.3, 1.7, 0.5, 45, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 113, 0.6, 18, 0.49, 0.1, 0, 0, 0),
	('b8f15686-be20-4a74-9794-1008d8844083', 5246, 'Wijn alcoholvrij', 'g', 23, 5.3, 5.1, 0.1, 0.1, 0, 21, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 12, 1, 7, 0, 0, 0, 0, 0),
	('ef232b9c-8f07-4107-b638-839c68b6becb', 5247, 'Plantaardig alternatief voor yoghurt obv soja z suiker verrijkt m calcium en vitamines', 'g', 39, 0, 0, 4, 2.3, 0.9, 96, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 120, 0.5, 19, 0.32, 0.8, 0, 0, 0),
	('c08dfeb4-fd68-4f57-b0c2-68fc15a973a5', 5248, 'Cheesecake', 'g', 320, 24, 18.9, 5.4, 22.3, 0.6, 168, 'NEVO-online 2025/9.0', 'Gebak en koek', 108, 0.6, 11, 0.28, 0.4, 3, 0.02, 0),
	('b7e7b8bb-6062-4906-a028-3c0333a1c7ee', 5249, 'Popcorn zoute kant-en-klaar (gepoft m olie)', 'g', 505, 52.3, 0.8, 8.4, 27.1, 9, 735, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 8, 0.8, 63, 0.08, 0, 0, 0, 0.01),
	('cecef9d8-7ea8-4845-b7df-fd984804e839', 5251, 'Popcorn zoete kant-en-klaar (gepoft m olie)', 'g', 419, 84.7, 48.2, 4.7, 5.8, 4.6, 1, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 5, 0.6, 42, 0.05, 0, 0, 0, 0),
	('6599fe84-e196-4240-8f82-c09f9a2d3ee5', 5253, 'Azijn balsamico', 'g', 123, 25.3, 24.8, 0.7, 0, 0, 17, 'NEVO-online 2025/9.0', 'Diversen', 3, 0.1, 4, 0.1, 0, 0, 0, 0),
	('e31e4781-ffef-4741-bb24-33d3ef117e2a', 5254, 'Carrotcake', 'g', 357, 36.9, 25.6, 4.5, 20.9, 1.5, 220, 'NEVO-online 2025/9.0', 'Gebak en koek', 44, 0.6, 17, 0.44, 0.2, 1, 0.01, 0),
	('f11fe31e-0bf7-4613-9855-06d2d4f352fd', 5255, 'Bananenbrood', 'g', 298, 38.9, 20.7, 4.7, 13.2, 2.1, 224, 'NEVO-online 2025/9.0', 'Gebak en koek', 23, 0.8, 28, 0.52, 0.6, 3, 0.01, 0),
	('2d0a4c1a-f646-4e93-93a8-3464c7f4c76c', 5256, 'Paneermeel kruiden-', 'g', 343, 65.1, 12.3, 10.3, 3.7, 3.9, 4580, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 27, 2, 55, 1.3, 0, 0, 0, 0.02),
	('00a03236-83fd-4693-8815-dd381ba10b6d', 5257, 'Peper zoete gevuld m roomkaas', 'g', 161, 2.2, 2.2, 3.6, 15.2, 0.9, 430, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 100, 0.3, 10, 0.1, 0.1, 25, 0.01, 0),
	('48d0a0bc-805d-4b93-8ba0-513689276030', 5258, 'Hagelslag chocolade- mix wit en melk', 'g', 452, 74.2, 70.6, 5.8, 14.1, 2.4, 63, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 110, 4.3, 63, 1.05, 0, 0, 0, 0),
	('b1d61711-8267-43d9-b92c-d70741307084', 5260, 'Vlokken chocolade- mix wit en melk', 'g', 456, 74.5, 73.5, 5.9, 14.5, 1.8, 69, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 110, 4.4, 64, 0.31, 0, 0, 0, 0),
	('0b5f9f71-3268-4a2f-aa83-51449ea28106', 5261, 'Skyr m vruchten magere', 'g', 71, 7.9, 7.4, 9.3, 0, 0.1, 51, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 124, 0.1, 12, 0.53, 0, 0, 0, 0),
	('389bad72-d55f-47d3-af2d-7b4b5a402676', 5262, 'Bakmix voor cake naturel', 'g', 372, 85.7, 51.1, 5, 0.6, 2.1, 117, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 9, 0.5, 11, 0.27, 0, 0, 0, 0),
	('08061b2f-93ec-40b4-9950-3927158cb184', 5263, 'Bamigroenten rauw', 'g', 27, 3.5, 2.9, 1.8, 0.1, 2.2, 6, 'NEVO-online 2025/9.0', 'Groente', 27, 0.4, 11, 0.29, 0, 15, 0, 0),
	('7a9b5173-b6e9-4671-95f1-66585c521ce1', 5264, 'Cracker luchtige naturel', 'g', 380, 72, 5.2, 13, 3.5, 4.2, 514, 'NEVO-online 2025/9.0', 'Brood', 42, 3.3, 32, 0.5, 0, 0, 0, 0),
	('afc75fdb-7b2c-4a5e-8972-94518acba1ab', 5265, 'Tonijn m groente en tomatensaus in blik', 'g', 98, 4.8, 3.9, 11.7, 3.5, 0.6, 445, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 11, 0.9, 17, 0.49, 0.5, 1, 0.02, 0.1),
	('adda1261-7f21-4f40-ab5e-3f08d3592334', 5266, 'Zeevruchten bereid', 'g', 112, 4.6, 0.6, 16.9, 2.9, 0.1, 701, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 48, 1.7, 44, 1.51, 0, 0, 0.28, 0.38),
	('50e575ed-23ba-49dc-af99-eb16a08311aa', 5267, 'Groente roerbakmix champignon rauw', 'g', 25, 2.8, 2.2, 1.7, 0.3, 2.3, 7, 'NEVO-online 2025/9.0', 'Groente', 24, 0.5, 11, 0.33, 0, 13, 0, 0),
	('0dc0dd46-c11e-49e0-af79-925819cb208b', 5268, 'Groente roerbakmix Hollandse rauw', 'g', 27, 3.5, 2.8, 1.5, 0.3, 2.5, 11, 'NEVO-online 2025/9.0', 'Groente', 33, 0.4, 12, 0.3, 0, 34, 0, 0),
	('c65398e0-bfa4-46d4-ab87-8925b60e7457', 5269, 'Groente roerbakmix Italiaanse rauw', 'g', 28, 4.2, 3.5, 1.2, 0.2, 2.4, 7, 'NEVO-online 2025/9.0', 'Groente', 27, 0.4, 12, 0.32, 0, 34, 0, 0),
	('83f8d963-bf78-4d3b-9a00-d8078b9565ae', 5270, 'Groente roerbakmix oosterse rauw', 'g', 29, 3.9, 3.4, 1.7, 0.2, 2.5, 6, 'NEVO-online 2025/9.0', 'Groente', 29, 0.4, 11, 0.29, 0, 32, 0, 0),
	('7d4941e1-a27a-4109-bd90-051e6b23b194', 5271, 'Yoghurt Griekse magere', 'g', 56, 5, 5, 8.2, 0.1, 0, 59, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 0, 13, 0.61, 0, 1, 0, 0),
	('d2a6de01-0741-42dc-8a2b-68a02ab44494', 5272, 'Koek ontbijt- z suiker', 'g', 238, 53.2, 2.5, 2.9, 1.2, 17, 207, 'NEVO-online 2025/9.0', 'Gebak en koek', 17, 0.7, 16, 0.65, 0.1, 0, 0, 0),
	('460a3467-58b1-401d-982a-58cc56b6dfb9', 5273, 'Fruitreep m noten', 'g', 424, 47.6, 44.6, 7.8, 20.9, 6.5, 40, 'NEVO-online 2025/9.0', 'Gebak en koek', 96, 2.4, 112, 1.47, 0, 0, 0, 0),
	('88177810-2b51-4ccf-a99e-aeffa1c3918c', 5275, 'Pindakaas 100% pinda''s ongezouten', 'g', 611, 11.6, 5.7, 26.5, 49.1, 8.6, 1, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 56, 1.9, 216, 3.3, 0, 0, 0, 0),
	('0fd09222-ddfa-4d42-8206-8af26833ca53', 5277, 'Vet dierlijk gem', 'g', 897, 0, 0, 0, 99.7, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 0, 0, 0, 0.59, 0.5, 0, 0, 0),
	('fd48cbfb-096b-45c8-8a93-32875fe2781b', 5279, 'Vruchten bos- gem', 'g', 39, 6, 5.8, 0.9, 0.1, 2.6, 2, 'NEVO-online 2025/9.0', 'Fruit', 20, 0.9, 14, 0.2, 0, 43, 0, 0),
	('fdd58361-30c5-41dd-aded-64ad2de64619', 5280, 'Kalfsvlees gem rauw', 'g', 127, 0, 0, 21.3, 4.7, 0, 254, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 5, 1.1, 25, 3.13, 0.5, 3, 0, 0),
	('dc834dbe-fb3e-499b-ad50-9b6ecab80431', 5286, 'Zout bakkers- m toegevoegd jodium', 'g', 0, 0, 0, 0, 0, 0, 39000, 'NEVO-online 2025/9.0', 'Diversen', 2, 0.1, 0, 0.1, 0, 0, 0, 0),
	('f677ac88-943a-4cf2-b300-99a08abe23a7', 5290, 'Cacaopoeder magere', 'g', 332, 12.4, 0.5, 23.4, 11, 45, 20, 'NEVO-online 2025/9.0', 'Diversen', 150, 10.5, 525, 7, 0, 0, 0, 0),
	('67c7f96b-e985-4bc6-8b71-1e0a5353ad7b', 5292, 'Pasta noten- 100% noten ongezouten', 'g', 639, 10.9, 4.4, 19.8, 55.9, 6.6, 6, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 162, 4.5, 245, 3.72, 0, 1, 0, 0),
	('25937504-fcdb-44d6-9aac-3b86c971fe39', 5294, 'IJs yoghurt- m vruchten', 'g', 165, 23.9, 19.7, 2.6, 6.4, 0.9, 35, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 90, 0.1, 9, 0.32, 0, 5, 0, 0),
	('984b1758-daac-4163-ad87-da5463448872', 5295, 'Skyr naturel magere', 'g', 60, 3.7, 3.1, 10.6, 0, 0, 36, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 139, 0, 13, 0.59, 0, 0, 0, 0),
	('458dfcdc-442a-498a-9bc4-c660162f52e1', 5299, 'Bakmix voor appeltaart', 'g', 371, 82.3, 33.5, 6, 0.7, 5.8, 400, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 13, 0.6, 14, 0.36, 0, 0, 0, 0),
	('449549ba-a883-4724-ab35-9d3558ddccf6', 5300, 'Bakmix voor kwarktaart', 'g', 438, 77.5, 43.1, 7.7, 10.6, 1.1, 203, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 9, 0.5, 11, 0.27, 0, 0, 0, 0),
	('1430a9a7-613e-4413-9d90-e29611943018', 5304, 'Frites groente- voorgebakken diepvries onbereid', 'g', 142, 15, 5.9, 2.2, 7, 5.2, 155, 'NEVO-online 2025/9.0', 'Groente', 32, 0.4, 16, 0.34, 0, 7, 0, 0),
	('42f8dea1-0ed5-4f8f-9e8d-c76fbf39ca57', 5305, 'Soeppoeder 1-kops soep', 'g', 372, 54.2, 11.6, 9.6, 12.1, 4, 4485, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 99, 1.3, 28, 0.7, 0, 0, 0, 0),
	('7d797519-bb87-42f4-bc6e-f88dbe935d88', 5306, 'Melk volle lactosevrij', 'g', 64, 4.6, 4.6, 3.4, 3.6, 0, 44, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 0, 12, 0.46, 0, 0, 0, 0),
	('5f718e3f-b92c-451d-9f77-20e4c06b94c2', 5315, 'Zoetstof intensief obv koolhydraten als vulmiddel', 'g', 358, 85.7, 48, 2.8, 0.2, 1.1, 34, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0),
	('19becf40-1a3f-438f-adb5-f35d91334230', 5317, 'Witlof m ham en kaas uit de oven', 'g', 101, 1.8, 1.4, 8.1, 6.5, 0.7, 273, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 163, 0.3, 16, 1.05, 0.1, 5, 0, 0),
	('96b4de78-9554-4ec0-94ad-c220805066aa', 5318, 'Ratatouille bereid z vlees', 'g', 56, 3.3, 2.7, 1.1, 3.9, 1.7, 4, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 14, 0.5, 11, 0.22, 0, 15, 0, 0),
	('21402e42-6857-4aaf-b08d-704172af3922', 5319, 'Bonenschotel m groente in tomatensaus blik/glas/zak', 'g', 71, 9, 3.2, 3.4, 1.4, 4.2, 288, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 25, 1.1, 24, 0.5, 0, 14, 0, 0),
	('f4fef784-59c0-4605-92bb-48b53cb17cca', 5320, 'Stoofperen bereid m gezoet kookvocht', 'g', 58, 13.5, 11.6, 0.2, 0.1, 1.1, 1, 'NEVO-online 2025/9.0', 'Fruit', 5, 0.1, 4, 0.11, 0, 1, 0, 0),
	('d1ad2843-87ed-4347-841c-4a16e65198c4', 5321, 'Omelet/roerei', 'g', 161, 0.7, 0.7, 10.2, 13.1, 0, 123, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 69, 1.9, 14, 1.34, 1.4, 0, 0.03, 0),
	('6e03e06d-331b-46c3-9da3-75381c630eee', 5322, 'Omelet ham-kaas', 'g', 209, 0.8, 0.6, 11.5, 17.6, 0, 230, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 128, 1.5, 16, 1.5, 1.1, 2, 0.02, 0),
	('0a6e57e2-f48c-4d58-ab94-ac49a5d1548d', 5323, 'Omelet m aardappel Spaanse tortilla', 'g', 137, 8.1, 0.5, 6, 8.8, 1, 64, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 33, 1.3, 16, 0.85, 0.7, 4, 0.01, 0),
	('f1c020ef-0c1f-4325-96b8-5709a726ea64', 5324, 'Omelet m aardappel, groente en spek Spaanse tortilla', 'g', 126, 4.4, 1.1, 6.5, 8.9, 1.1, 247, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 40, 1, 16, 0.86, 0.5, 9, 0.01, 0),
	('1e993e72-b9fb-4c2c-abf2-0c16ff81970c', 5325, 'Bobotie z rijst', 'g', 129, 5.5, 3.5, 7, 8.5, 1.1, 265, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 33, 1, 17, 1.47, 0.2, 5, 0, 0),
	('551d5e65-4743-443f-a2a4-2be9c0f93fbe', 5326, 'Mosselen rauw', 'g', 67, 1.9, 0, 11.1, 1.7, 0, 402, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 39, 4.4, 38, 2.19, 0, 8, 0.21, 0.14),
	('8d4cc2b3-0431-4c12-ab73-8f7aa0ee63b4', 5328, 'Saus carbonara- huishoudelijk bereid', 'g', 284, 1, 1, 13.5, 25.1, 0, 537, 'NEVO-online 2025/9.0', 'Hartige sauzen', 170, 0.9, 17, 1.42, 0.8, 2, 0.02, 0),
	('2821de9c-c45b-44d7-9dee-a9ef92800b20', 5329, 'Hachee', 'g', 98, 4.7, 0.6, 8, 5.1, 0.6, 25, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 9, 0.9, 11, 2.36, 0.1, 1, 0, 0),
	('e7added2-5f03-4931-86ad-fa5601445241', 5330, 'Knoflook bereid z vet', 'g', 127, 23.8, 1.4, 5.6, 0.3, 2.7, 17, 'NEVO-online 2025/9.0', 'Groente', 11, 0.6, 21, 0.73, 0, 0, NULL, NULL),
	('902c6a19-857b-4c13-b42e-e77d08645455', 5337, 'Paprika gevuld m gehakt', 'g', 145, 6.5, 3.3, 5.7, 10.4, 1.4, 95, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 10, 0.6, 13, 0.97, 0.1, 65, 0, 0),
	('380cf65e-5d65-4622-90f8-51d2beec6eaf', 5339, 'Yoghurt geiten- volle', 'g', 74, 3.6, 3, 3.7, 4.7, 0, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 123, 0, 18, 0.41, 0, 0, 0, 0),
	('8b8a581e-c3e7-4705-b553-4ba1ee4adeea', 5340, 'IJs room- chocolade', 'g', 226, 28.6, 19.9, 3.5, 10.4, 1.9, 39, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 87, 1.7, 30, 0.59, 0.1, 0, 0, 0.01),
	('7d312faa-c81e-4322-9ca9-9aaac282dd38', 5341, 'Shaslick spies varkensvlees m groente bereid', 'g', 75, 1.5, 1.3, 12.8, 1.8, 0.7, 31, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 7, 0.7, 20, 1.43, 0.2, 15, 0, 0),
	('fbe6a34a-426f-4bf5-9a02-98d2c45a875c', 5342, 'Viscuisine koolvis m paneermeel-kruidenkorst bereid', 'g', 217, 10.4, 0.7, 16.3, 11.9, 1.3, 344, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 18, 0.5, 34, 0.52, 0, 0, 0.05, 0.1),
	('c2d92df0-f392-4e13-8994-db323f7a55d9', 5345, 'IJs room- vanille', 'g', 220, 24.9, 19.9, 3, 12, 0.6, 46, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 97, 0.1, 11, 0.3, 0, 0, 0.01, 0),
	('adbeb9ed-fdae-4364-a3de-4329a09c9c98', 5346, 'IJs vanille-', 'g', 212, 25.8, 20.2, 2.9, 10.7, 0.4, 52, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 91, 0, 11, 0.22, 0, 0, 0, 0),
	('0a9fd6d9-a8d9-47be-8e5d-c4d17767b746', 5347, 'IJs room- m vruchten', 'g', 194, 27.1, 22, 2.7, 8.1, 0.9, 40, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 90, 0.1, 12, 0.24, 0, 3, 0.01, 0),
	('75d01513-2026-45ea-a0e9-9518610a4fcb', 5348, 'IJs room/vanille- cornet m vruchten', 'g', 269, 40.5, 18.7, 3.1, 10.3, 0.9, 63, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 60, 0.6, 23, 0.28, 0.1, 1, 0, 0),
	('a2096a79-b3f9-4d25-9d4c-eb082f10d77d', 5349, 'Bakmix voor pannenkoeken volkoren-', 'g', 347, 62.3, 1, 12.2, 3.3, 9.9, 337, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 36, 2.9, 102, 2.06, 0, 1, 0, 0),
	('ea75a3fc-53c2-4c36-84d1-471816f6748f', 5352, 'Broodje gezond v witbrood', 'g', 218, 25.8, 1.8, 11.7, 7, 1.5, 401, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 154, 0.9, 21, 1.29, 0.3, 4, 0.01, 0),
	('4f1005d0-80dc-482f-99f2-469ee4e5fcd1', 5353, 'Mousse chocolade- kant-en-klaar', 'g', 189, 23.9, 20.4, 5.3, 7.5, 2.3, 49, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 120, 3.1, 38, 0.79, 0, 0, 0, 0),
	('392045d6-e0bd-4bd0-a2b2-37558b45fd73', 5354, 'Tosti ham-kaas v witbrood', 'g', 253, 27.7, 1.3, 12.7, 9.7, 1.5, 531, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 159, 0.6, 21, 1.28, 0.5, 5, NULL, NULL),
	('16aea79e-a558-46b7-86d6-a9fea660efc9', 5355, 'Broodje hamburger huishoudelijk bereid', 'g', 213, 13.6, 3.8, 10.8, 12.5, 1.3, 476, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 24, 1.2, 17, 2.09, 0.3, 6, 0, 0),
	('ab16f81c-1fb0-4d39-a088-485fd842ef71', 5356, 'Frikandel speciaal', 'g', 230, 9.2, 4.1, 10.2, 16.5, 1.7, 837, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 83, 1.6, 24, 1.13, 0.3, 2, 0, 0),
	('63efce75-4752-4475-b2d1-497c46169443', 5358, 'Salade Griekse z dressing', 'g', 81, 2.3, 2.2, 4.7, 5.6, 1.3, 365, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 52, 0.6, 9, 0.85, 0, 18, 0, 0),
	('95d1a27c-4cdf-4937-91b1-9eeeb8290ec1', 5359, 'Risotto bereid', 'g', 196, 25.6, 0.3, 5.8, 7.6, 0.7, 280, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 92, 0.2, 12, 0.9, 0, 0, 0, 0),
	('515cd768-ff06-4640-a567-e93885c4cba9', 5360, 'Sushi m zalm en komkommer', 'g', 133, 22.8, 2.2, 5.5, 1.8, 1.2, 49, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 18, 1, 21, 0.72, 1.1, 2, 0.08, 0.11),
	('d96b393b-9f9a-48bb-8d9d-ef091c5e7e9c', 5363, 'Wrap m kip', 'g', 166, 16.6, 2.3, 13.2, 4.8, 1.8, 316, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 28, 0.6, 23, 0.51, 0.1, 10, 0, 0),
	('a2422c39-c481-4783-84a9-86d602104d34', 5364, 'Aardpeer rauw', 'g', 75, 13.4, 1.5, 2, 0.5, 4.3, 5, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 38, 1.4, 10, 0.24, 0, 2, NULL, NULL),
	('892dcd67-1dbd-41f5-97f3-3e21eee5a78b', 5369, 'Meloen gem', 'g', 31, 6.9, 6.9, 0.5, 0, 0.5, 10, 'NEVO-online 2025/9.0', 'Fruit', 13, 0.6, 15, 0.18, 0, 11, 0, 0),
	('e9e9a1d1-762f-4559-84d3-aaa260168224', 5370, 'Candybar gem', 'g', 478, 65.1, 54, 5.4, 21.5, 1.5, 168, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 105, 1.5, 39, 0.73, 0, 0, 0, 0),
	('b4c4313d-e180-4dfc-8df3-ee39dbe421f5', 5371, 'Pindarotsjes', 'g', 582, 31, 25.5, 15.8, 42.6, 5.9, 21, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 82, 2.6, 141, 2.23, 0, 0, 0, 0),
	('b7254db5-becd-4ce0-a65f-c4055d975505', 5372, 'Snoepmix', 'g', 328, 75.3, 52.2, 5.8, 0.3, 0.5, 60, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 54, 1.4, 14, 0.14, 0, 0, 0, 0),
	('83818054-9b0e-48da-ab6f-a986a477c3d2', 5376, 'Siroop vruchtenlimonade- m suiker en zoetstof 30-35 g KH', 'g', 134, 33.4, 32.8, 0, 0, 0, 0, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 0, 0, 4, 0.05, 0, 0, 0, 0),
	('a5e3ac07-c83f-49a6-810b-e9addee7edad', 5378, 'Wentelteefje v wit tarwebrood', 'g', 199, 24.7, 6.8, 5.9, 8.3, 1, 227, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 67, 0.5, 14, 0.53, 0.7, 0, 0, 0),
	('bcd1d6b2-0178-42ad-9832-567ac208fcc5', 5382, 'Pannenkoek spek- koelvers', 'g', 210, 18.6, 1.6, 6.6, 11.9, 1, 487, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 38, 0.4, 11, 0.64, 0.2, 0, 0, 0),
	('1d90c955-f937-4f50-9ca5-3aba5fa53806', 5386, 'Salade nicoise m dressing', 'g', 75, 2.5, 2.1, 4.4, 4.8, 2.1, 182, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 39, 1.3, 18, 0.54, 0.3, 16, 0.04, 0.05),
	('7959e564-a0cc-4a76-abcb-760b910d9afe', 5393, 'Pastagerecht carbonara huishoudelijk bereid', 'g', 182, 20.2, 0.8, 7.5, 7.6, 1, 153, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 59, 0.8, 19, 0.86, 0.2, 1, 0.01, 0),
	('77cc2f54-81e3-4d31-9eab-3bf83fa7b171', 5394, 'Frites speciaal', 'g', 249, 25.6, 3.3, 2.6, 14.5, 2.8, 130, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 11, 0.4, 19, 0.32, 0, 13, 0, 0),
	('d3fe5216-219b-4c10-a6f4-e69dd4d6b17f', 5395, 'Frites m sauzen en uitjes', 'g', 255, 25.3, 3.3, 3.1, 15.1, 2.8, 134, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 12, 0.5, 22, 0.37, 0, 13, 0, 0.01),
	('bb0cfadd-123f-4b11-a9fa-76bf8f4224da', 5396, 'Frites kapsalon', 'g', 216, 8.8, 1.9, 9.6, 15.6, 1.2, 336, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 37, 0.7, 19, 1.34, 0.2, 7, 0, 0),
	('d185ed16-dc2e-465d-9c80-ebe6f1217ae3', 5397, 'Noodles instant onbereid', 'g', 461, 64.6, 5, 10.2, 17.2, 3.6, 1493, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 17, 1.8, 45, 1.22, 0, 1, 0, 0),
	('b936eaf9-5e30-4136-b628-3c6dafe67e2a', 5398, 'Quiche Lorraine', 'g', 296, 14.4, 0.9, 11.7, 20.9, 0.8, 512, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 179, 0.8, 17, 1.38, 0.5, 1, 0.01, 0),
	('8838e147-ae14-4d12-abc8-da3087e01283', 5401, 'Stamppot boerenkool m rookworst en spekjes', 'g', 137, 9.4, 0.3, 5.2, 8.4, 1.6, 251, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 56, 0.8, 16, 0.78, 0.2, 14, 0, 0),
	('db6ba4e3-777f-42cf-8142-a3a25b333ad7', 5402, 'Stamppot rauwe andijvie m gehaktbal en spekjes', 'g', 101, 11.3, 0.7, 5.2, 3.6, 1.4, 88, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 26, 0.8, 18, 0.84, 0.2, 8, 0, 0),
	('570d545c-d8da-4097-8675-e15e5604a8d1', 5404, 'Zaden en pitten gem', 'g', 562, 10.5, 1.6, 19.1, 44.8, 20.5, 22, 'NEVO-online 2025/9.0', 'Noten en zaden', 178, 6, 267, 6.24, 0, 1, 0, 0),
	('ae220cc8-465a-4e43-9afb-e73a999141c2', 5407, 'Spread fruit-', 'g', 162, 38, 38, 0.5, 0.1, 1.8, 10, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 8, 0.4, 4, 0.04, 0, 3, 0, 0),
	('a119f755-dd04-45e2-a5e5-ccd866e9336f', 5408, 'Vruchtendrank Dubbeldrank', 'g', 45, 10.8, 10.8, 0.2, 0, 0.3, 1, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 6, 0.1, 4, 0.07, 0.8, 16, 0, 0),
	('e7294882-02b7-4376-943b-503a38112e6c', 5409, 'Margarineproduct 60% vet <17g verz vetz gezouten', 'g', 536, 0.2, 0.2, 0, 59.5, 0, 158, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, NULL, NULL),
	('4bde68cd-07e4-4621-8216-e6b3ad75b249', 5410, 'Halvarine Blue Band', 'g', 357, 1.1, 0.3, 0.3, 39, 0.1, 128, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, NULL, NULL),
	('1850f3e3-3473-458c-aeaf-b6ef22e29757', 5411, 'Glutenvrij brood donker', 'g', 205, 35, 2.8, 4.1, 3.6, 8.3, 316, 'NEVO-online 2025/9.0', 'Brood', 31, 1.4, 25, 0.08, 0, 0, 0, 0),
	('7624c1d9-ef95-4d65-96a4-872057a363ce', 5412, 'Glutenvrij brood licht', 'g', 212, 38.9, 3.3, 4.1, 3.1, 6.1, 343, 'NEVO-online 2025/9.0', 'Brood', 32, 1.5, 25, 0.09, 0, 0, 0, 0),
	('7b716ff7-6e6c-4d95-a274-9407e2748183', 5413, 'Glutenvrij brood meerzaden', 'g', 236, 33.5, 2.7, 5, 7, 9.7, 351, 'NEVO-online 2025/9.0', 'Brood', 25, 1.2, 23, 0.58, 0, 0, 0, 0),
	('ab3de589-01ee-4823-b123-a3f1dadf890c', 5414, 'Glutenvrij brood zuurdesem', 'g', 266, 49, 3.4, 4.3, 4.2, 7.7, 520, 'NEVO-online 2025/9.0', 'Brood', 31, 0.9, 31, 0.17, 0, 0, 0, 0),
	('7042b237-15fd-4041-9543-05b1983b35dd', 5415, 'Kruiden tuin- vers gem', 'g', 43, 4.1, 2.1, 3.3, 0.7, 3.2, 24, 'NEVO-online 2025/9.0', 'Kruiden en specerijen', 125, 4.2, 26, 0.62, 0, 54, 0, 0),
	('34ce7efd-2275-42f9-965d-d8900ef1768b', 5416, 'Margarineproduct 45% vet <17 g verz vetz ongezouten', 'g', 406, 0.2, 0.2, 0.2, 45, 0, 6, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, 0, 0),
	('0ff0efdb-7569-49ec-8bc7-caa78d8a69b0', 5417, 'Gnocchi gekookt', 'g', 155, 34, 1.1, 3.5, 0.2, 1.8, 180, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 13, 0.6, 17, 0.28, 0, 0, 0, 0),
	('d23e35a5-aa9d-4bf3-9724-a84abf32c763', 5418, 'Gnocchi onbereid', 'g', 174, 37.9, 1.5, 3.9, 0.3, 1.9, 353, 'NEVO-online 2025/9.0', 'Aardappelen en knolgewassen', 14, 0.6, 18, 0.3, 0, 6, 0, 0),
	('d2d099ad-d85e-4691-8f67-2264faf9c71e', 5420, 'Limonade vruchten- m suiker en zoetstof 7-9 g KH', 'g', 31, 7.7, 7.6, 0, 0, 0, 6, 'NEVO-online 2025/9.0', 'Niet-alcoholische dranken', 5, 0, 1, 0, 0, 5, 0, 0),
	('38c4da81-da38-43c9-8925-3e40416e9206', 5421, 'Halvarineproduct Albert Heijn light', 'g', 270, 0, 0, 0, 30, 0, 0, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, NULL, NULL),
	('f1186e6e-2193-424e-b7e7-664f4539d904', 5422, 'Halvarineproduct Albert Heijn Goed Begin', 'g', 351, 0, 0, 0, 39, 0, 120, 'NEVO-online 2025/9.0', 'Vetten en oliën', 600, 0.1, 2, 0, 7.5, 0, NULL, NULL),
	('cc54758f-8acd-4158-8fe7-33af008bfc42', 5423, 'Halvarineproduct Jumbo Goed Begin', 'g', 347, 1.1, 0, 0.1, 38, 0, 84, 'NEVO-online 2025/9.0', 'Vetten en oliën', 600, 0.1, 2, 0, 7.5, 0, NULL, NULL),
	('311b6652-205a-458f-813b-67e042ebdc54', 5424, 'Halvarine Jumbo', 'g', 356, 1.2, 0, 0.1, 39, 0, 124, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, NULL, NULL),
	('2628134d-8600-42ad-a778-02fc7d3165b2', 5425, 'Smeltjus bereid', 'g', 260, 1.6, 0.2, 0.4, 28, 0, 547, 'NEVO-online 2025/9.0', 'Hartige sauzen', 3, 0.1, 0, 0.1, 0, 0, NULL, NULL),
	('b00bf33e-367c-402f-8527-f1aacd9ff993', 5427, 'Drink haver- z suiker verrijkt m calcium en vitamines', 'g', 44, 6.7, 2.4, 0.5, 1.5, 1, 39, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 119, 0, 3, 0.04, 1.1, 0, 0, 0),
	('7327a3b9-4ab1-4528-a164-f50b09c6ff49', 5428, 'Bonen bruine blik/glas geen zout toegevoegd', 'g', 118, 15.9, 0.5, 8, 0.9, 7.2, 4, 'NEVO-online 2025/9.0', 'Peulvruchten', 50, 1.6, 34, 0.54, 0, 0, 0, 0),
	('5045aa48-50b2-4518-8a83-45af949da5f1', 5429, 'Linzen blik/glas geen zout toegevoegd', 'g', 93, 12.5, 0.2, 7.7, 0.5, 3.8, 1, 'NEVO-online 2025/9.0', 'Peulvruchten', 39, 2.3, 23, 1, 0, 6, 0, 0),
	('305cf314-ac6a-4dcb-8e4e-cdf13b1450f2', 5430, 'Erwten kikker- blik/glas geen zout toegevoegd', 'g', 117, 13.5, 0.6, 6.8, 2.5, 6.5, 4, 'NEVO-online 2025/9.0', 'Peulvruchten', 53, 1.7, 37, 1.3, 0, 6, NULL, NULL),
	('0e0f7ec3-24e9-4ed7-a763-21a616a4ff7a', 5431, 'Bonen kidney- rode blik/glas geen zout toegevoegd', 'g', 102, 13, 0.5, 7.7, 0.7, 6.6, 2, 'NEVO-online 2025/9.0', 'Peulvruchten', 61, 1.9, 39, 1.06, 0, 0, 0, 0);
INSERT INTO public.nutrition_foods VALUES
	('53aed9ca-5040-44cc-92d6-536ff2803aa4', 5432, 'Pizza m mozzarella Margherita', 'g', 203, 23, 1.3, 7.5, 8.6, 1.7, 439, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 56, 0.5, 11, 0.8, 0, 3, 0, 0),
	('a6a82475-d7f2-4e2b-b0b1-25d964f72432', 5437, 'Pizza quattro formaggi', 'g', 233, 23.3, 1.5, 9.2, 11, 1.7, 445, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 144, 0.6, 15, 0.94, 0.1, 2, 0, 0),
	('5629b984-fe4b-4187-a2a1-0d2dace76075', 5440, 'Peulvruchten gem gekookt', 'g', 117, 14.4, 0.6, 8.2, 1.3, 7.6, 3, 'NEVO-online 2025/9.0', 'Peulvruchten', 39, 2.1, 43, 1.18, 0, 0, 0, 0),
	('88766866-9957-4d82-afe2-4338b321b155', 5445, 'Zuigelingenvoeding Nestle Little steps 1 p 100ml', 'ml', 68, 8.2, 8.2, 1.5, 3.2, NULL, 20, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 45, 0.3, 5, 0.54, 1.5, 10, NULL, 0.02),
	('de746d4a-5edd-4fda-8f88-29521581837e', 5446, 'Opvolgmelk Nestle Little steps 2 p 100ml', 'ml', 67, 8, 5.5, 1.5, 3.2, NULL, 28, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 75, 0.8, 7, 0.56, 1.7, 12, NULL, 0.02),
	('32bbf81e-8601-4761-98ea-688ceb3df6ae', 5447, 'Dreumesmelk Nestle Little steps 3 p 100ml', 'ml', 67, 8.6, 5.6, 1.5, 3, NULL, 28, 'NEVO-online 2025/9.0', 'Flesvoeding en preparaten', 83, 1.2, NULL, 0.75, 1.1, 15, NULL, NULL),
	('ba488375-f2ee-47c5-a2e1-9b52f0951026', 5448, 'Groente hutspot- rauw', 'g', 35, 5.9, 3.7, 0.9, 0.2, 3.1, 23, 'NEVO-online 2025/9.0', 'Groente', 30, 0.2, 8, 0.21, 0, 4, 0, 0),
	('daafcfc7-a89e-4646-8c70-3e357fadfdb6', 5449, 'Groente hutspot- gekookt', 'g', 34, 5.9, 4.2, 0.8, 0.2, 2.7, 20, 'NEVO-online 2025/9.0', 'Groente', 29, 0.2, 8, 0.23, 0, 3, 0, 0),
	('32b517e9-8942-45af-b11a-c6a66d118f9a', 5450, 'Groente roerbakmix Mexicaanse rauw', 'g', 51, 7.1, 3.4, 2.7, 0.5, 3.6, 43, 'NEVO-online 2025/9.0', 'Groente', 34, 0.7, 24, 0.42, 0, 34, 0, 0),
	('a3002540-cac6-48b1-a335-1979f5161501', 5451, 'Groente roerbakmix Mexicaanse gekookt', 'g', 48, 6.7, 2.7, 2.4, 0.5, 3.4, 43, 'NEVO-online 2025/9.0', 'Groente', 36, 0.6, 23, 0.36, 0, 25, 0, 0),
	('87300887-cd8c-4476-9939-c18cd4d831fa', 5456, 'Taco m gehakt en bonen', 'g', 152, 12.8, 2.3, 7.4, 7.2, 3.2, 257, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 27, 1.3, 23, 1.35, 0.2, 7, 0, 0),
	('d10270d2-44e7-480f-b840-b2cd839d3d3c', 5457, 'Burrito m gehakt', 'g', 205, 12.5, 2.6, 9.4, 12.5, 1.6, 418, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 100, 0.9, 22, 1.65, 0.2, 12, 0, 0),
	('72fe6fbd-44c5-478e-95d1-50f77250ae51', 5458, 'Lasagne groenten- koelverse maaltijd', 'g', 112, 10.6, 2.6, 3.3, 5.9, 1.2, 330, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 53, 0.4, 12, 0.44, 0, 12, 0, 0),
	('1fafc519-6ad4-4b03-af91-193b48c2fd30', 5459, 'Ui rode rauw', 'g', 37, 5.6, 5.2, 1.3, 0.4, 2.5, 3, 'NEVO-online 2025/9.0', 'Groente', 22, 0.2, 9, 0.21, 0, 4, 0, 0),
	('96bc4cac-644a-4de1-9576-ef0c74b39dfc', 5460, 'Broodje cheeseburger kant-en-klaar', 'g', 240, 20.7, 3, 12.7, 11.4, 1.9, 596, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 88, 1.1, 21, 1.8, 0.2, 7, 0, 0),
	('3c9935c0-9909-4f3f-a78b-1bdd1910b7b0', 5461, 'Ui rode gekookt', 'g', 43, 7.6, 6.7, 1.7, 0.2, 2.1, 3, 'NEVO-online 2025/9.0', 'Groente', 26, 0.3, 10, 0.26, 0, 6, 0, 0),
	('8701e799-7f9d-4e20-b769-371c24391a29', 5462, 'Wafel mais- naturel m zout', 'g', 385, 85, 1.1, 7.4, 1.1, 2.5, 135, 'NEVO-online 2025/9.0', 'Brood', 11, 1.1, 86, 0.1, 0, 0, 0, 0),
	('d056a834-b57d-4431-827c-8538de242caf', 5463, 'Drink haver- z suiker', 'g', 40, 7.1, 2.3, 0.3, 1.1, 0.5, 31, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 3, 0, 3, 0.04, 0, 0, 0, 0),
	('eb550a33-f7bf-4fbd-b182-eb7cc5933375', 5464, 'Drink amandel- z suiker', 'g', 26, 0.6, 0.4, 0.9, 2.2, 0.2, 41, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 6, 0.1, 5, 0.06, 0, 0, 0, 0),
	('40df538f-4344-48f7-9355-c21704b2a4a3', 5465, 'Plantaardig alternatief voor Goudse kaas obv kokosolie', 'g', 268, 17.4, 0.4, 0.3, 21.5, 1.7, 790, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 7, 0.3, 3, 0.02, 0, 10, 0, 0),
	('4a5250aa-aec7-422a-98d9-cb4063792c20', 5466, 'Plantaardig alternatief voor Goudse kaas obv kokosolie verrijkt m Ca en Vit B12', 'g', 286, 22.7, 0.1, 0.1, 21.3, 1.7, 827, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 400, 0.3, 3, 0.02, 0, 10, 0, 0),
	('fa3e654a-54b1-4b2f-8212-317db64d063a', 5467, 'Hummus m groente', 'g', 251, 11, 4, 5.3, 19.1, 7, 424, 'NEVO-online 2025/9.0', 'Hartig broodbeleg', 32, 1.3, 39, 0.86, 0, 3, 0, 0),
	('424b9d5d-2ea5-4c20-b2c6-7abbd49928ef', 5468, 'Soepstengel volkoren', 'g', 385, 61.9, 1.8, 14.1, 6.5, 11.3, 573, 'NEVO-online 2025/9.0', 'Brood', 26, 2.2, 99, 0.57, 0, 0, 0, 0),
	('8ab351a1-9933-4a78-995d-e1df4251ffad', 5469, 'Saus sate- geconcentreerd', 'g', 437, 36.5, 27, 13.5, 25.5, 3.3, 780, 'NEVO-online 2025/9.0', 'Hartige sauzen', 35, 0.7, 56, 0.81, 0, 0, 0, 0),
	('23d0383b-038a-4c6f-b40e-2dfd47dac69a', 5470, 'Saus soja-', 'g', 40, 4.4, 0.6, 5.5, 0, 0.1, 4780, 'NEVO-online 2025/9.0', 'Hartige sauzen', 60, 5, 37, 0.2, 0, 0, 0, 0),
	('e22f3f9f-e435-41f0-94e5-0ea25447056f', 5471, 'Saus wok- teriyaki', 'g', 164, 38.2, 32.3, 1.9, 0.3, 0.5, 1977, 'NEVO-online 2025/9.0', 'Hartige sauzen', 47, 5.3, 37, 0.2, 0, 0, 0, 0),
	('217b543d-2ef7-4741-bd54-a3bdd3343f23', 5473, 'Zoutje luchtig aardappelbasis', 'g', 514, 59.7, 2.6, 3.6, 28.4, 2.5, 710, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 20, 1.2, 43, 0.6, 0, 11, 0, 0),
	('031f7586-e1c8-4a7a-a723-d6fa2c7cb383', 5474, 'Drink kokos- m suiker verrijkt m calcium en vitamines', 'g', 25, 2.4, 1.8, 0.2, 1.6, 0.1, 37, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 119, 0.1, 3, 0.03, 0.7, 0, 0, 0),
	('56aac6a0-7e86-42db-9b31-3ca24f03caf0', 5475, 'Kipschnitzel krokant rauw', 'g', 265, 19.2, 1.6, 13.6, 14.6, 1.2, 475, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 19, 0.5, 18, 0.74, 0.1, 0, 0.01, 0.02),
	('a1f8dd85-a273-4dd5-b706-f17eef36b5e5', 5478, 'Worst boterham- vegetarisch', 'g', 173, 3.5, 1.9, 8.7, 12.9, 4.2, 930, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 48, 3.5, 12, 0.45, 0, 7, 0, 0),
	('f1bb963c-c85e-4e41-912a-16acd269e855', 5479, 'Pate/smeerworst vegetarisch obv soja/erwt', 'g', 235, 5.5, 1.8, 6.8, 19.9, 3.6, 640, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 37, 2, 20, 0.53, 0, 119, 0, 0),
	('3c103f2e-5289-47fb-a99a-67caac4cc478', 5482, 'Wrap/tortilla obv tarwe volkoren', 'g', 277, 44.1, 3, 8.8, 5.3, 7.9, 330, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 69, 2.1, 53, 1.4, 0, 1, 0, 0),
	('629c0432-69eb-4b16-91de-6d8f551877d9', 5485, 'Reepjes/stukjes vegetarisch obv soja/tarwe onbereid', 'g', 171, 4.4, 1.6, 20.3, 6.6, 6.8, 500, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 100, 3.9, 80, 1.2, 0, 3, 0, 0),
	('09be428e-6ae8-4529-84bb-63d7dcba6d52', 5489, 'Margarineproduct Becel Romig 60% vet', 'g', 544, 0.5, 0.5, 0.5, 60, 0, 80, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, NULL, NULL),
	('73e27e36-866c-4f41-a107-e855671cb9d0', 5490, 'Halvarineproduct 20% vet <10g verz vetz gezouten', 'g', 180, 0, 0, 0, 20, 0, 328, 'NEVO-online 2025/9.0', 'Vetten en oliën', 10, 0.1, 2, 0, 7.5, 0, NULL, NULL),
	('8b0fef22-9871-4b30-9a9f-0d0c1232a0be', 5491, 'Muesli krokante m fruit verrijkt m vezel', 'g', 430, 59.2, 15.6, 8.2, 15.1, 12.3, 21, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 35, 2.4, 83, 1.7, 0, 1, 0.01, 0),
	('ef174921-5ebb-47de-828c-2779f6f1bb72', 5493, 'Asperge groene gekookt', 'g', 27, 1.7, 1.3, 2.7, 0.3, 2.2, 3, 'NEVO-online 2025/9.0', 'Groente', 21, 0.6, 10, 0.49, 0, 5, 0, 0),
	('c2349f0e-9516-4c90-8bec-d4d080d115b7', 5494, 'Noten gemengd m cranberry ongezouten', 'g', 555, 29.5, 22, 15, 40.4, 6.3, 5, 'NEVO-online 2025/9.0', 'Noten en zaden', 106, 3.3, 162, 2.72, 0, 0, 0, 0),
	('7f53ef1c-cea9-4447-9f5f-c3da4ba05569', 5495, 'Muesli krokante m noten verrijkt m vezel', 'g', 456, 53.6, 10.4, 9.8, 19.8, 12.2, 67, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 49, 2.6, 101, 1.94, 0, 1, 0.01, 0),
	('371db97b-9215-4385-9857-a4bce065614b', 5496, 'Muesli krokante m chocolade verrijkt m vezel', 'g', 448, 55.8, 13.9, 9.4, 18.1, 12.3, 79, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 37, 2.5, 84, 1.65, 0, 1, 0.01, 0),
	('b7d8df0d-3df8-4ee8-b672-243392763409', 5497, 'Kokos geraspt gedroogd', 'g', 674, 8.6, 7.6, 7.1, 64.8, 14.4, 29, 'NEVO-online 2025/9.0', 'Fruit', 20, 2, 32, 1.1, 0, 0, 0, 0),
	('0bb7344c-486f-445b-aa77-be3167c011a8', 5498, 'Seroendeng', 'g', 609, 19.6, 15.4, 12.9, 50.9, 10.3, 526, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 37, 2.7, 92, 1.73, 0, 2, 0, 0),
	('5ddb521c-5c81-4259-9bd4-e2670a21b74b', 5499, 'Bouillon geconcentreerd m groente of vlees pot', 'g', 53, 3.3, 1.9, 5.7, 1.7, 1, 1197, 'NEVO-online 2025/9.0', 'Soepen', 5, 0, 1, 0.02, 0, 0, 0, 0),
	('9a93441f-a037-435e-bef8-08d142974189', 5505, 'Peulvruchten gem gedroogd', 'g', 335, 43.6, 2.7, 23.1, 3.9, 16.4, 11, 'NEVO-online 2025/9.0', 'Peulvruchten', 100, 5.8, 107, 2.46, 0, 1, 0, 0),
	('1a13d20c-64e8-405e-a50d-19292b8d65d8', 5507, 'Eiwitreep m pinda', 'g', 506, 30.3, 16.4, 22.2, 30.7, 9.8, 309, 'NEVO-online 2025/9.0', 'Gebak en koek', 39, 3.1, 110, 2.1, 0, 0, 0, 0.01),
	('c92f2724-786b-4978-9499-788c38a55f7e', 5508, 'Eiwitreep m chocola m zoetstof', 'g', 369, 26.7, 3.1, 36.7, 14.8, 8.5, 184, 'NEVO-online 2025/9.0', 'Gebak en koek', 52, 3.1, 102, 1.92, 0, 0, 0, 0),
	('cce7e65f-e38e-4f62-bbf1-83d126b25c9f', 5509, 'Saus wok- zoetzure', 'g', 169, 38, 30, 1.1, 1.2, 0.8, 1436, 'NEVO-online 2025/9.0', 'Hartige sauzen', 5, 0.2, 4, 0.08, 0, 27, 0, 0),
	('6f52ded1-9776-4da3-9d05-d2e901b8fc0b', 5510, 'Koek ontbijt- verrijkt m vezel', 'g', 285, 62.4, 34.3, 2.8, 0.9, 8.1, 258, 'NEVO-online 2025/9.0', 'Gebak en koek', 17, 0.7, 16, 0.65, 0.1, 0, 0, 0),
	('e10ccb59-1712-416c-b35b-fc834790ed71', 5511, 'Graanreep Sultana Good Morning', 'g', 451, 66.4, 20.6, 7.7, 16.3, 4.2, 332, 'NEVO-online 2025/9.0', 'Gebak en koek', 39, 5, 85, 2, 1.8, 0, 0.02, 0),
	('841f53d4-dce2-4fd5-b966-7d0f18fec409', 5512, 'Mueslireep verrijkt m vezel', 'g', 444, 59.3, 16, 9.4, 16, 12.7, 239, 'NEVO-online 2025/9.0', 'Gebak en koek', 39, 3.1, 110, 2.1, 0, 0, 0.02, 0),
	('98dd1cef-bce7-4662-8fa4-259b6e64a816', 5513, 'Biscuit fruit- verrijkt m vezel', 'g', 388, 72.5, 32, 6.9, 7.1, 6.1, 174, 'NEVO-online 2025/9.0', 'Gebak en koek', 35, 1.4, 26, 0.3, 0, 0, 0, 0),
	('e3ffe670-d05b-484b-82e8-0b0d7670d668', 5514, 'Biscuit meergranen- diverse smaken verrijkt m vezel, vit en min', 'g', 389, 65.6, 31, 8, 8.5, 9.2, 166, 'NEVO-online 2025/9.0', 'Gebak en koek', 333, 7.2, 45, 0.2, 0, 0, 0, 0),
	('7c927eb7-251f-4975-989e-4310c75a3e5d', 5515, 'Groenteballetjes/-burgers vegetarisch obv soja onbereid verrijkt m ijzer en vit B12', 'g', 146, 7.4, 2.4, 14.9, 5, 5.8, 620, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 64, 4.5, 42, 0.91, 0, 0, 0, 0),
	('3cb2221d-643a-4175-90e5-e711def61f66', 5516, 'Kaas komijne- 48+ gem', 'g', 370, 0.4, 0, 22.9, 30.5, 0.1, 665, 'NEVO-online 2025/9.0', 'Kaas', 820, 0.8, 36, 3.48, 0.3, 0, 0, 0),
	('b4df0e27-f9f8-452a-88ff-464721725db1', 5517, 'Meel Johannesbroodpit-', 'g', 187, 3.3, 0, 3.2, 1.3, 74.7, 92, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 294, 0, 0, 0, 0, 0, NULL, NULL),
	('3c72e215-1e64-4bed-bef0-9daa8991282a', 5518, 'Couscous volkoren rauw', 'g', 342, 65, 2.4, 12.1, 1.9, 8.4, 20, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 19, 1, 28, 0.7, 0, 0, 0, 0),
	('8981132d-2416-4295-b562-cf0dfc708ace', 5519, 'Tofu onbereid', 'g', 119, 1.5, 0.5, 12.4, 6.6, 2, 15, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 100, 2.4, 100, 1.3, 0.1, 0, 0, 0),
	('b88d83ce-49a5-4458-b2d9-92f19a22b393', 5522, 'Knolraap rauw', 'g', 31, 4.8, 4.6, 0.9, 0.3, 2.7, 15, 'NEVO-online 2025/9.0', 'Groente', 48, 0.2, 8, 0.1, 0, 17, NULL, NULL),
	('ef72a382-375a-4272-9a1e-fc8b0cb9e716', 5523, 'Knolraap gekookt', 'g', 17, 2, 1.9, 0.6, 0.2, 2.2, 28, 'NEVO-online 2025/9.0', 'Groente', 45, 0.2, 6, 0.1, 0, 10, NULL, NULL),
	('14f4fc84-3731-4939-9a82-7186c555684f', 5524, 'Varkensvlees gem rauw', 'g', 201, 1.2, 0.4, 19, 13.3, 0.2, 351, 'NEVO-online 2025/9.0', 'Vlees en gevogelte', 11, 0.8, 23, 2.12, 0.5, 5, 0, 0),
	('c1f2cc19-95cb-4443-9c57-293c8f84c532', 5527, 'Vis mager <5 g vet gem bereid in magnetron z toevoegingen', 'g', 112, 0, 0, 23.4, 2, 0, 147, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 26, 0.4, 26, 0.45, 1.2, 1, 0.19, 0.27),
	('48b4ccb2-48a8-46e3-b2ee-6d14e299d836', 5530, 'Saus bolognese- huishoudelijk bereid', 'g', 126, 4.1, 3.1, 7.4, 8.6, 1.3, 182, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 15, 0.9, 12, 1.61, 0.2, 14, 0, 0),
	('3fdb706d-e89c-4de3-a758-842902038a00', 5531, 'Spaghetti bolognese m kaas huishoudelijk bereid', 'g', 149, 15.1, 1.8, 7.7, 6.1, 1.3, 135, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 67, 0.8, 17, 1.26, 0.1, 6, 0, 0),
	('78ea9c33-abc4-4bdc-81f9-45377877441e', 5532, 'Salade maaltijd- m kip, pasta en dressing', 'g', 127, 10.6, 2.4, 5.1, 6.8, 1, 306, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 30, 0.7, 16, 0.64, 0, 2, 0, 0),
	('e5d60482-e4ea-4c65-9f89-d209c0cccacb', 5533, 'Salade aardappel-', 'g', 180, 15, 2.9, 1.4, 12.5, 1.1, 424, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 10, 0.4, 15, 0.25, 0, 6, 0, 0),
	('9de14204-fde2-4c11-8f99-6144e192d4ce', 5534, 'Tosti ham-kaas v bruin/volkoren brood', 'g', 246, 23.8, 1.2, 13.5, 9.9, 3.3, 523, 'NEVO-online 2025/9.0', 'Samengestelde gerechten', 161, 1.1, 41, 1.62, 0.5, 5, 0, 0),
	('6913134e-0c27-4750-9a83-29ffd36e57bf', 5537, 'Pepers in zuur in blik/glas', 'g', 14, 1.9, 1.9, 0.8, 0.1, 0.8, 1059, 'NEVO-online 2025/9.0', 'Groente', 10, 0.5, 10, 0.14, 0, 66, 0, 0),
	('05e6d62b-3b52-47f1-a2ec-27d61f518b1a', 5538, 'Kwark magere lactosevrij', 'g', 57, 3.8, 3.8, 9.8, 0.2, 0, 37, 'NEVO-online 2025/9.0', 'Melk en melkproducten', 123, 0, 12, 0.57, 0, 0, 0, 0),
	('dbab6dbc-a5a3-43c1-b9d1-48a9430c1260', 5539, 'Couscous volkoren gekookt', 'g', 114, 21.7, 0.8, 4, 0.6, 2.8, 8, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 10, 0.3, 10, 0.23, 0, 0, 0, 0),
	('b063829e-c737-428d-99d6-ee67bccc059d', 5540, 'Strooigoed', 'g', 411, 78.9, 42.3, 5.2, 8, 1.4, 424, 'NEVO-online 2025/9.0', 'Gebak en koek', 42, 0.9, 16, 0.43, 0, 0, 0, 0),
	('87e1596a-9c64-431c-ad9c-660fa031ad1c', 5542, 'Drink soja- vruchten/vanille m suiker verrijkt m calcium en vitamines', 'g', 55, 7.6, 7, 2.8, 1.4, 0.6, 38, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 120, 0.4, 15, 0.23, 0.8, 0, 0, 0),
	('c8160efa-f8ba-4e5c-bf98-5d3f8d016527', 5543, 'Drink kokos- z suiker', 'g', 26, 1.3, 0.6, 0.3, 1.9, 1, 48, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 8, 0.1, 3, 0.03, 0, 0, 0, 0),
	('6ca3c6f1-c81f-434d-aa58-3fdb44fc4bae', 5544, 'Jackfruit in water blik', 'g', 18, 0.8, 0.6, 1, 0.2, 4.9, 370, 'NEVO-online 2025/9.0', 'Fruit', 24, 0.4, 13, 0.1, 0, 1, 0, 0),
	('1302868f-a8c1-4621-b948-8eaf7f3e1c89', 5545, 'Plantaardig alternatief voor yoghurt obv kokos z suiker', 'g', 150, 3.2, 1.6, 1.5, 14.4, 0.5, 10, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 4, 0.6, 20, 0.21, 0, 0, 0, 0),
	('e4374be7-8abf-4fc3-bfbc-4127d4a9a431', 5546, 'Tofureepjes/-blokjes gekruid onbereid', 'g', 213, 1.4, 0.8, 15.7, 15.6, 2.3, 350, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 350, 2.7, 86, 1.4, 0, 0, 0, 0),
	('83d57de3-9600-470f-89a3-8bcec22b4ee8', 5547, 'Falafel onbereid', 'g', 231, 24, 4, 9.1, 9, 8.8, 500, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 69, 2.3, 59, 1.3, 0, 0, 0, 0),
	('5a633462-95f4-445b-af71-9b81c94a3509', 5548, 'Kaasschnitzel vegetarisch onbereid', 'g', 291, 26, 3, 11.4, 15.2, 2.4, 650, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 220, 0.6, 22, 1.1, 0.1, 2, 0, 0),
	('add0520c-6587-4af2-8688-b1fdef465072', 5549, 'Balletjes/burgers vegetarisch obv soja/tarwe onbereid', 'g', 177, 4.7, 0.3, 19.6, 7.5, 6, 480, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 83, 2.7, 58, 1.2, 0, 3, 0, 0),
	('801d04d3-b034-4e29-b8e2-4ad918a78411', 5550, 'Vissticks vegetarisch obv rijst/tarwe onbereid', 'g', 223, 28.7, 4.7, 4.9, 9.3, 2.9, 420, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 100, 0.6, 10, 0.35, 0, 0, 0, 0),
	('2863b2b8-95bc-40bc-8ea5-8834dde3da74', 5551, 'Balletjes/burgers vegetarisch obv soja/tarwe onbereid verrijkt m ijzer en vit B12', 'g', 190, 8.5, 2.7, 16.9, 8.7, 5.1, 580, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 66, 4.1, 46, 0.82, 0, 0, 0, 0),
	('15137f22-c220-4f43-b5e7-00df8b7cc4dc', 5552, 'Balletjes/burgers vegetarisch obv erwt onbereid', 'g', 209, 3.2, 0.3, 15.6, 14.3, 2.3, 430, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 23, 3.1, 21, 1.7, 0, 5, 0, 0),
	('78f9bcc4-a0cb-4ace-b74b-ff5a8d3e5932', 5553, 'Groenteballetjes/-burgers vegetarisch obv soja onbereid', 'g', 194, 12.6, 3.4, 10.4, 10.2, 5.2, 490, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 45, 1.4, 42, 0.65, 0, 3, 0, 0),
	('a7844457-176c-4af0-bc9d-963d8003f19a', 5554, 'Reepjes/stukjes vegetarisch obv soja/tarwe onbereid verrijkt m ijzer en vit B12', 'g', 178, 3, 0.9, 20.4, 8.4, 4.6, 620, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 56, 4.6, 40, 1.1, 0, 0, 0, 0),
	('500ea950-3d56-4882-a661-5cfd3a5e4627', 5555, 'Nuggets vegetarisch obv tarwe/erwt diepvries onbereid', 'g', 288, 26.5, 5.5, 8.4, 15.7, 3.6, 490, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 100, 0.9, 13, 0.54, 0, 0, 0, 0),
	('eb5d79e0-d2d7-4823-b2be-1b745cdf562d', 5556, 'Filet americain vegetarisch obv melk verrijkt m ijzer', 'g', 275, 6.3, 4, 7.8, 23.6, 3.2, 540, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 520, 5.6, 14, 1, 0.1, 0, 0, 0),
	('68743409-7ba9-472c-94a8-b68f03fd837f', 5557, 'Kroket oven- vegetarisch diepvries onbereid', 'g', 261, 24, 2, 5.2, 15.4, 3.1, 490, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 17, 0.7, 16, 0.37, 0, 0, 0, 0),
	('acbf45d1-efb9-4565-b665-5308bff6f786', 5558, 'Dextrose tabletten niet verrijkt', 'g', 369, 91, 82, 0, 0.5, NULL, 4, 'NEVO-online 2025/9.0', 'Suiker, snoep, zoet beleg en zoete sauzen', 0, 0.1, 2, 0.01, 0, 0, NULL, NULL),
	('159785bd-3e2b-4f3c-b08d-d436902446fe', 5559, 'Rempejek pindakoekje', 'g', 579, 25.3, 4.9, 14.4, 45.7, 4.2, 1176, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 31, 1.1, 107, 1.69, 0, 0, 0, 0),
	('6861adc3-d87d-4e67-8170-25cfe568692a', 5560, 'Bitterbal bereid m vloeibaar frituurvet', 'g', 362, 20.7, 2.7, 9.9, 26.2, 1.7, 653, 'NEVO-online 2025/9.0', 'Hartige snacks en zoutjes', 14, 1.1, 15, 1.08, 0, 0, NULL, NULL),
	('a43e0d24-a2cf-47be-9fa4-77f358cbccf4', 5561, 'Gehakt rul vegetarisch obv soja onbereid verrijkt m ijzer en vit B12', 'g', 110, 1.2, 0.7, 21.8, 0.2, 8.4, 440, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 140, 5.9, 110, 0.96, 0, 0, 0, 0),
	('21d383fd-ded1-40b9-ad50-9a4271e2090a', 5562, 'Margarine 80% vet >24 g verz vetz gezouten in NEVO recepten', 'g', 719, 0.3, 0.3, 0.1, 79.7, 0, 486, 'NEVO-online 2025/9.0', 'Vetten en oliën', 1, 0.3, 0, 0, 7.5, 0, 0, 0),
	('e8b7af74-f299-4c43-8b35-3abc03e844be', 5563, 'Worst braad- vegetarisch obv erwt onbereid', 'g', 237, 1.6, 0.3, 16, 17.6, 4.3, 520, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 56, 3.6, 25, 1.5, 0, 0, 0, 0),
	('870eccea-e9d5-404a-8bba-db0d99ca7a23', 5564, 'Worst braad- vegetarisch obv soja/tarwe onbereid verrijkt m ijzer en vit B12', 'g', 178, 5.1, 0.8, 14.1, 11, 1, 520, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 100, 8.9, 12, 0.72, 0, 0, 0, 0),
	('8b35470c-c9d6-418d-a47f-06bd742d92f8', 5565, 'Schnitzel/burger vegetarisch obv melk onbereid verrijkt m ijzer', 'g', 172, 12.1, 1.1, 11.4, 7.9, 3.9, 470, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 490, 2.7, 18, 0.96, 0, 0, 0, 0),
	('f4bc6ca8-785c-4f1f-8c51-a653e9bbfec0', 5566, 'Burger vegetarisch gevuld m groente en kaas onbereid', 'g', 216, 19.1, 3.1, 9, 10.8, 3.1, 330, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 140, 0.6, 20, 0.79, 0.1, 0, 0, 0),
	('b9a0848b-5df8-474f-a257-43a997e86cfb', 5567, 'Cracker luchtige volkoren', 'g', 355, 64.3, 3.9, 10, 3.6, 12.7, 471, 'NEVO-online 2025/9.0', 'Brood', 42, 3.3, 65, 1.2, 0, 0, 0, 0),
	('454c7a67-e928-4403-979e-5a1822945509', 5569, 'Plantaardig alternatief voor room obv haver', 'g', 136, 8.1, 1.4, 0.8, 11, 0.4, 47, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 3, 0, 3, 0.04, 0, 0, 0, 0),
	('53591a47-c04b-4964-9e5e-d6be495de3e9', 5571, 'Drink soja- chocolade m suiker verrijkt m calcium en vitamines', 'g', 60, 7.6, 7.3, 3, 1.7, 0.9, 56, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 115, 0.5, 22, 0.32, 0.7, 0, 0, 0),
	('6c39751f-5503-4d29-846f-94164c062e9f', 5572, 'Spekjes vegetarisch onbereid', 'g', 185, 6.1, 1, 15, 10.5, 2.7, 1057, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 100, 3.9, 12, 0.72, 0, 0, 0, 0),
	('77a1d7ba-f870-4c9e-bf91-122fa50db633', 5573, 'Tempeh onbereid', 'g', 128, 0.4, 0.2, 17.6, 4.7, 6.2, 39, 'NEVO-online 2025/9.0', 'Vleesvervangers en zuivelvervangers', 88, 1.7, 60, 1.3, 0, 0, 0, 0),
	('beec8f69-7a8a-46c3-9121-4a16f48a6f59', 5574, 'Bakmix voor oliebollen', 'g', 369, 77, 8.3, 11, 1, 3.8, 680, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 17, 1.1, 22, 0.5, 0, 0, 0, 0),
	('cd3505b8-0954-4f04-a2d1-765e4f69b30d', 5575, 'Kaas 35+', 'g', 302, 0, 0, 27.3, 20.4, 0, 661, 'NEVO-online 2025/9.0', 'Kaas', 959, 0.2, 36, 3.99, 0.3, 1, 0, 0),
	('6d59cfdd-8d7f-4601-ae50-363e7a0f87c1', 5576, 'Bloem spelt-', 'g', 348, 67.4, 0.9, 13.2, 1.7, 5.1, 0, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 20, 1.6, 46, 1.5, 0, NULL, 0, 0),
	('ef0a268a-7984-40aa-a711-deccbfa83f0f', 5577, 'Meel spelt- volkoren', 'g', 332, 56, 1.4, 14.4, 2.3, 15.3, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 28, 3.8, 120, 3.1, 0, NULL, 0, 0),
	('a04e7783-9e74-4402-934e-c4eb98438c72', 5579, 'Meel amandel-', 'g', 638, 3.6, 3.5, 25.3, 55.8, 10.1, 8, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 240, 3, 240, 3.2, 0, 0, 0, 0),
	('fea3def4-8bbf-4e77-bca3-d2d32c9ef8e7', 5580, 'Meel tarwegries-', 'g', 338, 66.4, 0.4, 10.8, 0.9, 10.4, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 19, 1, 28, 0.7, 0, 0, 0, 0),
	('4c77afe7-acc3-4e8e-a15b-136d498cfc40', 5581, 'Meel haver- volkoren', 'g', 364, 58, 1, 13.4, 6.4, 9.9, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 54, 3.3, 120, 2.5, 0, 0, 0, 0),
	('34d57e86-39ba-43d4-82ec-65dd806389df', 5582, 'Vlokken spelt-', 'g', 340, 61.4, 0.8, 12.9, 2.2, 11.6, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 26, 3.6, 130, 3, 0, NULL, 0, 0),
	('cb2d3a30-c176-43e4-a8a4-224883eaccae', 5583, 'Vlokken gerst-', 'g', 332, 63, 0.7, 7.9, 2.1, 14.9, 3, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 32, 1.9, 77, 1.7, 0, 0, 0, 0),
	('1b3e331f-e490-4af3-bb17-76532cda2f71', 5584, 'Meel rijst- volkoren', 'g', 355, 71.7, 0.7, 8.1, 2.6, 6.2, 1, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 11, 1, 100, 1.8, 0, 0, 0, 0),
	('b8735e16-c867-45fb-9e01-47ddffa9dd90', 5585, 'Bakmix voor pannenkoeken glutenvrij', 'g', 344, 78.4, 3, 4.9, 1, 0.9, 400, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 6, 0.6, 53, 0.77, 0, 0, 0, 0),
	('02dae4a9-7711-42f1-9721-1e5fa63ea57c', 5586, 'Meel kokos-', 'g', 343, 18, 17.8, 20.1, 12.8, 37.7, 41, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 36, 7.9, 240, 3.6, 0, 1, 0, 0),
	('5b2fde11-6143-4e45-9ad3-29a340e1709a', 5587, 'Pannenkoek kant-en-klaar naturel', 'g', 226, 27.7, 6, 5.3, 9.8, 2.1, 270, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 72, 0.4, 16, 0.47, 0.1, 0, 0, 0.01),
	('185bdeff-cf6a-4b6a-a4cf-174e3fb527dc', 5589, 'Poffertjes kant-en-klaar naturel', 'g', 291, 31.2, 7, 5.5, 15.2, 2.3, 340, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 66, 0.6, 18, 0.5, 0.1, 0, 0, 0.01),
	('35b42a8d-922c-4377-93d9-af72fcd1a231', 5591, 'Wrap/tortilla obv tarwe en wortel', 'g', 288, 47.8, 4.9, 9.8, 5, 5.1, 410, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 87, 1, 34, 0.52, 0, 0, 0, 0.01),
	('6639afc0-a9c9-47bd-a9d4-af324694d898', 5592, 'Muesli m fruit en noten', 'g', 365, 57.2, 19.5, 9.1, 9, 9.6, 8, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 50, 3, 100, 2, 0, 0, 0, 0.05),
	('d3bc4a63-7ac2-4616-a87e-895868ae61d9', 5593, 'Muesli krokante naturel', 'g', 422, 66.1, 15.2, 10.8, 10.8, 8.5, 6, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 38, 3, 94, 2.1, 0, 0, 0, 0.01),
	('5f69e4f2-d4d8-4b9b-b6b5-14797d7d7798', 5594, 'Muesli krokante m fruit', 'g', 419, 65.8, 16.6, 8.9, 11.3, 9.3, 9, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 35, 2.4, 83, 1.7, 0, 1, 0, 0.02),
	('cf53c2af-355a-4429-a4cd-c7efb1d72ec5', 5595, 'Muesli m fruit zaden en pitten', 'g', 359, 52.9, 6.9, 11.4, 8.5, 12.7, 4, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 50, 3.3, 123, 2.43, 0, 0, 0, 0.02),
	('63b5a391-4878-4a60-8738-4abb07bc5657', 5596, 'Pannenkoek glutenvrij huishoudelijk bereid', 'g', 171, 22.9, 3.2, 5.1, 6.5, 0.2, 176, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 77, 0.6, 23, 0.69, 0.7, 0, 0.01, 0),
	('5a6386c7-a520-4170-9d02-f5a332c20e8f', 5597, 'Poffertjes huishoudelijk bereid', 'g', 154, 22.9, 3.3, 5.7, 4, 1.5, 178, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 99, 0.5, 18, 0.57, 0.1, 0, 0, 0),
	('aa94d2f6-b76b-4071-b612-e569ddf1d9ba', 5598, 'Bakmix voor brood wit glutenvrij', 'g', 354, 77.5, 2, 5.4, 1.6, 3.9, 250, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 49, 1, 27, 0.89, 0, 0, 0, 0),
	('8c3904e0-f8ff-48cc-9508-a527a2ca266e', 5599, 'Bakmix voor brood bruin/meergranen glutenvrij', 'g', 369, 76.4, 3.9, 6, 3.4, 4.1, 440, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 97, 1.6, 46, 1.1, 0, 0, 0, 0),
	('7cd9fa09-3ae0-4726-b7b5-feadba2dd411', 5602, 'Garnalen gemarineerde', 'g', 184, 0.9, 0.3, 12.7, 11.2, 0.3, 568, 'NEVO-online 2025/9.0', 'Vis, schaal- en schelpdieren', 51, 0.8, 28, 0.79, 0, 0, 0.11, 0.08),
	('05f4dc1c-c56c-44c3-926b-8be3053cc6d2', 5604, 'Ontbijtproduct Special flakes naturel', 'g', 377, 77.5, 9.6, 9.9, 1.5, 6.8, 204, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 20, 1.8, 52, 1.83, 0, 1, 0, 0),
	('49e78779-2749-4b9d-b5de-9e769e72d9b8', 5605, 'Ontbijtproduct 7 granen ontbijt', 'g', 342, 64.1, 2, 12.1, 2.1, 8.9, 120, 'NEVO-online 2025/9.0', 'Graanproducten en meelsoorten', 28, 2.8, 89, 1.96, 0, 1, 0, 0),
	('cf2ddd1d-176c-405b-b112-e8188ece9540', 5609, 'Champignon gebakken z vet', 'g', 26, 0.2, 0, 4.4, 0.6, 0.9, 11, 'NEVO-online 2025/9.0', 'Groente', 3, 0.3, 14, 0.81, 0, 0, 0, 0),
	('9835a8d3-c8c1-46e8-824f-5c0ae831cb8c', 5610, 'Bonen lupine- gedroogd', 'g', 324, 2.8, 2.8, 33.1, 9.5, 47.4, 24, 'NEVO-online 2025/9.0', 'Peulvruchten', 200, 3.1, 170, 5.3, 0, 2, 0, 0);


--
-- Data for Name: nutrition_log_ai_usage; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: nutrition_log_settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: nutrition_recipes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.nutrition_recipes VALUES
	('2b0f5594-5227-436f-81d3-e50b8aa746b0', 'havermout-banaan-kwark', 'Havermout met banaan en kwark', 'ontbijt', 'hoog_kh', '{vegetarisch}', 1, 10, '1. Breng de melk met de havervlokken aan de kook en laat al roerend 3 minuten zacht koken.
2. Haal van het vuur en roer de kwark erdoor.
3. Snijd de banaan in plakjes, leg ze erop en maak af met de honing.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('436f0d95-5ce7-42eb-8a6b-ca47aec3d2cb', 'overnight-oats-skyr', 'Overnight oats met skyr en blauwe bessen', 'ontbijt', 'gemengd', '{vegetarisch}', 1, 5, '1. Meng de havervlokken met de melk, de skyr, de honing en de kaneel in een pot.
2. Zet de pot een nacht afgedekt in de koelkast.
3. Schep ''s ochtends de blauwe bessen erdoor.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('e690b822-8720-4491-943b-b48b0ef5c079', 'roerei-volkorenbrood', 'Roerei met spinazie op volkorenbrood', 'ontbijt', 'eiwitrijk', '{vegetarisch}', 1, 10, '1. Verhit de olie en laat de spinazie kort slinken.
2. Klop de eieren los, giet ze in de pan en roer op laag vuur tot ze net gestold zijn.
3. Serveer op het brood met plakjes tomaat.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('f4a442b1-77f6-4bb0-a2a8-5dd01c78ee66', 'wrap-kip-hummus', 'Volkorenwrap met kip en hummus', 'lunch', 'gemengd', '{}', 2, 15, '1. Snijd de kipfilet in reepjes en bak ze in de olie gaar.
2. Snijd de paprika en de komkommer in reepjes.
3. Besmeer de wraps met hummus, beleg met sla, groente en kip en rol ze op.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('6ccf1915-8223-46ca-a190-001cf6bd4d57', 'linzensalade-feta', 'Linzensalade met feta', 'lunch', 'gemengd', '{vegetarisch,glutenvrij}', 2, 30, '1. Kook de linzen in ruim water in ongeveer 20 minuten beetgaar en laat ze uitlekken.
2. Snijd de tomaat, de komkommer en de ui klein.
3. Meng alles met de olie en het citroensap en verkruimel de feta erover.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('9d5231ad-ca6e-4324-b14c-c306d717e453', 'couscous-kikkererwten', 'Couscous met kikkererwten en rozijnen', 'lunch', 'hoog_kh', '{vegetarisch,vegan}', 2, 20, '1. Overgiet de couscous met evenveel kokend water, dek af en laat 5 minuten staan.
2. Spoel de kikkererwten af en snijd de paprika en de komkommer klein.
3. Maak de couscous los met een vork en meng alles met de rozijnen, de olie en het citroensap.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('687eb2bb-afcc-4fcf-ba79-b7c2f6479fe4', 'broodjes-tonijnsalade', 'Volkorenbrood met tonijnsalade', 'lunch', 'eiwitrijk', '{}', 1, 10, '1. Laat de tonijn uitlekken en prak hem met de yoghurt.
2. Beleg het brood met sla, tonijnsalade en plakjes tomaat.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('5363317d-1a6e-45c1-a9c9-a05f9247b667', 'pasta-kip-tomaat', 'Pasta met kip en tomatensaus', 'diner', 'hoog_kh', '{}', 2, 25, '1. Kook de pasta volgens de verpakking.
2. Fruit de ui en de knoflook in de olie, bak de kip in blokjes gaar en voeg de paprika toe.
3. Voeg de gezeefde tomaten toe en laat 10 minuten zacht koken.
4. Meng met de pasta en strooi de Parmezaanse kaas erover.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('082eb8d6-b079-4d95-917c-2713a9da341c', 'zalm-rijst-broccoli', 'Zalm met rijst en broccoli', 'diner', 'gemengd', '{glutenvrij}', 2, 25, '1. Kook de rijst volgens de verpakking.
2. Kook of stoom de broccoli in 5 minuten beetgaar.
3. Bak de zalm in de olie 3 tot 4 minuten per kant en besprenkel met citroensap.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', 'curry-zoete-aardappel-kikkererwten', 'Curry van zoete aardappel en kikkererwten', 'diner', 'hoog_kh', '{vegetarisch,vegan,glutenvrij}', 3, 40, '1. Kook de rijst volgens de verpakking.
2. Fruit de ui en de knoflook met de komijn en het paprikapoeder in een scheut water of wat kokosmelk.
3. Voeg de zoete aardappel in blokjes, de gezeefde tomaten en de kokosmelk toe en laat 20 minuten zacht koken.
4. Roer de kikkererwten en de spinazie erdoor en verwarm nog 5 minuten. Serveer met de rijst.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('a7451936-0435-4d64-b754-fbd365dc13d4', 'aardappelen-biefstuk-sperziebonen', 'Aardappelen met biefstuk en sperziebonen', 'diner', 'gemengd', '{glutenvrij}', 2, 30, '1. Schil de aardappelen en kook ze in ongeveer 20 minuten gaar.
2. Kook de sperziebonen in 8 minuten beetgaar.
3. Bak het vlees in de olie op hoog vuur, 2 tot 3 minuten per kant, en laat het even rusten.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('057e0b8d-5675-4563-bea6-b9bcb2284f10', 'linzenbolognese', 'Volkorenpasta met linzenbolognese', 'diner', 'gemengd', '{vegetarisch,vegan}', 3, 35, '1. Fruit de ui, de knoflook en de geraspte wortel in de olie.
2. Voeg de linzen, de gezeefde tomaten en 300 ml water toe en laat 25 minuten zacht koken tot de linzen gaar zijn.
3. Kook ondertussen de pasta en serveer met de saus.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('1ece67bd-f1b6-41c7-bfe0-3b8a0c049fa0', 'tofu-roerbak-rijst', 'Roerbak met tofu en zilvervliesrijst', 'diner', 'hoog_kh', '{vegetarisch,vegan}', 2, 25, '1. Kook de rijst volgens de verpakking.
2. Snijd de tofu in blokjes en bak ze in de olie goudbruin. Haal ze uit de pan.
3. Roerbak de groente met de geraspte gember 5 minuten.
4. Voeg de tofu en de sojasaus toe en serveer met de rijst.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('32894115-c03e-41f6-9e10-43b937f37e19', 'brood-banaan-honing', 'Witbrood met banaan en honing', 'voor_rit', 'hoog_kh', '{vegetarisch}', 1, 5, '1. Besmeer het brood dun met pindakaas.
2. Beleg met plakjes banaan en maak af met honing.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('950b45c0-4889-40d5-b782-7149ea7f5875', 'rijstwafels-jam', 'Rijstwafels met jam', 'voor_rit', 'hoog_kh', '{vegetarisch,vegan}', 1, 2, '1. Besmeer de rijstwafels met jam.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('06fea713-b4e4-4530-b174-172a2a6e8a5f', 'rijsttaartjes', 'Rijsttaartjes voor onderweg', 'tijdens_rit', 'hoog_kh', '{vegetarisch,glutenvrij}', 6, 40, '1. Kook de rijst met wat extra water tot hij zacht en plakkerig is. Laat afkoelen.
2. Prak de banaan en meng hem met de honing en het zout door de rijst.
3. Druk het mengsel stevig in een ingevette bakvorm en laat een nacht opstijven in de koelkast.
4. Snijd in zes stukken en pak ze per stuk in folie. Eén stuk is één portie.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('0dd398ce-8f16-4d0d-95b7-dce0e368208c', 'sportdrank-zelfgemaakt', 'Zelfgemaakte sportdrank', 'tijdens_rit', 'hoog_kh', '{vegetarisch,vegan,glutenvrij}', 1, 2, '1. Los de suiker en het zout op in een scheut warm water in de bidon.
2. Voeg de siroop toe en vul aan met koud water tot 750 ml.
3. Eén bidon is één portie, voor ongeveer een uur. Gewone suiker bevat glucose en fructose in een verhouding van 1:1.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('72468b68-9498-48b1-9cfe-3d37c8375d87', 'dadelrepen', 'Dadel-haverrepen', 'tijdens_rit', 'hoog_kh', '{vegetarisch,vegan}', 8, 20, '1. Maal de dadels in een keukenmachine tot een pasta.
2. Voeg de havervlokken, de pindakaas en het zout toe en maal tot een samenhangende massa.
3. Druk plat in een bakvorm en laat een uur opstijven in de koelkast.
4. Snijd in acht repen en pak ze per stuk in. Eén reep is één portie.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('aea6a980-7d7a-46c2-9133-6198d02e5e66', 'herstelshake', 'Herstelshake met banaan en kwark', 'na_rit', 'gemengd', '{vegetarisch}', 1, 5, '1. Doe alles in een blender en mix tot een gladde shake.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('31049746-afc1-400a-8d1f-c2066b8f759c', 'chocolademelk-krentenbol', 'Chocolademelk met een krentenbol', 'na_rit', 'hoog_kh', '{vegetarisch}', 1, 1, '1. Drink de chocolademelk en eet de krentenbol, het liefst binnen een uur na de rit.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('81541abc-2d9a-4252-98f1-880f7665af9b', 'kwark-walnoten-bessen', 'Kwark met blauwe bessen en walnoten', 'voor_slapen', 'eiwitrijk', '{vegetarisch,glutenvrij}', 1, 3, '1. Schep de kwark in een kom en maak af met de bessen, de gehakte walnoten en de kaneel.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('cdb8831a-8ecd-4f5e-8646-faf94ced6bcb', 'huttenkase-peer', 'Hüttenkäse met peer en kaneel', 'voor_slapen', 'eiwitrijk', '{vegetarisch,glutenvrij}', 1, 3, '1. Snijd de peer in blokjes en meng met de hüttenkäse. Strooi de kaneel erover.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('f861c89b-1dfc-4deb-911a-de47e66596fd', 'sojayoghurt-pindakaas', 'Sojayoghurt met pindakaas en bessen', 'voor_slapen', 'eiwitrijk', '{vegetarisch,vegan}', 1, 3, '1. Roer de pindakaas door de sojayoghurt en maak af met de blauwe bessen.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('52d2b15b-6cd2-41fc-8008-938f0110082a', 'yoghurt-muesli-appel', 'Yoghurt met muesli en appel', 'tussendoor', 'gemengd', '{vegetarisch}', 1, 3, '1. Schep de yoghurt in een kom, snijd de appel in stukjes en strooi de muesli erover.', true, NULL, '2026-11-09 15:09:15.668+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('435d7c8a-af94-43a7-91aa-766ddee54fd5', 'bircher-muesli', 'Bircher muesli met abrikoos en appel', 'ontbijt', 'hoog_kh', '{vegetarisch}', 4, 10, '1. Meng de havervlokken met de fijngesneden abrikozen, het sinaasappelsap, de melk, de yoghurt en de noten.
2. Rasp de appel erdoor en zet de kom een nacht afgedekt in de koelkast.
3. Schep in kommen en maak af met plakjes banaan en de honing.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/bircher_muesli', NULL, NULL, 'prive', false, NULL),
	('1b8d0ba8-f8c2-4f16-b164-2808e2363b57', 'eiwitrijke-havermout', 'Havermout met extra eiwit', 'ontbijt', 'gemengd', '{vegetarisch}', 1, 8, '1. Breng de havervlokken met de melk en een snuf zout aan de kook en laat al roerend een minuut doorkoken.
2. Haal van het vuur en roer de skyr erdoor.
3. Leg de banaan en de amandelen erop en schenk de honing erover.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/porridge', NULL, NULL, 'prive', false, NULL),
	('6b54561b-9a37-440b-abd1-6c7b07f6a838', 'pannenkoekjes-yoghurt-honing', 'Kleine pannenkoekjes met yoghurt en honing', 'ontbijt', 'hoog_kh', '{vegetarisch}', 2, 20, '1. Meng het bakmeel met de suiker. Klop het ei los met de yoghurt en de melk en roer dit door het meel tot een glad beslag.
2. Verhit de boter in een koekenpan en bak van lepels beslag kleine pannenkoekjes; keer ze als er belletjes verschijnen.
3. Serveer warm met de Griekse yoghurt, de bessen en de honing.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/pikelets', NULL, NULL, 'prive', false, NULL),
	('77613895-5629-4c8d-9659-083a5d284fb0', 'pannenkoeken-banaan', 'Pannenkoeken met banaan', 'ontbijt', 'hoog_kh', '{vegetarisch}', 2, 25, '1. Klop de bloem met de eieren, de melk en een snuf zout tot een glad beslag.
2. Bak in een beetje olie vier pannenkoeken.
3. Beleg met plakjes banaan, schenk de stroop erover en serveer met de kwark.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('1f53e60b-d541-474c-bf0d-630f77455f98', 'brood-pindakaas-banaan', 'Volkorenbrood met pindakaas en banaan', 'ontbijt', 'gemengd', '{vegetarisch,vegan,lactosevrij}', 1, 5, '1. Besmeer het brood met de pindakaas.
2. Beleg met plakjes banaan en drink er de sojadrink bij.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('2ecfdb95-f874-49d2-b9a1-bb47823381d0', 'yoghurt-muesli-fruit', 'Yoghurt met muesli en vers fruit', 'ontbijt', 'gemengd', '{vegetarisch}', 1, 5, '1. Schep de yoghurt in een kom.
2. Verdeel de muesli, de aardbeien en de kiwi erover en maak af met de honing.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('f5892e0b-808f-4949-b838-094d925d711e', 'wentelteefjes', 'Wentelteefjes met kaneel en appel', 'ontbijt', 'hoog_kh', '{vegetarisch}', 2, 15, '1. Klop de eieren los met de melk en de kaneel en week de sneden brood er kort in.
2. Bak ze in de boter aan beide kanten goudbruin.
3. Snijd de appel in dunne partjes, leg ze erop en bestrooi met de suiker.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('e6346e69-a8a4-456e-ae94-82c65a2097c1', 'cornflakes-banaan', 'Cornflakes met banaan en melk', 'ontbijt', 'hoog_kh', '{vegetarisch}', 1, 3, '1. Doe de cornflakes in een kom en snijd de banaan erboven in plakjes.
2. Schenk de melk erover en eet de yoghurt met honing ernaast.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('3890925f-776d-4302-8326-3e931ca76bc4', 'witbrood-jam-yoghurt', 'Witbrood met jam en een schaaltje yoghurt', 'ontbijt', 'hoog_kh', '{vegetarisch}', 1, 5, '1. Besmeer het brood met de jam.
2. Roer de honing door de yoghurt en eet die ernaast.
3. Drink er het sinaasappelsap bij.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('3d33afa8-3062-4745-8593-f64e2a82c84a', 'omelet-groente-brood', 'Groenteomelet met volkorenbrood', 'ontbijt', 'eiwitrijk', '{vegetarisch}', 1, 12, '1. Snijd de paprika en de champignons klein en bak ze in de olie.
2. Klop de eieren los met peper en zout, giet ze over de groente en laat op laag vuur stollen.
3. Strooi de kaas erover en serveer met het brood.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('236d4559-77db-4afa-a5e9-4db448dc5866', 'havermout-appel-kaneel', 'Havermout met appel en kaneel', 'ontbijt', 'hoog_kh', '{vegetarisch,vegan,lactosevrij}', 1, 10, '1. Snijd de appel in blokjes.
2. Breng de havervlokken met de sojadrink, de appel en de kaneel aan de kook en laat 3 minuten zacht koken.
3. Roer de rozijnen erdoor en maak af met de ahornsiroop.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('a86a99ce-e05c-4ae4-ab19-f2a9c7479435', 'broodjes-zalm-ei', 'Broodjes met gerookte zalm en ei', 'ontbijt', 'eiwitrijk', '{}', 1, 10, '1. Kook het ei in 8 minuten hard en snijd het in plakjes.
2. Besmeer de broodjes met de hüttenkäse.
3. Beleg met de zalm, het ei, de komkommer en wat peper.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('24bd888f-f780-4ad9-b594-141277c1ea1e', 'broodje-rosbief', 'Broodje rosbief met tomaat en komkommer', 'lunch', 'gemengd', '{}', 1, 5, '1. Snijd de broodjes open en besmeer ze met de mosterd.
2. Beleg met de rosbief, de plakjes komkommer en tomaat en de sla.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/roast_beef_bagel', NULL, NULL, 'prive', false, NULL),
	('1d43daa6-3599-4456-a56c-8b753121467d', 'pastasalade-kip', 'Pastasalade met kip en citroen-yoghurtdressing', 'lunch', 'hoog_kh', '{}', 4, 25, '1. Kook de pasta beetgaar en kook de doperwten, de maïs en de wortel de laatste 3 minuten mee. Giet af en laat afkoelen.
2. Bak de kipfilet in de olie gaar en snijd hem in stukjes. Snijd de bleekselderij klein.
3. Roer de yoghurt met het citroensap en peper tot een dressing en meng alles door elkaar.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/chicken_pasta_salad', NULL, NULL, 'prive', false, NULL),
	('e949a8ca-9367-4ce6-8eee-936640e76098', 'noedelsalade-zalm', 'Aziatische noedelsalade met zalm', 'lunch', 'gemengd', '{glutenvrij,lactosevrij}', 4, 25, '1. Snijd de paksoi, de peultjes, de wortel en de paprika in reepjes en blancheer ze 1 minuut. Spoel koud af.
2. Bak de zalm in de olie 3 minuten per kant.
3. Meng de mihoen met de groente en de maïs, maak aan met het citroensap, de gember en de honing en leg de zalm erop.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/sarahs_asian_salmon_salad', NULL, NULL, 'prive', false, NULL),
	('6d2dccab-8875-4329-b81b-d21c55975710', 'minestrone-brood', 'Minestrone met witte bonen en stokbrood', 'lunch', 'gemengd', '{}', 4, 35, '1. Fruit de ui met de ham in de olie. Voeg de wortel, de courgette en de tomaat in stukjes toe.
2. Schenk er 1 liter water bij met het bouillonpoeder en laat 15 minuten zacht koken.
3. Voeg de pasta, de doperwten en de bonen toe en kook nog 10 minuten. Serveer met het stokbrood.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/minestrone_by_nathan', NULL, NULL, 'prive', false, NULL),
	('b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', 'linzenburgers-brood', 'Linzenburgers met volkorenbrood', 'lunch', 'gemengd', '{vegetarisch}', 4, 40, '1. Kook de aardappel in blokjes gaar en prak hem fijn.
2. Meng de aardappel met de uitgelekte linzen, het paneermeel, het ei, de zaden, de amandelen, de ui, de knoflook en de peterselie en vorm acht burgers.
3. Bak ze in de olie aan beide kanten bruin en serveer met het brood en de sla.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/taylor-_made_lentil_patties', NULL, NULL, 'prive', false, NULL),
	('61a60e27-6edb-43cb-a8f0-afcd0a67d4c5', 'pita-kip-hummus', 'Pita met kip, hummus en rauwkost', 'lunch', 'gemengd', '{}', 2, 15, '1. Snijd de kipfilet in reepjes, bestrooi met het paprikapoeder en bak ze in de olie gaar.
2. Rooster de pita''s en snijd ze open.
3. Besmeer met de hummus en vul met de kip, de komkommer, de tomaat en de sla.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('da9bb414-e3d4-4729-8acc-48d7570aa308', 'rijstsalade-tonijn-mais', 'Rijstsalade met tonijn en maïs', 'lunch', 'hoog_kh', '{glutenvrij,lactosevrij}', 2, 20, '1. Kook de rijst gaar en laat hem afkoelen.
2. Snijd de paprika en de bosui klein.
3. Meng de rijst met de uitgelekte tonijn, de maïs en de groente en maak aan met de olie en het citroensap.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('773aa2cd-ab89-4b42-8997-8b74db0735dc', 'omelet-ham-brood', 'Omelet met ham op brood', 'lunch', 'eiwitrijk', '{}', 1, 10, '1. Klop de eieren los met peper en bak er in de olie een omelet van.
2. Leg de ham op het brood en de omelet erop.
3. Serveer met de tomaat in plakjes.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('54b1c89a-5f58-4517-834d-967f899df8b9', 'aardappelsalade-ei', 'Aardappelsalade met ei en sperziebonen', 'lunch', 'gemengd', '{vegetarisch,glutenvrij}', 2, 25, '1. Kook de aardappelen in stukken in 15 minuten gaar en kook de sperziebonen de laatste 6 minuten mee.
2. Kook de eieren in 8 minuten hard en snijd ze in partjes.
3. Roer de yoghurt met de mosterd en de bieslook tot een dressing en meng alles door elkaar.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('aec0eba2-b36a-4948-86cb-cc4de6349794', 'bulgursalade-kikkererwten', 'Bulgursalade met kikkererwten en munt', 'lunch', 'gemengd', '{vegetarisch,vegan,lactosevrij}', 2, 20, '1. Kook de bulgur in 10 minuten gaar en laat hem afkoelen.
2. Snijd de komkommer, de tomaat en de rode ui klein en hak de munt en de peterselie.
3. Meng alles met de uitgelekte kikkererwten, de olie en het citroensap.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('9416b18a-1fbe-44eb-a645-430504c0802e', 'wrap-zalm-huttenkase', 'Wrap met gerookte zalm en hüttenkäse', 'lunch', 'eiwitrijk', '{}', 1, 5, '1. Besmeer de wraps met de hüttenkäse.
2. Beleg met de zalm, de komkommer en de rucola en rol ze op.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('615f0278-6e61-4586-9388-2757221039de', 'linzensoep-brood', 'Tomaten-linzensoep met brood', 'lunch', 'gemengd', '{vegetarisch,vegan,lactosevrij}', 2, 30, '1. Fruit de ui, de knoflook en de wortel in de olie met de komijn.
2. Voeg de linzen, de gezeefde tomaat en 500 ml water met het zout toe en kook 25 minuten.
3. Pureer grof en serveer met het brood.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('3b0033fb-2192-42f9-aeb5-ef84658b04c1', 'quinoasalade-biet-feta', 'Quinoasalade met biet en feta', 'lunch', 'gemengd', '{vegetarisch,glutenvrij}', 2, 20, '1. Kook de quinoa in 12 minuten gaar en laat afkoelen.
2. Snijd de biet in blokjes.
3. Meng de quinoa met de biet, de rucola en de walnoten, verkruimel de feta erover en maak aan met de olie en de balsamico.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('f89e9293-2b93-4d66-9e8e-610027951be8', 'tosti-kaas-tomaat', 'Tosti met kaas en tomaat', 'lunch', 'gemengd', '{vegetarisch}', 1, 8, '1. Beleg twee sneden brood met de kaas en de tomaat in plakjes en leg de andere sneden erop.
2. Bak de tosti''s in een koekenpan of tosti-ijzer goudbruin.
3. Drink er de karnemelk bij.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('a30b4528-b35f-4c98-8468-c9446696457b', 'pastaschotel-gehakt-groente', 'Pastaschotel met gehakt en groente', 'diner', 'gemengd', '{}', 4, 45, '1. Kook de pasta beetgaar. Fruit de ui, rul het gehakt en bak de courgette, de wortel en de champignons mee.
2. Voeg de tomaten uit blik en de gezeefde tomaat toe en meng alles met de pasta in een ovenschaal.
3. Bind de melk met de maizena tot een saus, roer de kaas erdoor, giet over de schotel en bak 20 minuten op 200 °C.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/quick_pasta_casserole', NULL, NULL, 'prive', false, NULL),
	('683cd35a-57f0-4d62-8e41-4e611c3b0e7b', 'ovenrisotto-rund-zoete-aardappel', 'Ovenrisotto met rundergehakt en zoete aardappel', 'diner', 'gemengd', '{}', 4, 45, '1. Fruit de ui en de knoflook in de olie en rul het gehakt.
2. Meng in een ovenschaal met de rijst, 1 liter water met het bouillonpoeder, de spinazie en de zoete aardappel in kleine blokjes.
3. Bak afgedekt 20 minuten op 180 °C en daarna nog 10 minuten zonder deksel. Roer de Parmezaanse kaas erdoor.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/migration_baked_beef_risotto_2', NULL, NULL, 'prive', false, NULL),
	('841b7f61-d4aa-461f-bf25-71e660e9e5fb', 'gado-gado-pasta', 'Gado gado met pasta, ei en tofu', 'diner', 'gemengd', '{vegetarisch}', 4, 30, '1. Verwarm de pindakaas met de kerrie, de sojasaus, de sambal en de melk tot een gladde saus.
2. Kook de pasta gaar. Blancheer de broccoli, de wortel, de kool en de peultjes kort.
3. Verdeel de pasta over de borden met de groente, de taugé, de hardgekookte eieren en de tofu en schenk de saus erover.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/gado_gado_with_noodles', NULL, NULL, 'prive', false, NULL),
	('e3c5555a-83f7-43e7-8966-38c3d22e262e', 'pasta-zalm-ricotta', 'Pasta met zalm en ricotta', 'diner', 'hoog_kh', '{}', 4, 25, '1. Kook de pasta beetgaar. Pocheer de zalm 8 minuten in water dat net niet kookt en pluk hem in stukken.
2. Fruit de ui, de bleekselderij en de courgette in de olie.
3. Meng de pasta met de groente, de zalm en de ricotta en maak af met het citroensap en peper.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/rigatoni_with_salmon_and_ricotta', NULL, NULL, 'prive', false, NULL),
	('4b260022-5f77-472f-931b-1feb2b3d0243', 'couscous-marokkaans-rund', 'Marokkaans rundvlees met couscous', 'diner', 'gemengd', '{lactosevrij}', 4, 30, '1. Bak de biefstukreepjes kort aan in de olie en haal ze uit de pan.
2. Fruit de ui met de knoflook en de komijn, voeg de tomaten, de courgette, de spinazie en de rozijnen toe en laat 5 minuten sudderen. Doe het vlees terug.
3. Wel de couscous in kokend water, roer los en serveer met het vlees en de amandelen.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/morrocan-style_beef_with_couscous', NULL, NULL, 'prive', false, NULL),
	('8fc384e6-a3ef-4608-bb9e-74eb7d5e88ab', 'pasta-kip-mais', 'Pasta met kip en maïs', 'diner', 'hoog_kh', '{}', 4, 25, '1. Kook de pasta beetgaar.
2. Bak de knoflook, de bosui, de kipreepjes en de champignons in de olie tot de kip gaar is. Voeg de maïs en de zongedroogde tomaat toe en warm door.
3. Roer van het vuur de zure room erdoor en meng met de pasta.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/pasta_with_chicken_and_corn', NULL, NULL, 'prive', false, NULL),
	('5bbd49d1-4f88-45f9-be34-eee820ddf11b', 'pasta-kip-citroen', 'Pasta met kip, citroen en doperwten', 'diner', 'hoog_kh', '{}', 4, 25, '1. Kook de pasta beetgaar.
2. Bak de kipreepjes in de olie bruin, voeg 250 ml water met het bouillonpoeder, het citroensap en de doperwten toe en laat 5 minuten sudderen.
3. Roer de smeerkaas erdoor tot een saus en meng met de pasta en peper.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/fettucine_with_chicken_and_lemon', NULL, NULL, 'prive', false, NULL),
	('1c65c588-465a-4fd7-86c9-da01625bb581', 'tofu-ketjap-rijst', 'Gekarameliseerde tofu met rijst', 'diner', 'gemengd', '{vegetarisch,vegan,lactosevrij}', 4, 30, '1. Kook de rijst gaar. Bak de tofublokjes in de olie rondom bruin en haal ze uit de pan.
2. Bak de rode ui en de knoflook, voeg de ketjap, de suiker, de paprika en de peultjes toe en roerbak 3 minuten.
3. Doe de tofu terug, warm door en maak af met het citroensap.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/caramelised_tofu', NULL, NULL, 'prive', false, NULL),
	('268db3a3-16bf-41e7-ad75-afd7f4676edb', 'pasta-witte-bonen-tonijn', 'Penne met witte bonen en tonijn', 'diner', 'hoog_kh', '{lactosevrij}', 4, 20, '1. Kook de pasta beetgaar en schep de olie erdoor.
2. Snijd de tomaat in stukjes en de rode ui in dunne partjes.
3. Meng de pasta met de tomaat, de ui, de tonijn, de bonen, de peterselie, de kappertjes en het citroensap. Warm of koud te eten.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/bs_penne_with_butter_beans_and_tuna', NULL, NULL, 'prive', false, NULL),
	('a88888f4-b87e-46b1-9f8b-625dcb50a899', 'rijst-rund-groente-japans', 'Japans rundvlees met groente op rijst', 'diner', 'hoog_kh', '{lactosevrij}', 4, 30, '1. Kook de rijst gaar. Breng 500 ml water met de sojasaus en de suiker aan de kook en gaar het vlees erin.
2. Voeg de bosui, de broccoli, de peultjes, de doperwten en de paprika toe en kook 4 minuten.
3. Giet de losgeklopte eieren er in een dun straaltje bij, laat afgedekt stollen en schep over de rijst.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/japanese_beef_and_vegetables_on_rice', NULL, NULL, 'prive', false, NULL),
	('1f29b0b2-8088-480c-be14-8ecae7de4869', 'teriyaki-kip-rijst', 'Teriyaki-kip met rijst en groente', 'diner', 'gemengd', '{lactosevrij}', 4, 30, '1. Marineer de kipreepjes een half uur in de sojasaus en de suiker. Kook de rijst gaar.
2. Breng de kip met de marinade en 400 ml water aan de kook en gaar hem met de bosui, de broccoli, de peultjes en de paprika.
3. Bind de saus met de maizena, aangelengd met wat water, en serveer over de rijst.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/teriyaki_chicken', NULL, NULL, 'prive', false, NULL),
	('5818eb19-a0c2-42b0-abb1-987da2c22eee', 'spaghetti-chili-rund-bonen', 'Spaghetti met chili, rundergehakt en bonen', 'diner', 'hoog_kh', '{lactosevrij}', 5, 30, '1. Rul het gehakt met het chilipoeder in de olie.
2. Voeg de gezeefde tomaat en 250 ml water toe en laat 15 minuten sudderen. Voeg de bonen, de maïs en de paprika toe en kook nog 5 minuten.
3. Kook intussen de spaghetti beetgaar en meng met de saus.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/spaghetti_with_chilli_beef_and_beans', NULL, NULL, 'prive', false, NULL),
	('4bdb8d11-9170-4fd0-ac2b-fc5f3706d745', 'tilapia-courgette-couscous', 'Tilapia met courgette en couscous', 'diner', 'eiwitrijk', '{lactosevrij}', 2, 30, '1. Meng de olie met het fijngesneden basilicum en het citroensap. Leg de tilapia met de courgette in plakjes op folie, schenk de olie erover en vouw dicht.
2. Bak het pakketje 20 minuten in de oven op 175 °C.
3. Kook de broccoli in 4 minuten beetgaar en wel de couscous 10 minuten in 300 ml heet water met het bouillonpoeder.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Voedingscentrum', 'https://www.voedingscentrum.nl/recepten/gezond-recept/tilapia-met-courgette-en-couscous.aspx', NULL, NULL, 'prive', false, NULL),
	('7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', 'burritos-bonen', 'Burrito''s met kidneybonen', 'diner', 'hoog_kh', '{vegetarisch}', 3, 25, '1. Fruit de ui met de komijn in de olie. Voeg de bonen, de tomaten uit blik en de sambal toe en laat inkoken tot een dikke vulling.
2. Verwarm de wraps en verdeel de vulling erover.
3. Beleg met de sla, de tomaat, de kaas en de yoghurt en rol ze op.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/spicy_bean_burritos', NULL, NULL, 'prive', false, NULL),
	('4ccad626-9d41-4930-ad29-456584ca05df', 'nasi-kip-ei', 'Nasi met kip en ei', 'diner', 'hoog_kh', '{lactosevrij}', 2, 30, '1. Kook de rijst gaar en laat hem uitdampen.
2. Bak de kipblokjes in de olie, voeg de prei, de wortel en de kool toe en roerbak 5 minuten.
3. Schep de rijst erdoor met de ketjap en de sambal. Bak van de eieren een omelet, snijd hem in reepjes en leg die erop.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('1734d2fb-1a5f-4d92-80c7-a2562398cc52', 'ovenschotel-kabeljauw-aardappel', 'Ovenschotel met kabeljauw en aardappel', 'diner', 'gemengd', '{glutenvrij}', 2, 45, '1. Kook de aardappelen in plakken 8 minuten voor en verdeel ze over een ovenschaal met de prei in ringen.
2. Leg de kabeljauw erop, bestrooi met peper en zout en schenk de kookroom erover.
3. Strooi de kaas erover en bak 25 minuten op 200 °C.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('f671c554-acd0-4a84-9f08-4f15d905685c', 'gnocchi-tomaat-mozzarella', 'Gnocchi met tomatensaus en mozzarella', 'diner', 'hoog_kh', '{vegetarisch}', 2, 20, '1. Fruit de knoflook in de olie, voeg de gezeefde tomaat en de oregano toe en laat 10 minuten zacht koken.
2. Kook de gnocchi tot ze boven komen drijven en schep ze door de saus met de spinazie.
3. Scheur de mozzarella erover en maak af met basilicum.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('e5df4807-c44f-4be8-b4d1-252d55dd75b1', 'risotto-champignon-doperwten', 'Risotto met champignons en doperwten', 'diner', 'hoog_kh', '{vegetarisch,glutenvrij}', 2, 35, '1. Fruit de ui in de olie, bak de champignons mee en roer de rijst erdoor.
2. Voeg in delen 700 ml heet water met het zout toe en roer tot de rijst na ongeveer 20 minuten gaar is.
3. Roer de doperwten en de Parmezaanse kaas erdoor en warm door.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('6c6aacff-73bf-475c-a0ee-14148cf9de1c', 'chili-sin-carne-rijst', 'Chili sin carne met rijst', 'diner', 'hoog_kh', '{vegetarisch,vegan,glutenvrij,lactosevrij}', 2, 35, '1. Kook de rijst gaar.
2. Fruit de ui, de knoflook en de paprika in de olie met het chilipoeder en de komijn.
3. Voeg de bonen, de maïs en de tomaten uit blik toe en laat 15 minuten sudderen.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('bf1dae98-9514-4d42-b2bf-beeddfe723b3', 'traybake-kip-zoete-aardappel', 'Traybake met kip en zoete aardappel', 'diner', 'gemengd', '{glutenvrij,lactosevrij}', 2, 40, '1. Snijd de zoete aardappel in blokjes en de rode ui en de paprika in parten.
2. Meng alles op een bakplaat met de kip in stukken, de olie, het paprikapoeder en het zout.
3. Rooster 30 minuten op 200 °C en schep halverwege om.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('77f17a88-c0ba-41c5-b7d2-d3fd29d5ce49', 'pasta-pesto-kip-sperziebonen', 'Pasta pesto met kip en sperziebonen', 'diner', 'hoog_kh', '{}', 2, 20, '1. Kook de pasta beetgaar en kook de sperziebonen de laatste 6 minuten mee.
2. Bak de kipreepjes in de olie gaar.
3. Meng de pasta en de bonen met de pesto, de kip en de kerstomaatjes.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('d554da17-43f1-4875-b366-f889074e7594', 'stamppot-boerenkool-gehaktbal', 'Boerenkoolstamppot met een gehaktbal', 'diner', 'gemengd', '{glutenvrij}', 2, 40, '1. Kook de aardappelen met de boerenkool erop in 20 minuten gaar.
2. Kneed het gehakt met peper en zout, vorm twee ballen en braad ze in de olie in 15 minuten gaar.
3. Stamp de aardappelen en de kool met de melk en de mosterd tot een stamppot.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('aa99a9ec-ceda-43dd-a87a-c6953c8ad884', 'pokebowl-zalm-rijst', 'Pokébowl met zalm, rijst en komkommer', 'diner', 'gemengd', '{lactosevrij}', 2, 25, '1. Kook de rijst gaar en laat hem lauw worden.
2. Bak de zalm 3 minuten per kant en snijd hem in blokjes. Snijd de komkommer, de avocado en de wortel.
3. Verdeel alles over twee kommen en maak aan met de sojasaus, de sesamolie en het sesamzaad.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('6aa05449-cae3-4d05-a2c7-f6b4911ebc88', 'dal-rode-linzen-rijst', 'Dal van linzen met rijst', 'diner', 'hoog_kh', '{vegetarisch,vegan,glutenvrij,lactosevrij}', 2, 35, '1. Kook de rijst gaar.
2. Fruit de ui, de knoflook en de gember in de olie met de kerrie. Voeg de linzen, de tomaten en 400 ml water met het zout toe en kook 25 minuten.
3. Roer de spinazie erdoor en laat slinken.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('0966e4fd-c51b-4d52-aa63-9767e4a7a9ca', 'tempeh-ketjap-sperziebonen-rijst', 'Tempeh in ketjap met sperziebonen en rijst', 'diner', 'gemengd', '{vegetarisch,vegan,lactosevrij}', 2, 30, '1. Kook de rijst gaar en de sperziebonen in 8 minuten beetgaar.
2. Bak de tempeh in blokjes in de olie bruin en voeg de knoflook toe.
3. Schep de ketjap en de sambal erdoor en serveer met de rijst en de bonen.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('ff126058-6eef-42f5-b1b7-571b6faa0dfa', 'volkorenpasta-tonijn-tomaat', 'Volkorenpasta met tonijn-tomatensaus', 'diner', 'gemengd', '{lactosevrij}', 2, 20, '1. Kook de pasta beetgaar.
2. Fruit de ui en de knoflook in de olie, voeg de gezeefde tomaat en de olijven toe en laat 10 minuten zacht koken.
3. Roer de uitgelekte tonijn en de rucola erdoor en meng met de pasta.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('8723f85d-9d93-4b57-b088-9493ee971112', 'bananenmuffin-chocolade', 'Bananenmuffins met chocolade', 'tussendoor', 'hoog_kh', '{vegetarisch}', 12, 35, '1. Meng het bakmeel, het volkorenmeel, de suiker en de gehakte chocolade.
2. Roer de gesmolten boter, de melk, het ei, de yoghurt en de geprakte bananen erdoor tot het net gemengd is.
3. Verdeel over 12 muffinvormpjes en bak 20 tot 25 minuten op 180 °C.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/banana_and_choc_muffin', NULL, NULL, 'prive', false, NULL),
	('d971163e-0e1c-4bd9-b6d7-be96a2f7d249', 'abrikoos-havermuffin', 'Havermuffins met abrikoos', 'tussendoor', 'hoog_kh', '{vegetarisch}', 12, 35, '1. Meng het bakmeel, het volkorenmeel, de havervlokken, de suiker en de fijngesneden abrikozen.
2. Klop de yoghurt met de melk, de eieren en de olie los en roer dit kort door het meel.
3. Verdeel over 12 muffinvormpjes en bak 20 tot 25 minuten op 180 °C.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/apricot_and_oat_muffin', NULL, NULL, 'prive', false, NULL),
	('e0952104-a887-46ae-9c45-c5bed4444aab', 'krentenbol-kaas', 'Krentenbol met kaas', 'tussendoor', 'gemengd', '{vegetarisch}', 1, 2, '1. Snijd de krentenbol open en beleg met de kaas.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('97ccf0ed-dfba-4ab6-ac72-f81bef6e6748', 'ontbijtkoek-appel', 'Ontbijtkoek met een appel', 'tussendoor', 'hoog_kh', '{vegetarisch}', 1, 1, '1. Snijd twee plakken ontbijtkoek en eet de appel erbij.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('80bff38e-662e-47fe-9de1-d776fe657296', 'yoghurt-honing-walnoten', 'Yoghurt met honing en walnoten', 'tussendoor', 'gemengd', '{vegetarisch,glutenvrij}', 1, 2, '1. Schep de yoghurt in een schaaltje, schenk de honing erover en strooi de walnoten erop.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('4e3697e0-b667-4e55-8165-aeb9bbfa9bc5', 'rijstwafel-pindakaas-banaan', 'Rijstwafels met pindakaas en banaan', 'tussendoor', 'gemengd', '{vegetarisch,vegan,glutenvrij,lactosevrij}', 1, 3, '1. Besmeer de rijstwafels met de pindakaas en beleg met plakjes banaan.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('e5a9eae5-23f5-40e7-bf4e-0965396e0fb0', 'fruitsmoothie', 'Fruitsmoothie met banaan en aardbei', 'tussendoor', 'hoog_kh', '{vegetarisch,glutenvrij}', 1, 5, '1. Pureer de banaan met de aardbeien, het sinaasappelsap en de yoghurt tot een gladde smoothie.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('f079d961-eb74-4411-838d-fe00a8a21e10', 'crackers-huttenkase', 'Crackers met hüttenkäse en tomaat', 'tussendoor', 'eiwitrijk', '{vegetarisch}', 1, 3, '1. Beleg de crackers met de hüttenkäse en de tomaat in plakjes en bestrooi met peper.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('f0528707-798b-4c06-b479-72f4dc84d8eb', 'noten-rozijnen', 'Noten met rozijnen', 'tussendoor', 'gemengd', '{vegetarisch,vegan,glutenvrij,lactosevrij}', 1, 1, '1. Meng de noten met de rozijnen en neem ze mee in een bakje.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('e6a665e2-ac62-4698-91f4-e6fef04e9726', 'kwark-fruit', 'Kwark met fruit', 'tussendoor', 'eiwitrijk', '{vegetarisch,glutenvrij}', 1, 3, '1. Snijd de peer in stukjes en schep ze met de frambozen door de kwark.
2. Maak af met de honing.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('3c94c342-59c0-444f-8e5d-fd43f0b263fe', 'pita-hummus-wortel', 'Pita met hummus en wortel', 'tussendoor', 'gemengd', '{vegetarisch,vegan,lactosevrij}', 1, 5, '1. Rooster de pita en snijd hem in punten.
2. Snijd de wortel in staafjes en dip beide in de hummus.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('ca67a1e5-be52-4bc5-bf06-5679ae7603e9', 'rijstepap-kaneel', 'Rijstepap met kaneel', 'voor_rit', 'hoog_kh', '{vegetarisch,glutenvrij}', 4, 40, '1. Spoel de rijst en breng hem met de melk en de suiker aan de kook.
2. Laat op laag vuur in ongeveer 30 minuten gaar worden tot de melk is opgenomen; roer geregeld.
3. Roer de kaneel erdoor en strooi de cranberry''s erover. Warm of koud te eten.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', 'Australian Institute of Sport', 'https://www.ausport.gov.au/nutrition/recipes/creamed_rice', NULL, NULL, 'prive', false, NULL),
	('bd0c9808-55e0-4e0d-b3e3-4bbcca08f716', 'krentenbollen-jam', 'Krentenbollen met jam', 'voor_rit', 'hoog_kh', '{vegetarisch}', 1, 2, '1. Snijd de krentenbollen open en besmeer ze met de jam.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('22ae1a93-d1a8-4ac2-96dd-9a8287fdffac', 'pannenkoek-stroop', 'Pannenkoeken met stroop', 'voor_rit', 'hoog_kh', '{vegetarisch}', 2, 20, '1. Klop de pannenkoekmix met de melk tot een glad beslag.
2. Bak in de olie vier dunne pannenkoeken.
3. Schenk de stroop erover.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('8af3ff0d-f409-43c7-b4eb-12c14e02ab3a', 'ontbijtkoek-banaan', 'Ontbijtkoek met banaan', 'voor_rit', 'hoog_kh', '{vegetarisch}', 1, 1, '1. Snijd drie plakken ontbijtkoek en eet de banaan erbij.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('add0e7f3-d42a-4285-9b51-7789b8e647ad', 'pasta-tomaat-licht', 'Witte pasta met lichte tomatensaus', 'voor_rit', 'hoog_kh', '{vegetarisch,vegan,lactosevrij}', 1, 15, '1. Kook de pasta gaar.
2. Verwarm de gezeefde tomaat met de olie, het zout en het basilicum en meng met de pasta.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('de86c180-2ba1-40a0-a05e-4964aa22a801', 'rijstwafels-honing-banaan', 'Rijstwafels met honing en banaan', 'voor_rit', 'hoog_kh', '{vegetarisch,glutenvrij,lactosevrij}', 1, 2, '1. Besmeer de rijstwafels met de honing en beleg met plakjes banaan.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('30fc8000-eefd-4f8f-a938-fae3556b4449', 'smoothie-banaan-haver', 'Smoothie van banaan, haver en sinaasappelsap', 'voor_rit', 'hoog_kh', '{vegetarisch,vegan,lactosevrij}', 1, 5, '1. Pureer de banaan met de havervlokken, het sinaasappelsap en de ahornsiroop tot een gladde smoothie.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('d2137d1a-bc49-44c2-ac76-cc4ae8272e6b', 'witte-broodjes-kipfilet', 'Witte broodjes met kipfilet', 'voor_rit', 'hoog_kh', '{}', 1, 3, '1. Snijd de broodjes open en beleg ze met de kipfilet.
2. Drink er het appelsap bij.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('734db503-7a63-4029-aeb7-c9c7ba5716b9', 'krentenbol-jam-onderweg', 'Krentenbol met jam', 'tijdens_rit', 'hoog_kh', '{vegetarisch}', 1, 2, '1. Snijd de krentenbol open, besmeer met de jam en verpak hem in folie.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('640bc051-2806-45ce-b46a-ddce03b968bd', 'banaan-ontbijtkoek', 'Banaan en ontbijtkoek', 'tijdens_rit', 'hoog_kh', '{vegetarisch}', 1, 1, '1. Snijd de ontbijtkoek in twee plakken en verpak ze. Neem de banaan in je achterzak mee.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('3d8cef63-b092-49dc-98ae-f157ebfe40d0', 'wit-broodje-jam', 'Zacht wit broodje met jam', 'tijdens_rit', 'hoog_kh', '{vegetarisch}', 1, 2, '1. Snijd het broodje open, besmeer royaal met de jam en verpak het in folie.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('d138822b-bc63-4605-8739-c4965c44f9bc', 'sandwich-pindakaas-jam', 'Sandwich met pindakaas en jam', 'tijdens_rit', 'hoog_kh', '{vegetarisch}', 1, 3, '1. Besmeer één snee brood dun met de pindakaas en de andere met de jam.
2. Leg ze op elkaar, snijd doormidden en verpak in folie.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('87a2e035-919c-494a-af10-18a7825e1f6d', 'haverkoekjes-banaan', 'Haverkoekjes met banaan en rozijnen', 'tijdens_rit', 'hoog_kh', '{vegetarisch,vegan,lactosevrij}', 6, 25, '1. Prak de bananen en meng ze met de havervlokken, de rozijnen, de ahornsiroop en het zout.
2. Vorm 12 koekjes op een bakplaat met bakpapier.
3. Bak 15 minuten op 180 °C. Twee koekjes zijn één portie.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('c0e0f9d7-2e94-48f7-be65-801718f51de1', 'zoute-aardappeltjes', 'Gekookte aardappeltjes met zout', 'tijdens_rit', 'hoog_kh', '{vegetarisch,vegan,glutenvrij,lactosevrij}', 1, 20, '1. Kook de aardappeltjes in de schil in 15 minuten gaar en laat ze afkoelen.
2. Bestrooi met het zout, schenk de siroop erover en neem ze mee in een zakje.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('71cace00-8148-480c-aa19-6163a162a2d2', 'dadels-winegums', 'Dadels en winegums', 'tijdens_rit', 'hoog_kh', '{lactosevrij}', 1, 1, '1. Doe de dadels en de winegums samen in een zakje voor in je achterzak.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('443cb954-072a-48c2-a267-2123a4807ff7', 'appelsap-sportdrank', 'Sportdrank van appelsap', 'tijdens_rit', 'hoog_kh', '{vegetarisch,vegan,glutenvrij,lactosevrij}', 1, 2, '1. Meng het appelsap met het water, de suiker en het zout in een bidon en schud tot alles is opgelost.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('4c250762-4bc7-417a-8944-0059a64695ba', 'mueslireep-banaan', 'Mueslireep en banaan', 'tijdens_rit', 'hoog_kh', '{vegetarisch}', 1, 1, '1. Neem de mueslireep en de banaan mee in je achterzak.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('f00e2b7e-1474-4a1c-bbd5-1a981de8c696', 'kwark-banaan-muesli', 'Kwark met banaan en muesli', 'na_rit', 'gemengd', '{vegetarisch}', 1, 3, '1. Schep de kwark in een kom en snijd de banaan erboven in plakjes.
2. Strooi de muesli erover en maak af met de honing.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('c164e5b6-8aac-4215-a640-2def524c3ee4', 'rijst-kip-snel', 'Snelle rijst met kip en doperwten', 'na_rit', 'hoog_kh', '{glutenvrij,lactosevrij}', 1, 20, '1. Kook de rijst gaar en kook de doperwten de laatste 3 minuten mee.
2. Bak de kipblokjes in de olie gaar met het paprikapoeder en het zout.
3. Schep alles door elkaar.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('680cb6ed-5ca8-49ba-aaee-6445f96e90e9', 'wrap-omelet', 'Wrap met omelet en tomaat', 'na_rit', 'gemengd', '{vegetarisch}', 1, 8, '1. Klop de eieren los met peper en zout en bak er in de olie een omelet van.
2. Leg de omelet op de wraps met de tomaat in plakjes en rol ze op.
3. Drink er het sinaasappelsap bij.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('d329c3c2-92be-440f-a4a8-607c164ddf97', 'smoothie-skyr-bessen', 'Herstelsmoothie met skyr en bessen', 'na_rit', 'gemengd', '{vegetarisch}', 1, 5, '1. Pureer de skyr met de banaan, de bessen, de havervlokken, de honing en de melk tot een gladde smoothie.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('8685f8a1-fb8f-4475-80c4-6ad1b55dd2a7', 'broodjes-ei-ham', 'Broodjes met ei en ham', 'na_rit', 'gemengd', '{}', 1, 10, '1. Kook het ei in 8 minuten hard en snijd het in plakjes.
2. Beleg de broodjes met de ham en het ei.
3. Drink er het appelsap bij.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('190da15d-c5e2-4e0f-bca4-d1c271a1f273', 'vla-banaan-cornflakes', 'Vla met banaan en cornflakes', 'na_rit', 'hoog_kh', '{vegetarisch}', 1, 3, '1. Roer de kwark door de vla.
2. Snijd de banaan erboven in plakjes en strooi de cornflakes erover.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('5f1698dd-52ce-437c-851f-4ee7daa941de', 'pasta-tonijn-snel', 'Snelle pasta met tonijn', 'na_rit', 'hoog_kh', '{lactosevrij}', 1, 15, '1. Kook de pasta gaar.
2. Verwarm de gezeefde tomaat met de uitgelekte tonijn en de olie.
3. Meng met de pasta.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('3164b489-ee1a-49b4-a6b5-77196138b2c6', 'sojashake-banaan-haver', 'Plantaardige herstelshake', 'na_rit', 'gemengd', '{vegetarisch,vegan,lactosevrij}', 1, 5, '1. Pureer de sojadrink met de banaan, de havervlokken, de pindakaas en de ahornsiroop tot een gladde shake.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('de4f22ac-2d0b-4d1f-88bc-ab58c477365d', 'yoghurt-honing-rijstwafels', 'Griekse yoghurt met honing en rijstwafels', 'na_rit', 'gemengd', '{vegetarisch,glutenvrij}', 1, 3, '1. Roer de honing door de yoghurt.
2. Eet de rijstwafels met jam ernaast.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('71c6e752-88da-491e-a7c5-cf0dba6cec7d', 'pannenkoeken-kwark-fruit', 'Pannenkoeken met kwark en aardbeien', 'na_rit', 'gemengd', '{vegetarisch}', 2, 20, '1. Klop de pannenkoekmix met de melk en het ei tot een glad beslag en bak in de olie vier pannenkoeken.
2. Beleg met de kwark en de aardbeien in plakjes en schenk de stroop erover.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('d5ea18c8-c2fd-4b6a-8bfa-b1d7e013be5a', 'skyr-banaan-honing', 'Skyr met banaan en honing', 'voor_slapen', 'eiwitrijk', '{vegetarisch,glutenvrij}', 1, 2, '1. Schep de skyr in een kom, snijd de banaan erboven in plakjes en schenk de honing erover.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('b46538e6-dd2a-4663-9c9e-162ecbb7235e', 'griekse-yoghurt-frambozen', 'Magere Griekse yoghurt met frambozen en amandelen', 'voor_slapen', 'eiwitrijk', '{vegetarisch,glutenvrij}', 1, 2, '1. Schep de yoghurt in een kom en verdeel de frambozen en de amandelen erover.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('fbdcb350-3600-416e-9ecf-2ed8979d4988', 'kwark-appel-kaneel', 'Kwark met appel en kaneel', 'voor_slapen', 'eiwitrijk', '{vegetarisch,glutenvrij}', 1, 3, '1. Snijd de appel in blokjes en schep ze met de kaneel door de kwark.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('0cd0a85c-e263-48bb-bbd8-5e23af6b2000', 'huttenkase-roggebrood', 'Hüttenkäse op roggebrood', 'voor_slapen', 'eiwitrijk', '{vegetarisch}', 1, 3, '1. Verdeel de hüttenkäse over het roggebrood.
2. Leg de komkommer in plakjes erop en bestrooi met peper.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('e4b3afc4-4d0a-4fb1-b8f7-5b11d1567624', 'kwarkshake-cacao', 'Kwarkshake met cacao', 'voor_slapen', 'eiwitrijk', '{vegetarisch,glutenvrij}', 1, 3, '1. Mix de kwark met de melk, de cacao en de honing tot een gladde shake.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL),
	('8593c3a4-870c-4ded-a23e-105ab18f16e8', 'lactosevrije-kwark-bessen', 'Lactosevrije kwark met blauwe bessen', 'voor_slapen', 'eiwitrijk', '{vegetarisch,glutenvrij,lactosevrij}', 1, 2, '1. Schep de kwark in een kom en verdeel de bessen en de walnoten erover.', true, NULL, '2026-11-09 15:09:16.129+01', '2026-11-09 15:09:16.129+01', NULL, NULL, NULL, NULL, 'prive', false, NULL);


--
-- Data for Name: nutrition_log_meals; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: nutrition_products; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: nutrition_log_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: nutrition_menu_choices; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: nutrition_profiles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: nutrition_recipe_ingredients; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.nutrition_recipe_ingredients VALUES
	('74622946-2093-4b0a-aeea-e04a34cf97df', '2b0f5594-5227-436f-81d3-e50b8aa746b0', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 0, 70, 'kh_bron', NULL, NULL),
	('43d554fc-47e6-497b-903f-67b889ded5c8', '2b0f5594-5227-436f-81d3-e50b8aa746b0', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 120, 'kh_bron', NULL, NULL),
	('2412c81c-5297-42fd-8376-64abd7699f76', '2b0f5594-5227-436f-81d3-e50b8aa746b0', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 10, 'kh_bron', NULL, NULL),
	('32b12f9e-b3ce-4630-9c17-c7cf15ac3e3e', '2b0f5594-5227-436f-81d3-e50b8aa746b0', '4c825261-f67d-4d51-b1a3-f200345460c8', 3, 100, 'eiwit_bron', NULL, NULL),
	('d528edd4-84f4-4be1-9a98-f7f6417c52f6', '2b0f5594-5227-436f-81d3-e50b8aa746b0', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 4, 250, 'vast', NULL, NULL),
	('26ab0977-8b31-4e8c-8c79-32c278199ed4', '436f0d95-5ce7-42eb-8a6b-ca47aec3d2cb', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 0, 60, 'kh_bron', NULL, NULL),
	('9fdc9e15-5c16-47db-94c5-52aec4ef9db6', '436f0d95-5ce7-42eb-8a6b-ca47aec3d2cb', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 1, 10, 'kh_bron', NULL, NULL),
	('94b5d0a9-87b8-4f2b-9544-a76140230343', '436f0d95-5ce7-42eb-8a6b-ca47aec3d2cb', '984b1758-daac-4163-ad87-da5463448872', 2, 150, 'eiwit_bron', NULL, NULL),
	('3cfc003a-bec2-41ed-970e-7fbc45b19308', '436f0d95-5ce7-42eb-8a6b-ca47aec3d2cb', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 3, 100, 'vast', NULL, NULL),
	('f0064c6a-99e4-4e72-8c80-309dda8c1628', '436f0d95-5ce7-42eb-8a6b-ca47aec3d2cb', '1e7b6dfa-0854-4eb3-9abe-ccb8eb83b5a5', 4, 100, 'vast', NULL, NULL),
	('ca95e59b-7299-4758-b354-47c9ab93a94d', '436f0d95-5ce7-42eb-8a6b-ca47aec3d2cb', 'c3d7d0cb-54e6-4a34-b7ec-73de1b7bd6c9', 5, 1, 'vast', NULL, NULL),
	('e7b1662f-731a-4c26-8512-fabfa78f04b7', 'e690b822-8720-4491-943b-b48b0ef5c079', 'bcdeba2c-4c8d-4122-abc6-c790521163de', 0, 70, 'kh_bron', NULL, NULL),
	('46a0e847-a199-4fab-91da-3c3ef0024bdc', 'e690b822-8720-4491-943b-b48b0ef5c079', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 1, 120, 'eiwit_bron', NULL, NULL),
	('e503e690-4d65-4d5c-b376-84a2ebe0e7e0', 'e690b822-8720-4491-943b-b48b0ef5c079', '2f19d7da-fda2-410c-bde0-ab19b6a889d0', 2, 50, 'vast', NULL, NULL),
	('0773958b-0fdf-4a74-9c4a-8db3f8e225d2', 'e690b822-8720-4491-943b-b48b0ef5c079', '221ea599-6289-4ac4-97b8-71475916afde', 3, 100, 'vast', NULL, NULL),
	('f5694b3d-a533-45df-b9a0-e1dcf2f594a3', 'e690b822-8720-4491-943b-b48b0ef5c079', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 4, 5, 'vast', NULL, NULL),
	('83f62a81-bf75-4fda-9811-efcaf058f12a', 'f4a442b1-77f6-4bb0-a2a8-5dd01c78ee66', '3c103f2e-5289-47fb-a99a-67caac4cc478', 0, 120, 'kh_bron', NULL, NULL),
	('9caf0e3a-89fe-4f93-8b1f-c866206ec7b5', 'f4a442b1-77f6-4bb0-a2a8-5dd01c78ee66', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 1, 200, 'eiwit_bron', NULL, NULL),
	('4d5d2a32-12cc-418e-875b-f23b916a497b', 'f4a442b1-77f6-4bb0-a2a8-5dd01c78ee66', 'd9325545-0203-4fa2-a43b-08029f9656cd', 2, 60, 'vast', NULL, NULL),
	('9efd9530-2762-4561-bc9c-280359ad9e39', 'f4a442b1-77f6-4bb0-a2a8-5dd01c78ee66', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 3, 150, 'vast', NULL, NULL),
	('1eed2678-bda3-482f-85f8-0636e29ecdd5', 'f4a442b1-77f6-4bb0-a2a8-5dd01c78ee66', '9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 4, 100, 'vast', NULL, NULL),
	('176b0db1-e82d-4865-b632-a07b06f62818', 'f4a442b1-77f6-4bb0-a2a8-5dd01c78ee66', '3d935147-765f-4506-b74f-99e4653e4724', 5, 60, 'vast', NULL, NULL),
	('ebdc822a-4226-4d35-9698-8bdd8e9c165d', 'f4a442b1-77f6-4bb0-a2a8-5dd01c78ee66', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 6, 5, 'vast', NULL, NULL),
	('e383ad9d-f7d4-4e12-9e2c-ad631e9fc61e', '6ccf1915-8223-46ca-a190-001cf6bd4d57', 'b8929810-ea50-49ce-8f5e-cc8cbceb7df5', 0, 150, 'kh_bron', NULL, NULL),
	('a20ef987-6997-485a-8356-d04e36207701', '6ccf1915-8223-46ca-a190-001cf6bd4d57', 'a088ecaf-37d6-489f-9f78-9326a01d4418', 1, 100, 'eiwit_bron', NULL, NULL),
	('d2223ca2-167a-4408-af7b-61e380a8b19c', '6ccf1915-8223-46ca-a190-001cf6bd4d57', '221ea599-6289-4ac4-97b8-71475916afde', 2, 200, 'vast', NULL, NULL),
	('fe35d1cc-8e41-4d37-a167-09378522ae58', '6ccf1915-8223-46ca-a190-001cf6bd4d57', '9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 3, 150, 'vast', NULL, NULL),
	('45190935-bccf-4ebf-94b9-afed4fa9297e', '6ccf1915-8223-46ca-a190-001cf6bd4d57', 'ee790d34-d5bf-478b-8985-1c6a12976110', 4, 50, 'vast', NULL, NULL),
	('f5ec3133-2136-48ae-8c9c-8abd47a9896d', '6ccf1915-8223-46ca-a190-001cf6bd4d57', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 5, 15, 'vast', NULL, NULL),
	('b6a1b824-6b3f-4443-832a-9ecf11ff86a1', '6ccf1915-8223-46ca-a190-001cf6bd4d57', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 6, 15, 'vast', NULL, NULL),
	('40b773ca-6890-480b-a52c-7f8601cea5e7', '9d5231ad-ca6e-4324-b14c-c306d717e453', 'd674a06d-2c56-4645-87ae-515ad073dfb0', 0, 150, 'kh_bron', NULL, NULL),
	('eca1c05e-0459-4b52-b051-1e314eda4630', '9d5231ad-ca6e-4324-b14c-c306d717e453', '749eb8db-d012-4e34-ad24-830873f30827', 1, 30, 'kh_bron', NULL, NULL),
	('9d76ff75-f87d-458a-ba99-f31cde10254e', '9d5231ad-ca6e-4324-b14c-c306d717e453', 'bb307cdd-855d-46b6-95db-95b29d7e57d5', 2, 240, 'eiwit_bron', NULL, NULL),
	('5f60cd4a-dc31-478c-bae4-ad4bed83855d', '9d5231ad-ca6e-4324-b14c-c306d717e453', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 3, 150, 'vast', NULL, NULL),
	('55a2d71b-19cb-4ca8-a43a-8f433c51bc0c', '9d5231ad-ca6e-4324-b14c-c306d717e453', '9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 4, 150, 'vast', NULL, NULL),
	('796b6765-2826-4451-a27c-b05ac048203a', '9d5231ad-ca6e-4324-b14c-c306d717e453', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 5, 15, 'vast', NULL, NULL),
	('69591bdf-72d9-495d-888c-a65ffbff2baf', '9d5231ad-ca6e-4324-b14c-c306d717e453', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 6, 20, 'vast', NULL, NULL),
	('17c45058-5fa5-403d-ab34-0c3506574dc1', '687eb2bb-afcc-4fcf-ba79-b7c2f6479fe4', 'bcdeba2c-4c8d-4122-abc6-c790521163de', 0, 105, 'kh_bron', NULL, NULL),
	('02d7db1a-2613-429a-ab2b-9a188a8455ea', '687eb2bb-afcc-4fcf-ba79-b7c2f6479fe4', 'd56aa88a-95cf-43b0-ba94-5ebab9d692d1', 1, 110, 'eiwit_bron', NULL, NULL),
	('240709eb-9e14-4524-917d-52dbac88970f', '687eb2bb-afcc-4fcf-ba79-b7c2f6479fe4', '48e78c63-b415-4965-87d8-1ba663190bcd', 2, 30, 'vast', NULL, NULL),
	('646de753-ec9d-4462-abfd-d2cbdb291b54', '687eb2bb-afcc-4fcf-ba79-b7c2f6479fe4', '221ea599-6289-4ac4-97b8-71475916afde', 3, 100, 'vast', NULL, NULL),
	('988ca2bf-725f-4e46-bb6e-0788ea2f9a74', '687eb2bb-afcc-4fcf-ba79-b7c2f6479fe4', '3d935147-765f-4506-b74f-99e4653e4724', 4, 30, 'vast', NULL, NULL),
	('8f1e55e5-d475-4a3f-96b6-a60ad2d04f44', '5363317d-1a6e-45c1-a9c9-a05f9247b667', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 200, 'kh_bron', NULL, NULL),
	('a907def7-33ab-404f-b068-fc4c7ab8c944', '5363317d-1a6e-45c1-a9c9-a05f9247b667', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 1, 250, 'eiwit_bron', NULL, NULL),
	('eb6b4541-9834-4da9-afdc-6866014a9f21', '5363317d-1a6e-45c1-a9c9-a05f9247b667', '38357f1b-37fd-4ae8-9780-382b6c77da62', 2, 400, 'vast', NULL, NULL),
	('44b21c7a-827c-4e07-9c75-00ba4d34c29f', '5363317d-1a6e-45c1-a9c9-a05f9247b667', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 3, 150, 'vast', NULL, NULL),
	('774e2921-c43e-4c73-8c71-6480bbef7d44', '5363317d-1a6e-45c1-a9c9-a05f9247b667', 'ee790d34-d5bf-478b-8985-1c6a12976110', 4, 100, 'vast', NULL, NULL),
	('abce7155-01e1-402e-b777-14bf1e3fd85f', '5363317d-1a6e-45c1-a9c9-a05f9247b667', '2e426ad1-3014-45cc-8996-321ec5333982', 5, 6, 'vast', NULL, NULL),
	('9efd7785-3a6f-494b-80e6-c00cc923a6cc', '5363317d-1a6e-45c1-a9c9-a05f9247b667', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 6, 15, 'vast', NULL, NULL),
	('0ee7a533-fec0-4ff2-adc5-942651bf40d6', '5363317d-1a6e-45c1-a9c9-a05f9247b667', '90ff3661-2751-4b46-a022-b2228d5176c8', 7, 20, 'vast', NULL, NULL),
	('171a178d-1cbb-40c3-87ea-e0800014a07d', '082eb8d6-b079-4d95-917c-2713a9da341c', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 150, 'kh_bron', NULL, NULL),
	('8ea8d6e3-0998-42e0-9583-6ab5a3583ca1', '082eb8d6-b079-4d95-917c-2713a9da341c', 'fcf695c0-9882-45e7-ab70-023f324a353f', 1, 250, 'eiwit_bron', NULL, NULL),
	('a4b0b4f0-5a98-482d-b813-60a14c039e1d', '082eb8d6-b079-4d95-917c-2713a9da341c', '41de54ea-857a-4200-baa3-6879f0733b02', 2, 400, 'vast', NULL, NULL),
	('820c0dbc-7bcf-40f1-9592-e11a9eb86371', '082eb8d6-b079-4d95-917c-2713a9da341c', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 3, 10, 'vast', NULL, NULL),
	('6cfa5f9a-c111-498b-b269-d47c612cf536', '082eb8d6-b079-4d95-917c-2713a9da341c', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 4, 20, 'vast', NULL, NULL),
	('c964f3c6-5121-483c-8f67-a39b43248033', 'b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 180, 'kh_bron', NULL, NULL),
	('5ba584e0-4377-41a0-b464-f1c3a4287cdd', 'b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', '802a343b-5924-4e1d-97f9-4f1f1e4f7ad9', 1, 400, 'kh_bron', NULL, NULL),
	('64588ea0-eafd-4fc8-b8f9-5a608467772f', 'b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', 'bb307cdd-855d-46b6-95db-95b29d7e57d5', 2, 240, 'eiwit_bron', NULL, NULL),
	('864f0011-c369-4396-b172-8beeef1402b8', 'b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', 'f208f75e-689c-4f22-ad12-29a61fee1825', 3, 200, 'vast', NULL, NULL),
	('cec6e4f0-a78e-43ca-bd86-0522d215af9a', 'b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', '38357f1b-37fd-4ae8-9780-382b6c77da62', 4, 250, 'vast', NULL, NULL),
	('77528b28-e072-411f-a393-f4b56bf09b08', 'b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', '2f19d7da-fda2-410c-bde0-ab19b6a889d0', 5, 150, 'vast', NULL, NULL),
	('c08d2e71-778a-40a2-bf3d-c5cb9570bc16', 'b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', 'ee790d34-d5bf-478b-8985-1c6a12976110', 6, 100, 'vast', NULL, NULL),
	('2d78352d-b270-4544-953b-4c868782006c', 'b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', '2e426ad1-3014-45cc-8996-321ec5333982', 7, 6, 'vast', NULL, NULL),
	('7f6902b9-0ff8-4c06-9905-118d13660628', 'b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', 'b1896ce0-252d-4b27-a524-17d1f0757cae', 8, 3, 'vast', NULL, NULL),
	('6e5ea968-e3a0-4188-a03f-5052fb16f3c9', 'b5d4ccc0-0101-456b-8d31-b2030ce1a4c5', '0335d990-6aee-4a17-9cef-a9113fcce874', 9, 3, 'vast', NULL, NULL),
	('5806f717-1713-434c-a873-cdb623af85f7', 'a7451936-0435-4d64-b754-fbd365dc13d4', '31ede4fb-d3e8-41f1-800b-8f65ab6a49a3', 0, 600, 'kh_bron', NULL, NULL),
	('0344c0a5-8025-483d-b19c-a243166f84bf', 'a7451936-0435-4d64-b754-fbd365dc13d4', '4c069bbd-b6d3-4c18-9f16-4f98225e6169', 1, 250, 'eiwit_bron', NULL, NULL),
	('03c525b5-5fc7-4405-a474-ad3c2c6d8d0b', 'a7451936-0435-4d64-b754-fbd365dc13d4', 'ba75b902-52a2-464f-8404-bfc89ccf8172', 2, 400, 'vast', NULL, NULL),
	('f84600dd-c271-4151-aff6-fd613d23afcc', 'a7451936-0435-4d64-b754-fbd365dc13d4', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 3, 10, 'vast', NULL, NULL),
	('0657159e-517a-4402-8611-58a9ad57819a', '057e0b8d-5675-4563-bea6-b9bcb2284f10', 'f935f960-9cf2-48bc-a009-b9d88a1d2eeb', 0, 270, 'kh_bron', NULL, NULL),
	('d9c74d51-b0e0-4937-aadd-58a8823c77bd', '057e0b8d-5675-4563-bea6-b9bcb2284f10', 'b8929810-ea50-49ce-8f5e-cc8cbceb7df5', 1, 150, 'eiwit_bron', NULL, NULL),
	('93f246f8-e72c-4f36-a3fa-51cef74ab946', '057e0b8d-5675-4563-bea6-b9bcb2284f10', '38357f1b-37fd-4ae8-9780-382b6c77da62', 2, 500, 'vast', NULL, NULL),
	('dc830697-40ae-4a64-92aa-f670abdbb514', '057e0b8d-5675-4563-bea6-b9bcb2284f10', '7d39002a-f385-4d49-928c-6be07ed2a88c', 3, 150, 'vast', NULL, NULL),
	('75e9f4df-e847-4f85-aca8-d50859fc5fa4', '057e0b8d-5675-4563-bea6-b9bcb2284f10', 'ee790d34-d5bf-478b-8985-1c6a12976110', 4, 100, 'vast', NULL, NULL),
	('5a27f12d-a3ad-4de9-961b-43d2721a58c8', '057e0b8d-5675-4563-bea6-b9bcb2284f10', '2e426ad1-3014-45cc-8996-321ec5333982', 5, 6, 'vast', NULL, NULL),
	('8afb579d-67ac-4958-ab57-939cff68148e', '057e0b8d-5675-4563-bea6-b9bcb2284f10', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 6, 15, 'vast', NULL, NULL),
	('e833f19e-296e-42b2-b7b4-239f205aa32d', '1ece67bd-f1b6-41c7-bfe0-3b8a0c049fa0', '987667b0-6f7c-4d89-91c1-b29bf4f550db', 0, 160, 'kh_bron', NULL, NULL),
	('e083f59d-88f7-4b0c-bd23-733c9cfd36c4', '1ece67bd-f1b6-41c7-bfe0-3b8a0c049fa0', '8981132d-2416-4295-b562-cf0dfc708ace', 1, 300, 'eiwit_bron', NULL, NULL),
	('81a44757-d93a-4b19-a125-6d07f9d80d78', '1ece67bd-f1b6-41c7-bfe0-3b8a0c049fa0', '41de54ea-857a-4200-baa3-6879f0733b02', 2, 250, 'vast', NULL, NULL),
	('548988b9-4197-4e7f-b1a4-8cfc15725216', '1ece67bd-f1b6-41c7-bfe0-3b8a0c049fa0', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 3, 150, 'vast', NULL, NULL),
	('46773890-d10f-463e-989c-bd24426a04cc', '1ece67bd-f1b6-41c7-bfe0-3b8a0c049fa0', '7d39002a-f385-4d49-928c-6be07ed2a88c', 4, 100, 'vast', NULL, NULL),
	('9b670916-c12d-41c0-ae38-e99ef7de7e78', '1ece67bd-f1b6-41c7-bfe0-3b8a0c049fa0', 'b365fe28-dd8b-40e8-87ee-9f612b03ab89', 5, 10, 'vast', NULL, NULL),
	('81ee80d8-10ec-4538-9170-fcd53fb231cd', '1ece67bd-f1b6-41c7-bfe0-3b8a0c049fa0', '23d0383b-038a-4c6f-b40e-2dfd47dac69a', 6, 30, 'vast', NULL, NULL),
	('28f197b8-d54d-4fac-ad35-1a1faa48427e', '1ece67bd-f1b6-41c7-bfe0-3b8a0c049fa0', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 7, 15, 'vast', NULL, NULL),
	('2e914977-c2f5-4f5b-92c7-f48447642896', '32894115-c03e-41f6-9e10-43b937f37e19', '8bfe1e41-d04b-46b0-a378-6ff39a027356', 0, 70, 'kh_bron', NULL, NULL),
	('a602baa9-3149-4e74-a28b-a829f5613f4d', '32894115-c03e-41f6-9e10-43b937f37e19', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 100, 'kh_bron', NULL, NULL),
	('7f819cec-3187-44ab-8c96-35475f06be22', '32894115-c03e-41f6-9e10-43b937f37e19', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 15, 'kh_bron', NULL, NULL),
	('d3fa9a6b-0ca7-4e3f-be59-6f56de6e0afa', '32894115-c03e-41f6-9e10-43b937f37e19', '0465308a-9097-44e8-a8e4-acaf770f38a4', 3, 10, 'vast', NULL, NULL),
	('283eefc0-e45d-48d8-956f-59c1aa992e44', '950b45c0-4889-40d5-b782-7149ea7f5875', '3261679a-2a07-42af-91be-83686e280bd0', 0, 30, 'kh_bron', NULL, NULL),
	('d07e2df1-f07c-4f15-a5d8-503068cae89a', '950b45c0-4889-40d5-b782-7149ea7f5875', '641d7368-148c-4a12-ab0a-885982b4cbc9', 1, 30, 'kh_bron', NULL, NULL),
	('3ac7afe0-f334-48d8-b970-48ccbe9807f3', '06fea713-b4e4-4530-b174-172a2a6e8a5f', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 250, 'kh_bron', NULL, NULL),
	('aeac9b20-d4e6-4207-9d16-3eb56197807a', '06fea713-b4e4-4530-b174-172a2a6e8a5f', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 200, 'kh_bron', NULL, NULL),
	('12be6c15-6cd7-4d3f-98c5-df6748083cc5', '06fea713-b4e4-4530-b174-172a2a6e8a5f', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 60, 'kh_bron', NULL, NULL),
	('5c57c8d6-1de8-4af7-b49a-8cd54f75944d', '06fea713-b4e4-4530-b174-172a2a6e8a5f', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 3, 2, 'vast', NULL, NULL),
	('ebd89174-4841-4c16-b7b2-f3839ffdaea6', '0dd398ce-8f16-4d0d-95b7-dce0e368208c', 'aaa2b55e-69dd-4f92-8413-77afd93db7b0', 0, 60, 'kh_bron', NULL, NULL),
	('bf57d60f-995d-4150-a3f3-003e54c6364a', '0dd398ce-8f16-4d0d-95b7-dce0e368208c', 'a12298f7-69d8-4e9e-8f9a-5426d12af8e3', 1, 20, 'kh_bron', NULL, NULL),
	('9e803ac1-b3ed-4e47-9896-9d6d660b5b77', '0dd398ce-8f16-4d0d-95b7-dce0e368208c', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 2, 1, 'vast', NULL, NULL),
	('c65078d3-c523-48dd-a2a6-800f276d39b6', '72468b68-9498-48b1-9cfe-3d37c8375d87', '4bbfaca3-806a-4ba1-a77a-3349cd1f9b22', 0, 200, 'kh_bron', NULL, NULL),
	('1ce21645-b3fc-4d21-b7bd-a82bdbb2f44a', '72468b68-9498-48b1-9cfe-3d37c8375d87', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 1, 100, 'kh_bron', NULL, NULL),
	('174a5748-dab6-4a48-a638-c5037fff0848', '72468b68-9498-48b1-9cfe-3d37c8375d87', '0465308a-9097-44e8-a8e4-acaf770f38a4', 2, 40, 'vast', NULL, NULL),
	('53a3f6a5-8cb7-404b-ac12-9d7ccaf9c24c', '72468b68-9498-48b1-9cfe-3d37c8375d87', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 3, 1, 'vast', NULL, NULL),
	('090c6b7a-2d2d-45e5-b466-c181e3137e79', 'aea6a980-7d7a-46c2-9133-6198d02e5e66', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 0, 120, 'kh_bron', NULL, NULL),
	('b540bfd4-36ba-412d-8d34-105fd7182f5a', 'aea6a980-7d7a-46c2-9133-6198d02e5e66', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 1, 40, 'kh_bron', NULL, NULL),
	('265891d1-eea8-49c3-bfd7-73b58f36c77f', 'aea6a980-7d7a-46c2-9133-6198d02e5e66', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 10, 'kh_bron', NULL, NULL),
	('1f9eab0f-95bf-4a90-9d58-1492706d1ff3', 'aea6a980-7d7a-46c2-9133-6198d02e5e66', '4c825261-f67d-4d51-b1a3-f200345460c8', 3, 150, 'eiwit_bron', NULL, NULL),
	('3d41e5c6-d7c4-49fb-a43a-d5f2dc642f47', 'aea6a980-7d7a-46c2-9133-6198d02e5e66', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 4, 250, 'vast', NULL, NULL),
	('00e2ab70-2ad1-40fb-b37b-792477d427f7', '31049746-afc1-400a-8d1f-c2066b8f759c', '5c35470d-876d-46f1-9e89-7168237c242c', 0, 500, 'kh_bron', NULL, NULL),
	('b5a01178-5e2a-4fd3-a012-7981f8a21ca5', '31049746-afc1-400a-8d1f-c2066b8f759c', 'd9986270-40ad-40e0-bd90-bf1f3cfa35c5', 1, 60, 'kh_bron', NULL, NULL),
	('375575a5-d159-4b82-9076-810f826574b3', '81541abc-2d9a-4252-98f1-880f7665af9b', '4c825261-f67d-4d51-b1a3-f200345460c8', 0, 400, 'eiwit_bron', NULL, NULL),
	('15750a13-1b07-4172-ba6d-9f8a37f3441e', '81541abc-2d9a-4252-98f1-880f7665af9b', '1e7b6dfa-0854-4eb3-9abe-ccb8eb83b5a5', 1, 75, 'vast', NULL, NULL),
	('92a726f9-1e2f-4ad2-95e5-247c5162780d', '81541abc-2d9a-4252-98f1-880f7665af9b', 'b5a4bb62-78fa-4305-a825-459dc1d50375', 2, 15, 'vast', NULL, NULL),
	('d707a7f7-c95d-4ebb-8ecb-a46f13ec194e', '81541abc-2d9a-4252-98f1-880f7665af9b', 'c3d7d0cb-54e6-4a34-b7ec-73de1b7bd6c9', 3, 1, 'vast', NULL, NULL),
	('5c19c6eb-0b68-428b-adfa-14184744300c', 'cdb8831a-8ecd-4f5e-8646-faf94ced6bcb', 'a84f48f7-649b-4a42-9a96-cb949308a895', 0, 300, 'eiwit_bron', NULL, NULL),
	('44b8e16e-2afe-43a8-9e9f-080b538ffd6a', 'cdb8831a-8ecd-4f5e-8646-faf94ced6bcb', '7fa8698e-8e6b-4b44-9068-9efc4fec27e7', 1, 150, 'vast', NULL, NULL),
	('ce240202-6427-4f41-bbde-1559dc2ef071', 'cdb8831a-8ecd-4f5e-8646-faf94ced6bcb', 'c3d7d0cb-54e6-4a34-b7ec-73de1b7bd6c9', 2, 1, 'vast', NULL, NULL),
	('746453ae-ffa9-43ee-84fb-b324d0c10d85', 'f861c89b-1dfc-4deb-911a-de47e66596fd', 'ef232b9c-8f07-4107-b638-839c68b6becb', 0, 400, 'eiwit_bron', NULL, NULL),
	('13bc0bd4-6a8b-42e2-ba8f-65aee04baafe', 'f861c89b-1dfc-4deb-911a-de47e66596fd', '0465308a-9097-44e8-a8e4-acaf770f38a4', 1, 30, 'eiwit_bron', NULL, NULL),
	('b382c361-4a55-4d4d-badb-6c32ec7d4910', 'f861c89b-1dfc-4deb-911a-de47e66596fd', '1e7b6dfa-0854-4eb3-9abe-ccb8eb83b5a5', 2, 75, 'vast', NULL, NULL),
	('f758f85b-270e-416f-b178-b1c72964d6b2', '52d2b15b-6cd2-41fc-8008-938f0110082a', '4416ff22-4e0c-4559-8126-ce828eb01443', 0, 50, 'kh_bron', NULL, NULL),
	('67226bc4-1427-4f34-bab9-47d57d631bae', '52d2b15b-6cd2-41fc-8008-938f0110082a', '48e78c63-b415-4965-87d8-1ba663190bcd', 1, 200, 'eiwit_bron', NULL, NULL),
	('da6c2cc2-7df1-4261-abb2-f60c6f1175c1', '52d2b15b-6cd2-41fc-8008-938f0110082a', '55ad9435-76a1-4a03-a249-866d3a23e8e8', 2, 150, 'vast', NULL, NULL),
	('e55664da-3c30-4a83-8d37-cabda9744a34', '435d7c8a-af94-43a7-91aa-766ddee54fd5', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 0, 280, 'kh_bron', NULL, NULL),
	('58e254ec-ebaa-48ee-9010-0c35f6318fb3', '435d7c8a-af94-43a7-91aa-766ddee54fd5', 'f1fa0255-6b85-48a8-a44e-43ca997a27e7', 1, 90, 'kh_bron', NULL, NULL),
	('dfcbb026-584f-4630-8d00-bf29bd592aeb', '435d7c8a-af94-43a7-91aa-766ddee54fd5', 'a91cdfad-83f1-4882-bcc4-aa4830e31b06', 2, 290, 'kh_bron', NULL, NULL),
	('bb327a76-efec-4350-9f40-174cb9888467', '435d7c8a-af94-43a7-91aa-766ddee54fd5', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 3, 340, 'kh_bron', NULL, NULL),
	('44d08cf4-5055-462a-b7ea-99d238251e84', '435d7c8a-af94-43a7-91aa-766ddee54fd5', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 4, 45, 'kh_bron', NULL, NULL),
	('4b1bfeb2-27f1-428a-9f8a-d828ec46177c', '435d7c8a-af94-43a7-91aa-766ddee54fd5', '55ad9435-76a1-4a03-a249-866d3a23e8e8', 5, 150, 'vast', NULL, NULL),
	('ebd3f2a0-7055-4ca4-a745-dfe1f8951b26', '435d7c8a-af94-43a7-91aa-766ddee54fd5', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 6, 380, 'vast', NULL, NULL),
	('bc9b3ad4-24ba-4cce-be4a-7b517f08d403', '435d7c8a-af94-43a7-91aa-766ddee54fd5', '7d4941e1-a27a-4109-bd90-051e6b23b194', 7, 300, 'eiwit_bron', NULL, NULL),
	('2ee65bcb-8dbb-46d9-8894-c7a4e2011d7c', '435d7c8a-af94-43a7-91aa-766ddee54fd5', 'b5a4bb62-78fa-4305-a825-459dc1d50375', 8, 40, 'vast', NULL, NULL),
	('4a84ca89-05c7-4b35-b56a-e272aa79988c', '1b8d0ba8-f8c2-4f16-b164-2808e2363b57', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 0, 60, 'kh_bron', NULL, NULL),
	('91182591-a322-4020-8dd9-d1f50c173bf1', '1b8d0ba8-f8c2-4f16-b164-2808e2363b57', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 100, 'kh_bron', NULL, NULL),
	('49e5d5b0-3875-458f-ab45-01093f31a755', '1b8d0ba8-f8c2-4f16-b164-2808e2363b57', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 10, 'kh_bron', NULL, NULL),
	('c61964d7-ba2a-421d-8a21-953841463665', '1b8d0ba8-f8c2-4f16-b164-2808e2363b57', '984b1758-daac-4163-ad87-da5463448872', 3, 150, 'eiwit_bron', NULL, NULL),
	('5bc68fc8-2d2e-45d4-bc6f-bc58d424fba6', '1b8d0ba8-f8c2-4f16-b164-2808e2363b57', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 4, 200, 'vast', NULL, NULL),
	('d4fd2724-d17f-4613-9797-7a8f8c3bc5df', '1b8d0ba8-f8c2-4f16-b164-2808e2363b57', 'f13c6ea8-449a-4a83-a183-7962b22ca757', 5, 10, 'vast', NULL, NULL),
	('c798eb77-19c8-46c6-8b8e-dae7096360d5', '1b8d0ba8-f8c2-4f16-b164-2808e2363b57', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 6, 0.5, 'vast', NULL, NULL),
	('18411119-7505-42c8-bd9f-a32039481fe5', '6b54561b-9a37-440b-abd1-6c7b07f6a838', '7089fab8-137e-4555-a86b-72349b21331c', 0, 170, 'kh_bron', NULL, NULL),
	('13cf4d08-32aa-47c5-bd22-e0d45ef9cd05', '6b54561b-9a37-440b-abd1-6c7b07f6a838', 'aaa2b55e-69dd-4f92-8413-77afd93db7b0', 1, 35, 'kh_bron', NULL, NULL),
	('ab698cde-54d7-4468-8433-3ca161b1bee5', '6b54561b-9a37-440b-abd1-6c7b07f6a838', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 35, 'kh_bron', NULL, NULL),
	('13dae6d5-df08-4adb-bc5c-c9cc34c2e3d9', '6b54561b-9a37-440b-abd1-6c7b07f6a838', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 3, 50, 'vast', NULL, NULL),
	('72fdb574-6070-4d98-be11-18854bed1039', '6b54561b-9a37-440b-abd1-6c7b07f6a838', '48e78c63-b415-4965-87d8-1ba663190bcd', 4, 60, 'vast', NULL, NULL),
	('f40252a7-7fdf-4065-a010-5bfd568d19cb', '6b54561b-9a37-440b-abd1-6c7b07f6a838', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 5, 125, 'vast', NULL, NULL),
	('78be7617-c408-4c4d-80ee-ea344a0647c9', '6b54561b-9a37-440b-abd1-6c7b07f6a838', '7d4941e1-a27a-4109-bd90-051e6b23b194', 6, 300, 'eiwit_bron', NULL, NULL),
	('dce9f094-0263-4bef-a526-abfdb69329fe', '6b54561b-9a37-440b-abd1-6c7b07f6a838', '1e7b6dfa-0854-4eb3-9abe-ccb8eb83b5a5', 7, 150, 'vast', NULL, NULL),
	('619e974f-86a8-4704-8713-b5f88060ad06', '6b54561b-9a37-440b-abd1-6c7b07f6a838', '92816d62-02fe-4ad7-a476-f440b6cb14e8', 8, 10, 'vast', NULL, NULL),
	('1cae06ea-d7af-4eec-aa7b-4990b679b6b6', '77613895-5629-4c8d-9659-083a5d284fb0', 'fd6dcd0c-06f8-412b-8324-31ea3989c6d4', 0, 170, 'kh_bron', NULL, NULL),
	('ffa2ea42-870c-4952-9329-0a5c3e1f519f', '77613895-5629-4c8d-9659-083a5d284fb0', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 230, 'kh_bron', NULL, NULL),
	('cb8db491-4ca7-4f37-9b67-734490cd966c', '77613895-5629-4c8d-9659-083a5d284fb0', '7cb35967-7975-42bf-9b98-af8a89601a84', 2, 35, 'kh_bron', NULL, NULL),
	('4620394b-73ea-4ba0-89c3-93c97633133c', '77613895-5629-4c8d-9659-083a5d284fb0', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 3, 100, 'eiwit_bron', NULL, NULL),
	('6a709aed-7c6e-4284-98d1-c73f4e224c5d', '77613895-5629-4c8d-9659-083a5d284fb0', '4c825261-f67d-4d51-b1a3-f200345460c8', 4, 200, 'eiwit_bron', NULL, NULL),
	('89212007-3a3b-4b09-bfb2-c53b921235ee', '77613895-5629-4c8d-9659-083a5d284fb0', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 5, 300, 'vast', NULL, NULL),
	('6e5da150-90ed-4c7a-9ea6-a881849b40a0', '77613895-5629-4c8d-9659-083a5d284fb0', '433559fa-d29e-41aa-bb77-05f6a6af6ba0', 6, 10, 'vast', NULL, NULL),
	('0a57f406-b77f-4796-9bc2-6bf64813f98a', '77613895-5629-4c8d-9659-083a5d284fb0', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 7, 1, 'vast', NULL, NULL),
	('3683d3e9-cd43-4382-bd16-a673629ae09d', '1f53e60b-d541-474c-bf0d-630f77455f98', 'bcdeba2c-4c8d-4122-abc6-c790521163de', 0, 105, 'kh_bron', NULL, NULL),
	('671ed101-f365-47d1-a6fe-bc28589c798f', '1f53e60b-d541-474c-bf0d-630f77455f98', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 120, 'kh_bron', NULL, NULL),
	('aad683e9-519e-4d0a-ba66-291b36e6ce90', '1f53e60b-d541-474c-bf0d-630f77455f98', '0465308a-9097-44e8-a8e4-acaf770f38a4', 2, 30, 'eiwit_bron', NULL, NULL),
	('86e2104f-e81b-40cf-a192-908cc0bde44e', '1f53e60b-d541-474c-bf0d-630f77455f98', 'fbc9fbd4-eb87-490f-ab74-ba186344e419', 3, 250, 'eiwit_bron', NULL, NULL),
	('e59481e1-4477-451f-8686-8f798a373881', '2ecfdb95-f874-49d2-b9a1-bb47823381d0', '4416ff22-4e0c-4559-8126-ce828eb01443', 0, 70, 'kh_bron', NULL, NULL),
	('6e9f9b3f-a1c7-45e8-ba89-08adce9bb49c', '2ecfdb95-f874-49d2-b9a1-bb47823381d0', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 1, 10, 'kh_bron', NULL, NULL),
	('10df645f-0bdb-422d-98c6-229ad95e6493', '2ecfdb95-f874-49d2-b9a1-bb47823381d0', '7d4941e1-a27a-4109-bd90-051e6b23b194', 2, 250, 'eiwit_bron', NULL, NULL),
	('0c049943-aeb4-4af7-af64-f5e2bb6d034e', '2ecfdb95-f874-49d2-b9a1-bb47823381d0', '127ae810-49f9-4d57-be2c-2419d7390634', 3, 100, 'vast', NULL, NULL),
	('017fba70-c9ce-49ff-a09e-71a41c1c942c', '2ecfdb95-f874-49d2-b9a1-bb47823381d0', '03edf202-d1a3-465c-b5c0-90e4ea56ee26', 4, 80, 'vast', NULL, NULL),
	('655150c1-b2c1-48f7-bca0-ed57011eac28', 'f5892e0b-808f-4949-b838-094d925d711e', '8bfe1e41-d04b-46b0-a378-6ff39a027356', 0, 280, 'kh_bron', NULL, NULL),
	('bb8f8490-7ae4-419a-b33a-163cdffda5e8', 'f5892e0b-808f-4949-b838-094d925d711e', 'aaa2b55e-69dd-4f92-8413-77afd93db7b0', 1, 25, 'kh_bron', NULL, NULL),
	('9785617d-2c43-4682-85a9-c027173b0e41', 'f5892e0b-808f-4949-b838-094d925d711e', '55ad9435-76a1-4a03-a249-866d3a23e8e8', 2, 230, 'kh_bron', NULL, NULL),
	('80cadba0-a1de-4be3-befc-a314942abce5', 'f5892e0b-808f-4949-b838-094d925d711e', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 3, 150, 'eiwit_bron', NULL, NULL),
	('5a553d1e-f8f2-4a41-8c33-91a75909badd', 'f5892e0b-808f-4949-b838-094d925d711e', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 4, 200, 'vast', NULL, NULL),
	('280d9d58-7fe7-4ee6-a0a1-42152101e4a2', 'f5892e0b-808f-4949-b838-094d925d711e', '92816d62-02fe-4ad7-a476-f440b6cb14e8', 5, 10, 'vast', NULL, NULL),
	('9a7d4a16-eb28-4c05-a864-4449a3cd5134', 'f5892e0b-808f-4949-b838-094d925d711e', 'c3d7d0cb-54e6-4a34-b7ec-73de1b7bd6c9', 6, 2, 'vast', NULL, NULL),
	('f66ae1ce-0e04-4d65-bf72-2c3ed13989d4', 'e6346e69-a8a4-456e-ae94-82c65a2097c1', '9508d46d-b4b2-4677-a14a-d9291bb4fd01', 0, 80, 'kh_bron', NULL, NULL),
	('3ca98257-8a29-427d-b104-d7a86a22abdd', 'e6346e69-a8a4-456e-ae94-82c65a2097c1', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 140, 'kh_bron', NULL, NULL),
	('7470d662-6d83-48da-b269-4740836a7b30', 'e6346e69-a8a4-456e-ae94-82c65a2097c1', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 15, 'kh_bron', NULL, NULL),
	('d6967a23-3248-4a22-bbdc-8c3d581a9c7a', 'e6346e69-a8a4-456e-ae94-82c65a2097c1', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 3, 250, 'vast', NULL, NULL),
	('329aa09d-e67b-40ce-ac45-ac7ef711526e', 'e6346e69-a8a4-456e-ae94-82c65a2097c1', '48e78c63-b415-4965-87d8-1ba663190bcd', 4, 200, 'eiwit_bron', NULL, NULL),
	('2ca4f2c1-49ad-4288-a19d-45ebbd3d801b', '3890925f-776d-4302-8326-3e931ca76bc4', '8bfe1e41-d04b-46b0-a378-6ff39a027356', 0, 160, 'kh_bron', NULL, NULL),
	('0bf733e9-f09c-4234-813b-c3f7b21c61c0', '3890925f-776d-4302-8326-3e931ca76bc4', '641d7368-148c-4a12-ab0a-885982b4cbc9', 1, 45, 'kh_bron', NULL, NULL),
	('4a2c2d6f-06e0-4ee7-8921-529fecf2e275', '3890925f-776d-4302-8326-3e931ca76bc4', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 10, 'kh_bron', NULL, NULL),
	('bda412e6-6bec-4a66-8723-a1efe3da0aba', '3890925f-776d-4302-8326-3e931ca76bc4', 'a91cdfad-83f1-4882-bcc4-aa4830e31b06', 3, 230, 'kh_bron', NULL, NULL),
	('7cdfdcc8-47e0-45b8-9c93-3d24f04c6fc3', '3890925f-776d-4302-8326-3e931ca76bc4', '7d4941e1-a27a-4109-bd90-051e6b23b194', 4, 200, 'eiwit_bron', NULL, NULL),
	('f2431766-7687-42b0-ae3f-ac3cb9f1b6cb', '3d33afa8-3062-4745-8593-f64e2a82c84a', 'bcdeba2c-4c8d-4122-abc6-c790521163de', 0, 105, 'kh_bron', NULL, NULL),
	('40a37e53-9e00-423c-ba35-5993525efbd6', '3d33afa8-3062-4745-8593-f64e2a82c84a', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 1, 150, 'eiwit_bron', NULL, NULL),
	('d2cd8dfd-8b76-4ddc-8b38-19ccbb738cc0', '3d33afa8-3062-4745-8593-f64e2a82c84a', 'c797d677-fd0e-4ab2-8bb7-dc4be068001b', 2, 20, 'eiwit_bron', NULL, NULL),
	('c79fa028-8e30-46a1-b506-2d35253c9a23', '3d33afa8-3062-4745-8593-f64e2a82c84a', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 3, 75, 'vast', NULL, NULL),
	('4c4c1e56-7017-4993-b3d1-8a14f2852b36', '3d33afa8-3062-4745-8593-f64e2a82c84a', '7036c790-6574-48e2-8c8c-05efeb3dd099', 4, 75, 'vast', NULL, NULL),
	('94953c00-1b20-4976-8349-6ef55c2d2133', '3d33afa8-3062-4745-8593-f64e2a82c84a', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 5, 5, 'vast', NULL, NULL),
	('84d3e2ec-5179-4b2d-8f80-4b141d5b246a', '3d33afa8-3062-4745-8593-f64e2a82c84a', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 6, 0.5, 'vast', NULL, NULL),
	('97f508fa-f062-409b-97ff-ec78bf5b1609', '3d33afa8-3062-4745-8593-f64e2a82c84a', 'fe9258cf-e191-4504-ab65-79e372a21a44', 7, 0.5, 'vast', NULL, NULL),
	('95572377-394e-4327-b06d-c93de7ef31e8', '236d4559-77db-4afa-a5e9-4db448dc5866', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 0, 90, 'kh_bron', NULL, NULL),
	('b436ec96-9a29-4a2e-a981-149aedc89300', '236d4559-77db-4afa-a5e9-4db448dc5866', '55ad9435-76a1-4a03-a249-866d3a23e8e8', 1, 170, 'kh_bron', NULL, NULL),
	('33ff629b-3132-4c30-907d-7e5890aa23d4', '236d4559-77db-4afa-a5e9-4db448dc5866', '749eb8db-d012-4e34-ad24-830873f30827', 2, 25, 'kh_bron', NULL, NULL),
	('9f3dfd19-4ebd-4792-8154-c05ad9c1371b', '236d4559-77db-4afa-a5e9-4db448dc5866', '9ab27016-6c79-4c81-91e2-d848b2976f89', 3, 15, 'kh_bron', NULL, NULL),
	('a8b09c9e-2de6-4c18-a39a-e82f23ced558', '236d4559-77db-4afa-a5e9-4db448dc5866', 'fbc9fbd4-eb87-490f-ab74-ba186344e419', 4, 300, 'eiwit_bron', NULL, NULL),
	('eabf06f6-269e-4c0d-8230-a7dc0c341363', '236d4559-77db-4afa-a5e9-4db448dc5866', 'c3d7d0cb-54e6-4a34-b7ec-73de1b7bd6c9', 5, 1, 'vast', NULL, NULL),
	('ca4b58bd-647e-448e-861e-afe85dac67d4', 'a86a99ce-e05c-4ae4-ab19-f2a9c7479435', '4e426375-736d-4673-9d40-2e2271602325', 0, 110, 'kh_bron', NULL, NULL),
	('22d2c84b-36c4-4042-85e0-95ca3cbd352f', 'a86a99ce-e05c-4ae4-ab19-f2a9c7479435', '54d5d2cc-07ca-45b9-895b-3982cdc54f48', 1, 60, 'eiwit_bron', NULL, NULL),
	('9284a999-83ab-4919-b1e5-d0e1571d0af2', 'a86a99ce-e05c-4ae4-ab19-f2a9c7479435', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 2, 50, 'eiwit_bron', NULL, NULL),
	('19e5525e-391c-487e-a1e1-fcab7d249506', 'a86a99ce-e05c-4ae4-ab19-f2a9c7479435', 'a84f48f7-649b-4a42-9a96-cb949308a895', 3, 50, 'eiwit_bron', NULL, NULL),
	('c6d281c5-39d8-44f9-a5c7-4b1325ef99bd', 'a86a99ce-e05c-4ae4-ab19-f2a9c7479435', '9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 4, 50, 'vast', NULL, NULL),
	('152860ff-e778-4d4f-917d-9a3cb7644c97', 'a86a99ce-e05c-4ae4-ab19-f2a9c7479435', 'fe9258cf-e191-4504-ab65-79e372a21a44', 5, 0.5, 'vast', NULL, NULL);
INSERT INTO public.nutrition_recipe_ingredients VALUES
	('c4903463-002b-4ea9-8230-77099b6e30e4', '24bd888f-f780-4ad9-b594-141277c1ea1e', '18659477-d952-4ba3-8860-0b448df645ac', 0, 140, 'kh_bron', NULL, NULL),
	('4d7c445e-e42c-46ee-87cd-c96fed976b32', '24bd888f-f780-4ad9-b594-141277c1ea1e', '117edbb2-476a-49ad-a0bd-4c8b6026231a', 1, 60, 'eiwit_bron', NULL, NULL),
	('77ecd5d3-fc68-47cd-a58e-8c5778480fb4', '24bd888f-f780-4ad9-b594-141277c1ea1e', '2627853f-25d2-476b-9ad3-df6f402bd664', 2, 10, 'vast', NULL, NULL),
	('fa608caa-0a48-4af5-805f-62a4607dcbd7', '24bd888f-f780-4ad9-b594-141277c1ea1e', '9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 3, 40, 'vast', NULL, NULL),
	('ceccb4d9-ea03-468e-ba5f-458a4c1827e6', '24bd888f-f780-4ad9-b594-141277c1ea1e', '221ea599-6289-4ac4-97b8-71475916afde', 4, 80, 'vast', NULL, NULL),
	('f03d70f2-8b6c-4430-a2f4-5b05dc667873', '24bd888f-f780-4ad9-b594-141277c1ea1e', '3d935147-765f-4506-b74f-99e4653e4724', 5, 20, 'vast', NULL, NULL),
	('b65ab8e3-7c23-45fe-8820-322a103d680b', '1d43daa6-3599-4456-a56c-8b753121467d', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 460, 'kh_bron', NULL, NULL),
	('c1e883e6-5d3b-4f7c-80ee-66cc24ac29e8', '1d43daa6-3599-4456-a56c-8b753121467d', '2ca09f43-13c8-4d9b-b4f7-228752a05175', 1, 170, 'kh_bron', NULL, NULL),
	('1326cf87-f404-4101-b60b-14237648e2d0', '1d43daa6-3599-4456-a56c-8b753121467d', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 2, 280, 'eiwit_bron', NULL, NULL),
	('6174af47-2495-4cbb-8fd2-d07a813d69ca', '1d43daa6-3599-4456-a56c-8b753121467d', '48e78c63-b415-4965-87d8-1ba663190bcd', 3, 175, 'eiwit_bron', NULL, NULL),
	('024cee54-14c1-44ad-903c-b29f68458e95', '1d43daa6-3599-4456-a56c-8b753121467d', 'a596ac94-cc0e-469b-8822-c2a0175a29d6', 4, 150, 'vast', NULL, NULL),
	('5ba97f11-f977-4b47-88be-cbc2d2cca87e', '1d43daa6-3599-4456-a56c-8b753121467d', '7d39002a-f385-4d49-928c-6be07ed2a88c', 5, 100, 'vast', NULL, NULL),
	('2dee37cc-40ee-4c6c-a129-9707673c9a00', '1d43daa6-3599-4456-a56c-8b753121467d', '36578cc7-289a-44ac-800d-3fe7006cd0f1', 6, 80, 'vast', NULL, NULL),
	('ee4f8b55-ed3a-4a1c-9a68-363f13e4d4b4', '1d43daa6-3599-4456-a56c-8b753121467d', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 7, 20, 'vast', NULL, NULL),
	('52665a26-c092-4aa5-9e96-85cd703ea14b', '1d43daa6-3599-4456-a56c-8b753121467d', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 8, 10, 'vast', NULL, NULL),
	('835012d8-904f-4659-83a9-2818501401ca', '1d43daa6-3599-4456-a56c-8b753121467d', 'fe9258cf-e191-4504-ab65-79e372a21a44', 9, 1, 'vast', NULL, NULL),
	('e6dad216-8ed4-46f5-82ec-1fbf6f76e5f8', 'e949a8ca-9367-4ce6-8eee-936640e76098', '34c508bc-719a-4cbf-8f24-5538ac920a14', 0, 900, 'kh_bron', NULL, NULL),
	('809e3cb6-822b-4a3b-a793-ad0487e33739', 'e949a8ca-9367-4ce6-8eee-936640e76098', '2ca09f43-13c8-4d9b-b4f7-228752a05175', 1, 300, 'kh_bron', NULL, NULL),
	('c669a3fb-7123-4eeb-bd83-e64b9fe70a0f', 'e949a8ca-9367-4ce6-8eee-936640e76098', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 25, 'kh_bron', NULL, NULL),
	('37d73cc5-ce2f-4f4c-8d38-6215a1314354', 'e949a8ca-9367-4ce6-8eee-936640e76098', 'fcf695c0-9882-45e7-ab70-023f324a353f', 3, 450, 'eiwit_bron', NULL, NULL),
	('583d4dce-b368-4cfa-950f-3130604ae721', 'e949a8ca-9367-4ce6-8eee-936640e76098', '4a9e8306-a906-47ce-9cb1-ff1aff5805cb', 4, 250, 'vast', NULL, NULL),
	('8e978530-962c-473c-8877-ab59f8fa1382', 'e949a8ca-9367-4ce6-8eee-936640e76098', 'b05f1524-f71d-421a-8e0d-fa2bc11e136f', 5, 150, 'vast', NULL, NULL),
	('3aa7e4b6-6dd5-4dc8-8a95-bb3946634422', 'e949a8ca-9367-4ce6-8eee-936640e76098', '7d39002a-f385-4d49-928c-6be07ed2a88c', 6, 100, 'vast', NULL, NULL),
	('98895e72-3a43-4a5e-8a13-bc9a573a7301', 'e949a8ca-9367-4ce6-8eee-936640e76098', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 7, 150, 'vast', NULL, NULL),
	('e316b5e7-a662-487d-9731-525a36d1d661', 'e949a8ca-9367-4ce6-8eee-936640e76098', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 8, 60, 'vast', NULL, NULL),
	('17a59dcc-66ad-48b9-8b9c-fc491897af82', 'e949a8ca-9367-4ce6-8eee-936640e76098', 'b365fe28-dd8b-40e8-87ee-9f612b03ab89', 9, 5, 'vast', NULL, NULL),
	('6f1cde86-bae9-47a3-b181-d85237a1a29a', 'e949a8ca-9367-4ce6-8eee-936640e76098', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 10, 5, 'vast', NULL, NULL),
	('f90af4ef-c740-4290-8af8-406261f1c233', '6d2dccab-8875-4329-b81b-d21c55975710', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 150, 'kh_bron', NULL, NULL),
	('d6ba78c2-56fe-4148-8e46-81ebd5671134', '6d2dccab-8875-4329-b81b-d21c55975710', 'bc499741-23bd-45f8-abb5-9f5b198f52c0', 1, 240, 'kh_bron', NULL, NULL),
	('8144c4e0-c1cb-4ea5-a64f-3bf2bdf348d8', '6d2dccab-8875-4329-b81b-d21c55975710', '5dc24750-3414-4941-b0c9-358defdb9c7a', 2, 400, 'eiwit_bron', NULL, NULL),
	('273846a7-408c-4aeb-ac01-e026a7dcc3cf', '6d2dccab-8875-4329-b81b-d21c55975710', '1495017a-c177-4610-82c5-6b1f5f212dc5', 3, 60, 'eiwit_bron', NULL, NULL),
	('53244fa4-9c54-4783-b457-b1f8b2ca5d5e', '6d2dccab-8875-4329-b81b-d21c55975710', 'ee790d34-d5bf-478b-8985-1c6a12976110', 4, 100, 'vast', NULL, NULL),
	('ed6eae8e-ed99-4275-9fb6-d59de7e8db4d', '6d2dccab-8875-4329-b81b-d21c55975710', '7d39002a-f385-4d49-928c-6be07ed2a88c', 5, 200, 'vast', NULL, NULL),
	('adc66d04-0ba2-44c8-9f29-444f81ffd356', '6d2dccab-8875-4329-b81b-d21c55975710', '9393fcea-e145-4480-b7b0-19c16f6a24b7', 6, 300, 'vast', NULL, NULL),
	('ce9b5a73-dace-431f-b3e0-b65c478f796a', '6d2dccab-8875-4329-b81b-d21c55975710', '221ea599-6289-4ac4-97b8-71475916afde', 7, 500, 'vast', NULL, NULL),
	('6585f752-993b-4f90-a1e7-20f2d866a0a5', '6d2dccab-8875-4329-b81b-d21c55975710', 'a596ac94-cc0e-469b-8822-c2a0175a29d6', 8, 80, 'vast', NULL, NULL),
	('b9c80080-95f8-49aa-beb3-71de51ef9293', '6d2dccab-8875-4329-b81b-d21c55975710', 'd7e2f5bf-0bb3-4133-a98b-4544f5c1dd65', 9, 10, 'vast', NULL, NULL),
	('9a4a2025-3224-461d-81a9-f95fe85e0a88', '6d2dccab-8875-4329-b81b-d21c55975710', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 10, 5, 'vast', NULL, NULL),
	('a99c6789-9802-4c31-bcc2-50a8723d4f1b', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', '31ede4fb-d3e8-41f1-800b-8f65ab6a49a3', 0, 250, 'kh_bron', NULL, NULL),
	('9ed8b7db-69fb-42b3-a5b3-6ee0387aa852', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', 'b7a114ae-5501-421a-a035-8b2501d4fa0d', 1, 60, 'kh_bron', NULL, NULL),
	('c35c58c0-a927-4ef6-a015-d47fc745972d', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', 'bcdeba2c-4c8d-4122-abc6-c790521163de', 2, 280, 'kh_bron', NULL, NULL),
	('b1c79009-afa3-4801-a635-f01079ddf531', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', 'de678c04-29c2-47da-8bd2-1da02a00ee27', 3, 400, 'eiwit_bron', NULL, NULL),
	('63c4a050-b7c5-4a23-8e73-9b9d5b0eb41d', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 4, 50, 'eiwit_bron', NULL, NULL),
	('9d9b5f72-389d-42ff-bc94-84ffc58fdd0d', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', '90e1adc9-e896-46fd-ad29-5d62d319f0b8', 5, 20, 'vast', NULL, NULL),
	('87f8e21b-4d59-43d5-bb17-5c8156fdc86a', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', '97f8d948-9e1f-485a-ab7d-3a712fc7086b', 6, 20, 'vast', NULL, NULL),
	('fb687499-21c9-44cc-8894-e74348a84a86', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', 'f13c6ea8-449a-4a83-a183-7962b22ca757', 7, 40, 'vast', NULL, NULL),
	('bffc11de-a032-4351-9a2b-75d58ca873f6', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', 'ee790d34-d5bf-478b-8985-1c6a12976110', 8, 100, 'vast', NULL, NULL),
	('2bf94baf-e2c2-4f90-8ea8-75a976992347', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', '2e426ad1-3014-45cc-8996-321ec5333982', 9, 3, 'vast', NULL, NULL),
	('f27bc480-11b9-4089-ac00-b67187c0abde', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', '79de5c19-dc40-45a6-91e7-ea9a76648221', 10, 10, 'vast', NULL, NULL),
	('7b33148b-0531-445c-9799-a6b7f838c11c', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', '3d935147-765f-4506-b74f-99e4653e4724', 11, 100, 'vast', NULL, NULL),
	('43b16b7f-ef52-4429-91f9-522e2a1e9ba4', 'b6eb6617-b59a-4e44-ab1e-56abb8bd81b4', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 12, 10, 'vast', NULL, NULL),
	('bfd0c1f0-9a3f-48c1-9892-ea348bb11fcb', '61a60e27-6edb-43cb-a8f0-afcd0a67d4c5', 'd7c3f40c-27b7-494e-9d28-b4253567d8d0', 0, 240, 'kh_bron', NULL, NULL),
	('be079495-a15f-4b77-beb3-00534ae229e2', '61a60e27-6edb-43cb-a8f0-afcd0a67d4c5', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 1, 150, 'eiwit_bron', NULL, NULL),
	('af5ebe1a-a48b-46aa-a627-3d3ea9a50dbe', '61a60e27-6edb-43cb-a8f0-afcd0a67d4c5', 'd9325545-0203-4fa2-a43b-08029f9656cd', 2, 60, 'vast', NULL, NULL),
	('4735332c-6950-46ae-a327-ce2fadc66758', '61a60e27-6edb-43cb-a8f0-afcd0a67d4c5', '9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 3, 100, 'vast', NULL, NULL),
	('bc8e3aeb-8175-4530-a023-f131874adcfd', '61a60e27-6edb-43cb-a8f0-afcd0a67d4c5', '221ea599-6289-4ac4-97b8-71475916afde', 4, 100, 'vast', NULL, NULL),
	('73ab9b06-0bb8-4c93-a091-63ceb517dd69', '61a60e27-6edb-43cb-a8f0-afcd0a67d4c5', '3d935147-765f-4506-b74f-99e4653e4724', 5, 40, 'vast', NULL, NULL),
	('1d7dc207-3301-4613-9c90-2a552ebf4b4d', '61a60e27-6edb-43cb-a8f0-afcd0a67d4c5', '0335d990-6aee-4a17-9cef-a9113fcce874', 6, 2, 'vast', NULL, NULL),
	('d625f4b2-ddeb-4ca3-96a7-3732703fa280', '61a60e27-6edb-43cb-a8f0-afcd0a67d4c5', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 7, 5, 'vast', NULL, NULL),
	('e508ccaf-b939-4a16-883f-381089d9528a', 'da9bb414-e3d4-4729-8acc-48d7570aa308', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 210, 'kh_bron', NULL, NULL),
	('e010b4d8-5026-49b9-95ee-0dac9d7ab7e4', 'da9bb414-e3d4-4729-8acc-48d7570aa308', '2ca09f43-13c8-4d9b-b4f7-228752a05175', 1, 170, 'kh_bron', NULL, NULL),
	('179cd49f-2447-4817-bce2-71cb83090137', 'da9bb414-e3d4-4729-8acc-48d7570aa308', 'd56aa88a-95cf-43b0-ba94-5ebab9d692d1', 2, 160, 'eiwit_bron', NULL, NULL),
	('f760fdd4-c7e5-418f-bf67-564bf6628f43', 'da9bb414-e3d4-4729-8acc-48d7570aa308', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 3, 150, 'vast', NULL, NULL),
	('dc5c5688-13ef-4d79-93ed-e3a90b482a88', 'da9bb414-e3d4-4729-8acc-48d7570aa308', '2d14c4cb-e761-4545-a79c-44b465e2b9fb', 4, 30, 'vast', NULL, NULL),
	('d89267f8-5ff8-4f7d-ad2c-a547267cd4a7', 'da9bb414-e3d4-4729-8acc-48d7570aa308', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 5, 10, 'vast', NULL, NULL),
	('9015e3ef-5f58-46d3-8760-99e858177a67', 'da9bb414-e3d4-4729-8acc-48d7570aa308', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 6, 15, 'vast', NULL, NULL),
	('94b69a8c-78d8-410e-ab4b-6d332982334f', 'da9bb414-e3d4-4729-8acc-48d7570aa308', 'fe9258cf-e191-4504-ab65-79e372a21a44', 7, 0.5, 'vast', NULL, NULL),
	('1d1d8894-7b97-4bef-9ad4-48e4a7d8d088', '773aa2cd-ab89-4b42-8997-8b74db0735dc', 'bcdeba2c-4c8d-4122-abc6-c790521163de', 0, 105, 'kh_bron', NULL, NULL),
	('d7ddd932-dff2-4d01-8f04-45d329263f84', '773aa2cd-ab89-4b42-8997-8b74db0735dc', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 1, 150, 'eiwit_bron', NULL, NULL),
	('d8c9c53f-a17e-43c2-a878-9620fca493eb', '773aa2cd-ab89-4b42-8997-8b74db0735dc', '1495017a-c177-4610-82c5-6b1f5f212dc5', 2, 40, 'eiwit_bron', NULL, NULL),
	('c362f3b0-8ce5-49db-b556-a9d250a68391', '773aa2cd-ab89-4b42-8997-8b74db0735dc', '221ea599-6289-4ac4-97b8-71475916afde', 3, 100, 'vast', NULL, NULL),
	('4c238781-d7d1-4191-901d-3bce2d25603d', '773aa2cd-ab89-4b42-8997-8b74db0735dc', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 4, 5, 'vast', NULL, NULL),
	('4568469d-9ff0-4da9-9a9d-3a471ab61cab', '773aa2cd-ab89-4b42-8997-8b74db0735dc', 'fe9258cf-e191-4504-ab65-79e372a21a44', 5, 0.5, 'vast', NULL, NULL),
	('9dd4e109-f682-438f-a75c-bf262359603a', '54b1c89a-5f58-4517-834d-967f899df8b9', '31ede4fb-d3e8-41f1-800b-8f65ab6a49a3', 0, 600, 'kh_bron', NULL, NULL),
	('a40b2dd2-763b-4fd2-b106-d2a3cc92c59b', '54b1c89a-5f58-4517-834d-967f899df8b9', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 1, 200, 'eiwit_bron', NULL, NULL),
	('89730b3c-3955-4f32-86ba-671d0fff20ca', '54b1c89a-5f58-4517-834d-967f899df8b9', '48e78c63-b415-4965-87d8-1ba663190bcd', 2, 150, 'eiwit_bron', NULL, NULL),
	('92c0d13f-cc9e-4467-8027-6e84767839ee', '54b1c89a-5f58-4517-834d-967f899df8b9', 'ba75b902-52a2-464f-8404-bfc89ccf8172', 3, 200, 'vast', NULL, NULL),
	('b7b2a0e0-67f3-4a0d-8358-b51cdefc942c', '54b1c89a-5f58-4517-834d-967f899df8b9', '2627853f-25d2-476b-9ad3-df6f402bd664', 4, 10, 'vast', NULL, NULL),
	('ab5a6c32-1573-481e-80b6-536cf41bb85e', '54b1c89a-5f58-4517-834d-967f899df8b9', 'e074e40d-f116-420e-8bcf-414a8d27babd', 5, 5, 'vast', NULL, NULL),
	('e705b2e0-3d6b-440e-baa4-cbdf56a0f077', '54b1c89a-5f58-4517-834d-967f899df8b9', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 6, 1, 'vast', NULL, NULL),
	('14b5dd7a-99ed-4394-aaf2-d87c48e62618', 'aec0eba2-b36a-4948-86cb-cc4de6349794', '09d87984-60c6-49fd-8227-0b4e8a499505', 0, 150, 'kh_bron', NULL, NULL),
	('6c89a166-dac6-467d-ba82-e4001763310d', 'aec0eba2-b36a-4948-86cb-cc4de6349794', 'bb307cdd-855d-46b6-95db-95b29d7e57d5', 1, 240, 'eiwit_bron', NULL, NULL),
	('0dc5aecd-7605-4712-88c8-3cf657b7bdfb', 'aec0eba2-b36a-4948-86cb-cc4de6349794', '9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 2, 150, 'vast', NULL, NULL),
	('9e77a0f1-ec0d-4048-ad14-60473a5658d4', 'aec0eba2-b36a-4948-86cb-cc4de6349794', '221ea599-6289-4ac4-97b8-71475916afde', 3, 200, 'vast', NULL, NULL),
	('1690d5a3-f6a1-4070-b862-29dac0adaf4c', 'aec0eba2-b36a-4948-86cb-cc4de6349794', '1fafc519-6ad4-4b03-af91-193b48c2fd30', 4, 40, 'vast', NULL, NULL),
	('88866d43-744a-497a-a69b-d204a027ea16', 'aec0eba2-b36a-4948-86cb-cc4de6349794', '2e1fd463-0853-4d2b-a2d7-12558dcca0e4', 5, 5, 'vast', NULL, NULL),
	('155c525b-831b-40e2-b9ef-15fabe3456cb', 'aec0eba2-b36a-4948-86cb-cc4de6349794', '79de5c19-dc40-45a6-91e7-ea9a76648221', 6, 10, 'vast', NULL, NULL),
	('8174728f-de3b-4c26-a98c-6621b56565b4', 'aec0eba2-b36a-4948-86cb-cc4de6349794', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 7, 15, 'vast', NULL, NULL),
	('17a70bc6-fd5f-4b0e-9775-3fc14c9de70c', 'aec0eba2-b36a-4948-86cb-cc4de6349794', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 8, 20, 'vast', NULL, NULL),
	('6b6900e7-5c2a-4613-be4a-21f80d77e4eb', 'aec0eba2-b36a-4948-86cb-cc4de6349794', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 9, 1, 'vast', NULL, NULL),
	('56d9b054-2356-448a-8805-e7c4b73ca91a', '9416b18a-1fbe-44eb-a645-430504c0802e', '3c103f2e-5289-47fb-a99a-67caac4cc478', 0, 120, 'kh_bron', NULL, NULL),
	('f3601871-507c-4f6d-8a2b-4ee9a3a9f76c', '9416b18a-1fbe-44eb-a645-430504c0802e', '54d5d2cc-07ca-45b9-895b-3982cdc54f48', 1, 70, 'eiwit_bron', NULL, NULL),
	('53ef9d12-0019-45d4-bd4c-ccd391f12f00', '9416b18a-1fbe-44eb-a645-430504c0802e', 'a84f48f7-649b-4a42-9a96-cb949308a895', 2, 80, 'eiwit_bron', NULL, NULL),
	('4a39c857-cee0-4248-be3c-8d1bef87bc30', '9416b18a-1fbe-44eb-a645-430504c0802e', '9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 3, 60, 'vast', NULL, NULL),
	('9b12dfd6-02da-4efd-8b7b-d359f47fd6e6', '9416b18a-1fbe-44eb-a645-430504c0802e', '22873273-d7c5-4a2c-964d-6915e90e7d82', 4, 20, 'vast', NULL, NULL),
	('68090751-661b-4ab4-ab62-6ed8a2d2c17b', '615f0278-6e61-4586-9388-2757221039de', 'bcdeba2c-4c8d-4122-abc6-c790521163de', 0, 210, 'kh_bron', NULL, NULL),
	('a866a220-db97-431f-835b-9d68f5ed16f0', '615f0278-6e61-4586-9388-2757221039de', 'b8929810-ea50-49ce-8f5e-cc8cbceb7df5', 1, 120, 'eiwit_bron', NULL, NULL),
	('24e88cb8-44b7-4cc3-b8e2-39fa3797aea5', '615f0278-6e61-4586-9388-2757221039de', '38357f1b-37fd-4ae8-9780-382b6c77da62', 2, 400, 'vast', NULL, NULL),
	('6982919a-218b-4c62-9730-426251c784f1', '615f0278-6e61-4586-9388-2757221039de', 'ee790d34-d5bf-478b-8985-1c6a12976110', 3, 100, 'vast', NULL, NULL),
	('554c6dfc-1d64-448e-a06c-0cb5778bf9d8', '615f0278-6e61-4586-9388-2757221039de', '7d39002a-f385-4d49-928c-6be07ed2a88c', 4, 150, 'vast', NULL, NULL),
	('d0d119cf-a806-4b8e-ba94-986d08ab203b', '615f0278-6e61-4586-9388-2757221039de', '2e426ad1-3014-45cc-8996-321ec5333982', 5, 6, 'vast', NULL, NULL),
	('b3e93c01-baf5-425b-a859-201f91c5c235', '615f0278-6e61-4586-9388-2757221039de', 'b1896ce0-252d-4b27-a524-17d1f0757cae', 6, 2, 'vast', NULL, NULL),
	('f8f2c10f-4ee5-432c-8184-f838eccec901', '615f0278-6e61-4586-9388-2757221039de', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 7, 10, 'vast', NULL, NULL),
	('163babe8-b2db-41c1-8e9d-7efc64d9050a', '615f0278-6e61-4586-9388-2757221039de', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 8, 2, 'vast', NULL, NULL),
	('d046b60d-528d-4d56-bafa-76aecdde7f2b', '3b0033fb-2192-42f9-aeb5-ef84658b04c1', 'beb2eefc-3467-4ae5-beea-fb07a585d610', 0, 150, 'kh_bron', NULL, NULL),
	('9fca30f1-2bb3-4700-af8b-952a9175f7b5', '3b0033fb-2192-42f9-aeb5-ef84658b04c1', 'a088ecaf-37d6-489f-9f78-9326a01d4418', 1, 100, 'eiwit_bron', NULL, NULL),
	('9e1de61c-f362-466e-85d0-524eeb1a8a20', '3b0033fb-2192-42f9-aeb5-ef84658b04c1', '463fd7b9-2936-4051-9ba3-b8c07bfcee51', 2, 250, 'vast', NULL, NULL),
	('88c882c5-6d9f-4fa4-8220-e182d360c0dd', '3b0033fb-2192-42f9-aeb5-ef84658b04c1', '22873273-d7c5-4a2c-964d-6915e90e7d82', 3, 50, 'vast', NULL, NULL),
	('9c7dea96-cbcc-44d9-8da8-85c848cae037', '3b0033fb-2192-42f9-aeb5-ef84658b04c1', 'b5a4bb62-78fa-4305-a825-459dc1d50375', 4, 30, 'vast', NULL, NULL),
	('d01e5af4-0150-4489-9aef-8d8b24050bbe', '3b0033fb-2192-42f9-aeb5-ef84658b04c1', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 5, 10, 'vast', NULL, NULL),
	('5e3ebbb3-86fe-4cca-a884-5166c7a1861c', '3b0033fb-2192-42f9-aeb5-ef84658b04c1', '6599fe84-e196-4240-8f82-c09f9a2d3ee5', 6, 15, 'vast', NULL, NULL),
	('16476e9f-199f-4a98-a41b-80f81fc32a23', 'f89e9293-2b93-4d66-9e8e-610027951be8', 'bcdeba2c-4c8d-4122-abc6-c790521163de', 0, 140, 'kh_bron', NULL, NULL),
	('9264ddb8-9095-4306-96a5-c7d1956b3927', 'f89e9293-2b93-4d66-9e8e-610027951be8', 'c797d677-fd0e-4ab2-8bb7-dc4be068001b', 1, 50, 'eiwit_bron', NULL, NULL),
	('c270f545-2155-4e4a-a909-71757d7f92ac', 'f89e9293-2b93-4d66-9e8e-610027951be8', 'b8804b7d-934c-45ea-89e9-0421139d0443', 2, 200, 'eiwit_bron', NULL, NULL),
	('419eaf14-438d-4b98-ae3d-a44e15432a31', 'f89e9293-2b93-4d66-9e8e-610027951be8', '221ea599-6289-4ac4-97b8-71475916afde', 3, 80, 'vast', NULL, NULL),
	('78faa70b-b1e3-4069-b5fc-5426ac38328d', 'a30b4528-b35f-4c98-8468-c9446696457b', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 380, 'kh_bron', NULL, NULL),
	('cc5602b0-830a-4ff9-8fb9-89c6fada31e7', 'a30b4528-b35f-4c98-8468-c9446696457b', '9f24d076-9867-44f6-b075-e2f5d3f61900', 1, 240, 'eiwit_bron', NULL, NULL),
	('52addb60-c9d4-4aa1-be36-dddca19c9aed', 'a30b4528-b35f-4c98-8468-c9446696457b', 'ee790d34-d5bf-478b-8985-1c6a12976110', 2, 100, 'vast', NULL, NULL),
	('8bae4ce6-46ca-4182-8165-5f0812a73891', 'a30b4528-b35f-4c98-8468-c9446696457b', '9393fcea-e145-4480-b7b0-19c16f6a24b7', 3, 300, 'vast', NULL, NULL),
	('7194e5ab-9efb-4078-a71b-193e6750da3c', 'a30b4528-b35f-4c98-8468-c9446696457b', '7d39002a-f385-4d49-928c-6be07ed2a88c', 4, 100, 'vast', NULL, NULL),
	('ed656414-cd34-40e3-a5cc-c80d1408399c', 'a30b4528-b35f-4c98-8468-c9446696457b', '7036c790-6574-48e2-8c8c-05efeb3dd099', 5, 100, 'vast', NULL, NULL),
	('e838e5bc-f331-4f8c-ac35-3e72006f536a', 'a30b4528-b35f-4c98-8468-c9446696457b', '0b827a30-5ba4-4a3c-8656-b967f6f08493', 6, 400, 'vast', NULL, NULL),
	('332f2e65-88d8-4e75-9023-2e336c56d423', 'a30b4528-b35f-4c98-8468-c9446696457b', '38357f1b-37fd-4ae8-9780-382b6c77da62', 7, 380, 'vast', NULL, NULL),
	('c951ab28-fabd-47a9-add2-4561ab29f3dc', 'a30b4528-b35f-4c98-8468-c9446696457b', '7e60ed9a-22bc-49da-9332-412c787ef396', 8, 15, 'vast', NULL, NULL),
	('b314d58d-5a39-4717-a248-9b62522914eb', 'a30b4528-b35f-4c98-8468-c9446696457b', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 9, 380, 'vast', NULL, NULL),
	('cf993a0d-ea1d-4f94-85e4-246c950946a1', 'a30b4528-b35f-4c98-8468-c9446696457b', 'c797d677-fd0e-4ab2-8bb7-dc4be068001b', 10, 50, 'vast', NULL, NULL),
	('3f116051-33c4-4c40-9716-f801464dd5ca', 'a30b4528-b35f-4c98-8468-c9446696457b', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 11, 5, 'vast', NULL, NULL),
	('8366142f-9a38-44f1-b0fe-e5de709a67f0', '683cd35a-57f0-4d62-8e41-4e611c3b0e7b', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 300, 'kh_bron', NULL, NULL),
	('9e40b538-0f4b-45d3-a2ae-3d43c5be70cb', '683cd35a-57f0-4d62-8e41-4e611c3b0e7b', '802a343b-5924-4e1d-97f9-4f1f1e4f7ad9', 1, 400, 'kh_bron', NULL, NULL),
	('e7b7df77-1132-41bd-9a6b-5315b70ce2b2', '683cd35a-57f0-4d62-8e41-4e611c3b0e7b', '9f24d076-9867-44f6-b075-e2f5d3f61900', 2, 350, 'eiwit_bron', NULL, NULL),
	('ab15c8d4-77f5-420a-bb78-d26cec369aac', '683cd35a-57f0-4d62-8e41-4e611c3b0e7b', 'ee790d34-d5bf-478b-8985-1c6a12976110', 3, 100, 'vast', NULL, NULL),
	('75440dbb-29cb-4d54-be8f-7115a349711b', '683cd35a-57f0-4d62-8e41-4e611c3b0e7b', '2e426ad1-3014-45cc-8996-321ec5333982', 4, 6, 'vast', NULL, NULL),
	('b58b06ba-d07d-4d06-b398-f99ffb69dbe8', '683cd35a-57f0-4d62-8e41-4e611c3b0e7b', '2f19d7da-fda2-410c-bde0-ab19b6a889d0', 5, 150, 'vast', NULL, NULL),
	('dc0b6cf6-e736-4bbb-bfbc-b0f905bf5e15', '683cd35a-57f0-4d62-8e41-4e611c3b0e7b', '90ff3661-2751-4b46-a022-b2228d5176c8', 6, 10, 'vast', NULL, NULL),
	('e7b3ed6c-7f10-48ee-80de-b15c213ce272', '683cd35a-57f0-4d62-8e41-4e611c3b0e7b', 'd7e2f5bf-0bb3-4133-a98b-4544f5c1dd65', 7, 10, 'vast', NULL, NULL),
	('55c2600f-c990-4fa9-ad59-229859bdcd13', '683cd35a-57f0-4d62-8e41-4e611c3b0e7b', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 8, 5, 'vast', NULL, NULL),
	('f8dd161a-1c29-4df3-b99c-5b1e9eee8815', '683cd35a-57f0-4d62-8e41-4e611c3b0e7b', 'fe9258cf-e191-4504-ab65-79e372a21a44', 9, 1, 'vast', NULL, NULL),
	('1d6c9d26-b515-468c-bbfa-5a7dee041761', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 360, 'kh_bron', NULL, NULL),
	('124fccc6-77b9-4949-9c00-04052dc8c8d3', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 1, 160, 'eiwit_bron', NULL, NULL),
	('e72287c1-dae4-42b4-bf14-45fb44e96cf0', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '8981132d-2416-4295-b562-cf0dfc708ace', 2, 160, 'eiwit_bron', NULL, NULL),
	('3b71cb95-ee01-47b7-b4e1-b0ad57a3dfd7', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '0465308a-9097-44e8-a8e4-acaf770f38a4', 3, 45, 'vast', NULL, NULL),
	('3fc2d4c7-bef4-466a-8fe5-1e416671806a', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', 'f0532c1f-9587-4275-b89e-f4c41c163be2', 4, 4, 'vast', NULL, NULL),
	('8d6194be-ad26-434c-bf3c-e7df94ffd951', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '23d0383b-038a-4c6f-b40e-2dfd47dac69a', 5, 30, 'vast', NULL, NULL),
	('9e8f6e53-a0d5-4c07-8ccd-a4e877a6199c', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '7ade49cc-df77-4148-862e-2f587b323b47', 6, 5, 'vast', NULL, NULL),
	('d80abd39-9ae5-4b42-9328-968cd90f3e38', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 7, 185, 'vast', NULL, NULL),
	('78ea6c1a-4424-4174-b7b9-07e38f5cbe1d', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '41de54ea-857a-4200-baa3-6879f0733b02', 8, 150, 'vast', NULL, NULL),
	('0bb1b83d-c72d-4877-a81a-77874d313831', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '7d39002a-f385-4d49-928c-6be07ed2a88c', 9, 80, 'vast', NULL, NULL),
	('85d50409-c047-4283-9c7e-c1cf42b3b362', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '75746632-2cf6-41f0-be9e-4bbeb9feca2c', 10, 100, 'vast', NULL, NULL),
	('990697b5-44f6-4f1e-9c4e-fea726ab7f23', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', 'b05f1524-f71d-421a-8e0d-fa2bc11e136f', 11, 60, 'vast', NULL, NULL),
	('722c9d20-9516-4800-8cdc-a5e0241dd30f', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '7d970cfd-54fd-4495-8c08-850eee35b69d', 12, 100, 'vast', NULL, NULL),
	('cae54cf5-e8a0-4e0b-9af0-9888e84841f5', '841b7f61-d4aa-461f-bf25-71e660e9e5fb', '2d14c4cb-e761-4545-a79c-44b465e2b9fb', 13, 40, 'vast', NULL, NULL),
	('ba70c30c-dad7-4ff4-9906-90bf04c8640a', 'e3c5555a-83f7-43e7-8966-38c3d22e262e', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 620, 'kh_bron', NULL, NULL),
	('21be95ca-ab84-4549-b671-c8113555e638', 'e3c5555a-83f7-43e7-8966-38c3d22e262e', 'fcf695c0-9882-45e7-ab70-023f324a353f', 1, 220, 'eiwit_bron', NULL, NULL),
	('b6f6d5da-e759-4c68-839d-8a71f7224299', 'e3c5555a-83f7-43e7-8966-38c3d22e262e', 'bdbba3fb-55a4-42cd-8c9f-65d94c36255a', 2, 150, 'eiwit_bron', NULL, NULL),
	('8c0754d8-a6d4-4de9-b45a-d0a64b075ae2', 'e3c5555a-83f7-43e7-8966-38c3d22e262e', 'ee790d34-d5bf-478b-8985-1c6a12976110', 3, 60, 'vast', NULL, NULL),
	('51f9d8b5-cad7-42a9-b055-16a1732e0426', 'e3c5555a-83f7-43e7-8966-38c3d22e262e', '36578cc7-289a-44ac-800d-3fe7006cd0f1', 4, 120, 'vast', NULL, NULL),
	('4e23fc23-bcd7-400f-938a-2702dbbab2e1', 'e3c5555a-83f7-43e7-8966-38c3d22e262e', '9393fcea-e145-4480-b7b0-19c16f6a24b7', 5, 300, 'vast', NULL, NULL),
	('cd0bd952-2279-42f6-a84e-7b8b5acd112a', 'e3c5555a-83f7-43e7-8966-38c3d22e262e', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 6, 5, 'vast', NULL, NULL),
	('6cf13759-5da6-4f0c-95e3-5586e50145fb', 'e3c5555a-83f7-43e7-8966-38c3d22e262e', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 7, 15, 'vast', NULL, NULL),
	('367c6e40-13a3-4d38-ab5e-e2e2b628d6c8', 'e3c5555a-83f7-43e7-8966-38c3d22e262e', 'fe9258cf-e191-4504-ab65-79e372a21a44', 8, 1, 'vast', NULL, NULL),
	('f88355da-7e3e-4003-9b59-af5274f3b58b', '4b260022-5f77-472f-931b-1feb2b3d0243', 'd674a06d-2c56-4645-87ae-515ad073dfb0', 0, 360, 'kh_bron', NULL, NULL),
	('d90fba0e-cd11-43d9-acbb-f1ff489a51c7', '4b260022-5f77-472f-931b-1feb2b3d0243', '749eb8db-d012-4e34-ad24-830873f30827', 1, 80, 'kh_bron', NULL, NULL),
	('09295a63-b763-4d59-82f6-543303ffc67b', '4b260022-5f77-472f-931b-1feb2b3d0243', 'f961a924-cde2-445a-9293-6ce8f78f5475', 2, 350, 'eiwit_bron', NULL, NULL),
	('8f06450f-887a-4e3a-8226-633981c355df', '4b260022-5f77-472f-931b-1feb2b3d0243', 'ee790d34-d5bf-478b-8985-1c6a12976110', 3, 100, 'vast', NULL, NULL),
	('e92dd33d-c6f9-4477-b463-7eb6099f04d9', '4b260022-5f77-472f-931b-1feb2b3d0243', '2e426ad1-3014-45cc-8996-321ec5333982', 4, 3, 'vast', NULL, NULL),
	('dc9495b9-64cc-4f98-971c-68259b7042c5', '4b260022-5f77-472f-931b-1feb2b3d0243', 'b1896ce0-252d-4b27-a524-17d1f0757cae', 5, 2, 'vast', NULL, NULL),
	('f2624ab0-3820-4c47-aca3-b0790749a561', '4b260022-5f77-472f-931b-1feb2b3d0243', '0b827a30-5ba4-4a3c-8656-b967f6f08493', 6, 400, 'vast', NULL, NULL),
	('15470a19-473f-4235-add3-8afbc87dad2e', '4b260022-5f77-472f-931b-1feb2b3d0243', '9393fcea-e145-4480-b7b0-19c16f6a24b7', 7, 300, 'vast', NULL, NULL),
	('99c53f99-5f53-4154-ad26-eba3923cf996', '4b260022-5f77-472f-931b-1feb2b3d0243', '2f19d7da-fda2-410c-bde0-ab19b6a889d0', 8, 150, 'vast', NULL, NULL),
	('8c835475-dca9-4c26-96b7-c001375b5977', '4b260022-5f77-472f-931b-1feb2b3d0243', 'f13c6ea8-449a-4a83-a183-7962b22ca757', 9, 50, 'vast', NULL, NULL),
	('5cf4a3c1-9e21-4abc-a1a3-8fbeb2125210', '4b260022-5f77-472f-931b-1feb2b3d0243', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 10, 5, 'vast', NULL, NULL),
	('c2268a38-4c60-4f79-8b35-e040eb7cff0f', '4b260022-5f77-472f-931b-1feb2b3d0243', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 11, 2, 'vast', NULL, NULL),
	('c48315fc-4ee0-4fe7-b821-17bc6b9d56b2', '8fc384e6-a3ef-4608-bb9e-74eb7d5e88ab', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 440, 'kh_bron', NULL, NULL),
	('264a8b55-e068-461f-a6f0-e2284f652069', '8fc384e6-a3ef-4608-bb9e-74eb7d5e88ab', '2ca09f43-13c8-4d9b-b4f7-228752a05175', 1, 440, 'kh_bron', NULL, NULL),
	('5850f746-7b0d-4e5b-b29f-19141b219fdf', '8fc384e6-a3ef-4608-bb9e-74eb7d5e88ab', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 2, 320, 'eiwit_bron', NULL, NULL),
	('5f1b3535-0ba8-4445-b141-cee920bd1b83', '8fc384e6-a3ef-4608-bb9e-74eb7d5e88ab', '2e426ad1-3014-45cc-8996-321ec5333982', 3, 3, 'vast', NULL, NULL),
	('9a5edb50-e6f5-4a5d-9671-0b0c8ffeb56c', '8fc384e6-a3ef-4608-bb9e-74eb7d5e88ab', '2d14c4cb-e761-4545-a79c-44b465e2b9fb', 4, 60, 'vast', NULL, NULL),
	('dbbed168-4bf1-40d1-87df-0ab27d9d549e', '8fc384e6-a3ef-4608-bb9e-74eb7d5e88ab', '7036c790-6574-48e2-8c8c-05efeb3dd099', 5, 150, 'vast', NULL, NULL),
	('a481d802-f2e1-49da-a092-58e5577a6584', '8fc384e6-a3ef-4608-bb9e-74eb7d5e88ab', '52929e1e-647a-4dae-a1ab-3706f1aee018', 6, 60, 'vast', NULL, NULL),
	('5b75b694-672a-4b8e-ba66-4b94bfa8e47b', '8fc384e6-a3ef-4608-bb9e-74eb7d5e88ab', '2655d3ce-bfe2-4e29-b6cf-743520ad36d1', 7, 125, 'vast', NULL, NULL),
	('12b46cc6-e3da-42e5-8b34-ce702d3cae96', '8fc384e6-a3ef-4608-bb9e-74eb7d5e88ab', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 8, 5, 'vast', NULL, NULL),
	('a4128822-4e4f-401b-9c79-3619b8334afb', '5bbd49d1-4f88-45f9-be34-eee820ddf11b', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 620, 'kh_bron', NULL, NULL),
	('f8b328be-a1be-4953-bf6a-d52f40ecacc2', '5bbd49d1-4f88-45f9-be34-eee820ddf11b', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 1, 320, 'eiwit_bron', NULL, NULL),
	('6414558b-de78-424a-b81b-441dfb6a8d0a', '5bbd49d1-4f88-45f9-be34-eee820ddf11b', 'a596ac94-cc0e-469b-8822-c2a0175a29d6', 2, 150, 'vast', NULL, NULL),
	('8b6eafc5-34a1-4cb7-a129-7b2b3abac814', '5bbd49d1-4f88-45f9-be34-eee820ddf11b', '36a356b5-da56-4b05-a120-54d3b0ba825d', 3, 60, 'vast', NULL, NULL),
	('4729791b-f422-4a5b-b043-9c368230289b', '5bbd49d1-4f88-45f9-be34-eee820ddf11b', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 4, 60, 'vast', NULL, NULL),
	('09e8ba6e-be37-4075-b0b3-fbbe7a75f65f', '5bbd49d1-4f88-45f9-be34-eee820ddf11b', 'd7e2f5bf-0bb3-4133-a98b-4544f5c1dd65', 5, 3, 'vast', NULL, NULL),
	('068bba40-8c5f-48d1-92eb-121c00c5b3e0', '5bbd49d1-4f88-45f9-be34-eee820ddf11b', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 6, 5, 'vast', NULL, NULL),
	('5c2ced83-6a57-4f11-ab6e-75a967c68e86', '5bbd49d1-4f88-45f9-be34-eee820ddf11b', 'fe9258cf-e191-4504-ab65-79e372a21a44', 7, 1, 'vast', NULL, NULL),
	('9c202ac5-3a5d-42b9-a174-3ee0680c3eff', '1c65c588-465a-4fd7-86c9-da01625bb581', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 320, 'kh_bron', NULL, NULL),
	('fcdd4999-3f03-420d-8e84-faa1cb7194c8', '1c65c588-465a-4fd7-86c9-da01625bb581', '499758a3-3708-4a3d-b08a-cb496a70306f', 1, 30, 'kh_bron', NULL, NULL),
	('f0742f1b-a36d-4083-b956-8968553a3ce3', '1c65c588-465a-4fd7-86c9-da01625bb581', '8981132d-2416-4295-b562-cf0dfc708ace', 2, 500, 'eiwit_bron', NULL, NULL),
	('3a53eaae-120e-48a4-abab-e6bf319ce0e4', '1c65c588-465a-4fd7-86c9-da01625bb581', '1fafc519-6ad4-4b03-af91-193b48c2fd30', 3, 100, 'vast', NULL, NULL),
	('ca6a439b-cce4-4ff9-b294-a1474fa583cc', '1c65c588-465a-4fd7-86c9-da01625bb581', '2e426ad1-3014-45cc-8996-321ec5333982', 4, 6, 'vast', NULL, NULL),
	('ea205822-91cf-4236-8106-ccb3a4ae5b1a', '1c65c588-465a-4fd7-86c9-da01625bb581', '1d143628-0f18-4a6b-8dad-f0067ea07e2e', 5, 25, 'vast', NULL, NULL),
	('76caba37-137b-48fe-9550-a84f583055f8', '1c65c588-465a-4fd7-86c9-da01625bb581', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 6, 150, 'vast', NULL, NULL),
	('4a268112-ba98-417b-9fa7-0e967815cb25', '1c65c588-465a-4fd7-86c9-da01625bb581', 'b05f1524-f71d-421a-8e0d-fa2bc11e136f', 7, 150, 'vast', NULL, NULL),
	('df1c0af7-0d6d-47c5-b4d4-0807e2a60670', '1c65c588-465a-4fd7-86c9-da01625bb581', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 8, 15, 'vast', NULL, NULL),
	('84a7194b-ed68-475c-90b0-f216fd8d1724', '1c65c588-465a-4fd7-86c9-da01625bb581', '433559fa-d29e-41aa-bb77-05f6a6af6ba0', 9, 10, 'vast', NULL, NULL),
	('6a0c6b17-d22f-4367-910d-7de3b474373e', '268db3a3-16bf-41e7-ad75-afd7f4676edb', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 620, 'kh_bron', NULL, NULL);
INSERT INTO public.nutrition_recipe_ingredients VALUES
	('6ec49107-455c-4bbe-a1c4-395e13424526', '268db3a3-16bf-41e7-ad75-afd7f4676edb', 'd56aa88a-95cf-43b0-ba94-5ebab9d692d1', 1, 210, 'eiwit_bron', NULL, NULL),
	('bf1a9f77-016e-469a-a806-8f16d18dde3b', '268db3a3-16bf-41e7-ad75-afd7f4676edb', '5dc24750-3414-4941-b0c9-358defdb9c7a', 2, 340, 'eiwit_bron', NULL, NULL),
	('56c853d8-58e5-4ac1-a87f-eef45191e368', '268db3a3-16bf-41e7-ad75-afd7f4676edb', '221ea599-6289-4ac4-97b8-71475916afde', 3, 300, 'vast', NULL, NULL),
	('0d60cab0-c5dd-4f84-8028-21aec5a1ae7a', '268db3a3-16bf-41e7-ad75-afd7f4676edb', '1fafc519-6ad4-4b03-af91-193b48c2fd30', 4, 60, 'vast', NULL, NULL),
	('c48e1bff-f450-41db-9f50-4a84189593b4', '268db3a3-16bf-41e7-ad75-afd7f4676edb', '79de5c19-dc40-45a6-91e7-ea9a76648221', 5, 15, 'vast', NULL, NULL),
	('06412d70-f9c4-400e-b1d1-8b59abdfbe47', '268db3a3-16bf-41e7-ad75-afd7f4676edb', 'e3c36aaf-28a7-4b8a-bfc1-bad2da0ffa88', 6, 20, 'vast', NULL, NULL),
	('1c1bc3f1-5390-4478-b5cf-fa541b2b5666', '268db3a3-16bf-41e7-ad75-afd7f4676edb', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 7, 30, 'vast', NULL, NULL),
	('bfad55a8-271a-4d3d-8d18-bb532031f48a', '268db3a3-16bf-41e7-ad75-afd7f4676edb', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 8, 15, 'vast', NULL, NULL),
	('9e66dc11-1b97-463f-8704-47a62145d558', '268db3a3-16bf-41e7-ad75-afd7f4676edb', 'fe9258cf-e191-4504-ab65-79e372a21a44', 9, 1, 'vast', NULL, NULL),
	('6377e64a-8b55-46c5-9ae3-5753ed617d0a', 'a88888f4-b87e-46b1-9f8b-625dcb50a899', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 500, 'kh_bron', NULL, NULL),
	('589ffd9b-03bf-4c0f-95cb-9b0cd1622127', 'a88888f4-b87e-46b1-9f8b-625dcb50a899', 'aaa2b55e-69dd-4f92-8413-77afd93db7b0', 1, 30, 'kh_bron', NULL, NULL),
	('566645f5-f7ae-4653-b5cb-ce1e5d39f01f', 'a88888f4-b87e-46b1-9f8b-625dcb50a899', 'f961a924-cde2-445a-9293-6ce8f78f5475', 2, 350, 'eiwit_bron', NULL, NULL),
	('ab72482b-8681-41f6-b7b7-0ba47407078b', 'a88888f4-b87e-46b1-9f8b-625dcb50a899', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 3, 105, 'eiwit_bron', NULL, NULL),
	('e9f89aa4-6410-4d94-aa51-aed3cd08a896', 'a88888f4-b87e-46b1-9f8b-625dcb50a899', '23d0383b-038a-4c6f-b40e-2dfd47dac69a', 4, 80, 'vast', NULL, NULL),
	('b325fe26-983e-4352-92aa-7a223751a4a8', 'a88888f4-b87e-46b1-9f8b-625dcb50a899', '2d14c4cb-e761-4545-a79c-44b465e2b9fb', 5, 60, 'vast', NULL, NULL),
	('4b75ec07-9001-493d-876c-16747e7ce490', 'a88888f4-b87e-46b1-9f8b-625dcb50a899', '41de54ea-857a-4200-baa3-6879f0733b02', 6, 300, 'vast', NULL, NULL),
	('8714e6dd-3937-43bc-934c-dd5640da5202', 'a88888f4-b87e-46b1-9f8b-625dcb50a899', 'b05f1524-f71d-421a-8e0d-fa2bc11e136f', 7, 200, 'vast', NULL, NULL),
	('775c6bb9-29ad-4717-8bc7-c7f66042ba9d', 'a88888f4-b87e-46b1-9f8b-625dcb50a899', 'a596ac94-cc0e-469b-8822-c2a0175a29d6', 8, 150, 'vast', NULL, NULL),
	('46fa9b5c-48fa-4561-a00b-12266b61e7c9', 'a88888f4-b87e-46b1-9f8b-625dcb50a899', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 9, 150, 'vast', NULL, NULL),
	('c056b7e1-145d-47b9-a059-b3d06dd87397', '1f29b0b2-8088-480c-be14-8ecae7de4869', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 350, 'kh_bron', NULL, NULL),
	('72e1a972-1788-4071-ba83-f4484c36c496', '1f29b0b2-8088-480c-be14-8ecae7de4869', 'aaa2b55e-69dd-4f92-8413-77afd93db7b0', 1, 25, 'kh_bron', NULL, NULL),
	('2fbaa6bb-6eb1-49ab-a2b1-66fb5aa6481b', '1f29b0b2-8088-480c-be14-8ecae7de4869', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 2, 380, 'eiwit_bron', NULL, NULL),
	('6b9e470c-779a-4a67-95cb-72e5c025cc73', '1f29b0b2-8088-480c-be14-8ecae7de4869', '23d0383b-038a-4c6f-b40e-2dfd47dac69a', 3, 80, 'vast', NULL, NULL),
	('797d5b9d-7b1c-4394-b79e-cdb65cb82c55', '1f29b0b2-8088-480c-be14-8ecae7de4869', '2d14c4cb-e761-4545-a79c-44b465e2b9fb', 4, 50, 'vast', NULL, NULL),
	('b1783667-cd87-4221-bc48-4178d21d0b33', '1f29b0b2-8088-480c-be14-8ecae7de4869', '41de54ea-857a-4200-baa3-6879f0733b02', 5, 300, 'vast', NULL, NULL),
	('b7e709a8-c21f-40bb-9d61-7691e915f901', '1f29b0b2-8088-480c-be14-8ecae7de4869', 'b05f1524-f71d-421a-8e0d-fa2bc11e136f', 6, 200, 'vast', NULL, NULL),
	('3a41f0d2-4042-448d-9f54-d4d7aa5ba980', '1f29b0b2-8088-480c-be14-8ecae7de4869', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 7, 150, 'vast', NULL, NULL),
	('cc48e3e1-43cc-406e-804b-bf755aeeff95', '1f29b0b2-8088-480c-be14-8ecae7de4869', '7e60ed9a-22bc-49da-9332-412c787ef396', 8, 10, 'vast', NULL, NULL),
	('18f351f4-3035-414d-8bca-3305df678285', '5818eb19-a0c2-42b0-abb1-987da2c22eee', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 620, 'kh_bron', NULL, NULL),
	('fca3a6c0-fb71-4d50-af04-8601a73ba74b', '5818eb19-a0c2-42b0-abb1-987da2c22eee', '2ca09f43-13c8-4d9b-b4f7-228752a05175', 1, 380, 'kh_bron', NULL, NULL),
	('7471778d-c753-4cd0-abfe-7a2d2e5f9b1e', '5818eb19-a0c2-42b0-abb1-987da2c22eee', '9f24d076-9867-44f6-b075-e2f5d3f61900', 2, 350, 'eiwit_bron', NULL, NULL),
	('49400fd9-09d7-48cb-a9c0-ad67c5949cd2', '5818eb19-a0c2-42b0-abb1-987da2c22eee', 'f1d895b4-1f3a-4703-abe0-341888da1e5c', 3, 310, 'eiwit_bron', NULL, NULL),
	('95837f6c-7fb2-4a25-a9a0-92fc65814041', '5818eb19-a0c2-42b0-abb1-987da2c22eee', '3b55eec0-51f6-4d49-98ff-65afa2252bd8', 4, 4, 'vast', NULL, NULL),
	('d65ca837-3970-413d-a459-6dba8d020292', '5818eb19-a0c2-42b0-abb1-987da2c22eee', '38357f1b-37fd-4ae8-9780-382b6c77da62', 5, 580, 'vast', NULL, NULL),
	('c6ad2c24-2d11-45c2-8434-579946674606', '5818eb19-a0c2-42b0-abb1-987da2c22eee', '49b4ca44-4958-404a-8aa6-f01595053e41', 6, 150, 'vast', NULL, NULL),
	('b3484dcf-7836-423a-ad7b-3340103d0d24', '5818eb19-a0c2-42b0-abb1-987da2c22eee', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 7, 5, 'vast', NULL, NULL),
	('8fb56d77-7949-443b-b707-960c264e814c', '5818eb19-a0c2-42b0-abb1-987da2c22eee', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 8, 2, 'vast', NULL, NULL),
	('e6c88d90-aac7-4ff3-a738-0bdc3e35a16a', '4bdb8d11-9170-4fd0-ac2b-fc5f3706d745', '3c72e215-1e64-4bed-bef0-9daa8991282a', 0, 150, 'kh_bron', NULL, NULL),
	('77e0824e-9438-4553-a487-a946b094215b', '4bdb8d11-9170-4fd0-ac2b-fc5f3706d745', '4a01d854-79d7-440d-a82f-15915ad33001', 1, 200, 'eiwit_bron', NULL, NULL),
	('d7e843a9-1c32-4c7e-915d-50bae74d6166', '4bdb8d11-9170-4fd0-ac2b-fc5f3706d745', '9393fcea-e145-4480-b7b0-19c16f6a24b7', 2, 150, 'vast', NULL, NULL),
	('c56a4b6a-ec92-495c-a4f1-32e642625ea0', '4bdb8d11-9170-4fd0-ac2b-fc5f3706d745', '41de54ea-857a-4200-baa3-6879f0733b02', 3, 400, 'vast', NULL, NULL),
	('69496f25-631c-4737-af2f-f0f590b973c8', '4bdb8d11-9170-4fd0-ac2b-fc5f3706d745', 'ede7c8b4-6aed-4d43-a283-9d6f2fbf28e0', 4, 10, 'vast', NULL, NULL),
	('3e3fdc3f-aecc-4684-9ab6-085e3c9ecac9', '4bdb8d11-9170-4fd0-ac2b-fc5f3706d745', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 5, 20, 'vast', NULL, NULL),
	('61949dcc-b866-4fb9-b27b-bcb9fa06e0a3', '4bdb8d11-9170-4fd0-ac2b-fc5f3706d745', '6c0ff726-46b9-4ea4-b649-b70695f0dfb0', 6, 15, 'vast', NULL, NULL),
	('2ae5cdca-92b1-4771-a6ee-6104a3d27aa8', '4bdb8d11-9170-4fd0-ac2b-fc5f3706d745', 'd7e2f5bf-0bb3-4133-a98b-4544f5c1dd65', 7, 2, 'vast', NULL, NULL),
	('379815c3-a882-4c1c-be16-c4e03181ecd4', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', '2bff17d7-b135-4009-9054-06ec56b62633', 0, 450, 'kh_bron', NULL, NULL),
	('7fabef90-81c5-4652-ab01-004e8da87462', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', 'f1d895b4-1f3a-4703-abe0-341888da1e5c', 1, 440, 'eiwit_bron', NULL, NULL),
	('d8bcce20-0b48-4415-9236-e0c71007f3e5', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', 'c797d677-fd0e-4ab2-8bb7-dc4be068001b', 2, 60, 'eiwit_bron', NULL, NULL),
	('0695d7cf-a00f-4940-afcf-e9a53b51f727', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', '48e78c63-b415-4965-87d8-1ba663190bcd', 3, 80, 'vast', NULL, NULL),
	('03b56c95-8f86-489b-ac57-71f66de17f2b', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', '3d935147-765f-4506-b74f-99e4653e4724', 4, 80, 'vast', NULL, NULL),
	('6c881dd0-1fe6-4ba4-84de-1aff5692773d', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', '221ea599-6289-4ac4-97b8-71475916afde', 5, 300, 'vast', NULL, NULL),
	('cae16f36-fdc5-4b17-81a7-f0dc0efc7125', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', 'ee790d34-d5bf-478b-8985-1c6a12976110', 6, 100, 'vast', NULL, NULL),
	('2734f7a0-652f-4029-be29-fb319faf1d4b', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', 'b1896ce0-252d-4b27-a524-17d1f0757cae', 7, 2, 'vast', NULL, NULL),
	('235e8bd0-cc04-4e1c-b0c2-f9c1a782de09', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', '0b827a30-5ba4-4a3c-8656-b967f6f08493', 8, 400, 'vast', NULL, NULL),
	('27def398-f1b2-4a50-b84d-6802a711ec4c', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', '7ade49cc-df77-4148-862e-2f587b323b47', 9, 5, 'vast', NULL, NULL),
	('3592639f-c7ae-499b-a5f1-e3367677d48e', '7d724050-dece-4d8f-a3ea-c4e42b0a0ec0', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 10, 5, 'vast', NULL, NULL),
	('e10c4c7f-c90a-4cab-9808-dd8884e09569', '4ccad626-9d41-4930-ad29-456584ca05df', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 280, 'kh_bron', NULL, NULL),
	('d5a795e4-7962-4ae8-9dc2-4d118551350d', '4ccad626-9d41-4930-ad29-456584ca05df', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 1, 160, 'eiwit_bron', NULL, NULL),
	('9913e577-a7e7-4769-b3f0-46b60c1ac8f5', '4ccad626-9d41-4930-ad29-456584ca05df', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 2, 80, 'eiwit_bron', NULL, NULL),
	('a310473c-0879-4c4f-a0f2-c7b7b5860ee2', '4ccad626-9d41-4930-ad29-456584ca05df', '81ec7b61-3826-4cb5-888b-01f88fda1a05', 3, 100, 'vast', NULL, NULL),
	('93129e71-7def-411a-9c3c-bc6497b58ff3', '4ccad626-9d41-4930-ad29-456584ca05df', '7d39002a-f385-4d49-928c-6be07ed2a88c', 4, 100, 'vast', NULL, NULL),
	('73c1c480-562b-4ae6-847c-7995fb9e6ef3', '4ccad626-9d41-4930-ad29-456584ca05df', '75746632-2cf6-41f0-be9e-4bbeb9feca2c', 5, 150, 'vast', NULL, NULL),
	('4bcc069b-1fd0-4d9e-a1ec-ffb48657d296', '4ccad626-9d41-4930-ad29-456584ca05df', '1d143628-0f18-4a6b-8dad-f0067ea07e2e', 6, 30, 'vast', NULL, NULL),
	('bca312fa-9848-48cc-bd40-9f5f4ffd4bd3', '4ccad626-9d41-4930-ad29-456584ca05df', '7ade49cc-df77-4148-862e-2f587b323b47', 7, 5, 'vast', NULL, NULL),
	('3f683bdd-b363-45c6-ae07-d21de6e87d69', '4ccad626-9d41-4930-ad29-456584ca05df', '433559fa-d29e-41aa-bb77-05f6a6af6ba0', 8, 10, 'vast', NULL, NULL),
	('da35706a-a6a4-4715-a79f-1ad3beca84d8', '1734d2fb-1a5f-4d92-80c7-a2562398cc52', '31ede4fb-d3e8-41f1-800b-8f65ab6a49a3', 0, 700, 'kh_bron', NULL, NULL),
	('4391a9f7-14ca-4d0c-97f9-a5e9b809cbbe', '1734d2fb-1a5f-4d92-80c7-a2562398cc52', '18b8cd6f-6eda-4555-8736-106ee31d40dc', 1, 240, 'eiwit_bron', NULL, NULL),
	('a47fa6e7-f379-406e-8b41-f8d322be5438', '1734d2fb-1a5f-4d92-80c7-a2562398cc52', '81ec7b61-3826-4cb5-888b-01f88fda1a05', 2, 250, 'vast', NULL, NULL),
	('e5b1e568-09d2-4846-a32d-b42eb8be748e', '1734d2fb-1a5f-4d92-80c7-a2562398cc52', 'ee18648b-9aad-4f8a-9588-2f25b958991b', 3, 150, 'vast', NULL, NULL),
	('97db2df7-2427-4f5e-9200-a7acb5363d06', '1734d2fb-1a5f-4d92-80c7-a2562398cc52', 'c797d677-fd0e-4ab2-8bb7-dc4be068001b', 4, 40, 'vast', NULL, NULL),
	('19b27772-6c7a-46c1-9ef3-a88462e86d60', '1734d2fb-1a5f-4d92-80c7-a2562398cc52', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 5, 1, 'vast', NULL, NULL),
	('cc55d8d1-71ae-42df-ab42-fbcf61c82b21', '1734d2fb-1a5f-4d92-80c7-a2562398cc52', 'fe9258cf-e191-4504-ab65-79e372a21a44', 6, 0.5, 'vast', NULL, NULL),
	('fb3e70c5-8de9-435e-a9fb-7851548b80cb', 'f671c554-acd0-4a84-9f08-4f15d905685c', 'd23e35a5-aa9d-4bf3-9724-a84abf32c763', 0, 620, 'kh_bron', NULL, NULL),
	('00107f44-c00e-4ec8-9daf-4ab6b7e233f0', 'f671c554-acd0-4a84-9f08-4f15d905685c', 'd5ebda3e-377e-4ab2-bf69-52ddb346a4c5', 1, 125, 'eiwit_bron', NULL, NULL),
	('67a7d85f-7d11-44c6-9c13-f283cd163454', 'f671c554-acd0-4a84-9f08-4f15d905685c', '38357f1b-37fd-4ae8-9780-382b6c77da62', 2, 400, 'vast', NULL, NULL),
	('aaf9a161-969d-4458-9a66-cf928d08adc2', 'f671c554-acd0-4a84-9f08-4f15d905685c', '2f19d7da-fda2-410c-bde0-ab19b6a889d0', 3, 150, 'vast', NULL, NULL),
	('a14082d2-b9ba-4ed9-932d-cb4b112d617f', 'f671c554-acd0-4a84-9f08-4f15d905685c', '2e426ad1-3014-45cc-8996-321ec5333982', 4, 6, 'vast', NULL, NULL),
	('55f6641b-e052-4958-ae11-ef74a6f7036c', 'f671c554-acd0-4a84-9f08-4f15d905685c', 'f67ac7ac-5063-454e-a03e-773e527b7e3f', 5, 1, 'vast', NULL, NULL),
	('7ed8eb21-0bd8-4d16-b9f8-ff14b8a03593', 'f671c554-acd0-4a84-9f08-4f15d905685c', 'ede7c8b4-6aed-4d43-a283-9d6f2fbf28e0', 6, 5, 'vast', NULL, NULL),
	('44f3823e-d444-4dab-9768-17e918ef148f', 'f671c554-acd0-4a84-9f08-4f15d905685c', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 7, 10, 'vast', NULL, NULL),
	('c150aaf8-9b78-482f-b3a8-b70c6beecac3', 'e5df4807-c44f-4be8-b4d1-252d55dd75b1', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 250, 'kh_bron', NULL, NULL),
	('bf6c26b2-1489-4fea-876d-56eba5faf6a5', 'e5df4807-c44f-4be8-b4d1-252d55dd75b1', '90ff3661-2751-4b46-a022-b2228d5176c8', 1, 40, 'eiwit_bron', NULL, NULL),
	('574dd109-fede-4abf-a12d-16206a9b0f6c', 'e5df4807-c44f-4be8-b4d1-252d55dd75b1', 'a596ac94-cc0e-469b-8822-c2a0175a29d6', 2, 200, 'eiwit_bron', NULL, NULL),
	('092c6fb8-0507-465d-bb82-4868ce73b007', 'e5df4807-c44f-4be8-b4d1-252d55dd75b1', 'ee790d34-d5bf-478b-8985-1c6a12976110', 3, 80, 'vast', NULL, NULL),
	('707750fa-5a56-44c1-89dd-4f3741e8e516', 'e5df4807-c44f-4be8-b4d1-252d55dd75b1', '7036c790-6574-48e2-8c8c-05efeb3dd099', 4, 250, 'vast', NULL, NULL),
	('fd9cf0b5-fa1f-413f-8010-34bcb2d61b51', 'e5df4807-c44f-4be8-b4d1-252d55dd75b1', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 5, 10, 'vast', NULL, NULL),
	('fed8de47-d5dd-4242-8606-1519d293f94f', 'e5df4807-c44f-4be8-b4d1-252d55dd75b1', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 6, 2, 'vast', NULL, NULL),
	('a94af978-b2cd-41e9-9e5c-55fd9e162bce', 'e5df4807-c44f-4be8-b4d1-252d55dd75b1', 'fe9258cf-e191-4504-ab65-79e372a21a44', 7, 0.5, 'vast', NULL, NULL),
	('891064e1-b1b6-4d08-abb5-20e970393c8b', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 220, 'kh_bron', NULL, NULL),
	('acaf68c5-b50a-485d-8dc9-dd62ce584580', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', '2ca09f43-13c8-4d9b-b4f7-228752a05175', 1, 190, 'kh_bron', NULL, NULL),
	('208fc860-f3b8-4547-ad9d-b75ec7cac641', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', 'f1d895b4-1f3a-4703-abe0-341888da1e5c', 2, 240, 'eiwit_bron', NULL, NULL),
	('ac22d008-09c0-490d-96c6-183c246024b1', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', 'd79b096e-ca69-4507-aa45-f615b0fa95ed', 3, 240, 'eiwit_bron', NULL, NULL),
	('7655c068-0cca-4ca3-910f-741a81664f53', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', 'ee790d34-d5bf-478b-8985-1c6a12976110', 4, 100, 'vast', NULL, NULL),
	('ef58da9a-a0f0-497a-88db-de3fe0a22376', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', '2e426ad1-3014-45cc-8996-321ec5333982', 5, 6, 'vast', NULL, NULL),
	('02b8a898-4740-435e-ac44-72b5394dbffa', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 6, 150, 'vast', NULL, NULL),
	('ccb2bbe4-2d56-41d2-9f73-07dbfffa3808', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', '0b827a30-5ba4-4a3c-8656-b967f6f08493', 7, 400, 'vast', NULL, NULL),
	('5a84884e-62ed-4fd7-b883-8843f5cf4e42', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', '3b55eec0-51f6-4d49-98ff-65afa2252bd8', 8, 2, 'vast', NULL, NULL),
	('0f60308e-944f-46b0-80c8-7e392b54965d', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', 'b1896ce0-252d-4b27-a524-17d1f0757cae', 9, 2, 'vast', NULL, NULL),
	('a13726b9-289d-43ba-865b-85ee425f7fa1', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 10, 10, 'vast', NULL, NULL),
	('407271dd-c14e-44ef-9402-fdccf97d5dad', '6c6aacff-73bf-475c-a0ee-14148cf9de1c', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 11, 2, 'vast', NULL, NULL),
	('db7920a8-93b1-4c9e-afb4-b132209efd0b', 'bf1dae98-9514-4d42-b2bf-beeddfe723b3', '802a343b-5924-4e1d-97f9-4f1f1e4f7ad9', 0, 700, 'kh_bron', NULL, NULL),
	('a96f5702-3574-47dc-a2b9-114b528122e4', 'bf1dae98-9514-4d42-b2bf-beeddfe723b3', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 1, 240, 'eiwit_bron', NULL, NULL),
	('c61b317f-c629-479f-9f1c-acb684b36a1c', 'bf1dae98-9514-4d42-b2bf-beeddfe723b3', '1fafc519-6ad4-4b03-af91-193b48c2fd30', 2, 100, 'vast', NULL, NULL),
	('d3a97928-48da-46df-8aee-66ed6bbdf425', 'bf1dae98-9514-4d42-b2bf-beeddfe723b3', '76d1bdd8-1e77-4746-969e-ccc5b804dbb0', 3, 200, 'vast', NULL, NULL),
	('13e811b1-f1ce-4734-b5f0-100bbce96a9e', 'bf1dae98-9514-4d42-b2bf-beeddfe723b3', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 4, 15, 'vast', NULL, NULL),
	('40c246d2-a083-4a02-881d-1fd39095fdd2', 'bf1dae98-9514-4d42-b2bf-beeddfe723b3', '0335d990-6aee-4a17-9cef-a9113fcce874', 5, 3, 'vast', NULL, NULL),
	('b20dabf3-8ab9-4cf9-a1d0-500edd49e123', 'bf1dae98-9514-4d42-b2bf-beeddfe723b3', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 6, 2, 'vast', NULL, NULL),
	('a3c1cf78-daba-40b5-9dc0-65594a00b980', '77f17a88-c0ba-41c5-b7d2-d3fd29d5ce49', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 280, 'kh_bron', NULL, NULL),
	('bc9df02e-3f66-47c2-bf8e-88dfc62f9a99', '77f17a88-c0ba-41c5-b7d2-d3fd29d5ce49', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 1, 175, 'eiwit_bron', NULL, NULL),
	('b81828e7-2c09-436c-95d1-b37c71173dca', '77f17a88-c0ba-41c5-b7d2-d3fd29d5ce49', 'ba75b902-52a2-464f-8404-bfc89ccf8172', 2, 250, 'vast', NULL, NULL),
	('2487734d-2a65-4fef-b985-8cbdd2753c7c', '77f17a88-c0ba-41c5-b7d2-d3fd29d5ce49', 'fb1fbbad-c6bd-41ac-8135-79d7590b8bc6', 3, 30, 'vast', NULL, NULL),
	('734791aa-f39b-4f27-917b-6598c0ff899f', '77f17a88-c0ba-41c5-b7d2-d3fd29d5ce49', '7dc567be-ddf5-432c-a567-a2def6028cb6', 4, 150, 'vast', NULL, NULL),
	('cb4046a8-c06f-4ffe-abb5-209e3d6cdb13', '77f17a88-c0ba-41c5-b7d2-d3fd29d5ce49', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 5, 5, 'vast', NULL, NULL),
	('d195c4ae-ed89-4d6f-ba04-463ccf39e512', 'd554da17-43f1-4875-b366-f889074e7594', '31ede4fb-d3e8-41f1-800b-8f65ab6a49a3', 0, 800, 'kh_bron', NULL, NULL),
	('fd75c203-2198-4c82-9192-49f60168f20d', 'd554da17-43f1-4875-b366-f889074e7594', '9f24d076-9867-44f6-b075-e2f5d3f61900', 1, 170, 'eiwit_bron', NULL, NULL),
	('7100efa1-e9f8-4958-b9e9-a59cec5e17b7', 'd554da17-43f1-4875-b366-f889074e7594', 'de396fe5-ce95-4522-8f15-6c0064405e70', 2, 300, 'vast', NULL, NULL),
	('f1692b89-1960-4ec2-8614-1bf3f6b0d087', 'd554da17-43f1-4875-b366-f889074e7594', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 3, 100, 'vast', NULL, NULL),
	('4ed303d3-ab44-410b-a1af-3a299eaf5238', 'd554da17-43f1-4875-b366-f889074e7594', '2627853f-25d2-476b-9ad3-df6f402bd664', 4, 10, 'vast', NULL, NULL),
	('46b112d2-7356-431f-93bb-5b7ded0c82bf', 'd554da17-43f1-4875-b366-f889074e7594', '433559fa-d29e-41aa-bb77-05f6a6af6ba0', 5, 10, 'vast', NULL, NULL),
	('f57dc64f-cbc0-4003-97b2-a7198c8de73d', 'd554da17-43f1-4875-b366-f889074e7594', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 6, 2, 'vast', NULL, NULL),
	('e5760c42-ee48-4ac3-a575-fada842eb058', 'd554da17-43f1-4875-b366-f889074e7594', 'fe9258cf-e191-4504-ab65-79e372a21a44', 7, 0.5, 'vast', NULL, NULL),
	('06f33108-2a66-4f91-8893-f805d5a8621f', 'aa99a9ec-ceda-43dd-a87a-c6953c8ad884', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 200, 'kh_bron', NULL, NULL),
	('88c39c71-43ff-4cf3-a4be-4c0265a31e7f', 'aa99a9ec-ceda-43dd-a87a-c6953c8ad884', 'fcf695c0-9882-45e7-ab70-023f324a353f', 1, 250, 'eiwit_bron', NULL, NULL),
	('7bd78f83-6f67-46d5-998f-63604d042595', 'aa99a9ec-ceda-43dd-a87a-c6953c8ad884', '9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 2, 150, 'vast', NULL, NULL),
	('a1c2cf45-1dbf-41fa-acc8-5a9958aa15cb', 'aa99a9ec-ceda-43dd-a87a-c6953c8ad884', 'e8d19d0c-9340-4e29-a524-e8df8aa4ff65', 3, 80, 'vast', NULL, NULL),
	('f3f891dc-bfeb-490c-8e44-4bcf0c0a69c8', 'aa99a9ec-ceda-43dd-a87a-c6953c8ad884', '7d39002a-f385-4d49-928c-6be07ed2a88c', 4, 100, 'vast', NULL, NULL),
	('ff18a9dd-7a86-4a04-a04d-cc250227b7f0', 'aa99a9ec-ceda-43dd-a87a-c6953c8ad884', '23d0383b-038a-4c6f-b40e-2dfd47dac69a', 5, 20, 'vast', NULL, NULL),
	('3557dc51-5e41-4780-8c1d-53a05d583365', 'aa99a9ec-ceda-43dd-a87a-c6953c8ad884', 'b4365b69-3f06-4f81-b6e7-516795ed0206', 6, 5, 'vast', NULL, NULL),
	('3d57bcc3-5917-4561-becc-aa2b0af684d4', 'aa99a9ec-ceda-43dd-a87a-c6953c8ad884', '90e1adc9-e896-46fd-ad29-5d62d319f0b8', 7, 5, 'vast', NULL, NULL),
	('516ac1ef-1ab7-473f-9041-4f5a01dc7586', '6aa05449-cae3-4d05-a2c7-f6b4911ebc88', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 250, 'kh_bron', NULL, NULL),
	('40a19cee-1037-4907-831f-66ea820a576e', '6aa05449-cae3-4d05-a2c7-f6b4911ebc88', 'b8929810-ea50-49ce-8f5e-cc8cbceb7df5', 1, 150, 'eiwit_bron', NULL, NULL),
	('400baec7-1d3f-4403-b3ac-b77892f58bc1', '6aa05449-cae3-4d05-a2c7-f6b4911ebc88', 'ee790d34-d5bf-478b-8985-1c6a12976110', 2, 100, 'vast', NULL, NULL),
	('0bcc0fde-3ef1-42e2-9001-b6397dc254df', '6aa05449-cae3-4d05-a2c7-f6b4911ebc88', '2e426ad1-3014-45cc-8996-321ec5333982', 3, 6, 'vast', NULL, NULL),
	('8d1d2150-e618-453c-9f0c-2d75a4adf310', '6aa05449-cae3-4d05-a2c7-f6b4911ebc88', 'b365fe28-dd8b-40e8-87ee-9f612b03ab89', 4, 10, 'vast', NULL, NULL),
	('c4d8316a-46c3-4ab8-9e51-61d88cf1f971', '6aa05449-cae3-4d05-a2c7-f6b4911ebc88', 'f0532c1f-9587-4275-b89e-f4c41c163be2', 5, 5, 'vast', NULL, NULL),
	('253f608c-d8c9-4450-bd69-5ae9853b224f', '6aa05449-cae3-4d05-a2c7-f6b4911ebc88', '0b827a30-5ba4-4a3c-8656-b967f6f08493', 6, 400, 'vast', NULL, NULL),
	('1bad8c1f-7e86-4339-8afa-ac5eff380414', '6aa05449-cae3-4d05-a2c7-f6b4911ebc88', '2f19d7da-fda2-410c-bde0-ab19b6a889d0', 7, 200, 'vast', NULL, NULL),
	('43cebe46-fc50-4c48-b1a7-7a242e5e7422', '6aa05449-cae3-4d05-a2c7-f6b4911ebc88', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 8, 10, 'vast', NULL, NULL),
	('d4861aab-cbd0-491e-8b23-6468f1f04450', '6aa05449-cae3-4d05-a2c7-f6b4911ebc88', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 9, 2, 'vast', NULL, NULL),
	('7b2048fe-682f-4e30-8e56-08ab0936998f', '0966e4fd-c51b-4d52-aa63-9767e4a7a9ca', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 200, 'kh_bron', NULL, NULL),
	('d5b88db7-2365-494e-999d-28267d3e0126', '0966e4fd-c51b-4d52-aa63-9767e4a7a9ca', '77a1d7ba-f870-4c9e-bf91-122fa50db633', 1, 250, 'eiwit_bron', NULL, NULL),
	('15bdd05d-a492-403b-be6a-f4bd22d03d05', '0966e4fd-c51b-4d52-aa63-9767e4a7a9ca', 'ba75b902-52a2-464f-8404-bfc89ccf8172', 2, 300, 'vast', NULL, NULL),
	('d543162b-7702-48cc-84f3-4ae320256b6b', '0966e4fd-c51b-4d52-aa63-9767e4a7a9ca', '2e426ad1-3014-45cc-8996-321ec5333982', 3, 6, 'vast', NULL, NULL),
	('d1571014-9aa4-4ad6-bde4-d7d165427e4f', '0966e4fd-c51b-4d52-aa63-9767e4a7a9ca', '1d143628-0f18-4a6b-8dad-f0067ea07e2e', 4, 30, 'vast', NULL, NULL),
	('a2e71987-a959-4788-a725-fe0798bad24c', '0966e4fd-c51b-4d52-aa63-9767e4a7a9ca', '7ade49cc-df77-4148-862e-2f587b323b47', 5, 5, 'vast', NULL, NULL),
	('f7fd46c7-e3c9-49d0-8ecc-a489049f3dd7', '0966e4fd-c51b-4d52-aa63-9767e4a7a9ca', '433559fa-d29e-41aa-bb77-05f6a6af6ba0', 6, 10, 'vast', NULL, NULL),
	('280e9f61-59e0-4a00-9e16-3e98ed4117f4', 'ff126058-6eef-42f5-b1b7-571b6faa0dfa', 'f935f960-9cf2-48bc-a009-b9d88a1d2eeb', 0, 220, 'kh_bron', NULL, NULL),
	('829cef28-9e60-4142-83ae-c2e7cb6bc103', 'ff126058-6eef-42f5-b1b7-571b6faa0dfa', 'd56aa88a-95cf-43b0-ba94-5ebab9d692d1', 1, 130, 'eiwit_bron', NULL, NULL),
	('9b894059-61c9-4e19-8954-26ae6440319e', 'ff126058-6eef-42f5-b1b7-571b6faa0dfa', 'ee790d34-d5bf-478b-8985-1c6a12976110', 2, 80, 'vast', NULL, NULL),
	('13823815-e777-45d5-ae69-d9b913058dc8', 'ff126058-6eef-42f5-b1b7-571b6faa0dfa', '2e426ad1-3014-45cc-8996-321ec5333982', 3, 6, 'vast', NULL, NULL),
	('3aa02887-e971-442b-98d0-65bd6d74a52d', 'ff126058-6eef-42f5-b1b7-571b6faa0dfa', '38357f1b-37fd-4ae8-9780-382b6c77da62', 4, 400, 'vast', NULL, NULL),
	('d7db04c4-e1e6-4d08-8955-3687a2530079', 'ff126058-6eef-42f5-b1b7-571b6faa0dfa', 'dec14401-3107-4d7c-9ac4-ff200a29e048', 5, 30, 'vast', NULL, NULL),
	('e5b2b161-afff-4afe-aed0-47dc72cd8c15', 'ff126058-6eef-42f5-b1b7-571b6faa0dfa', '22873273-d7c5-4a2c-964d-6915e90e7d82', 6, 40, 'vast', NULL, NULL),
	('91a5ef67-f2b4-4bf4-95fc-bf50c1e3e1e4', 'ff126058-6eef-42f5-b1b7-571b6faa0dfa', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 7, 10, 'vast', NULL, NULL),
	('355477c6-d294-401f-adab-9fe09c3fffd8', '8723f85d-9d93-4b57-b088-9493ee971112', '7089fab8-137e-4555-a86b-72349b21331c', 0, 220, 'kh_bron', NULL, NULL),
	('40a1508a-e3ed-4615-b055-2eb607b315cb', '8723f85d-9d93-4b57-b088-9493ee971112', '1c031257-3d58-42f7-aa4a-8c8e3290b5a3', 1, 150, 'kh_bron', NULL, NULL),
	('d78530c6-4f9c-47d9-ac29-040761f4f0b6', '8723f85d-9d93-4b57-b088-9493ee971112', 'aaa2b55e-69dd-4f92-8413-77afd93db7b0', 2, 165, 'kh_bron', NULL, NULL),
	('f92f1f0a-2604-4734-8f72-831141176783', '8723f85d-9d93-4b57-b088-9493ee971112', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 3, 240, 'kh_bron', NULL, NULL),
	('9cbba0a8-d4ca-41a9-b70b-8976735cdd19', '8723f85d-9d93-4b57-b088-9493ee971112', '296572d3-a227-4db9-a7e5-f2967923e2f5', 4, 90, 'vast', NULL, NULL),
	('64886e26-9e5a-4866-9f8a-bfde96036558', '8723f85d-9d93-4b57-b088-9493ee971112', '92816d62-02fe-4ad7-a476-f440b6cb14e8', 5, 15, 'vast', NULL, NULL),
	('c7d071d4-81be-48e0-836d-60b5e50b127b', '8723f85d-9d93-4b57-b088-9493ee971112', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 6, 190, 'vast', NULL, NULL),
	('3ecb4665-fae5-43c0-b4e1-5b52e4d00cf1', '8723f85d-9d93-4b57-b088-9493ee971112', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 7, 50, 'vast', NULL, NULL),
	('c1b3630d-d2a3-48eb-b6c7-43d154eae409', '8723f85d-9d93-4b57-b088-9493ee971112', '7d4941e1-a27a-4109-bd90-051e6b23b194', 8, 125, 'vast', NULL, NULL),
	('8cee30d9-770a-4f1d-802f-2109f27d5d6b', 'd971163e-0e1c-4bd9-b6d7-be96a2f7d249', '7089fab8-137e-4555-a86b-72349b21331c', 0, 150, 'kh_bron', NULL, NULL),
	('6f690065-c7ab-45e9-b863-4d49351eb692', 'd971163e-0e1c-4bd9-b6d7-be96a2f7d249', '1c031257-3d58-42f7-aa4a-8c8e3290b5a3', 1, 150, 'kh_bron', NULL, NULL),
	('8ec0a164-008b-43ef-80fc-a8800665a9dd', 'd971163e-0e1c-4bd9-b6d7-be96a2f7d249', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 2, 90, 'kh_bron', NULL, NULL),
	('1e664c05-1e96-442a-b1d3-e9938b974776', 'd971163e-0e1c-4bd9-b6d7-be96a2f7d249', '499758a3-3708-4a3d-b08a-cb496a70306f', 3, 100, 'kh_bron', NULL, NULL),
	('87ea0084-997d-4d19-9861-5b037bad0bff', 'd971163e-0e1c-4bd9-b6d7-be96a2f7d249', 'f1fa0255-6b85-48a8-a44e-43ca997a27e7', 4, 200, 'kh_bron', NULL, NULL),
	('17a27a98-64a1-424c-8397-a7fecb29b3fc', 'd971163e-0e1c-4bd9-b6d7-be96a2f7d249', '48e78c63-b415-4965-87d8-1ba663190bcd', 5, 250, 'vast', NULL, NULL),
	('b9b8a678-ff38-4baa-a703-8fe8f3793f21', 'd971163e-0e1c-4bd9-b6d7-be96a2f7d249', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 6, 125, 'vast', NULL, NULL),
	('312eac18-ce62-4b7f-bf2a-b9024d7b2c77', 'd971163e-0e1c-4bd9-b6d7-be96a2f7d249', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 7, 100, 'vast', NULL, NULL),
	('a9480cbd-a09a-4063-bd79-ca1380a48753', 'd971163e-0e1c-4bd9-b6d7-be96a2f7d249', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 8, 25, 'vast', NULL, NULL),
	('1ad3d0d0-e3f2-4e65-8db1-72ed35b80895', 'e0952104-a887-46ae-9c45-c5bed4444aab', '88f8356c-1a46-4c38-9528-2ae97187670b', 0, 60, 'kh_bron', NULL, NULL),
	('87b6a7d1-28d3-46f3-a423-755cd905f891', 'e0952104-a887-46ae-9c45-c5bed4444aab', 'c797d677-fd0e-4ab2-8bb7-dc4be068001b', 1, 20, 'vast', NULL, NULL),
	('478da8cd-ea96-450f-9d5b-d27fdffd40cd', '97ccf0ed-dfba-4ab6-ac72-f81bef6e6748', 'e47fe418-a55d-4269-9e78-c2f123db13b2', 0, 50, 'kh_bron', NULL, NULL),
	('e87a1c65-dcf6-4ab3-8642-c3f313aebf9d', '97ccf0ed-dfba-4ab6-ac72-f81bef6e6748', '55ad9435-76a1-4a03-a249-866d3a23e8e8', 1, 150, 'vast', NULL, NULL),
	('3d407f6f-b227-4b6a-b7e2-2daf5713c013', '80bff38e-662e-47fe-9de1-d776fe657296', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 0, 20, 'kh_bron', NULL, NULL),
	('5ff93475-84c6-4a1b-8611-c24b952cbced', '80bff38e-662e-47fe-9de1-d776fe657296', '1e7b6dfa-0854-4eb3-9abe-ccb8eb83b5a5', 1, 100, 'kh_bron', NULL, NULL),
	('40b021df-f95b-4042-9af3-b230ad570fea', '80bff38e-662e-47fe-9de1-d776fe657296', '8717651c-289c-4f2b-aeaf-5dea81d93c1e', 2, 200, 'vast', NULL, NULL),
	('0dd94f9b-c0db-4447-8f1f-30f0bcc89ab4', '80bff38e-662e-47fe-9de1-d776fe657296', 'b5a4bb62-78fa-4305-a825-459dc1d50375', 3, 15, 'vast', NULL, NULL),
	('c2df5976-6cd5-4799-aab5-f2bb750868ca', '4e3697e0-b667-4e55-8165-aeb9bbfa9bc5', '3261679a-2a07-42af-91be-83686e280bd0', 0, 25, 'kh_bron', NULL, NULL),
	('a3ae3625-29ee-4dd7-b698-5be5e17198e0', '4e3697e0-b667-4e55-8165-aeb9bbfa9bc5', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 100, 'kh_bron', NULL, NULL),
	('6700d11f-fb22-4b0e-bfdd-659b8bc6e2ce', '4e3697e0-b667-4e55-8165-aeb9bbfa9bc5', '0465308a-9097-44e8-a8e4-acaf770f38a4', 2, 20, 'vast', NULL, NULL),
	('903b4843-57f6-4b92-b491-cc03a6f19906', 'e5a9eae5-23f5-40e7-bf4e-0965396e0fb0', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 0, 120, 'kh_bron', NULL, NULL),
	('b9e82013-38b0-45fc-8c64-8992fcb91d27', 'e5a9eae5-23f5-40e7-bf4e-0965396e0fb0', 'a91cdfad-83f1-4882-bcc4-aa4830e31b06', 1, 150, 'kh_bron', NULL, NULL),
	('b50195be-2400-4754-8905-39fd0cd2c4b2', 'e5a9eae5-23f5-40e7-bf4e-0965396e0fb0', '127ae810-49f9-4d57-be2c-2419d7390634', 2, 100, 'vast', NULL, NULL),
	('d15aab79-53d7-462b-bffd-a507afe2df4b', 'e5a9eae5-23f5-40e7-bf4e-0965396e0fb0', '48e78c63-b415-4965-87d8-1ba663190bcd', 3, 100, 'vast', NULL, NULL),
	('51951f24-217b-42e3-9d4c-33becc3c8398', 'f079d961-eb74-4411-838d-fe00a8a21e10', '7a9b5173-b6e9-4671-95f1-66585c521ce1', 0, 40, 'kh_bron', NULL, NULL),
	('6d679336-0579-486a-b828-cd517d8b4c05', 'f079d961-eb74-4411-838d-fe00a8a21e10', 'a84f48f7-649b-4a42-9a96-cb949308a895', 1, 100, 'vast', NULL, NULL),
	('462fa3d1-3710-482e-b342-895303045fe2', 'f079d961-eb74-4411-838d-fe00a8a21e10', '221ea599-6289-4ac4-97b8-71475916afde', 2, 80, 'vast', NULL, NULL),
	('fb5fcaca-5b84-44a8-9c12-1e307e586035', 'f079d961-eb74-4411-838d-fe00a8a21e10', 'fe9258cf-e191-4504-ab65-79e372a21a44', 3, 0.5, 'vast', NULL, NULL),
	('15f6d0eb-c374-44ab-b265-8410ed493160', 'f0528707-798b-4c06-b479-72f4dc84d8eb', '749eb8db-d012-4e34-ad24-830873f30827', 0, 40, 'kh_bron', NULL, NULL),
	('7355f58f-cf00-4f0c-bc01-e3d1d4b8f3d3', 'f0528707-798b-4c06-b479-72f4dc84d8eb', '1d8d93ad-2895-4008-adee-f9e4092152ec', 1, 25, 'vast', NULL, NULL),
	('37ff9ee3-d394-415e-9e87-f62b7ea02fe2', 'e6a665e2-ac62-4698-91f4-e6fef04e9726', '7fa8698e-8e6b-4b44-9068-9efc4fec27e7', 0, 150, 'kh_bron', NULL, NULL),
	('945c3820-03bf-475b-9fd9-e6cecbd318ca', 'e6a665e2-ac62-4698-91f4-e6fef04e9726', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 1, 10, 'kh_bron', NULL, NULL),
	('6d598cb3-e852-42f8-8267-ff0eb745acd1', 'e6a665e2-ac62-4698-91f4-e6fef04e9726', '7614b893-c6df-433d-94f4-1ee9e38548cd', 2, 75, 'vast', NULL, NULL),
	('5ce5b14a-a2f1-4aea-a9c0-761cab2e92c0', 'e6a665e2-ac62-4698-91f4-e6fef04e9726', '4c825261-f67d-4d51-b1a3-f200345460c8', 3, 200, 'vast', NULL, NULL),
	('eae223c5-898b-47aa-a2b4-e86d302aabf0', '3c94c342-59c0-444f-8e5d-fd43f0b263fe', 'd7c3f40c-27b7-494e-9d28-b4253567d8d0', 0, 60, 'kh_bron', NULL, NULL),
	('052980ac-75f0-454a-8554-8a6a7599d9ea', '3c94c342-59c0-444f-8e5d-fd43f0b263fe', 'd9325545-0203-4fa2-a43b-08029f9656cd', 1, 40, 'vast', NULL, NULL),
	('10c7e5eb-fd4b-413a-addf-6bcbc2c212a9', '3c94c342-59c0-444f-8e5d-fd43f0b263fe', '7d39002a-f385-4d49-928c-6be07ed2a88c', 2, 100, 'vast', NULL, NULL);
INSERT INTO public.nutrition_recipe_ingredients VALUES
	('8f9aa730-a07b-44a0-ad13-143b81566c75', 'ca67a1e5-be52-4bc5-bf06-5679ae7603e9', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 200, 'kh_bron', NULL, NULL),
	('fe327d9c-82b0-4140-8bf5-0638214c9c04', 'ca67a1e5-be52-4bc5-bf06-5679ae7603e9', 'aaa2b55e-69dd-4f92-8413-77afd93db7b0', 1, 60, 'kh_bron', NULL, NULL),
	('b71e33ad-4c0f-46d4-b5f5-1b5ded59dffb', 'ca67a1e5-be52-4bc5-bf06-5679ae7603e9', 'b1aab78d-48c7-47bd-a32f-c7411d711f97', 2, 60, 'kh_bron', NULL, NULL),
	('5631e5fe-6734-44db-a237-515e7a4034e7', 'ca67a1e5-be52-4bc5-bf06-5679ae7603e9', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 3, 700, 'vast', NULL, NULL),
	('66b15b32-8086-41c0-b30a-2336f96b7d8f', 'ca67a1e5-be52-4bc5-bf06-5679ae7603e9', 'c3d7d0cb-54e6-4a34-b7ec-73de1b7bd6c9', 4, 1, 'vast', NULL, NULL),
	('2e88a500-1af0-4a0e-8d7a-9bb330b368ae', 'bd0c9808-55e0-4e0d-b3e3-4bbcca08f716', '88f8356c-1a46-4c38-9528-2ae97187670b', 0, 120, 'kh_bron', NULL, NULL),
	('60b5640c-9f79-40e7-8bf9-94ccd5a81e6f', 'bd0c9808-55e0-4e0d-b3e3-4bbcca08f716', '641d7368-148c-4a12-ab0a-885982b4cbc9', 1, 20, 'kh_bron', NULL, NULL),
	('4798046a-6318-4584-b97c-976926b5aa42', '22ae1a93-d1a8-4ac2-96dd-9a8287fdffac', '0ba369b9-8586-4a88-8689-2d9139c40369', 0, 160, 'kh_bron', NULL, NULL),
	('9d1a85a5-a35a-474b-9d0b-b50c3993ca93', '22ae1a93-d1a8-4ac2-96dd-9a8287fdffac', '7cb35967-7975-42bf-9b98-af8a89601a84', 1, 40, 'kh_bron', NULL, NULL),
	('3e75bf5c-b69c-44eb-b32e-648060ef1874', '22ae1a93-d1a8-4ac2-96dd-9a8287fdffac', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 2, 300, 'vast', NULL, NULL),
	('0496ead9-d737-4ea6-9c3d-f1aaf3643639', '22ae1a93-d1a8-4ac2-96dd-9a8287fdffac', '433559fa-d29e-41aa-bb77-05f6a6af6ba0', 3, 8, 'vast', NULL, NULL),
	('d3e2d11a-eec3-4c61-a25c-be4103b5863e', '8af3ff0d-f409-43c7-b4eb-12c14e02ab3a', 'e47fe418-a55d-4269-9e78-c2f123db13b2', 0, 60, 'kh_bron', NULL, NULL),
	('ddc6e301-f3bb-449e-b469-fc48ec838ee4', '8af3ff0d-f409-43c7-b4eb-12c14e02ab3a', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 120, 'kh_bron', NULL, NULL),
	('765fc1bd-bf1d-48b1-9b9e-e67977be3caa', 'add0e7f3-d42a-4285-9b51-7789b8e647ad', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 90, 'kh_bron', NULL, NULL),
	('4d1830ed-3669-4cdf-92aa-0cca140edb25', 'add0e7f3-d42a-4285-9b51-7789b8e647ad', '38357f1b-37fd-4ae8-9780-382b6c77da62', 1, 150, 'vast', NULL, NULL),
	('3b0a0074-436b-4dff-a6b8-d95d24eab96f', 'add0e7f3-d42a-4285-9b51-7789b8e647ad', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 2, 5, 'vast', NULL, NULL),
	('06193e05-5fb6-4be2-b46f-fda675455cd1', 'add0e7f3-d42a-4285-9b51-7789b8e647ad', 'ede7c8b4-6aed-4d43-a283-9d6f2fbf28e0', 3, 3, 'vast', NULL, NULL),
	('71f8222f-85d5-4ea8-968c-412b7557422c', 'add0e7f3-d42a-4285-9b51-7789b8e647ad', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 4, 1, 'vast', NULL, NULL),
	('602d92cd-a6de-4aa3-93c6-183d76627302', 'de86c180-2ba1-40a0-a05e-4964aa22a801', '3261679a-2a07-42af-91be-83686e280bd0', 0, 30, 'kh_bron', NULL, NULL),
	('663b060c-9088-4f0e-a183-85901bb46f45', 'de86c180-2ba1-40a0-a05e-4964aa22a801', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 1, 20, 'kh_bron', NULL, NULL),
	('73218005-3a9f-4706-874f-476c5ed15bc3', 'de86c180-2ba1-40a0-a05e-4964aa22a801', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 2, 120, 'kh_bron', NULL, NULL),
	('82e25370-c07b-4fc9-8c5c-ea6b8459b992', '30fc8000-eefd-4f8f-a938-fae3556b4449', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 0, 150, 'kh_bron', NULL, NULL),
	('795f61bc-88df-4976-9013-d96ce9d822b8', '30fc8000-eefd-4f8f-a938-fae3556b4449', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 1, 30, 'kh_bron', NULL, NULL),
	('a11eed56-ccb7-45c7-9d20-0afb8e1a94ca', '30fc8000-eefd-4f8f-a938-fae3556b4449', 'a91cdfad-83f1-4882-bcc4-aa4830e31b06', 2, 250, 'kh_bron', NULL, NULL),
	('b3318fe1-e0c1-420c-bdcd-47266cc1020c', '30fc8000-eefd-4f8f-a938-fae3556b4449', '9ab27016-6c79-4c81-91e2-d848b2976f89', 3, 10, 'kh_bron', NULL, NULL),
	('c58c75d5-ff8b-4649-98d0-63da5ffc55ba', 'd2137d1a-bc49-44c2-ac76-cc4ae8272e6b', '26b4752b-e751-47fb-9b57-3d77408e2879', 0, 110, 'kh_bron', NULL, NULL),
	('657fafaf-d701-4ca8-a097-b5dc1bf98812', 'd2137d1a-bc49-44c2-ac76-cc4ae8272e6b', 'c4be345c-ac38-42af-859d-c10829a1c0ea', 1, 200, 'kh_bron', NULL, NULL),
	('49aeee84-e543-4716-aaa1-82a61cc9377a', 'd2137d1a-bc49-44c2-ac76-cc4ae8272e6b', 'e6eb49a9-2691-47bc-a864-554692ecb91a', 2, 30, 'vast', NULL, NULL),
	('8fe699f8-f7d0-4ada-8453-6ac29771d994', '734db503-7a63-4029-aeb7-c9c7ba5716b9', '88f8356c-1a46-4c38-9528-2ae97187670b', 0, 75, 'kh_bron', NULL, NULL),
	('37e95043-78a2-41aa-aac4-a93d82f2fc3c', '734db503-7a63-4029-aeb7-c9c7ba5716b9', '641d7368-148c-4a12-ab0a-885982b4cbc9', 1, 25, 'kh_bron', NULL, NULL),
	('ebbdb7fd-9bec-4b72-a7bf-0ae6345214e0', '640bc051-2806-45ce-b46a-ddce03b968bd', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 0, 120, 'kh_bron', NULL, NULL),
	('9db32e2a-7984-41c9-b465-06967144ec5d', '640bc051-2806-45ce-b46a-ddce03b968bd', 'e47fe418-a55d-4269-9e78-c2f123db13b2', 1, 45, 'kh_bron', NULL, NULL),
	('bd6761a2-c8e0-4a73-bbe7-189aad0d1ca8', '3d8cef63-b092-49dc-98ae-f157ebfe40d0', '26b4752b-e751-47fb-9b57-3d77408e2879', 0, 70, 'kh_bron', NULL, NULL),
	('caba44e0-57b9-4082-814d-c701e5aa991a', '3d8cef63-b092-49dc-98ae-f157ebfe40d0', '641d7368-148c-4a12-ab0a-885982b4cbc9', 1, 35, 'kh_bron', NULL, NULL),
	('c88be14d-e776-4824-a7ee-fb40ad437111', 'd138822b-bc63-4605-8739-c4965c44f9bc', '8bfe1e41-d04b-46b0-a378-6ff39a027356', 0, 70, 'kh_bron', NULL, NULL),
	('c38fe006-471b-48c3-b3f7-86391a95a1ce', 'd138822b-bc63-4605-8739-c4965c44f9bc', '641d7368-148c-4a12-ab0a-885982b4cbc9', 1, 35, 'kh_bron', NULL, NULL),
	('493c2933-4d15-4338-a1e9-de6e1c30dfa0', 'd138822b-bc63-4605-8739-c4965c44f9bc', '0465308a-9097-44e8-a8e4-acaf770f38a4', 2, 10, 'vast', NULL, NULL),
	('99f685ed-cd70-4b19-8c21-bd98ca21e198', '87a2e035-919c-494a-af10-18a7825e1f6d', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 0, 200, 'kh_bron', NULL, NULL),
	('ede61c22-217b-47d9-98d0-e57e78087e1c', '87a2e035-919c-494a-af10-18a7825e1f6d', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 300, 'kh_bron', NULL, NULL),
	('a58ac30a-f277-4db2-b1a0-8c709a6ef0b6', '87a2e035-919c-494a-af10-18a7825e1f6d', '749eb8db-d012-4e34-ad24-830873f30827', 2, 100, 'kh_bron', NULL, NULL),
	('f38f4cd5-13d3-4386-ba57-888cd5577ee8', '87a2e035-919c-494a-af10-18a7825e1f6d', '9ab27016-6c79-4c81-91e2-d848b2976f89', 3, 80, 'kh_bron', NULL, NULL),
	('de06e670-e730-4514-9759-d6ba006fc62c', '87a2e035-919c-494a-af10-18a7825e1f6d', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 4, 2, 'vast', NULL, NULL),
	('cfc0b7c9-8ab4-4c3f-8320-f7b2508d9022', 'c0e0f9d7-2e94-48f7-be65-801718f51de1', 'df9f7927-20ef-41a5-9a58-f3a6f1726b25', 0, 200, 'kh_bron', NULL, NULL),
	('c43afdfc-24a7-463e-9712-3695b648844d', 'c0e0f9d7-2e94-48f7-be65-801718f51de1', '9ab27016-6c79-4c81-91e2-d848b2976f89', 1, 25, 'kh_bron', NULL, NULL),
	('453555c8-f91a-4082-8769-c904ab970114', 'c0e0f9d7-2e94-48f7-be65-801718f51de1', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 2, 1.5, 'vast', NULL, NULL),
	('2a5f9b00-3d25-4ebb-9ee3-79641d226b73', '71cace00-8148-480c-aa19-6163a162a2d2', '4bbfaca3-806a-4ba1-a77a-3349cd1f9b22', 0, 45, 'kh_bron', NULL, NULL),
	('75919f89-1f72-4820-b555-15dee20f20be', '71cace00-8148-480c-aa19-6163a162a2d2', '28825716-cf92-4640-90a4-7406ad74c9d3', 1, 30, 'kh_bron', NULL, NULL),
	('0d427167-866a-4b55-b390-05270970de98', '443cb954-072a-48c2-a267-2123a4807ff7', 'c4be345c-ac38-42af-859d-c10829a1c0ea', 0, 350, 'kh_bron', NULL, NULL),
	('6d153351-0462-4c8d-8ead-34ffba56ddac', '443cb954-072a-48c2-a267-2123a4807ff7', 'aaa2b55e-69dd-4f92-8413-77afd93db7b0', 1, 20, 'kh_bron', NULL, NULL),
	('dc59f5a4-36fb-40ac-9398-dfe65923d0e0', '443cb954-072a-48c2-a267-2123a4807ff7', 'c2c6c992-ddf7-4d87-9394-87cdee162fda', 2, 350, 'vast', NULL, NULL),
	('36bd8c8a-dbd4-4818-8294-9382a7b78022', '443cb954-072a-48c2-a267-2123a4807ff7', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 3, 1, 'vast', NULL, NULL),
	('f5414ad4-e4e8-4aa8-baa3-ed0be63e0027', '4c250762-4bc7-417a-8944-0059a64695ba', '2004a957-7deb-4ca6-ac92-bb13eeee407a', 0, 50, 'kh_bron', NULL, NULL),
	('90237d16-8a35-4e85-850c-736ed8dd7d96', '4c250762-4bc7-417a-8944-0059a64695ba', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 120, 'kh_bron', NULL, NULL),
	('4be8676e-7f1c-47cd-bc67-6fab27018380', 'f00e2b7e-1474-4a1c-bbd5-1a981de8c696', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 0, 150, 'kh_bron', NULL, NULL),
	('287e61c1-6232-482a-8f1f-43e305b14553', 'f00e2b7e-1474-4a1c-bbd5-1a981de8c696', '4416ff22-4e0c-4559-8126-ce828eb01443', 1, 40, 'kh_bron', NULL, NULL),
	('f47b73f8-79b2-43e8-9042-10ca4b5acb3f', 'f00e2b7e-1474-4a1c-bbd5-1a981de8c696', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 15, 'kh_bron', NULL, NULL),
	('858a0de2-d5bd-45aa-961e-a3c2efb9904f', 'f00e2b7e-1474-4a1c-bbd5-1a981de8c696', '4c825261-f67d-4d51-b1a3-f200345460c8', 3, 250, 'eiwit_bron', NULL, NULL),
	('93234be1-bedf-4750-a66c-6a849fefb405', 'c164e5b6-8aac-4215-a640-2def524c3ee4', '83b9b6c9-ab5e-4e0d-98f7-3149b0346da9', 0, 90, 'kh_bron', NULL, NULL),
	('711009cb-b09a-4c5a-b1f2-58116f3b13c1', 'c164e5b6-8aac-4215-a640-2def524c3ee4', '34b549f9-beff-4b6b-b3b8-d1d98b751f2b', 1, 70, 'eiwit_bron', NULL, NULL),
	('53ee98ac-fde6-41a4-9051-da2dd646740e', 'c164e5b6-8aac-4215-a640-2def524c3ee4', 'a596ac94-cc0e-469b-8822-c2a0175a29d6', 2, 80, 'vast', NULL, NULL),
	('9b38f0fc-724a-43bf-9546-cb9ffc480bec', 'c164e5b6-8aac-4215-a640-2def524c3ee4', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 3, 5, 'vast', NULL, NULL),
	('c81afc0e-8e99-47e8-94c3-b9d8f6ef4197', 'c164e5b6-8aac-4215-a640-2def524c3ee4', '0335d990-6aee-4a17-9cef-a9113fcce874', 4, 1, 'vast', NULL, NULL),
	('f8a499c7-b3f7-4ba8-a6a4-d6bf89885eb1', 'c164e5b6-8aac-4215-a640-2def524c3ee4', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 5, 1, 'vast', NULL, NULL),
	('b18402a9-ed71-4396-ae73-35ef9b98d44f', '680cb6ed-5ca8-49ba-aaee-6445f96e90e9', '2bff17d7-b135-4009-9054-06ec56b62633', 0, 120, 'kh_bron', NULL, NULL),
	('def5382c-9e26-4b41-b953-2149bebb04b4', '680cb6ed-5ca8-49ba-aaee-6445f96e90e9', 'a91cdfad-83f1-4882-bcc4-aa4830e31b06', 1, 200, 'kh_bron', NULL, NULL),
	('1c829856-9ff2-4715-967a-13123b031150', '680cb6ed-5ca8-49ba-aaee-6445f96e90e9', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 2, 150, 'eiwit_bron', NULL, NULL),
	('9863d090-7260-4524-9302-cfc62a682090', '680cb6ed-5ca8-49ba-aaee-6445f96e90e9', '221ea599-6289-4ac4-97b8-71475916afde', 3, 80, 'vast', NULL, NULL),
	('d506dda1-8b8b-46e8-833c-5be6f7006646', '680cb6ed-5ca8-49ba-aaee-6445f96e90e9', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 4, 5, 'vast', NULL, NULL),
	('7a8da9e6-6196-4ff0-afbf-2ce82a7dc206', '680cb6ed-5ca8-49ba-aaee-6445f96e90e9', 'fc0b9de5-bb44-4864-aebe-b2febe87f97c', 5, 0.5, 'vast', NULL, NULL),
	('5b2e7667-889f-42df-93f0-e7e79a21bdb2', 'd329c3c2-92be-440f-a4a8-607c164ddf97', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 0, 150, 'kh_bron', NULL, NULL),
	('b68b9186-10db-42cb-b969-26c8e3012268', 'd329c3c2-92be-440f-a4a8-607c164ddf97', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 1, 40, 'kh_bron', NULL, NULL),
	('aa76099b-25d3-4968-95a9-a74b53381941', 'd329c3c2-92be-440f-a4a8-607c164ddf97', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 20, 'kh_bron', NULL, NULL),
	('963a5393-6cbc-467b-8937-b25524096941', 'd329c3c2-92be-440f-a4a8-607c164ddf97', '984b1758-daac-4163-ad87-da5463448872', 3, 150, 'eiwit_bron', NULL, NULL),
	('a7675eb9-1dda-4160-940d-20f79e509de6', 'd329c3c2-92be-440f-a4a8-607c164ddf97', '1e7b6dfa-0854-4eb3-9abe-ccb8eb83b5a5', 4, 100, 'vast', NULL, NULL),
	('04975a99-d772-4ae7-8310-60d76b9e0c48', 'd329c3c2-92be-440f-a4a8-607c164ddf97', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 5, 150, 'vast', NULL, NULL),
	('fc9adb80-bd23-4e7a-831e-6d7cd0031e05', '8685f8a1-fb8f-4475-80c4-6ad1b55dd2a7', '26b4752b-e751-47fb-9b57-3d77408e2879', 0, 110, 'kh_bron', NULL, NULL),
	('4f498fc1-dea6-4953-9f02-3dce7bb36f7d', '8685f8a1-fb8f-4475-80c4-6ad1b55dd2a7', 'c4be345c-ac38-42af-859d-c10829a1c0ea', 1, 200, 'kh_bron', NULL, NULL),
	('37ad1ce0-2add-490e-b869-588811cfa02d', '8685f8a1-fb8f-4475-80c4-6ad1b55dd2a7', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 2, 50, 'eiwit_bron', NULL, NULL),
	('7a1e92ab-2f79-4403-a1f9-92750a0f8652', '8685f8a1-fb8f-4475-80c4-6ad1b55dd2a7', '1495017a-c177-4610-82c5-6b1f5f212dc5', 3, 60, 'eiwit_bron', NULL, NULL),
	('fc87de6c-9003-4c78-9faf-50c926ae7bf3', '190da15d-c5e2-4e0f-bca4-d1c271a1f273', '0b06a36c-0a83-431d-8bc8-d53154ff672d', 0, 250, 'kh_bron', NULL, NULL),
	('257efbd5-1c77-40e5-8d41-480f19ac15ac', '190da15d-c5e2-4e0f-bca4-d1c271a1f273', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 120, 'kh_bron', NULL, NULL),
	('354ad2f2-46ca-4475-942a-fdfea46827dc', '190da15d-c5e2-4e0f-bca4-d1c271a1f273', '9508d46d-b4b2-4677-a14a-d9291bb4fd01', 2, 20, 'kh_bron', NULL, NULL),
	('d8a81932-c6d2-4f8a-8d6b-8d30897d25b5', '190da15d-c5e2-4e0f-bca4-d1c271a1f273', '4c825261-f67d-4d51-b1a3-f200345460c8', 3, 200, 'eiwit_bron', NULL, NULL),
	('fb9aeeba-9ce8-42bc-9f5c-7ca429bfa76b', '5f1698dd-52ce-437c-851f-4ee7daa941de', '829ccf63-aa86-4e8f-9b79-e41429ff75d7', 0, 95, 'kh_bron', NULL, NULL),
	('bff33a07-d460-4059-a670-df44cc001815', '5f1698dd-52ce-437c-851f-4ee7daa941de', 'd56aa88a-95cf-43b0-ba94-5ebab9d692d1', 1, 60, 'eiwit_bron', NULL, NULL),
	('30b763ae-2436-49c4-a8e6-5852ee4697bf', '5f1698dd-52ce-437c-851f-4ee7daa941de', '38357f1b-37fd-4ae8-9780-382b6c77da62', 2, 150, 'vast', NULL, NULL),
	('736a1aac-663e-46ad-8e30-e54b6c581c75', '5f1698dd-52ce-437c-851f-4ee7daa941de', '8700d515-3a5e-4576-a9fd-9bdfc14f52a9', 3, 5, 'vast', NULL, NULL),
	('b42ee559-9956-45de-a868-001c14f8ea9f', '3164b489-ee1a-49b4-a6b5-77196138b2c6', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 0, 150, 'kh_bron', NULL, NULL),
	('f6da9bac-3e84-4391-952a-e1a76157a1f3', '3164b489-ee1a-49b4-a6b5-77196138b2c6', 'a29c11ba-6c43-487e-b6b5-9b44ba1403f3', 1, 40, 'kh_bron', NULL, NULL),
	('e960037f-59d1-484a-b4cd-72584c03deb5', '3164b489-ee1a-49b4-a6b5-77196138b2c6', '9ab27016-6c79-4c81-91e2-d848b2976f89', 2, 20, 'kh_bron', NULL, NULL),
	('64fb15a4-b682-44e7-96ce-515b8b7de31d', '3164b489-ee1a-49b4-a6b5-77196138b2c6', 'fbc9fbd4-eb87-490f-ab74-ba186344e419', 3, 400, 'eiwit_bron', NULL, NULL),
	('2585a006-643b-42c2-a76a-45f2c01d9085', '3164b489-ee1a-49b4-a6b5-77196138b2c6', '0465308a-9097-44e8-a8e4-acaf770f38a4', 4, 20, 'eiwit_bron', NULL, NULL),
	('8aff4afe-86e8-4d3c-999a-b395c707ec83', 'de4f22ac-2d0b-4d1f-88bc-ab58c477365d', '3261679a-2a07-42af-91be-83686e280bd0', 0, 40, 'kh_bron', NULL, NULL),
	('1817468f-e511-47b9-96a4-d73741be51f7', 'de4f22ac-2d0b-4d1f-88bc-ab58c477365d', '641d7368-148c-4a12-ab0a-885982b4cbc9', 1, 30, 'kh_bron', NULL, NULL),
	('b5e743b7-c26d-44b0-a050-40e37f3f8264', 'de4f22ac-2d0b-4d1f-88bc-ab58c477365d', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 20, 'kh_bron', NULL, NULL),
	('66eb9783-7e67-4a56-a498-96f9f71dbbbf', 'de4f22ac-2d0b-4d1f-88bc-ab58c477365d', '7d4941e1-a27a-4109-bd90-051e6b23b194', 3, 250, 'eiwit_bron', NULL, NULL),
	('f4d9653b-17b5-4324-94e7-bc0b4a7433e3', '71c6e752-88da-491e-a7c5-cf0dba6cec7d', '0ba369b9-8586-4a88-8689-2d9139c40369', 0, 150, 'kh_bron', NULL, NULL),
	('634ec341-2fb7-4fbe-a499-65f3ac5f9802', '71c6e752-88da-491e-a7c5-cf0dba6cec7d', '7cb35967-7975-42bf-9b98-af8a89601a84', 1, 40, 'kh_bron', NULL, NULL),
	('58d70fd9-b784-4e0c-9eb0-4dec1d5ac9d5', '71c6e752-88da-491e-a7c5-cf0dba6cec7d', '4c825261-f67d-4d51-b1a3-f200345460c8', 2, 350, 'eiwit_bron', NULL, NULL),
	('c49d1438-059b-4fea-802f-b1c75ffcf1e0', '71c6e752-88da-491e-a7c5-cf0dba6cec7d', '71e282dc-9c98-4ac7-a5a5-48bf5e8405ad', 3, 50, 'eiwit_bron', NULL, NULL),
	('cb0f08a0-9499-4cfa-8506-33256fde77e5', '71c6e752-88da-491e-a7c5-cf0dba6cec7d', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 4, 300, 'vast', NULL, NULL),
	('4a72ed1c-f898-4319-bd08-99426e9ec806', '71c6e752-88da-491e-a7c5-cf0dba6cec7d', '127ae810-49f9-4d57-be2c-2419d7390634', 5, 200, 'vast', NULL, NULL),
	('390aa196-2081-4a24-ae97-c9ab9742b841', '71c6e752-88da-491e-a7c5-cf0dba6cec7d', '433559fa-d29e-41aa-bb77-05f6a6af6ba0', 6, 8, 'vast', NULL, NULL),
	('73d08ece-cde5-46f6-a87d-e9d6fda4f141', 'd5ea18c8-c2fd-4b6a-8bfa-b1d7e013be5a', '984b1758-daac-4163-ad87-da5463448872', 0, 300, 'eiwit_bron', NULL, NULL),
	('eb932bd1-ac0f-4a82-825b-7afceaad2c4e', 'd5ea18c8-c2fd-4b6a-8bfa-b1d7e013be5a', '0596dc98-58af-471f-ac08-4a7b2e3beafe', 1, 80, 'vast', NULL, NULL),
	('c87cae38-f963-4dec-96e7-1e6d16ca285a', 'd5ea18c8-c2fd-4b6a-8bfa-b1d7e013be5a', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 2, 10, 'vast', NULL, NULL),
	('c2f3cc12-464e-4e5e-9729-d5703e3f16e9', 'b46538e6-dd2a-4663-9c9e-162ecbb7235e', '7d4941e1-a27a-4109-bd90-051e6b23b194', 0, 350, 'eiwit_bron', NULL, NULL),
	('f2d868a0-a370-4eeb-a4a6-42f0b9207a23', 'b46538e6-dd2a-4663-9c9e-162ecbb7235e', '7614b893-c6df-433d-94f4-1ee9e38548cd', 1, 100, 'vast', NULL, NULL),
	('e950ad66-fe0b-4518-ab1c-d3b35f7a67eb', 'b46538e6-dd2a-4663-9c9e-162ecbb7235e', 'f13c6ea8-449a-4a83-a183-7962b22ca757', 2, 15, 'vast', NULL, NULL),
	('22986a45-309c-4a99-ba81-d5572c4c10c3', 'fbdcb350-3600-416e-9ecf-2ed8979d4988', '4c825261-f67d-4d51-b1a3-f200345460c8', 0, 350, 'eiwit_bron', NULL, NULL),
	('8a15a58f-8443-4f6c-b272-0047958b8a85', 'fbdcb350-3600-416e-9ecf-2ed8979d4988', '55ad9435-76a1-4a03-a249-866d3a23e8e8', 1, 120, 'vast', NULL, NULL),
	('94061f6f-baca-4e81-86aa-808a837166e3', 'fbdcb350-3600-416e-9ecf-2ed8979d4988', 'c3d7d0cb-54e6-4a34-b7ec-73de1b7bd6c9', 2, 1, 'vast', NULL, NULL),
	('1aa29d30-0708-4e70-925f-4cb5cebd64db', '0cd0a85c-e263-48bb-bbd8-5e23af6b2000', 'a84f48f7-649b-4a42-9a96-cb949308a895', 0, 250, 'eiwit_bron', NULL, NULL),
	('821ecc89-45fe-4ac4-9be2-31d6e0431fd0', '0cd0a85c-e263-48bb-bbd8-5e23af6b2000', 'e5b35afd-836d-493e-89ae-2846ff348ee4', 1, 50, 'vast', NULL, NULL),
	('bf0f136d-1e22-4e12-8d24-5993c51337eb', '0cd0a85c-e263-48bb-bbd8-5e23af6b2000', '9cb5d889-b7ca-46a7-8c40-3e47b32bec1e', 2, 60, 'vast', NULL, NULL),
	('b04efe31-2545-4a80-be90-c7561b1f4966', '0cd0a85c-e263-48bb-bbd8-5e23af6b2000', 'fe9258cf-e191-4504-ab65-79e372a21a44', 3, 0.5, 'vast', NULL, NULL),
	('45e345b9-4557-41e4-88d4-d1b826d8ac19', 'e4b3afc4-4d0a-4fb1-b8f7-5b11d1567624', '4c825261-f67d-4d51-b1a3-f200345460c8', 0, 250, 'eiwit_bron', NULL, NULL),
	('c270c83f-0afd-4765-804d-a25a7e825482', 'e4b3afc4-4d0a-4fb1-b8f7-5b11d1567624', '65ff7454-59bc-41df-b1d1-e9ce05936a35', 1, 250, 'eiwit_bron', NULL, NULL),
	('55be25ac-0985-4b9e-9edd-7dae3a089c10', 'e4b3afc4-4d0a-4fb1-b8f7-5b11d1567624', '03ebc8b9-2f16-484d-8db8-154b354b25cd', 2, 8, 'vast', NULL, NULL),
	('38e9772e-e79a-44c1-b44f-3a34d0594f4f', 'e4b3afc4-4d0a-4fb1-b8f7-5b11d1567624', 'f4e6c3fb-1a73-4de1-b6cf-ea1f911d8a3e', 3, 10, 'vast', NULL, NULL),
	('96bfb26a-460f-4ac9-81f9-262e5305fbb1', '8593c3a4-870c-4ded-a23e-105ab18f16e8', '05e6d62b-3b52-47f1-a2ec-27d61f518b1a', 0, 300, 'eiwit_bron', NULL, NULL),
	('54c6bf8a-3a39-4e36-94d6-edcc3591d4e1', '8593c3a4-870c-4ded-a23e-105ab18f16e8', '1e7b6dfa-0854-4eb3-9abe-ccb8eb83b5a5', 1, 100, 'vast', NULL, NULL),
	('267178c2-d130-4bf1-b02e-ab985abc1ea5', '8593c3a4-870c-4ded-a23e-105ab18f16e8', 'b5a4bb62-78fa-4305-a825-459dc1d50375', 2, 15, 'vast', NULL, NULL);


--
-- Data for Name: nutrition_recipe_prefs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: nutrition_reminder_sends; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: nutrition_sweat_tests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_seasons; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_editions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_edition_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_riders; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_edition_standings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_entrants; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_prizes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_prize_awards; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_kit_codes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_results; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_rider_links; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: omnium_season_standings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profile_start_points; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_ai_prompts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_goals; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_ai_generations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_plans; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_workouts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: outdoor_route_suggestions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: polls; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: poll_options; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: poll_votes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: post_comments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: post_likes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profile_blocks; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: strava_activities; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profile_climbed_cols; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwb_segments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.zwb_segments VALUES
	('col-du-telegraphe', 'Col du Télégraphe', 'cols', 'FR', 'Alpen', false, NULL, 850, 'C1', 19322487, 'col-du-telegraphe', true, 'legacy_cols', '{"summit_lat": 45.202600, "summit_lon": 6.444500, "detection_radius_m": 1500, "summit_elevation_m": 1566}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('mont-ventoux', 'Mont Ventoux', 'cols', 'FR', 'Provence', false, NULL, 1610, 'HC', 3974623, 'mont-ventoux', true, 'legacy_cols', '{"summit_lat": 44.173900, "summit_lon": 5.278300, "detection_radius_m": 1500, "summit_elevation_m": 1909}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-d-ornon', 'Col d''Ornon', 'cols', 'FR', 'Alpen', false, NULL, 800, 'C1', 7474038, 'col-d-ornon', true, 'legacy_cols', '{"summit_lat": 45.002843, "summit_lon": 5.967730, "detection_radius_m": 1500, "summit_elevation_m": 1371}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-de-la-loze', 'Col de la Loze', 'cols', 'FR', 'Alpen', false, NULL, 1605, 'HC', 39492420, 'col-de-la-loze', true, 'legacy_cols', '{"summit_lat": 45.406200, "summit_lon": 6.613500, "detection_radius_m": 1500, "summit_elevation_m": 2304}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-de-joux-plane', 'Col de Joux Plane', 'cols', 'FR', 'Alpen', false, NULL, 990, 'HC', 647664, 'col-de-joux-plane', true, 'legacy_cols', '{"summit_lat": 46.132800, "summit_lon": 6.711400, "detection_radius_m": 1500, "summit_elevation_m": 1691}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-du-galibier', 'Col du Galibier', 'cols', 'FR', 'Alpen', false, NULL, 1245, 'HC', 21355204, 'col-du-galibier', true, 'legacy_cols', '{"summit_lat": 45.064100, "summit_lon": 6.407900, "detection_radius_m": 1500, "summit_elevation_m": 2642}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-de-la-madeleine', 'Col de la Madeleine', 'cols', 'FR', 'Alpen', false, NULL, 1500, 'HC', 37468284, 'col-de-la-madeleine', true, 'legacy_cols', '{"summit_lat": 45.434200, "summit_lon": 6.372000, "detection_radius_m": 1500, "summit_elevation_m": 1993}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-du-tourmalet', 'Col du Tourmalet', 'cols', 'FR', 'Pyreneeën', false, NULL, 1268, 'HC', 5170240, 'col-du-tourmalet', true, 'legacy_cols', '{"summit_lat": 42.904800, "summit_lon": 0.141000, "detection_radius_m": 1500, "summit_elevation_m": 2115}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-d-aubisque', 'Col d''Aubisque', 'cols', 'FR', 'Pyreneeën', false, NULL, 1190, 'HC', 37857865, 'col-d-aubisque', true, 'legacy_cols', '{"summit_lat": 42.976500, "summit_lon": -0.339700, "detection_radius_m": 1500, "summit_elevation_m": 1709}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('passo-del-mortirolo', 'Passo del Mortirolo', 'cols', 'IT', 'Alpen', false, NULL, 1300, 'HC', 18623173, 'passo-del-mortirolo', true, 'legacy_cols', '{"summit_lat": 46.248000, "summit_lon": 10.299100, "detection_radius_m": 1500, "summit_elevation_m": 1852}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('passo-gavia', 'Passo Gavia', 'cols', 'IT', 'Alpen', false, NULL, 1404, 'HC', 25049136, 'passo-gavia', true, 'legacy_cols', '{"summit_lat": 46.339500, "summit_lon": 10.486200, "detection_radius_m": 1500, "summit_elevation_m": 2618}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('cote-de-wanne', 'Côte de Wanne', 'cols', 'BE', 'Ardennen', false, NULL, 220, 'C2', 16888141, 'cote-de-wanne', true, 'legacy_cols', '{"summit_lat": 50.378900, "summit_lon": 5.911900, "detection_radius_m": 800, "summit_elevation_m": 510}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('passo-falzarego', 'Passo Falzarego', 'cols', 'IT', 'Dolomieten', false, NULL, 1000, 'HC', NULL, 'passo-falzarego', true, 'legacy_cols', '{"summit_lat": 46.519700, "summit_lon": 12.008600, "detection_radius_m": 1500, "summit_elevation_m": 2105}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-de-la-croix-de-fer', 'Col de la Croix de Fer', 'cols', 'FR', 'Alpen', false, NULL, 1500, 'HC', 1736961, 'col-de-la-croix-de-fer', true, 'legacy_cols', '{"summit_lat": 45.227800, "summit_lon": 6.183200, "detection_radius_m": 1500, "summit_elevation_m": 2067}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('passo-dello-stelvio', 'Passo dello Stelvio', 'cols', 'IT', 'Alpen', false, NULL, 1808, 'HC', 10123783, 'passo-dello-stelvio', true, 'legacy_cols', '{"summit_lat": 46.528600, "summit_lon": 10.454400, "detection_radius_m": 1500, "summit_elevation_m": 2758}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-d-izoard', 'Col d''Izoard', 'cols', 'FR', 'Alpen', false, NULL, 1100, 'HC', 37857767, 'col-d-izoard', true, 'legacy_cols', '{"summit_lat": 44.820000, "summit_lon": 6.735000, "detection_radius_m": 1500, "summit_elevation_m": 2360}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('passo-pordoi', 'Passo Pordoi', 'cols', 'IT', 'Dolomieten', false, NULL, 637, 'C1', 17625683, 'passo-pordoi', true, 'legacy_cols', '{"summit_lat": 46.488600, "summit_lon": 11.812500, "detection_radius_m": 1500, "summit_elevation_m": 2239}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-de-l-iseran', 'Col de l''Iseran', 'cols', 'FR', 'Alpen', false, NULL, 1900, 'HC', 15183768, 'col-de-l-iseran', true, 'legacy_cols', '{"summit_lat": 45.417800, "summit_lon": 7.030600, "detection_radius_m": 1500, "summit_elevation_m": 2770}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-du-grand-saint-bernard', 'Col du Grand-Saint-Bernard', 'cols', 'CH', 'Alpen', false, NULL, 1500, 'HC', 12952256, 'col-du-grand-saint-bernard', true, 'legacy_cols', '{"summit_lat": 45.869400, "summit_lon": 7.170600, "detection_radius_m": 1500, "summit_elevation_m": 2469}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('madonna-del-ghisallo', 'Madonna del Ghisallo', 'cols', 'IT', 'Lombardije', false, NULL, 545, 'C1', 625479, 'madonna-del-ghisallo', true, 'legacy_cols', '{"summit_lat": 45.833600, "summit_lon": 9.262500, "detection_radius_m": 1500, "summit_elevation_m": 754}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('sa-calobra', 'Sa Calobra', 'cols', 'ES', 'Mallorca', false, NULL, 682, 'HC', 653262, 'sa-calobra', true, 'legacy_cols', '{"summit_lat": 39.855600, "summit_lon": 2.798900, "detection_radius_m": 1500, "summit_elevation_m": 682}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-du-soulor', 'Col du Soulor', 'cols', 'FR', 'Pyreneeën', false, NULL, 1090, 'C1', 18478849, 'col-du-soulor', true, 'legacy_cols', '{"summit_lat": 42.975000, "summit_lon": -0.260300, "detection_radius_m": 1500, "summit_elevation_m": 1474}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-de-peyresourde', 'Col de Peyresourde', 'cols', 'FR', 'Pyreneeën', false, NULL, 940, 'C1', 9874898, 'col-de-peyresourde', true, 'legacy_cols', '{"summit_lat": 42.796900, "summit_lon": 0.452500, "detection_radius_m": 1500, "summit_elevation_m": 1569}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-d-aspin', 'Col d''Aspin', 'cols', 'FR', 'Pyreneeën', false, NULL, 800, 'C1', 37857720, 'col-d-aspin', true, 'legacy_cols', '{"summit_lat": 42.935800, "summit_lon": 0.322500, "detection_radius_m": 1500, "summit_elevation_m": 1490}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('cipressa', 'Cipressa', 'cols', 'IT', 'Ligurië', false, NULL, 240, 'C2', 38830996, 'cipressa', true, 'legacy_cols', '{"summit_lat": 43.858900, "summit_lon": 7.911700, "detection_radius_m": 1500, "summit_elevation_m": 240}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-de-vars', 'Col de Vars', 'cols', 'FR', 'Alpen', false, NULL, 990, 'HC', 36908639, 'col-de-vars', true, 'legacy_cols', '{"summit_lat": 44.539400, "summit_lon": 6.705800, "detection_radius_m": 1500, "summit_elevation_m": 2109}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('alpe-d-huez', 'Alpe d''Huez', 'cols', 'FR', 'Alpen', false, NULL, 1130, 'HC', 652851, 'alpe-d-huez', true, 'legacy_cols', '{"summit_lat": 45.092600, "summit_lon": 6.068300, "detection_radius_m": 1500, "summit_elevation_m": 1860}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-du-glandon', 'Col du Glandon', 'cols', 'FR', 'Alpen', false, NULL, 1450, 'HC', 39492114, 'col-du-glandon', true, 'legacy_cols', '{"summit_lat": 45.239600, "summit_lon": 6.175600, "detection_radius_m": 1500, "summit_elevation_m": 1924}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('cote-du-maquisard', 'Côte du Maquisard', 'cols', 'BE', 'Ardennen', false, NULL, 180, 'C3', NULL, 'cote-du-maquisard', true, 'legacy_cols', '{"summit_lat": 50.404200, "summit_lon": 5.862500, "detection_radius_m": 800, "summit_elevation_m": 480}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-alpe-du-zwift', 'Alpe du Zwift', 'cols', 'ZW', 'Watopia', true, NULL, 1036, 'HC', 17267489, 'zwift-alpe-du-zwift', true, 'legacy_cols', '{"summit_lat": null, "summit_lon": null, "detection_radius_m": 250, "summit_elevation_m": 1076}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-epic-kom', 'Epic KOM', 'cols', 'ZW', 'Watopia', true, NULL, 387, 'C2', 16784833, 'zwift-epic-kom', true, 'legacy_cols', '{"summit_lat": null, "summit_lon": null, "detection_radius_m": 250, "summit_elevation_m": null}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-the-grade-kom', 'The Grade KOM', 'cols', 'ZW', 'Watopia', true, NULL, 305, 'C2', 37033150, 'zwift-the-grade-kom', true, 'legacy_cols', '{"summit_lat": null, "summit_lon": null, "detection_radius_m": 250, "summit_elevation_m": 305}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-volcano-kom', 'Volcano KOM', 'cols', 'ZW', 'Watopia', true, NULL, 120, 'C4', 14270131, 'zwift-volcano-kom', true, 'legacy_cols', '{"summit_lat": null, "summit_lon": null, "detection_radius_m": 250, "summit_elevation_m": null}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-titans-grove-kom', 'Titans Grove KOM', 'cols', 'ZW', 'Watopia', true, NULL, 57, 'local', 21343975, 'zwift-titans-grove-kom', true, 'legacy_cols', '{"summit_lat": null, "summit_lon": null, "detection_radius_m": 250, "summit_elevation_m": null}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-kom', 'Zwift KOM', 'cols', 'ZW', 'Watopia', true, NULL, 45, 'local', 12109030, 'zwift-kom', true, 'legacy_cols', '{"summit_lat": null, "summit_lon": null, "detection_radius_m": 250, "summit_elevation_m": null}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-radio-tower-kom', 'Radio Tower KOM', 'cols', 'ZW', 'Watopia', true, NULL, 155, 'C3', 14120182, 'zwift-radio-tower-kom', true, 'legacy_cols', '{"summit_lat": null, "summit_lon": null, "detection_radius_m": 250, "summit_elevation_m": null}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-itza-kom', 'Itza KOM', 'cols', 'ZW', 'Watopia', true, NULL, 75, 'local', 37039571, 'zwift-itza-kom', true, 'legacy_cols', '{"summit_lat": null, "summit_lon": null, "detection_radius_m": 250, "summit_elevation_m": 95}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-mayan-mountainside-kom', 'Mayan Mountainside KOM', 'cols', 'ZW', 'Watopia', true, NULL, 62, 'local', 37049451, 'zwift-mayan-mountainside-kom', true, 'legacy_cols', '{"summit_lat": null, "summit_lon": null, "detection_radius_m": 250, "summit_elevation_m": 62}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-jarvis-kom', 'Jarvis KOM', 'cols', 'ZW', 'Watopia', true, NULL, 32, 'local', 38138480, 'zwift-jarvis-kom', true, 'legacy_cols', '{"summit_lat": null, "summit_lon": null, "detection_radius_m": 250, "summit_elevation_m": null}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-du-mont-cenis', 'Col du Mont Cenis', 'cols', 'FR', 'Alpen', false, NULL, 1330, 'C1', 15474001, 'col-du-mont-cenis', true, 'legacy_cols', '{"summit_lat": 45.256100, "summit_lon": 6.900800, "detection_radius_m": 1500, "summit_elevation_m": 2083}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('col-de-port-de-bales', 'Col de Port de Balès', 'cols', 'FR', 'Pyreneeën', false, NULL, 1185, 'HC', 16838086, 'col-de-port-de-bales', true, 'legacy_cols', '{"summit_lat": 42.871200, "summit_lon": 0.500500, "detection_radius_m": 1500, "summit_elevation_m": 1755}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('poggio-di-sanremo', 'Poggio di San Remo', 'cols', 'IT', 'Ligurië', false, NULL, 120, 'C3', 626919, 'poggio-di-sanremo', true, 'legacy_cols', '{"summit_lat": 43.823600, "summit_lon": 7.790300, "detection_radius_m": 700, "summit_elevation_m": 162}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('mur-de-huy', 'Mur de Huy', 'cols', 'BE', 'Ardennen', false, NULL, 128, 'C3', 617076, 'mur-de-huy', true, 'legacy_cols', '{"summit_lat": 50.515500, "summit_lon": 5.246700, "detection_radius_m": 800, "summit_elevation_m": 178}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('cote-de-la-redoute', 'Côte de la Redoute', 'cols', 'BE', 'Ardennen', false, NULL, 165, 'C3', 1269095, 'cote-de-la-redoute', true, 'legacy_cols', '{"summit_lat": 50.490600, "summit_lon": 5.705300, "detection_radius_m": 800, "summit_elevation_m": 290}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('cote-de-stockeu', 'Côte de Stockeu', 'cols', 'BE', 'Ardennen', false, NULL, 120, 'C3', 893327, 'cote-de-stockeu', true, 'legacy_cols', '{"summit_lat": 50.401000, "summit_lon": 5.924000, "detection_radius_m": 800, "summit_elevation_m": 410}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('cauberg', 'Cauberg', 'cols', 'NL', 'Limburg', false, NULL, 65, 'local', 642136, 'cauberg', true, 'legacy_cols', '{"summit_lat": 50.857400, "summit_lon": 5.822100, "detection_radius_m": 800, "summit_elevation_m": 130}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('camerig', 'Camerig', 'cols', 'NL', 'Limburg', false, NULL, 110, 'local', 866472, 'camerig', true, 'legacy_cols', '{"summit_lat": 50.769100, "summit_lon": 5.931300, "detection_radius_m": 800, "summit_elevation_m": 268}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('vaalserberg', 'Vaalserberg', 'cols', 'NL', 'Limburg', false, NULL, 105, 'local', 23355245, 'vaalserberg', true, 'legacy_cols', '{"summit_lat": 50.754900, "summit_lon": 6.019900, "detection_radius_m": 800, "summit_elevation_m": 322}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('keutenberg', 'Keutenberg', 'cols', 'NL', 'Limburg', false, NULL, 90, 'local', 628031, 'keutenberg', true, 'legacy_cols', '{"summit_lat": 50.845500, "summit_lon": 5.873800, "detection_radius_m": 800, "summit_elevation_m": 110}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('eyserbosweg', 'Eyserbosweg', 'cols', 'NL', 'Limburg', false, NULL, 65, 'local', 1074096, 'eyserbosweg', true, 'legacy_cols', '{"summit_lat": 50.827000, "summit_lon": 5.931300, "detection_radius_m": 800, "summit_elevation_m": 198}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-fuego-flats', 'Fuego Flats', 'zwift_flat', 'ZW', 'Watopia', true, 496, 0, 'sprint', 20350107, NULL, true, 'zwift-data', '{"world": "watopia"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-watopia-sprint', 'Watopia Sprint', 'zwift_flat', 'ZW', 'Watopia', true, 360, 0, 'sprint', 12109305, NULL, true, 'zwift-data', '{"world": "watopia"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-volcano-circuit', 'Volcano Circuit', 'zwift_flat', 'ZW', 'Watopia', true, 4200, 0, 'segment', 14032406, NULL, true, 'zwift-data', '{"world": "watopia"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-crit-city', 'Crit City', 'zwift_flat', 'ZW', 'Crit City', true, 1950, 0, 'segment', 22445564, NULL, true, 'zwift-data', '{"world": "crit-city"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-richmond-sprint', 'Richmond Sprint', 'zwift_flat', 'ZW', 'Richmond', true, 221, 0, 'sprint', 12128762, NULL, true, 'zwift-data', '{"world": "richmond"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-broad-st', 'Broad St.', 'zwift_flat', 'ZW', 'Richmond', true, 283, 0, 'sprint', 12128880, NULL, true, 'zwift-data', '{"world": "richmond"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-london-sprint', 'London Sprint', 'zwift_flat', 'ZW', 'London', true, 200, 0, 'sprint', 12749402, NULL, true, 'zwift-data', '{"world": "london"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-champs-elysees', 'Champs Elysees', 'zwift_flat', 'ZW', 'Paris', true, 6620, 0, 'segment', 24674235, NULL, true, 'zwift-data', '{"world": "paris"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-railway-sprint', 'Railway Sprint', 'zwift_flat', 'ZW', 'Makuri Islands', true, 490, 0, 'sprint', 30412927, NULL, true, 'zwift-data', '{"world": "makuri-islands"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('zwift-alley-sprint', 'Alley Sprint', 'zwift_flat', 'ZW', 'Makuri Islands', true, 480, 0, 'sprint', 30412916, NULL, true, 'zwift-data', '{"world": "makuri-islands"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.15+01'),
	('benelux-burgemeester-bloemersweg', 'Burgemeester Bloemersweg', 'benelux_popular', 'NL', 'Gelderland', false, 2768, 43, 'segment', 1972717, NULL, true, 'strava-verified', '{"start_lat": 52.056828, "start_lon": 6.027380, "average_grade": 0.3}', '2026-11-09 15:09:15.165+01', '2026-11-09 15:09:15.165+01'),
	('benelux-groenendaalseweg-loenen', 'Groenendaalseweg naar Loenen compleet', 'benelux_popular', 'NL', 'Gelderland', false, 4361, 17, 'segment', 7997126, NULL, true, 'strava-verified', '{"start_lat": 52.102869, "start_lon": 5.956621, "average_grade": -1.1}', '2026-11-09 15:09:15.165+01', '2026-11-09 15:09:15.165+01'),
	('benelux-koningsweg-a50-delenseweg', 'TC8Bar Koningsweg (A50-Delenseweg)', 'benelux_popular', 'NL', 'Gelderland', false, 1662, 10, 'segment', 18738318, NULL, true, 'strava-verified', '{"start_lat": 52.038366, "start_lon": 5.930962, "average_grade": 0.1}', '2026-11-09 15:09:15.165+01', '2026-11-09 15:09:15.165+01'),
	('benelux-dwars-door-loenen', 'Dwars door Loenen', 'benelux_popular', 'NL', 'Gelderland', false, 1320, 0, 'segment', 4853335, NULL, true, 'strava-verified', '{"start_lat": 52.115891, "start_lon": 6.017692, "average_grade": -0.6}', '2026-11-09 15:09:15.165+01', '2026-11-09 15:09:15.165+01'),
	('benelux-langs-de-heide', 'langs de heide', 'benelux_popular', 'NL', 'Gelderland', false, 2061, 14, 'segment', 21493839, NULL, true, 'strava-verified', '{"start_lat": 52.059893, "start_lon": 6.022225, "average_grade": 0.0}', '2026-11-09 15:09:15.165+01', '2026-11-09 15:09:15.165+01'),
	('benelux-ijsselbrug-doesburg', 'HF Brug Doesburg ri. Doesburg', 'benelux_popular', 'NL', 'Gelderland', false, 650, 5, 'segment', 2132192, NULL, true, 'strava-verified', '{"start_lat": 52.022286, "start_lon": 6.122265, "average_grade": 0.3}', '2026-11-09 15:09:15.165+01', '2026-11-09 15:09:15.165+01'),
	('benelux-deelenseweg-woeste-hoeve', 'Deelenseweg - Woeste Hoeve (via krimweg)', 'benelux_popular', 'NL', 'Gelderland', false, 15618, 68, 'segment', 31734550, NULL, true, 'strava-verified', '{"start_lat": 52.037704, "start_lon": 5.906582, "average_grade": 0.1}', '2026-11-09 15:09:15.165+01', '2026-11-09 15:09:15.165+01'),
	('benelux-hoenderloo-loenen', 'Hoenderloo > Loenen', 'benelux_popular', 'NL', 'Gelderland', false, 10423, 38, 'segment', 7006983, NULL, true, 'strava-verified', '{"start_lat": 52.118062, "start_lon": 5.880713, "average_grade": -0.2}', '2026-11-09 15:09:15.165+01', '2026-11-09 15:09:15.165+01'),
	('benelux-koningsweg-hoenderloo', 'Koningsweg - Hoenderloo', 'benelux_popular', 'NL', 'Gelderland', false, 9265, 36, 'segment', 4700472, NULL, true, 'strava-verified', '{"start_lat": 52.038141, "start_lon": 5.906214, "average_grade": 0.0}', '2026-11-09 15:09:15.165+01', '2026-11-09 15:09:15.165+01'),
	('benelux-woeste-hoefweg', 'Woeste hoefweg W-O', 'benelux_popular', 'NL', 'Gelderland', false, 5890, 45, 'segment', 4282170, NULL, true, 'strava-verified', '{"start_lat": 52.118104, "start_lon": 5.875418, "average_grade": 0.4}', '2026-11-09 15:09:15.165+01', '2026-11-09 15:09:15.165+01'),
	('europe-champs-elysees', 'Champs-Elysees', 'europe_flat', 'FR', 'Paris', false, NULL, 0, 'segment', NULL, NULL, true, 'curated-candidate', '{"bounds": [[48.85, 2.28], [48.89, 2.34]], "search": "Champs Elysees sprint cycling"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.165+01'),
	('europe-roubaix-velodrome', 'Roubaix Velodrome', 'europe_flat', 'FR', 'Roubaix', false, NULL, 0, 'segment', NULL, NULL, true, 'curated-candidate', '{"bounds": [[50.66, 3.16], [50.70, 3.20]], "search": "Roubaix Velodrome cycling"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.165+01'),
	('europe-trouee-d-arenberg', 'Trouee d Arenberg', 'europe_flat', 'FR', 'Nord', false, NULL, 0, 'cobbles', NULL, NULL, true, 'curated-candidate', '{"bounds": [[50.36, 3.39], [50.42, 3.46]], "search": "Trouee d Arenberg cycling"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.165+01'),
	('europe-carrefour-de-l-arbre', 'Carrefour de l Arbre', 'europe_flat', 'FR', 'Nord', false, NULL, 0, 'cobbles', NULL, NULL, true, 'curated-candidate', '{"bounds": [[50.57, 3.30], [50.62, 3.37]], "search": "Carrefour de l Arbre cycling"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.165+01'),
	('europe-via-roma-sprint', 'Via Roma Sprint', 'europe_flat', 'IT', 'Sanremo', false, NULL, 0, 'segment', NULL, NULL, true, 'curated-candidate', '{"bounds": [[43.80, 7.75], [43.83, 7.80]], "search": "Via Roma sprint cycling"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.165+01'),
	('europe-promenade-des-anglais', 'Promenade des Anglais', 'europe_flat', 'FR', 'Nice', false, NULL, 0, 'segment', NULL, NULL, true, 'curated-candidate', '{"bounds": [[43.68, 7.20], [43.71, 7.28]], "search": "Promenade des Anglais cycling"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.165+01'),
	('europe-playa-de-palma', 'Playa de Palma', 'europe_flat', 'ES', 'Mallorca', false, NULL, 0, 'segment', NULL, NULL, true, 'curated-candidate', '{"bounds": [[39.50, 2.70], [39.56, 2.80]], "search": "Playa de Palma cycling"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.165+01'),
	('europe-tempelhofer-feld', 'Tempelhofer Feld', 'europe_flat', 'DE', 'Berlin', false, NULL, 0, 'segment', NULL, NULL, true, 'curated-candidate', '{"bounds": [[52.46, 13.38], [52.50, 13.43]], "search": "Tempelhofer Feld cycling"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.165+01'),
	('europe-amager-strandpark', 'Amager Strandpark', 'europe_flat', 'DK', 'Copenhagen', false, NULL, 0, 'segment', NULL, NULL, true, 'curated-candidate', '{"bounds": [[55.64, 12.62], [55.68, 12.67]], "search": "Amager Strandpark cycling"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.165+01'),
	('europe-the-mall-sprint', 'The Mall Sprint', 'europe_flat', 'GB', 'London', false, NULL, 0, 'segment', NULL, NULL, true, 'curated-candidate', '{"bounds": [[51.50, -0.15], [51.52, -0.12]], "search": "The Mall sprint cycling London"}', '2026-11-09 15:09:15.15+01', '2026-11-09 15:09:15.165+01');


--
-- Data for Name: profile_completed_segments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profile_ftp_history; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profile_sport_settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profile_stats_tiles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profile_wellness; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profile_zwift_blocks; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: race_briefings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: rate_limits; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: rider_power_profiles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: src_month_entries; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: src_races; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: src_results; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: src_sync_state; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: src_team_results; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: strava_activity_dismissals; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: strava_activity_summaries; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: strava_api_usage; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: strava_connections; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: strava_webhook_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: strava_webhook_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: symptom_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: team_event_availability; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: team_event_lineups; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: team_member_seed_overrides; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: team_racepasses; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: team_result_sources; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: team_results; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: telegram_links; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_adaptation_runs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_availability; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_coach_assignments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_engine_comparisons; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_ftp_tests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_goal_forecasts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_preferences; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_replan_requests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_season_periods; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_season_targets; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_workout_reports; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: training_workout_templates; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.training_workout_templates VALUES
	('904d4b8d-2df6-4f40-9ea6-9d8a9e88cbf0', 'anaeroob', 'Anaeroob 8x1', 'Korte pijnblokken boven VO2max.', 54, 'anaerobic', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Anaeroob 1/8", "notes": "All-out maar gecontroleerd.", "target": "140-160%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 1/8", "notes": "Echt lossen tussen de blokken.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Anaeroob 2/8", "notes": "All-out maar gecontroleerd.", "target": "140-160%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 2/8", "notes": "Echt lossen tussen de blokken.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Anaeroob 3/8", "notes": "All-out maar gecontroleerd.", "target": "140-160%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 3/8", "notes": "Echt lossen tussen de blokken.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Anaeroob 4/8", "notes": "All-out maar gecontroleerd.", "target": "140-160%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 4/8", "notes": "Echt lossen tussen de blokken.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Anaeroob 5/8", "notes": "All-out maar gecontroleerd.", "target": "140-160%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 5/8", "notes": "Echt lossen tussen de blokken.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Anaeroob 6/8", "notes": "All-out maar gecontroleerd.", "target": "140-160%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 6/8", "notes": "Echt lossen tussen de blokken.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Anaeroob 7/8", "notes": "All-out maar gecontroleerd.", "target": "140-160%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 7/8", "notes": "Echt lossen tussen de blokken.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Anaeroob 8/8", "notes": "All-out maar gecontroleerd.", "target": "140-160%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('1b655234-e9a6-407f-93c4-6ead7b4766af', 'anaeroob', 'Anaeroob 12x1', 'Volume aan korte, harde inspanningen.', 59, 'anaerobic', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Anaeroob 1/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 1/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 2/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 2/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 3/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 3/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 4/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 4/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 5/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 5/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 6/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 6/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 7/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 7/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 8/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 8/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 9/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 9/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 10/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 10/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 11/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 11/12", "notes": "Kort maar volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob 12/12", "notes": "Houd de laatste even hard als de eerste.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('330517d6-5ec7-4466-ac62-69cb68b074e2', 'anaeroob', 'Anaeroob 3x(5x1)', 'Drie series van vijf; typisch racewerk.', 80, 'anaerobic', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Anaeroob serie 1 1/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 1/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 1 2/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 2/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 1 3/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 3/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 1 4/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 4/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 1 5/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Serieherstel 1", "notes": "Volledig uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 6}, {"label": "Anaeroob serie 2 1/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 1/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 2 2/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 2/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 2 3/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 3/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 2 4/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 4/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 2 5/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Serieherstel 2", "notes": "Volledig uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 6}, {"label": "Anaeroob serie 3 1/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 1/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 3 2/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 2/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 3 3/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 3/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 3 4/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 4/5", "notes": "Kort lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Anaeroob serie 3 5/5", "notes": "Hard weg, blijf staan op het pedaal.", "target": "135-155%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Serieherstel 3", "notes": "Volledig uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 6}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 8}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('08c034fc-2818-46c1-ac26-80290d164ad7', 'drempel', 'Drempel 4x8', 'Korte drempelblokken; goed instapniveau.', 72, 'threshold', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Drempel 1/4", "notes": "Rond je FTP; controle houden.", "target": "95-102%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Herstel 1/4", "notes": "Volledig lossen.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Drempel 2/4", "notes": "Rond je FTP; controle houden.", "target": "95-102%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Herstel 2/4", "notes": "Volledig lossen.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Drempel 3/4", "notes": "Rond je FTP; controle houden.", "target": "95-102%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Herstel 3/4", "notes": "Volledig lossen.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Drempel 4/4", "notes": "Rond je FTP; controle houden.", "target": "95-102%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('b1a3be7f-f33f-4a55-be9f-e5b4088a261d', 'drempel', 'Drempel 3x12', 'Klassieke drempeltraining.', 73, 'threshold', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Drempel 1/3", "notes": "Gelijkmatig; niet te hard starten.", "target": "95-102%", "intensity": "threshold", "durationMinutes": 12}, {"label": "Herstel 1/3", "notes": "Volledig lossen.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 6}, {"label": "Drempel 2/3", "notes": "Gelijkmatig; niet te hard starten.", "target": "95-102%", "intensity": "threshold", "durationMinutes": 12}, {"label": "Herstel 2/3", "notes": "Volledig lossen.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 6}, {"label": "Drempel 3/3", "notes": "Gelijkmatig; niet te hard starten.", "target": "95-102%", "intensity": "threshold", "durationMinutes": 12}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('cada69c7-d3f6-4036-920b-90eb8b11c3ee', 'drempel', 'Drempel 2x20', 'De standaard voor FTP-opbouw.', 75, 'threshold', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Drempel 1/2", "notes": "Vind je ritme in de eerste 5 minuten.", "target": "95-100%", "intensity": "threshold", "durationMinutes": 20}, {"label": "Herstel 1/2", "notes": "Volledig lossen.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 10}, {"label": "Drempel 2/2", "notes": "Vind je ritme in de eerste 5 minuten.", "target": "95-100%", "intensity": "threshold", "durationMinutes": 20}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('eebb29d1-3501-4127-9544-2ef7556e8af5', 'drempel', 'Drempel 3x20', 'Zware drempelsessie; alleen op een frisse dag.', 103, 'threshold', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Drempel 1/3", "notes": "Bewaak je houding en ademhaling.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 20}, {"label": "Herstel 1/3", "notes": "Volledig lossen.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 8}, {"label": "Drempel 2/3", "notes": "Bewaak je houding en ademhaling.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 20}, {"label": "Herstel 2/3", "notes": "Volledig lossen.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 8}, {"label": "Drempel 3/3", "notes": "Bewaak je houding en ademhaling.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 20}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 12}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('7a51e5fa-3b1f-431b-ad33-1c04d12a5059', 'duur', 'Duur 60', 'Basisduur op stabiel tempo.', 60, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 10}, {"label": "Duur", "notes": "Gelijkmatig, cadans 85-95.", "target": "60-72%", "intensity": "endurance", "durationMinutes": 42}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 8}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('73d58963-e4dd-4658-8619-3c627f44d8bb', 'duur', 'Duur 90', 'Aerobe basis, de standaardrit.', 90, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 12}, {"label": "Duur", "notes": "Gelijkmatig, cadans 85-95.", "target": "62-74%", "intensity": "endurance", "durationMinutes": 68}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('d47c0ae9-32ec-444a-890d-2d7eba03a0d5', 'duur', 'Duur 120', 'Lange duurrit voor het aerobe fundament.', 120, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Eet en drink op tijd.", "target": "60-73%", "intensity": "endurance", "durationMinutes": 95}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('0ada08b0-eb33-496a-b1e7-bb0aadeb111e', 'duur', 'Duur 180', 'Lange rit; bouw hier je uithoudingsvermogen mee op.', 180, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Rustig blijven, ook op de klimmetjes.", "target": "58-72%", "intensity": "endurance", "durationMinutes": 150}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('6974687d-8c59-4652-8065-f3e1ea034d4b', 'herstel', 'Herstelrit 30', 'Kort losdraaien; blijf onder je duurtempo.', 30, 'recovery', 'power', '[{"label": "Losdraaien", "notes": "Hoge cadans, lichte weerstand.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 30}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('6b6fa5a9-1b22-4a9e-a6ba-977948077193', 'herstel', 'Losdraaien met cadans 45', 'Herstel met korte cadansblokken voor de souplesse.', 42, 'recovery', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 10}, {"label": "Cadans 100-110 1/5", "notes": "Lichte weerstand, rustige romp.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Herstel 1/5", "notes": "Vrije cadans.", "target": "45-52%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Cadans 100-110 2/5", "notes": "Lichte weerstand, rustige romp.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Herstel 2/5", "notes": "Vrije cadans.", "target": "45-52%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Cadans 100-110 3/5", "notes": "Lichte weerstand, rustige romp.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Herstel 3/5", "notes": "Vrije cadans.", "target": "45-52%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Cadans 100-110 4/5", "notes": "Lichte weerstand, rustige romp.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Herstel 4/5", "notes": "Vrije cadans.", "target": "45-52%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Cadans 100-110 5/5", "notes": "Lichte weerstand, rustige romp.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('e3fc6abd-e8d0-41b1-8154-c272851b9e0e', 'herstel', 'Herstelrit 45', 'Actief herstel na een zware dag.', 45, 'recovery', 'power', '[{"label": "Losdraaien", "notes": "Praattempo, cadans 90+.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 45}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('de1d76a3-705c-4a4d-9972-a20859497726', 'herstel', 'Herstelrit 60', 'Ruime hersteldosis zonder prikkel.', 60, 'recovery', 'power', '[{"label": "Losdraaien", "notes": "Blijf rustig ademen.", "target": "45-58%", "intensity": "recovery", "durationMinutes": 60}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('33d86497-7378-4654-9b1f-1d655f4fbd34', 'sprint', 'Sprint 6x1 met aanloop', 'Sprints vanuit tempo, zoals in een finale.', 56, 'anaerobic', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Sprint uit tempo 1/6", "notes": "Bouw 30 sec op tempo op, dan all-out.", "target": "150-175%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 1/6", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sprint uit tempo 2/6", "notes": "Bouw 30 sec op tempo op, dan all-out.", "target": "150-175%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 2/6", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sprint uit tempo 3/6", "notes": "Bouw 30 sec op tempo op, dan all-out.", "target": "150-175%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 3/6", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sprint uit tempo 4/6", "notes": "Bouw 30 sec op tempo op, dan all-out.", "target": "150-175%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 4/6", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sprint uit tempo 5/6", "notes": "Bouw 30 sec op tempo op, dan all-out.", "target": "150-175%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 5/6", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sprint uit tempo 6/6", "notes": "Bouw 30 sec op tempo op, dan all-out.", "target": "150-175%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('4e3df740-dfa9-49ef-9669-0a485bdd4437', 'sprint', 'Kracht 6x2 laag toerental', 'Lage cadans, hoog koppel; sprintkracht.', 57, 'anaerobic', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Kracht 1/6", "notes": "Cadans 50-60, zittend, rustige romp.", "target": "100-115%", "intensity": "threshold", "durationMinutes": 2}, {"label": "Herstel 1/6", "notes": "Vrije cadans.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Kracht 2/6", "notes": "Cadans 50-60, zittend, rustige romp.", "target": "100-115%", "intensity": "threshold", "durationMinutes": 2}, {"label": "Herstel 2/6", "notes": "Vrije cadans.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Kracht 3/6", "notes": "Cadans 50-60, zittend, rustige romp.", "target": "100-115%", "intensity": "threshold", "durationMinutes": 2}, {"label": "Herstel 3/6", "notes": "Vrije cadans.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Kracht 4/6", "notes": "Cadans 50-60, zittend, rustige romp.", "target": "100-115%", "intensity": "threshold", "durationMinutes": 2}, {"label": "Herstel 4/6", "notes": "Vrije cadans.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Kracht 5/6", "notes": "Cadans 50-60, zittend, rustige romp.", "target": "100-115%", "intensity": "threshold", "durationMinutes": 2}, {"label": "Herstel 5/6", "notes": "Vrije cadans.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Kracht 6/6", "notes": "Cadans 50-60, zittend, rustige romp.", "target": "100-115%", "intensity": "threshold", "durationMinutes": 2}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('c810276a-4d34-4c24-86b1-10cc745546a6', 'sprint', 'Sprint 8x1', 'Acht sprints uit rol; kracht en snelheid.', 61, 'anaerobic', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Sprint 1/8", "notes": "15 sec all-out, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 1/8", "notes": "Volledig herstellen; kwaliteit boven kwantiteit.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 2/8", "notes": "15 sec all-out, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 2/8", "notes": "Volledig herstellen; kwaliteit boven kwantiteit.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 3/8", "notes": "15 sec all-out, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 3/8", "notes": "Volledig herstellen; kwaliteit boven kwantiteit.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 4/8", "notes": "15 sec all-out, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 4/8", "notes": "Volledig herstellen; kwaliteit boven kwantiteit.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 5/8", "notes": "15 sec all-out, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 5/8", "notes": "Volledig herstellen; kwaliteit boven kwantiteit.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 6/8", "notes": "15 sec all-out, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 6/8", "notes": "Volledig herstellen; kwaliteit boven kwantiteit.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 7/8", "notes": "15 sec all-out, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 7/8", "notes": "Volledig herstellen; kwaliteit boven kwantiteit.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 8/8", "notes": "15 sec all-out, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('72802fa2-69b8-438d-b822-d69689a9f698', 'sweetspot', 'Sweet spot 2x30', 'Twee lange blokken; mentaal de zwaarste.', 95, 'tempo', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Sweet spot 1/2", "notes": "Verdeel je krachten over het hele blok.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 30}, {"label": "Herstel 1/2", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 10}, {"label": "Sweet spot 2/2", "notes": "Verdeel je krachten over het hele blok.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 30}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.926+01', NULL, NULL),
	('80fa8ce5-c5eb-4769-a41c-5bcc3e428eed', 'test', 'Test 2x8 min', 'Kortere test; minder belastend dan de 20-minuten.', 51, 'threshold', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Test 8 min 1/2", "notes": "Maximaal gelijkmatig voor 8 minuten.", "target": "105-115%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Herstel 1/2", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}, {"label": "Test 8 min 2/2", "notes": "Maximaal gelijkmatig voor 8 minuten.", "target": "105-115%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('0b8ffe9e-fa99-4ba9-b7c8-68cb955251bf', 'vo2max', 'VO2max 8x2', 'Korte, scherpe prikkels.', 55, 'vo2max', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "VO2max 1/8", "notes": "Hard maar herhaalbaar; cadans hoog.", "target": "115-125%", "intensity": "vo2max", "durationMinutes": 2}, {"label": "Herstel 1/8", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "VO2max 2/8", "notes": "Hard maar herhaalbaar; cadans hoog.", "target": "115-125%", "intensity": "vo2max", "durationMinutes": 2}, {"label": "Herstel 2/8", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "VO2max 3/8", "notes": "Hard maar herhaalbaar; cadans hoog.", "target": "115-125%", "intensity": "vo2max", "durationMinutes": 2}, {"label": "Herstel 3/8", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "VO2max 4/8", "notes": "Hard maar herhaalbaar; cadans hoog.", "target": "115-125%", "intensity": "vo2max", "durationMinutes": 2}, {"label": "Herstel 4/8", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "VO2max 5/8", "notes": "Hard maar herhaalbaar; cadans hoog.", "target": "115-125%", "intensity": "vo2max", "durationMinutes": 2}, {"label": "Herstel 5/8", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "VO2max 6/8", "notes": "Hard maar herhaalbaar; cadans hoog.", "target": "115-125%", "intensity": "vo2max", "durationMinutes": 2}, {"label": "Herstel 6/8", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "VO2max 7/8", "notes": "Hard maar herhaalbaar; cadans hoog.", "target": "115-125%", "intensity": "vo2max", "durationMinutes": 2}, {"label": "Herstel 7/8", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "VO2max 8/8", "notes": "Hard maar herhaalbaar; cadans hoog.", "target": "115-125%", "intensity": "vo2max", "durationMinutes": 2}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('d3a3e21f-7bb7-4d80-aa28-0ebcc9bf3d28', 'vo2max', 'VO2max 6x3', 'De klassieke VO2max-sessie.', 60, 'vo2max', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "VO2max 1/6", "notes": "Eerste minuut niet te hard.", "target": "112-120%", "intensity": "vo2max", "durationMinutes": 3}, {"label": "Herstel 1/6", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 2/6", "notes": "Eerste minuut niet te hard.", "target": "112-120%", "intensity": "vo2max", "durationMinutes": 3}, {"label": "Herstel 2/6", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 3/6", "notes": "Eerste minuut niet te hard.", "target": "112-120%", "intensity": "vo2max", "durationMinutes": 3}, {"label": "Herstel 3/6", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 4/6", "notes": "Eerste minuut niet te hard.", "target": "112-120%", "intensity": "vo2max", "durationMinutes": 3}, {"label": "Herstel 4/6", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 5/6", "notes": "Eerste minuut niet te hard.", "target": "112-120%", "intensity": "vo2max", "durationMinutes": 3}, {"label": "Herstel 5/6", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 6/6", "notes": "Eerste minuut niet te hard.", "target": "112-120%", "intensity": "vo2max", "durationMinutes": 3}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 12}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('48664927-e705-4746-9668-a820bd6109e9', 'vo2max', 'VO2max 4x5', 'Maximale aerobe prikkel.', 62, 'vo2max', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "VO2max 1/4", "notes": "Deel in; blijf tot het einde op vermogen.", "target": "106-115%", "intensity": "vo2max", "durationMinutes": 5}, {"label": "Herstel 1/4", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 5}, {"label": "VO2max 2/4", "notes": "Deel in; blijf tot het einde op vermogen.", "target": "106-115%", "intensity": "vo2max", "durationMinutes": 5}, {"label": "Herstel 2/4", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 5}, {"label": "VO2max 3/4", "notes": "Deel in; blijf tot het einde op vermogen.", "target": "106-115%", "intensity": "vo2max", "durationMinutes": 5}, {"label": "Herstel 3/4", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 5}, {"label": "VO2max 4/4", "notes": "Deel in; blijf tot het einde op vermogen.", "target": "106-115%", "intensity": "vo2max", "durationMinutes": 5}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 12}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('38c7c1c6-c883-4df8-a819-abef578660d8', 'test', 'FTP-test (20 min)', 'De standaardtest; je FTP is 95% van je gemiddelde over de twintig minuten.', 60, 'threshold', 'power', '[{"label": "Inrijden", "notes": "Rustig op gang komen.", "target": "55-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Versnellingen", "notes": "Drie korte versnellingen van tien seconden op hoge cadans, met een minuut rustig ertussen.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Rustig", "notes": "Losdraaien voor de test.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Test", "notes": "Zo hard als je twintig minuten kunt volhouden. Begin niet te snel.", "target": "95-105%", "intensity": "threshold", "durationMinutes": 20}, {"label": "Uitrijden", "notes": "Losdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:15.478+01', '2026-11-09 15:09:16.383+01', 'twenty_min', NULL),
	('4e3224e6-5fce-41f8-9f96-33b331f61800', 'vo2max', 'VO2max 5x4', 'Langere blokken; zwaarder op de ademhaling.', 63, 'vo2max', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "VO2max 1/5", "notes": "Gelijkmatig; laatste minuut is de winst.", "target": "108-118%", "intensity": "vo2max", "durationMinutes": 4}, {"label": "Herstel 1/5", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "VO2max 2/5", "notes": "Gelijkmatig; laatste minuut is de winst.", "target": "108-118%", "intensity": "vo2max", "durationMinutes": 4}, {"label": "Herstel 2/5", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "VO2max 3/5", "notes": "Gelijkmatig; laatste minuut is de winst.", "target": "108-118%", "intensity": "vo2max", "durationMinutes": 4}, {"label": "Herstel 3/5", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "VO2max 4/5", "notes": "Gelijkmatig; laatste minuut is de winst.", "target": "108-118%", "intensity": "vo2max", "durationMinutes": 4}, {"label": "Herstel 4/5", "notes": "Volledig lossen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "VO2max 5/5", "notes": "Gelijkmatig; laatste minuut is de winst.", "target": "108-118%", "intensity": "vo2max", "durationMinutes": 4}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 12}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.3+01', NULL, NULL),
	('0f4adc06-dcfa-4a55-b970-ad0da7e10166', 'test', 'FTP-test (ramp)', 'Oplopende test tot je niet meer kunt volgen. Je FTP is 75% van je hoogste minuutvermogen.', 40, 'threshold', 'power', '[{"label": "Inrijden", "notes": "Rustig op gang, laatste minuten een paar korte versnellingen.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 10}, {"label": "Oplopende trap", "notes": "Elke minuut ongeveer 20 watt erbij. Rijden tot je de cadans niet meer houdt.", "target": "60-130%", "intensity": "vo2max", "durationMinutes": 20}, {"label": "Uitrijden", "notes": "Losdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.478+01', '2026-11-09 15:09:15.478+01', 'ramp', NULL),
	('05141e78-a924-47a6-a088-9f1fde4354f5', 'duur', 'Duur met tempoblokken', 'Duurrit met drie tempoblokken erin.', 125, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Tempoblok 1/3", "notes": "Comfortabel zwaar, blijf ademen door de neus.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Herstel 1/3", "notes": "Terug naar duurtempo.", "target": "58-68%", "intensity": "endurance", "durationMinutes": 10}, {"label": "Tempoblok 2/3", "notes": "Comfortabel zwaar, blijf ademen door de neus.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Herstel 2/3", "notes": "Terug naar duurtempo.", "target": "58-68%", "intensity": "endurance", "durationMinutes": 10}, {"label": "Tempoblok 3/3", "notes": "Comfortabel zwaar, blijf ademen door de neus.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Duur", "notes": "Uitrijden op duurtempo.", "target": "60-72%", "intensity": "endurance", "durationMinutes": 35}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.926+01', NULL, NULL),
	('1224dc6c-2e98-4ddb-a013-9bcdd5b68f1a', 'sweetspot', 'Sweet spot 3x10', 'Eerste kennismaking met sweet spot.', 62, 'tempo', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 12}, {"label": "Sweet spot 1/3", "notes": "Net onder drempel; nog net geen zuurbrand.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 10}, {"label": "Herstel 1/3", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sweet spot 2/3", "notes": "Net onder drempel; nog net geen zuurbrand.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 10}, {"label": "Herstel 2/3", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sweet spot 3/3", "notes": "Net onder drempel; nog net geen zuurbrand.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 10}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.926+01', NULL, NULL),
	('960b61e3-b592-48cb-b2de-4d4409db84c6', 'sweetspot', 'Sweet spot 3x15', 'De werkpaard-sessie voor je FTP.', 77, 'tempo', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 12}, {"label": "Sweet spot 1/3", "notes": "Gelijkmatig vermogen aanhouden.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Herstel 1/3", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sweet spot 2/3", "notes": "Gelijkmatig vermogen aanhouden.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Herstel 2/3", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sweet spot 3/3", "notes": "Gelijkmatig vermogen aanhouden.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.926+01', NULL, NULL),
	('e74f8ebe-8fee-4609-bbf6-88524377c057', 'sweetspot', 'Sweet spot 4x15', 'Flink volume net onder de drempel.', 100, 'tempo', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Sweet spot 1/4", "notes": "Bewaak je cadans, laat ''m niet zakken.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Herstel 1/4", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sweet spot 2/4", "notes": "Bewaak je cadans, laat ''m niet zakken.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Herstel 2/4", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sweet spot 3/4", "notes": "Bewaak je cadans, laat ''m niet zakken.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Herstel 3/4", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Sweet spot 4/4", "notes": "Bewaak je cadans, laat ''m niet zakken.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.926+01', NULL, NULL),
	('b92aedc4-955d-4a86-9020-39e3b33dcb73', 'tempo', 'Tempo 2x15', 'Instap in tempo; nog goed vol te houden.', 60, 'tempo', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 12}, {"label": "Tempo 1/2", "notes": "Gelijkmatig vermogen, cadans 85-95.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Herstel 1/2", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 8}, {"label": "Tempo 2/2", "notes": "Gelijkmatig vermogen, cadans 85-95.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.926+01', NULL, NULL),
	('c098b8f9-1d50-45de-a0a3-03819c9f37d5', 'tempo', 'Tempo 3x15', 'Drie tempoblokken; de klassieke tempo-sessie.', 79, 'tempo', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 12}, {"label": "Tempo 1/3", "notes": "Blijf onder je drempel.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Herstel 1/3", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 6}, {"label": "Tempo 2/3", "notes": "Blijf onder je drempel.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Herstel 2/3", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 6}, {"label": "Tempo 3/3", "notes": "Blijf onder je drempel.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.926+01', NULL, NULL),
	('13785b10-b270-4dc2-a55c-4168dfb1b44f', 'tempo', 'Tempo 2x25', 'Twee lange tempoblokken voor de duurkracht.', 85, 'tempo', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Tempo 1/2", "notes": "Zoek een stabiel ritme.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 25}, {"label": "Herstel 1/2", "notes": "Rustig uitdraaien.", "target": "50-60%", "intensity": "recovery", "durationMinutes": 10}, {"label": "Tempo 2/2", "notes": "Zoek een stabiel ritme.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 25}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:15.3+01', '2026-11-09 15:09:15.926+01', NULL, NULL),
	('89c19741-dbda-434c-8255-f35525d9ed6c', 'warmup', 'Warming-up tijdrit', 'Voor een tijdrit: lang op tempo komen, drie lichte versnellingen.', 25, 'endurance', 'power', '[{"label": "Inrijden", "notes": "Rustig op gang komen.", "target": "50-60%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Opbouw", "notes": "Geleidelijk oplopen.", "target": "60-75%", "intensity": "endurance", "durationMinutes": 4}, {"label": "Tempo", "notes": "Soepel, hoge cadans.", "target": "80-90%", "intensity": "tempo", "durationMinutes": 3}, {"label": "Wedstrijdtempo", "notes": "Het tempo van de tijdrit.", "target": "95-100%", "intensity": "threshold", "durationMinutes": 2}, {"label": "Los", "notes": "Losdraaien.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Opener", "notes": "Net boven wedstrijdtempo.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Los", "notes": "Losdraaien.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Burst 1/3", "notes": "6 sec versnellen, niet voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Burst 2/3", "notes": "6 sec versnellen, niet voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Burst 3/3", "notes": "6 sec versnellen, niet voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Tot de start", "notes": "Rustig doortrappen tot de start.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 2}]', true, NULL, '2026-11-09 15:09:16.261+01', '2026-11-09 15:09:16.261+01', NULL, NULL),
	('46a55b93-0184-4a0b-87c1-d837bfc35a83', 'warmup', 'Warming-up ploegentijdrit', 'Voor een ploegentijdrit: kopbeurten en herstel in het wiel.', 25, 'endurance', 'power', '[{"label": "Inrijden", "notes": "Rustig op gang komen.", "target": "50-60%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Opbouw", "notes": "Geleidelijk oplopen.", "target": "60-80%", "intensity": "endurance", "durationMinutes": 4}, {"label": "Tempo", "notes": "Soepel, hoge cadans.", "target": "85-95%", "intensity": "tempo", "durationMinutes": 3}, {"label": "Los", "notes": "Losdraaien.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Kopbeurt 1/2", "notes": "Als op kop van de trein.", "target": "110-120%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "In het wiel 1/2", "notes": "Herstellen op tempo.", "target": "80-85%", "intensity": "tempo", "durationMinutes": 1}, {"label": "Kopbeurt 2/2", "notes": "Als op kop van de trein.", "target": "110-120%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "In het wiel 2/2", "notes": "Herstellen op tempo.", "target": "80-85%", "intensity": "tempo", "durationMinutes": 1}, {"label": "Los", "notes": "Losdraaien.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Burst 1/2", "notes": "6 sec versnellen, niet voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Burst 2/2", "notes": "6 sec versnellen, niet voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Tot de start", "notes": "Rustig doortrappen tot de start.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 2}]', true, NULL, '2026-11-09 15:09:16.261+01', '2026-11-09 15:09:16.261+01', NULL, NULL),
	('99709a34-a4aa-4ebe-b5e4-a6e5129ba2b9', 'warmup', 'Warming-up lange wedstrijd', 'Voor een wedstrijd van anderhalf uur of langer: kort, om energie te sparen.', 12, 'endurance', 'power', '[{"label": "Inrijden", "notes": "Rustig op gang komen.", "target": "50-60%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Opbouw", "notes": "Geleidelijk oplopen.", "target": "65-75%", "intensity": "endurance", "durationMinutes": 3}, {"label": "Drempel", "notes": "Even op wedstrijdtempo.", "target": "90-100%", "intensity": "threshold", "durationMinutes": 1}, {"label": "Los", "notes": "Losdraaien.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 1}, {"label": "Burst", "notes": "6 sec versnellen, niet voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Tot de start", "notes": "Rustig doortrappen tot de start.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 1}]', true, NULL, '2026-11-09 15:09:16.261+01', '2026-11-09 15:09:16.261+01', NULL, NULL),
	('cf67b8f0-acf8-405e-a8dd-f4f417ba7605', 'duur', 'Duur 150 tempo aan het eind', 'Duurrit met twee tempoblokken in het laatste uur.', 150, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 75}, {"label": "Tempo 1/2", "notes": "Gelijkmatig, cadans 85-95.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 20}, {"label": "Duur", "notes": "Terug naar duurtempo.", "target": "58-68%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Tempo 2/2", "notes": "Zelfde vermogen als het eerste blok.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 20}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:16.279+01', '2026-11-09 15:09:16.279+01', NULL, NULL),
	('79f15eb1-2bc1-4d55-9c24-2cc2a8fe734a', 'duur', 'Duur 180 met sprints', 'Rustige duurrit met elk uur drie sprints van 30 seconden.', 180, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 30}, {"label": "Sprint serie 1 1/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 1 2/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 1 3/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 40}, {"label": "Sprint serie 2 1/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 2 2/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 2 3/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 40}, {"label": "Sprint serie 3 1/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 3 2/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 3 3/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:16.279+01', '2026-11-09 15:09:16.279+01', NULL, NULL),
	('ae40d669-6089-44fb-8a6c-70b9da384b82', 'duur', 'Duur 180 oplopend', 'Elk uur iets harder; het laatste stuk op intensieve duur.', 180, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Rustige duur", "notes": "Bewust rustig; eet en drink op tijd.", "target": "60-65%", "intensity": "endurance", "durationMinutes": 60}, {"label": "Rustige duur", "notes": "Iets hoger, nog steeds praattempo.", "target": "66-70%", "intensity": "endurance", "durationMinutes": 50}, {"label": "Intensieve duur", "notes": "Stevig doorrijden zonder te forceren.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 40}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:16.279+01', '2026-11-09 15:09:16.279+01', NULL, NULL),
	('817a90cc-2361-4571-9323-719143749c87', 'warmup', 'Warming-up wedstrijd kort', 'Tien minuten voor een wedstrijd, als er weinig tijd is.', 10, 'endurance', 'power', '[{"label": "Inrijden", "notes": "Rustig op gang komen.", "target": "50-60%", "intensity": "endurance", "durationMinutes": 3}, {"label": "Opbouw", "notes": "Geleidelijk oplopen.", "target": "65-85%", "intensity": "endurance", "durationMinutes": 3}, {"label": "Opener", "notes": "Even op wedstrijdtempo.", "target": "100-110%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Los", "notes": "Losdraaien.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 1}, {"label": "Burst 1/2", "notes": "6 sec voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Burst 2/2", "notes": "6 sec voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}]', true, NULL, '2026-11-09 15:09:16.261+01', '2026-11-09 15:09:16.679+01', NULL, NULL),
	('957ee448-811e-480b-b348-e8936a94c2dc', 'duur', 'Duur 180 fris en moe', 'Dezelfde drempelblokken aan het begin en na ruim twee uur.', 180, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Drempel fris 1/2", "notes": "Gelijkmatig; onthoud je vermogen.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Herstel", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Drempel fris 2/2", "notes": "Gelijkmatig; onthoud je vermogen.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 110}, {"label": "Drempel moe 1/2", "notes": "Hetzelfde vermogen als aan het begin.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Herstel", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Drempel moe 2/2", "notes": "Hetzelfde vermogen als aan het begin.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:16.279+01', '2026-11-09 15:09:16.279+01', NULL, NULL),
	('f67a33c3-a145-4982-b91d-923ddd7256db', 'duur', 'Duur 210 drempel aan het eind', 'Lange rit met drie drempelblokken na tweeënhalf uur.', 210, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 150}, {"label": "Drempel 1/3", "notes": "Gelijkmatig; niet te hard starten.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Herstel 1/3", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Drempel 2/3", "notes": "Gelijkmatig; niet te hard starten.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Herstel 2/3", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Drempel 3/3", "notes": "Gelijkmatig; niet te hard starten.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 13}]', true, NULL, '2026-11-09 15:09:16.279+01', '2026-11-09 15:09:16.279+01', NULL, NULL),
	('590a997d-2030-4517-8215-64764e3996ee', 'duur', 'Duur 240', 'Vier uur rustige duur.', 240, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Gelijkmatig, cadans 85-95.", "target": "60-72%", "intensity": "endurance", "durationMinutes": 70}, {"label": "Duur", "notes": "Eet en drink op tijd.", "target": "60-72%", "intensity": "endurance", "durationMinutes": 70}, {"label": "Duur", "notes": "Rustig blijven, ook op de klimmetjes.", "target": "60-72%", "intensity": "endurance", "durationMinutes": 70}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:16.279+01', '2026-11-09 15:09:16.279+01', NULL, NULL),
	('bcf6bd28-42b1-4049-9feb-94f565df207d', 'duur', 'Duur 180 kracht', 'Duurrit met zes drempelblokken op lage cadans.', 180, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 45}, {"label": "Kracht 1/6", "notes": "Cadans 55-65, zittend, rustige romp.", "target": "90-97%", "intensity": "threshold", "durationMinutes": 5}, {"label": "Herstel 1/6", "notes": "Vrije cadans, losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Kracht 2/6", "notes": "Cadans 55-65, zittend, rustige romp.", "target": "90-97%", "intensity": "threshold", "durationMinutes": 5}, {"label": "Herstel 2/6", "notes": "Vrije cadans, losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Kracht 3/6", "notes": "Cadans 55-65, zittend, rustige romp.", "target": "90-97%", "intensity": "threshold", "durationMinutes": 5}, {"label": "Herstel 3/6", "notes": "Vrije cadans, losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Kracht 4/6", "notes": "Cadans 55-65, zittend, rustige romp.", "target": "90-97%", "intensity": "threshold", "durationMinutes": 5}, {"label": "Herstel 4/6", "notes": "Vrije cadans, losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Kracht 5/6", "notes": "Cadans 55-65, zittend, rustige romp.", "target": "90-97%", "intensity": "threshold", "durationMinutes": 5}, {"label": "Herstel 5/6", "notes": "Vrije cadans, losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 5}, {"label": "Kracht 6/6", "notes": "Cadans 55-65, zittend, rustige romp.", "target": "90-97%", "intensity": "threshold", "durationMinutes": 5}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 50}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:16.282+01', '2026-11-09 15:09:16.282+01', NULL, NULL),
	('75e7c696-7b6b-4575-b2be-2ac5a5fce8f0', 'duur', 'Duur 180 souplesse', 'Duurrit met zes blokken op hoge cadans.', 180, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 30}, {"label": "Souplesse 1/6", "notes": "Cadans 105-115, niet stuiteren op het zadel.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Duur", "notes": "Vrije cadans.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Souplesse 2/6", "notes": "Cadans 105-115, niet stuiteren op het zadel.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Duur", "notes": "Vrije cadans.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Souplesse 3/6", "notes": "Cadans 105-115, niet stuiteren op het zadel.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Duur", "notes": "Vrije cadans.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Souplesse 4/6", "notes": "Cadans 105-115, niet stuiteren op het zadel.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Duur", "notes": "Vrije cadans.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Souplesse 5/6", "notes": "Cadans 105-115, niet stuiteren op het zadel.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Duur", "notes": "Vrije cadans.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Souplesse 6/6", "notes": "Cadans 105-115, niet stuiteren op het zadel.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 65}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:16.282+01', '2026-11-09 15:09:16.282+01', NULL, NULL),
	('7f21a587-706c-4b85-88bf-139d5f792133', 'duur', 'Duur 180 golvend', 'Duurrit met elke tien minuten een versnelling van een minuut.', 180, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 1/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 2/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 3/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 4/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 5/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 6/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 7/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 8/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 9/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 10/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 11/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 9}, {"label": "Versnelling 12/12", "notes": "Aanzetten en een minuut vasthouden.", "target": "105-115%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 30}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:16.282+01', '2026-11-09 15:09:16.282+01', NULL, NULL),
	('f5d6e624-ddb5-433f-bd12-8802a40f61d5', 'duur', 'Duur 195 cadanswissel', 'Duurrit met vier keer vijf minuten lage en vijf minuten hoge cadans.', 195, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 40}, {"label": "Lage cadans 1/4", "notes": "Cadans 55-65, zittend, rustige romp.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 5}, {"label": "Hoge cadans 1/4", "notes": "Cadans 105-115, niet stuiteren op het zadel.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Duur", "notes": "Vrije cadans.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Lage cadans 2/4", "notes": "Cadans 55-65, zittend, rustige romp.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 5}, {"label": "Hoge cadans 2/4", "notes": "Cadans 105-115, niet stuiteren op het zadel.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Duur", "notes": "Vrije cadans.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Lage cadans 3/4", "notes": "Cadans 55-65, zittend, rustige romp.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 5}, {"label": "Hoge cadans 3/4", "notes": "Cadans 105-115, niet stuiteren op het zadel.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Duur", "notes": "Vrije cadans.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Lage cadans 4/4", "notes": "Cadans 55-65, zittend, rustige romp.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 5}, {"label": "Hoge cadans 4/4", "notes": "Cadans 105-115, niet stuiteren op het zadel.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 70}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:16.282+01', '2026-11-09 15:09:16.282+01', NULL, NULL),
	('daeb5d8a-bb3b-4355-a8be-6b93f9480f1c', 'duur', 'Duur 210 alles kan', 'Lange rit die elke zone aanraakt, van sprint tot intensieve duur.', 210, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 25}, {"label": "Sprint 1/2", "notes": "10 sec voluit. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 10, "durationMinutes": 3}, {"label": "Sprint 2/2", "notes": "10 sec voluit. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 10, "durationMinutes": 3}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Anaeroob 1/2", "notes": "Hard, maar herhaalbaar.", "target": "125-140%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Anaeroob 2/2", "notes": "Hard, maar herhaalbaar.", "target": "125-140%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 15}, {"label": "VO2max 1/2", "notes": "Eerste minuut niet te hard.", "target": "108-115%", "intensity": "vo2max", "durationMinutes": 3}, {"label": "Herstel", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 2/2", "notes": "Eerste minuut niet te hard.", "target": "108-115%", "intensity": "vo2max", "durationMinutes": 3}, {"label": "Herstel", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Drempel", "notes": "Gelijkmatig; niet te hard starten.", "target": "93-100%", "intensity": "threshold", "durationMinutes": 8}, {"label": "Herstel", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Duur", "notes": "Rustig blijven; eet en drink op tijd.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Sweet spot", "notes": "Net onder de drempel.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 12}, {"label": "Duur", "notes": "Terug naar duurtempo.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 10}, {"label": "Tempo", "notes": "Gelijkmatig, cadans 85-95.", "target": "81-86%", "intensity": "tempo", "durationMinutes": 15}, {"label": "Intensieve duur", "notes": "Stevig doorrijden zonder te forceren.", "target": "71-80%", "intensity": "endurance", "durationMinutes": 20}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 15}]', true, NULL, '2026-11-09 15:09:16.282+01', '2026-11-09 15:09:16.282+01', NULL, NULL),
	('32e3846a-7c74-4dda-adfe-6ad8c9a9baa6', 'sweetspot', 'Sweet spot 5x10 blokweek', 'Blokweek drempel: vijf blokken van tien minuten.', 87, 'tempo', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Sweet spot 1/5", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 10}, {"label": "Herstel 1/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 2/5", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 10}, {"label": "Herstel 2/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 3/5", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 10}, {"label": "Herstel 3/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 4/5", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 10}, {"label": "Herstel 4/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 5/5", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 10}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:16.388+01', '2026-11-09 15:09:16.388+01', NULL, 'veelbelovend'),
	('62601e40-3496-44c0-a113-6381a7210889', 'sweetspot', 'Sweet spot 6x12 blokweek', 'Blokweek drempel: zes blokken van twaalf minuten.', 112, 'tempo', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Sweet spot 1/6", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 12}, {"label": "Herstel 1/6", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 2/6", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 12}, {"label": "Herstel 2/6", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 3/6", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 12}, {"label": "Herstel 3/6", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 4/6", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 12}, {"label": "Herstel 4/6", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 5/6", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 12}, {"label": "Herstel 5/6", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 6/6", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 12}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:16.388+01', '2026-11-09 15:09:16.388+01', NULL, 'veelbelovend'),
	('61715a93-f5d5-4948-aa88-550eb87e71b5', 'sweetspot', 'Sweet spot 7x14 blokweek', 'Blokweek drempel: zeven blokken van veertien minuten.', 141, 'tempo', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Sweet spot 1/7", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 14}, {"label": "Herstel 1/7", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 2/7", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 14}, {"label": "Herstel 2/7", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 3/7", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 14}, {"label": "Herstel 3/7", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 4/7", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 14}, {"label": "Herstel 4/7", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 5/7", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 14}, {"label": "Herstel 5/7", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 6/7", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 14}, {"label": "Herstel 6/7", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Sweet spot 7/7", "notes": "RPE 6, gelijkmatig. Zo hard dat je het zes dagen achter elkaar kunt.", "target": "87-89%", "intensity": "tempo", "durationMinutes": 14}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:16.388+01', '2026-11-09 15:09:16.388+01', NULL, 'veelbelovend'),
	('261c8433-9052-440e-9e55-c37bba5fd437', 'vo2max', 'VO2max 30/15 blokweek', 'Blokweek 30/15: vijf series van twaalf keer 30 seconden hard.', 82, 'vo2max', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "30/15 serie 1/5", "notes": "12 x 30 s hard en 15 s rustig. Rijd alle series even hard.", "onOff": {"offTarget": "50%", "onSeconds": 30, "offSeconds": 15}, "target": "110-120%", "intensity": "vo2max", "durationMinutes": 9}, {"label": "Herstel 1/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "30/15 serie 2/5", "notes": "12 x 30 s hard en 15 s rustig. Rijd alle series even hard.", "onOff": {"offTarget": "50%", "onSeconds": 30, "offSeconds": 15}, "target": "110-120%", "intensity": "vo2max", "durationMinutes": 9}, {"label": "Herstel 2/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "30/15 serie 3/5", "notes": "12 x 30 s hard en 15 s rustig. Rijd alle series even hard.", "onOff": {"offTarget": "50%", "onSeconds": 30, "offSeconds": 15}, "target": "110-120%", "intensity": "vo2max", "durationMinutes": 9}, {"label": "Herstel 3/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "30/15 serie 4/5", "notes": "12 x 30 s hard en 15 s rustig. Rijd alle series even hard.", "onOff": {"offTarget": "50%", "onSeconds": 30, "offSeconds": 15}, "target": "110-120%", "intensity": "vo2max", "durationMinutes": 9}, {"label": "Herstel 4/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "30/15 serie 5/5", "notes": "12 x 30 s hard en 15 s rustig. Rijd alle series even hard.", "onOff": {"offTarget": "50%", "onSeconds": 30, "offSeconds": 15}, "target": "110-120%", "intensity": "vo2max", "durationMinutes": 9}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:16.388+01', '2026-11-09 15:09:16.388+01', NULL, 'veelbelovend'),
	('68b51f4e-fe95-46a4-b080-1d24f54ff683', 'vo2max', 'VO2max 5x5 snelle start', 'Elk blok begint een minuut boven het doel.', 62, 'vo2max', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Snelle start 1/5", "notes": "Vlot aanzetten.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 1/5", "notes": "Iets terug en gelijkmatig volhouden.", "target": "104-108%", "intensity": "vo2max", "durationMinutes": 4}, {"label": "Herstel 1/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Snelle start 2/5", "notes": "Vlot aanzetten.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 2/5", "notes": "Iets terug en gelijkmatig volhouden.", "target": "104-108%", "intensity": "vo2max", "durationMinutes": 4}, {"label": "Herstel 2/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Snelle start 3/5", "notes": "Vlot aanzetten.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 3/5", "notes": "Iets terug en gelijkmatig volhouden.", "target": "104-108%", "intensity": "vo2max", "durationMinutes": 4}, {"label": "Herstel 3/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Snelle start 4/5", "notes": "Vlot aanzetten.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 4/5", "notes": "Iets terug en gelijkmatig volhouden.", "target": "104-108%", "intensity": "vo2max", "durationMinutes": 4}, {"label": "Herstel 4/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "Snelle start 5/5", "notes": "Vlot aanzetten.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 5/5", "notes": "Iets terug en gelijkmatig volhouden.", "target": "104-108%", "intensity": "vo2max", "durationMinutes": 4}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:16.388+01', '2026-11-09 15:09:16.388+01', NULL, 'experimenteel'),
	('760d7453-a3c7-4c7e-9597-7ffe359e8e78', 'vo2max', 'VO2max 4x4 aflopend', 'Elk blok begint hoog en zakt per minuut iets terug.', 50, 'vo2max', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "VO2max 1/4 min 1", "notes": "Hardste minuut.", "target": "114-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 1/4 min 2", "notes": "Een tikje terug.", "target": "110-114%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 1/4 min 3", "notes": "Weer een tikje terug.", "target": "106-110%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 1/4 min 4", "notes": "Laatste minuut, iets lichter.", "target": "102-106%", "intensity": "threshold", "durationMinutes": 1}, {"label": "Herstel 1/4", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 2/4 min 1", "notes": "Hardste minuut.", "target": "114-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 2/4 min 2", "notes": "Een tikje terug.", "target": "110-114%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 2/4 min 3", "notes": "Weer een tikje terug.", "target": "106-110%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 2/4 min 4", "notes": "Laatste minuut, iets lichter.", "target": "102-106%", "intensity": "threshold", "durationMinutes": 1}, {"label": "Herstel 2/4", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 3/4 min 1", "notes": "Hardste minuut.", "target": "114-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 3/4 min 2", "notes": "Een tikje terug.", "target": "110-114%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 3/4 min 3", "notes": "Weer een tikje terug.", "target": "106-110%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 3/4 min 4", "notes": "Laatste minuut, iets lichter.", "target": "102-106%", "intensity": "threshold", "durationMinutes": 1}, {"label": "Herstel 3/4", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 4/4 min 1", "notes": "Hardste minuut.", "target": "114-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 4/4 min 2", "notes": "Een tikje terug.", "target": "110-114%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 4/4 min 3", "notes": "Weer een tikje terug.", "target": "106-110%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 4/4 min 4", "notes": "Laatste minuut, iets lichter.", "target": "102-106%", "intensity": "threshold", "durationMinutes": 1}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:16.388+01', '2026-11-09 15:09:16.388+01', NULL, 'experimenteel'),
	('cf94c5cd-3dbe-4fd9-a9cc-e02d8ef294c9', 'vo2max', 'VO2max 5x5 wisselend', 'Elk blok wisselt per minuut tussen hoog en iets lager.', 62, 'vo2max', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "VO2max 1/5 min 1", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 1/5 min 2", "notes": "Iets lager, niet stoppen.", "target": "100-104%", "intensity": "threshold", "durationMinutes": 1}, {"label": "VO2max 1/5 min 3", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 1/5 min 4", "notes": "Iets lager, niet stoppen.", "target": "100-104%", "intensity": "threshold", "durationMinutes": 1}, {"label": "VO2max 1/5 min 5", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Herstel 1/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 2/5 min 1", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 2/5 min 2", "notes": "Iets lager, niet stoppen.", "target": "100-104%", "intensity": "threshold", "durationMinutes": 1}, {"label": "VO2max 2/5 min 3", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 2/5 min 4", "notes": "Iets lager, niet stoppen.", "target": "100-104%", "intensity": "threshold", "durationMinutes": 1}, {"label": "VO2max 2/5 min 5", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Herstel 2/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 3/5 min 1", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 3/5 min 2", "notes": "Iets lager, niet stoppen.", "target": "100-104%", "intensity": "threshold", "durationMinutes": 1}, {"label": "VO2max 3/5 min 3", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 3/5 min 4", "notes": "Iets lager, niet stoppen.", "target": "100-104%", "intensity": "threshold", "durationMinutes": 1}, {"label": "VO2max 3/5 min 5", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Herstel 3/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 4/5 min 1", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 4/5 min 2", "notes": "Iets lager, niet stoppen.", "target": "100-104%", "intensity": "threshold", "durationMinutes": 1}, {"label": "VO2max 4/5 min 3", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 4/5 min 4", "notes": "Iets lager, niet stoppen.", "target": "100-104%", "intensity": "threshold", "durationMinutes": 1}, {"label": "VO2max 4/5 min 5", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Herstel 4/5", "notes": "Losdraaien.", "target": "50-58%", "intensity": "recovery", "durationMinutes": 3}, {"label": "VO2max 5/5 min 1", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 5/5 min 2", "notes": "Iets lager, niet stoppen.", "target": "100-104%", "intensity": "threshold", "durationMinutes": 1}, {"label": "VO2max 5/5 min 3", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "VO2max 5/5 min 4", "notes": "Iets lager, niet stoppen.", "target": "100-104%", "intensity": "threshold", "durationMinutes": 1}, {"label": "VO2max 5/5 min 5", "notes": "Hoog.", "target": "115-118%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:16.388+01', '2026-11-09 15:09:16.388+01', NULL, 'experimenteel'),
	('0a725428-5b35-494f-9ea3-8e54f1ff6d10', 'sprint', 'Sprint 6x30s onderhoud', 'Zes sprints van 30 seconden voor een week met weinig tijd.', 51, 'anaerobic', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 15}, {"label": "Sprint 1/6", "notes": "30 sec voluit, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 1/6", "notes": "Volledig herstellen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 2/6", "notes": "30 sec voluit, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 2/6", "notes": "Volledig herstellen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 3/6", "notes": "30 sec voluit, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 3/6", "notes": "Volledig herstellen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 4/6", "notes": "30 sec voluit, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 4/6", "notes": "Volledig herstellen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 5/6", "notes": "30 sec voluit, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Herstel 5/6", "notes": "Volledig herstellen.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 4}, {"label": "Sprint 6/6", "notes": "30 sec voluit, daarna binnen het blok uitrollen.", "target": "150-180%", "intensity": "anaerobic", "durationMinutes": 1}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 10}]', true, NULL, '2026-11-09 15:09:16.388+01', '2026-11-09 15:09:16.388+01', NULL, 'veelbelovend'),
	('725c9f53-6381-4bd4-8834-ce2b53a5e7fe', 'duur', 'Duur 90 met 3x3 sprints', 'Rustige rit met drie series van drie sprints van 30 seconden.', 90, 'endurance', 'power', '[{"label": "Warming-up", "notes": "Rustig oplopend.", "target": "50-65%", "intensity": "endurance", "durationMinutes": 10}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 10}, {"label": "Sprint serie 1 1/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 1 2/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 1 3/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 10}, {"label": "Sprint serie 2 1/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 2 2/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 2 3/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Duur", "notes": "Rustig blijven.", "target": "60-70%", "intensity": "endurance", "durationMinutes": 10}, {"label": "Sprint serie 3 1/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 3 2/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Sprint serie 3 3/3", "notes": "30 sec voluit, zittend. Daarna losdraaien.", "target": "50-58%", "intensity": "recovery", "burstSeconds": 30, "durationMinutes": 5}, {"label": "Cooling-down", "notes": "Uitdraaien.", "target": "45-55%", "intensity": "recovery", "durationMinutes": 5}]', true, NULL, '2026-11-09 15:09:16.388+01', '2026-11-09 15:09:16.388+01', NULL, 'veelbelovend'),
	('b6f6c954-747e-40e9-900e-aa29469ab1e3', 'warmup', 'Warming-up wedstrijd', 'Voor een scratch- of puntenrace: harde start en sprints.', 21, 'endurance', 'power', '[{"label": "Inrijden", "notes": "Rustig op gang komen.", "target": "50-60%", "intensity": "endurance", "durationMinutes": 5}, {"label": "Opbouw", "notes": "Geleidelijk oplopen.", "target": "65-80%", "intensity": "endurance", "durationMinutes": 4}, {"label": "Drempel", "notes": "Soepel, hoge cadans.", "target": "90-100%", "intensity": "threshold", "durationMinutes": 2}, {"label": "Los", "notes": "Losdraaien.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Opener", "notes": "Het tempo van de start.", "target": "110-120%", "intensity": "vo2max", "durationMinutes": 1}, {"label": "Los", "notes": "Losdraaien.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 2}, {"label": "Burst 1/4", "notes": "6 sec voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Burst 2/4", "notes": "6 sec voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Burst 3/4", "notes": "6 sec voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Burst 4/4", "notes": "6 sec voluit. Daarna losdraaien.", "target": "50-55%", "intensity": "recovery", "burstSeconds": 6, "durationMinutes": 1}, {"label": "Tot de start", "notes": "Rustig doortrappen tot de start.", "target": "50-55%", "intensity": "recovery", "durationMinutes": 1}]', true, NULL, '2026-11-09 15:09:16.261+01', '2026-11-09 15:09:16.679+01', NULL, NULL);


--
-- Data for Name: ttt_plans; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ttt_plan_riders; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: weekly_reviews; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: whatsapp_groups; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: wtrl_teams; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: wtrl_team_riders; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zrl_race_snapshots; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zrl_rider_results; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zrl_team_assignments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zrl_team_results; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwb_ds_budget; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.zwb_ds_budget VALUES
	(1, 10, '2026-11-09 15:09:16.397+01');


--
-- Data for Name: zwb_ds_rider_states; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwb_segment_maps; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwbeker_congrats; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwbeker_winners; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwbgame_preferences; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwbgame_riders; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwbgame_roster_exclusions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwbriljant_preferences; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwbriljant_snapshots; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwift_bike_parts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwift_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwift_legacy_velo; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwift_race_score_sync; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwift_race_scores; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwift_rider_metrics; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: zwift_segment_bests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: ai_usage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_usage_id_seq', 1, false);


--
-- Name: live_positions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.live_positions_id_seq', 1, false);


--
-- Name: strava_webhook_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.strava_webhook_events_id_seq', 1, false);


--
-- Name: zwift_bike_parts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zwift_bike_parts_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

-- Het invullen van de rechten schreef regels in het auditlog; die horen niet bij de start.
delete from public.audit_log;
