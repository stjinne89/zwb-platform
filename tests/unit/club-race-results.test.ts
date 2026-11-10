import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { clubRaceResults } from "@/lib/racen/club-results";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-11-10T12:00:00Z");
const since = now - 7 * DAY;
const members = new Map([
  ["101", { id: "p-anna", name: "Anna" }],
  ["102", { id: "p-bert", name: "Bert" }],
  ["103", { id: "p-carla", name: "Carla" }],
]);

function snapshot(id: string, startMs: number, groups: Array<[string, Array<[number, number]>]>, type = "RACE") {
  return {
    zwift_event_id: id,
    name: `Zwift ${id}`,
    type,
    subgroups: groups.map(([label, results]) => ({
      label,
      startAt: startMs,
      results: results.map(([profileId, rank]) => ({ profileId, rank })),
    })),
  };
}

const calendar = [
  { id: "e1", title: "ZRL ronde 4", start_at: "2026-11-04T19:00:00Z", zwift_event_id: "1", parent_event_id: "week4" },
  { id: "e1b", title: "ZRL ronde 4 (team 2)", start_at: "2026-11-04T19:05:00Z", zwift_event_id: "1", parent_event_id: "week4" },
  { id: "e2", title: "Tour Ignite", start_at: "2026-11-08T18:00:00Z", zwift_event_id: "2", parent_event_id: null },
  { id: "e3", title: "Oude race", start_at: "2026-10-01T18:00:00Z", zwift_event_id: "3", parent_event_id: null },
  { id: "e4", title: "Groepsrit", start_at: "2026-11-09T18:00:00Z", zwift_event_id: "4", parent_event_id: null },
];

describe("clubRaceResults", () => {
  const races = clubRaceResults(
    [
      snapshot("1", Date.parse("2026-11-04T19:00:00Z"), [
        ["A", [[900, 1], [102, 7], [101, 3]]],
        ["B", [[103, 12]]],
      ]),
      snapshot("2", Date.parse("2026-11-08T18:00:00Z"), [["C", [[101, 4], [555, 1]]]]),
      snapshot("3", Date.parse("2026-10-01T18:00:00Z"), [["A", [[101, 1]]]]),
      snapshot("4", Date.parse("2026-11-09T18:00:00Z"), [["A", [[102, 1]]]], "GROUP_RIDE"),
      snapshot("9", Date.parse("2026-11-09T18:00:00Z"), [["A", [[102, 1]]]]),
      snapshot("5", Date.parse("2026-11-09T18:00:00Z"), [["A", [[900, 1]]]]),
    ],
    calendar,
    members,
    since,
  );

  it("houdt alleen recente races uit de kalender met een ZWB'er in de uitslag", () => {
    // 3 is te oud, 4 een groepsrit, 9 staat niet in de kalender, 5 zonder lid.
    expect(races.map((race) => race.key)).toEqual(["2", "1"]);
  });

  it("geeft de beste ZWB'er per categorie en telt de leden", () => {
    const zrl = races.find((race) => race.key === "1")!;
    expect(zrl.riders).toBe(3);
    expect(zrl.best).toEqual([
      { profileId: "p-anna", name: "Anna", rank: 3, label: "A" },
      { profileId: "p-carla", name: "Carla", rank: 12, label: "B" },
    ]);
  });

  it("linkt een teamevent naar de raceweek erboven", () => {
    expect(races.find((race) => race.key === "1")!.href).toBe("/events/week4");
    expect(races.find((race) => race.key === "2")!.href).toBe("/events/e2");
  });
});
