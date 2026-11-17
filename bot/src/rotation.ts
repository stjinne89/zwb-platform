// De rotatie van een ploegentijdrit: wie rijdt op kop, hoe lang nog, wie volgt.
// Puur: elke functie krijgt de tijd mee en geeft een nieuwe toestand terug.

import type { PlanRider } from "./plan.ts";

/** Seconden voor een wissel waarop de bot aftelt. */
export const COUNTDOWN = [30, 10, 5];
/** Seconden voor de start waarop de bot aftelt. */
export const START_COUNTDOWN = [60, 30, 10, 5];

/** `skipping`: slaat zijn volgende kopbeurt over en draait daarna vanzelf weer mee. */
export type RotationRider = PlanRider & { out: boolean; skipping: boolean };

export type Rotation = {
  riders: RotationRider[];
  /** Index van de koprijder; -1 tot de start. */
  current: number;
  /** Begin van de huidige kopbeurt, in ms. */
  startedAt: number;
  /** Einde van de huidige kopbeurt, of vóór de start het startmoment, in ms. */
  endsAt: number;
  /** Aftelmomenten die al geweest zijn. */
  announced: number[];
};

export type RotationEvent =
  | { type: "start-countdown"; seconds: number; first: number }
  | { type: "countdown"; seconds: number; current: number; next: number }
  /** `previous` is -1 bij de start; `synced` als Sauce de wissel zag. */
  | { type: "change"; rider: number; previous: number; synced: boolean };

type Step = { rotation: Rotation; events: RotationEvent[] };

export function createRotation(riders: PlanRider[], startAt: number): Rotation {
  return {
    riders: riders.map((rider) => ({ ...rider, out: false, skipping: false })),
    current: -1,
    startedAt: startAt,
    endsAt: startAt,
    announced: [],
  };
}

/** De volgende renner die een kopbeurt doet, of -1 als er geen ander is. */
export function nextIndex(rotation: Rotation, from = rotation.current): number {
  const count = rotation.riders.length;
  for (let step = 1; step <= count; step += 1) {
    const index = (((from + step) % count) + count) % count;
    const rider = rotation.riders[index];
    if (index !== from && !rider.out && !rider.skipping && rider.pullSeconds > 0) return index;
  }
  return -1;
}

function lead(rotation: Rotation, index: number, startMs: number): Rotation {
  const seconds = rotation.riders[index].pullSeconds;
  return {
    ...rotation,
    current: index,
    startedAt: startMs,
    endsAt: startMs + seconds * 1000,
    // Niet "nog 30 seconden" roepen aan het begin van een kopbeurt van 30.
    announced: COUNTDOWN.filter((mark) => mark >= seconds),
  };
}

/** Wie de rotatie van de koprijder naar `to` overslaat, heeft zijn beurt overgeslagen: hij draait weer mee. */
function passOver(rotation: Rotation, to: number): Rotation {
  const count = rotation.riders.length;
  const passed = new Set<number>();
  for (let index = (rotation.current + 1 + count) % count; index !== to && passed.size < count; index = (index + 1) % count) {
    passed.add(index);
  }
  if (![...passed].some((index) => rotation.riders[index].skipping)) return rotation;
  return {
    ...rotation,
    riders: rotation.riders.map((rider, index) => (passed.has(index) ? { ...rider, skipping: false } : rider)),
  };
}

/** Het kleinste aftelmoment dat nu aan de beurt is, en alles wat daarmee geweest is. */
function due(marks: number[], announced: number[], remainingMs: number) {
  const passed = marks.filter((mark) => remainingMs <= mark * 1000 && !announced.includes(mark));
  return passed.length === 0
    ? null
    : { seconds: Math.min(...passed), announced: [...announced, ...passed] };
}

