import { describe, expect, it } from "vitest";
import {
  parseWtrlTeamDivision,
  parseZwiftZrlEventName,
  zrlEventLink,
} from "@/lib/events/zrl-event-link";
import { mapZwiftEvent, type ZwiftEventInfo } from "@/lib/events/zwift-route";
// De publieke lijst met tags=wtrl van 2026-10-10, ingekort tot vijf events.
import rows from "../fixtures/zwift/wtrl-events.json";

const candidates = rows.flatMap((row) => mapZwiftEvent(row) ?? []) as ZwiftEventInfo[];
const empty = { external_url: null, gpx_path: null };
const RACE_DAY = "2026-10-13";

describe("divisie lezen", () => {
  it("leest wat de beheerder van WTRL My Teams plakt", () => {
    expect(parseWtrlTeamDivision("Open Aqua Dev League Division B3")).toEqual({
      women: false,
      development: true,
      league: "aqua",
      number: 3,
      category: "B",
    });
    expect(parseWtrlTeamDivision("Womens Mint League Division B1")).toMatchObject({
      women: true,
      development: false,
      league: "mint",
      number: 1,
    });
    expect(parseWtrlTeamDivision("Aqua B1")).toBeNull();
    expect(parseWtrlTeamDivision(null)).toBeNull();
  });

  it("leest de naam van het Zwift-event, met Dev vóór de league", () => {
    expect(
      parseZwiftZrlEventName(
        "Zwift Racing League 26/27: Fast & Fresh : Open Dev Aqua League Division 3 - Race 3",
      ),
    ).toEqual({ women: false, development: true, league: "aqua", number: 3 });
    expect(
      parseZwiftZrlEventName(
        "Zwift Racing League 26/27: Fast & Fresh : Women's Mint League Division 1 - Race 3",
      ),
    ).toEqual({ women: true, development: false, league: "mint", number: 1 });
    expect(parseZwiftZrlEventName("Zwift Racing League Recon Ride (DIRT)")).toBeNull();
  });
});

describe("het Zwift-event van een teamrace", () => {
  it("koppelt het event van de divisie, met de start van de eigen subgroep", () => {
    const link = zrlEventLink(empty, "Open Aqua League Division B1", RACE_DAY, candidates)!;
    expect(link.zwift_event_id).toBe(5737462);
    expect(link.start_at).toBe("2026-10-13T18:01:00.000Z");
    expect(link.external_url).toBe("https://www.zwift.com/events/view/5737462");
    expect(link.zwift_event_type).toBe("TEAM_TIME_TRIAL");
    expect(link.zwift_route_id).toBe(553661379);
    expect(link.laps).toBe(1);
    expect(link.distance_km).toBeCloseTo(29.9, 1);
  });

  it("houdt Open, Development en Women uit elkaar", () => {
    const id = (division: string) =>
      zrlEventLink(empty, division, RACE_DAY, candidates)?.zwift_event_id ?? null;
    expect(id("Open Aqua League Division A1")).toBe(5737462);
    expect(id("Open Aqua League Division B4")).toBe(5737452);
    expect(id("Open Aqua Dev League Division B3")).toBe(5737449);
    expect(id("Womens Mint League Division B1")).toBe(5737430);
  });

  it("koppelt niets zonder eigen subgroep, divisie of event op die dag", () => {
    // Division 4 heeft alleen B en C.
    expect(zrlEventLink(empty, "Open Aqua League Division A4", RACE_DAY, candidates)).toBeNull();
    expect(zrlEventLink(empty, "Open Aqua League Division B2", RACE_DAY, candidates)).toBeNull();
    expect(zrlEventLink(empty, null, RACE_DAY, candidates)).toBeNull();
    expect(zrlEventLink(empty, "Open Aqua League Division B1", "2026-10-20", candidates)).toBeNull();
  });

  it("koppelt niets als twee events passen", () => {
    const twice = [...candidates, ...candidates];
    expect(zrlEventLink(empty, "Open Aqua League Division B1", RACE_DAY, twice)).toBeNull();
  });

  it("laat een eigen link en de afstand van een GPX staan", () => {
    const link = zrlEventLink(
      { external_url: "https://www.wtrl.racing/zrl/", gpx_path: "x.gpx" },
      "Open Aqua League Division B1",
      RACE_DAY,
      candidates,
    )!;
    expect(link.external_url).toBeUndefined();
    expect(link.distance_km).toBeUndefined();
    expect(link.zwift_route_id).toBe(553661379);
  });
});
