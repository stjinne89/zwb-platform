import { describe, expect, it } from "vitest";
import {
  destinationPoint,
  roundTripWaypoints,
  routeVariants,
  DETOUR_FACTOR,
} from "@/lib/outdoor/roundtrip";
import {
  ELEVATION_PER_KM,
  OUTDOOR_FLOOR_PCT,
  routeTargetForSession,
  scoreOutdoorRoute,
  summarizeRoute,
  terrainForIntensity,
  windPayoff,
} from "@/lib/training/outdoor-target";
import { distanceForSeconds, rideSeconds } from "@/lib/training/ride-physics";
import {
  decimate,
  MAX_ROUTE_POINTS,
  pointsFromGeoJson,
  pointsFromGraphHopper,
} from "@/lib/outdoor/router";
import { lineForMap, routeToGpx } from "@/lib/training/outdoor-suggestions";
import { haversineKm, type GpxPoint } from "@/lib/gpx";

const ATHLETE = { ftpWatts: 250, weightKg: 75 };
const START: GpxPoint = { lat: 51.56, lon: 5.09 }; // Tilburg, zoals op het profielformulier

describe("destinationPoint", () => {
  it("legt precies de gevraagde afstand af", () => {
    const to = destinationPoint(START, 90, 10);
    expect(haversineKm(START, to)).toBeCloseTo(10, 1);
  });

  it("gaat naar het noorden bij koers 0 en naar het oosten bij koers 90", () => {
    expect(destinationPoint(START, 0, 10).lat).toBeGreaterThan(START.lat);
    expect(destinationPoint(START, 90, 10).lon).toBeGreaterThan(START.lon);
    expect(destinationPoint(START, 180, 10).lat).toBeLessThan(START.lat);
    expect(destinationPoint(START, 270, 10).lon).toBeLessThan(START.lon);
  });

  it("houdt de lengtegraad tussen -180 en 180", () => {
    const nearDateLine = { lat: 0, lon: 179.9 };
    expect(destinationPoint(nearDateLine, 90, 50).lon).toBeLessThanOrEqual(180);
    expect(destinationPoint(nearDateLine, 90, 50).lon).toBeGreaterThanOrEqual(-180);
  });
});

describe("roundTripWaypoints", () => {
  it("begint en eindigt op het vertrekpunt", () => {
    const points = roundTripWaypoints(START, 60, 0);
    expect(points[0]).toEqual(START);
    expect(points[points.length - 1]).toEqual(START);
  });

  it("zet drie keerpunten neer", () => {
    expect(roundTripWaypoints(START, 60, 0)).toHaveLength(5);
  });

  it("maakt een driehoek waarvan de omtrek de omwegfactor verdisconteert", () => {
    const wanted = 60;
    const points = roundTripWaypoints(START, wanted, 0);
    let perimeter = 0;
    for (let i = 1; i < points.length; i += 1) perimeter += haversineKm(points[i - 1], points[i]);
    // Het pad langs de keerpunten is korter dan de gevraagde afstand, want de
    // echte route erlangs wordt langer. Met de standaardfactor komt het uit op
    // wanted / factor.
    expect(perimeter).toBeCloseTo(wanted / DETOUR_FACTOR, 0);
  });

  it("draait mee met de koers, zodat de varianten echt verschillen", () => {
    const north = roundTripWaypoints(START, 60, 0)[1];
    const south = roundTripWaypoints(START, 60, 180)[1];
    expect(north.lat).toBeGreaterThan(START.lat);
    expect(south.lat).toBeLessThan(START.lat);
  });

  it("maakt ook bij een heel kort rondje een bruikbare driehoek", () => {
    const points = roundTripWaypoints(START, 5, 45);
    expect(points).toHaveLength(5);
    expect(points.every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))).toBe(true);
  });
});

describe("routeVariants", () => {
  it("vertrekt tegen de wind in, zodat je met de wind mee thuiskomt", () => {
    // Wind uit het westen (270): je vertrekt naar het westen.
    const variants = routeVariants({ directionFromDeg: 270, speedKmh: 25 });
    expect(variants[0].key).toBe("tegenwind_heen");
    expect(variants[0].headingDeg).toBe(270);
    expect(variants[0].rationale).toContain("terug met de wind mee");
  });

  it("geeft drie duidelijk verschillende richtingen", () => {
    const headings = routeVariants({ directionFromDeg: 270, speedKmh: 25 }).map((v) => v.headingDeg);
    expect(new Set(headings).size).toBe(3);
  });

  it("verzint geen windverhaal bij windstilte", () => {
    const variants = routeVariants({ directionFromDeg: 270, speedKmh: 2 });
    expect(variants.every((v) => v.key === "vrij")).toBe(true);
    expect(variants[0].rationale).toContain("Weinig wind");
  });

  it("doet hetzelfde als er helemaal geen forecast is", () => {
    const variants = routeVariants({ directionFromDeg: null, speedKmh: null });
    expect(variants.every((v) => v.key === "vrij")).toBe(true);
  });
});

