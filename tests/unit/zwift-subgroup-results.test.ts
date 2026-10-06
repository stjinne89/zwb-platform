import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const safeFetch = vi.fn();
vi.mock("@/lib/net/safe-fetch", () => ({ safeFetch: (...args: unknown[]) => safeFetch(...args) }));

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

function entries(count: number, first = 1) {
  return {
    entries: Array.from({ length: count }, (_, i) => ({
      profileId: first + i,
      rank: first + i,
      activityData: { durationInMilliseconds: 1_800_000 + (first + i) * 1000 },
    })),
  };
}

describe("fetchSubgroupResults", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    safeFetch.mockReset();
    vi.stubEnv("ZWIFT_USERNAME", "service@example.test");
    vi.stubEnv("ZWIFT_PASSWORD", "test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(200, { access_token: "token", expires_in: 3600 })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("vraagt subgroepen na elkaar op, met een pauze ertussen", async () => {
    const startedAt: number[] = [];
    let busy = 0;
    let overlap = false;
    safeFetch.mockImplementation(async () => {
      startedAt.push(Date.now());
      overlap ||= busy > 0;
      busy += 1;
      await new Promise((resolve) => setTimeout(resolve, 100));
      busy -= 1;
      return json(200, entries(3));
    });
    const { fetchSubgroupResults, RESULTS_SPACING_MS } = await import("@/lib/events/zwift-club");

    const all = Promise.all(["1", "2", "3", "4"].map((id) => fetchSubgroupResults(id)));
    await vi.runAllTimersAsync();

    expect((await all).map((results) => results.length)).toEqual([3, 3, 3, 3]);
    expect(overlap).toBe(false);
    for (let i = 1; i < startedAt.length; i++) {
      expect(startedAt[i] - startedAt[i - 1]).toBeGreaterThanOrEqual(RESULTS_SPACING_MS);
    }
  });

  it("probeert het na een 429 opnieuw en bladert door", async () => {
    safeFetch
      .mockResolvedValueOnce(json(429, {}))
      .mockResolvedValueOnce(json(200, entries(50)))
      .mockResolvedValueOnce(json(200, entries(2, 51)));
    const { fetchSubgroupResults } = await import("@/lib/events/zwift-club");

    const results = fetchSubgroupResults("7");
    await vi.runAllTimersAsync();

    expect(await results).toHaveLength(52);
    expect(safeFetch).toHaveBeenCalledTimes(3);
  });

  it("logt één keer in voor verzoeken die tegelijk beginnen", async () => {
    safeFetch.mockImplementation(async () => json(200, {}));
    const { fetchZwiftEvent } = await import("@/lib/events/zwift-club");

    const events = Promise.all(["1", "2", "3"].map((id) => fetchZwiftEvent(id)));
    await vi.runAllTimersAsync();
    await events;

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(safeFetch).toHaveBeenCalledTimes(3);
  });

  it("geeft de fout door als Zwift blijft weigeren", async () => {
    safeFetch.mockImplementation(async () => json(429, {}));
    const { fetchSubgroupResults } = await import("@/lib/events/zwift-club");

    const results = fetchSubgroupResults("7").catch((error: Error) => error.message);
    await vi.runAllTimersAsync();

    expect(await results).toMatch(/status 429/);
    expect(safeFetch).toHaveBeenCalledTimes(3);
  });
});
