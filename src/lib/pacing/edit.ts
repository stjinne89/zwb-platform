// Een plan zelf indelen: stukken knippen en samenvoegen.
//
// Tot september 2026 lag de indeling vast bij het voorstel en kon een lid alleen
// per stuk een schuif verzetten. Wie op een vlak stuk van 8 km halverwege een
// versnelling wilde leggen, kon dat niet. Nu kan het lid knippen en samenvoegen.
//
// De editor rekent met dezelfde functies als de server, maar de server vertrouwt
// de invoer niet: validateEditedPlan zet grenzen op het raster, controleert dat de
// route gedekt is en leidt accent, inspanning en vaste stukken zelf opnieuw af.

import { effortFor } from "@/lib/pacing/baseline";
import type { CpModel } from "@/lib/pacing/cp";
import { imposeFixedPieces, isFixedPiece, type PlanSegment } from "@/lib/pacing/plan";
import type { PacingRoute } from "@/lib/pacing/route-profile";
import {
  POWERUP_IDS,
  type PowerupId,
  type RidePhysics,
  type RidePosition,
} from "@/lib/pacing/zwift-setup";

/** Kleiner dan dit is geen stuk om een eigen doel op te leggen. */
export const MIN_EDIT_PIECE_KM = 0.5;
/** Meer stukken onthoudt niemand; gelijk aan wat de AI mag. */
export const MAX_EDIT_PIECES = 30;
/** Grenzen op het segmentraster van 100 m. */
const GRID_KM = 0.1;
const TOTAL_TOLERANCE_KM = 0.05;
const MAX_LABEL = 60;

const snap = (km: number) => Math.round(km / GRID_KM) * GRID_KM;
const round2 = (value: number) => Math.round(value * 100) / 100;
const isFixed = isFixedPiece;
const FIXED_KINDS = ["neutral", "descent", "start", "sprint"] as const;
/** Vaste stukken waarop de server het doel van het lid overneemt. */
const OWN_TARGET_KINDS = ["descent", "start", "sprint"] as const;

/** Waar een stuk geknipt mag worden: op het raster, minstens 0,5 km van de randen. */
export function splitBounds(segment: PlanSegment): { minKm: number; maxKm: number } | null {
  const minKm = Math.ceil((segment.startKm + MIN_EDIT_PIECE_KM - 1e-9) / GRID_KM) * GRID_KM;
  const maxKm = Math.floor((segment.endKm - MIN_EDIT_PIECE_KM + 1e-9) / GRID_KM) * GRID_KM;
  if (isFixed(segment) || maxKm < minKm - 1e-9) return null;
  return { minKm: round2(minKm), maxKm: round2(maxKm) };
}

/** Knipt stuk `index` op `km` in twee, met hetzelfde doel. */
export function applySplit(segments: PlanSegment[], index: number, km: number): PlanSegment[] {
  const segment = segments[index];
  const bounds = segment ? splitBounds(segment) : null;
  if (!bounds || segments.length >= MAX_EDIT_PIECES) return segments;
  const at = round2(Math.min(bounds.maxKm, Math.max(bounds.minKm, snap(km))));
  const base = segment.label.replace(/ \(\d+\)$/, "");
  return [
    ...segments.slice(0, index),
    { ...segment, endKm: at, label: `${base} (1)` },
    { ...segment, startKm: at, label: `${base} (2)` },
    ...segments.slice(index + 1),
  ];
}

/** Mag stuk `index` samen met het volgende? Alleen twee gewone stukken. */
export function canMergeWithNext(segments: PlanSegment[], index: number): boolean {
  const a = segments[index];
  const b = segments[index + 1];
  return Boolean(a && b && !isFixed(a) && !isFixed(b));
}

/**
 * Voegt stuk `index` samen met het volgende. Het doel wordt het gemiddelde naar
 * afstand; het accent blijft alleen als beide stukken hetzelfde accent hadden.
 */
export function applyMerge(segments: PlanSegment[], index: number): PlanSegment[] {
  if (!canMergeWithNext(segments, index)) return segments;
  const a = segments[index];
  const b = segments[index + 1];
  const lengthA = a.endKm - a.startKm;
  const lengthB = b.endKm - b.startKm;
  const targetWkg = round2((a.targetWkg * lengthA + b.targetWkg * lengthB) / (lengthA + lengthB));
  const baseA = a.label.replace(/ \(\d+\)$/, "");
  const baseB = b.label.replace(/ \(\d+\)$/, "");
  return [
    ...segments.slice(0, index),
    {
      ...a,
      endKm: b.endKm,
      targetWkg,
      label: baseA === baseB ? baseA : a.label,
      accentId: (a.accentId ?? null) === (b.accentId ?? null) ? (a.accentId ?? null) : null,
      rationale: a.rationale === b.rationale ? a.rationale : undefined,
    },
    ...segments.slice(index + 2),
  ];
}

