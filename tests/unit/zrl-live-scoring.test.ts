import { describe, expect, it } from "vitest";
import { pickSubgroup, zrlFormatOf } from "@/lib/zrl-live/snapshot";
import { scoreRace, type Passage, type Rider, type RouteSegment } from "@/lib/zrl-live/scoring";
import { extractTeamTag, pickTeamLabel, teamKey, zrlLeagueKey } from "@/lib/zrl-live/team-tags";

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

  it("telt bij scratch alleen FIN en podium; segmenten tellen alleen de starters", () => {
    const result = scoreRace({
      format: "scratch",
      route,
      riders,
      passages,
      startAt: 0,
      finish: { finishers: [3, 1], final: true },
    });
    expect(result.format).toBe("scratch");
    expect(result.starters).toBe(3);
    expect(result.passes.flatMap((pass) => pass.crossings.map((c) => c.fal))).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(result.riders.map((r) => [r.name, r.fal, r.fts, r.fin, r.podium, r.total, r.void])).toEqual([
      ["Cees", 0, 0, 3, 10, 13, false],
      ["Anna", 0, 0, 2, 8, 10, false],
      ["Bram", 0, 0, 0, 0, 0, true],
    ]);
    expect(result.teams.map((t) => [t.team, t.total])).toEqual([["bmtr", 13], ["zwb", 10]]);
  });
});

describe("teamvolgorde volgens WTRL", () => {
  // Vier renners per team, elk één finish: FIN bepaalt alles, tenzij er gelijkspel is.
  const team = (name: string, ids: number[]) => ids.map((athleteId) => ({ athleteId, name: `${name}${athleteId}`, team: name }));

  it("zet teams met drie starters achter die met vier, en geeft onder de drie geen leaguepunten", () => {
    const field = [...team("vier", [1, 2, 3, 4]), ...team("drie", [5, 6, 7]), ...team("twee", [8, 9])];
    // De ploeg van drie en die van twee finishen vooraan.
    const finishers = [5, 6, 7, 8, 9, 1, 2, 3, 4];
    const result = scoreRace({ format: "scratch", route: [], riders: field, passages: [], startAt: 0, finish: { finishers, final: true } });
    expect(result.teams.map((t) => [t.team, t.riders, t.rank, t.league])).toEqual([
      ["vier", 4, 1, 3],
      ["drie", 3, 2, 2],
      ["twee", 2, 3, 0],
    ]);
    expect(result.teams.find((t) => t.team === "drie")!.total).toBeGreaterThan(result.teams[0].total);
  });

  it("beslist gelijkspel op totaal en FIN met de tijd van de eerste renner", () => {
    // Twaalf starters. zulu: plek 1, 5, 6, 12; alfa: 2, 4, 7, 11; rest: 3, 8, 9, 10.
    // Beide 28 FIN en 12 podium; op naam zou alfa voor gaan.
    const field = [...team("zulu", [1, 5, 6, 12]), ...team("alfa", [2, 4, 7, 11]), ...team("rest", [3, 8, 9, 10])];
    const finishers = Array.from({ length: 12 }, (_, i) => i + 1);
    const times = new Map(finishers.map((id) => [id, 1_000_000 + id * 1000]));
    const result = scoreRace({ format: "scratch", route: [], riders: field, passages: [], startAt: 0, finish: { finishers, final: true, times } });
    const [zulu, alfa] = ["zulu", "alfa"].map((name) => result.teams.find((t) => t.team === name)!);
    expect([zulu.total, alfa.total]).toEqual([40, 40]);
    expect([zulu.rank, alfa.rank]).toEqual([1, 2]);
  });
});

describe("ploegentijdrit", () => {
  // ZRL Legends Route, Open Cherry B1, race 1 (TTT), 7 april 2026: Zwifts
  // durationMs per renner en de WTRL-uitslag (teamtijd en leaguepunten).
  const wtrl: Array<[string, number[]]> = [
    ["Evo Eagles", [1737603, 1681977, 1682546, 1680566, 1862619, 1682378]],
    ["Sunrise Racing Team B Fika", [1702954, 2123033, 1703694, 1703321, 1847468, 1703134]],
    ["EVO Ninjas", [1789588, 1789148, 1822942, 1793432, 1786734, 1786540]],
    ["Hercules Hermes", [1814063, 1909665, 2224271, 1817096, 1817111, 1817173]],
    ["Sunrise Racing Team B Borg", [1847563, 1847484, 1847839, 1886000, 1848358]],
    ["Galaxy Centaur", [1878437, 1878590, 1878696, 1878927]],
    ["Valhalla Svalinn", [1924022]],
  ];
  let id = 0;
  const entries = wtrl.flatMap(([name, list]) => list.map((time) => ({ athleteId: ++id, name: `${name} ${id}`, team: name, time })));
  const byTime = [...entries].sort((a, b) => a.time - b.time);

  it("rekent de teamtijd, de volgorde en de leaguepunten zoals WTRL", () => {
    const result = scoreRace({
      format: "ttt",
      route: [],
      riders: entries,
      passages: [],
      startAt: 0,
      finish: { finishers: byTime.map((e) => e.athleteId), final: true, times: new Map(entries.map((e) => [e.athleteId, e.time])) },
    });
    expect(result.teams.map((t) => [t.team, t.time, t.rank, t.league])).toEqual([
      ["Evo Eagles", 1682546, 1, 7],
      ["Sunrise Racing Team B Fika", 1703694, 2, 6],
      ["EVO Ninjas", 1789588, 3, 5],
      ["Hercules Hermes", 1817173, 4, 4],
      ["Sunrise Racing Team B Borg", 1848358, 5, 3],
      ["Galaxy Centaur", 1878927, 6, 2],
      ["Valhalla Svalinn", null, 7, 0],
    ]);
    // Geen rennerspunten in een TTT.
    expect(result.riders.every((r) => r.total === 0)).toBe(true);
    expect(result.riders[0]).toMatchObject({ time: 1680566, team: "Evo Eagles" });
  });
});

