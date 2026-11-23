import { describe, expect, it } from "vitest";
import {
  courseForRace,
  isTimeTrialTitle,
  racefitScores,
  soloTeamRaces,
  timeTrialWeights,
  weekCourses,
  type RaceCourse,
} from "@/lib/teams/zrl-racefit";
import { sortRanking, rankRider } from "@/lib/teams/zrl-ranking";

// Routes van R1 (2026/27): W1 Race of Truth en W2, waar B1 drie en B2 vier rondes reed.
const ROUTE_W1 = 1247427185;
const ROUTE_W2 = 2592027600;

const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

const flat: RaceCourse = {
  key: "test",
  name: "Test",
  laps: 1,
  timeTrial: false,
  weights: { s15: 0.4, m1: 0.2, m5: 0.2, m20: 0.2 },
  terrain: { s15: [{ pct: 0, share: 1 }], m1: [{ pct: 0, share: 1 }], m5: [{ pct: 0, share: 1 }], m20: [{ pct: 0, share: 1 }] },
  borrowedFrom: null,
};

describe("team zonder subteams", () => {
  const own = [
    { id: "c-w2", parent_event_id: "w2", title: "R2 · W2 · ZRL C", zwift_route_id: null, laps: null },
    { id: "c-w3", parent_event_id: "w3", title: "R2 · W3 · ZRL C", zwift_route_id: ROUTE_W2, laps: 2 },
  ];
  const siblings = [
    { id: "c-w2", parent_event_id: "w2", team_id: "c", title: "R2 · W2 · ZRL C", zwift_route_id: null, laps: null },
    { id: "lc-w2", parent_event_id: "w2", team_id: "lc", title: "R2 · W2 · Ladies C", zwift_route_id: ROUTE_W1, laps: 1 },
    { id: "a-w4", parent_event_id: "w4", team_id: "a", title: "R2 · W4 · ZRL A", zwift_route_id: ROUTE_W1, laps: 1 },
  ];

  it("de eigen race is de week, en andere races in die raceweek hangen eraan", () => {
    const races = soloTeamRaces("c", own, siblings);
    expect(races.map((race) => [race.id, race.parent_event_id, race.team_id])).toEqual([
      ["c-w2", "c-w2", "c"],
      ["lc-w2", "c-w2", "lc"],
      ["c-w3", "c-w3", "c"],
    ]);
  });

  it("leent zonder eigen route van dezelfde week en categorie", () => {
    const races = soloTeamRaces("c", own, siblings).filter((race) => race.parent_event_id === "c-w2");
    const toRace = (race: (typeof races)[number]) => ({
      title: race.title,
      zwiftRouteId: race.zwift_route_id == null ? null : Number(race.zwift_route_id),
      laps: race.laps,
    });
    const { teamCourse, courses } = weekCourses(
      [{ ...toRace(races[0]), teamId: "c", category: "C" }],
      [{ ...toRace(races[1]), source: "Ladies C", category: "C" }],
    );
    expect(courses[teamCourse.c].borrowedFrom).toBe("Ladies C");
  });
});

describe("soort race", () => {
  it("herkent tijdritten aan de titel", () => {
    expect(isTimeTrialTitle("ZRL 2026/27 · R2 · W1 · B1 — Team Time Trial")).toBe(true);
    expect(isTimeTrialTitle("ZRL 2026/27 · R1 · W1 — Race of Truth")).toBe(true);
    expect(isTimeTrialTitle("ZRL TTT")).toBe(true);
    expect(isTimeTrialTitle("ZRL 2026/27 · R1 · W2 · B1")).toBe(false);
  });

  it("een tijdrit schuift naar 5 en 20 minuten, zonder sprint", () => {
    const tt = timeTrialWeights(flat.weights);
    expect(tt.s15).toBe(0);
    expect(tt.m1).toBeCloseTo(0.1);
    expect(tt.m5).toBeCloseTo(0.45);
    expect(tt.m20).toBeCloseTo(0.45);
    expect(sum(tt)).toBeCloseTo(1);
  });

  it("de Race of Truth krijgt geen sprint, een gewone race wel", () => {
    const roTruth = courseForRace({ title: "ZRL 2026/27 · R1 · W1 · B1 — Race of Truth", zwiftRouteId: ROUTE_W1, laps: 1 });
    const race = courseForRace({ title: "Gewone race", zwiftRouteId: ROUTE_W1, laps: 1 });
    expect(roTruth?.timeTrial).toBe(true);
    expect(roTruth?.weights.s15).toBe(0);
    expect(race?.weights.s15).toBeGreaterThan(0);
    expect(sum(race!.weights)).toBeCloseTo(1);
    expect(roTruth!.weights.m20).toBeGreaterThan(race!.weights.m20);
  });
});

