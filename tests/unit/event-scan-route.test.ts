import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runEventScan = vi.fn();
const syncUpcomingOmniumEntrants = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/events/scan-runner", () => ({
  SCAN_STEPS: ["follow", "scan", "feed"],
  runEventScan: (...args: unknown[]) => runEventScan(...args),
}));
vi.mock("@/lib/omnium/zwift-entrants", () => ({
  syncUpcomingOmniumEntrants: (...args: unknown[]) => syncUpcomingOmniumEntrants(...args),
}));

const { POST } = await import("@/app/api/events/scan/route");

function call(query = "", secret = "geheim") {
  return POST(
    new Request(`https://example.test/api/events/scan${query}`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    }),
  );
}

describe("POST /api/events/scan", () => {
  beforeEach(() => {
    vi.stubEnv("EVENT_SCAN_SECRET", "geheim");
    runEventScan.mockReset().mockResolvedValue({ found: 0, error: null, notes: [] });
    syncUpcomingOmniumEntrants.mockReset().mockResolvedValue({ synced: 0, failures: [] });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("weigert een verkeerde sleutel", async () => {
    expect((await call("", "fout")).status).toBe(401);
    expect(runEventScan).not.toHaveBeenCalled();
  });

  it("weigert een onbekende stap", async () => {
    expect((await call("?step=alles")).status).toBe(400);
  });

  it("draait zonder stap alles", async () => {
    const body = await (await call()).json();
    expect(runEventScan.mock.calls[0][1].steps).toEqual(["follow", "scan", "feed"]);
    expect(syncUpcomingOmniumEntrants).toHaveBeenCalled();
    expect(body.ok).toBe(true);
  });

  it("draait met een stap alleen dat onderdeel", async () => {
    await call("?step=feed");
    expect(runEventScan.mock.calls[0][1].steps).toEqual(["feed"]);
    expect(syncUpcomingOmniumEntrants).not.toHaveBeenCalled();

    runEventScan.mockClear();
    const body = await (await call("?step=omnium")).json();
    expect(runEventScan).not.toHaveBeenCalled();
    expect(body.omnium).toEqual({ synced: 0, failures: [] });
  });
});