describe("zrlFormatOf", () => {
  it("herkent de ploegentijdrit (Legends Route, 7 april 2026)", () => {
    expect(zrlFormatOf({ eventType: "TEAM_TIME_TRIAL", tags: ["wtrl", "zrl", "zrl19", "ttt", "ttbikesdraft"] })).toBe("ttt");
    expect(zrlFormatOf({ tags: ["wtrl", "zrl", "ttt"] })).toBe("ttt");
    expect(zrlFormatOf({ description: "Round 4 / Series 19) - Race: 1 of 4 (TTT)" })).toBe("ttt");
  });

  it("herkent scratch aan de WTRL-tag of de beschrijving (R1 W2, 2026-09-29)", () => {
    expect(zrlFormatOf({ tags: ["wtrl", "zrl", "zrl20", "scr", "zrl_arch"] })).toBe("scratch");
    expect(zrlFormatOf({ tags: [], description: "Round 1 - Race: 1 of 5 (SCRATCH RACE)" })).toBe("scratch");
  });

  it("rekent de rest als puntenrace, ook de Race of Truth", () => {
    expect(zrlFormatOf({ tags: ["wtrl", "zrl", "rot"], description: "Race: 1 of 6 (RACE OF TRUTH)" })).toBe("points");
    expect(zrlFormatOf(null)).toBe("points");
  });
});

describe("teamtags", () => {
  it("haalt de laatste tag uit allerlei haakjes", () => {
    expect(extractTeamTag("Jeff Parker(BMTR Racing)")).toBe("BMTR Racing");
    expect(extractTeamTag("M. Mendelea Ma [BMTR Racing] ")).toBe("BMTR Racing");
    expect(extractTeamTag("Ｋ えさちょ［NICO-ciel］［HZM］")).toBe("HZM");
    expect(extractTeamTag("Luke Caisley")).toBeNull();
  });

  it("kiest een nette weergavenaam", () => {
    expect(pickTeamLabel(["foudre", "Foudre"])).toBe("Foudre");
    expect(pickTeamLabel(["TNP", "tnp", "tnp"])).toBe("tnp"); // vaakst getypt wint
    expect(pickTeamLabel(["BMTR Cubs 🦬", "BMTR Cubs"])).toBe("BMTR Cubs");
    expect(pickTeamLabel([])).toBe("");
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

describe("pickSubgroup", () => {
  const e = (zwiftId: string, name: string) => ({ zwiftId, name });
  const a = { label: "A", entrants: [e("1", "Femke de Zee [AEO]"), e("2", "Lily Vae [LEQP]")] };
  const b = { label: "B", entrants: [e("3", "Larissa Heijboer (ZWB)"), e("4", "Femke Vaessen [ZWB-Synergy]"), e("5", "Lucy [SYN]")] };
  const empty = { label: "E", entrants: [] };

  it("kiest de groep met eigen renners", () => {
    expect(pickSubgroup([empty, a, { ...b, entrants: b.entrants.slice(2) }], new Set([2]))?.label).toBe("A");
  });

  it("laat één eigen renner elders niet winnen van meer ZWB'ers (Zwiftladies B)", () => {
    expect(pickSubgroup([empty, a, b], new Set([1]))?.label).toBe("B");
  });

  it("valt zonder bekende eigen renners terug op ZWB-tags (Zwiftladies B, 2026-09-22)", () => {
    expect(pickSubgroup([empty, a, b], new Set())?.label).toBe("B");
  });

  it("neemt anders de eerste groep met inschrijvers", () => {
    expect(pickSubgroup([empty, a], new Set())?.label).toBe("A");
  });

  it("kiest bij evenveel ZWB'ers de groep met eigen renners (A en B1 in één event)", () => {
    // Open Aqua Division 1, 2026-09-22: ZWB Cycling A reed groep A en ZWB
    // Cycling B1 groep B, allebei met vijf ZWB-tags in de naam.
    const groepA = {
      label: "A",
      entrants: [e("11", "Pim Meulemeester[ZWB]"), e("12", "C asper [ZWB]"), e("13", "Bart de Groot [ZWB]")],
    };
    const groepB = {
      label: "B",
      entrants: [e("21", "R Buunk [ZWB]"), e("22", "Bas Koster (ZWB)"), e("23", "Jos Leijten[ZWB]")],
    };
    const b1 = new Set([21, 22, 23]);
    const teamA = new Set([11, 12, 13]);
    expect(pickSubgroup([groepA, groepB], b1)?.label).toBe("B");
    expect(pickSubgroup([groepA, groepB], teamA)?.label).toBe("A");
  });
});
