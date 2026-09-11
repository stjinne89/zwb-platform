// De toestandsmachine van een Strava-koppeling.
//
// Achtergrond: strava_connections had geen enkele kolom om vast te leggen dat een
// koppeling dood is (migratie 0148 voegt ze toe). Een ingetrokken koppeling werd
// daardoor elke cronrun opnieuw geprobeerd, en een lid dat in de app ontkoppelde
// bleef op Strava's kant gekoppeld. Beide kosten ons plekken in de athlete cap.
//
// Twee tijdstempels, geen statuskolom:
//   revoked_at       -- de koppeling is opgeheven; de app negeert de rij vanaf nu.
//   deauthorized_at  -- Strava's kant is ook echt los.
// Zolang het eerste gezet is en het tweede niet, moet de sweeper de
// deauthorize-call nog doen. Daarom blijft de rij staan: we hebben de token nog
// nodig. Pas als deauthorized_at gezet is mag de rij (en de ruwe data) weg.
//
// De beslisfuncties hieronder zijn puur, zodat ze zonder database te testen zijn.

export const REVOKED_REASONS = [
  /** Lid drukte zelf op "Ontkoppel Strava". */
  "member",
  /** Lid verwijderde zijn account (AVG art. 17). */
  "account_deleted",
  /** Lid trok de app in op strava.com; kwam binnen als webhook-event. */
  "strava",
  /** Refresh-token wordt niet meer geaccepteerd — feitelijk hetzelfde als 'strava'. */
  "invalid_grant",
  /** Opgeruimd wegens langdurige inactiviteit, na waarschuwing. */
  "inactive",
  /** Beheerder ruimde de koppeling namens het lid op. */
  "admin",
] as const;

export type RevokedReason = (typeof REVOKED_REASONS)[number];

export function isRevokedReason(value: unknown): value is RevokedReason {
  return (REVOKED_REASONS as readonly string[]).includes(String(value));
}

export type RevocationPatch = {
  revoked_at: string;
  revoked_reason: RevokedReason;
  deauthorized_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
};

/**
 * Welke kolommen horen bij deze revocatie?
 *
 * `deauthorized` staat op true zodra er niets meer te deauthoriseren valt: het lid
 * trok het op strava.com in, de token is al dood, of onze deauthorize-call is
 * geslaagd. Staat het op false, dan blijft de rij op de werklijst van de sweeper.
 */
export function revocationPatch(
  reason: RevokedReason,
  options: { deauthorized: boolean; at?: Date; error?: string | null } = {
    deauthorized: false,
  },
): RevocationPatch {
  const at = (options.at ?? new Date()).toISOString();
  const error = options.error?.trim() || null;
  return {
    revoked_at: at,
    revoked_reason: reason,
    deauthorized_at: options.deauthorized ? at : null,
    last_error: error,
    last_error_at: error ? at : null,
  };
}

/**
 * Wat een (her)koppeling moet schoonvegen. Zonder dit blijft een lid dat opnieuw
 * koppelt gemarkeerd staan als opgeheven en wordt hij door de sync overgeslagen.
 */
export function reconnectPatch() {
  return {
    revoked_at: null,
    revoked_reason: null,
    deauthorized_at: null,
    inactivity_warned_at: null,
    consecutive_failures: 0,
    last_error: null,
    last_error_at: null,
  };
}

export type InactivityDecision =
  /** Recent gereden of ingelogd: niets doen (en een eerdere waarschuwing intrekken). */
  | "active"
  /** Voldoet aan de inactiviteitsdrempel en is nog niet gewaarschuwd. */
  | "warn"
  /** Gewaarschuwd, respijt verstreken, nog steeds stil: opheffen. */
  | "revoke"
  /** Gewaarschuwd, respijt loopt nog. */
  | "waiting";

export type InactivityInput = {
  /** Laatste rit in strava_activities. */
  lastActivityAt: string | null;
  /** auth.users.last_sign_in_at — profiles heeft geen last-seen-kolom. */
  lastSignInAt: string | null;
  inactivityWarnedAt: string | null;
  now: Date;
  inactiveMonths: number;
  graceDays: number;
};

function monthsBefore(now: Date, months: number): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

function isAfter(value: string | null, cutoff: Date): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > cutoff.getTime();
}

/**
 * Inactiviteitsbeleid: een koppeling die niets meer oplevert en waarvan het lid
 * niet meer langskomt, houdt een plek bezet die een actief lid kan gebruiken.
 *
 * Bewust twee signalen: iemand kan maandenlang niet fietsen maar wel de app
 * gebruiken. Alleen wie op beide fronten stil is komt in aanmerking, en dan nog
 * pas na een waarschuwing plus respijtperiode.
 */
export function decideInactivity(input: InactivityInput): InactivityDecision {
  const cutoff = monthsBefore(input.now, input.inactiveMonths);
  if (isAfter(input.lastActivityAt, cutoff) || isAfter(input.lastSignInAt, cutoff)) {
    return "active";
  }
  if (!input.inactivityWarnedAt) return "warn";

  const warnedAt = Date.parse(input.inactivityWarnedAt);
  if (!Number.isFinite(warnedAt)) return "warn";

  const graceEnds = warnedAt + input.graceDays * 86400_000;
  return input.now.getTime() >= graceEnds ? "revoke" : "waiting";
}

/**
 * Gegooid zodra een koppeling niet meer bruikbaar is. Bestaat zodat de cron een
 * dode koppeling kan overslaan in plaats van 'm als generieke fout te tellen en
 * de volgende run opnieuw te proberen — precies het gedrag dat Strava "stale
 * athletes" noemt.
 */
export class StravaConnectionRevokedError extends Error {
  readonly reason: RevokedReason;

  constructor(reason: RevokedReason, message?: string) {
    super(message ?? "De Strava-koppeling van dit lid is niet meer geldig.");
    this.name = "StravaConnectionRevokedError";
    this.reason = reason;
  }
}