describe("ride-physics", () => {
  it("is in beide richtingen consistent", () => {
    // De kern van het delen van dit model: wat je erin stopt komt er weer uit.
    const distance = distanceForSeconds(90 * 60, 5, 180, 75, true)!;
    const seconds = rideSeconds(distance, distance * 5, 180, 75, true)!;
    expect(seconds / 60).toBeCloseTo(90, 0);
  });

  it("maakt een rit buiten langzamer dan dezelfde rit op Zwift", () => {
    const zwift = rideSeconds(40, 100, 200, 75, false)!;
    const outdoor = rideSeconds(40, 100, 200, 75, true)!;
    expect(outdoor).toBeGreaterThan(zwift);
  });

  it("geeft null zonder vermogen of gewicht", () => {
    expect(rideSeconds(40, 100, null, 75)).toBeNull();
    expect(distanceForSeconds(3600, 5, 200, null)).toBeNull();
  });
});

describe("terrainForIntensity", () => {
  it("wil klimwerk bij drempel en tempo", () => {
    expect(terrainForIntensity("threshold")).toBe("klim");
    expect(terrainForIntensity("tempo")).toBe("klim");
  });

  it("wil vlak bij duur en herstel", () => {
    expect(terrainForIntensity("endurance")).toBe("vlak");
    expect(terrainForIntensity("recovery")).toBe("vlak");
  });
});

describe("routeTargetForSession", () => {
  it("maakt een langer rondje voor een langere training", () => {
    const kort = routeTargetForSession({ durationMinutes: 60, intensity: "endurance" }, ATHLETE)!;
    const lang = routeTargetForSession({ durationMinutes: 180, intensity: "endurance" }, ATHLETE)!;
    expect(lang.distanceKm).toBeGreaterThan(kort.distanceKm * 2.5);
  });

  it("levert voor een duurrit van twee uur een geloofwaardige afstand op", () => {
    const target = routeTargetForSession({ durationMinutes: 120, intensity: "endurance" }, ATHLETE)!;
    // Twee uur duur op 68% van 250 W: ergens tussen de 50 en 75 km.
    expect(target.distanceKm).toBeGreaterThan(50);
    expect(target.distanceKm).toBeLessThan(75);
  });

  it("vraagt klimwerk bij een drempelsessie en vlak bij een duurrit", () => {
    const drempel = routeTargetForSession({ durationMinutes: 90, intensity: "threshold" }, ATHLETE)!;
    const duur = routeTargetForSession({ durationMinutes: 90, intensity: "endurance" }, ATHLETE)!;
    expect(drempel.terrain).toBe("klim");
    expect(drempel.elevationPerKm).toBe(ELEVATION_PER_KM.klim);
    expect(duur.terrain).toBe("vlak");
  });

  it("geeft null zonder FTP of gewicht in plaats van een gegokt rondje", () => {
    expect(
      routeTargetForSession({ durationMinutes: 90, intensity: "endurance" }, { ftpWatts: null, weightKg: 75 }),
    ).toBeNull();
    expect(
      routeTargetForSession({ durationMinutes: 90, intensity: "endurance" }, { ftpWatts: 250, weightKg: null }),
    ).toBeNull();
  });
});

/** Een rechte lijn oost en weer terug, met optionele hoogte. */
function outAndBack(km: number, elePerKm = 0): GpxPoint[] {
  const legs = 20;
  const out: GpxPoint[] = [];
  for (let i = 0; i <= legs; i += 1) {
    const point = destinationPoint(START, 90, (km / 2) * (i / legs));
    out.push({ ...point, ele: 10 + (km / 2) * (i / legs) * elePerKm });
  }
  const back = [...out].reverse().slice(1).map((p) => ({ ...p, ele: p.ele }));
  return [...out, ...back];
}

describe("summarizeRoute", () => {
  it("telt de afstand van een heen-en-terugrit op", () => {
    expect(summarizeRoute(outAndBack(40)).distanceKm).toBeCloseTo(40, 0);
  });

  it("telt alleen het stijgen mee", () => {
    // 20 km heen met 10 hm/km omhoog, dan dezelfde 20 km terug omlaag.
    const summary = summarizeRoute(outAndBack(40, 10));
    expect(summary.elevationM).toBeCloseTo(200, -1);
  });

  it("telt geen hoogte bij een route zonder hoogtedata", () => {
    const flat = outAndBack(20).map(({ lat, lon }) => ({ lat, lon }));
    expect(summarizeRoute(flat).elevationM).toBe(0);
  });
});

