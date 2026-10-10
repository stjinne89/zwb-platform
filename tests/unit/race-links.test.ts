import { describe, expect, it } from "vitest";
import {
  derivedZwiftLinks,
  frrTourLinks,
  linkLabel,
  linkLogo,
  mergeLinks,
  normalizeLinkUrl,
  normalizeRacepassUrl,
  racepassFor,
} from "@/lib/events/race-links";
import { withParentRoute } from "@/lib/events/route-source";
import { zwifterBikesLinks, zwifterBikesRouteUrl } from "@/lib/events/zwifterbikes";
import { routes } from "zwift-data";

describe("frrTourLinks", () => {
  it("geeft de FRR-pagina's en het Discord-kanaal, allemaal https", () => {
    const links = frrTourLinks();
    expect(links.map((link) => link.label)).toContain("Klassement");
    expect(links.at(-1)).toMatchObject({
      label: "Discord",
      url: "https://discord.com/invite/nQNWHQK6PS",
    });
    expect(links.every((link) => link.url.startsWith("https://"))).toBe(true);
    expect(new Set(links.map((link) => link.key)).size).toBe(links.length);
    expect(linkLogo(links.at(-1)!.url)).toBe("/logos/discord.svg");
    expect(linkLogo("https://discord.gg/abc")).toBe("/logos/discord.svg");
  });

  it("geeft de truien hun eigen trui en de rest een icoon", () => {
    const icons = Object.fromEntries(frrTourLinks().map((link) => [link.label, link.icon]));
    expect(icons.Klassement).toEqual({ image: "/logos/frr-geel.svg" });
    expect(icons["Groene trui"]).toEqual({ image: "/logos/frr-groen.svg" });
    expect(icons.Bolletjestrui).toEqual({ image: "/logos/frr-bolletjes.svg" });
    expect(icons.Reglement).toEqual({ glyph: "rules" });
    expect(icons.Discord).toBeUndefined();
  });
});

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

describe("ZwifterBikes", () => {
  it("linkt naar de routepagina, ook als ZwifterBikes de route anders noemt", () => {
    expect(zwifterBikesRouteUrl("makuri-40")).toBe("https://zwifterbikes.web.app/route/makuri-40");
    expect(zwifterBikesRouteUrl("hilly-route-rev")).toBe(
      "https://zwifterbikes.web.app/route/hilly-route-reverse",
    );
    expect(zwifterBikesRouteUrl("4092230492")).toBe("https://zwifterbikes.web.app/route/urumaze");
  });

  it("geeft niets zonder route of voor een route die ZwifterBikes niet heeft", () => {
    expect(zwifterBikesRouteUrl(null)).toBeNull();
    expect(zwifterBikesRouteUrl("time-trial")).toBeNull();
    expect(zwifterBikesLinks(null)).toEqual([]);
    expect(zwifterBikesLinks(1)).toEqual([]);
  });

  it("zoekt de route van het event op", () => {
    const route = routes.find((item) => item.slug === "makuri-40")!;
    expect(zwifterBikesLinks(String(route.id))).toMatchObject([
      { kind: "zwifterbikes", label: "ZwifterBikes", url: "https://zwifterbikes.web.app/route/makuri-40" },
    ]);
  });
});
