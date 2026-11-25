import { describe, expect, it } from "vitest";
import {
  inLadderLiveWindow,
  ladderLive,
  ladderOverlayRows,
  ladderOverlayStatus,
  scoreOf,
  splitLadderRiders,
  type LadderLiveInput,
} from "@/lib/club-ladder/live";
import type { Passage } from "@/lib/zrl-live/scoring";

const START = Date.UTC(2026, 10, 25, 19, 0, 0);
const s = (seconds: number) => START + seconds * 1000;

const riders = [
  { zwiftId: 1, name: "Anna", own: true },
  { zwiftId: 2, name: "Bram", own: false },
  { zwiftId: 3, name: "Cor", own: true },
  { zwiftId: 4, name: "Dirk", own: false },
];

// Sprint, KOM, dan de sprint nog eens; de KOM ligt op de finishlijn in de laatste test.
const route = [
  { segmentId: "10", name: "Sprint" },
  { segmentId: "20", name: "KOM" },
  { segmentId: "10", name: "Sprint" },
];

let nextId = 0;
const pass = (athleteId: number, segmentId: string, seconds: number): Passage => ({
  id: String(++nextId),
  athleteId,
  segmentId,
  ts: s(seconds),
  elapsed: 30,
});

const base = (overrides: Partial<LadderLiveInput> = {}): LadderLiveInput => ({
  riders,
  route,
  passages: [],
  startAt: START,
  results: [],
  final: false,
  challenger: true,
  ...overrides,
});

describe("ladderLive", () => {
  it("geeft per boog de volgorde, de achterstand en de punten alsof de race daar eindigde", () => {
    const live = ladderLive(
      base({
        passages: [
          pass(2, "10", 300), pass(1, "10", 300.4), pass(3, "10", 301), pass(4, "10", 305),
          pass(1, "20", 600), pass(3, "20", 600.2), pass(2, "20", 603), pass(4, "20", 620),
          pass(1, "10", 900), pass(3, "10", 900.5), pass(4, "10", 901), pass(2, "10", 902),
        ],
      }),
    );
    expect(live.checkpoints.map((c) => c.name)).toEqual(["Sprint 1", "KOM", "Sprint 2"]);
    const [sprint, kom, sprint2] = live.checkpoints;
    expect(sprint.places.map((p) => [p.zwiftId, p.place, p.points])).toEqual([
      [2, 1, 10], [1, 2, 9], [3, 3, 8], [4, 4, 7],
    ]);
    expect(sprint.places.map((p) => p.gapMs)).toEqual([0, 400, 1000, 5000]);
    expect(sprint.score).toEqual({ ours: 17, theirs: 17, win: false });
    expect(kom.score).toEqual({ ours: 19, theirs: 15, win: true });
    expect(sprint2.leaderMs).toBe(900_000);
    expect(live.current?.name).toBe("Sprint 2");
    expect(live.starters).toBe(4);
  });

  it("zet wie nog niet langs is achter wie er al langs is, op zijn vorige plek", () => {
    const live = ladderLive(
      base({
        passages: [
          pass(1, "10", 300), pass(2, "10", 301), pass(3, "10", 302), pass(4, "10", 303),
          pass(4, "20", 600), pass(2, "20", 601),
        ],
      }),
    );
    const kom = live.current!;
    expect(kom.passed).toBe(2);
    expect(kom.places.map((p) => [p.zwiftId, p.place, p.gapMs])).toEqual([
      [4, 1, 0], [2, 2, 1000], [1, 3, null], [3, 4, null],
    ]);
  });

  it("telt wie nog nergens langs is niet mee", () => {
    const live = ladderLive(base({ passages: [pass(1, "10", 300), pass(2, "10", 301)] }));
    expect(live.current!.places.map((p) => [p.zwiftId, p.place, p.points])).toEqual([
      [1, 1, 10], [2, 2, 9], [3, null, 0], [4, null, 0],
    ]);
    expect(live.starters).toBe(2);
  });

  it("is leeg zolang niemand langs een boog is", () => {
    const live = ladderLive(base({ passages: [pass(1, "10", -60)] }));
    expect(live.checkpoints).toEqual([]);
    expect(live.current).toBeNull();
  });

  it("negeert dubbele passages en doorfietsen na de eigen finish", () => {
    const sprint = pass(1, "10", 300);
    const live = ladderLive(
      base({
        route: [{ segmentId: "10", name: "Sprint" }],
        passages: [sprint, { ...sprint }, pass(2, "10", 301), pass(1, "10", 2000)],
        results: [{ zwiftId: 1, durationMs: 1200_000 }],
      }),
    );
    expect(live.checkpoints.map((c) => [c.name, c.passed])).toEqual([["Sprint", 2], ["Finish", 1]]);
  });

  it("voegt een boog op de finishlijn samen met de finish en zet de finishers voorop", () => {
    const live = ladderLive(
      base({
        route: [{ segmentId: "10", name: "Sprint" }, { segmentId: "20", name: "KOM" }],
        passages: [
          pass(1, "10", 300), pass(2, "10", 301), pass(3, "10", 302), pass(4, "10", 303),
          pass(2, "20", 1200), pass(1, "20", 1201),
        ],
        results: [
          { zwiftId: 2, durationMs: 1200_000 },
          { zwiftId: 1, durationMs: 1201_000 },
        ],
      }),
    );
    expect(live.checkpoints.map((c) => c.name)).toEqual(["Sprint", "Finish"]);
    const finish = live.current!;
    expect(finish.places.map((p) => [p.zwiftId, p.place, p.points])).toEqual([
      [2, 1, 10], [1, 2, 9], [3, 3, 8], [4, 4, 7],
    ]);
    expect(live.finished).toBe(2);
  });

  it("geeft na een complete uitslag geen punten aan wie niet binnen is", () => {
    const live = ladderLive(
      base({
        route: [{ segmentId: "10", name: "Sprint" }],
        passages: [pass(1, "10", 300), pass(2, "10", 301), pass(3, "10", 302), pass(4, "10", 303)],
        results: [
          { zwiftId: 4, durationMs: 1200_000 },
          { zwiftId: 1, durationMs: 1201_000 },
          { zwiftId: 2, durationMs: 1202_000 },
        ],
        final: true,
      }),
    );
    expect(live.current!.places.map((p) => [p.zwiftId, p.points])).toEqual([
      [4, 10], [1, 9], [2, 8], [3, 0],
    ]);
    expect(live.current!.score).toEqual({ ours: 9, theirs: 18, win: false });
  });
});

