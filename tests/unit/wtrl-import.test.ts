import { describe, expect, it } from "vitest";
import {
  matchResultRiders,
  parseMyTeams,
  parseResults,
  parseResultsMenu,
  parseTeamDetails,
  MAX_DIVISION_PAGES_PER_RUN,
  parseResultTable,
  parseStandings,
  pickDivisionPaths,
  standingsWanted,
  planAssignments,
  planWtrlRacepasses,
  wtrlDivisionKey,
  withZwiftIds,
  wtrlPathKind,
  type WtrlResultRider,
} from "@/lib/wtrl/import";
import { cleanCarry } from "@/lib/wtrl/run";
import { planRacepassImport } from "@/lib/events/zrl-racepass-import";
import { zrlLeagueKey } from "@/lib/zrl-live/team-tags";

// Vormen zoals gemeten op 2026-11-25; namen en ID's verzonnen.

describe("wtrlPathKind", () => {
  it("kent alleen de vier paden van de import", () => {
    expect(wtrlPathKind("/zrl/myteams/")).toBe("myTeams");
    expect(wtrlPathKind("/api/zrl/21/teams/79152")).toBe("team");
    expect(wtrlPathKind("/api/zrl/results/21")).toBe("menu");
    expect(wtrlPathKind("/api/zrl/results/21/2420B40/2")).toBe("results");
    expect(wtrlPathKind("/api/zrl/results/info")).toBeNull();
    expect(wtrlPathKind("https://evil.example/zrl/myteams/")).toBeNull();
    expect(wtrlPathKind("/api/zrl/21/teams/79152/123/resend")).toBeNull();
  });
});

describe("parseMyTeams", () => {
  const panel = (trc: string, pass: string) =>
    `<div class="panel" id="trc${trc}"><div class="panel-heading"><button class="racepass btn" onclick="copyRacePass('${pass}')">RacePass&trade;</button></div>` +
    `<div class="panel-body" data-trc="${trc}" data-season="21" data-loading="0">Loading team details…</div></div>`;

  it("leest TRC, seizoen en racepass per paneel", () => {
    const html = `<div class="accordion" id="teamManagement">${panel("79152", "")}${panel(
      "77328",
      "https://www.wtrl.racing/RacePass/QUJD&amp;x=1",
    )}</div>`;
    expect(parseMyTeams(html)).toEqual([
      { trc: "79152", season: 21, racepass: null },
      { trc: "77328", season: 21, racepass: "https://www.wtrl.racing/RacePass/QUJD&x=1" },
    ]);
  });

  it("neemt alleen een link van wtrl.racing als racepass", () => {
    expect(parseMyTeams(panel("1", "https://example.com/x"))[0].racepass).toBeNull();
  });
});

describe("parseTeamDetails", () => {
  const json = {
    meta: {
      trc: 79152,
      team: { teamid: 20937, name: "ZWB B3" },
      racingSeason: "2026/27",
      division: "Open Aqua League Division B4",
      divisionStartUTC: "2026-12-01T19:02:00Z",
      competition: { class: "2420B40", division: "B", roundnumber: 2, season: 21 },
      administrators: { captain: { firstName: "Anna", lastName: "Jansen", profileId: 1 } },
    },
    riders: [
      { profileId: 111, name: "PIM DE VRIES", category: "B", memberStatus: "MEMBER", zftp: 3.51, zftpw: 253, zmap: 4.37 },
      { profileId: 222, name: "Lot Bakker", category: "c", memberStatus: "INVITED", zftp: null, zftpw: null, zmap: null },
      { profileId: 0, name: "Kapot" },
    ],
  };

  it("geeft het team zoals de plak, met klasse en volgende start", () => {
    const details = parseTeamDetails(json)!;
    expect(details.trc).toBe("79152");
    expect(details.wtrlClass).toBe("2420B40");
    expect(details.nextStartAt).toBe("2026-12-01T19:02:00.000Z");
    expect(details.team).toMatchObject({
      name: "ZWB B3",
      trcRef: "79152/20937",
      season: "2026/27",
      division: "Open Aqua League Division B4",
      captain: "Anna Jansen",
    });
    expect(details.team.riders).toEqual([
      { zwiftId: "111", name: "Pim de Vries", category: "B", status: "member", zftpW: 253, zftpWkg: 3.51, zmapWkg: 4.37 },
      { zwiftId: "222", name: "Lot Bakker", category: "C", status: "invited", zftpW: null, zftpWkg: null, zmapWkg: null },
    ]);
  });

  it("weigert een antwoord zonder team", () => {
    expect(parseTeamDetails({ success: false })).toBeNull();
  });
});

