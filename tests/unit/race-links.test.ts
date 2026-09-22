import { describe, expect, it } from "vitest";
import {
  derivedZwiftLinks,
  linkLabel,
  mergeLinks,
  normalizeLinkUrl,
  normalizeRacepassUrl,
  racepassFor,
} from "@/lib/events/race-links";
import { withParentRoute } from "@/lib/events/route-source";

describe("derivedZwiftLinks", () => {
  it("maakt Zwift, ZwiftPower en ZwiftRacing uit het event-id", () => {
    expect(derivedZwiftLinks(4545781).map((link) => link.url)).toEqual([
      "https://www.zwift.com/events/view/4545781",
      "https://zwiftpower.com/events.php?zid=4545781",
      "https://www.zwiftracing.app/events/4545781",
    ]);
  });

  it("geeft niets zonder geldig id", () => {
    expect(derivedZwiftLinks(null)).toEqual([]);
    expect(derivedZwiftLinks("abc")).toEqual([]);
  });
});

describe("normalizeLinkUrl", () => {
  it("maakt van http en een kale host https", () => {
    expect(normalizeLinkUrl("http://zwiftinsider.com/x")).toBe("https://zwiftinsider.com/x");
    expect(normalizeLinkUrl("youtube.com/watch?v=1")).toBe("https://youtube.com/watch?v=1");
  });

  it("weigert andere schema's en onzin", () => {
    expect(normalizeLinkUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeLinkUrl("niks")).toBeNull();
    expect(normalizeLinkUrl("")).toBeNull();
  });
});

describe("linkLabel", () => {
  it("valt terug op de soort, bij overig op de host", () => {
    expect(linkLabel("recon", null, "https://youtube.com/x")).toBe("Recon");
    expect(linkLabel("overig", "", "https://www.strava.com/x")).toBe("strava.com");
    expect(linkLabel("zwb", "Racepagina", "https://www.zwbcycling.nl/x")).toBe("Racepagina");
  });
});

describe("mergeLinks", () => {
  it("vult aan met de raceweek, zonder dubbele URL's, gesorteerd op soort", () => {
    const merged = mergeLinks(
      [{ id: "a", kind: "zwb", label: null, url: "https://www.zwbcycling.nl/r/1" }],
      [
        { id: "b", kind: "recon", label: "Recon 1", url: "https://youtube.com/1" },
        { id: "c", kind: "zwb", label: null, url: "https://www.zwbcycling.nl/r/1" },
        { id: "d", kind: "onbekend", label: null, url: "https://x.nl" },
        { id: "e", kind: "recon", label: "Recon 2", url: "https://youtube.com/2" },
      ],
    );
    expect(merged.map((link) => link.label)).toEqual(["Recon 1", "Recon 2", "ZWB-website"]);
  });
});

describe("withParentRoute", () => {
  const parent = { gpx_path: null, zwift_route_id: 12, laps: 3 };

  it("neemt de route van de raceweek over als het event er geen heeft", () => {
    const event = { id: "t", gpx_path: null, zwift_route_id: null, laps: null };
    expect(withParentRoute(event, parent)).toMatchObject({ id: "t", zwift_route_id: 12, laps: 3 });
  });

  it("houdt een eigen aantal rondes", () => {
    const event = { gpx_path: null, zwift_route_id: null, laps: 2 };
    expect(withParentRoute(event, parent).laps).toBe(2);
  });

  it("laat een eigen route staan", () => {
    const event = { gpx_path: "a.gpx", zwift_route_id: null, laps: null };
    expect(withParentRoute(event, parent)).toBe(event);
  });
});

describe("racepass", () => {
  it("accepteert alleen WTRL-links", () => {
    expect(normalizeRacepassUrl("https://www.wtrl.racing/RacePass/abc=")).toBe(
      "https://www.wtrl.racing/RacePass/abc=",
    );
    expect(normalizeRacepassUrl("https://www.zwift.com/events/view/1")).toBeNull();
  });

  it("kiest de pass van het team voor de ronde van de racedatum", () => {
    const passes = [
      { team_id: "b1", url: "https://wtrl.racing/r1", valid_from: "2026-09-22", valid_until: "2026-10-27" },
      { team_id: "b1", url: "https://wtrl.racing/r2", valid_from: "2026-11-17", valid_until: "2026-12-22" },
      { team_id: "c", url: "https://wtrl.racing/c1", valid_from: "2026-09-22", valid_until: "2026-10-27" },
    ];
    expect(racepassFor(passes, "b1", "2026-10-27")).toBe("https://wtrl.racing/r1");
    expect(racepassFor(passes, "b1", "2026-11-24")).toBe("https://wtrl.racing/r2");
    expect(racepassFor(passes, "b1", "2026-11-03")).toBeNull();
    expect(racepassFor(passes, null, "2026-09-22")).toBeNull();
  });
});
