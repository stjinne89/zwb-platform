import { describe, expect, it } from "vitest";
import {
  HISTORY_PAGE_SIZE,
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
    id: 1000 + i,
    sport_type: sport,
    start_date: new Date(Date.parse(from) - i * 86_400_000).toISOString(),
  }));
}

function setup(options: {
  candidates?: HistoryCandidate[] | null;
  oldest?: Record<string, string | null>;
  pages?: Record<string, PageOutcome>;
  extra?: Partial<HistoryDeps>;
}) {
  const log = {
    fetched: [] as Array<{ profile: string; before: number }>,
    stored: [] as number[],
    cursors: [] as Array<{ profile: string; before: string; complete: boolean }>,
    afterPage: [] as string[],
    afterComplete: [] as string[],
  };
  let current = "";
  const deps: Partial<HistoryDeps> = {
    now: () => 0,
    loadUsage: async () => null,
    candidates: async () => (options.candidates === undefined ? [candidate(A)] : options.candidates),
    oldestSyncedStart: async (id) =>
      options.oldest && id in options.oldest ? options.oldest[id] : "2021-06-06T07:00:00Z",
    tokenFor: async (c) => {
      current = c.profile_id;
      return `token-${c.profile_id}`;
    },
    fetchPage: async (_token, before) => {
      log.fetched.push({ profile: current, before });
      return options.pages?.[current] ?? { status: "ok", activities: page(HISTORY_PAGE_SIZE) };
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
  it("haalt één pagina op vanaf de oudste rit van de gewone sync", async () => {
    const { deps, log } = setup({});
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(log.fetched).toEqual([{ profile: A, before: Date.parse("2021-06-06T07:00:00Z") / 1000 }]);
    expect(log.stored).toEqual([HISTORY_PAGE_SIZE]);
    expect(log.cursors).toEqual([
      { profile: A, before: page(HISTORY_PAGE_SIZE).at(-1)!.start_date, complete: false },
    ]);
    expect(log.afterPage).toEqual([A]);
    expect(log.afterComplete).toEqual([]);
    expect(result).toMatchObject({ profileId: A, stored: 100, complete: false, stopped: "page" });
  });

  it("gaat verder vanaf de opgeslagen cursor", async () => {
    const { deps, log } = setup({ candidates: [candidate(A, "2019-03-01T00:00:00Z")] });
    await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(log.fetched[0].before).toBe(Date.parse("2019-03-01T00:00:00Z") / 1000);
  });

  it("slaat alleen fietsritten op, maar schuift de cursor over de hele pagina", async () => {
    const activities = [...page(50, "2021-06-01T08:00:00Z"), ...page(50, "2021-04-01T08:00:00Z", "Run")];
    const { deps, log } = setup({ pages: { [A]: { status: "ok", activities } } });
    await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(log.stored).toEqual([50]);
    expect(log.cursors[0].before).toBe(activities.at(-1)!.start_date);
  });

  it("rondt een lid af bij een onvolle pagina: eerst de stappen, dan klaar", async () => {
    const order: string[] = [];
    const { deps, log } = setup({
      pages: { [A]: { status: "ok", activities: page(12) } },
      extra: {
        afterComplete: async () => { order.push("afterComplete"); },
        saveCursor: async (_p, _b, complete) => { order.push(complete ? "klaar" : "cursor"); },
      },
    });
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(order).toEqual(["cursor", "afterComplete", "klaar"]);
    expect(log.stored).toEqual([12]);
    expect(result.complete).toBe(true);
  });

  it("rondt ook af als er niets ouder is, zonder op te slaan of blokken te rekenen", async () => {
    const { deps, log } = setup({ pages: { [A]: { status: "ok", activities: [] } } });
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(log.stored).toEqual([]);
    expect(log.afterPage).toEqual([]);
    expect(log.afterComplete).toEqual([A]);
    expect(result.complete).toBe(true);
  });

  it("slaat een lid zonder gesyncte ritten over", async () => {
    const { deps, log } = setup({ candidates: [candidate(A), candidate(B)], oldest: { [A]: null } });
    await runStravaHistoryBackfill({}, { deadline: 8000, deps });
    expect(log.fetched.map((f) => f.profile)).toEqual([B]);
  });

  it("gaat naar het volgende lid als Strava een token weigert, maar begrenst dat", async () => {
    const refused = setup({ candidates: [candidate(A), candidate(B)], pages: { [A]: { status: "auth_failed" } } });
    const result = await runStravaHistoryBackfill({}, { deadline: 8000, deps: refused.deps });
    expect(refused.log.fetched.map((f) => f.profile)).toEqual([A, B]);
    expect(result.profileId).toBe(B);

    const ids = ["1", "2", "3", "4"].map((n) => `00000000-0000-0000-0000-00000000000${n}`);
    const allRefused = setup({
      candidates: ids.map((id) => candidate(id)),
      pages: Object.fromEntries(ids.map((id) => [id, { status: "auth_failed" } as PageOutcome])),
    });
    const capped = await runStravaHistoryBackfill({}, { deadline: 8000, deps: allRefused.deps });
    expect(allRefused.log.fetched).toHaveLength(3);
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

  it("stopt ruim voor de deadline, bij een rate limit en zonder migratie", async () => {
    const late = setup({ extra: { now: () => 4500 } });
    expect((await runStravaHistoryBackfill({}, { deadline: 8000, deps: late.deps })).stopped).toBe("deadline");
    expect(late.log.fetched).toEqual([]);

    const limited = setup({ pages: { [A]: { status: "rate_limited" } } });
    expect((await runStravaHistoryBackfill({}, { deadline: 8000, deps: limited.deps })).stopped).toBe("rate_limited");
    expect(limited.log.cursors).toEqual([]);

    const noMigration = setup({ candidates: null });
    expect((await runStravaHistoryBackfill({}, { deadline: 8000, deps: noMigration.deps })).stopped).toBe("no_migration");
  });

  it("stopt zonder cursor als een volle pagina oud-naar-nieuw terugkomt", async () => {
    const { deps, log } = setup({ pages: { [A]: { status: "ok", activities: page(HISTORY_PAGE_SIZE).reverse() } } });
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
