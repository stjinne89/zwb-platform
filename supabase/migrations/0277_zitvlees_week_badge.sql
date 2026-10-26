-- ZWB Rankings (2026-10-26): de weekbadge Zitvleeskampioen, voor de meeste uren
-- op de fiets in een ZWB-week. Hij vervangt Kudo-magneet als vierde weekbadge:
-- kudos bestaan alleen bij Strava, dus wie via intervals.icu of een import rijdt
-- kon die nooit winnen. Kudo-magneet blijft in de tabel staan, zodat eerder
-- gewonnen badges op profielen blijven; de code kent hem niet meer toe.
--
-- Zonder deze rij slaat awardCompletedAchievementWeeks de nieuwe badge over (de
-- foreign key weigert hem) en kent de andere drie gewoon toe. Mag dus in elke
-- volgorde met de deploy.

insert into public.achievement_badges (id, title, description, metric, icon, color, kind, trigger_source)
values
  ('hours_week', 'Zitvleeskampioen', 'Meeste uren op de fiets in een ZWB-week.', 'moving_time', 'clock', 'sage', 'weekly', 'auto')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  metric = excluded.metric,
  icon = excluded.icon,
  color = excluded.color,
  kind = excluded.kind,
  trigger_source = excluded.trigger_source;

-- Controle na toepassen:
-- select id, title, kind from achievement_badges where id = 'hours_week';  -- één rij, weekly
