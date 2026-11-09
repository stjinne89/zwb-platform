-- Clubherkenning: fase 4 van de generieke versie (docs/multi-club-ontwerp.md,
-- keuzes eigenaar 2026-11-09).
--
-- Welke externe data "van de club" is. Leeg = de korte naam (src/lib/club-recognition.ts):
--
--   event_markers   woorden in een eventtitel of -serie die op een eigen event
--                   wijzen (de eventscan). De env ZWB_EVENT_MARKERS gaat voor.
--   team_tag        de teamtag achter een naam in Zwift ("Linda Kuiper [ZWB]"),
--                   voor ZRL-live, ZWB DS en de uitslagscraper.
--
-- Het Zwift-club-ID blijft een env-waarde: een env-waarde mag niet letterlijk
-- in de repo staan (Netlify secrets-scan).
--
-- Lezen en schrijven zoals de rest van club_settings (0313).

alter table public.club_settings
  add column if not exists event_markers text[],
  add column if not exists team_tag text;

-- ZWB houdt zijn herkenning. Alleen bij ZWB en alleen wat nog leeg is.
update public.club_settings
set
  event_markers = coalesce(event_markers, array['zwb', 'zwift belgie', 'zwift belgium']),
  team_tag = coalesce(team_tag, 'ZWB'),
  updated_at = now()
where id and short_name = 'ZWB';

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select short_name, event_markers, team_tag from public.club_settings;
