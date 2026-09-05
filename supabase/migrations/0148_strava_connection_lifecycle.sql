-- Levenscyclus van een Strava-koppeling: syncstatus, gezondheid en revocatie.
--
-- Aanleiding: Strava wees onze aanvraag voor een hogere atletenlimiet af met als
-- voorwaarde dat we "stale and deauthorized athletes" actief beheren. Tot nu toe
-- kon dat niet: deze tabel had geen enkele kolom om vast te leggen dat een
-- koppeling dood is. Een op strava.com ingetrokken koppeling bleef daardoor elke
-- cronrun opnieuw geprobeerd worden, en een lid dat in de app ontkoppelde bleef
-- op Strava's kant gekoppeld -- en dus een slot in onze cap bezetten.
--
-- Twee losse tijdstempels, bewust niet één statuskolom:
--   revoked_at       -- de koppeling is opgeheven (door wie dan ook); de app
--                       negeert de rij vanaf dit moment volledig.
--   deauthorized_at  -- Strava's kant is ook echt losgekoppeld.
-- Zolang revoked_at gezet is en deauthorized_at niet, moet de sweeper de
-- deauthorize-call nog doen. Daarom blijft de rij bestaan: we hebben de token
-- nog nodig om te kunnen deauthoriseren. Pas als deauthorized_at gezet is mag de
-- rij (en de ruwe Strava-data) weg.
--
-- revoked_reason bewust ZONDER check-constraint, om dezelfde reden als bij
-- migratie 0143: die waardenlijst gaat groeien en een constraint breekt dan stil
-- de opslag. De server valideert tegen REVOKED_REASONS in
-- src/lib/strava/lifecycle.ts.

alter table public.strava_connections
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_event_at timestamptz,
  add column if not exists consecutive_failures smallint not null default 0,
  add column if not exists last_error text,
  add column if not exists last_error_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_reason text,
  add column if not exists deauthorized_at timestamptz,
  add column if not exists inactivity_warned_at timestamptz;

-- updated_at werd tot nu toe misbruikt als cronvolgorde-sleutel. Bestaande rijen
-- krijgen die waarde als startpunt voor last_synced_at, zodat de eerste reconcile
-- na deze migratie niet iedereen tegelijk ophaalt.
update public.strava_connections
   set last_synced_at = updated_at
 where last_synced_at is null;

-- De reconcile pakt de oudste eerst; nooit-gesyncte koppelingen vooraan.
create index if not exists strava_connections_active_idx
  on public.strava_connections (last_synced_at nulls first)
  where revoked_at is null;

-- Werklijst voor de sweeper: opgeheven, maar Strava weet het nog niet.
create index if not exists strava_connections_pending_deauth_idx
  on public.strava_connections (revoked_at)
  where revoked_at is not null and deauthorized_at is null;

notify pgrst, 'reload schema';
