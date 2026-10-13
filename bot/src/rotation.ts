// De rotatie van een ploegentijdrit: wie rijdt op kop, hoe lang nog, wie volgt.
// Puur: elke functie krijgt de tijd mee en geeft een nieuwe toestand terug.

import type { PlanRider } from "./plan.ts";

/** Seconden voor een wissel waarop de bot aftelt. */
export const COUNTDOWN = [30, 10, 5];
/** Seconden voor de start waarop de bot aftelt. */
export const START_COUNTDOWN = [60, 30, 10, 5];
/** Zo lang na een wissel mag Sauce het begin van de kopbeurt nog verleggen. */
const RESYNC_WINDOW_MS = 20_000;

export type RotationRider = PlanRider & { out: boolean };

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
    riders: riders.map((rider) => ({ ...rider, out: false })),
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
    if (index !== from && !rider.out && rider.pullSeconds > 0) return index;
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
    rotation = lead(rotation, first, rotation.endsAt);
    events.push({ type: "change", rider: first, previous: -1, synced: false });
  }

  // Meer dan één wissel gemist (de bot stond even stil): alleen de laatste telt.
  for (let guard = 0; now >= rotation.endsAt && guard < 10_000; guard += 1) {
    const next = nextIndex(rotation);
    const previous = rotation.current;
    if (next === -1) {
      // Niemand om af te lossen: dezelfde renner begint opnieuw.
      const seconds = Math.max(1, rotation.riders[previous].pullSeconds);
      rotation = { ...rotation, startedAt: rotation.endsAt, endsAt: rotation.endsAt + seconds * 1000 };
      continue;
    }
    rotation = lead(rotation, next, rotation.endsAt);
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
    rotation: lead(rotation, next, now),
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
 * Na een stuk vrij rijden (een klim) begint de rotatie opnieuw: met de renner
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
 * volgt de rotatie de ploeg. Is het dezelfde en is de wissel net geweest, dan
 * begint de kopbeurt pas nu: de ploeg wisselde later dan de klok.
 */
export function syncLeader(rotation: Rotation, index: number, now: number): Step {
  const rider = rotation.riders[index];
  if (rotation.current === -1 || !rider || rider.out) return { rotation, events: [] };
  if (index === rotation.current) {
    return now - rotation.startedAt <= RESYNC_WINDOW_MS
      ? { rotation: lead(rotation, index, now), events: [] }
      : { rotation, events: [] };
  }
  // Een renner zonder kopbeurt in het plan krijgt de kortste beurt van de ploeg.
  const seconds =
    rider.pullSeconds ||
    Math.min(...rotation.riders.filter((r) => r.pullSeconds > 0).map((r) => r.pullSeconds));
  const next = lead(rotation, index, now);
  return {
    rotation: { ...next, endsAt: now + seconds * 1000 },
    events: [{ type: "change", rider: index, previous: rotation.current, synced: true }],
  };
}
