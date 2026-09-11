// Beheer van de Strava push-subscription.
//
// Eén subscription per applicatie. Strava valideert de callback-URL bij het
// aanmaken met een GET-handshake, dus dit werkt alleen tegen een publiek
// bereikbare HTTPS-URL — localhost kan niet. Vandaar dat dit vanaf /beheer/strava
// wordt aangestuurd en niet vanuit een script: na een domeinwijziging moet de
// subscription opnieuw gezet kunnen worden zonder deploy.

const SUBSCRIPTIONS_URL = "https://www.strava.com/api/v3/push_subscriptions";
const TIMEOUT_MS = 15_000;

export type StravaSubscription = {
  id: number;
  callbackUrl: string | null;
  createdAt: string | null;
};

function credentials() {
  const clientId = process.env.STRAVA_CLIENT_ID?.trim();
  const clientSecret = process.env.STRAVA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("STRAVA_CLIENT_ID en STRAVA_CLIENT_SECRET zijn nodig.");
  }
  return { clientId, clientSecret };
}

export function verifyToken(): string {
  const token = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "STRAVA_WEBHOOK_VERIFY_TOKEN ontbreekt. Zonder dat token kan Strava de callback niet verifiëren.",
    );
  }
  return token;
}

/** De callback-URL die Strava moet aanroepen. Moet publiek bereikbaar zijn. */
export function callbackUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!site || !/^https:\/\//i.test(site)) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL moet een publieke https-URL zijn om een webhook-subscription aan te maken.",
    );
  }
  return new URL("/api/strava/webhook", site).toString();
}

export async function viewSubscription(): Promise<StravaSubscription | null> {
  const { clientId, clientSecret } = credentials();
  const url = new URL(SUBSCRIPTIONS_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Subscription opvragen faalde (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  const rows = (await res.json()) as Array<{
    id?: number;
    callback_url?: string;
    created_at?: string;
  }>;
  const first = Array.isArray(rows) ? rows[0] : null;
  if (!first?.id) return null;
  return {
    id: Number(first.id),
    callbackUrl: first.callback_url ?? null,
    createdAt: first.created_at ?? null,
  };
}

/**
 * Maakt de subscription aan. Strava roept tijdens deze call onze GET-handshake
 * aan; die moet dus al gedeployd zijn, met hetzelfde verify token.
 */
export async function createSubscription(): Promise<StravaSubscription> {
  const { clientId, clientSecret } = credentials();
  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("callback_url", callbackUrl());
  body.set("verify_token", verifyToken());

  const res = await fetch(SUBSCRIPTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Subscription aanmaken faalde (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const created = (await res.json()) as { id?: number; created_at?: string };
  if (!created?.id) throw new Error("Strava gaf geen subscription-id terug.");
  return {
    id: Number(created.id),
    callbackUrl: callbackUrl(),
    createdAt: created.created_at ?? null,
  };
}

export async function deleteSubscription(id: number): Promise<void> {
  const { clientId, clientSecret } = credentials();
  const url = new URL(`${SUBSCRIPTIONS_URL}/${id}`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);

  const res = await fetch(url, {
    method: "DELETE",
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // 204 = weg. 404 = was er al niet meer; dat is hetzelfde eindresultaat.
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Subscription verwijderen faalde (${res.status}): ${text.slice(0, 200)}`,
    );
  }
}
