import { describe, expect, it } from "vitest";
import {
  applyMerge,
  applySplit,
  canMergeWithNext,
  MAX_EDIT_PIECES,
  splitBounds,
  validateEditedPlan,
  type EditedSegmentInput,
} from "@/lib/pacing/edit";
import type { PlanSegment } from "@/lib/pacing/plan";
import type { CpModel } from "@/lib/pacing/cp";
import {
  normalizeNeutralZones,
  pacingRouteFromZwift,
  type PacingRoute,
} from "@/lib/pacing/route-profile";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";

const MODEL: CpModel = { cpWatts: 280, wPrimeJoules: 20_000, source: "intervals", weightKg: 70 };

/** 20 km: 12 km vlak, 3 km klim à 5 %, 5 km vlak. */
function profile(): RouteProfile {
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  for (let d = 0; d <= 20_000; d += 25) {
    distanceM.push(d);
    altitudeM.push(d <= 12_000 ? 0 : d <= 15_000 ? (d - 12_000) * 0.05 : 150);
  }
  return { distanceM, altitudeM };
}

function route(zones: Array<{ startKm: number; endKm: number }> = []): PacingRoute {
  const base = pacingRouteFromZwift({
    profile: profile(),
    accents: [{ slug: "klim", name: "Klim", kind: "climb", startKm: 12, endKm: 15, avgInclinePct: 5 }],
    leadInKm: 0,
    leadInElevationM: 0,
    lapKm: 20,
    laps: 1,
  });
  return { ...base, neutralZones: normalizeNeutralZones(zones, base.totalKm) };
}

const plan: PlanSegment[] = [
  { startKm: 0, endKm: 12, targetWkg: 2.8, label: "Vlak", effort: "tempo", rationale: "Rustig" },
  { startKm: 12, endKm: 15, targetWkg: 4, label: "Klim", effort: "drempel", accentId: "klim" },
  { startKm: 15, endKm: 20, targetWkg: 3, label: "Naar de finish", effort: "tempo" },
];

const asInput = (segments: PlanSegment[]): EditedSegmentInput[] =>
  segments.map(({ startKm, endKm, targetWkg, label, kind }) => ({ startKm, endKm, targetWkg, label, kind }));

describe("knippen", () => {
  it("knipt op het raster met hetzelfde doel en genummerde labels", () => {
    const out = applySplit(plan, 0, 6.04);
    expect(out.map((s) => [s.startKm, s.endKm, s.label, s.targetWkg])).toEqual([
      [0, 6, "Vlak (1)", 2.8],
      [6, 12, "Vlak (2)", 2.8],
      [12, 15, "Klim", 4],
      [15, 20, "Naar de finish", 3],
    ]);
  });

  it("houdt minstens 0,5 km aan elke kant en weigert een te kort stuk", () => {
    expect(applySplit(plan, 0, 0.1)[0].endKm).toBe(0.5);
    expect(splitBounds({ ...plan[0], startKm: 0, endKm: 0.9 })).toBeNull();
    expect(splitBounds({ ...plan[0], kind: "neutral" })).toBeNull();
  });

  it("knipt niet meer boven het maximum aantal stukken", () => {
    // 30 stukken van 0,6 km op een route van 18 km, plus een lang laatste stuk.
    const many: PlanSegment[] = Array.from({ length: MAX_EDIT_PIECES }, (_, i) => ({
      startKm: i * 0.6,
      endKm: i === MAX_EDIT_PIECES - 1 ? 20 : (i + 1) * 0.6,
      targetWkg: 3,
      label: `S${i}`,
      effort: "tempo" as const,
    }));
    expect(splitBounds(many[many.length - 1])).not.toBeNull();
    expect(applySplit(many, many.length - 1, 19)).toBe(many);
  });
});

