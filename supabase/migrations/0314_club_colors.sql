-- Huisstijl van de club: fase 2 van de generieke versie (docs/multi-club-ontwerp.md).
--
-- Een club kiest vijf kleuren: primair, secundair, neutraal, accent en donkere
-- inkt. De app leidt de rest af (src/lib/club-theme.ts). Leeg = de standaard
-- huisstijl uit globals.css, en dat zijn de ZWB-kleuren. ZWB krijgt daarom
-- geen waarden: zo blijft de app voor de leden precies gelijk.
--
-- Alleen #rrggbb in kleine letters; de server zet de invoer zo om. Lezen en
-- schrijven zoals de rest van club_settings (0313): iedereen leest, alleen de
-- service role schrijft, na de controle op roles.manage_permissions.

alter table public.club_settings
  add column if not exists color_primary text,
  add column if not exists color_secondary text,
  add column if not exists color_neutral text,
  add column if not exists color_accent text,
  add column if not exists color_ink text;

alter table public.club_settings
  drop constraint if exists club_settings_colors_hex;
alter table public.club_settings
  add constraint club_settings_colors_hex check (
    (color_primary is null or color_primary ~ '^#[0-9a-f]{6}$')
    and (color_secondary is null or color_secondary ~ '^#[0-9a-f]{6}$')
    and (color_neutral is null or color_neutral ~ '^#[0-9a-f]{6}$')
    and (color_accent is null or color_accent ~ '^#[0-9a-f]{6}$')
    and (color_ink is null or color_ink ~ '^#[0-9a-f]{6}$')
  );
