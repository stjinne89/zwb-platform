import { describe, expect, it } from "vitest";
import {
  expandAccents,
  expandLaps,
  pacingRouteFromGpx,
  pacingRouteFromZwift,
  segmentEndKms,
  segmentsFromProfile,
  PACING_SEGMENT_M,
} from "@/lib/pacing/route-profile";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";
import type { RouteAccent } from "@/lib/events/zwift-route";
import type { Climb } from "@/lib/gpx-climbs";
import type { SampledRoute } from "@/lib/route-sample";

/** Ronde van 2 km: eerste km vlak op 100 m, tweede km stijgt naar 150 m. */
function lapProfile(): RouteProfile {
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  for (let d = 0; d <= 2000; d += 25) {
    distanceM.push(d);
    altitudeM.push(d <= 1000 ? 100 : 100 + ((d - 1000) / 1000) * 50);
  }
  return { distanceM, altitudeM };
}

describe("expandLaps", () => {
  it("telt lead-in plus het juiste aantal ronden op tot de totale afstand", () => {
    const expanded = expandLaps(lapProfile(), {
      leadInKm: 0.5,
      leadInElevationM: 10,
      laps: 3,
    });
    expect(expanded.distanceM.at(-1)).toBeCloseTo(500 + 3 * 2000, 0);
  });

  it("werkt zonder lead-in", () => {
    const expanded = expandLaps(lapProfile(), {
      leadInKm: 0,
      leadInElevationM: 0,
      laps: 2,
    });
    expect(expanded.distanceM[0]).toBe(0);
    expect(expanded.distanceM.at(-1)).toBeCloseTo(4000, 0);
  });

  it("laat de hoogte per ronde aansluiten in plaats van terugspringen", () => {
    const expanded = expandLaps(lapProfile(), {
      leadInKm: 0,
      leadInElevationM: 0,
      laps: 2,
    });
    // Tussen twee opeenvolgende punten mag nooit een sprong van tientallen
    // meters zitten; die zou als een muur in het tempo-model verschijnen.
    for (let i = 1; i < expanded.altitudeM.length; i++) {
      expect(Math.abs(expanded.altitudeM[i] - expanded.altitudeM[i - 1])).toBeLessThan(5);
    }
  });

  it("herhaalt het klimwerk per ronde", () => {
    const one = expandLaps(lapProfile(), { leadInKm: 0, leadInElevationM: 0, laps: 1 });
    const three = expandLaps(lapProfile(), { leadInKm: 0, leadInElevationM: 0, laps: 3 });
    const gain = (profile: RouteProfile) => {
      let total = 0;
      for (let i = 1; i < profile.altitudeM.length; i++) {
        const delta = profile.altitudeM[i] - profile.altitudeM[i - 1];
        if (delta > 0) total += delta;
      }
      return total;
    };
    expect(gain(three)).toBeCloseTo(3 * gain(one), 0);
  });
});

describe("segmentsFromProfile", () => {
  it("hakt de route in segmenten van de vaste resolutie", () => {
    const segments = segmentsFromProfile(lapProfile(), []);
    expect(segments).toHaveLength(2000 / PACING_SEGMENT_M);
    expect(segments[0].distanceM).toBe(PACING_SEGMENT_M);
  });

  it("berekent de gradiënt goed op vlak en op de klim", () => {
    const segments = segmentsFromProfile(lapProfile(), []);
    expect(segments[0].gradient).toBeCloseTo(0, 5);
    // Tweede kilometer: 50 m over 1000 m = 5 %.
    expect(segments.at(-1)!.gradient).toBeCloseTo(0.05, 3);
  });

  it("koppelt segmenten aan het accent waar ze in vallen", () => {
    const segments = segmentsFromProfile(lapProfile(), [
      {
        id: "klim",
        name: "Klim",
        kind: "climb",
        startKm: 1,
        endKm: 2,
        avgGradient: 0.05,
        lap: null,
      },
    ]);
    expect(segments[0].accentIndex).toBeNull();
    expect(segments.at(-1)!.accentIndex).toBe(0);
  });
});

