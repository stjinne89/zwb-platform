import { describe, expect, it } from "vitest";
import { scoreRace, type Passage, type Rider, type RouteSegment } from "@/lib/zrl-live/scoring";
import { extractTeamTag, teamKey, zrlLeagueKey } from "@/lib/zrl-live/team-tags";

const route: RouteSegment[] = [
  { segmentId: "S", name: "Sprint" },
  { segmentId: "K", name: "KOM" },
  { segmentId: "S", name: "Sprint" },
];

const riders: Rider[] = [
  { athleteId: 1, name: "Anna", team: "zwb" },
  { athleteId: 2, name: "Bram", team: "zwb" },
  { athleteId: 3, name: "Cees", team: "bmtr" },
];

let seq = 0;
const p = (athleteId: number, segmentId: string, ts: number, elapsed: number): Passage => ({
  id: String(++seq), athleteId, segmentId, ts, elapsed,
});

describe("scoreRace", () => {
  const passages = [
    p(1, "S", 100, 20), p(2, "S", 101, 18), p(3, "S", 102, 25),
    p(2, "K", 200, 120), p(1, "K", 205, 110),
    p(1, "S", 300, 19), p(2, "S", 301, 17),
  ];

  it("deelt FAL per passage uit op aantal starters, en splitst herhaalde segmenten", () => {
    const result = scoreRace({ route, riders, passages, startAt: 0 });
    expect(result.starters).toBe(3);
    expect(result.passes.map((pass) => [pass.name, pass.lap, pass.crossings.map((c) => c.fal)])).toEqual([
      ["Sprint", 1, [3, 2, 1]],
      ["KOM", 1, [3, 2]],
      ["Sprint", 2, [3, 2]],
    ]);
  });

  it("geeft FTS over alle passages van een segment samen", () => {
    const result = scoreRace({ route, riders, passages, startAt: 0 });
    const bram = result.riders.find((r) => r.athleteId === 2);
    // Sprint: Bram 17 (15) en 18 (12); KOM: tweede (12).
    expect(bram?.fts).toBe(15 + 12 + 12);
  });

  it("negeert opwarmen vóór de start en dubbele pollresultaten", () => {
    const warmup = { ...p(3, "S", 50, 10) };
    const dup = { ...passages[0] };
    const result = scoreRace({ route, riders, passages: [warmup, dup, ...passages], startAt: 60 });
    expect(result.passes[0].crossings).toHaveLength(3);
    expect(result.riders.find((r) => r.athleteId === 3)?.fts).toBe(6); // 25 s, vijfde van vijf sprintpogingen
  });

  it("negeert doorfietsen na de finish", () => {
    const after = p(3, "S", 400, 5); // Cees finisht om 350 en rijdt nog een sprint
    const result = scoreRace({ route, riders, passages: [...passages, after], startAt: 0, finishedAt: new Map([[3, 350]]) });
    expect(result.passes[2].crossings.map((c) => c.athleteId)).toEqual([1, 2]);
  });

  it("telt FIN en podium, en schrapt punten van niet-finishers pas bij een definitieve uitslag", () => {
    const provisional = scoreRace({ route, riders, passages, startAt: 0, finish: { finishers: [2, 1], final: false } });
    expect(provisional.riders.find((r) => r.athleteId === 2)).toMatchObject({ fin: 3, podium: 10 });
    expect(provisional.riders.find((r) => r.athleteId === 3)?.total).toBeGreaterThan(0);

    const final = scoreRace({ route, riders, passages, startAt: 0, finish: { finishers: [2, 1], final: true } });
    const cees = final.riders.find((r) => r.athleteId === 3);
    expect(cees).toMatchObject({ total: 0, void: true });
    // Niet doorschuiven: Anna houdt haar FAL van de eerste sprint (2).
    expect(final.passes[0].crossings.map((c) => c.fal)).toEqual([3, 2, 1]);
  });

  it("telt teams op en deelt gelijke plekken", () => {
    const result = scoreRace({ route, riders, passages, startAt: 0 });
    expect(result.teams[0]).toMatchObject({ team: "zwb", riders: 2, rank: 1 });
    expect(result.teams[1]).toMatchObject({ team: "bmtr", rank: 2 });
  });
});

describe("teamtags", () => {
  it("haalt de laatste tag uit allerlei haakjes", () => {
    expect(extractTeamTag("Jeff Parker(BMTR Racing)")).toBe("BMTR Racing");
    expect(extractTeamTag("M. Mendelea Ma [BMTR Racing] ")).toBe("BMTR Racing");
    expect(extractTeamTag("Ｋ えさちょ［NICO-ciel］［HZM］")).toBe("HZM");
    expect(extractTeamTag("Luke Caisley")).toBeNull();
  });

  it("maakt spellingen vergelijkbaar", () => {
    expect(teamKey("BMTR Cubs 🦬")).toBe("bmtr cubs");
    expect(teamKey("DW DAWN PATROL")).toBe(teamKey("DW Dawn Patrol"));
  });
});

describe("zrlLeagueKey", () => {
  it("is gelijk voor alle races van een divisie in een seizoen", () => {
    const race1 = "Zwift Racing League 26/27: Fresh & Fast: Open Topaz League Division 1 - Race 1";
    const race3 = "Zwift Racing League 26/27: Fresh & Fast: Open Topaz League Division 1 - Race 3";
    expect(zrlLeagueKey(race1, "C", "1")).toBe("26/27|open topaz league|1|C");
    expect(zrlLeagueKey(race3, "C", "2")).toBe(zrlLeagueKey(race1, "C", "1"));
    expect(zrlLeagueKey("Club ride", "B", "99")).toBe("event:99:B");
  });
});
