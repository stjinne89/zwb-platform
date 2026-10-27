import { describe, expect, it } from "vitest";
import { archPowerups, startingPowerup } from "@/lib/zwift/powerups";
import { archPowerupList } from "@/lib/race-briefing/arches";
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
});
