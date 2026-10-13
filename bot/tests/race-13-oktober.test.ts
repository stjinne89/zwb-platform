import { describe, expect, it } from "vitest";
import { Coach, type Advice, type RiderSample } from "../src/coach.ts";
import { eventPhrase } from "../src/phrases.ts";
import type { Plan } from "../src/plan.ts";
import { createRotation } from "../src/rotation.ts";
import { Session } from "../src/session.ts";

// Wat er misging in de ZRL-ploegentijdrit van 13 oktober 2026, nagespeeld uit
// het logboek. Er was geen meting ernaast, dus de metingen hier zijn nagebootst.

const PLAN: Plan = {
  name: "ZWB Bdev",
  eventTitle: null,
  estimatedSpeedKmh: null,
  riders: [
    { order: 1, name: "Koen", zwiftId: "1", pullWatts: 315, pullSeconds: 30 },
    { order: 2, name: "Jeroen", zwiftId: "2", pullWatts: 350, pullSeconds: 60 },
    { order: 3, name: "Marc", zwiftId: "3", pullWatts: 295, pullSeconds: 30 },
    { order: 4, name: "Wouter", zwiftId: "4", pullWatts: 290, pullSeconds: 30 },
  ],
};
const S = 1000;

/** De ploeg in volgorde `front` eerst, elk met eigen vermogen. */
function sample(at: number, front: string, power: Record<string, number> = {}) {
  const riders: RiderSample[] = PLAN.riders.map((rider) => ({
    zwiftId: rider.zwiftId!,
    power: power[rider.zwiftId!] ?? rider.pullWatts!,
    speedKmh: 44,
    gap: rider.zwiftId === front ? -0.3 : Number(rider.zwiftId) * 0.2,
  }));
  return { at, riders };
}

describe("vooraan rijden is nog niet op kop rijden", () => {
  // 20:31:39: in Jeroens beurt lag Wouter even voor, op 75 watt onder zijn doel.
  function observe(coach: Coach, seconds: [number, number], front: string, power = {}) {
    const advice: Array<Advice & { at: number }> = [];
    for (let second = seconds[0]; second <= seconds[1]; second += 1) {
      const result = coach.observe(sample(second * S, front, power), {
        leaderZwiftId: "2",
        nextZwiftId: "3",
        pullStartedAt: 0,
        out: [],
      });
      for (const item of result) advice.push({ ...item, at: second });
    }
    return advice;
  }

  it("ziet een renner die niet aan de beurt is en niet trapt, niet als koprijder", () => {
    const coach = new Coach(PLAN);
    observe(coach, [0, 5], "2");
    const advice = observe(coach, [6, 40], "4", { "4": 215 });
    expect(advice.filter((a) => a.kind === "leader")).toEqual([]);
  });

  it("volgt hem wel als hij acht seconden vooraan ligt en zijn vermogen trapt", () => {
    const coach = new Coach(PLAN);
    observe(coach, [0, 5], "2");
    const advice = observe(coach, [6, 20], "4");
    expect(advice.filter((a) => a.kind === "leader")).toEqual([{ kind: "leader", zwiftId: "4", at: 14 }]);
  });

  it("volgt de renner die aan de beurt is al na drie seconden", () => {
    const coach = new Coach(PLAN);
    observe(coach, [0, 5], "2");
    const advice = observe(coach, [6, 20], "3");
    expect(advice.filter((a) => a.kind === "leader")).toEqual([{ kind: "leader", zwiftId: "3", at: 9 }]);
  });

  it("zegt niet '280 watt erbij' tegen wie niet meer trapt", () => {
    const coach = new Coach(PLAN);
    const advice = observe(coach, [0, 40], "2", { "2": 60 });
    expect(advice.filter((a) => a.kind === "power")).toEqual([]);
  });
});

describe("sessie", () => {
  function session() {
    const said: string[] = [];
    const log: string[] = [];
    const clock = { now: 0 };
    let finished = false;
    const created = new Session(
      PLAN,
      {
        say: (text) => said.push(text),
        changed: () => undefined,
        finished: () => {
          finished = true;
        },
        log: (line) => log.push(line),
      },
      () => clock.now,
    );
    created.start(0);
    created.skip();
    const feed = (seconds: [number, number], front: string, power = {}) => {
      for (let second = seconds[0]; second <= seconds[1]; second += 1) {
        clock.now = second * S;
        created.onSample(sample(clock.now, front, power));
      }
    };
    return { created, said, log, feed, isFinished: () => finished };
  }

  it("laat Sauce de rotatie de eerste halve minuut na de start niet verleggen", () => {
    // 20:08:06: vijf seconden na de start riep de bot Wouter om.
    const { created, said, feed } = session();
    feed([0, 20], "4");
    expect(created.rotation.current).toBe(0);
    expect(said.some((text) => text.startsWith("Wouter"))).toBe(false);
    created.stop();
  });

  it("zwijgt over watt in de laatste twaalf seconden van een kopbeurt", () => {
    const { created, said, log, feed } = session();
    // Koen rijdt goed tot 19 s en daarna te hard: het oordeel komt te laat in zijn beurt.
    feed([0, 19], "1");
    feed([20, 29], "1", { "1": 360 });
    expect(log.some((line) => line.includes('"power"'))).toBe(true);
    expect(said.some((text) => text.includes("watt eraf"))).toBe(false);
    created.stop();
  });

  it("stopt vanzelf als de ploeg stilvalt na de finish", () => {
    // 20:50: "Marc, 295 watt erbij" toen iedereen al binnen was.
    const { created, feed, isFinished } = session();
    feed([0, 10], "1");
    for (let second = 11; second <= 30; second += 1) {
      created.onSample({
        at: second * S,
        riders: PLAN.riders.map((r) => ({ zwiftId: r.zwiftId!, power: 0, speedKmh: 8, gap: 0 })),
      });
    }
    expect(created.running).toBe(false);
    expect(isFinished()).toBe(true);
  });

  it("stopt niet in een afdaling zonder trappen", () => {
    const { created, feed } = session();
    feed([0, 10], "1");
    for (let second = 11; second <= 40; second += 1) {
      created.onSample({
        at: second * S,
        riders: PLAN.riders.map((r) => ({ zwiftId: r.zwiftId!, power: 0, speedKmh: 62, gap: 0 })),
      });
    }
    expect(created.running).toBe(true);
    created.stop();
  });
});

describe("aftellen", () => {
  it("zegt het getal eerst, zodat tien en vijf vijf tellen uit elkaar klinken", () => {
    const rotation = createRotation(PLAN.riders, 0);
    expect(eventPhrase({ type: "countdown", seconds: 10, current: 0, next: 1 }, rotation)).toBe(
      "Nog 10. Jeroen klaarmaken.",
    );
  });
});