describe("samenvoegen", () => {
  it("neemt het gemiddelde naar afstand en laat het accent alleen bij gelijke accenten", () => {
    const out = applyMerge(plan, 1);
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ startKm: 12, endKm: 20, targetWkg: 3.38, accentId: null });
  });

  it("maakt van twee helften weer het oorspronkelijke label", () => {
    expect(applyMerge(applySplit(plan, 0, 6), 0)[0]).toMatchObject({ label: "Vlak", startKm: 0, endKm: 12 });
  });

  it("voegt geen vast stuk samen", () => {
    const withNeutral: PlanSegment[] = [
      plan[0],
      { startKm: 12, endKm: 20, targetWkg: 2, label: "Neutraal", effort: "rustig", kind: "neutral" },
    ];
    expect(canMergeWithNext(withNeutral, 0)).toBe(false);
    expect(applyMerge(withNeutral, 0)).toBe(withNeutral);
  });
});

describe("validateEditedPlan", () => {
  it("accepteert een eigen indeling en leidt accent en inspanning af", () => {
    const edited = applySplit(plan, 0, 6).map((s, i) => (i === 1 ? { ...s, targetWkg: 4.2 } : s));
    const result = validateEditedPlan(asInput(edited), route(), MODEL, plan);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.segments).toHaveLength(4);
    expect(result.segments[2]).toMatchObject({ accentId: "klim", label: "Klim" });
    expect(result.segments[1]).toMatchObject({ effort: "vol", accentId: null });
    expect(result.segments[3].endKm).toBe(route().totalKm);
  });

  it("weigert gaten, overlap, een te kort stuk en een plan dat de finish mist", () => {
    const gap = asInput(plan).map((s, i) => (i === 1 ? { ...s, startKm: 12.5 } : s));
    expect(validateEditedPlan(gap, route(), MODEL, plan)).toMatchObject({ ok: false });
    const overlap = asInput(plan).map((s, i) => (i === 1 ? { ...s, startKm: 11 } : s));
    expect(validateEditedPlan(overlap, route(), MODEL, plan)).toMatchObject({ ok: false });
    const tiny = [
      { startKm: 0, endKm: 0.2, targetWkg: 3, label: "a" },
      { startKm: 0.2, endKm: 20, targetWkg: 3, label: "b" },
    ];
    expect(validateEditedPlan(tiny, route(), MODEL, plan)).toMatchObject({ ok: false });
    const short = asInput(plan).slice(0, 2);
    expect(validateEditedPlan(short, route(), MODEL, plan)).toMatchObject({ ok: false });
  });

  it("negeert een gemanipuleerd neutraal stuk en zet de zone uit de route terug", () => {
    const fake: EditedSegmentInput[] = [
      { startKm: 0, endKm: 8, targetWkg: 3, label: "Nep", kind: "neutral" },
      { startKm: 8, endKm: 20, targetWkg: 3, label: "Rest" },
    ];
    const result = validateEditedPlan(fake, route([{ startKm: 2, endKm: 4 }]), MODEL, plan);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const neutral = result.segments.filter((s) => s.kind === "neutral");
    expect(neutral).toHaveLength(1);
    expect(neutral[0]).toMatchObject({ startKm: 2, endKm: 4 });
    // De rest van de route blijft gedekt.
    expect(result.segments[0].startKm).toBe(0);
    expect(result.segments.at(-1)?.endKm).toBe(route().totalKm);
  });

  it("begrenst doelen en labels", () => {
    const wild = asInput(plan).map((s, i) =>
      i === 0 ? { ...s, targetWkg: 40, label: "x".repeat(100) } : i === 2 ? { ...s, targetWkg: 0 } : s,
    );
    const result = validateEditedPlan(wild, route(), MODEL, plan);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.segments[0].targetWkg).toBe(12);
    expect(result.segments[0].label).toHaveLength(60);
    expect(result.segments[2].targetWkg).toBe(0.5);
  });

  it("weigert meer dan het maximum aantal stukken", () => {
    const pieces = Array.from({ length: MAX_EDIT_PIECES + 1 }, (_, i) => ({
      startKm: (i * 20) / (MAX_EDIT_PIECES + 1),
      endKm: ((i + 1) * 20) / (MAX_EDIT_PIECES + 1),
      targetWkg: 3,
      label: "s",
    }));
    expect(validateEditedPlan(pieces, route(), MODEL, plan)).toMatchObject({ ok: false });
  });
});
