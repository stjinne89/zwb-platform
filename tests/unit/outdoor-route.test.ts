import { describe, expect, it } from "vitest";
import {
  correctedDetourFactor,
  destinationPoint,
  MAX_DETOUR_FACTOR,
  MIN_DETOUR_FACTOR,
  RETURN_LEG_OFFSET_DEG,
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
import { gpxBearing, haversineKm, type GpxPoint } from "@/lib/gpx";
import { classifyWind } from "@/lib/weather";

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
  const WIND_FROM = 270; // uit het westen

  /** De windcategorie van het laatste been van een rondje. */
  function finishWind(headingDeg: number) {
    const points = roundTripWaypoints(START, 60, headingDeg);
    const bearing = gpxBearing(points[points.length - 2], points[points.length - 1]);
    return classifyWind(WIND_FROM, bearing, 25).category;
  }

  it("legt het laatste been met de wind mee", () => {
    // Dit is de hele reden dat deze functie bestaat. Op een gesloten lus kun je
    // niet "heen tegen de wind, terug mee" krijgen -- je komt terug waar je
    // begon -- maar je kunt wél kiezen welk been je als laatste rijdt.
    const variants = routeVariants({ directionFromDeg: WIND_FROM, speedKmh: 25 });
    expect(variants[0].key).toBe("meewind_thuis");
    expect(finishWind(variants[0].headingDeg)).toBe("meewind");
  });

  it("laat de andere twee op zijwind eindigen, en zegt dat ook", () => {
    const variants = routeVariants({ directionFromDeg: WIND_FROM, speedKmh: 25 });
    for (const variant of variants.slice(1)) {
      expect(finishWind(variant.headingDeg)).toBe("zijwind");
      expect(variant.rationale).toContain("Zijwind");
    }
  });

  it("gebruikt de gemeten koers van het laatste been", () => {
    // RETURN_LEG_OFFSET_DEG is geen aanname maar een eigenschap van de driehoek.
    const heading = 40;
    const points = roundTripWaypoints(START, 60, heading);
    const bearing = gpxBearing(points[points.length - 2], points[points.length - 1]);
    expect(Math.round(bearing)).toBeCloseTo((heading + RETURN_LEG_OFFSET_DEG) % 360, -1);
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
  it("kijkt naar het slotstuk en herkent meewind daar", () => {
    // De route gaat eerst naar het oosten, dan terug naar het westen. Het
    // slotstuk gaat dus naar het westen; wind uit het oosten (90) is daar mee.
    const payoff = windPayoff(outAndBack(40), 90, 25)!;
    expect(payoff.tailwindFinish).toBeGreaterThan(0.9);
    expect(payoff.note).toBe("Laatste kilometers met de wind mee");
  });

  it("waarschuwt voor tegenwind als je al moe bent", () => {
    const payoff = windPayoff(outAndBack(40), 270, 25)!;
    expect(payoff.headwindFinish).toBeGreaterThan(0.9);
    expect(payoff.note).toBe("Tegenwind op de laatste kilometers");
  });

  it("noemt zijwind gewoon zijwind", () => {
    // Route oost-west, wind uit het noorden: dwars op de rijrichting.
    const payoff = windPayoff(outAndBack(40), 0, 25)!;
    expect(payoff.tailwindFinish).toBeLessThan(0.1);
    expect(payoff.headwindFinish).toBeLessThan(0.1);
    expect(payoff.note).toBe("Zijwind op het laatste stuk");
  });

  it("geeft null zonder forecast", () => {
    expect(windPayoff(outAndBack(40), null, null)).toBeNull();
  });
});

describe("correctedDetourFactor", () => {
  it("verhoogt de factor als de route te lang uitviel", () => {
    // Gevraagd 60, geworden 72: de omgeving loopt meer om dan aangenomen, dus de
    // driehoek moet kleiner en de factor hoger.
    expect(correctedDetourFactor(1.12, 60, 72)).toBeCloseTo(1.344, 3);
  });

  it("verlaagt de factor als de route te kort uitviel", () => {
    // Dit is wat er in de praktijk gebeurde: rondjes ~15% te kort.
    const corrected = correctedDetourFactor(1.25, 18.5, 16)!;
    expect(corrected).toBeLessThan(1.25);
    expect(corrected).toBeCloseTo(1.081, 3);
  });

  it("komt na correctie op de gevraagde afstand uit", () => {
    // De eigenlijke belofte: pas de factor toe en de volgende poging klopt.
    const target = 60;
    const trueRatio = 1.05; // wat de planner in dit gebied werkelijk doet
    const first = (target / DETOUR_FACTOR) * trueRatio;
    const corrected = correctedDetourFactor(DETOUR_FACTOR, target, first)!;
    const second = (target / corrected) * trueRatio;
    expect(second).toBeCloseTo(target, 5);
  });

  it("begrenst een onzinnige meting", () => {
    expect(correctedDetourFactor(1.12, 60, 1000)).toBe(MAX_DETOUR_FACTOR);
    expect(correctedDetourFactor(1.12, 60, 0.1)).toBe(MIN_DETOUR_FACTOR);
  });

  it("geeft null bij onbruikbare invoer", () => {
    expect(correctedDetourFactor(1.12, 0, 60)).toBeNull();
    expect(correctedDetourFactor(1.12, 60, 0)).toBeNull();
    expect(correctedDetourFactor(0, 60, 60)).toBeNull();
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
    expect(telang.scores.find((s) => s.dimension === "duur")!.scorePct).toBeLessThan(60);
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

  it("straft zijwind niet — een lus kan niet beter", () => {
    // Dit was de fout: de oude windmaat mat "tegenwind heen, meewind terug", wat
    // een gesloten lus per definitie niet kan halen. Alle drie de varianten
    // kwamen op zijwind uit en verloren even veel punten, dus de dimensie
    // onderscheidde niets en drukte iedereen. Nu is zijwind het midden.
    const route = outAndBack(target.distanceKm, ELEVATION_PER_KM.vlak * 2);
    const zijwind = scoreOutdoorRoute(route, target, ATHLETE, {
      directionFromDeg: 0, // dwars op een oost-westroute
      speedKmh: 25,
    })!;
    const zonderWind = scoreOutdoorRoute(route, target, ATHLETE, {
      directionFromDeg: null,
      speedKmh: null,
    })!;

    expect(zijwind.scores.find((s) => s.dimension === "wind")!.scorePct).toBe(50);
    // Geen wind om je aan te storen mag niet beter scoren dan wind die niets doet.
    expect(zijwind.scorePct).toBeGreaterThan(zonderWind.scorePct - 15);
  });

  it("beloont meewind op het slotstuk boven tegenwind", () => {
    const route = outAndBack(target.distanceKm, ELEVATION_PER_KM.vlak * 2);
    const mee = scoreOutdoorRoute(route, target, ATHLETE, { directionFromDeg: 90, speedKmh: 25 })!;
    const tegen = scoreOutdoorRoute(route, target, ATHLETE, { directionFromDeg: 270, speedKmh: 25 })!;
    expect(mee.scorePct).toBeGreaterThan(tegen.scorePct);
  });

  it("noemt in de duurregel hoeveel langer het rondje is", () => {
    const judgement = scoreOutdoorRoute(outAndBack(target.distanceKm * 1.3), target, ATHLETE, {
      directionFromDeg: 90,
      speedKmh: 25,
    })!;
    expect(judgement.scores.find((s) => s.dimension === "duur")!.note).toContain(
      "langer dan gepland",
    );
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
