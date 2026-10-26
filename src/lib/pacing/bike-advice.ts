// Welke fiets is het snelst op deze route? Het antwoord van ZwiftBikes
// (zwiftbikes.com), maar met ons eigen model: dezelfde fysica, fietslijst en
// eventregels als het pacingplan, zodat het advies en de plantijd elkaar niet
// tegenspreken. Hun MCP-server zit achter Cloudflare Access en is niet vanuit
// ZWB aan te roepen; zie PLAN.md (2026-10-20).
//
// Puur. De aanroeper geeft een functie die bij een fysica de eindtijd geeft:
// het pacingplan rekent zijn eigen plan door, de briefing een vast vermogen.
// Met een garage (zwift-garage.ts) rijdt elk frame uit de garage op zijn eigen
// upgradeniveau en elk ander frame op stage 0, wat je krijgt als je het koopt.
// Met garageOnly alleen wat het lid in Zwift heeft.
//
// Alle combinaties frame × wielen doorrekenen is 146 × 74 keer de route. Het
// kan in drie stappen omdat frame en wielen in ons model optellen (CdA en massa
// zijn verschillen met de referentiefiets): eerst de beste wielen per fietstype
// op het testframe van dat type, dan elk frame met die wielen, en voor de
// koplopers nog de nummers twee en drie van de wielen, omdat de beste wielset
// bij een ander frametempo net anders kan uitvallen.

import {
  findFrame,
  positionCdaFactor,
  resolveRidePhysics,
  segmentCrr,
  wheelTestFrame,
  type BikeKind,
  type BikePart,
  type EventConstraints,
  type RidePhysics,
  type RideSetup,
} from "@/lib/pacing/zwift-setup";
import { estimateRide } from "@/lib/ride-estimate";
import type { PacingRoute } from "@/lib/pacing/route-profile";
import type { ZwiftGarage } from "@/lib/pacing/zwift-garage";

/** Het frame waarmee het pacingplan zonder keuze rekent. */
export const REFERENCE_FRAME = "Zwift Carbon";

export type BikeChoice = {
  frame: string;
  kind: BikeKind;
  /** Halo-fiets: de wielen horen bij het frame. */
  fixedWheels: boolean;
  /** null = de wielen waarmee het frame getest is. */
  wheels: string | null;
  /** Upgradeniveau waarop dit frame gerekend is. */
  stage: number;
  /** Frame en wielen staan in de garage; null zonder garage. */
  owned: boolean | null;
  seconds: number;
};

export type BikeAdvice = {
  /** Upgradeniveau waarop alle frames vergeleken zijn; null = per frame uit de garage. */
  stage: number | null;
  /** Snelste eerst, één regel per frame. */
  best: BikeChoice[];
  /** De opzet zoals die nu is (pacingplan) of de referentiefiets (briefing). */
  current: BikeChoice;
};

/** Zoveel wielsets per fietstype krijgen bij de koplopers een tweede kans. */
const WHEEL_SHORTLIST = 3;