export type EditedSegmentInput = {
  startKm: number;
  endKm: number;
  targetWkg: number;
  label: string;
  kind?: string | null;
  position?: string | null;
  powerup?: string | null;
};

/**
 * Van formulierinvoer naar een plan dat de server bewaart, of een foutmelding.
 * Vaste stukken komen uit de route en het format, niet uit de invoer; alleen het
 * doel op een afdaling, start of sprint neemt de server over. Positie en powerup
 * gelden alleen bij Zwift, en een powerup alleen als het event hem uitdeelt.
 */
export function validateEditedPlan(
  input: EditedSegmentInput[],
  route: PacingRoute,
  model: CpModel,
  previous: PlanSegment[],
  ride: RidePhysics | null = null,
): { ok: true; segments: PlanSegment[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: "Het plan heeft geen stukken." };
  }
  if (input.length > MAX_EDIT_PIECES) {
    return { ok: false, error: `Hoogstens ${MAX_EDIT_PIECES} stukken.` };
  }

  const cpWkg = model.cpWatts / model.weightKg;
  const pieces = input.map((item) => ({
    startKm: round2(snap(Number(item.startKm))),
    endKm: round2(snap(Number(item.endKm))),
    targetWkg: Number(item.targetWkg),
    label: String(item.label ?? "").trim().slice(0, MAX_LABEL) || "Stuk",
    kind: FIXED_KINDS.find((kind) => kind === item.kind),
    position:
      ride?.format === "race" && (item.position === "bunch" || item.position === "alone")
        ? (item.position as RidePosition)
        : undefined,
    powerup:
      ride && POWERUP_IDS.includes(item.powerup as PowerupId) && ride.powerups.includes(item.powerup as PowerupId)
        ? (item.powerup as PowerupId)
        : undefined,
  }));

  if (pieces.some((piece) => ![piece.startKm, piece.endKm, piece.targetWkg].every(Number.isFinite))) {
    return { ok: false, error: "Een stuk heeft een ongeldig getal." };
  }
  if (Math.abs(pieces[0].startKm) > TOTAL_TOLERANCE_KM) {
    return { ok: false, error: "Het plan begint niet bij de start." };
  }
  if (Math.abs(pieces[pieces.length - 1].endKm - snap(route.totalKm)) > GRID_KM + TOTAL_TOLERANCE_KM) {
    return { ok: false, error: "Het plan loopt niet tot de finish." };
  }
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (i > 0 && Math.abs(piece.startKm - pieces[i - 1].endKm) > 1e-6) {
      return { ok: false, error: "De stukken sluiten niet op elkaar aan." };
    }
    // Een kort stuk naast een vast stuk (start, sprint, afdaling) is een rest die
    // het platform zelf liet staan; dat mag, anders valt zo'n plan niet op te slaan.
    const besideFixed = Boolean(pieces[i - 1]?.kind || pieces[i + 1]?.kind);
    if (
      piece.kind === undefined &&
      !besideFixed &&
      piece.endKm - piece.startKm < MIN_EDIT_PIECE_KM - 1e-6
    ) {
      return { ok: false, error: `Een stuk moet minstens ${MIN_EDIT_PIECE_KM} km zijn.` };
    }
  }

  // Laatste grens exact op de finish; het raster mag daar niet van afwijken.
  pieces[pieces.length - 1].endKm = route.totalKm;

  const accentFor = (startKm: number, endKm: number) => {
    let best: string | null = null;
    let bestKm = 0;
    for (const accent of route.accents) {
      const overlap = Math.min(endKm, accent.endKm) - Math.max(startKm, accent.startKm);
      if (overlap > bestKm) {
        best = accent.id;
        bestKm = overlap;
      }
    }
    return bestKm >= (endKm - startKm) / 2 ? best : null;
  };

  const rationaleFor = (startKm: number, endKm: number) =>
    previous.find(
      (old) => Math.abs(old.startKm - startKm) <= 0.05 && Math.abs(old.endKm - endKm) <= 0.05,
    )?.rationale;

  const segments: PlanSegment[] = pieces.map((piece) => {
    const targetWkg = round2(Math.min(12, Math.max(piece.kind === "descent" ? 0 : 0.5, piece.targetWkg)));
    const ownTarget = OWN_TARGET_KINDS.find((kind) => kind === piece.kind);
    return {
      startKm: piece.startKm,
      endKm: piece.endKm,
      targetWkg,
      label: piece.label,
      effort: effortFor(targetWkg, cpWkg),
      rationale: rationaleFor(piece.startKm, piece.endKm),
      accentId: piece.kind ? null : accentFor(piece.startKm, piece.endKm),
      ...(ownTarget ? { kind: ownTarget } : {}),
      ...(piece.position ? { position: piece.position } : {}),
      ...(piece.powerup ? { powerup: piece.powerup } : {}),
    };
  });

  return { ok: true, segments: imposeFixedPieces(segments, route, model, ride) };
}
