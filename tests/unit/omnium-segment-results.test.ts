import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bestSegmentTimes,
  segmentWindow,
  sprintSegmentOptions,
  zwiftEventStart,
  SEGMENT_WINDOW_MARGIN_MS,
} from "@/lib/omnium/segment-results";
import { scoreParsedRows, zwiftModeFor } from "@/lib/omnium/import";
import { prepareResultInput } from "@/lib/omnium/result-input";
import { resolveScoring } from "@/lib/omnium/scales";
import type { SegmentResult } from "@/lib/zwift/segment-results-pb";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/zwift/segment-results-sprint.json", import.meta.url), "utf8"),
) as {
  segmentId: string;
  startsAt: string;
  durationMinutes: number;
  entrants: Array<{ zwiftId: string; name: string; league: string | null }>;
  passes: SegmentResult[];
};

const START = Date.parse("2026-10-11T18:15:00Z");
const window = { windowStart: START, windowEnd: START + 15 * 60_000 };

let nextId = 1;
function pass(athleteId: number, secondsAfterStart: number, elapsed: number, overrides: Partial<SegmentResult> = {}): SegmentResult {
  return {
    id: String(nextId++),
    athleteId,
    segmentId: "1059797545",
    eventSubgroupId: null,
    firstName: "Zwift",
    lastName: `Naam ${athleteId}`,
    worldTime: 0,
    ts: START + secondsAfterStart * 1000,
    elapsed,
    avgPower: 700,
    weightKg: 75,
    ...overrides,
  };
}

const entrants = [
  { zwiftId: "1", name: "Een", league: "DIAMOND-RUBY" },
  { zwiftId: "2", name: "Twee", league: "DIAMOND-RUBY" },
];

describe("bestSegmentTimes", () => {
  it("telt per renner de snelste passage", () => {
    const { rows } = bestSegmentTimes({
      ...window,
      entrants,
      passes: [pass(1, 60, 29.1), pass(1, 300, 28.4), pass(1, 600, 28.9), pass(2, 120, 28.7)],
    });
    expect(rows.map((r) => [r.zwiftId, r.segmentSeconds])).toEqual([["1", 28.4], ["2", 28.7]]);
    expect(rows.map((r) => r.lineNumber)).toEqual([1, 2]);
    expect(rows.every((r) => r.position === null && r.status === "finished")).toBe(true);
  });

  it("negeert passages buiten het venster", () => {
    const { rows } = bestSegmentTimes({
      ...window,
      entrants,
      passes: [pass(1, -1, 20), pass(1, 15 * 60 + 1, 21), pass(1, 0, 30), pass(1, 15 * 60, 29)],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].segmentSeconds).toBe(29);
  });

  it("telt een dubbele passage-id één keer", () => {
    const outsider = pass(9, 60, 27);
    const { rows, warnings } = bestSegmentTimes({
      ...window,
      entrants,
      passes: [pass(1, 60, 29, { id: "x" }), pass(1, 60, 29, { id: "x" }), outsider, { ...outsider }],
    });
    expect(rows).toHaveLength(1);
    expect(warnings).toContain("1 passage van renners buiten de startlijst.");
  });

  it("laat renners buiten de startlijst weg en telt hun passages", () => {
    const { rows, warnings } = bestSegmentTimes({
      ...window,
      entrants,
      passes: [pass(1, 60, 29), pass(2, 70, 30), pass(7, 80, 25), pass(7, 400, 24), pass(8, 90, 26)],
    });
    expect(rows.map((r) => r.zwiftId)).toEqual(["1", "2"]);
    expect(warnings).toContain("3 passages van renners buiten de startlijst.");
  });

  it("waarschuwt voor ingeschreven renners zonder passage", () => {
    const { rows, warnings } = bestSegmentTimes({ ...window, entrants, passes: [pass(1, 60, 29)] });
    expect(rows).toHaveLength(1);
    expect(warnings).toEqual(["1 ingeschreven renner zonder passage: Twee."]);
  });

  it("neemt league en naam uit de startlijst, niet uit de passage", () => {
    const { rows } = bestSegmentTimes({
      ...window,
      entrants: [{ zwiftId: "1", name: "Startlijstnaam", league: "EMERALD-SAPPHIRE" }],
      passes: [pass(1, 60, 29, { eventSubgroupId: 123456, firstName: "Andere", lastName: "Naam [TAG]" })],
    });
    expect(rows[0]).toMatchObject({ name: "Startlijstnaam", league: "EMERALD-SAPPHIRE", zwiftId: "1" });
  });

  it("laat een renner zonder league weg, met waarschuwing", () => {
    const { rows, warnings } = bestSegmentTimes({
      ...window,
      entrants: [{ zwiftId: "1", name: "Zonder", league: null }],
      passes: [pass(1, 60, 29)],
    });
    expect(rows).toEqual([]);
    expect(warnings).toEqual(["Zonder league, niet meegeteld: Zonder."]);
  });

  it("houdt de milliseconden", () => {
    const { rows } = bestSegmentTimes({
      ...window,
      entrants,
      passes: [pass(1, 60, 28.417), pass(2, 60, 28.418)],
    });
    expect(rows.map((r) => r.segmentSeconds)).toEqual([28.417, 28.418]);
    expect(rows[0].timeText).toBe("28.417");
  });
});