export function tick(input: Rotation, now: number): Step {
  let rotation = input;
  const events: RotationEvent[] = [];

  if (rotation.current === -1) {
    const first = nextIndex(rotation, -1);
    if (first === -1) return { rotation, events };
    if (now < rotation.endsAt) {
      const mark = due(START_COUNTDOWN, rotation.announced, rotation.endsAt - now);
      if (!mark) return { rotation, events };
      return {
        rotation: { ...rotation, announced: mark.announced },
        events: [{ type: "start-countdown", seconds: mark.seconds, first }],
      };
    }
    rotation = lead(passOver(rotation, first), first, rotation.endsAt);
    events.push({ type: "change", rider: first, previous: -1, synced: false });
  }

  // Meer dan één wissel gemist (de bot stond even stil): alleen de laatste telt.
  for (let guard = 0; now >= rotation.endsAt && guard < 10_000; guard += 1) {
    const next = nextIndex(rotation);
    const previous = rotation.current;
    if (next === -1) {
      // Niemand om af te lossen: dezelfde renner begint opnieuw, en wie zou overslaan, heeft dat gedaan.
      const seconds = Math.max(1, rotation.riders[previous].pullSeconds);
      rotation = {
        ...rotation,
        riders: rotation.riders.map((rider) => (rider.skipping ? { ...rider, skipping: false } : rider)),
        startedAt: rotation.endsAt,
        endsAt: rotation.endsAt + seconds * 1000,
      };
      continue;
    }
    rotation = lead(passOver(rotation, next), next, rotation.endsAt);
    const start = events.find((event) => event.type === "change" && event.previous === -1);
    events.length = 0;
    events.push({ type: "change", rider: next, previous: start ? -1 : previous, synced: false });
  }
  if (events.length > 0) return { rotation, events };

  const next = nextIndex(rotation);
  if (next === -1) return { rotation, events };
  const mark = due(COUNTDOWN, rotation.announced, rotation.endsAt - now);
  if (!mark) return { rotation, events };
  return {
    rotation: { ...rotation, announced: mark.announced },
    events: [{ type: "countdown", seconds: mark.seconds, current: rotation.current, next }],
  };
}

/** Sla de rest van de kopbeurt over. Vóór de start: begin nu. */
export function skip(rotation: Rotation, now: number): Step {
  if (rotation.current === -1) return tick({ ...rotation, endsAt: now }, now);
  const next = nextIndex(rotation);
  if (next === -1) return { rotation, events: [] };
  return {
    rotation: lead(passOver(rotation, next), next, now),
    events: [{ type: "change", rider: next, previous: rotation.current, synced: false }],
  };
}

/** Verleng de huidige kopbeurt (of stel de start uit). */
export function plus(rotation: Rotation, seconds: number, now: number): Rotation {
  const endsAt = rotation.endsAt + seconds * 1000;
  const marks = rotation.current === -1 ? START_COUNTDOWN : COUNTDOWN;
  // Aftelmomenten die door de verlenging weer vóór ons liggen, komen opnieuw.
  return {
    ...rotation,
    endsAt,
    announced: marks.filter(
      (mark) => rotation.announced.includes(mark) && endsAt - now <= mark * 1000,
    ),
  };
}

/** Renner gelost (`out`) of terug. Lost de koprijder, dan volgt meteen de volgende. */
export function setOut(input: Rotation, index: number, out: boolean, now: number): Step {
  if (!input.riders[index] || input.riders[index].out === out) {
    return { rotation: input, events: [] };
  }
  const rotation = {
    ...input,
    riders: input.riders.map((rider, i) => (i === index ? { ...rider, out } : rider)),
  };
  return out && index === rotation.current ? skip(rotation, now) : { rotation, events: [] };
}

/**
 * Andere kopbeurtduur voor één renner (`/ttt beurt`), voor de rest van de race.
 * Rijdt hij nu op kop, dan geldt de nieuwe duur ook voor deze beurt. 0 is
 * meerijden zonder kopbeurt; dat kan niet als niemand anders er nog een doet.
 */
export function setPullSeconds(input: Rotation, index: number, seconds: number, now: number): Rotation {
  if (!input.riders[index]) return input;
  const riders = input.riders.map((rider, i) => (i === index ? { ...rider, pullSeconds: seconds } : rider));
  if (!riders.some((rider) => rider.pullSeconds > 0)) return input;
  if (index !== input.current) return { ...input, riders };
  const endsAt = input.startedAt + Math.max(1, seconds) * 1000;
  return {
    ...input,
    riders,
    endsAt,
    // Wat door een langere beurt weer vóór ons ligt, komt opnieuw; geen "nog 30" in een beurt van 30.
    announced: COUNTDOWN.filter(
      (mark) => mark >= seconds || (input.announced.includes(mark) && endsAt - now <= mark * 1000),
    ),
  };
}

