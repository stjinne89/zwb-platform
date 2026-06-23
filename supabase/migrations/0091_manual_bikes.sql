-- Handmatige fietsen: leden zonder Strava-koppeling kunnen zelf een fiets
-- toevoegen (naam, merk/model, afstand, foto) om op hun profiel te tonen.
--
-- source = 'strava' : gesynct vanuit Strava (gear), afstand loopt automatisch
--                     op en kan in de onderhoudsfunctie gebruikt worden.
-- source = 'manual' : handmatig ingevoerd, alleen voor de showcase op het
--                     profiel (geen slijtage-tracking).
--
-- De Strava-gear-sync upsert op de Strava-gear-id en raakt handmatige rijen
-- (eigen gegenereerde id 'manual-…') dus nooit aan.

alter table public.strava_bikes
  add column if not exists source text not null default 'strava'
    check (source in ('strava', 'manual'));
