// Het deterministische pacingvoorstel.
//
// Twee rollen. Het is het vertrekpunt dat de AI meekrijgt — een model dat met
// een leeg vel begint, verzint een verdeling; een model dat een doorgerekend
// voorstel ziet, verbetert het. En het is de terugval: faalt de generatie of
// staat AI uit, dan is er nog steeds een plan in plaats van een leeg scherm.
//
// De redenering is bewust simpel en navolgbaar: kies een basisintensiteit die
// bij de verwachte duur past, leg daar een opslag op de klimmen bovenop naar
// gelang hun lengte en steilte en het type renner, en laat rebalancePlan het
// resultaat terugschalen tot de anaerobe reserve het houdt.

import type { RiderType } from "@/lib/teams/power-profile";
import type { CpModel, CurvePoint } from "@/lib/pacing/cp";
import type { DurabilityModel } from "@/lib/pacing/durability";
import type { PacingAccent, PacingRoute } from "@/lib/pacing/route-profile";
import {
  evaluatePlan,
  rebalancePlan,
  type PlanEffort,
  type PlanSegment,
  type RebalanceResult,
} from "@/lib/pacing/plan";

/**
 * Welk deel van CP een renner over een hele rit volhoudt, naar duur. Boven het
 * uur zakt dat snel; daaronder nadert het CP zelf. Ankerpunten, daartussen
 * lineair over de logaritme van de duur.
 */
const DURATION_ANCHORS: Array<{ seconds: number; fraction: number }> = [
  { seconds: 20 * 60, fraction: 0.98 },
  { seconds: 60 * 60, fraction: 0.9 },
  { seconds: 2 * 3600, fraction: 0.82 },
  { seconds: 3 * 3600, fraction: 0.76 },
  { seconds: 5 * 3600, fraction: 0.68 },
  { seconds: 8 * 3600, fraction: 0.6 },
];

export function durationIntensityFraction(seconds: number): number {
  const first = DURATION_ANCHORS[0];
  const last = DURATION_ANCHORS[DURATION_ANCHORS.length - 1];
  if (seconds <= first.seconds) return first.fraction;
  if (seconds >= last.seconds) return last.fraction;

  for (let i = 1; i < DURATION_ANCHORS.length; i++) {
    const a = DURATION_ANCHORS[i - 1];
    const b = DURATION_ANCHORS[i];
    if (seconds <= b.seconds) {
      const t =
        (Math.log(seconds) - Math.log(a.seconds)) /
        (Math.log(b.seconds) - Math.log(a.seconds));
      return a.fraction + (b.fraction - a.fraction) * t;
    }
  }
  return last.fraction;
}

/**
 * Opslag op een klim, als factor op de basisintensiteit. Een korte steile klim
 * mag harder dan een lange; op een lange klim is een opslag juist een manier om
 * jezelf op te blazen.
 */
function climbBoost(accent: PacingAccent, riderType: RiderType): number {
  const lengthKm = Math.max(0.1, accent.endKm - accent.startKm);
  const gradientPct = accent.avgGradient * 100;

  // Basis: hoe korter, hoe meer ruimte. 1 km → +18 %, 5 km → +8 %, 15 km → +3 %.
  let boost = 0.03 + 0.15 / Math.max(1, lengthKm);
  // Steilte telt mee: onder de 3 % is het geen klim maar een valse vlakte.
  if (gradientPct < 3) boost *= 0.5;
  else if (gradientPct > 8) boost *= 1.2;

  // Rennerstype: een klimmer wint hier, een tijdrijder juist niet.
  const typeFactor: Partial<Record<RiderType, number>> = {
    climber: 1.3,
    puncher: 1.2,
    sprinter: 0.8,
    tter: 0.7,
  };
  boost *= typeFactor[riderType] ?? 1;

  return Math.min(0.3, boost);
}

/** Op een sprintsegment gaat het om een korte piek, niet om een tempo. */
function sprintBoost(riderType: RiderType): number {
  const typeFactor: Partial<Record<RiderType, number>> = {
    sprinter: 1.4,
    puncher: 1.2,
    climber: 0.8,
    tter: 0.9,
  };
  return Math.min(0.45, 0.25 * (typeFactor[riderType] ?? 1));
}

