import { describe, expect, it } from "vitest";
import {
  HISTORY_PAGE_SIZE,
  MAX_PAGES_PER_RUN,
  nextCursor,
  runStravaHistoryBackfill,
  type HistoryCandidate,
  type HistoryDeps,
  type PageOutcome,
} from "@/lib/strava/history-backfill";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";

function candidate(profile_id: string, history_before: string | null = null): HistoryCandidate {
  return { profile_id, strava_athlete_id: 1, access_token: "t", refresh_token: "r", expires_at: 0, history_before };
}

/** n activiteiten, één per dag terug vanaf `from`. */
function page(n: number, from = "2021-06-01T08:00:00Z", sport = "Ride") {
  return Array.from({ length: n }, (_, i) => ({
    id: Date.parse(from) / 1000 + i,
    sport_type: sport,
    start_date: new Date(Date.parse(from) - i * 86_400_000).toISOString(),
  }));
}

const ok = (activities: ReturnType<typeof page>): PageOutcome => ({ status: "ok", activities });

/**
 * Een Strava-nabootsing: `pages[profiel]` is de reeks antwoorden op elkaar volgende
 * aanroepen. Is de reeks op, dan geeft Strava steeds een volle pagina.
 */
function setup(options: {
  candidates?: HistoryCandidate[] | null;
  oldest?: Record<string, string | null>;
  pages?: Record<string, PageOutcome[]>;
  extra?: Partial<HistoryDeps>;
}) {
  const log = {
    fetched: [] as Array<{ profile: string; before: number }>,
    stored: [] as number[],
    cursors: [] as Array<{ profile: string; before: string; complete: boolean }>,
    afterPage: [] as string[],
    afterComplete: [] as string[],
  };
  const tokens = new Map<string, string>();
  const calls = new Map<string, number>();
  const deps: Partial<HistoryDeps> = {
    now: () => 0,
    loadUsage: async () => null,
    candidates: async () => (options.candidates === undefined ? [candidate(A)] : options.candidates),
    oldestSyncedStart: async (id) =>
      options.oldest && id in options.oldest ? options.oldest[id] : "2021-06-06T07:00:00Z",
    tokenFor: async (c) => {
      tokens.set(`token-${c.profile_id}`, c.profile_id);
      return `token-${c.profile_id}`;
    },
    fetchPage: async (token, before) => {
      const profile = tokens.get(token)!;
      const n = calls.get(profile) ?? 0;
      calls.set(profile, n + 1);
      log.fetched.push({ profile, before });
      const from = new Date(before * 1000 - 3_600_000).toISOString();
      return options.pages?.[profile]?.[n] ?? ok(page(HISTORY_PAGE_SIZE, from));
    },
    storeRides: async (_c, rides) => {
      log.stored.push(rides.length);
      return rides.length;
    },
    saveCursor: async (profile, before, complete) => {
      log.cursors.push({ profile, before, complete });
    },
    afterPage: async (profile) => {
      log.afterPage.push(profile);
    },
    afterComplete: async (profile) => {
      log.afterComplete.push(profile);
    },
    ...options.extra,
  };
  return { deps, log };
}

describe("nextCursor", () => {
  it("schuift naar de oudste activiteit, ook als dat geen fietsrit is", () => {
    const activities = [
      { start_date: "2021-05-01T08:00:00Z" },
      { start_date: "2020-01-01T08:00:00Z" },
    ];
    expect(nextCursor(activities, "2021-06-01T00:00:00Z")).toEqual({
      before: "2020-01-01T08:00:00.000Z",
      complete: true,
    });
  });

  it("is pas klaar bij een onvolle pagina", () => {
    expect(nextCursor(page(HISTORY_PAGE_SIZE), "2021-06-02T00:00:00Z").complete).toBe(false);
    expect(nextCursor([], "2021-06-02T00:00:00Z")).toEqual({
      before: "2021-06-02T00:00:00.000Z",
      complete: true,
    });
  });
});

