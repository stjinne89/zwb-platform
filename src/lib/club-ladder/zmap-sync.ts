import "server-only";

import { LadderLoginError } from "@/lib/ladder";
import type { createAdminClient } from "@/lib/supabase/admin";
import { ladderRiderZwiftIds } from "@/lib/zwiftracing/rider-sync";
import { parseLadderProfileZmap } from "./profile-zmap";
import { LADDER_ORIGIN, ladderUserAgent, withLadderSession } from "./session";

// zMAP van de Club Ladder voor iedereen in de Ladderpuzzel (0372): per renner
// de profielpagina met de ladder-sessie uit beheer, de oudste eerst, één
// pagina per PAGE_SPACING_MS. De knop "Teams en resultaten ophalen" neemt
// wie langer dan een uur geleden is opgehaald, de cron op /api/zwiftracing/sync
// wie langer dan 20 uur geleden (de ladder meet ongeveer één keer per dag).

type Admin = ReturnType<typeof createAdminClient>;

export const ZMAP_BUTTON_FRESH_MS = 60 * 60 * 1000;
export const ZMAP_CRON_FRESH_MS = 20 * 60 * 60 * 1000;
const PAGE_SPACING_MS = 700;
const DEFAULT_PAGE_TIMEOUT_MS = 8_000;

export type LadderZmapSyncResult = {
  due: number;
  fetched: number;
  /** Met een zMAP (Spread Value of live). */
  withZmap: number;
  /** 404 of geen meting. */
  unknown: number;
  remaining: number;
  /** Waarom de run stopte (sessie, HTTP-status, onbekende pagina), of null. */
  stopped: string | null;
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Page = { kind: "ok"; html: string } | { kind: "missing" } | { kind: "stop"; reason: string; timeout?: boolean };

async function fetchProfile(zwiftId: number, cookie: string, userAgent: string, timeoutMs: number): Promise<Page> {
  let res: Response;
  try {
    res = await fetch(`${LADDER_ORIGIN}/profile/${zwiftId}`, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": userAgent,
        Referer: `${LADDER_ORIGIN}/`,
        Cookie: cookie,
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { kind: "stop", reason: timeout ? "te traag" : "ladder niet bereikbaar", timeout };
  }
  if (res.status >= 300 && res.status < 400) {
    await res.body?.cancel().catch(() => undefined);
    throw new LadderLoginError("Ladder-sessie verlopen of ongeldig.");
  }
  if (res.status === 404) {
    await res.body?.cancel().catch(() => undefined);
    return { kind: "missing" };
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    return { kind: "stop", reason: `HTTP ${res.status}` };
  }
  return { kind: "ok", html: await res.text() };
}

export async function runLadderZmapSync(
  admin: Admin,
  options: { deadline: number; freshMs: number; pageTimeoutMs?: number },
): Promise<LadderZmapSyncResult> {
  const now = Date.now();
  const ids = await ladderRiderZwiftIds(admin);
  const { data, error } = ids.length
    ? await admin.from("ladder_rider_zmap").select("zwift_id, fetched_at").in("zwift_id", ids)
    : { data: [], error: null };
  const result: LadderZmapSyncResult = { due: 0, fetched: 0, withZmap: 0, unknown: 0, remaining: 0, stopped: null };
  if (error) {
    // Zonder 0372: stil overslaan.
    result.stopped = `tabel niet gelezen: ${error.message}`;
    return result;
  }
  const fetchedAt = new Map(
    ((data ?? []) as Array<{ zwift_id: number | string; fetched_at: string }>).map((row) => [
      Number(row.zwift_id),
      Date.parse(row.fetched_at) || 0,
    ]),
  );
  const due = ids
    .filter((id) => now - (fetchedAt.get(id) ?? 0) > options.freshMs)
    .sort((a, b) => (fetchedAt.get(a) ?? 0) - (fetchedAt.get(b) ?? 0));
  result.due = due.length;
  if (due.length === 0 || Date.now() > options.deadline) {
    result.remaining = due.length;
    return result;
  }

  const userAgent = await ladderUserAgent();
  let index = 0;
  try {
    await withLadderSession(async (cookie) => {
      for (; index < due.length; index++) {
        if (Date.now() > options.deadline) break;
        if (index > 0) await pause(PAGE_SPACING_MS);
        const zwiftId = due[index];
        const page = await fetchProfile(zwiftId, cookie, userAgent, options.pageTimeoutMs ?? DEFAULT_PAGE_TIMEOUT_MS);
        // Te traag: stoppen zonder melding, de volgende run neemt hem.
        if (page.kind === "stop" && page.timeout) break;
        if (page.kind === "stop") {
          result.stopped = page.reason;
          break;
        }
        const at = new Date().toISOString();
        const parsed = page.kind === "ok" ? parseLadderProfileZmap(page.html) : null;
        if (page.kind === "ok" && !parsed) {
          result.stopped = "profielpagina niet herkend";
          break;
        }
        const row = {
          zwift_id: zwiftId,
          found: page.kind === "ok",
          spread_wkg: parsed?.spread ?? null,
          live_wkg: parsed?.live ?? null,
          live_age_days: parsed?.liveAgeDays ?? null,
          fetched_at: at,
        };
        const { error: saveError } = await admin.from("ladder_rider_zmap").upsert(row);
        if (saveError) {
          result.stopped = `opslaan mislukt: ${saveError.message}`;
          break;
        }
        result.fetched += 1;
        if (row.spread_wkg != null || row.live_wkg != null) result.withZmap += 1;
        else result.unknown += 1;
      }
    });
  } catch (err) {
    result.stopped = err instanceof Error ? err.message : "onbekende fout";
  }
  result.remaining = due.length - index;
  return result;
}
