import { describe, expect, it } from "vitest";
import { ourFiveAdvice } from "@/lib/club-ladder/five-advice";
import type { LadderMatchup, MatchupRider, MatchupSide } from "@/lib/club-ladder/matchup";
import type { PowerWkg } from "@/lib/club-ladder/team-power";

const wkg = (value: number): PowerWkg => ({ s15: value * 2.5, m1: value * 1.6, m5: value * 1.15, m20: value });

const rider = (zwiftId: number, power: number | null, profileId: string | null = null): MatchupRider => ({
  zwiftId,
  name: `R${zwiftId}`,
  position: null,
  wkg: power == null ? null : wkg(power),
  source: power == null ? null : "90d",
  racingScore: null,
  weightKg: null,
  routeWkg: null,
  races: null,
  profileId,
});

const side = (name: string, riders: MatchupRider[]) => ({ name, riders }) as unknown as MatchupSide;
const matchup = (ours: MatchupRider[], theirs: MatchupRider[]) =>
  ({ ours: side("ZWBeasts", ours), theirs: side("Rivals", theirs) }) as unknown as LadderMatchup;

describe("ourFiveAdvice", () => {
  const theirs = [rider(11, 4.0), rider(12, 3.8), rider(13, 3.6), rider(14, 3.4), rider(15, 3.2)];

  it("laat met zes renners de zwakste rusten, met de verwachte score", () => {
    const advice = ourFiveAdvice(
      matchup([rider(1, 4.2, "p1"), rider(2, 3.9), rider(3, 3.7), rider(4, 3.5), rider(5, 3.3), rider(6, 3.0)], theirs),
      null,
      true,
    );
    expect(advice?.options).toHaveLength(6);
    const [best] = advice!.options;
    expect(best.rest.map((r) => r.zwiftId)).toEqual([6]);
    // Om en om, wij voorop: 10 + 8 + 6 + 4 + 2 tegen 9 + 7 + 5 + 3 + 1.
    expect([best.ours, best.theirs, best.win]).toEqual([30, 25, true]);
    // Wie de beste laat rusten, staat onderaan.
    expect(advice!.options.at(-1)!.rest[0]).toEqual({ zwiftId: 1, name: "R1", profileId: "p1" });
  });

  it("rekent renners zonder vermogen niet mee en noemt ze apart", () => {
    const five = [rider(1, 4.2), rider(2, 3.9), rider(3, 3.7), rider(4, 3.5), rider(5, 3.3)];
    expect(ourFiveAdvice(matchup([...five, rider(6, null)], theirs), null, true)).toBeNull();
    const advice = ourFiveAdvice(matchup([...five, rider(6, 3.0), rider(7, null)], theirs), null, true);
    expect(advice?.withoutPower.map((r) => r.zwiftId)).toEqual([7]);
    expect(advice?.options.every((option) => !option.five.includes(7))).toBe(true);
  });

  it("geeft niets zonder tegenstander of met vijf renners", () => {
    const six = [rider(1, 4.2), rider(2, 3.9), rider(3, 3.7), rider(4, 3.5), rider(5, 3.3), rider(6, 3.0)];
    expect(ourFiveAdvice(matchup(six, []), null, true)).toBeNull();
    expect(ourFiveAdvice(matchup(six.slice(0, 5), theirs), null, true)).toBeNull();
  });

  it("weegt naar het parcours: bergop rust de sprinter", () => {
    const sprinter: MatchupRider = { ...rider(6, 3.2), wkg: { s15: 14, m1: 7, m5: 3.6, m20: 3.1 } };
    const climber: MatchupRider = { ...rider(5, 3.2), wkg: { s15: 8, m1: 5, m5: 4.0, m20: 3.6 } };
    const ours = [rider(1, 4.2), rider(2, 3.9), rider(3, 3.7), rider(4, 3.5), climber, sprinter];
    const climb = ourFiveAdvice(matchup(ours, theirs), { s15: 0.05, m1: 0.1, m5: 0.35, m20: 0.5 }, true);
    const sprint = ourFiveAdvice(matchup(ours, theirs), { s15: 0.6, m1: 0.2, m5: 0.1, m20: 0.1 }, true);
    expect(climb!.options[0].rest.map((r) => r.zwiftId)).toEqual([6]);
    expect(sprint!.options[0].rest.map((r) => r.zwiftId)).not.toEqual([6]);
  });
});
