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
    guard("openai", async () =>
      evaluateEnvPresent("openai", Boolean(process.env.OPENAI_API_KEY)),
    ),
  ]);
}
