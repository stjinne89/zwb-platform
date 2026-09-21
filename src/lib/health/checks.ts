// Lichte integratie-health-checks. Detecteert stille breuk van externe bronnen
// (scrapers/onofficiële API's/verlopen cookies) zodat een beheerder het merkt
// vóór een lid klaagt. Bewust goedkoop: reachability + inhoud-marker, geen
// volledige scrape. De evaluatie is gescheiden van het ophalen zodat de pure
// beoordeling testbaar is zonder netwerk.

import { safeFetch } from "@/lib/net/safe-fetch";

export type HealthCheckResult = {
  source: string;
  ok: boolean;
  detail: string;
};

const TIMEOUT_MS = 12_000;

// ---- Pure evaluators (geen netwerk; unit-getest) ------------------------------

export function evaluateZwiftFeed(
  status: number,
  payload: unknown,
): HealthCheckResult {
  const source = "zwift_feed";
  if (status !== 200) {
    return { source, ok: false, detail: `HTTP ${status}` };
  }
  if (!Array.isArray(payload)) {
    return { source, ok: false, detail: "geen JSON-array (structuur gewijzigd?)" };
  }
  return { source, ok: true, detail: `${payload.length} events bereikbaar` };
}

export function evaluateMyWhoosh(status: number, html: string): HealthCheckResult {
  const source = "mywhoosh";
  if (status !== 200) {
    return { source, ok: false, detail: `HTTP ${status}` };
  }
  if (!html.includes("event.mywhoosh.com/event/detail")) {
    return { source, ok: false, detail: "geen event-links in HTML (markup gewijzigd?)" };
  }
  return { source, ok: true, detail: "event-listing bereikbaar" };
}

// Reachability-probe voor een bron waar we alleen heen linken of die we scrapen.
// `configured`-false → niet als storing tellen, alleen melden dat het ongebruikt is.
export function evaluateReachable(
  source: string,
  status: number,
  configured = true,
): HealthCheckResult {
  if (!configured) {
    return { source, ok: true, detail: "overgeslagen (niet geconfigureerd)" };
  }
  if (status >= 200 && status < 300) {
    return { source, ok: true, detail: `HTTP ${status}` };
  }
  return { source, ok: false, detail: `HTTP ${status}` };
}

/**
 * Komen er nog webhook-events binnen? Sinds we niet meer pollen is dit het enige
 * signaal dat de Strava-koppeling nog leeft: valt de subscription weg (Strava
 * verwijdert 'm bij herhaald falen van onze callback), dan blijft de app stil
 * zonder foutmelding. De drempel is ruim, want 's nachts rijdt niemand.
 */
export function evaluateStravaWebhook(
  hasSubscription: boolean,
  lastEventAt: string | null,
  maxSilentHours: number,
  now = new Date(),
): HealthCheckResult {
  const source = "strava_webhook";
  if (!hasSubscription) {
    return { source, ok: false, detail: "geen actieve subscription" };
  }
  if (!lastEventAt) {
    return { source, ok: true, detail: "subscription actief, nog geen events" };
  }
  const parsed = Date.parse(lastEventAt);
  if (!Number.isFinite(parsed)) {
    return { source, ok: false, detail: "laatste event heeft geen geldige datum" };
  }
  const hours = Math.round((now.getTime() - parsed) / 3600_000);
  return hours > maxSilentHours
    ? { source, ok: false, detail: `${hours}u geen events` }
    : { source, ok: true, detail: `laatste event ${hours}u geleden` };
}

/**
 * Lukt de resultatensync zelf? Bereikbaarheid van de site zegt daar niets over:
 * WTRL gaf sinds juni 401 op een verlopen cookie terwijl de homepage gewoon 200
 * bleef geven. De sync schrijft per bron `last_error`; die is hier de maat.
 */
