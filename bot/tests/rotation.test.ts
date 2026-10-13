import { describe, expect, it } from "vitest";
import type { PlanRider } from "../src/plan.ts";
import {
  createRotation,
  nextIndex,
  plus,
  setOut,
  skip,
  syncLeader,
  tick,
  type Rotation,
  type RotationEvent,
} from "../src/rotation.ts";

function rider(order: number, name: string, pullSeconds: number): PlanRider {
  return { order, name, zwiftId: String(order * 111), pullWatts: 300 + order * 10, pullSeconds };
}

const RIDERS = [rider(1, "Stijn", 60), rider(2, "Piet", 45), rider(3, "Anna", 0), rider(4, "Bram", 30)];
const S = 1000;

/** Loop de klok elke 250 ms door van `from` tot `to` en verzamel wat er gebeurt. */
function run(start: Rotation, from: number, to: number) {
  let rotation = start;
  const events: Array<RotationEvent & { at: number }> = [];
  for (let now = from; now <= to; now += 250) {
    const step = tick(rotation, now);
    rotation = step.rotation;
    for (const event of step.events) events.push({ ...event, at: now });
  }
  return { rotation, events };
}

describe("rotatie op de klok", () => {
  it("telt af naar de start en zet de eerste renner op kop", () => {
    const { rotation, events } = run(createRotation(RIDERS, 70 * S), 0, 70 * S);
    expect(events.map((e) => [e.type, e.at / S])).toEqual([
      ["start-countdown", 10],
      ["start-countdown", 40],
      ["start-countdown", 60],
      ["start-countdown", 65],
      ["change", 70],
    ]);
    expect(events.at(-1)).toMatchObject({ rider: 0, previous: -1, synced: false });
    expect(rotation.current).toBe(0);
  });

  it("wisselt op tijd, slaat renners zonder kopbeurt over en loopt niet uit de pas", () => {
    const { events } = run(createRotation(RIDERS, 0), 0, 200 * S);
    const changes = events.filter((e) => e.type === "change");
    // Stijn 60, Piet 45, (Anna 0), Bram 30, Stijn 60 ...
    expect(changes.map((e) => [e.rider, e.at / S])).toEqual([
      [0, 0],
      [1, 60],
      [3, 105],
      [0, 135],
      [1, 195],
    ]);
  });

  it("telt af op 30, 10 en 5 seconden en noemt de volgende", () => {
    const { events } = run(createRotation(RIDERS, 0), 0, 59 * S);
    const marks = events.filter((e) => e.type === "countdown");
    expect(marks.map((e) => [e.seconds, e.at / S, e.next])).toEqual([
      [30, 30, 1],
      [10, 50, 1],
      [5, 55, 1],
    ]);
  });

  it("roept niet 'nog 30' aan het begin van een kopbeurt van 30 seconden", () => {
    const { events } = run(createRotation(RIDERS, 0), 105 * S, 134 * S);
    const marks = events.filter((e) => e.type === "countdown").map((e) => e.seconds);
    expect(marks).toEqual([10, 5]);
  });

  it("meldt na een stilstand alleen de laatste wissel", () => {
    const started = tick(createRotation(RIDERS, 0), 0).rotation;
    const step = tick(started, 110 * S);
    expect(step.events).toEqual([{ type: "change", rider: 3, previous: 1, synced: false }]);
    expect(step.rotation.endsAt).toBe(135 * S);
  });

  it("blijft bij één renner over gewoon doorlopen", () => {
    const { events, rotation } = run(createRotation([rider(1, "Stijn", 30)], 0), 0, 100 * S);
    expect(events.filter((e) => e.type === "change")).toHaveLength(1);
    expect(rotation.current).toBe(0);
  });
});

describe("ingrijpen", () => {
  const started = tick(createRotation(RIDERS, 0), 0).rotation;

  it("skip begint de volgende kopbeurt op dit moment", () => {
    const step = skip(started, 20 * S);
    expect(step.events).toEqual([{ type: "change", rider: 1, previous: 0, synced: false }]);
    expect(step.rotation.endsAt).toBe(65 * S);
  });

  it("skip vóór de start begint meteen", () => {
    const step = skip(createRotation(RIDERS, 300 * S), 5 * S);
    expect(step.rotation.current).toBe(0);
    expect(step.rotation.endsAt).toBe(65 * S);
  });

  it("plus verlengt de kopbeurt en telt opnieuw af", () => {
    const at50 = run(started, 0, 50 * S).rotation;
    const longer = plus(at50, 15, 50 * S);
    expect(longer.endsAt).toBe(75 * S);
    const marks = run(longer, 50 * S, 74 * S).events.filter((e) => e.type === "countdown");
    expect(marks.map((e) => [e.seconds, e.at / S])).toEqual([
      [10, 65],
      [5, 70],
    ]);
  });

  it("een geloste renner krijgt geen kopbeurt; lost de koprijder, dan volgt de volgende", () => {
    const without = setOut(started, 1, true, 10 * S);
    expect(without.events).toEqual([]);
    expect(nextIndex(without.rotation)).toBe(3);

    const leaderOut = setOut(started, 0, true, 10 * S);
    expect(leaderOut.events).toEqual([{ type: "change", rider: 1, previous: 0, synced: false }]);

    const back = setOut(without.rotation, 1, false, 20 * S);
    expect(nextIndex(back.rotation)).toBe(1);
  });
});

describe("volgen wat Sauce ziet", () => {
  const started = tick(createRotation(RIDERS, 0), 0).rotation;

  it("wisselt de ploeg eerder, dan gaat de rotatie mee", () => {
    const step = syncLeader(started, 1, 50 * S);
    expect(step.events).toEqual([{ type: "change", rider: 1, previous: 0, synced: true }]);
    expect(step.rotation.endsAt).toBe(95 * S);
  });

  it("wisselt de ploeg later dan de klok, dan begint de kopbeurt pas dan", () => {
    const changed = tick(started, 60 * S).rotation;
    const step = syncLeader(changed, 1, 68 * S);
    expect(step.events).toEqual([]);
    expect(step.rotation.endsAt).toBe(113 * S);
  });

  it("laat een kopbeurt die al lang loopt met rust", () => {
    const step = syncLeader(started, 0, 40 * S);
    expect(step.rotation).toBe(started);
  });

  it("negeert Sauce vóór de start en bij een geloste renner", () => {
    const waiting = createRotation(RIDERS, 100 * S);
    expect(syncLeader(waiting, 1, 10 * S).rotation).toBe(waiting);
    const out = setOut(started, 1, true, 10 * S).rotation;
    expect(syncLeader(out, 1, 20 * S).rotation).toBe(out);
  });

  it("geeft een renner zonder kopbeurt die toch op kop komt de kortste beurt", () => {
    const step = syncLeader(started, 2, 20 * S);
    expect(step.rotation.current).toBe(2);
    expect(step.rotation.endsAt).toBe(50 * S);
  });
});
