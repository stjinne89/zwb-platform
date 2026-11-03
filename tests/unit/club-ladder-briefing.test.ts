import { describe, expect, it } from "vitest";
import {
  keyDuration,
  ladderCheatRules,
  ladderRoles,
  ladderWatch,
  projectLadder,
  routeRatings,
  type LadderBriefingRider,
} from "@/lib/club-ladder/briefing";
import { ladderChallengerFromTitle } from "@/lib/club-ladder/fixture-events";
import type { PowerWkg } from "@/lib/club-ladder/team-power";

const wkg = (s15: number | null, m1: number | null, m5: number | null, m20: number | null): PowerWkg => ({ s15, m1, m5, m20 });

const rider = (zwiftId: number, own: boolean, rating: number | null): LadderBriefingRider => ({
  zwiftId,
  name: `R${zwiftId}`,
  own,
  rating,
  wkg: null,
  source: rating === null ? null : "90d",
  racingScore: null,
});

/** Tien renners om en om, met de eerste van `firstOwn`. */
const alternating = (firstOwn: boolean) =>
  Array.from({ length: 10 }, (_, i) => rider(i + 1, i % 2 === 0 ? firstOwn : !firstOwn, 2 - i * 0.1));

describe("routeRatings", () => {
  it("vergelijkt per duur met het gemiddelde, zodat een ontbrekende duur niet zwak telt", () => {
    const ratings = routeRatings(
      [
        { zwiftId: 1, wkg: wkg(10, 6, 4.4, 4) },
        { zwiftId: 2, wkg: wkg(10, 6, 4, 3.6) },
        { zwiftId: 3, wkg: wkg(null, null, 4.4, null) },
      ],
      null,
    );
    expect(ratings.get(1)!).toBeGreaterThan(ratings.get(2)!);
    // Alleen 5 min, en die is even hoog als renner 1.
    expect(ratings.get(3)!).toBeCloseTo(Math.exp(Math.log(4.4) - (2 * Math.log(4.4) + Math.log(4)) / 3), 6);
  });

  it("weegt naar het parcours", () => {
    const riders = [
      { zwiftId: 1, wkg: wkg(14, 7, 4, 3.5) }, // sprinter
      { zwiftId: 2, wkg: wkg(10, 6, 4.6, 4.2) }, // klimmer
    ];
    const flat = routeRatings(riders, { s15: 0.6, m1: 0.2, m5: 0.1, m20: 0.1 });
    const climb = routeRatings(riders, { s15: 0.05, m1: 0.1, m5: 0.35, m20: 0.5 });
    expect(flat.get(1)!).toBeGreaterThan(flat.get(2)!);
    expect(climb.get(2)!).toBeGreaterThan(climb.get(1)!);
  });

  it("geeft null zonder vermogen", () => {
    expect(routeRatings([{ zwiftId: 1, wkg: null }], null).get(1)).toBeNull();
  });
});

describe("projectLadder", () => {
  it("telt 10‥1 en laat de uitdager bij gelijke stand verliezen", () => {
    // Om en om: wij 10+8+6+4+2 = 30, zij 9+7+5+3+1 = 25.
    const ahead = projectLadder(alternating(true), true);
    expect([ahead.ours, ahead.theirs]).toEqual([30, 25]);
    expect(ahead.win).toBe(true);
    // 30–25: één plek kwijt is 28–27, twee is 26–29.
    expect(ahead.spare).toBe(1);
    expect(ahead.overtakesNeeded).toBe(0);

    const behind = projectLadder(alternating(false), true);
    expect([behind.ours, behind.theirs]).toEqual([25, 30]);
    expect(behind.win).toBe(false);
    // 25–30 → 27–28 → 29–26.
    expect(behind.overtakesNeeded).toBe(2);
  });

  it("gelijk wint voor de uitgedaagde", () => {
    const riders = [rider(1, true, 9), rider(2, false, 8), rider(3, false, 7), rider(4, true, 6)];
    // Wij 10 + 7 = 17, zij 9 + 8 = 17.
    const asChallenger = projectLadder(riders, true);
    const asOpponent = projectLadder(riders, false);
    expect([asChallenger.ours, asChallenger.theirs]).toEqual([17, 17]);
    expect(asChallenger.win).toBe(false);
    expect(asChallenger.overtakesNeeded).toBe(1);
    expect(asOpponent.win).toBe(true);
    expect(asOpponent.spare).toBe(0);
  });

  it("zet renners zonder vermogen achteraan, zonder punten", () => {
    const projection = projectLadder([rider(1, true, null), rider(2, false, 1)], false);
    expect(projection.order.map((row) => [row.zwiftId, row.points])).toEqual([
      [2, 10],
      [1, 0],
    ]);
  });
});