export function evaluateTeamResultSync(
  source: string,
  rows: { last_error: string | null; last_synced_at: string | null }[],
): HealthCheckResult {
  if (rows.length === 0) {
    return { source, ok: true, detail: "geen actieve bronnen" };
  }
  const failing = rows.filter((row) => row.last_error);
  if (failing.length > 0) {
    const first = (failing[0].last_error ?? "").slice(0, 120);
    return { source, ok: false, detail: `${failing.length} van ${rows.length} bronnen falen: ${first}` };
  }
  const synced = rows.filter((row) => row.last_synced_at).length;
  return synced === 0
    ? { source, ok: true, detail: `${rows.length} bronnen, nog niet gesynchroniseerd` }
    : { source, ok: true, detail: `${rows.length} bronnen zonder fout` };
}

export function evaluateEnvPresent(
  source: string,
  present: boolean,
): HealthCheckResult {
  return present
    ? { source, ok: true, detail: "sleutel aanwezig" }
    : { source, ok: false, detail: "env-sleutel ontbreekt" };
}

// ---- Netwerk-runner -----------------------------------------------------------

async function withTimeout(url: string): Promise<Response> {
  return safeFetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "ZWB-healthcheck/1.0" },
  });
}

async function guard(
  source: string,
  fn: () => Promise<HealthCheckResult>,
): Promise<HealthCheckResult> {
  try {
    return await fn();
  } catch (err) {
    return {
      source,
      ok: false,
      detail: err instanceof Error ? err.message : "onbekende fout",
    };
  }
}

/** Draait alle probes parallel en levert één resultaat per bron. */
export async function runIntegrationHealthChecks(): Promise<HealthCheckResult[]> {
  return Promise.all([
    guard("zwift_feed", async () => {
      const res = await withTimeout(
        "https://us-or-rly101.zwift.com/api/public/events/upcoming",
      );
      const payload = res.status === 200 ? await res.json().catch(() => null) : null;
      return evaluateZwiftFeed(res.status, payload);
    }),
    guard("mywhoosh", async () => {
      const res = await withTimeout("https://mywhoosh.com/events/");
      const html = res.status === 200 ? await res.text().catch(() => "") : "";
      return evaluateMyWhoosh(res.status, html);
    }),
    guard("zwiftpower", async () => {
      const res = await withTimeout("https://zwiftpower.com/");
      return evaluateReachable("zwiftpower", res.status);
    }),
    guard("ladder", async () => {
      const configured = Boolean(process.env.LADDER_COOKIE);
      if (!configured) return evaluateReachable("ladder", 0, false);
      const res = await withTimeout("https://ladder.cycleracing.club/");
      return evaluateReachable("ladder", res.status);
    }),
    guard("wtrl", async () => {
      const configured = Boolean(process.env.WTRL_COOKIE);
      if (!configured) return evaluateReachable("wtrl", 0, false);
      const res = await withTimeout("https://www.wtrl.racing/");
      return evaluateReachable("wtrl", res.status);
    }),
    ...(["wtrl", "club_ladder"] as const).map((provider) => {
      const source = provider === "wtrl" ? "wtrl_sync" : "ladder_sync";
      return guard(source, async () => {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const { data, error } = await createAdminClient()
          .from("team_result_sources")
          .select("last_error, last_synced_at")
          .eq("provider", provider)
          .eq("enabled", true);
        if (error) return { source, ok: false, detail: error.message };
        return evaluateTeamResultSync(
          source,
          (data ?? []) as { last_error: string | null; last_synced_at: string | null }[],
        );
      });
    }),
    guard("openai", async () =>
      evaluateEnvPresent("openai", Boolean(process.env.OPENAI_API_KEY)),
    ),
    guard("strava_webhook", async () => {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const [{ data: subscription }, { data: lastEvent }] = await Promise.all([
        admin
          .from("strava_webhook_subscriptions")
          .select("id")
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle(),
        admin
          .from("strava_webhook_events")
          .select("received_at")
          .order("received_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return evaluateStravaWebhook(
        Boolean(subscription),
        (lastEvent?.received_at as string | null) ?? null,
        48,
      );
    }),
  ]);
}