function effortFor(wkg: number, cpWkg: number): PlanEffort {
  const ratio = cpWkg > 0 ? wkg / cpWkg : 0;
  if (ratio < 0.62) return "rustig";
  if (ratio < 0.8) return "duur";
  if (ratio < 0.94) return "tempo";
  if (ratio <= 1.03) return "drempel";
  return "vol";
}

/**
 * Verdeelt de route in stukken: elk accent apart, en het stuk ertussen als
 * "tussenstuk". Zo is de lijst kort genoeg om te bewerken en lang genoeg om
 * ergens accent op te leggen.
 */
function splitIntoSegments(route: PacingRoute): Array<{
  startKm: number;
  endKm: number;
  accent: PacingAccent | null;
}> {
  const parts: Array<{ startKm: number; endKm: number; accent: PacingAccent | null }> = [];
  const accents = [...route.accents].sort((a, b) => a.startKm - b.startKm);

  let cursor = 0;
  for (const accent of accents) {
    const start = Math.max(cursor, accent.startKm);
    const end = Math.min(route.totalKm, accent.endKm);
    if (end <= start) continue;
    if (start > cursor + 0.2) {
      parts.push({ startKm: cursor, endKm: start, accent: null });
    }
    parts.push({ startKm: start, endKm: end, accent });
    cursor = end;
  }
  if (route.totalKm > cursor + 0.2) {
    parts.push({ startKm: cursor, endKm: route.totalKm, accent: null });
  }
  if (parts.length === 0) {
    parts.push({ startKm: 0, endKm: route.totalKm, accent: null });
  }
  return parts;
}

export type BaselineInput = {
  route: PacingRoute;
  model: CpModel;
  riderType?: RiderType;
  curve?: CurvePoint[] | null;
  /** Duurzaamheidsmodel, als het lid vermoeidheidscurves heeft. */
  durability?: DurabilityModel | null;
};

/**
 * Bouwt een voorstel en rekent het meteen door. De basisintensiteit hangt van
 * de duur af, maar de duur van de intensiteit — dus schatten we eerst op CP en
 * corrigeren daarna één keer met de gevonden duur. Verder itereren voegt niets
 * toe: het verschil zit in de derde decimaal.
 */
export function buildBaselinePlan(input: BaselineInput): RebalanceResult {
  const { route, model } = input;
  const riderType = input.riderType ?? "allrounder";
  const cpWkg = model.cpWatts / model.weightKg;
  const parts = splitIntoSegments(route);

  const draft = (fraction: number): PlanSegment[] =>
    parts.map((part, index) => {
      const accent = part.accent;
      const boost = accent
        ? accent.kind === "sprint"
          ? sprintBoost(riderType)
          : climbBoost(accent, riderType)
        : 0;
      // Tussen de accenten iets onder de basis: daar valt tijd te sparen zonder
      // dat het veel kost.
      const factor = accent ? fraction * (1 + boost) : fraction * 0.97;
      const wkg = Math.round(cpWkg * factor * 100) / 100;

      return {
        startKm: part.startKm,
        endKm: part.endKm,
        targetWkg: wkg,
        label: accent ? accent.name : partLabel(index, parts.length),
        effort: effortFor(wkg, cpWkg),
        accentId: accent?.id ?? null,
        rationale: accent
          ? accent.kind === "sprint"
            ? "Korte piek op een sprintsegment."
            : `Klim van ${(accent.endKm - accent.startKm).toFixed(1)} km à ${(accent.avgGradient * 100).toFixed(1)}%.`
          : "Tussenstuk: tempo houden, niets forceren.",
      };
    });

  // Eerste schatting op CP-tempo om de duur te leren kennen.
  const options = { durability: input.durability ?? null };
  const probe = evaluatePlan(draft(1), route, model, options);
  const fraction = durationIntensityFraction(probe.totalSeconds);

  return rebalancePlan(draft(fraction), route, model, input.curve, options);
}

function partLabel(index: number, total: number): string {
  if (index === 0) return "Start";
  if (index === total - 1) return "Naar de finish";
  return `Tussenstuk ${index}`;
}