describe("scoreOf", () => {
  const places = [
    { zwiftId: 1, name: "A", own: true, place: 1, points: 10, gapMs: 0 },
    { zwiftId: 2, name: "B", own: false, place: 2, points: 9, gapMs: 0 },
    { zwiftId: 3, name: "C", own: false, place: 3, points: 8, gapMs: 0 },
    { zwiftId: 4, name: "D", own: true, place: 4, points: 7, gapMs: 0 },
  ];
  it("laat de uitdager verliezen bij gelijke stand", () => {
    expect(scoreOf(places, true).win).toBe(false);
    expect(scoreOf(places, false).win).toBe(true);
    expect(scoreOf(places, null).win).toBeNull();
  });
});

describe("inLadderLiveWindow", () => {
  it("loopt van een kwartier voor de start tot drie uur erna", () => {
    expect(inLadderLiveWindow(START, START - 16 * 60_000)).toBe(false);
    expect(inLadderLiveWindow(START, START - 15 * 60_000)).toBe(true);
    expect(inLadderLiveWindow(START, START + 3 * 3600_000)).toBe(true);
    expect(inLadderLiveWindow(START, START + 3 * 3600_000 + 1)).toBe(false);
  });
});

describe("splitLadderRiders", () => {
  it("gaat uit van de aanmeldingen, dan de leden, dan de clubtag; de rest is de tegenstander", () => {
    const riders = splitLadderRiders(
      [
        { zwiftId: "1", name: "Anna [V]" },
        { zwiftId: "2", name: "Bram [ZWB]" },
        { zwiftId: "3", name: "Cor" },
        { zwiftId: "4", name: "Dirk [ZWB]" },
        { zwiftId: "5", name: "Eva" },
        { zwiftId: "x", name: "Fout" },
      ],
      { ours: new Set([1]), theirs: new Set([2]), members: new Set([3]) },
      (name) => name.includes("[ZWB]"),
    );
    expect(riders.map((r) => [r.zwiftId, r.name, r.own])).toEqual([
      [1, "Anna", true],
      [2, "Bram", false],
      [3, "Cor", true],
      [4, "Dirk", true],
      [5, "Eva", false],
    ]);
  });
});

describe("ladderOverlayRows", () => {
  const live = ladderLive(
    base({
      passages: [pass(2, "10", 300), pass(4, "10", 300.5), pass(1, "10", 301), pass(3, "10", 305)],
    }),
  );

  it("zet de winnende ploeg bovenaan en daaronder de renners", () => {
    const rows = ladderOverlayRows({ ours: "ZWBeasts", theirs: "Valhalla", live }, 15);
    expect(rows.map((r) => [r.kind, r.rank, r.label, r.value, r.own])).toEqual([
      ["team", 1, "Valhalla", 19, false],
      ["team", 2, "ZWBeasts", 15, true],
      ["rider", 1, "Bram", 10, false],
      ["rider", 2, "Dirk", 9, false],
      ["rider", 3, "Anna", 8, true],
      ["rider", 4, "Cor", 7, true],
    ]);
  });

  it("knipt af op het aantal rijen, maar houdt de score", () => {
    expect(ladderOverlayRows({ ours: "A", theirs: "B", live }, 4).map((r) => r.key)).toEqual([
      "team-theirs", "team-ours", "rider-2", "rider-4",
    ]);
    expect(ladderOverlayRows({ ours: "A", theirs: "B", live }, 0)).toHaveLength(2);
  });

  it("is leeg zolang niemand langs een boog is", () => {
    expect(ladderOverlayRows({ ours: "A", theirs: "B", live: ladderLive(base()) }, 15)).toEqual([]);
  });

  it("zet bij gelijke stand de ploeg bovenaan die dan wint", () => {
    const tie = ladderLive(base({ passages: [pass(2, "10", 300), pass(1, "10", 301), pass(3, "10", 302), pass(4, "10", 303)] }));
    expect(tie.current!.score).toEqual({ ours: 17, theirs: 17, win: false });
    expect(ladderOverlayRows({ ours: "A", theirs: "B", live: tie }, 15)[0].label).toBe("B");
  });
});

describe("ladderOverlayStatus", () => {
  it("noemt het laatste punt, de finish of de uitslag", () => {
    const live = ladderLive(base({ passages: [pass(1, "10", 300)] }));
    expect(ladderOverlayStatus(live, START, s(400))).toBe("Live · Club Ladder · na Sprint 1");
    expect(ladderOverlayStatus(ladderLive(base()), START, s(-60))).toBe("Begint zo · Club Ladder");
    expect(ladderOverlayStatus({ ...live, final: true }, START, s(4000))).toBe("Uitslag · Club Ladder");
  });
});
