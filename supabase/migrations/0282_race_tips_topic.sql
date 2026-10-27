-- Racetips onder ZWBeter > Racen (2026-10-27).
--
-- Leden plaatsen tips over Zwift-racen en over racen buiten. Geen eigen tabel:
-- een racetip is een gewone tip van ZWBieb (member_tips, 0239) onder het
-- onderwerp zwift-racen of het nieuwe onderwerp wegracen. Daarmee werken
-- aanpassen, verwijderen, de moderatie en de tips op het profiel zonder extra
-- code, en staan de racetips ook in ZWBieb bij hun onderwerp.
--
-- zwift-racen staat er sinds 0242; hier komt alleen het buitenonderwerp bij,
-- direct achter de startlijst van vijftien.

insert into public.knowledge_topics (slug, label, kind, sort_order) values
  ('wegracen', 'Wegracen en criteriums', 'kennis', 16)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select slug, label, status from public.knowledge_topics where slug = 'wegracen';  -- één rij, active