describe("parseResultsMenu en wtrlDivisionKey", () => {
  const menu = {
    payload: {
      seasons: [
        { value: 20, text: "2026/27 Round 1: Fast & Fresh" },
        { value: 21, text: "2026/27 Round 2: Team Tempo" },
      ],
      competition: [
        {
          value: "20",
          text: "Open Regular",
          leagues: [
            {
              value: 420,
              text: "Aqua",
              divisions: [
                {
                  value: "B4",
                  races: [
                    { value: 1, text: "Race 1: London Calling TTT (Finalized)" },
                    { value: 2, text: "Race 2: Elevation Evaluation SCR (Provisional)" },
                    { value: 3, text: "Race 3: Nog niet" },
                  ],
                },
              ],
            },
          ],
        },
        { value: "21", text: "Open Development", leagues: [{ value: 420, text: "Aqua", divisions: [{ value: "B2", races: [] }] }] },
        { value: "00", text: "Women's Regular", leagues: [{ value: 360, text: "Mint", divisions: [{ value: "B1", races: [] }] }] },
      ],
    },
  };

  it("bouwt de klasse en leest de status per race", () => {
    const parsed = parseResultsMenu(menu, 21);
    expect(parsed.seasonText).toBe("2026/27 Round 2: Team Tempo");
    expect(parsed.divisions.map((d) => d.wtrlClass)).toEqual(["2420B40", "2420B21", "0360B10"]);
    expect(parsed.divisions[0].races).toEqual([
      { race: 1, status: "final" },
      { race: 2, status: "provisional" },
    ]);
  });

  it("geeft dezelfde sleutel als de live stand uit de Zwift-naam", () => {
    const season = "2026/27 Round 2: Team Tempo";
    expect(wtrlDivisionKey("2420B40", "aqua", season)).toBe(
      zrlLeagueKey("Zwift Racing League 2026/27 Round 2: Team Tempo - Open Aqua League Division 4 - Race 2", "B", "1"),
    );
    expect(wtrlDivisionKey("2420B21", "aqua", season)).toBe(
      zrlLeagueKey("Zwift Racing League 2026/27 Round 2: Team Tempo - Open Aqua Dev League Division 2 - Race 2", "B", "1"),
    );
    expect(wtrlDivisionKey("0360B10", "mint", season)).toBe(
      zrlLeagueKey("Zwift Racing League 2026/27 Round 2: Team Tempo - Womens Mint League Division 1 - Race 2", "B", "1"),
    );
  });
});

describe("parseResults en matchResultRiders", () => {
  const json = {
    payload: [
      {
        teamname: "De Snelle Vegers",
        a: [
          { name: "W. Aerts", timeResult: "4126.753", watts: 276, zid: 5811085 },
          { name: "B. Claes", timeResult: 4079.074, watts: 282, zid: 5811085 },
          { name: "P. Uitvaller", timeResult: "4183.000", watts: 108, zid: 5811085 },
        ],
      },
      { teamname: "Twee Gelijk", a: [{ name: "T. Een", timeResult: "4000.000", watts: 250, zid: 5811085 }] },
    ],
  };
  const riders = parseResults(json);

  it("geeft de rittijd in milliseconden", () => {
    expect(riders.map((r) => [r.team, r.durationMs, r.zwiftEventId])).toEqual([
      ["De Snelle Vegers", 4126753, "5811085"],
      ["De Snelle Vegers", 4079074, "5811085"],
      ["De Snelle Vegers", 4183000, "5811085"],
      ["Twee Gelijk", 4000000, "5811085"],
    ]);
  });

  it("koppelt op rittijd, bij gelijke tijd op vermogen, anders niet", () => {
    const zwift = [
      { profileId: 1, durationMs: 4126753, avgWatts: 276 },
      { profileId: 2, durationMs: 4079074, avgWatts: 282 },
      { profileId: 3, durationMs: 4000000, avgWatts: 250 },
      { profileId: 4, durationMs: 4000000, avgWatts: 251 },
    ];
    const matched = matchResultRiders(riders, zwift);
    const byName = new Map([...matched].map(([rider, id]) => [rider.name, id]));
    expect(Object.fromEntries(byName)).toEqual({ "W. Aerts": 1, "B. Claes": 2, "T. Een": 3 });
  });

  it("koppelt niemand als twee WTRL-renners op dezelfde Zwift-renner vallen", () => {
    const twins: WtrlResultRider[] = [
      { team: "A", name: "X. Een", durationMs: 100, watts: null, zwiftEventId: "1" },
      { team: "B", name: "X. Twee", durationMs: 100, watts: null, zwiftEventId: "1" },
    ];
    expect(matchResultRiders(twins, [{ profileId: 9, durationMs: 100 }]).size).toBe(0);
  });
});