describe("windPayoff", () => {
  it("herkent heen tegen de wind, terug mee", () => {
    // De route gaat eerst naar het oosten, dan terug naar het westen.
    // Wind uit het oosten (90) = tegenwind heen, meewind terug.
    const payoff = windPayoff(outAndBack(40), 90, 25)!;
    expect(payoff.headwindOut).toBeGreaterThan(0.9);
    expect(payoff.tailwindHome).toBeGreaterThan(0.9);
    expect(payoff.note).toBe("Heen tegen de wind, terug met de wind mee");
  });

  it("herkent de omgekeerde, vervelende variant", () => {
    // Wind uit het westen: meewind heen, tegenwind als je moe bent.
    const payoff = windPayoff(outAndBack(40), 270, 25)!;
    expect(payoff.tailwindHome).toBeLessThan(0.1);
    expect(payoff.note).toBe("Tegenwind op de terugweg");
  });

  it("geeft null zonder forecast", () => {
    expect(windPayoff(outAndBack(40), null, null)).toBeNull();
  });
});

describe("scoreOutdoorRoute", () => {
  const target = routeTargetForSession({ durationMinutes: 120, intensity: "endurance" }, ATHLETE)!;

  it("scoort een rondje van de juiste lengte met meewind naar huis hoog", () => {
    const route = outAndBack(target.distanceKm, ELEVATION_PER_KM.vlak * 2);
    const judgement = scoreOutdoorRoute(route, target, ATHLETE, {
      directionFromDeg: 90,
      speedKmh: 25,
    })!;
    expect(judgement.scorePct).toBeGreaterThanOrEqual(80);
  });

  it("straft een rondje dat veel te lang is", () => {
    const passend = scoreOutdoorRoute(outAndBack(target.distanceKm), target, ATHLETE, {
      directionFromDeg: 90,
      speedKmh: 25,
    })!;
    const telang = scoreOutdoorRoute(outAndBack(target.distanceKm * 1.6), target, ATHLETE, {
      directionFromDeg: 90,
      speedKmh: 25,
    })!;
    expect(telang.scorePct).toBeLessThan(passend.scorePct);
    expect(telang.weakest?.dimension).toBe("duur");
  });

  it("verlaagt de score niet als er geen windvoorspelling is", () => {
    const route = outAndBack(target.distanceKm, ELEVATION_PER_KM.vlak * 2);
    const metWind = scoreOutdoorRoute(route, target, ATHLETE, { directionFromDeg: 90, speedKmh: 25 })!;
    const zonderWind = scoreOutdoorRoute(route, target, ATHLETE, {
      directionFromDeg: null,
      speedKmh: null,
    })!;
    // Zonder wind valt de dimensie weg en telt hij niet mee; de score mag er niet
    // door dalen. Dezelfde regel als in zwift-match.ts.
    expect(zonderWind.scorePct).toBeGreaterThanOrEqual(metWind.scorePct - 2);
    expect(zonderWind.scores.map((s) => s.dimension)).not.toContain("wind");
  });

  it("noemt in het zwakste punt hoeveel langer het rondje is", () => {
    const judgement = scoreOutdoorRoute(outAndBack(target.distanceKm * 1.3), target, ATHLETE, {
      directionFromDeg: 90,
      speedKmh: 25,
    })!;
    expect(judgement.weakest?.note).toContain("langer dan gepland");
  });

  it("gebruikt dezelfde ondergrens als de Zwift-kant", () => {
    expect(OUTDOOR_FLOOR_PCT).toBe(55);
  });
});

