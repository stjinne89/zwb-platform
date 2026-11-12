import "server-only";

// Eén pagina van zwiftracing.app ophalen, zoals een browser zonder login.
// Sinds 2026-11-11 kan dat vanaf de server (zie rider-page.ts). Een 404 is
// "onbekend"; elke andere fout is een reden om te stoppen, zodat we niet
// doorgaan op een site die ons weert.

import { getClub } from "@/lib/club";

const BASE = "https://zwiftracing.app";
const TIMEOUT_MS = 10_000;

export type FetchedPage = { kind: "ok"; html: string } | { kind: "unknown" } | { kind: "stop"; reason: string };

export async function zwiftRacingUserAgent(): Promise<string> {
  return `${(await getClub()).texts.shortName} Platform`;
}

export async function fetchZwiftRacingPage(path: string, userAgent?: string, timeoutMs = TIMEOUT_MS): Promise<FetchedPage> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: { Accept: "text/html", "User-Agent": userAgent ?? (await zwiftRacingUserAgent()) },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    return { kind: "stop", reason: err instanceof Error ? err.message : "geen verbinding" };
  }
  if (response.status === 404) return { kind: "unknown" };
  if (!response.ok) return { kind: "stop", reason: `status ${response.status}` };
  return { kind: "ok", html: await response.text() };
}
