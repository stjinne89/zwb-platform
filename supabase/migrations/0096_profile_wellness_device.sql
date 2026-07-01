-- Welk wellness-apparaat het lid gebruikt, zodat de readiness-schaal uit
-- intervals.icu juist geïnterpreteerd wordt. Het readiness-veld is één veld
-- waar elke bron z'n eigen schaal in duwt: Garmin/Oura/Whoop = 0-100, terwijl
-- Polar (Nightly Recharge) een kleine integer-schaal levert. Zonder deze
-- keuze leest de app een Polar-"3" (Ok) als "3 van de 100 = overtraind".
--
-- Nullable tekst (geen DB-enum); in code gevalideerd tegen een allowlist,
-- zoals zrl_division. Leeg/onbekend = readiness als 0-100 behandelen.

alter table public.profiles
  add column if not exists wellness_device text;

-- Forceer een PostgREST schema-cache reload, zodat de kolom direct beschikbaar
-- is voor de app (anders faalt/negeert een write in het korte venster vlak na
-- het toevoegen van de kolom).
notify pgrst, 'reload schema';
