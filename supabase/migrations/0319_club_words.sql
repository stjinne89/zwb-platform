-- Eigen woorden van de club: fase 3 deel 3b van de generieke versie
-- (docs/multi-club-ontwerp.md, keuzes eigenaar 2026-11-09).
--
-- Een paar namen zijn woordspelingen op de clubnaam, en die heeft een andere
-- club niet. Daarom staan ze hier, naast de naam en het woord voor een lid
-- (0313). Leeg = een neutraal woord uit de code (src/lib/club-texts.ts):
--
--   app_name              de naam van de app            leeg: "<korte naam>-app"
--   advice_name           het dagadvies (vijf niveaus)  leeg: "Dagadvies"
--   currency_noun         het betaalmiddel van het      leeg: "bal"
--   currency_noun_plural    voorspelspel                leeg: "ballen"
--   cup_noun              één beker van de prijzenkast  leeg: "beker"
--   better_word           het woord voor de pijlers     leeg: "Beter"
--                         van de training ("ZWBeter racen", "ZWBeter-samenvatting")
--
-- De user agents gebruiken bewust de korte naam, niet app_name: zo blijft de
-- gemeten user agent voor cyclingflash bij ZWB gelijk.
--
-- Lezen en schrijven zoals de rest van club_settings (0313).

alter table public.club_settings
  add column if not exists app_name text,
  add column if not exists advice_name text,
  add column if not exists currency_noun text,
  add column if not exists currency_noun_plural text,
  add column if not exists cup_noun text,
  add column if not exists better_word text;

-- ZWB houdt zijn woorden. Alleen bij ZWB en alleen wat nog leeg is, zodat een
-- andere installatie met deze migratie niets van ZWB krijgt.
update public.club_settings
set
  app_name = coalesce(app_name, 'ZWBasis'),
  advice_name = coalesce(advice_name, 'ZWBeterWorden'),
  currency_noun = coalesce(currency_noun, 'ZWBal'),
  currency_noun_plural = coalesce(currency_noun_plural, 'ZWBallen'),
  cup_noun = coalesce(cup_noun, 'ZWBeker'),
  better_word = coalesce(better_word, 'ZWBeter'),
  updated_at = now()
where id and short_name = 'ZWB';

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select short_name, app_name, advice_name, currency_noun, currency_noun_plural, cup_noun, better_word
--   from public.club_settings;
