import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FALLBACK_HEIGHT_CM,
  buildZwiftGopherPayload,
  notFoundZwiftId,
  optimizeWithZwiftGopher,
  type ZwiftGopherError,
} from "@/lib/ttt/zwiftgopher";
import { DEFAULT_TTT_SETTINGS, type TttPlanInput, type TttPlanRiderInput } from "@/lib/ttt/types";

function rider(patch: Partial<TttPlanRiderInput>): TttPlanRiderInput {
  return {
    profileId: null,
    isManual: false,
    zwiftId: "",
    name: "Renner",
    ftpWatts: 250,
    weightKg: 75,
    heightCm: null,
    power300Watts: 320,
    pullWatts: 250,
    pullDurationSeconds: 30,
    displayOrder: 0,
    role: null,
    notes: null,
    ...patch,
  };
}

function plan(riders: TttPlanRiderInput[]): TttPlanInput {
  return {
    name: "Plan",
    eventId: null,
    parentTeamId: "team-b",
    teamId: "team-b1",
    settings: DEFAULT_TTT_SETTINGS,
    riders,
  };
}

const NOT_FOUND = (index: number, id: string) =>
  `Rider ${index} (ID: ${id}) not found - check that the Zwift ID is correct`;

describe("renner die ZwiftGopher niet vindt", () => {
  it("leest het Zwift-ID uit de melding", () => {
    expect(notFoundZwiftId(NOT_FOUND(1, "1778335"))).toBe("1778335");
    expect(notFoundZwiftId("No upcoming ZRL races found")).toBeNull();
  });

  it("gaat mee als aangepaste renner, met de standaardlengte als Cm leeg is", () => {
    const payload = buildZwiftGopherPayload(
      plan([
        rider({ zwiftId: "111", name: "Anna", displayOrder: 0 }),
        rider({ zwiftId: "222", name: "Bram", heightCm: 188, displayOrder: 1 }),
        rider({ zwiftId: "333", name: "Cas", displayOrder: 2 }),
      ]),
      new Set(["111", "222"]),
    );

    expect(payload.riders).toEqual([333]);
    expect(payload.custom_riders).toEqual([
      { name: "Anna", ftp: 250, weight: 75, height: FALLBACK_HEIGHT_CM, power_300_watts: 320 },
      { name: "Bram", ftp: 250, weight: 75, height: 188, power_300_watts: 320 },
    ]);
    expect(Object.keys(payload.rider_overrides ?? {})).toEqual(["333"]);
  });

  it("blijft een ID-renner zonder FTP of gewicht", () => {
    const payload = buildZwiftGopherPayload(
      plan([rider({ zwiftId: "111", name: "Anna", weightKg: null })]),
      new Set(["111"]),
    );
    expect(payload.riders).toEqual([111]);
    expect(payload.custom_riders).toBeUndefined();
  });
});

describe("optimizeWithZwiftGopher", () => {
  const riders = [
    rider({ zwiftId: "111", name: "Anna", displayOrder: 0 }),
    rider({ zwiftId: "222", name: "Bram", displayOrder: 1 }),
    rider({ zwiftId: "333", name: "Cas", ftpWatts: null, displayOrder: 2 }),
  ];
  let sent: Array<{ riders?: number[]; custom_riders?: Array<{ name: string }> }>;

  /** Doet alsof ZwiftGopher de genoemde ID's niet kent. */
  function stubZwiftGopher(unknown: string[]) {
    sent = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const payload = JSON.parse(init.body);
        sent.push(payload);
        const ids = ((payload.riders ?? []) as number[]).map(String);
        const missing = ids.find((id) => unknown.includes(id));
        if (missing) {
          return new Response(
            JSON.stringify({ success: false, message: NOT_FOUND(ids.indexOf(missing) + 1, missing) }),
            { status: 400 },
          );
        }
        return new Response(JSON.stringify({ success: true, data: { riders: [] } }), { status: 200 });
      }),
    );
  }

  async function failure(run: Promise<unknown>) {
    return run.then(
      () => {
        throw new Error("had moeten falen");
      },
      (err: ZwiftGopherError) => err,
    );
  }

  beforeEach(() => {
    vi.stubEnv("ZWIFTGOPHER_API_KEY", "test-key");
    vi.useFakeTimers({ now: new Date("2026-10-12T12:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("noemt de renner die niet gevonden is, zonder tweede verzoek", async () => {
    stubZwiftGopher(["222"]);
    const error = await failure(optimizeWithZwiftGopher(plan(riders)));

    expect(sent).toHaveLength(1);
    expect(error.notFound?.name).toBe("Bram");
    expect(error.retryAt).toBe(Date.parse("2026-10-12T12:01:00Z"));
  });

  it("rekent met eigen waarden voor wie FTP en gewicht heeft", async () => {
    stubZwiftGopher(["111", "222"]);
    const result = await optimizeWithZwiftGopher(plan(riders), { ownValues: true });

    expect(sent).toHaveLength(1);
    expect(sent[0].riders).toEqual([333]);
    expect(sent[0].custom_riders?.map((row) => row.name)).toEqual(["Anna", "Bram"]);
    expect(result.ownValueRiders).toBe(2);
  });

  it("meldt een renner zonder eigen waarden die ook dan niet gevonden wordt", async () => {
    stubZwiftGopher(["333"]);
    const error = await failure(optimizeWithZwiftGopher(plan(riders), { ownValues: true }));
    expect(error.notFound?.name).toBe("Cas");
  });

  it("zet de limiet van ZwiftGopher om in een tijdstip", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ message: "API rate limit exceeded: 1 request per 60 seconds" }),
            { status: 429, headers: { "X-RateLimit-Reset": "1791804452" } },
          ),
      ),
    );
    const error = await failure(optimizeWithZwiftGopher(plan(riders)));

    expect(error.message).toBe("ZwiftGopher staat één verzoek per minuut toe.");
    expect(error.statusCode).toBe(429);
    expect(error.retryAt).toBe(1791804452000);
    expect(error.notFound).toBeUndefined();
  });

  it("geeft andere fouten ongewijzigd door", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ message: "No upcoming ZRL races found" }), { status: 404 })),
    );
    const error = await failure(optimizeWithZwiftGopher(plan(riders)));
    expect(error.message).toBe("No upcoming ZRL races found");
    expect(error.retryAt).toBeUndefined();
  });
});
