-- Racebriefje aanpassen per race (2026-10-20).
--
-- De captain past op het racebriefje de momenten, Onthouden, Volgen, Let op en
-- de labels in het getekende profiel aan. Aanleiding: in New York zijn de korte
-- steile stukjes uit de subways escalators die een duw van ±1200 W geven; dat
-- verandert de tactiek, en de app weet het niet.
--
-- Alleen de blokken die van het voorstel van de app afwijken, staan hier
-- (src/lib/race-briefing/sheet.ts); een ontbrekend blok volgt het voorstel.
-- Lezen en schrijven zoals de rest van race_briefings (0260).

alter table public.race_briefings
  add column if not exists sheet jsonb not null default '{}'::jsonb
    check (pg_column_size(sheet) <= 32768);
