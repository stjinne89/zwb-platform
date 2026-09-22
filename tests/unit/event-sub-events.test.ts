import { describe, expect, it } from "vitest";
import {
  groupSubEvents,
  subEventLabel,
  withoutParentEvents,
} from "@/lib/events/sub-events";
import { eventGroupFitsMember, type MemberFit } from "@/lib/events/fit";
import { generateZrlRound } from "@/lib/teams/zrl-season";

describe("groupSubEvents", () => {
  it("hangt teamevents onder hun hoofdevent", () => {
    const { topLevel, childrenByParent } = groupSubEvents([
      { id: "w1", parent_event_id: null },
      { id: "w1-a", parent_event_id: "w1" },
      { id: "w1-b1", parent_event_id: "w1" },
      { id: "clubrit", parent_event_id: null },
    ]);
    expect(topLevel.map((e) => e.id)).toEqual(["w1", "clubrit"]);
    expect(childrenByParent.get("w1")?.map((e) => e.id)).toEqual(["w1-a", "w1-b1"]);
  });

  it("laat een teamevent zonder zichtbaar hoofdevent los staan", () => {
    const { topLevel } = groupSubEvents([{ id: "w1-a", parent_event_id: "elders" }]);
    expect(topLevel.map((e) => e.id)).toEqual(["w1-a"]);
  });
});

describe("subEventLabel", () => {
  it("houdt alleen het team over", () => {
    expect(
      subEventLabel("ZRL 2026/27 · R1 · W2 · ZRL A", "ZRL 2026/27 · R1 · W2"),
    ).toBe("ZRL A");
  });

  it("werkt ook bij de Race of Truth", () => {
    const [parent] = generateZrlRound({
      season: "2026/27",
      round: 1,
      firstRaceDate: "2026-09-22",
      raceCount: 1,
      timeLocal: "20:00",
    });
    const [child] = generateZrlRound({
      season: "2026/27",
      round: 1,
      firstRaceDate: "2026-09-22",
      raceCount: 1,
      timeLocal: "20:00",
      teamName: "ZWB Cycling B1",
    });
    expect(parent.title).toBe("ZRL 2026/27 · R1 · W1 — Race of Truth");
    expect(subEventLabel(child.title, parent.title)).toBe("ZWB Cycling B1");
  });

  it("laat een hernoemd teamevent met rust", () => {
    expect(subEventLabel("Onze eigen naam", "ZRL 2026/27 · R1 · W2")).toBe(
      "Onze eigen naam",
    );
  });
});

describe("withoutParentEvents", () => {
  function fakeClient(parentIds: string[]) {
    return {
      from: () => ({
        select: () => ({
          in: async () => ({
            data: parentIds.map((id) => ({ parent_event_id: id })),
          }),
        }),
      }),
    } as never;
  }

  it("haalt hoofdevents weg en laat de rest staan", async () => {
    const rows = [{ id: "w1" }, { id: "w1-a" }, { id: "clubrit" }];
    const result = await withoutParentEvents(fakeClient(["w1", "w1"]), rows);
    expect(result.map((r) => r.id)).toEqual(["w1-a", "clubrit"]);
  });
});

describe("eventGroupFitsMember", () => {
  const member: MemberFit = {
    interests: [],
    teamIds: ["team-b1"],
    declinedEventIds: new Set(),
    committedEventIds: new Set(),
    maxDistanceKm: null,
    maxElevationM: null,
    ceilingSource: "onbekend",
  };
  const parent = { id: "w1", type: "zrl", team_id: null };

  it("past als het eigen team eronder rijdt", () => {
    const verdict = eventGroupFitsMember(
      parent,
      [
        { id: "w1-a", type: "zrl", team_id: "team-a" },
        { id: "w1-b1", type: "zrl", team_id: "team-b1" },
      ],
      member,
    );
    expect(verdict.fits).toBe(true);
  });

  it("past niet als alleen andere teams rijden", () => {
    const verdict = eventGroupFitsMember(
      parent,
      [{ id: "w1-a", type: "zrl", team_id: "team-a" }],
      member,
    );
    expect(verdict).toEqual({ fits: false, reason: "team" });
  });

  it("valt zonder teamevents terug op het event zelf", () => {
    expect(eventGroupFitsMember(parent, [], member).fits).toBe(true);
  });
});
