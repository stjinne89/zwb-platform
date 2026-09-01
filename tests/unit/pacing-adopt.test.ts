import { describe, expect, it } from "vitest";
import {
  adoptGeneratedPlan,
  normalizeGeneratedSegments,
} from "@/lib/pacing/adopt";
import type { GeneratedPacingPlan } from "@/lib/pacing/ai";
import type { CpModel } from "@/lib/pacing/cp";
import { pacingRouteFromZwift, type PacingRoute } from "@/lib/pacing/route-profile";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";

const MODEL: CpModel = {
  cpWatts: 280,
  wPrimeJoules: 20_000,
  source: "intervals",
  weightKg: 70,
};

function lapProfile(): RouteProfile {
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  for (let d = 0; d <= 10_000; d += 25) {
    distanceM.push(d);
    altitudeM.push(d <= 8000 ? 50 : 50 + (d - 8000) * 0.06);
  }
  return { distanceM, altitudeM };
}

const ROUTE: PacingRoute = pacingRouteFromZwift({
  profile: lapProfile(),
  accents: [
    {
      slug: "de-muur",
      name: "De Muur",
      kind: "climb",
      startKm: 8,
      endKm: 10,
      avgInclinePct: 6,
    },
  ],
  leadInKm: 0,
  leadInElevationM: 0,
  lapKm: 10,
  laps: 1,
});

function segment(
  startKm: number,
  endKm: number,
  targetWkg = 3,
  extra: Partial<GeneratedPacingPlan["segments"][number]> = {},
): GeneratedPacingPlan["segments"][number] {
  return {
    startKm,
    endKm,
    targetWkg,
    label: "Stuk",
    effort: "tempo",
    rationale: "Reden",
    accentId: "",
    ...extra,
  };
}

describe("normalizeGeneratedSegments", () => {
  it("laat een net plan met rust", () => {
    const { segments, repairs } = normalizeGeneratedSegments(
      [segment(0, 8, 3), segment(8, 10, 4)],
      ROUTE,
    );
    expect(repairs).toHaveLength(0);
    expect(segments).toHaveLength(2);
    expect(segments[0].startKm).toBe(0);
    expect(segments[1].endKm).toBe(10);
  });

  it("snijdt overlap weg in plaats van het stuk te laten vallen", () => {
    const { segments, repairs } = normalizeGeneratedSegments(
      [segment(0, 8, 3), segment(6, 10, 4.5)],
      ROUTE,
    );
    expect(repairs.join(" ")).toContain("overlappend");
    expect(segments[1].startKm).toBe(8);
    expect(segments[1].targetWkg).toBe(4.5);
  });

  it("vult een gat midden in de route", () => {
    const { segments, repairs } = normalizeGeneratedSegments(
      [segment(0, 3, 3), segment(6, 10, 4)],
      ROUTE,
    );
    expect(repairs.join(" ")).toContain("gat");
    const filler = segments.find((item) => item.label === "Tussenstuk")!;
    expect(filler.startKm).toBe(3);
    expect(filler.endKm).toBe(6);
    // Laagste van de buren, niet het gemiddelde.
    expect(filler.targetWkg).toBe(3);
  });

  it("vult een ontbrekende staart aan tot de finish", () => {
    const { segments } = normalizeGeneratedSegments([segment(0, 6, 3)], ROUTE);
    expect(segments.at(-1)!.endKm).toBe(10);
  });

  it("rekt het laatste stuk op bij een klein tekort in plaats van een stuk toe te voegen", () => {
    const { segments, repairs } = normalizeGeneratedSegments(
      [segment(0, 9.95, 3)],
      ROUTE,
    );
    expect(segments).toHaveLength(1);
    expect(segments[0].endKm).toBe(10);
    expect(repairs).toHaveLength(0);
  });

  it("gooit stukken weg die nergens op slaan", () => {
    const { segments, repairs } = normalizeGeneratedSegments(
      [
        segment(0, 10, 3),
        segment(5, 5),
        segment(8, 4),
        segment(0, 5, Number.NaN),
      ],
      ROUTE,
    );
    expect(repairs.join(" ")).toContain("onbruikbaar");
    expect(segments).toHaveLength(1);
  });

  it("trekt stukken die buiten de route vallen naar binnen", () => {
    const { segments } = normalizeGeneratedSegments(
      [segment(-5, 4, 3), segment(4, 40, 3.5)],
      ROUTE,
    );
    expect(segments[0].startKm).toBe(0);
    expect(segments.at(-1)!.endKm).toBe(10);
  });

  it("houdt alleen accent-ids die de route kent", () => {
    const { segments } = normalizeGeneratedSegments(
      [
        segment(0, 8, 3, { accentId: "bestaat-niet" }),
        segment(8, 10, 4, { accentId: "de-muur" }),
      ],
      ROUTE,
    );
    expect(segments[0].accentId).toBeNull();
    expect(segments[1].accentId).toBe("de-muur");
  });

  it("vervangt een onbekende inspanningslabel door tempo", () => {
    const { segments } = normalizeGeneratedSegments(
      // @ts-expect-error — het model kan iets buiten de enum sturen.
      [segment(0, 10, 3, { effort: "supersnel" })],
      ROUTE,
    );
    expect(segments[0].effort).toBe("tempo");
  });

  it("geeft een lege lijst als er niets bruikbaars in zit", () => {
    const { segments } = normalizeGeneratedSegments([segment(5, 5)], ROUTE);
    expect(segments).toHaveLength(0);
  });
});

describe("adoptGeneratedPlan", () => {
  const generated: GeneratedPacingPlan = {
    strategy: "Spaar de eerste acht kilometer, sla toe op De Muur.",
    risks: ["Te hard over de eerste helling."],
    segments: [segment(0, 8, 3), segment(8, 10, 4.2, { accentId: "de-muur" })],
  };

  it("levert een doorgerekend, uitvoerbaar plan met strategie en risico's", () => {
    const result = adoptGeneratedPlan(generated, ROUTE, MODEL);
    expect(result.evaluation.feasible).toBe(true);
    expect(result.strategy).toBe(generated.strategy);
    expect(result.risks).toEqual(generated.risks);
    expect(result.plan).toHaveLength(2);
  });

  it("schaalt een gulzig voorstel terug tot het haalbaar is", () => {
    const greedy: GeneratedPacingPlan = {
      ...generated,
      segments: [segment(0, 8, 4.6), segment(8, 10, 6.5, { accentId: "de-muur" })],
    };
    const result = adoptGeneratedPlan(greedy, ROUTE, MODEL);
    expect(result.evaluation.feasible).toBe(true);
    expect(result.plan[1].targetWkg).toBeLessThan(6.5);
    expect(result.adjustments.length + result.clampNotes.length).toBeGreaterThan(0);
  });

  it("meldt wat er aan het voorstel is rechtgezet", () => {
    const broken: GeneratedPacingPlan = {
      ...generated,
      segments: [segment(0, 3, 3), segment(6, 10, 4)],
    };
    const result = adoptGeneratedPlan(broken, ROUTE, MODEL);
    expect(result.repairs.join(" ")).toContain("gat");
  });
});
