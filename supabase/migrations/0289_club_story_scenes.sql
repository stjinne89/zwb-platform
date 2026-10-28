-- Clubverhaal: een eigen verhaal in hoofdstukken (wens eigenaar, 2026-10-28).
--
-- Een lid bouwt zijn verhaal uit hooguit acht hoofdstukken. Per hoofdstuk de
-- tekst en de 3D-scène: shirt (en daarmee de periode), het poppetje (rijden,
-- juichen, sprinten, afzien, klimmen, afdalen), de groep (1–7) en het licht.
-- De vorm controleert de server (src/lib/clubverhaal/scenes.ts); hier alleen
-- dat het een lijst van hooguit acht is.
--
-- `body` blijft: de server vult hem met alle hoofdstukteksten samen, voor de
-- kaart op /verhaal, de controle op lengte en de data-export. `chapter` is het
-- shirt van het eerste hoofdstuk.
--
-- Bij het toepassen stonden er nog geen verhalen (0288 was dezelfde dag live),
-- dus geen omzetting van bestaande rijen; de lezer valt bij een lege lijst
-- terug op één hoofdstuk met `body`.

alter table public.club_stories
  add column if not exists scenes jsonb not null default '[]'::jsonb;

alter table public.club_stories
  drop constraint if exists club_stories_scenes_check;
alter table public.club_stories
  add constraint club_stories_scenes_check
  check (jsonb_typeof(scenes) = 'array' and jsonb_array_length(scenes) <= 8);

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select column_name, data_type, column_default from information_schema.columns
--  where table_name = 'club_stories' and column_name = 'scenes';   -- jsonb, '[]'::jsonb
-- select conname from pg_constraint where conname = 'club_stories_scenes_check'; -- één rij
