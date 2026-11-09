-- Geen ZWB-logo's bij een andere club (generieke versie, na fase 7;
-- docs/multi-club-ontwerp.md, keuze eigenaar 2026-11-09).
--
-- Tot nu toe gold zonder eigen logo of beeldmerk (0315) het vaste ZWB-bestand in
-- public/: logo, favicons, app-iconen, deelkaart en meldingsicoon. ZWB heeft
-- geen logo in deze tabel en leunde zelf op die terugval. Een nieuwe installatie
-- kreeg zo het ZWB-logo.
--
--   static_brand   aan: de vaste bestanden in public/ gelden als er geen eigen
--                  logo of beeldmerk is (ZWB). Uit: dan blijft die plek leeg.
--
-- Lezen en schrijven zoals de rest van club_settings (0313). Geen scherm: alleen
-- ZWB heeft hem aan.

alter table public.club_settings
  add column if not exists static_brand boolean not null default false;

-- ZWB houdt zijn logo en iconen.
update public.club_settings
set static_brand = true, updated_at = now()
where id and short_name = 'ZWB';

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select short_name, static_brand, logo_url is not null as logo, mark_url is not null as mark
-- from public.club_settings;
