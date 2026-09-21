import { describe, expect, it } from "vitest";
import {
  formatZrlPlacement,
  parseZrlPlacement,
  pickZrlEventPerTeam,
} from "@/lib/teams/wtrl-results";

describe("parseZrlPlacement", () => {
  it("leest league, divisie, race en ronde uit een ZRL-event van Zwift", () => {
    const placement = parseZrlPlacement(
      "Zwift Racing League 26/27: Fresh & Fast: Open Aqua League Division 1 - Race 1",
      "ZRL 2026/27 Season: Round 1 - Race: 1 of 6 (RACE OF TRUTH)",
    );
    expect(placement).toEqual({ round: 1, race: 1, league: "Open Aqua League", division: 1 });
    expect(formatZrlPlacement(placement!)).toBe(
      "Round 1 · Race 1 · Open Aqua League · Division 1",
    );
  });

  it("kent ook de development- en vrouwenleagues", () => {
    expect(
      parseZrlPlacement("Zwift Racing League 26/27: Fresh & Fast: Open Dev Aqua League Division 3 - Race 2")
        ?.league,
    ).toBe("Open Dev Aqua League");
    expect(
      parseZrlPlacement("Zwift Racing League 26/27: Fresh & Fast: Womens Mint League Division 1 - Race 1"),
    ).toMatchObject({ league: "Womens Mint League", division: 1, round: null });
  });

  it("geeft null bij een event dat geen ZRL-divisie noemt", () => {
    expect(parseZrlPlacement("ZWB Social Ride")).toBeNull();
    expect(parseZrlPlacement(null)).toBeNull();
  });
});

describe("pickZrlEventPerTeam", () => {
  const now = new Date("2026-09-30T12:00:00Z");

  it("kiest de laatst gestarte race, anders de eerstvolgende", () => {
    const picked = pickZrlEventPerTeam(
      [
        { team_id: "a", start_at: "2026-09-22T18:00:00Z", zwift_event_id: 1 },
        { team_id: "a", start_at: "2026-09-29T18:00:00Z", zwift_event_id: 2 },
        { team_id: "a", start_at: "2026-10-06T18:00:00Z", zwift_event_id: 3 },
        { team_id: "b", start_at: "2026-10-13T18:00:00Z", zwift_event_id: 5 },
        { team_id: "b", start_at: "2026-10-06T18:00:00Z", zwift_event_id: 4 },
        { team_id: "c", start_at: "2026-09-22T18:00:00Z", zwift_event_id: null },
      ],
      now,
    );
    expect(picked.get("a")?.zwift_event_id).toBe(2);
    expect(picked.get("b")?.zwift_event_id).toBe(4);
    expect(picked.has("c")).toBe(false);
  });
});
