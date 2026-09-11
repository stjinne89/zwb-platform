// De kant van de integratie die tot nu toe ontbrak: Strava vertellen dat een
// koppeling niet meer bestaat.
//
// Zonder deze call blijft de grant op Strava's kant leven nadat een lid in de app
// heeft ontkoppeld of zijn account heeft verwijderd. Die atleet telt dan
// permanent mee voor onze athlete cap, terwijl wij de rij net hebben weggegooid
// en er dus nooit meer bij kunnen. Strava noemt dit expliciet als voorwaarde voor
// een hogere limiet: apps die deauthorisatie actief beheren houden een lager
// gekoppeld-atletenaantal.

const DEAUTHORIZE_URL = "https://www.strava.com/oauth/deauthorize";
const TIMEOUT_MS = 8000;

export type DeauthorizeResult =
  | { ok: true; alreadyGone: boolean }
  | { ok: false; error: string };

/**
 * Trekt de toestemming in bij Strava. Een 401 betekent dat de grant er al niet
 * meer was (lid heeft het zelf op strava.com gedaan, of de token is verlopen) —
 * dat is voor ons hetzelfde eindresultaat en telt als geslaagd.
 */
export async function deauthorizeStravaAthlete(
  accessToken: string,
): Promise<DeauthorizeResult> {
  try {
    const body = new URLSearchParams();
    body.set("access_token", accessToken);

    const res = await fetch(DEAUTHORIZE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${accessToken}`,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 401) return { ok: true, alreadyGone: true };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Strava deauthorize faalde (${res.status}): ${text.slice(0, 160)}`,
      };
    }
    return { ok: true, alreadyGone: false };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Strava deauthorize faalde.",
    };
  }
}

/**
 * Herkent een refresh-token die Strava niet meer accepteert. Dat gebeurt zodra de
 * atleet de app op strava.com intrekt. Tot nu toe kwam dit als generieke Error
 * naar boven en bleef de cron dezelfde dode koppeling elke run opnieuw proberen.
 *
 * Puur, zodat de classificatie in een unit-test vastligt: Strava antwoordt met
 * 400 en een body als {"message":"Bad Request","errors":[{"field":"refresh_token",
 * "code":"invalid"}]}, en bij een ingetrokken grant met invalid_grant.
 */
export function isInvalidGrant(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) return false;
  if (/invalid_grant/i.test(message)) return true;
  // Onze eigen foutvorm uit postToken: "Strava token request faalde (400): ...".
  if (!/\(400\)|\(401\)/.test(message)) return false;
  return /refresh_token|authorization|revoke|invalid/i.test(message);
}
