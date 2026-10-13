import { describe, expect, it } from "vitest";
import type { Plan, PlanRider } from "../src/plan.ts";
import { createRotation, nextIndex, replan, setOut, tick } from "../src/rotation.ts";
import { Session } from "../src/session.ts";

// Een race in delen: voor het vlakke stuk een andere volgorde, watt en duur.

function rider(name: string, zwiftId: string, pullWatts: number, pullSeconds: number): PlanRider {
  return { order: 0, name, zwiftId, pullWatts, pullSeconds };
}

const PART_1 = [rider("Koen", "1", 315, 30), rider("Jeroen", "2", 350, 30), rider("Marc", "3", 295, 30)];
const PART_2 = [rider("Marc", "3", 300, 60), rider("Koen", "1", 320, 45), rider("Jeroen", "2", 355, 60)];
const S = 1000;

describe("ander plan voor het volgende deel", () => {
  const started = tick(createRotation(PART_1, 0), 0).rotation;

  it("laat de koprijder zijn kopbeurt afmaken en volgt daarna het nieuwe plan", () => {
    const step = replan(started, PART_2, 10 * S);
    expect(step.events).toEqual([]);
    expect(step.rotation.riders[step.rotation.current].name).toBe("Koen");
    expect(step.rotation.endsAt).toBe(30 * S);

    // Na Koen komt in deel 2 Jeroen, met de duur van deel 2.
    const next = tick(step.rotation, 30 * S);
    expect(next.rotation.riders[next.rotation.current]).toMatchObject({ name: "Jeroen", pullWatts: 355 });
    expect(next.rotation.endsAt).toBe(90 * S);
  });

  it("houdt een geloste renner gelost", () => {
    const without = setOut(started, 2, true, 5 * S).rotation;
    const step = replan(without, PART_2, 10 * S);
    expect(step.rotation.riders.find((r) => r.name === "Marc")?.out).toBe(true);
    expect(step.rotation.riders[nextIndex(step.rotation)].name).toBe("Jeroen");
  });

  it("begint met de eerste van het nieuwe plan als de koprijder er niet in staat", () => {
    const step = replan(started, PART_2.slice(0, 1).concat(PART_2.slice(2)), 10 * S);
    expect(step.events).toEqual([{ type: "change", rider: 0, previous: 0, synced: false }]);
    expect(step.rotation.riders[step.rotation.current].name).toBe("Marc");
    expect(step.rotation.endsAt).toBe(70 * S);
  });

  it("wisselt vóór de start alleen het plan", () => {
    const waiting = createRotation(PART_1, 100 * S);
    const step = replan(waiting, PART_2, 10 * S);
    expect(step.rotation.current).toBe(-1);
    expect(step.rotation.endsAt).toBe(100 * S);
    expect(step.rotation.riders[0].name).toBe("Marc");
  });
});

describe("sessie in delen", () => {
  const plan = (name: string, riders: PlanRider[]): Plan => ({
    name,
    eventTitle: null,
    estimatedSpeedKmh: null,
    riders,
  });

  it("gaat op verzoek over op deel 2 en zegt dat", () => {
    const said: string[] = [];
    const clock = { now: 0 };
    const session = new Session(
      plan("Klim", PART_1),
      { say: (text) => said.push(text), changed: () => undefined, log: () => undefined },
      () => clock.now,
    );
    expect(session.usePart(2)).toBe(false);

    session.addPart(2, plan("Vlak", PART_2));
    expect(session.partNumbers).toEqual([1, 2]);
    session.start(0);
    session.skip();
    session.setOut(2, true);

    clock.now = 10 * S;
    expect(session.usePart(2)).toBe(true);
    expect(session.usePart(2)).toBe(false);
    expect(said.at(-1)).toBe("Deel 2.");
    expect(session.plan.name).toBe("Vlak");
    expect(session.status()).toContain("**Vlak** · deel 2");
    expect(session.status()).toContain("Op kop: **Koen · 320 W**");
    expect(session.status()).toContain("Daarna: Jeroen · 355 W · 60 s");
    expect(session.status()).toContain("Gelost: Marc");

    // Een nieuwe start begint weer bij deel 1.
    session.start(0);
    expect(session.partNumber).toBe(1);
    session.stop();
  });
});
