// App-breed rate-limit-budget dat een koude serverless-invocatie overleeft.
//
// Strava's limieten gelden per applicatie, niet per gebruiker. De app las de
// x-ratelimit-headers tot nu toe alleen in de summary-writer; de hoofdlus negeerde
// ze volledig. En omdat elke cronrun koud start was er geen geheugen van het
// verbruik van de vorige run, waardoor een dagbudget bewaken principieel
// onmogelijk was. Migratie 0150 geeft ons één rij om dat in te bewaren.

import {
  nearRateLimit,
  readRateLimitUsage,
  type StravaRateLimitUsage,
} from "@/lib/strava/activity-api";

const USAGE_ROW_ID = "strava";
/** Ouder dan dit zegt niets meer: het 15-minutenvenster is dan allang gerold. */
const STALE_AFTER_MS = 15 * 60_000;

export type RateLimitVerdict =
  | { pause: false }
  | { pause: true; reason: "short_term" | "daily"; usage: StravaRateLimitUsage };

/**
 * Mogen we nog callen? Puur, zodat de drempels in een unit-test vastliggen.
 *
 * Het 15-minutenvenster gebruikt de bestaande nearRateLimit-drempel (default 70%)
 * zodat interactieve acties van leden ruimte houden. De daglimiet krijgt een
 * ruimere drempel: die loopt langzaam vol en op 90% stoppen kost een hele dag.
 */
export function shouldPauseForRateLimit(
  usage: StravaRateLimitUsage | null,
  options: { shortTermRatio?: number; dailyRatio?: number } = {},
): RateLimitVerdict {
  if (!usage) return { pause: false };

  if (nearRateLimit(usage, options.shortTermRatio ?? 0.7)) {
    return { pause: true, reason: "short_term", usage };
  }

  const dailyRatio = options.dailyRatio ?? 0.9;
  if (
    usage.dailyUsed != null &&
    usage.dailyLimit != null &&
    usage.dailyLimit > 0 &&
    usage.dailyUsed >= usage.dailyLimit * dailyRatio
  ) {
    return { pause: true, reason: "daily", usage };
  }

  return { pause: false };
}

/** Puur: valt deze meting nog binnen het 15-minutenvenster? */
export function isUsageFresh(observedAt: string | null, now = new Date()): boolean {
  if (!observedAt) return false;
  const parsed = Date.parse(observedAt);
  if (!Number.isFinite(parsed)) return false;
  return now.getTime() - parsed < STALE_AFTER_MS;
}

/**
 * Puur: telt de dagteller uit deze meting nog? Strava's daglimiet reset om
 * middernacht UTC, dus een meting van gisteren zegt niets meer.
 */
export function isSameUtcDay(observedAt: string | null, now = new Date()): boolean {
  if (!observedAt) return false;
  const parsed = new Date(observedAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
}

/**
 * Schrijft het waargenomen verbruik weg. Best-effort: het budget mag nooit de
 * reden zijn dat een sync omvalt.
 */
export async function recordRateLimitUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  headers: Headers,
): Promise<StravaRateLimitUsage | null> {
  const usage = readRateLimitUsage(headers);
  if (!usage) return null;
  try {
    await admin.from("strava_api_usage").upsert(
      {
        id: USAGE_ROW_ID,
        short_term_used: usage.shortTermUsed,
        short_term_limit: usage.shortTermLimit,
        daily_used: usage.dailyUsed,
        daily_limit: usage.dailyLimit,
        observed_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {
    // niet kritiek
  }
  return usage;
}

/**
 * Laatst waargenomen verbruik. Een meting ouder dan het 15-minutenvenster negeren
 * we: die zou een run onterecht tegenhouden.
 */
export async function loadRateLimitUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<StravaRateLimitUsage | null> {
  try {
    const { data } = await admin
      .from("strava_api_usage")
      .select("short_term_used, short_term_limit, daily_used, daily_limit, observed_at")
      .eq("id", USAGE_ROW_ID)
      .maybeSingle();
    if (!data) return null;

    const observedAt = data.observed_at as string | null;
    const usage: StravaRateLimitUsage = {
      shortTermUsed: data.short_term_used ?? null,
      shortTermLimit: data.short_term_limit ?? null,
      dailyUsed: data.daily_used ?? null,
      dailyLimit: data.daily_limit ?? null,
    };

    // De twee vensters rollen los van elkaar: het korte na 15 minuten, het lange
    // om middernacht UTC. Een vervallen teller op null zetten in plaats van de
    // hele meting weggooien, zodat de daglimiet blijft gelden als alleen het
    // 15-minutenvenster is gerold.
    const now = new Date();
    return {
      shortTermUsed: isUsageFresh(observedAt, now) ? usage.shortTermUsed : null,
      shortTermLimit: isUsageFresh(observedAt, now) ? usage.shortTermLimit : null,
      dailyUsed: isSameUtcDay(observedAt, now) ? usage.dailyUsed : null,
      dailyLimit: isSameUtcDay(observedAt, now) ? usage.dailyLimit : null,
    };
  } catch {
    return null;
  }
}