describe("expandAccents", () => {
  const routeAccents: RouteAccent[] = [
    {
      slug: "de-klim",
      name: "De Klim",
      kind: "climb",
      startKm: 1,
      endKm: 2,
      avgInclinePct: 5,
    },
  ];

  it("verschuift de accenten per ronde en houdt ze op volgorde", () => {
    const profile = expandLaps(lapProfile(), {
      leadInKm: 0.5,
      leadInElevationM: 10,
      laps: 3,
    });
    const accents = expandAccents(routeAccents, profile, {
      leadInKm: 0.5,
      lapKm: 2,
      laps: 3,
    });
    expect(accents).toHaveLength(3);
    expect(accents[0].startKm).toBeCloseTo(1.5, 3);
    expect(accents[1].startKm).toBeCloseTo(3.5, 3);
    expect(accents[2].startKm).toBeCloseTo(5.5, 3);
    expect(accents.map((accent) => accent.id)).toEqual([
      "de-klim-1",
      "de-klim-2",
      "de-klim-3",
    ]);
  });

  it("laat het rondenummer weg bij één ronde", () => {
    const profile = expandLaps(lapProfile(), {
      leadInKm: 0,
      leadInElevationM: 0,
      laps: 1,
    });
    const accents = expandAccents(routeAccents, profile, {
      leadInKm: 0,
      lapKm: 2,
      laps: 1,
    });
    expect(accents[0].id).toBe("de-klim");
    expect(accents[0].lap).toBeNull();
  });

  it("rekent de gradiënt uit het profiel, niet uit zwift-data", () => {
    const profile = expandLaps(lapProfile(), {
      leadInKm: 0,
      leadInElevationM: 0,
      laps: 1,
    });
    const accents = expandAccents(routeAccents, profile, {
      leadInKm: 0,
      lapKm: 2,
      laps: 1,
    });
    expect(accents[0].avgGradient).toBeCloseTo(0.05, 3);
  });
});

describe("pacingRouteFromZwift", () => {
  it("levert een route met de juiste totalen en accenten per ronde", () => {
    const route = pacingRouteFromZwift({
      profile: lapProfile(),
      accents: [
        {
          slug: "de-klim",
          name: "De Klim",
          kind: "climb",
          startKm: 1,
          endKm: 2,
          avgInclinePct: 5,
        },
      ],
      leadInKm: 0.5,
      leadInElevationM: 10,
      lapKm: 2,
      laps: 2,
    });

    expect(route.source).toBe("zwift");
    expect(route.totalKm).toBeCloseTo(4.5, 2);
    expect(route.accents).toHaveLength(2);
    expect(route.leadInApproximated).toBe(true);
    expect(segmentEndKms(route.segments).at(-1)).toBeCloseTo(4.5, 1);
  });
});

describe("pacingRouteFromGpx", () => {
  it("neemt de segmenten van sampleRoute over en maakt klimmen tot accenten", () => {
    const sampled: SampledRoute = {
      samples: [],
      segments: [
        { distanceM: 100, gradient: 0, climbIndex: null },
        { distanceM: 100, gradient: 0.06, climbIndex: 0 },
      ],
      climbs: [],
      totalKm: 0.2,
      hasElevation: true,
    };
    const climbs = [
      {
        startKm: 0.1,
        endKm: 0.2,
        avgGradient: 0.06,
        name: "Naamloze klim",
        colSlug: null,
      } as Climb,
    ];

    const route = pacingRouteFromGpx(sampled, climbs);
    expect(route.source).toBe("gpx");
    expect(route.segments[1].accentIndex).toBe(0);
    expect(route.accents[0].name).toBe("Naamloze klim");
    expect(route.accents[0].lap).toBeNull();
    expect(route.leadInApproximated).toBe(false);
  });

  it("verzint een naam voor een klim zonder col-match", () => {
    const sampled: SampledRoute = {
      samples: [],
      segments: [{ distanceM: 100, gradient: 0.05, climbIndex: 0 }],
      climbs: [],
      totalKm: 0.1,
      hasElevation: true,
    };
    const route = pacingRouteFromGpx(sampled, [
      { startKm: 0, endKm: 0.1, avgGradient: 0.05, name: null, colSlug: null } as Climb,
    ]);
    expect(route.accents[0].name).toBe("Klim 1");
    expect(route.accents[0].id).toBe("klim-1");
  });
});