describe("route van de week", () => {
  it("zonder route of met een onbekende route geen parcours", () => {
    expect(courseForRace({ title: "W1", zwiftRouteId: null, laps: null })).toBeNull();
    expect(courseForRace({ title: "W1", zwiftRouteId: 1, laps: 1 })).toBeNull();
    expect(weekCourses([{ teamId: "b1", title: "W1", zwiftRouteId: null, laps: null }])).toEqual({
      courses: {},
      teamCourse: {},
      defaultCourse: null,
    });
  });

  it("per team zijn eigen rondes; voor wie niet ingedeeld is wat de meeste teams rijden", () => {
    const week = weekCourses([
      { teamId: "b1", title: "R1 W2 B1", zwiftRouteId: ROUTE_W2, laps: 3 },
      { teamId: "b2", title: "R1 W2 B2", zwiftRouteId: ROUTE_W2, laps: 4 },
      { teamId: "dev", title: "R1 W2 Bdev", zwiftRouteId: ROUTE_W2, laps: 4 },
    ]);
    expect(Object.keys(week.courses)).toHaveLength(2);
    expect(week.teamCourse.b1).not.toBe(week.teamCourse.b2);
    expect(week.teamCourse.b2).toBe(week.teamCourse.dev);
    expect(week.defaultCourse).toBe(week.teamCourse.b2);
    expect(week.courses[week.teamCourse.b2].laps).toBe(4);
  });

  it("zonder eigen route geleend van dezelfde categorie, met de eigen titel voor de tijdrit", () => {
    const week = weekCourses(
      [
        { teamId: "b1", title: "R2 W1 B1 — Team Time Trial", zwiftRouteId: null, laps: null, category: "B" },
        { teamId: "b3", title: "R2 W1 B3", zwiftRouteId: null, laps: null, category: "B" },
        { teamId: "x", title: "R2 W1 zonder categorie", zwiftRouteId: null, laps: null, category: null },
      ],
      [
        { source: "ZRL A", category: "A", zwiftRouteId: ROUTE_W1, laps: 1 },
        { source: "Zonder route", category: "B", zwiftRouteId: null, laps: null },
        { source: "ZRL Zwiftladies B", category: "B", zwiftRouteId: ROUTE_W2, laps: 3 },
      ],
    );
    const b1 = week.courses[week.teamCourse.b1];
    const b3 = week.courses[week.teamCourse.b3];
    expect(b1.borrowedFrom).toBe("ZRL Zwiftladies B");
    expect(b1.laps).toBe(3);
    expect(b1.timeTrial).toBe(true);
    expect(b3.timeTrial).toBe(false);
    expect(week.teamCourse.x).toBeUndefined();
  });

  it("de eigen route gaat voor de geleende", () => {
    const week = weekCourses(
      [{ teamId: "b1", title: "R1 W2 B1", zwiftRouteId: ROUTE_W2, laps: 3, category: "B" }],
      [{ source: "ZRL Zwiftladies B", category: "B", zwiftRouteId: ROUTE_W1, laps: 1 }],
    );
    expect(week.courses[week.teamCourse.b1].borrowedFrom).toBeNull();
  });
});

describe("racefitScores", () => {
  const a = { key: "a", wkg: { s15: 12, m1: 7, m5: 5, m20: 4 }, weightKg: null };
  const b = { key: "b", wkg: { s15: 8, m1: 7, m5: 5, m20: 4 }, weightKg: null };
  const c = { key: "c", wkg: { s15: null, m1: 7, m5: 5, m20: 4 }, weightKg: null };
  const none = { key: "x", wkg: null, weightKg: null };

  it("met alle duren het gewogen meetkundig gemiddelde van de eigen waarden", () => {
    const scores = racefitScores([a, b], flat);
    const expected = Math.exp(0.4 * Math.log(12) + 0.2 * Math.log(7) + 0.2 * Math.log(5) + 0.2 * Math.log(4));
    expect(scores.a).toBeCloseTo(expected, 2);
  });

  it("een ontbrekende duur telt als het gemiddelde van de lijst, niet als zwak", () => {
    const scores = racefitScores([a, b, c], flat);
    const middle = Math.exp(0.4 * Math.log(Math.sqrt(96)) + 0.2 * Math.log(7) + 0.2 * Math.log(5) + 0.2 * Math.log(4));
    expect(scores.c).toBeCloseTo(middle, 2);
    expect(scores.c!).toBeLessThan(scores.a!);
    expect(scores.c!).toBeGreaterThan(scores.b!);
  });

  it("zonder vermogen niets", () => {
    expect(racefitScores([a, none], flat).x).toBeNull();
  });

  it("gewicht telt alleen met een geldig gewicht; 75 kg is gewoon W/kg", () => {
    const course = courseForRace({ title: "Gewone race", zwiftRouteId: ROUTE_W2, laps: 3 })!;
    const plain = racefitScores([a], course).a!;
    expect(racefitScores([{ ...a, weightKg: 75 }], course).a!).toBeCloseTo(plain, 2);
    expect(racefitScores([{ ...a, weightKg: 5 }], course).a!).toBeCloseTo(plain, 2);
    expect(racefitScores([{ ...a, weightKg: 90 }], course).a!).not.toBeCloseTo(plain, 2);
  });

  it("sorteert de ranglijst op Racefit, zonder score onderaan", () => {
    const riders = ["a", "b", "c"].map((key) =>
      rankRider({ key, name: key, profileId: key, power: null, wtrl: null }, "B", false),
    );
    const sorted = sortRanking(riders, "racefit", { a: 4.1, b: null, c: 4.5 });
    expect(sorted.map((rider) => rider.key)).toEqual(["c", "a", "b"]);
  });
});
