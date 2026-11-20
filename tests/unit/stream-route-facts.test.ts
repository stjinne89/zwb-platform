import { describe, expect, it } from "vitest";
import { fitTitle, profileAreaPath, repeatProfile, streamRouteFacts } from "@/lib/youtube-live/route-facts";

// Het parcours op de thumbnail en in de overlay (2026-11-20): afstand en
// hoogte uit de race, de route of de routebibliotheek, en de titelgrootte.

const ROUTE = { name: "BRAEk-fast Crits and Grits", distanceKm: 20.792, elevationM: 226, leadInKm: 1.353, leadInElevationM: 35 };
const LAP = { distanceM: [0, 5000, 10000], altitudeM: [10, 40, 10] };

describe("streamRouteFacts", () => {
  it("rekent afstand en hoogte uit de route over de rondes, met de aanloop", () => {
    const facts = streamRouteFacts({ laps: 2, eventDistanceKm: null, eventElevationM: null, zwiftEventDistanceM: null, route: ROUTE, library: null });
    expect(facts).toMatchObject({ routeName: ROUTE.name, laps: 2, distanceKm: 42.9, elevationM: 487, profile: null });
  });

  it("geeft de eigen afstand en hoogte van de race voorrang", () => {
    const facts = streamRouteFacts({ laps: 1, eventDistanceKm: 22.1, eventElevationM: 250, zwiftEventDistanceM: null, route: ROUTE, library: null });
    expect(facts.distanceKm).toBe(22.1);
    expect(facts.elevationM).toBe(250);
  });

  it("valt terug op de routebibliotheek en tekent daar het profiel uit", () => {
    const facts = streamRouteFacts({
      laps: 3,
      eventDistanceKm: null,
      eventElevationM: null,
      zwiftEventDistanceM: null,
      route: null,
      library: { name: "Nieuwe route", distanceM: 10000, elevationM: 30, profile: LAP },
    });
    expect(facts).toMatchObject({ routeName: "Nieuwe route", distanceKm: 30, elevationM: 90 });
    expect(facts.profile?.at(-1)).toEqual({ km: 30, m: 10 });
  });

  it("geeft niets als er geen route is", () => {
    const facts = streamRouteFacts({ laps: null, eventDistanceKm: null, eventElevationM: null, zwiftEventDistanceM: null, route: null, library: null });
    expect(facts).toEqual({ routeName: null, laps: null, distanceKm: null, elevationM: null, profile: null });
  });
});

describe("profiel", () => {
  it("zet rondes achter elkaar zonder dubbel punt op de naad, en dunt uit", () => {
    expect(repeatProfile(LAP, 2)).toHaveLength(5);
    const long = { distanceM: Array.from({ length: 500 }, (_, i) => i * 10), altitudeM: Array.from({ length: 500 }, () => 5) };
    expect(repeatProfile(long, 1)).toHaveLength(120);
  });

  it("maakt een gesloten vlak over de volle breedte", () => {
    const path = profileAreaPath(repeatProfile(LAP, 1)!, 300, 100);
    expect(path.startsWith("M0,100 L0.0,")).toBe(true);
    expect(path.endsWith("L300,100 Z")).toBe(true);
  });
});

describe("fitTitle", () => {
  it("houdt een titel van 36 tekens op één regel over de volle breedte", () => {
    expect(fitTitle("Stage 2 - Zwift Epic - Four Foalsmen", 1136, "barlow")).toEqual({ size: 64, lines: 1 });
  });

  it("zet een korte titel groot, en een lange op twee regels", () => {
    expect(fitTitle("ZRL race 3", 712, "barlow")).toEqual({ size: 96, lines: 1 });
    expect(fitTitle("ZRL 2026/27 · R2 · W1 · B1 — Team Time Trial", 712, "barlow").lines).toBe(2);
  });
});