export function adviseBikes(input: {
  parts: BikePart[];
  constraints: EventConstraints;
  setup: RideSetup;
  weightKg: number;
  heightCm: number | null;
  seconds: (physics: RidePhysics) => number;
  limit?: number;
  /**
   * Wat het lid in Zwift heeft: een frame uit de garage rijdt op zijn eigen
   * upgradeniveau, elk ander frame op stage 0.
   */
  garage?: ZwiftGarage | null;
  /** Alleen frames en wielen uit de garage. Wielen leeg = alle wielen. */
  garageOnly?: boolean;
}): BikeAdvice | null {
  const { parts, constraints, setup } = input;
  const garage = input.garage ?? null;
  const limit = input.limit ?? 3;
  // Een opgelegd frame laat niets te kiezen.
  if (constraints.forcedFrame || !parts.some((part) => part.part === "frame")) return null;
  const stage = constraints.upgradesDisabled ? 0 : setup.stage;
  const stageFor = (frame: string | null) =>
    constraints.upgradesDisabled ? 0 : garage ? (frame ? (garage.frames[frame] ?? 0) : 0) : stage;
  const ownedWheels = garage && garage.wheels.length > 0 ? new Set(garage.wheels) : null;
  const only = garage !== null && input.garageOnly === true;
  // De standaardwielen van het testframe heeft iedereen.
  const ownedFor = (frame: string | null, wheels: string | null) =>
    garage ? (frame ?? REFERENCE_FRAME) in garage.frames && (wheels === null || !ownedWheels || ownedWheels.has(wheels)) : null;

  const timeFor = (frame: string | null, wheels: string | null, frameStage = stageFor(frame)) =>
    input.seconds(
      resolveRidePhysics({
        setup: { ...setup, frame, wheels, stage: frameStage },
        constraints,
        parts,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
      }),
    );

  const frames: Array<{ name: string; kind: BikeKind; fixedWheels: boolean }> = [];
  for (const name of new Set(parts.filter((part) => part.part === "frame").map((part) => part.name))) {
    if (only && !(name in garage.frames)) continue;
    const frame = findFrame(parts, name, stageFor(name));
    if (!frame || (frame.kind === "tt" && !constraints.ttBikesAllowed)) continue;
    frames.push({ name, kind: frame.kind, fixedWheels: frame.fixedWheels === true });
  }
  if (frames.length === 0) return null;

  // Stap 1: wielen per fietstype, op het frame waarop ze gemeten zijn.
  const wheelsByKind = new Map<BikeKind, Array<string | null>>();
  for (const kind of new Set(frames.map((frame) => frame.kind))) {
    const testFrame = wheelTestFrame(kind);
    const names = parts
      .filter((part) => part.part === "wheel" && part.testFrame === testFrame)
      .filter((part) => !only || !ownedWheels || ownedWheels.has(part.name))
      .map((part) => part.name);
    if (constraints.forcedWheels || !testFrame || names.length === 0) {
      wheelsByKind.set(kind, [null]);
      continue;
    }
    const probe = frames.some((frame) => frame.name === testFrame)
      ? testFrame
      : frames.find((frame) => frame.kind === kind && !frame.fixedWheels)?.name;
    if (!probe) {
      wheelsByKind.set(kind, [null]);
      continue;
    }
    const ranked = [null, ...names]
      .map((wheels) => ({ wheels, seconds: timeFor(probe, wheels) }))
      .sort((a, b) => a.seconds - b.seconds);
    wheelsByKind.set(kind, ranked.slice(0, WHEEL_SHORTLIST).map((item) => item.wheels));
  }

  const wheelsFor = (frame: { kind: BikeKind; fixedWheels: boolean }) =>
    frame.fixedWheels ? [null] : wheelsByKind.get(frame.kind)!;

  // Stap 2: elk frame met de beste wielen van zijn type.
  const rows: BikeChoice[] = frames
    .map((frame) => {
      const wheels = wheelsFor(frame)[0];
      return {
        frame: frame.name,
        kind: frame.kind,
        fixedWheels: frame.fixedWheels,
        wheels,
        stage: stageFor(frame.name),
        owned: ownedFor(frame.name, wheels),
        seconds: timeFor(frame.name, wheels),
      };
    })
    .sort((a, b) => a.seconds - b.seconds);

  // Stap 3: de koplopers met de andere wielen van de shortlist.
  const contenders = rows.slice(0, limit + 3).map((row) => {
    let best = row;
    for (const wheels of wheelsFor(row).slice(1)) {
      const seconds = timeFor(row.frame, wheels);
      if (seconds < best.seconds) best = { ...row, wheels, owned: ownedFor(row.frame, wheels), seconds };
    }
    return best;
  });
  contenders.sort((a, b) => a.seconds - b.seconds);

  // Zoals resolveRidePhysics: een verboden tijdritfiets wordt de referentiefiets.
  // De huidige opzet rekent op het niveau dat in die opzet staat, ook met garage.
  const chosen = findFrame(parts, setup.frame, stage);
  const currentFrame = chosen?.kind === "tt" && !constraints.ttBikesAllowed ? null : chosen;
  return {
    stage: garage && !constraints.upgradesDisabled ? null : stage,
    best: contenders.slice(0, limit),
    current: {
      frame: currentFrame?.name ?? REFERENCE_FRAME,
      kind: currentFrame?.kind ?? "road",
      fixedWheels: currentFrame?.fixedWheels === true,
      wheels: constraints.forcedWheels || currentFrame?.fixedWheels ? null : setup.wheels,
      stage,
      owned: ownedFor(setup.frame, setup.wheels),
      seconds: timeFor(setup.frame, setup.wheels, stage),
    },
  };
}

/**
 * Eindtijd op een vast vermogen, voor wie geen eigen plan heeft (de briefing).
 * Slipstream naar het format: in een wedstrijd de hele rit in de groep.
 */
export function steadySeconds(
  route: PacingRoute,
  physics: RidePhysics,
  watts: number,
  weightKg: number,
): number {
  const cda = physics.cda * positionCdaFactor(physics, undefined);
  const massKg = weightKg + physics.bikeKg;
  return estimateRide({
    segments: route.segments.map((segment) => ({
      distanceM: segment.distanceM,
      gradient: segment.gradient,
      watts,
      cda,
      crr: segmentCrr(physics, segment.surface),
      massKg,
    })),
    totalMassKg: massKg,
  }).totalSeconds;
}