describe("runStravaHistoryBackfill", () => {
  it("haalt drie pagina's op, elk vanaf de cursor van de vorige", async () => {
    const { deps, log } = setup({});
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(MAX_PAGES_PER_RUN).toBe(3);
    expect(log.fetched).toHaveLength(3);
    expect(log.fetched[0].before).toBe(Date.parse("2021-06-06T07:00:00Z") / 1000);
    for (let i = 1; i < 3; i++) {
      expect(log.fetched[i].before).toBe(Date.parse(log.cursors[i - 1].before) / 1000);
      expect(log.fetched[i].before).toBeLessThan(log.fetched[i - 1].before);
    }
    expect(log.cursors.every((c) => !c.complete)).toBe(true);
    expect(log.afterPage).toEqual([A, A, A]);
    expect(result).toMatchObject({ profileId: A, pages: 3, stored: 300, completed: 0, stopped: "page" });
  });

  it("gaat verder vanaf de opgeslagen cursor", async () => {
    const { deps, log } = setup({ candidates: [candidate(A, "2019-03-01T00:00:00Z")] });
    await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(log.fetched[0].before).toBe(Date.parse("2019-03-01T00:00:00Z") / 1000);
  });

  it("slaat alleen fietsritten op, maar schuift de cursor over de hele pagina", async () => {
    const activities = [...page(50, "2021-06-01T08:00:00Z"), ...page(50, "2021-04-01T08:00:00Z", "Run")];
    const { deps, log } = setup({ pages: { [A]: [ok(activities)] } });
    await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(log.stored[0]).toBe(50);
    expect(log.cursors[0].before).toBe(activities.at(-1)!.start_date);
  });

  it("rondt een lid af en gaat in dezelfde run door met het volgende", async () => {
    const order: string[] = [];
    const { deps, log } = setup({
      candidates: [candidate(A), candidate(B)],
      pages: { [A]: [ok(page(12))] },
      extra: {
        afterComplete: async (p) => { order.push(`klaarstappen ${p.slice(-1)}`); },
        saveCursor: async (p, _b, complete) => { order.push(`${complete ? "klaar" : "cursor"} ${p.slice(-1)}`); },
      },
    });
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(order.slice(0, 4)).toEqual(["cursor a", "klaarstappen a", "klaar a", "cursor b"]);
    expect(log.fetched.map((f) => f.profile)).toEqual([A, B, B]);
    expect(result).toMatchObject({ pages: 3, completed: 1, profileId: B });
  });

  it("rondt ook af als er niets ouder is, zonder op te slaan of blokken te rekenen", async () => {
    const { deps, log } = setup({ pages: { [A]: [ok([])] } });
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(log.stored).toEqual([]);
    expect(log.afterPage).toEqual([]);
    expect(log.afterComplete).toEqual([A]);
    expect(result).toMatchObject({ pages: 1, completed: 1, stopped: "page" });
  });

  it("slaat een lid zonder gesyncte ritten over", async () => {
    const { deps, log } = setup({ candidates: [candidate(A), candidate(B)], oldest: { [A]: null } });
    await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(new Set(log.fetched.map((f) => f.profile))).toEqual(new Set([B]));
  });

  it("gaat naar het volgende lid als Strava een token weigert, maar begrenst dat", async () => {
    const refused = setup({ candidates: [candidate(A), candidate(B)], pages: { [A]: [{ status: "auth_failed" }] } });
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps: refused.deps });
    expect(refused.log.fetched.map((f) => f.profile)).toEqual([A, B, B, B]);
    expect(result).toMatchObject({ profileId: B, pages: 3 });

    const ids = ["1", "2", "3", "4", "5", "6"].map((n) => `00000000-0000-0000-0000-00000000000${n}`);
    const allRefused = setup({
      candidates: ids.map((id) => candidate(id)),
      pages: Object.fromEntries(ids.map((id) => [id, [{ status: "auth_failed" } as PageOutcome]])),
    });
    const capped = await runStravaHistoryBackfill({}, { deadline: 8000, deps: allRefused.deps });
    expect(allRefused.log.fetched).toHaveLength(MAX_PAGES_PER_RUN + 2);
    expect(capped.stopped).toBe("failed");
  });

  it("laat de helft van het kwartierbudget over voor leden", async () => {
    const { deps, log } = setup({
      extra: { loadUsage: async () => ({ shortTermUsed: 200, shortTermLimit: 400, dailyUsed: 10, dailyLimit: 4000 }) },
    });
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(log.fetched).toEqual([]);
    expect(result.stopped).toBe("budget");
  });

  it("neemt geen nieuwe pagina als de run bijna om is", async () => {
    let clock = 0;
    const { deps, log } = setup({
      extra: {
        now: () => clock,
        afterPage: async () => { clock += 2500; },
      },
    });
    // Elke pagina kost 2,5 s: na de tweede is er nog 3 s, te weinig voor een derde.
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(log.fetched).toHaveLength(2);
    expect(result).toMatchObject({ pages: 2, stopped: "page" });

    const late = setup({ extra: { now: () => 5000 } });
    expect((await runStravaHistoryBackfill({}, { deadline: 8000, deps: late.deps })).stopped).toBe("deadline");
    expect(late.log.fetched).toEqual([]);
  });

  it("stopt bij een rate limit en zonder migratie", async () => {
    const limited = setup({ pages: { [A]: [{ status: "rate_limited" }] } });
    expect((await runStravaHistoryBackfill({}, { deadline: 8000, deps: limited.deps })).stopped).toBe("rate_limited");
    expect(limited.log.cursors).toEqual([]);

    const noMigration = setup({ candidates: null });
    expect((await runStravaHistoryBackfill({}, { deadline: 8000, deps: noMigration.deps })).stopped).toBe("no_migration");
  });

  it("stopt zonder cursor als een volle pagina oud-naar-nieuw terugkomt", async () => {
    const { deps, log } = setup({ pages: { [A]: [ok(page(HISTORY_PAGE_SIZE).reverse())] } });
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(result.stopped).toBe("failed");
    expect(log.stored).toEqual([]);
    expect(log.cursors).toEqual([]);
  });

  it("meldt klaar als niemand meer werk heeft", async () => {
    const { deps } = setup({ candidates: [] });
    expect((await runStravaHistoryBackfill({}, { deadline: 8000, deps })).stopped).toBe("done");
  });
});