describe("planAssignments", () => {
  it("laat een bijstelling van een ploegleider staan en schrijft alleen wat verandert", () => {
    const existing = [
      { zwift_id: 1, team_label: "Eigen keus", source: "manual" },
      { zwift_id: 2, team_label: "Oud", source: "wtrl" },
      { zwift_id: 3, team_label: "Zelfde", source: "wtrl" },
    ];
    const found = new Map([
      [1, "WTRL-team"],
      [2, "Nieuw"],
      [3, "Zelfde"],
      [4, "Erbij"],
    ]);
    expect(planAssignments(existing, found)).toEqual([
      { zwift_id: 2, team_label: "Nieuw" },
      { zwift_id: 4, team_label: "Erbij" },
    ]);
  });
});

describe("planWtrlRacepasses", () => {
  const row = (race_date: string, url: string, source: string, site_url: string | null = null) => ({
    team_id: "t",
    race_date,
    url,
    source,
    site_url,
  });

  it("gaat voor de site, niet voor een handmatige pass", () => {
    const plan = planWtrlRacepasses(
      [row("2026-12-01", "https://www.wtrl.racing/RacePass/site", "site", "https://www.wtrl.racing/RacePass/site")],
      [{ teamId: "t", raceDate: "2026-12-01", url: "https://www.wtrl.racing/RacePass/wtrl" }],
    );
    expect(plan.upserts).toEqual([
      row("2026-12-01", "https://www.wtrl.racing/RacePass/wtrl", "wtrl", "https://www.wtrl.racing/RacePass/site"),
    ]);
    expect(
      planWtrlRacepasses(
        [row("2026-12-01", "https://www.wtrl.racing/RacePass/hand", "manual")],
        [{ teamId: "t", raceDate: "2026-12-01", url: "https://www.wtrl.racing/RacePass/wtrl" }],
      ).upserts,
    ).toEqual([]);
  });

  it("zet de pass van een vorige race niet bij de volgende", () => {
    const plan = planWtrlRacepasses(
      [row("2026-11-24", "https://www.wtrl.racing/RacePass/oud", "site")],
      [{ teamId: "t", raceDate: "2026-12-01", url: "https://www.wtrl.racing/RacePass/oud" }],
    );
    expect(plan.upserts).toEqual([]);
    expect(plan.skipped).toHaveLength(1);
  });
});

describe("planRacepassImport met een WTRL-pass", () => {
  it("laat de WTRL-pass staan en bewaart alleen wat de site zegt", () => {
    const existing = [
      { team_id: "t", race_date: "2026-12-01", url: "https://www.wtrl.racing/RacePass/wtrl", source: "wtrl" as const, site_url: null },
    ];
    const scraped = [
      { teamId: "t", teamName: "B3", raceDate: "2026-12-01", url: "https://www.wtrl.racing/RacePass/site" },
    ];
    const plan = planRacepassImport(existing, scraped);
    expect(plan.upserts).toEqual([
      {
        team_id: "t",
        race_date: "2026-12-01",
        url: "https://www.wtrl.racing/RacePass/wtrl",
        source: "wtrl",
        site_url: "https://www.wtrl.racing/RacePass/site",
      },
    ]);
    expect(plan.differs).toEqual([]);
  });
});

describe("cleanCarry", () => {
  it("neemt alleen de verwachte vorm over", () => {
    expect(
      cleanCarry({
        season: 21,
        passes: { "79152": "https://www.wtrl.racing/RacePass/x", bad: "https://x", "1": "javascript:alert(1)" },
        classes: { "2420B40": { key: "k", ownTeams: ["ZWB B3", 5] }, x: "nee" },
        status: { "2420B40/1": "final", "2420B40/2": "iets" },
      }),
    ).toEqual({
      season: 21,
      passes: { "79152": "https://www.wtrl.racing/RacePass/x" },
      classes: { "2420B40": { key: "k", ownTeams: ["ZWB B3"] } },
      status: { "2420B40/1": "final" },
    });
    expect(cleanCarry(null)).toEqual({ season: null, passes: {}, classes: {}, status: {} });
  });
});

