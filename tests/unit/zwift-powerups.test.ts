import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { zwiftEventRules } from "@/lib/events/zwift-route";
import type { ZwiftEventApiRow } from "@/lib/events/external-scan";
import { eventPowerups, powerupChances } from "@/lib/zwift/powerups";
import { powerupsFromTags } from "@/lib/race-briefing/rules";

const EVENTS = JSON.parse(
  readFileSync(path.join(__dirname, "..", "fixtures", "zwift", "event-rules.json"), "utf8"),
) as ZwiftEventApiRow[];

function powerupsOf(name: string) {
  const row = EVENTS.find((event) => event.name?.includes(name));
  if (!row) throw new Error(name);
  const rules = zwiftEventRules(row);
  return eventPowerups({ eventType: rules.eventType, rules: rules.rules, tags: rules.tags });
}

describe("powerups van een Zwift-event", () => {
  it("leest de verdeling uit powerup_percent", () => {
    expect(powerupsOf("Ocean Lava")).toEqual({
      kind: "custom",
      chances: [
        { powerup: "feather", percent: 50 },
        { powerup: "anvil", percent: 50 },
      ],
    });
    expect(powerupsOf("BANDWAGON")).toEqual({ kind: "custom", chances: [{ powerup: "aero", percent: 100 }] });
  });

  it("NO_POWERUPS betekent geen", () => {
    expect(powerupsOf("Makuri Pretzel")).toEqual({ kind: "none" });
    expect(powerupsOf("Zwift TT")).toEqual({ kind: "none" });
  });

  it("zonder tag deelt een race de standaardmix uit", () => {
    expect(powerupsOf("Hill Climb")).toEqual({ kind: "standard" });
  });

  it("onbekend blijft onbekend", () => {
    expect(eventPowerups({ eventType: "RACE", rules: null, tags: null })).toBeNull();
    expect(eventPowerups({ eventType: "TEAM_TIME_TRIAL", rules: [], tags: [] })).toBeNull();
  });

  it("zonder slipstream geen draft boost", () => {
    expect(
      eventPowerups({ eventType: "RACE", rules: ["NO_DRAFTING"], tags: ['powerup_percent="0,50,1,50"'] }),
    ).toEqual({ kind: "custom", chances: [{ powerup: "feather", percent: 50 }] });
  });

  it("slaat XP en onbekende nummers over", () => {
    expect(powerupChances(['powerup_percent="2,20,4,40,6,40"'])).toEqual([
      { powerup: "burrito", percent: 40 },
      { powerup: "ghost", percent: 40 },
    ]);
    expect(powerupChances(["ranked"])).toBeNull();
  });

  it("de briefing houdt haar eigen namen", () => {
    expect(powerupsFromTags(['powerup_percent="0,34,1,33,5,33"'])).toEqual([
      { powerup: "veer", percent: 34 },
      { powerup: "draft boost", percent: 33 },
      { powerup: "aerohelm", percent: 33 },
    ]);
  });
});
