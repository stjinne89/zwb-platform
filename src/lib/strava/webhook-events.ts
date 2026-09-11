// Parsen en duiden van Strava's webhook-payloads. Bewust puur: geen netwerk,
// geen database. De callback-route moet binnen 2 seconden antwoorden, dus daar
// mag niets ingewikkelds gebeuren, en de verwerker aan de andere kant moet
// zonder Strava-verbinding te testen zijn (zie vitest.config.ts).
//
// Payloadvorm (developers.strava.com/docs/webhooks):
//   { "aspect_type": "create", "event_time": 1516126040, "object_id": 1360128428,
//     "object_type": "activity", "owner_id": 134815, "subscription_id": 120475,
//     "updates": {} }
//
// Een deauthorisatie komt binnen als object_type "athlete" met
// updates: { "authorized": "false" } -- let op: de string "false", niet de
// boolean. Dat is het signaal waar Strava's afwijzing om draaide.

export const WEBHOOK_OBJECT_TYPES = ["activity", "athlete"] as const;
export const WEBHOOK_ASPECT_TYPES = ["create", "update", "delete"] as const;

export type WebhookObjectType = (typeof WEBHOOK_OBJECT_TYPES)[number];
export type WebhookAspectType = (typeof WEBHOOK_ASPECT_TYPES)[number];

export type StravaWebhookEvent = {
  objectType: WebhookObjectType;
  objectId: number;
  aspectType: WebhookAspectType;
  ownerId: number;
  subscriptionId: number | null;
  /** ISO-string; Strava stuurt unix-seconden. */
  eventTime: string;
  updates: Record<string, unknown>;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Valideert één binnenkomende payload. Geeft null bij alles wat we niet kennen —
 * de route antwoordt dan alsnog met 200 (een 4xx/5xx kost ons de subscription),
 * maar zet niets in de wachtrij.
 */
export function parseWebhookEvent(payload: unknown): StravaWebhookEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;

  const objectType = String(body.object_type ?? "");
  const aspectType = String(body.aspect_type ?? "");
  if (!(WEBHOOK_OBJECT_TYPES as readonly string[]).includes(objectType)) return null;
  if (!(WEBHOOK_ASPECT_TYPES as readonly string[]).includes(aspectType)) return null;

  const objectId = finiteNumber(body.object_id);
  const ownerId = finiteNumber(body.owner_id);
  const eventTime = finiteNumber(body.event_time);
  if (objectId === null || ownerId === null || eventTime === null) return null;

  const updates =
    body.updates && typeof body.updates === "object" && !Array.isArray(body.updates)
      ? (body.updates as Record<string, unknown>)
      : {};

  return {
    objectType: objectType as WebhookObjectType,
    objectId,
    aspectType: aspectType as WebhookAspectType,
    ownerId,
    subscriptionId: finiteNumber(body.subscription_id),
    eventTime: new Date(eventTime * 1000).toISOString(),
    updates,
  };
}

/**
 * Trekt een atleet zijn toestemming in, dan stuurt Strava dit. `authorized` komt
 * als string binnen; we accepteren ook de boolean voor het geval Strava dat ooit
 * verandert.
 */
export function isDeauthorizationEvent(event: StravaWebhookEvent): boolean {
  if (event.objectType !== "athlete") return false;
  const authorized = event.updates.authorized;
  return authorized === "false" || authorized === false;
}

export type ChallengeResult =
  | { ok: true; challenge: string }
  | { ok: false; status: number; error: string };

/**
 * Strava's verificatie-handshake: GET met hub.mode/hub.verify_token/hub.challenge.
 * We moeten de challenge letterlijk terugsturen onder de sleutel "hub.challenge".
 * Puur gehouden zodat de vergelijking van het token in een unit-test vastligt.
 */
export function evaluateSubscriptionChallenge(
  params: URLSearchParams,
  expectedVerifyToken: string | undefined,
): ChallengeResult {
  if (!expectedVerifyToken) {
    return { ok: false, status: 500, error: "STRAVA_WEBHOOK_VERIFY_TOKEN ontbreekt." };
  }
  if (params.get("hub.mode") !== "subscribe") {
    return { ok: false, status: 400, error: "Onbekende hub.mode." };
  }
  if (!timingSafeEqual(params.get("hub.verify_token") ?? "", expectedVerifyToken)) {
    return { ok: false, status: 403, error: "Verify token klopt niet." };
  }
  const challenge = params.get("hub.challenge");
  if (!challenge) {
    return { ok: false, status: 400, error: "hub.challenge ontbreekt." };
  }
  return { ok: true, challenge };
}

/**
 * Lengte-onafhankelijke vergelijking. Node's crypto.timingSafeEqual eist gelijke
 * buffers; deze variant vergelijkt altijd evenveel tekens zodat de looptijd niets
 * over het geheim verraadt.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