/**
 * Eén kopbeurt overslaan, of dat weer intrekken. Rijdt hij nu op kop, dan
 * volgt meteen de volgende, net als bij Volgende.
 */
export function setSkipping(input: Rotation, index: number, on: boolean, now: number): Step {
  const rider = input.riders[index];
  if (!rider || rider.out || rider.skipping === on) return { rotation: input, events: [] };
  if (on && index === input.current) return skip(input, now);
  return {
    rotation: { ...input, riders: input.riders.map((r, i) => (i === index ? { ...r, skipping: on } : r)) },
    events: [],
  };
}

export function sameRider(a: PlanRider, b: PlanRider) {
  return a.zwiftId && b.zwiftId ? a.zwiftId === b.zwiftId : a.name === b.name;
}

/**
 * Ander plan voor het volgende deel van de race: andere volgorde, watt en duur.
 * De koprijder maakt zijn kopbeurt af; daarna geldt het nieuwe plan. Wie gelost
 * is, blijft gelost. Staat de koprijder niet in het nieuwe plan, dan begint de
 * eerste renner daarvan meteen.
 */
export function replan(rotation: Rotation, riders: PlanRider[], now: number): Step {
  const next: Rotation = {
    ...rotation,
    riders: riders.map((rider) => ({
      ...rider,
      out: rotation.riders.some((old) => old.out && sameRider(old, rider)),
      skipping: rotation.riders.some((old) => old.skipping && sameRider(old, rider)),
    })),
  };
  if (rotation.current === -1) return { rotation: next, events: [] };

  const leader = rotation.riders[rotation.current];
  const current = next.riders.findIndex((rider) => !rider.out && sameRider(leader, rider));
  if (current !== -1) return { rotation: { ...next, current }, events: [] };

  const first = nextIndex(next, -1);
  if (first === -1) return { rotation, events: [] };
  return {
    rotation: lead(next, first, now),
    events: [{ type: "change", rider: first, previous: first, synced: false }],
  };
}

/**
 * Na een pauze (vrij rijden, bijvoorbeeld op een klim) begint de rotatie opnieuw: met de renner
 * die nu vooraan rijdt als die bekend is en een kopbeurt doet, anders met de
 * volgende in het plan. De kopbeurt begint op dit moment.
 */
export function resume(rotation: Rotation, index: number, now: number): Rotation {
  const rider = rotation.riders[index];
  const eligible = rider && !rider.out && rider.pullSeconds > 0;
  const target = eligible ? index : nextIndex(rotation);
  return lead(rotation, target === -1 ? rotation.current : target, now);
}

/**
 * Sauce ziet deze renner op kop komen. Is dat een ander dan de klok dacht, dan
 * volgt de rotatie de ploeg: zijn kopbeurt telt vanaf `since`, het moment dat
 * hij vooraan kwam. Is het de renner die de klok riep, dan verandert er niets:
 * de kopbeurt telt vanaf "Wissel". Opnieuw beginnen op het moment dat Sauce hem
 * zag, maakte elke beurt de duur van de wissel langer (B3, 2026-11-17: 30 s
 * werd 41 s, 60 s werd 70 s).
 */
export function syncLeader(rotation: Rotation, index: number, now: number, since = now): Step {
  const rider = rotation.riders[index];
  if (rotation.current === -1 || !rider || rider.out || index === rotation.current) {
    return { rotation, events: [] };
  }
  // Een renner zonder kopbeurt in het plan krijgt de kortste beurt van de ploeg.
  const seconds =
    rider.pullSeconds ||
    Math.min(...rotation.riders.filter((r) => r.pullSeconds > 0).map((r) => r.pullSeconds));
  const from = Math.min(now, Math.max(since, rotation.startedAt));
  const next = lead(rotation, index, from);
  return {
    rotation: { ...next, endsAt: from + seconds * 1000 },
    events: [{ type: "change", rider: index, previous: rotation.current, synced: true }],
  };
}