describe("pickDivisionPaths", () => {
  it("neemt de nieuwste race eerst en houdt het maximum aan", () => {
    const wanted = Array.from({ length: 12 }, (_, n) => ({
      path: `/r/${(n % 4) + 1}/${n}`,
      race: (n % 4) + 1,
      priority: 0 as const,
    }));
    const picked = pickDivisionPaths(wanted);
    expect(picked).toHaveLength(MAX_DIVISION_PAGES_PER_RUN);
    expect(picked.slice(0, 3).every((path) => path.startsWith("/r/4/"))).toBe(true);
    expect(picked.some((path) => path.startsWith("/r/1/"))).toBe(false);
  });

  it("nieuwe uitslagen, dan standen, dan voorlopige uitslagen opnieuw", () => {
    const wanted = [
      ...Array.from({ length: 6 }, (_, n) => ({ path: `/again/${n}`, race: 2, priority: 2 as const })),
      ...Array.from({ length: 4 }, (_, n) => ({ path: `/league/${n}`, race: 2, priority: 1 as const })),
      ...Array.from({ length: 5 }, (_, n) => ({ path: `/new/${n}`, race: 1, priority: 0 as const })),
    ];
    const picked = pickDivisionPaths(wanted);
    expect(picked.filter((path) => path.startsWith("/new/"))).toHaveLength(5);
    expect(picked.filter((path) => path.startsWith("/league/"))).toHaveLength(3);
    expect(picked.some((path) => path.startsWith("/again/"))).toBe(false);
  });
});

describe("competitiestand", () => {
  it("leest de tabel van /api/zrl/league", () => {
    const rows = parseStandings({
      success: true,
      payload: [
        { c: 2, d: "Team Twee", teamId: "222", j: 16, r1: "9", r2: "7", r3: "0", l: 2, i: 130, e: 0, k: 0, pbp: 2 },
        { c: 1, d: "Team Een", teamId: "111", j: 17, r1: "7", r2: "10", r3: "0", l: 2, i: 149, e: 0, k: 0, pbp: 10 },
        { c: 3, d: "Zonder ID", j: 1 },
      ],
    });
    expect(rows.map((row) => row.name)).toEqual(["Team Een", "Team Twee"]);
    expect(rows[0]).toMatchObject({ rank: 1, teamId: "111", points: 17, perRace: [7, 10], races: 2, fin: 149, pbp: 10 });
  });

  it("haalt een stand alleen opnieuw na een nieuwe race of als hij definitief werd", () => {
    expect(standingsWanted(null, { race: 2, status: "provisional" })).toBe(true);
    expect(standingsWanted({ race: 1, final: true }, { race: 2, status: "provisional" })).toBe(true);
    expect(standingsWanted({ race: 2, final: false }, { race: 2, status: "provisional" })).toBe(false);
    expect(standingsWanted({ race: 2, final: false }, { race: 2, status: "final" })).toBe(true);
    expect(standingsWanted({ race: 2, final: true }, { race: 2, status: "final" })).toBe(false);
  });
});

describe("uitslag voor de teampagina", () => {
  const json = {
    success: true,
    payload: [
      {
        p1: 9999, teamname: "Uit de race", totp: 41, falp: 0, ftsp: 0, finp: 41, pbp: 0, lpoints: 0, dq: 1, id5: 7001,
        a: [{ p1: 1, name: "D. Eén", totrp: 41, falrp: 0, ftsrp: 0, finrp: 41, pbprp: 0, timeResult: "4000.5", wkg: 3, dq: 1, zid: 7001 }],
      },
      {
        p1: 1, teamname: "Ons Team", totp: 94, falp: 4, ftsp: 6, finp: 80, pbp: 4, lpoints: 10, dq: 0, id5: 7001,
        a: [
          { p1: 2, name: "B. Twee", totrp: 26, falrp: 2, ftsrp: 2, finrp: 20, pbprp: 2, timeResult: "4100.25", wkg: 3.2, dq: 0, zid: 7001 },
          { p1: 1, name: "A. Een", totrp: 39, falrp: 2, ftsrp: 4, finrp: 30, pbprp: 3, timeResult: "4000.125", wkg: 3.5, dq: 0, zid: 7001 },
        ],
      },
    ],
  };

  it("leest teams en renners met hun punten, DQ achteraan", () => {
    const teams = parseResultTable(json);
    expect(teams.map((team) => [team.rank, team.name, team.dq])).toEqual([[1, "Ons Team", false], [null, "Uit de race", true]]);
    expect(teams[0]).toMatchObject({ points: 94, fal: 4, fts: 6, fin: 80, pbp: 4, leaguePoints: 10, zwiftEventId: "7001" });
    expect(teams[0].riders.map((rider) => [rider.rank, rider.name, rider.points, rider.timeMs])).toEqual([
      [1, "A. Een", 39, 4000125],
      [2, "B. Twee", 26, 4100250],
    ]);
  });

  it("zet het Zwift-ID bij renners die op rittijd gevonden zijn", () => {
    const riders = parseResults(json);
    const found = riders.find((rider) => rider.name === "A. Een")!;
    const teams = withZwiftIds(parseResultTable(json), new Map([[found, 123]]));
    expect(teams[0].riders.map((rider) => rider.zwiftId)).toEqual([123, null]);
  });
});

