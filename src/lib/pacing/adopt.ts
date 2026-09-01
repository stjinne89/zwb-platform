// Van AI-uitvoer naar een uitvoerbaar plan.
//
// Het json_schema garandeert de vórm van het antwoord — de juiste velden, de
// juiste types, hooguit dertig stukken. Het garandeert niet dat die stukken de
// route dekken, op volgorde staan, niet overlappen, of binnen de route vallen.
// Dat is precies waar een taalmodel op struikelt: het schrijft "km 8 tot 10" en
// daarna "km 9 tot 14", of vergeet de laatste vijf kilometer.
//
// Dit bestand repareert dat op één manier en meldt wat het deed, zodat het lid
// ziet dat er iets is bijgesteld. Daarna gaan de stukken door clampPlan en
// rebalancePlan, en heeft de fysica het laatste woord.

import type { GeneratedPacingPlan } from "@/lib/pacing/ai";
import type { CpModel, CurvePoint } from "@/lib/pacing/cp";
import type { DurabilityModel } from "@/lib/pacing/durability";
import type { PacingRoute } from "@/lib/pacing/route-profile";
import {
  rebalancePlan,
  type PlanEffort,
  type PlanSegment,
  type RebalanceResult,
} from "@/lib/pacing/plan";

/** Gaten kleiner dan dit zijn afrondingsruis, geen ontbrekend stuk. */
const GAP_TOLERANCE_KM = 0.2;

const EFFORTS: PlanEffort[] = ["rustig", "duur", "tempo", "drempel", "vol"];

export type AdoptResult = RebalanceResult & {
  strategy: string;
  risks: string[];
  /** Wat er aan de AI-uitvoer is rechtgezet voordat er gerekend werd. */
  repairs: string[];
};

/**
 * Maakt van de ruwe modeluitvoer een aaneengesloten plan over de hele route.
 * Volgorde van bewerkingen: onbruikbare stukken eruit, binnen de route trekken,
 * sorteren, overlap wegsnijden, gaten vullen, staart aanvullen.
 */
export function normalizeGeneratedSegments(
  generated: GeneratedPacingPlan["segments"],
  route: PacingRoute,
): { segments: PlanSegment[]; repairs: string[] } {
  const repairs: string[] = [];
  const totalKm = route.totalKm;
  const accentIds = new Set(route.accents.map((accent) => accent.id));

  const usable = generated
    .map((segment) => ({
      startKm: clamp(Number(segment.startKm), 0, totalKm),
      endKm: clamp(Number(segment.endKm), 0, totalKm),
      targetWkg: Number(segment.targetWkg),
      label: String(segment.label ?? "").trim() || "Stuk",
      effort: EFFORTS.includes(segment.effort as PlanEffort)
        ? (segment.effort as PlanEffort)
        : "tempo",
      rationale: String(segment.rationale ?? "").trim() || undefined,
      accentId: accentIds.has(segment.accentId) ? segment.accentId : null,
    }))
    .filter(
      (segment) =>
        Number.isFinite(segment.startKm) &&
        Number.isFinite(segment.endKm) &&
        Number.isFinite(segment.targetWkg) &&
        segment.targetWkg > 0 &&
        segment.endKm > segment.startKm,
    )
    .sort((a, b) => a.startKm - b.startKm);

  if (usable.length !== generated.length) {
    repairs.push(
      `${generated.length - usable.length} onbruikbaar stuk uit het voorstel verwijderd.`,
    );
  }

  if (usable.length === 0) {
    return { segments: [], repairs };
  }

  const out: PlanSegment[] = [];
  let overlaps = 0;
  let gaps = 0;
  let cursor = 0;

  for (const segment of usable) {
    let start = segment.startKm;

    if (start < cursor - 1e-9) {
      // Overlapt met het vorige stuk: inkorten in plaats van weggooien, want de
      // inhoud klopt meestal wel — alleen de grens niet.
      overlaps += 1;
      start = cursor;
      if (segment.endKm <= start + 1e-9) continue;
    }

    if (start > cursor + GAP_TOLERANCE_KM) {
      gaps += 1;
      out.push(fillerSegment(cursor, start, segment.targetWkg, out));
    } else if (start > cursor) {
      // Klein gaatje: aan het vorige stuk plakken.
      start = cursor;
    }

    out.push({ ...segment, startKm: start });
    cursor = segment.endKm;
  }

  if (cursor < totalKm - GAP_TOLERANCE_KM) {
    gaps += 1;
    out.push(fillerSegment(cursor, totalKm, out[out.length - 1].targetWkg, out));
  } else if (cursor < totalKm) {
    out[out.length - 1] = { ...out[out.length - 1], endKm: totalKm };
  }

  if (overlaps > 0) {
    repairs.push(`${overlaps} overlappend stuk ingekort.`);
  }
  if (gaps > 0) {
    repairs.push(`${gaps} gat in het plan opgevuld.`);
  }

  return { segments: out, repairs };
}

/**
 * Een opvulstuk krijgt het laagste doel van zijn buren. Een gat betekent dat het
 * model dat stuk niet belangrijk vond; daar dan het gemiddelde op zetten maakt er
 * stilzwijgend een inspanning van.
 */
function fillerSegment(
  startKm: number,
  endKm: number,
  nextWkg: number,
  before: PlanSegment[],
): PlanSegment {
  const previousWkg = before[before.length - 1]?.targetWkg;
  const targetWkg =
    previousWkg != null ? Math.min(previousWkg, nextWkg) : nextWkg;
  return {
    startKm,
    endKm,
    targetWkg,
    label: "Tussenstuk",
    effort: "duur",
    rationale: "Aangevuld: dit stuk stond niet in het voorstel.",
    accentId: null,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * De volledige weg van modeluitvoer naar een plan dat het lid kan gebruiken:
 * repareren, begrenzen op wat de renner kan, en terugschalen tot de anaerobe
 * reserve de finish haalt.
 */
export function adoptGeneratedPlan(
  generated: GeneratedPacingPlan,
  route: PacingRoute,
  model: CpModel,
  options: {
    curve?: CurvePoint[] | null;
    durability?: DurabilityModel | null;
  } = {},
): AdoptResult {
  const { segments, repairs } = normalizeGeneratedSegments(
    generated.segments,
    route,
  );
  const rebalanced = rebalancePlan(segments, route, model, options.curve, {
    durability: options.durability ?? null,
  });

  return {
    ...rebalanced,
    strategy: generated.strategy,
    risks: generated.risks,
    repairs,
  };
}
