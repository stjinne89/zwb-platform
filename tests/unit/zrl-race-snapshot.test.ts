import { describe, expect, it } from "vitest";
import { raceSettled, subgroupSettled, type RaceData } from "@/lib/zrl-live/snapshot";

const MIN = 60 * 1000;
const START = 1_000_000_000_000;

/** Drie renners; 1 en 2 finishen na 40 minuten, 3 rijdt nog of is uitgestapt. */
function race({
  finishers = [1, 2],
  lastPassOf3 = 30 * MIN,
  resultsOk = true,
  segmentsOk = true,
  now = 45 * MIN,
}: {
  finishers?: number[];
  lastPassOf3?: number;
  resultsOk?: boolean;
  segmentsOk?: boolean;
  now?: number;
} = {}): RaceData {
  const passage = (athleteId: number, at: number) => ({
    id: `${athleteId}:${at}`,
    athleteId,
    segmentId: "S",
    ts: START + at,
    elapsed: 20,
  });
  return {
    fetchedAt: START + now,
    eventName: "Zwift Racing League",
    format: "points",
    subgroups: [
      {
        id: "1",
        label: "B",
        startAt: START,
        routeId: "1",
        laps: 1,
        entrants: [1, 2, 3].map((id) => ({ zwiftId: String(id), name: `Renner ${id}` })),
        results: finishers.map((profileId, i) => ({ profileId, rank: i + 1, durationMs: 40 * MIN + i * 1000 })),
        resultsOk,
      },
      // Lege groep: telt niet mee.
      { id: "2", label: "D", startAt: START, routeId: "1", laps: 1, entrants: [], results: [], resultsOk: true },
    ],
    passages: [passage(1, 10 * MIN), passage(2, 10 * MIN), passage(3, 10 * MIN), passage(3, lastPassOf3)],
    segmentsOk,
  };
}

describe("bevriezen van de Zwift-data", () => {
  it("bevriest twee minuten nadat iedereen die begon binnen is", () => {
    const data = race({ finishers: [1, 2, 3], now: 41 * MIN });
    expect(raceSettled(data)).toBe(false);
    expect(raceSettled({ ...data, fetchedAt: START + 43 * MIN })).toBe(true);
  });

  it("wacht op een renner die nog onderweg is, tot het een kwartier stil is", () => {
    expect(raceSettled(race({ lastPassOf3: 44 * MIN, now: 45 * MIN }))).toBe(false);
    // Renner 3 stapte na 30 minuten uit: een kwartier na de laatste finish is het klaar.
    expect(raceSettled(race({ now: 50 * MIN }))).toBe(false);
    expect(raceSettled(race({ now: 56 * MIN }))).toBe(true);
  });

  it("bevriest niet zonder uitslag of met haperende Zwift-data", () => {
    expect(raceSettled(race({ finishers: [], now: 3 * 60 * MIN }))).toBe(false);
    expect(raceSettled(race({ finishers: [1, 2, 3], resultsOk: false }))).toBe(false);
    expect(raceSettled(race({ finishers: [1, 2, 3], segmentsOk: false }))).toBe(false);
  });

  it("laat doorfietsen na de finish de stand niet openhouden", () => {
    const data = race({ finishers: [1, 2, 3], now: 43 * MIN });
    // Renner 1 rijdt na de finish nog over de sprint.
    data.passages.push({ id: "uitrijden", athleteId: 1, segmentId: "S", ts: START + 42 * MIN, elapsed: 20 });
    expect(subgroupSettled(data.subgroups[0], data.passages, data.fetchedAt)).toBe(true);
  });
});