describe("ladderCheatRules", () => {
  it("zegt wie uitdaagt en wat er verwacht wordt", () => {
    const rules = ladderCheatRules({ challenger: false, opponent: "Galaxy Avengers", projection: projectLadder(alternating(false), false) });
    expect(rules[0]).toMatchObject({ value: "1 plek inhalen", key: true });
    expect(rules.find((r) => r.value === "gelijk = winst")?.text).toContain("Galaxy Avengers daagt ons uit");
    expect(rules.at(-1)).toEqual({ value: "verwacht 25–30", text: "2 tegenstanders inhalen" });
  });

  it("noemt geen verwachting zolang een kant geen vijf renners met vermogen heeft", () => {
    const riders = alternating(true).map((r) => (r.zwiftId === 2 ? { ...r, rating: null } : r));
    const rules = ladderCheatRules({ challenger: true, opponent: "X", projection: projectLadder(riders, true) });
    expect(rules.some((r) => r.value.startsWith("verwacht"))).toBe(false);
  });

  it("noemt geen verwachting zonder vermogen aan beide kanten", () => {
    const rules = ladderCheatRules({ challenger: true, opponent: "X", projection: projectLadder([rider(1, true, 1), rider(2, false, null)], true) });
    expect(rules.some((r) => r.value.startsWith("verwacht"))).toBe(false);
    expect(rules.some((r) => r.value === "gelijk = verlies")).toBe(true);
  });
});

describe("ladderWatch", () => {
  it("geeft de sterkste tegenstanders met de duur die het zwaarst telt", () => {
    const riders = alternating(true).map((r) => ({ ...r, wkg: wkg(10, 6, 4.36, 4) }));
    const weights = { s15: 0.1, m1: 0.2, m5: 0.5, m20: 0.2 };
    expect(keyDuration(weights)).toBe("m5");
    const lines = ladderWatch(projectLadder(riders, true), weights, 2);
    expect(lines).toEqual([
      { name: "R2", note: "verwacht 2e · 5 min 4,4 w/kg" },
      { name: "R4", note: "verwacht 4e · 5 min 4,4 w/kg" },
    ]);
  });
});

describe("ladderChallengerFromTitle", () => {
  it("de thuisploeg is de uitdager", () => {
    expect(ladderChallengerFromTitle("Club Ladder: ZWBeasts – Galaxy Avengers", "ZWBeasts")).toBe(true);
    expect(ladderChallengerFromTitle("Club Ladder: Galaxy Avengers – ZWBeasts", "ZWBeasts")).toBe(false);
    expect(ladderChallengerFromTitle("ZRL W3", "ZWBeasts")).toBeNull();
  });
});

describe("ladderRoles", () => {
  it("geeft geen kopman: voorin, aanhaken en wie te pakken of achter je te houden", () => {
    // ZWB op 1 en 6 van 6, zoals 17729 met de aanmeldingen van 3 november.
    const riders = [rider(1, true, 1.03), rider(2, false, 1.02), rider(3, false, 1.01), rider(4, false, 1), rider(5, false, 0.98), rider(6, true, 0.95)];
    const roles = ladderRoles(projectLadder(riders, true));
    expect(roles.get(1)).toEqual({ role: "voorin", ahead: null, behind: "R2" });
    expect(roles.get(6)).toEqual({ role: "aanhaken", ahead: "R5", behind: null });
  });

  it("laat de sterkste gaten dichtrijden als er drie of meer van ons zijn en iemand achterin zit", () => {
    const roles = ladderRoles(projectLadder(alternating(true), true));
    // Wij op 1, 3, 5, 7, 9 van 10.
    expect(roles.get(1)?.role).toBe("brug");
    expect(roles.get(3)?.role).toBe("voorin");
    expect(roles.get(7)?.role).toBe("aanhaken");
    expect(roles.get(5)).toEqual({ role: "voorin", ahead: "R4", behind: "R6" });
  });

  it("een renner zonder vermogen haakt aan, zonder doelen", () => {
    const roles = ladderRoles(projectLadder([rider(1, true, null), rider(2, false, 1)], false));
    expect(roles.get(1)).toEqual({ role: "aanhaken", ahead: null, behind: null });
  });
});
