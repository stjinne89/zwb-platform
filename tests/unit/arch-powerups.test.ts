import { describe, expect, it } from "vitest";
import { archPowerups, powerupChances, startingPowerup } from "@/lib/zwift/powerups";
import { archPowerupList, powerupOddsWithArches } from "@/lib/race-briefing/arches";
import type { BriefingSegment } from "@/lib/race-briefing/route";

// ZRL W6 2026/27, Spiral Summit, subgroep A (Zwift-event 5758531), 2026-10-27.
const tags = ["wtrl", "zrl", "zrl_points", "zrl_arch", "starting_powerup=4", 'arch_powerup="0,0,82,0,81,5,5,3"', "no_flagging"];

const seg = (kind: BriefingSegment["kind"], slug: string, name: string, startKm: number, endKm: number, pass = 1, passes = 1): BriefingSegment => ({
  kind,
  slug,
  name,
  startKm,
  endKm,
  pass,
  passes,
});

describe("powerups per boog", () => {
  it("leest arch_powerup als paren boog, powerup", () => {
    expect(Object.fromEntries(archPowerups(tags)!)).toEqual({ 0: "feather", 82: "feather", 81: "aero", 5: "xp" });
    expect(startingPowerup(tags)).toBe("burrito");
  });

  it("geeft null zonder de tags", () => {
    expect(archPowerups(["zrl"])).toBeNull();
    expect(startingPowerup(["zrl"])).toBeNull();
  });

  it("zet op Spiral Summit elke boog met zijn powerup, zoals Zwift Insider", () => {
    const segments = [
      seg("lap", "jarvis-lap", "Jarvis Lap", 10.324, 15.171),
      seg("kom", "jarvis-kom", "Jarvis KOM", 10.988, 12.794, 1, 2),
      seg("sprint", "jarvis-sprint", "Jarvis Sprint", 14.134, 14.331, 1, 2),
      seg("kom", "jarvis-kom", "Jarvis KOM", 15.835, 17.629, 2, 2),
      seg("sprint", "jarvis-sprint", "Jarvis Sprint", 18.967, 19.169, 2, 2),
      seg("kom", "volcano-kom", "Volcano KOM", 20.378, 24.106),
      seg("sprint", "onbekend-sprint", "Onbekend Sprint", 21, 21.2),
    ];
    const list = archPowerupList({ segments, totalKm: 24.106, arches: archPowerups(tags), start: startingPowerup(tags) });
    expect(list.map((a) => [a.km, a.label, a.reward])).toEqual([
      [0, "start", "burrito"],
      [12.794, "KOM Jarvis (1e)", "aero"],
      [14.331, "sprint Jarvis (1e)", "feather"],
      [15.171, "ronde Jarvis", "feather"],
      [17.629, "KOM Jarvis (2e)", "aero"],
      [19.169, "sprint Jarvis (2e)", "feather"],
    ]);
  });

  it("zet zonder arch_powerup elke boog op de route erin, zonder vaste powerup", () => {
    // Club Ladder op The Muckle Yin (Zwift-event 5772909), 2026-11-03.
    const ladder = ['powerup_percent="0,50,1,50"', "ladder", "starting_powerup=0"];
    const segments = [
      seg("kom", "sgurr-summit-north", "Sgurr Summit North KOM", 8.5, 10.1),
      seg("kom", "sgurr-summit-south", "Sgurr Summit South KOM", 17.4, 19.1),
      seg("sprint", "streep-sprint", "Streep Sprint", 23.4, 23.6),
    ];
    const list = archPowerupList({ segments, totalKm: 23.6, arches: archPowerups(ladder), start: startingPowerup(ladder), random: true });
    expect(list.map((a) => [a.km, a.label, a.reward])).toEqual([
      [0, "start", "feather"],
      [10.1, "KOM Sgurr Summit North", null],
      [19.1, "KOM Sgurr Summit South", null],
    ]);
  });

  it("laat zonder kansverdeling de bogen zonder vaste powerup weg", () => {
    const segments = [seg("kom", "sgurr-summit-north", "Sgurr Summit North KOM", 8.5, 10.1)];
    expect(archPowerupList({ segments, totalKm: 23.6, arches: null, start: null })).toEqual([]);
  });

  it("geeft een boog met bekende archId buiten arch_powerup de kansverdeling, en laat onbekende weg", () => {
    // ZRL Green to Screen: arch_powerup="0,3" (XP) naast een kansverdeling.
    const zrl = ['arch_powerup="0,3"', 'powerup_percent="0,34,1,33,5,33"'];
    const segments = [
      seg("lap", "jarvis-lap", "Jarvis Lap", 0, 5),
      seg("kom", "volcano-kom", "Volcano KOM", 6, 8),
      seg("sprint", "onbekend-sprint", "Onbekend Sprint", 9, 9.2),
    ];
    const list = archPowerupList({ segments, totalKm: 20, arches: archPowerups(zrl), start: null, random: true });
    expect(list.map((a) => [a.km, a.reward])).toEqual([
      [5, "xp"],
      [8, null],
    ]);
  });

  it("telt twee segmenten die op dezelfde plek eindigen als één boog", () => {
    const segments = [seg("lap", "ronde-lap", "Ronde Lap", 0, 5), seg("sprint", "ronde-sprint", "Ronde Sprint", 4.8, 5.01)];
    const list = archPowerupList({ segments, totalKm: 20, arches: null, start: null, random: true });
    expect(list).toHaveLength(1);
  });

  it("zet een boogpowerup die we niet kunnen plaatsen bij de verdeling, zonder kans", () => {
    const zrl = ['arch_powerup="0,3"', 'powerup_percent="0,34,1,33,5,33"'];
    const odds = powerupOddsWithArches(powerupChances(zrl)!, archPowerups(zrl), []);
    expect(odds.map((o) => [o.powerup, o.percent])).toEqual([
      ["feather", 34],
      ["draft", 33],
      ["aero", 33],
      ["xp", null],
    ]);
    const placed = [{ km: 5, label: "ronde Jarvis", reward: "xp" as const }];
    expect(powerupOddsWithArches(powerupChances(zrl)!, archPowerups(zrl), placed)).toHaveLength(3);
  });
});
