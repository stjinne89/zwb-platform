-- Handmatige uitslag-invoer naast de gescrapte rijen. `is_manual=true` markeert
-- rijen die een admin zelf toevoegde; de scraper vervangt voortaan alléén de
-- gescrapte rijen (is_manual=false), zodat handmatige invoer behouden blijft.

alter table public.event_results
  add column if not exists is_manual boolean not null default false;
