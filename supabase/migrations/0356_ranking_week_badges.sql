-- ZWB Rankings (2026-11-24): elke ranglijst krijgt een weekbadge. Tot nu toe
-- hadden alleen Zitvleeskampioen, Kilometervreter, Klimmer van de week en Meest
-- actief er een (0011, 0277). Erbij: Lange adem, Buitenbeentje, Binnenvetter,
-- Metronoom, Clubmens en Groeibriljant. Wie na afloop van de week op plek 1 staat,
-- krijgt hem; bij gelijke stand iedereen op plek 1 (lib/achievements/awards.ts).
--
-- Zonder deze rijen slaat awardCompletedAchievementWeeks de nieuwe badges over
-- (de foreign key weigert ze) en kent de andere gewoon toe. Mag dus in elke
-- volgorde met de deploy.

insert into public.achievement_badges (id, title, description, metric, icon, color, kind, trigger_source)
values
  ('longest_ride_week', 'Lange adem', 'Langste rit in tijd in een ZWB-week.', 'longest_ride', 'timer', 'bronze', 'weekly', 'auto'),
  ('outdoor_week', 'Buitenbeentje', 'Meeste kilometers buiten in een ZWB-week.', 'outdoor_distance', 'sun', 'silver', 'weekly', 'auto'),
  ('indoor_week', 'Binnenvetter', 'Meeste uren op de rollenbank in een ZWB-week.', 'indoor_time', 'home', 'steel', 'weekly', 'auto'),
  ('days_week', 'Metronoom', 'Op de meeste dagen gefietst in een ZWB-week.', 'ride_days', 'calendar-check', 'petrol', 'weekly', 'auto'),
  ('clubmens_week', 'Clubmens', 'Vaakst bij een event of samen fietsen in een ZWB-week.', 'club_presence', 'users', 'sage', 'weekly', 'auto'),
  ('growth_week', 'Groeibriljant', 'Meeste punten erbij op de ZWBriljant-steen in een ZWB-week.', 'briljant_growth', 'gem', 'platinum', 'weekly', 'auto')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  metric = excluded.metric,
  icon = excluded.icon,
  color = excluded.color,
  kind = excluded.kind,
  trigger_source = excluded.trigger_source;

-- Controle na toepassen:
-- select id, title, kind from achievement_badges where kind = 'weekly' order by id;  -- elf rijen, met kudos_received_week
