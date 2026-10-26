import { describe, expect, it } from "vitest";
import { zrlDetailUpdate, zwiftCoverPath } from "@/lib/events/zrl-event-details";
import { groupRouteFigures } from "@/lib/events/sub-events";
import { routeFromZwiftId } from "@/lib/events/zwift-route";

// Event 5747121 op 2026-10-18, ingekort: Green to Screen in New York.
const info = {
  route: routeFromZwiftId(1178708985),
  description:
    "ZRL 2026/27 Season: Round 1 - Race: 4 of 5 (SCRATCH RACE)\n\nThe world''s Greatest Team Cycling Competition",
};
const COVER = "covers/zwift/abc.png";

describe("lege velden van een ZRL-race", () => {
  it("geeft een teamevent de wereld en de cover, niet de omschrijving", () => {
    expect(
      zrlDetailUpdate({ location: null, cover_image_path: null }, info, COVER),
    ).toEqual({ location: "Zwift · New York", cover_image_path: COVER });
  });

  it("geeft de raceweek ook de omschrijving, met enkele apostroffen", () => {
    const update = zrlDetailUpdate(
      { location: null, description: "", cover_image_path: null },
      info,
      COVER,
    );
    expect(update?.description).toBe(
      "ZRL 2026/27 Season: Round 1 - Race: 4 of 5 (SCRATCH RACE)\n\nThe world's Greatest Team Cycling Competition",
    );
  });

  it("laat wat een captain invulde staan", () => {
    expect(
      zrlDetailUpdate(
        { location: "Thuis", description: "Ronde 1, week 5.", cover_image_path: "eigen.png" },
        info,
        COVER,
      ),
    ).toBeNull();
  });

  it("vult zonder route of banner alleen wat er wel is", () => {
    expect(
      zrlDetailUpdate({ location: null, cover_image_path: null }, { route: null, description: null }, null),
    ).toBeNull();
  });

  it("bewaart dezelfde banner altijd onder hetzelfde pad", () => {
    const url = "https://cdn.zwift.com/static/events_headers/cycling/special/zrl_2026_rd1_event-header.png";
    expect(zwiftCoverPath(url, "png")).toBe(zwiftCoverPath(url, "png"));
    expect(zwiftCoverPath(url, "png")).toMatch(/^covers\/zwift\/[0-9a-f]{24}\.png$/);
    expect(zwiftCoverPath(`${url}?v=2`, "png")).not.toBe(zwiftCoverPath(url, "png"));
  });
});

describe("afstand op de kalenderregel", () => {
  it("neemt die van de raceweek zelf als hij er een heeft", () => {
    expect(groupRouteFigures({ distance_km: "40", elevation_m: 300 }, [{ distance_km: 28 }])).toEqual({
      distanceKm: "40",
      elevationM: "300",
    });
  });

  it("neemt anders die van de teamevents, als bereik wanneer ze verschillen", () => {
    expect(
      groupRouteFigures({ distance_km: null, elevation_m: null }, [
        { distance_km: "28.66", elevation_m: 212 },
        { distance_km: "41.2", elevation_m: 318 },
        { distance_km: "28.66", elevation_m: 212 },
        { distance_km: null, elevation_m: null },
      ]),
    ).toEqual({ distanceKm: "28.66–41.2", elevationM: "212–318" });
  });

  it("toont niets zonder afstand", () => {
    expect(groupRouteFigures({}, [])).toEqual({ distanceKm: null, elevationM: null });
  });
});
