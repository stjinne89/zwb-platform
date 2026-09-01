-- Voorkeuren waarmee een lid de kalender op zichzelf kan filteren.
--
-- Twee soorten signalen, bewust gescheiden:
--
--   event_type_interests  interesse — het lid vinkt zelf eventtypes aan.
--                         Leeg (de standaard) betekent "alles interessant",
--                         zodat een lid dat hier nooit komt niets mist.
--   fit_max_*             geschiktheid — een handmatig plafond voor de omvang
--                         van een rit. Leeg betekent niet "geen plafond" maar
--                         "leid het af uit mijn ritgeschiedenis"; zie
--                         src/lib/events/fit.ts.
--
-- Geen check-constraint op de eventtypes: die lijst is al twee keer
-- uitgebreid (0067, 0086) en een constraint hier zou bij de derde keer stil
-- profielopslag breken. De server-action valideert tegen EVENT_TYPE_VALUES.

alter table public.profiles
  add column if not exists event_type_interests text[] not null
    default array[]::text[];

alter table public.profiles
  add column if not exists fit_max_distance_km int
    check (
      fit_max_distance_km is null
      or (fit_max_distance_km > 0 and fit_max_distance_km <= 1000)
    );

alter table public.profiles
  add column if not exists fit_max_elevation_m int
    check (
      fit_max_elevation_m is null
      or (fit_max_elevation_m >= 0 and fit_max_elevation_m <= 20000)
    );
