import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FALLBACK_HEIGHT_CM,
  buildZwiftGopherPayload,
  notFoundZwiftId,
  optimizeWithZwiftGopher,
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
    rider({ zwiftId: "333", name: "Cas", displayOrder: 2 }),
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

  beforeEach(() => {
    vi.stubEnv("ZWIFTGOPHER_API_KEY", "test-key");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("stuurt één onbekende renner opnieuw met eigen waarden", async () => {
    stubZwiftGopher(["222"]);
    const result = await optimizeWithZwiftGopher(plan(riders));

    expect(sent).toHaveLength(2);
    expect(sent[1].riders).toEqual([111, 333]);
    expect(sent[1].custom_riders?.map((row) => row.name)).toEqual(["Bram"]);
    expect(result.ownValueRiders).toEqual(["Bram"]);
  });

  it("rekent bij een tweede weigering voor iedereen met eigen waarden", async () => {
    stubZwiftGopher(["111", "222", "333"]);
    const result = await optimizeWithZwiftGopher(plan(riders));

    expect(sent).toHaveLength(3);
    expect(sent[2].riders).toBeUndefined();
    expect(sent[2].custom_riders?.map((row) => row.name)).toEqual(["Anna", "Bram", "Cas"]);
    expect(result.ownValueRiders).toEqual(["Anna", "Bram", "Cas"]);
  });

  it("vraagt om FTP en Kg als die ontbreken", async () => {
    stubZwiftGopher(["111"]);
    await expect(
      optimizeWithZwiftGopher(plan([rider({ zwiftId: "111", name: "Anna", ftpWatts: null }), riders[1]])),
    ).rejects.toThrow("ZwiftGopher vindt Anna niet. Vul FTP en Kg in.");
    expect(sent).toHaveLength(1);
  });

  it("geeft andere fouten ongewijzigd door", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ message: "No upcoming ZRL races found" }), { status: 404 })),
    );
    await expect(optimizeWithZwiftGopher(plan(riders))).rejects.toThrow("No upcoming ZRL races found");
  });
});
