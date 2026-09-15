// Volledige Strava-historie, geleidelijk.
//
// De koppeling haalt bij een eerste sync ritten tot vijf jaar terug op
// (syncStravaActivitiesForUser). Wie langer fietst, miste daardoor oude ritten
// in ZWBlokken, cols, statistieken, badges en segmenten. Deze stap haalt de rest
// op met Strava's `before`-cursor, per lid, tot Strava een onvolle pagina geeft.
//
// Zuinig met het budget, want Strava's limieten gelden voor de hele app:
// - hooguit drie overzichtspagina's (elk 100 activiteiten) per run, zolang de run
//   tijd heeft, plus een paar pogingen als Strava het token van een lid weigert;
// - dezelfde krappe budgetgrens als de segment-inhaalslag (50% van het kwartier,
//   60% van de dag), zodat leden die net een rit uploaden nooit wachten;
// - het ritoverzicht bevat de routelijn al: ZWBlokken en cols kosten geen extra
//   calls. De segmentdetails van oude ritten haalt de bestaande segment-
//   inhaalslag later op, onder diezelfde budgetgrens.
//
// Draait mee in de 5-minutenjob van de webhookverwerking (migratie 0164 voor de
// cursor). Uitzetten zonder deploy: `?historyBackfill=0` aan de cron-URL.

import {
  accessTokenFor,
  stravaActivityRow,
  type StravaActivity,
  type StravaConnection,
} from "@/lib/strava/client";
import { isCyclingSportType } from "@/lib/strava/sports";
import {
  loadRateLimitUsage,
  recordRateLimitUsage,
  shouldPauseForRateLimit,
} from "@/lib/strava/rate-limit-budget";
import type { StravaRateLimitUsage } from "@/lib/strava/activity-api";

export const HISTORY_BUDGET = { shortTermRatio: 0.5, dailyRatio: 0.6 } as const;
export const HISTORY_PAGE_SIZE = 100;
/**
 * Pagina's per run. Was 1 (2026-09-15); op verzoek van de eigenaar 3, omdat het
 * budget ruim bleef (dag ~25%) en ZWBlokken anders dagen op zich liet wachten.
 */
export const MAX_PAGES_PER_RUN = 3;
/** Een overzichtspagina plus opslaan en blokken rekenen; zonder deze marge geen nieuwe pagina. */
const MIN_REMAINING_MS = 3500;
/** Hoeveel koppelingen we per run bekijken om er één met werk te vinden. */
const CANDIDATE_LIMIT = 20;
/** Aanroepen naar Strava per run, geweigerde tokens meegeteld: nooit onbeperkt. */
const MAX_FETCHES_PER_RUN = MAX_PAGES_PER_RUN + 2;

export type HistoryCandidate = StravaConnection & {
  history_before: string | null;
};

export type PageOutcome =
  | { status: "ok"; activities: Array<StravaActivity & { start_date?: string }> }
  | { status: "rate_limited" }
  | { status: "auth_failed" }
  | { status: "failed"; error: string };

export type HistoryBackfillResult = {
  /** Het laatste lid waarvoor deze run een pagina ophaalde. */
  profileId: string | null;
  pages: number;
  seen: number;
  stored: number;
  /** Leden die deze run compleet werden. */
  completed: number;
  stopped:
    | "done"
    | "page"
    | "deadline"
    | "budget"
    | "rate_limited"
    | "failed"
    | "no_migration"
    | null;
  error?: string;
};

export type HistoryDeps = {
  now: () => number;
  loadUsage: () => Promise<StravaRateLimitUsage | null>;
  /** null = de kolommen uit 0164 bestaan nog niet. */
  candidates: () => Promise<HistoryCandidate[] | null>;
  /** Starttijd van de oudste rit die de gewone sync van dit lid binnenhaalde. */
  oldestSyncedStart: (profileId: string) => Promise<string | null>;
  tokenFor: (candidate: HistoryCandidate) => Promise<string>;
  fetchPage: (token: string, beforeUnix: number) => Promise<PageOutcome>;
  storeRides: (
    candidate: HistoryCandidate,
    rides: Array<StravaActivity & { start_date: string }>,
  ) => Promise<number>;
  saveCursor: (profileId: string, before: string, complete: boolean) => Promise<void>;
  /** Goedkoop en puur database: blokken van de nieuwe ritten. */
  afterPage: (profileId: string) => Promise<void>;
  /** Eén keer per lid, als alles binnen is: cols en badges (met hooguit één melding). */
  afterComplete: (profileId: string, token: string) => Promise<void>;
};

