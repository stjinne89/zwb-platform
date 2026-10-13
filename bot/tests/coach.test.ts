import { describe, expect, it } from "vitest";
import { Coach, type Advice, type CoachContext, type RiderSample } from "../src/coach.ts";
import type { Plan } from "../src/plan.ts";

// Nagebootste metingen, één per seconde. De vorm van echte Sauce-data is nog
// niet gemeten; zie docs/ttt-discord-bot.md in de hoofdrepo.

const PLAN: Plan = {
  name: "Test",
  eventTitle: null,
  estimatedSpeedKmh: 44,
  riders: ["Stijn", "Piet", "Anna", "Bram", "Cees"].map((name, index) => ({
    order: index + 1,
    name,
    zwiftId: String(index + 1),
    pullWatts: 300,
    pullSeconds: 60,
  })),
};

const S = 1000;

type Frame = (second: number) => Partial<Record<string, Partial<RiderSample> | null>>;

/** Standaard: renner 1 op kop, de rest er strak achter, iedereen op 300 watt. */
function run(
  coach: Coach,
  seconds: [number, number],
  frame: Frame = () => ({}),
  context: Partial<CoachContext> = {},
) {
  const advice: Array<Advice & { at: number }> = [];
  for (let second = seconds[0]; second <= seconds[1]; second += 1) {
    const patch = frame(second);
    const riders: RiderSample[] = [];
    for (const [index, plan] of PLAN.riders.entries()) {
      const own = patch[plan.zwiftId!];
      if (own === null) continue;
      riders.push({ zwiftId: plan.zwiftId!, power: 300, speedKmh: 44, gap: index * 0.3, ...own });
    }
    // Een vreemde renner in de buurt mag niets uitmaken.
    riders.push({ zwiftId: "999", power: 500, speedKmh: 50, gap: -5 });
    const result = coach.observe(
      { at: second * S, riders },
      { leaderZwiftId: "1", nextZwiftId: "2", pullStartedAt: 0, out: [], ...context },
    );
    for (const item of result) advice.push({ ...item, at: second });
  }
  return advice;
}

describe("koprijder", () => {
  it("meldt de voorste renner zodra hij daar drie seconden ligt", () => {
    const advice = run(new Coach(PLAN), [0, 10]);
    expect(advice).toEqual([{ kind: "leader", zwiftId: "1", at: 3 }]);
  });

  it("meldt een wissel, maar geen korte flits vooraan", () => {
    const coach = new Coach(PLAN);
    const advice = run(coach, [0, 30], (second) => ({
      // Renner 3 steekt twee seconden zijn neus voor; vanaf 20 s komt renner 2 op kop.
      "3": second === 10 || second === 11 ? { gap: -0.2 } : {},
      "2": second >= 20 ? { gap: -0.3 } : {},
    }));
    expect(advice.filter((a) => a.kind === "leader")).toEqual([
      { kind: "leader", zwiftId: "1", at: 3 },
      { kind: "leader", zwiftId: "2", at: 23 },
    ]);
  });
});

describe("vermogen op kop", () => {
  it("zegt niets binnen de marge", () => {
    const advice = run(new Coach(PLAN), [0, 60], () => ({ "1": { power: 310 } }));
    expect(advice.filter((a) => a.kind === "power")).toEqual([]);
  });

  it("meldt te hard rijden, afgerond op 5 watt, en herhaalt niet meteen", () => {
    const advice = run(new Coach(PLAN), [0, 45], () => ({ "1": { power: 338 } }));
    const power = advice.filter((a) => a.kind === "power");
    // Koprijder vanaf 3 s, 4 s op gang komen, dan 4 s meten.
    expect(power[0]).toEqual({ kind: "power", zwiftId: "1", delta: 40, at: 11 });
    expect(power.map((a) => a.at)).toEqual([11, 31]);
  });

  it("meldt te zacht rijden als een negatief verschil", () => {
    const advice = run(new Coach(PLAN), [0, 20], () => ({ "1": { power: 262 } }));
    expect(advice.find((a) => a.kind === "power")).toMatchObject({ delta: -40 });
  });

  it("zwijgt als de klok een andere koprijder verwacht dan Sauce ziet", () => {
    const advice = run(new Coach(PLAN), [0, 40], () => ({ "1": { power: 380 } }), {
      leaderZwiftId: "2",
    });
    expect(advice.filter((a) => a.kind === "power")).toEqual([]);
  });
});

describe("lossen", () => {
  it("meldt een renner die tien seconden op meer dan drie seconden rijdt", () => {
    const advice = run(new Coach(PLAN), [0, 40], (second) => ({
      "5": second >= 10 ? { gap: 5 } : {},
    }));
    expect(advice.filter((a) => a.kind !== "leader")).toEqual([
      { kind: "dropped", zwiftId: "5", at: 20 },
      { kind: "four-left", at: 20 },
    ]);
  });

  it("meldt geen renner die even een gaatje laat", () => {
    const advice = run(new Coach(PLAN), [0, 40], (second) => ({
      "5": second >= 10 && second < 16 ? { gap: 5 } : {},
    }));
    expect(advice.filter((a) => a.kind === "dropped")).toEqual([]);
  });

  it("telt uit beeld verdwijnen na tien seconden als lossen", () => {
    const advice = run(new Coach(PLAN), [0, 40], (second) => ({
      "4": second >= 10 ? null : {},
    }));
    expect(advice.find((a) => a.kind === "dropped")).toEqual({ kind: "dropped", zwiftId: "4", at: 19 });
  });

  it("meldt een geloste renner die vijf seconden terug in het wiel zit", () => {
    const advice = run(new Coach(PLAN), [0, 60], (second) => ({
      "5": second >= 10 && second < 30 ? { gap: 5 } : {},
    }));
    expect(advice.filter((a) => a.kind === "back")).toEqual([{ kind: "back", zwiftId: "5", at: 35 }]);
  });

  it("laat een met de hand geloste renner met rust", () => {
    const advice = run(new Coach(PLAN), [0, 40], () => ({ "5": { gap: 30 } }), { out: ["5"] });
    expect(advice.filter((a) => a.kind === "dropped")).toEqual([]);
    expect(advice.filter((a) => a.kind === "four-left")).toHaveLength(1);
  });

  it("zegt niets over renners die Sauce nooit zag", () => {
    const advice = run(new Coach(PLAN), [0, 60], () => ({ "4": null, "5": null }));
    expect(advice.filter((a) => a.kind !== "leader")).toEqual([]);
  });
});

describe("tempo", () => {
  it("meldt elke vijf minuten het gemiddelde naast het plan", () => {
    const advice = run(new Coach(PLAN), [0, 610], () => ({ "1": { speedKmh: 43.24 } }));
    expect(advice.filter((a) => a.kind === "pace")).toEqual([
      { kind: "pace", avgKmh: 43.2, planKmh: 44, at: 300 },
      { kind: "pace", avgKmh: 43.2, planKmh: 44, at: 600 },
    ]);
  });

  it("zwijgt zonder schatting in het plan", () => {
    const advice = run(new Coach({ ...PLAN, estimatedSpeedKmh: null }), [0, 400]);
    expect(advice.filter((a) => a.kind === "pace")).toEqual([]);
  });
});
