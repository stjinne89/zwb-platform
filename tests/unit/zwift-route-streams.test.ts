import { describe, expect, it } from "vitest";
import {
  checkProfile,
  elevationGainM,
  parseStreamsResponse,
  profileFromStreams,
  shapeFromStreams,
  smoothSeries,
  PROFILE_STEP_M,
} from "@/lib/events/zwift-route-streams";

/** Vlakke streams met een driehoekige klim erin, elke 10 m een punt. */
function syntheticStreams(totalM: number, peakM: number) {
  const distance: number[] = [];
  const altitude: number[] = [];
  const latlng: Array<[number, number]> = [];
  for (let d = 0; d <= totalM; d += 10) {
    distance.push(d);
    const half = totalM / 2;
    altitude.push(d <= half ? (d / half) * peakM : ((totalM - d) / half) * peakM);
    latlng.push([-11.6 + d / 1_000_000, 166.9 + d / 1_000_000]);
  }
  return { distance, altitude, latlng };
}

describe("profileFromStreams", () => {
  it("resamplet op het vaste raster en houdt de totale afstand", () => {
    const profile = profileFromStreams(syntheticStreams(2000, 100));
    expect(profile).not.toBeNull();
    expect(profile!.distanceM[0]).toBe(0);
    expect(profile!.distanceM[1]).toBe(PROFILE_STEP_M);
    expect(profile!.distanceM.at(-1)).toBe(2000);
    expect(profile!.altitudeM).toHaveLength(profile!.distanceM.length);
  });

  it("geeft null bij te weinig punten", () => {
    expect(profileFromStreams({ distance: [0], altitude: [5] })).toBeNull();
    expect(profileFromStreams({ distance: [], altitude: [] })).toBeNull();
  });

  it("dempt kwantisatiegeruis dat anders als hoogtemeters meetelt", () => {
    const distance: number[] = [];
    const altitude: number[] = [];
    for (let d = 0; d <= 1000; d += 10) {
      distance.push(d);
      // Volledig vlak, maar met 1 m zaagtand — dat is 50 m "winst" als je niet smootht.
      altitude.push(d % 20 === 0 ? 100 : 101);
    }
    const raw = elevationGainM(altitude);
    expect(raw).toBeGreaterThan(40);
    const smoothed = elevationGainM(profileFromStreams({ distance, altitude })!.altitudeM);
    expect(smoothed / raw).toBeLessThan(0.1);
  });

  it("laat korte golving staan in plaats van die glad te strijken", () => {
    // Dit is de eigenschap die met een venster van 80 m sneuvelde. Golving met
    // een periode van 200 m — heel gewoon op Zwift — hield toen 14 % van het
    // klimwerk over; dat is de 35 % die op rollende routes verdween. Langere
    // heuvels overleefden ook het oude venster, dus die zeggen hier niets.
    const distance: number[] = [];
    const altitude: number[] = [];
    for (let d = 0; d <= 10_000; d += 10) {
      distance.push(d);
      altitude.push(100 + 5 * (1 - Math.cos((d / 200) * 2 * Math.PI)));
    }
    const raw = elevationGainM(altitude);
    const smoothed = elevationGainM(profileFromStreams({ distance, altitude })!.altitudeM);
    expect(raw).toBeGreaterThan(400);
    expect(smoothed / raw).toBeGreaterThan(0.6);
  });
});

describe("smoothSeries", () => {
  it("laat een constante reeks ongemoeid", () => {
    expect(smoothSeries([5, 5, 5, 5], 25, 50)).toEqual([5, 5, 5, 5]);
  });
});

describe("elevationGainM", () => {
  it("telt alleen de stijgingen", () => {
    expect(elevationGainM([0, 10, 5, 15])).toBe(20);
    expect(elevationGainM([100, 90, 80])).toBe(0);
    expect(elevationGainM([])).toBe(0);
  });
});