/**
 * Wat een pagina betekent voor de cursor. Puur, voor de test.
 *
 * De cursor schuift naar de oudste activiteit op de pagina, óók als dat geen
 * fietsrit is: anders blijft hij hangen op een pagina vol hardloopjes. Een
 * onvolle pagina betekent dat er niets ouder is.
 */
export function nextCursor(
  activities: Array<{ start_date?: string }>,
  currentBefore: string,
): { before: string; complete: boolean } {
  let oldest = Date.parse(currentBefore);
  for (const activity of activities) {
    const start = activity.start_date ? Date.parse(activity.start_date) : NaN;
    if (Number.isFinite(start) && start < oldest) oldest = start;
  }
  return {
    before: new Date(oldest).toISOString(),
    complete: activities.length < HISTORY_PAGE_SIZE,
  };
}

/** Nieuwste eerst? Alleen een volle pagina telt: een onvolle rondt toch af. Puur. */
export function isNewestFirst(activities: Array<{ start_date?: string }>): boolean {
  if (activities.length < HISTORY_PAGE_SIZE) return true;
  const first = Date.parse(activities[0].start_date ?? "");
  const last = Date.parse(activities.at(-1)!.start_date ?? "");
  return !(Number.isFinite(first) && Number.isFinite(last) && first < last);
}

export async function runStravaHistoryBackfill(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  options: { deadline: number; deps?: Partial<HistoryDeps> },
): Promise<HistoryBackfillResult> {
  const deps = { ...defaultDeps(admin), ...options.deps };
  const result: HistoryBackfillResult = {
    profileId: null,
    pages: 0,
    seen: 0,
    stored: 0,
    completed: 0,
    stopped: null,
  };
  // Na minstens één pagina is stoppen gewoon "er is gewerkt".
  const stop = (reason: HistoryBackfillResult["stopped"]) => ({
    ...result,
    stopped: result.pages > 0 && (reason === "deadline" || reason === "budget") ? "page" : reason,
  });

  const candidates = await deps.candidates();
  if (candidates === null) return { ...result, stopped: "no_migration" };

  let fetches = 0;
  for (const candidate of candidates) {
    // Nog geen enkele rit van de gewone sync: die haalt eerst de laatste vijf jaar
    // op. Pas daarna weten we waar de historie verder moet.
    let before = candidate.history_before ?? (await deps.oldestSyncedStart(candidate.profile_id));
    if (!before) continue;

    let token: string | null = null;

    // Pagina's van dit lid tot het klaar is, of tot de run op is.
    while (true) {
      if (result.pages >= MAX_PAGES_PER_RUN) return stop("page");
      if (fetches >= MAX_FETCHES_PER_RUN) {
        return result.pages > 0 ? stop("page") : { ...result, stopped: "failed", error: "Te veel geweigerde tokens." };
      }
      if (options.deadline - deps.now() < MIN_REMAINING_MS) return stop("deadline");
      if (shouldPauseForRateLimit(await deps.loadUsage(), HISTORY_BUDGET).pause) return stop("budget");

      if (!token) {
        try {
          token = await deps.tokenFor(candidate);
        } catch {
          // Koppelingsproblemen lost de webhook-/lifecycle-route op; volgende lid.
          break;
        }
      }

      result.profileId = candidate.profile_id;
      fetches++;
      const page = await deps.fetchPage(token, Math.floor(Date.parse(before) / 1000));
      if (page.status === "rate_limited") return stop("rate_limited");
      if (page.status === "auth_failed") break;
      if (page.status === "failed") return { ...result, stopped: "failed", error: page.error };

      // Met alleen `before` geeft Strava de nieuwste eerst. Komt een volle pagina
      // oud-naar-nieuw terug, dan zou de cursor de tussenliggende jaren overslaan en
      // het lid ten onrechte als klaar markeren. Liever stoppen dan data missen.
      if (!isNewestFirst(page.activities)) {
        return { ...result, stopped: "failed", error: "Onverwachte volgorde van Strava." };
      }
      result.pages++;
      result.seen += page.activities.length;
      const rides = page.activities.filter(
        (a): a is StravaActivity & { start_date: string } =>
          Boolean(a.id && a.start_date) && isCyclingSportType(a.sport_type ?? a.type),
      );
      if (rides.length > 0) result.stored += await deps.storeRides(candidate, rides);

      const cursor = nextCursor(page.activities, before);
      // Eerst de cursor zonder "klaar": valt de run hierna om, dan kost de volgende
      // run één lege pagina en draaien de afsluitende stappen alsnog.
      await deps.saveCursor(candidate.profile_id, cursor.before, false);
      if (rides.length > 0) await deps.afterPage(candidate.profile_id);
      before = cursor.before;

      if (cursor.complete) {
        await deps.afterComplete(candidate.profile_id, token);
        await deps.saveCursor(candidate.profile_id, cursor.before, true);
        result.completed++;
        break;
      }
    }
  }

  return result.pages > 0 ? stop("page") : { ...result, stopped: "done" };
}