describe("routeplanner-antwoorden lezen", () => {
  it("leest een BRouter-FeatureCollection met hoogte", () => {
    const payload = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { "track-length": "42000" },
          geometry: {
            type: "LineString",
            coordinates: [
              [5.09, 51.56, 12],
              [5.1, 51.57, 14],
              [5.11, 51.58, 11],
            ],
          },
        },
      ],
    };
    expect(pointsFromGeoJson(payload)).toEqual([
      { lat: 51.56, lon: 5.09, ele: 12 },
      { lat: 51.57, lon: 5.1, ele: 14 },
      { lat: 51.58, lon: 5.11, ele: 11 },
    ]);
  });

  it("leest een GraphHopper-antwoord", () => {
    const payload = {
      paths: [
        {
          points: {
            type: "LineString",
            coordinates: [
              [5.09, 51.56, 12],
              [5.1, 51.57, 14],
            ],
          },
        },
      ],
    };
    expect(pointsFromGraphHopper(payload)).toHaveLength(2);
  });

  it("laat de hoogte weg als de planner er geen meestuurt", () => {
    const payload = {
      type: "LineString",
      coordinates: [
        [5.09, 51.56],
        [5.1, 51.57],
      ],
    };
    expect(pointsFromGeoJson(payload)[0].ele).toBeUndefined();
  });

  it("geeft een lege lijst bij onzin in plaats van te klappen", () => {
    expect(pointsFromGeoJson(null)).toEqual([]);
    expect(pointsFromGeoJson({ type: "FeatureCollection", features: [] })).toEqual([]);
    expect(pointsFromGraphHopper({ paths: [] })).toEqual([]);
    expect(pointsFromGeoJson({ type: "LineString", coordinates: "kapot" })).toEqual([]);
  });

  it("slaat kapotte coördinaten over", () => {
    const payload = {
      type: "LineString",
      coordinates: [[5.09, 51.56], ["x", "y"], [5.1, 51.57]],
    };
    expect(pointsFromGeoJson(payload)).toHaveLength(2);
  });
});

describe("decimate", () => {
  const long = Array.from({ length: 5000 }, (_, i) => ({ lat: 51 + i / 100000, lon: 5 }));

  it("dunt een lange route uit tot de bovengrens", () => {
    expect(decimate(long)).toHaveLength(MAX_ROUTE_POINTS);
  });

  it("houdt begin en eind", () => {
    const thinned = decimate(long);
    expect(thinned[0]).toEqual(long[0]);
    expect(thinned[thinned.length - 1]).toEqual(long[long.length - 1]);
  });

  it("laat een korte route met rust", () => {
    const short = long.slice(0, 10);
    expect(decimate(short)).toBe(short);
  });
});

describe("routeToGpx", () => {
  it("maakt geldige GPX met hoogte", () => {
    const gpx = routeToGpx("Testrit", {
      lat: [51.56, 51.57],
      lon: [5.09, 5.1],
      ele: [12, 14],
    });
    expect(gpx).toContain('<gpx version="1.1"');
    expect(gpx).toContain("<name>Testrit</name>");
    expect(gpx).toContain('<trkpt lat="51.56" lon="5.09"><ele>12</ele></trkpt>');
  });

  it("laat het hoogte-element weg waar de hoogte ontbreekt", () => {
    const gpx = routeToGpx("Zonder hoogte", { lat: [51.56], lon: [5.09], ele: [null] });
    expect(gpx).toContain('<trkpt lat="51.56" lon="5.09"></trkpt>');
    expect(gpx).not.toContain("<ele>");
  });

  it("ontsnapt tekens die de XML zouden breken", () => {
    const gpx = routeToGpx('Rit <met> & tekens', { lat: [51.5], lon: [5], ele: [null] });
    expect(gpx).toContain("<name>Rit &lt;met&gt; &amp; tekens</name>");
  });
});


describe("lineForMap", () => {
  const geometry = {
    lat: Array.from({ length: 600 }, (_, i) => 51.5 + i / 10000),
    lon: Array.from({ length: 600 }, (_, i) => 5 + i / 10000),
    ele: Array.from({ length: 600 }, () => 10),
  };

  it("dunt uit tot de bovengrens voor de kaart", () => {
    expect(lineForMap(geometry)).toHaveLength(120);
  });

  it("houdt begin en eind, zodat het rondje sluit", () => {
    const line = lineForMap(geometry);
    expect(line[0]).toEqual([geometry.lat[0], geometry.lon[0]]);
    expect(line[line.length - 1]).toEqual([geometry.lat[599], geometry.lon[599]]);
  });

  it("laat een korte lijn met rust", () => {
    const short = { lat: [51.5, 51.6, 51.7], lon: [5, 5.1, 5.2] };
    expect(lineForMap(short)).toEqual([
      [51.5, 5],
      [51.6, 5.1],
      [51.7, 5.2],
    ]);
  });

  it("geeft een lege lijn bij ontbrekende of kapotte geometrie", () => {
    expect(lineForMap(null)).toEqual([]);
    expect(lineForMap(undefined)).toEqual([]);
    expect(lineForMap({ lat: [51.5], lon: [5] })).toEqual([]);
  });

  it("valt terug op het kortste van de twee reeksen", () => {
    // Een half weggeschreven rij mag geen undefined in de kaartlijn zetten.
    const scheef = { lat: [51.5, 51.6, 51.7], lon: [5, 5.1] };
    const line = lineForMap(scheef);
    expect(line).toHaveLength(2);
    expect(line.every(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon))).toBe(true);
  });
});