describe("shapeFromStreams", () => {
  it("levert even lange lat- en lon-reeksen", () => {
    const shape = shapeFromStreams(syntheticStreams(2000, 50));
    expect(shape).not.toBeNull();
    expect(shape!.lat).toHaveLength(shape!.lon.length);
    expect(shape!.lat.length).toBeGreaterThan(10);
  });

  it("geeft null zonder latlng", () => {
    expect(
      shapeFromStreams({ distance: [0, 100], altitude: [0, 5], latlng: null }),
    ).toBeNull();
  });
});

describe("checkProfile", () => {
  const profile = profileFromStreams(syntheticStreams(17_231, 26))!;

  it("keurt een profiel goed dat binnen de marges van zwift-data valt", () => {
    const check = checkProfile({
      slug: "tempus-fugit",
      segmentId: 20350088,
      expectedKm: 17.231,
      expectedElevationM: 26,
      profile,
      shape: { lat: [1, 2], lon: [1, 2] },
    });
    expect(check.verdict).toBe("ok");
    expect(check.hasShape).toBe(true);
    expect(Math.abs(check.kmDeltaPct)).toBeLessThan(1);
  });

  it("rekent een vlakke route niet af op een percentage van bijna niets", () => {
    // Tempus Fugit in de praktijk: 19 m uit de stream tegen 26 m in zwift-data.
    // Dat is -26 %, maar zeven meter over 17 km is geen afwijking.
    const check = checkProfile({
      slug: "tempus-fugit",
      segmentId: 20350088,
      expectedKm: 17.231,
      expectedElevationM: 26,
      profile: profileFromStreams(syntheticStreams(17_231, 19))!,
      shape: null,
    });
    expect(check.elevationDeltaPct).toBeLessThan(-20);
    expect(check.verdict).toBe("ok");
  });

  it("meldt een hoogte die er ver naast zit, maar niet als onbruikbaar", () => {
    const check = checkProfile({
      slug: "road-to-sky",
      segmentId: 22280036,
      expectedKm: 17.496,
      expectedElevationM: 1044,
      profile: profileFromStreams(syntheticStreams(17_496, 200))!,
      shape: null,
    });
    expect(check.verdict).toBe("hoogte-wijkt-af");
    // De afstand klopt, dus het profiel gaat wél over deze route.
    expect(check.distanceOk).toBe(true);
    expect(check.elevationOk).toBe(false);
  });

  it("keurt een afstand die niet klopt af als onbruikbaar", () => {
    // Dit is het geval dat ertoe doet: het Strava-segment dekt een andere route,
    // dus een pacingplan zou over de verkeerde kilometers gaan.
    const check = checkProfile({
      slug: "onzin",
      segmentId: 1,
      expectedKm: 40,
      expectedElevationM: 26,
      profile,
      shape: null,
    });
    expect(check.verdict).toBe("afstand-wijkt-af");
    expect(check.distanceOk).toBe(false);
    expect(check.hasShape).toBe(false);
  });

  it("laat de afstand zwaarder wegen dan de hoogte", () => {
    // Allebei fout: de afstand bepaalt het oordeel, want dat is het echte probleem.
    const check = checkProfile({
      slug: "onzin",
      segmentId: 1,
      expectedKm: 40,
      expectedElevationM: 900,
      profile,
      shape: null,
    });
    expect(check.verdict).toBe("afstand-wijkt-af");
  });
});

describe("parseStreamsResponse", () => {
  it("leest het key_by_type-formaat", () => {
    const parsed = parseStreamsResponse({
      distance: { data: [0, 10, 20] },
      altitude: { data: [1, 2, 3] },
      latlng: { data: [[-11.6, 166.9], [-11.7, 166.8]] },
    });
    expect(parsed?.distance).toEqual([0, 10, 20]);
    expect(parsed?.latlng).toEqual([
      [-11.6, 166.9],
      [-11.7, 166.8],
    ]);
  });

  it("geeft null zonder distance of altitude", () => {
    expect(parseStreamsResponse({ distance: { data: [0, 1] } })).toBeNull();
    expect(parseStreamsResponse(null)).toBeNull();
  });

  it("overleeft een ontbrekende latlng-stream", () => {
    const parsed = parseStreamsResponse({
      distance: { data: [0, 10] },
      altitude: { data: [1, 2] },
    });
    expect(parsed?.latlng).toBeNull();
  });
});