describe("Sprint Quali uit de fixture", () => {
  const { windowStart, windowEnd } = segmentWindow(fixture.startsAt, fixture.durationMinutes);
  const result = bestSegmentTimes({ passes: fixture.passes, entrants: fixture.entrants, windowStart, windowEnd });

  it("haalt de snelste tijd per ingeschreven renner uit echte passagevorm", () => {
    expect(result.rows.map((r) => [r.name, r.league, r.segmentSeconds])).toEqual([
      ["Anna Voorbeeld", "DIAMOND-RUBY", 27.983],
      ["Bram Testrijder", "DIAMOND-RUBY", 29.004],
      ["Chris Proef", "EMERALD-SAPPHIRE", 31.25],
    ]);
    expect(result.warnings).toEqual([
      "3 passages van renners buiten de startlijst.",
      "1 ingeschreven renner zonder passage: Dirk Nulpunt.",
    ]);
  });

  it("gaat door dezelfde pijplijn als een geplakte uitslag en rangschikt op tijd", () => {
    const prepared = prepareResultInput({ raw: "", mode: zwiftModeFor("sprint"), parsedRows: result.rows }, "sprint");
    const scored = scoreParsedRows(prepared.rows, {
      discipline: "sprint",
      mode: zwiftModeFor("sprint"),
      scoring: resolveScoring(null),
      idOf: (row) => row.zwiftId ?? row.name,
    });
    const byRider = Object.fromEntries(scored.map((s) => [s.riderId, s]));
    expect(byRider["1001"]).toMatchObject({ league: "DIAMOND-RUBY", position: 1, segmentSeconds: 27.983 });
    expect(byRider["1002"]).toMatchObject({ league: "DIAMOND-RUBY", position: 2 });
    expect(byRider["1003"]).toMatchObject({ league: "EMERALD-SAPPHIRE", position: 1 });
    expect(byRider["1001"].points).toBeGreaterThan(byRider["1002"].points);
  });
});

describe("Sprint Quali in de invoerpijplijn", () => {
  it("weigert Zwift-regels zonder segmenttijd", () => {
    const rows = bestSegmentTimes({ ...window, entrants, passes: [pass(1, 60, 29)] }).rows;
    expect(() =>
      prepareResultInput({ raw: "", mode: "segment", parsedRows: [{ ...rows[0], segmentSeconds: null }] }, "sprint"),
    ).toThrow("Sprint Quali vereist segmenttijden.");
  });

  it("gebruikt voor een Zwift-uitslag per onderdeel de juiste rangschikking", () => {
    expect(zwiftModeFor("sprint")).toBe("segment");
    expect(zwiftModeFor("crit")).toBe("crit_detailed");
    expect(zwiftModeFor("scratch")).toBe("finish");
    expect(zwiftModeFor("prologue")).toBe("finish");
  });
});

describe("segmentWindow", () => {
  it("loopt van start tot start plus duur, met marge", () => {
    expect(segmentWindow("2026-10-11T18:15:00Z", 15)).toEqual({
      windowStart: START - SEGMENT_WINDOW_MARGIN_MS,
      windowEnd: START + 15 * 60_000 + SEGMENT_WINDOW_MARGIN_MS,
    });
  });
});

describe("sprintSegmentOptions", () => {
  it("geeft de segmenten van de route uniek en in rijvolgorde, ook negatieve ID's", () => {
    const options = sprintSegmentOptions({ eventSubgroups: [{ routeId: 565111133 }, { routeId: "565111133" }] });
    expect(options.map((o) => o.name)).toEqual([
      "Champs-Élysées",
      "Lutece Sprint",
      "Monceau Sprint",
      "Montmartre KOM",
      "Tchou Tchou Sprint",
    ]);
    expect(options.at(-1)?.segmentId).toBe("-9223372035804541048");
  });

  it("is leeg bij een onbekende of ontbrekende route", () => {
    expect(sprintSegmentOptions({ eventSubgroups: [{ routeId: 1 }, {}] })).toEqual([]);
    expect(sprintSegmentOptions(null)).toEqual([]);
  });
});

describe("zwiftEventStart", () => {
  it("neemt de vroegste subgroepstart", () => {
    expect(
      zwiftEventStart({
        eventSubgroups: [{ eventSubgroupStart: "2026-10-11T18:16:00.000+0000" }, { eventSubgroupStart: "2026-10-11T18:15:00Z" }],
      }),
    ).toBe(START);
    expect(zwiftEventStart({ eventSubgroups: [{}] })).toBeNull();
  });
});