function defaultDeps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): HistoryDeps {
  return {
    now: Date.now,
    loadUsage: () => loadRateLimitUsage(admin),
    candidates: async () => {
      const { data, error } = await admin
        .from("strava_connections")
        .select(
          "profile_id,strava_athlete_id,access_token,refresh_token,expires_at,history_before,profiles!inner(is_approved)",
        )
        .is("revoked_at", null)
        .is("history_complete_at", null)
        .eq("profiles.is_approved", true)
        .order("profile_id")
        .limit(CANDIDATE_LIMIT);
      if (error) {
        // Zonder 0164 bestaat history_before niet; dan niets doen in plaats van falen.
        if (/history_(before|complete_at)/.test(error.message)) return null;
        throw new Error(error.message);
      }
      return (data ?? []) as HistoryCandidate[];
    },
    oldestSyncedStart: async (profileId) => {
      // Alleen ritten uit de API: een CSV-import kan ouder zijn dan wat de sync
      // zag, en dan zou de cursor de tussenliggende jaren overslaan.
      const { data, error } = await admin
        .from("strava_activities")
        .select("start_date")
        .eq("profile_id", profileId)
        .is("raw->>import_source", null)
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.start_date as string | undefined) ?? null;
    },
    tokenFor: (candidate) => accessTokenFor(admin, candidate),
    fetchPage: async (token, beforeUnix) => {
      const url = new URL("https://www.strava.com/api/v3/athlete/activities");
      url.searchParams.set("before", String(beforeUnix));
      url.searchParams.set("per_page", String(HISTORY_PAGE_SIZE));
      url.searchParams.set("page", "1");
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        });
        await recordRateLimitUsage(admin, res.headers);
        if (res.status === 429) return { status: "rate_limited" };
        if (res.status === 401 || res.status === 403) return { status: "auth_failed" };
        if (!res.ok) return { status: "failed", error: `Strava ${res.status}` };
        const body = await res.json();
        if (!Array.isArray(body)) return { status: "failed", error: "Onverwacht antwoord." };
        return { status: "ok", activities: body };
      } catch (err) {
        return { status: "failed", error: err instanceof Error ? err.message : "Strava onbereikbaar." };
      }
    },
    storeRides: async (candidate, rides) => {
      const rows = rides.map((ride) =>
        stravaActivityRow(ride, candidate.profile_id, Number(candidate.strava_athlete_id)),
      );
      const { error } = await admin.from("strava_activities").upsert(rows, { onConflict: "id" });
      if (error) throw new Error(error.message);
      return rows.length;
    },
    saveCursor: async (profileId, before, complete) => {
      const patch: Record<string, string> = { history_before: before };
      if (complete) patch.history_complete_at = new Date().toISOString();
      const { error } = await admin.from("strava_connections").update(patch).eq("profile_id", profileId);
      if (error) throw new Error(error.message);
    },
    afterPage: async (profileId) => {
      try {
        const { syncBlocksForUser } = await import("@/lib/zwblokken/sync");
        await syncBlocksForUser(admin, profileId, { maxActivities: HISTORY_PAGE_SIZE });
      } catch {
        // afterComplete en elke volgende webhookrit rekenen de blokken alsnog.
      }
    },
    afterComplete: async (profileId, token) => {
      const { runPostSyncForProfile } = await import("@/lib/strava/post-sync");
      await runPostSyncForProfile(admin, profileId, token, {
        colsDetector: true,
        zwblokken: true,
        milestones: true,
      });
    },
  };
}
