import { describe, expect, it } from "vitest";
import { parseOpponentSelection } from "@/lib/club-ladder/advice-selection";
import { parsePowerScope, withPowerScope } from "@/lib/teams/power-scope";

describe("parsePowerScope", () => {
  it("is alles, behalve een expliciete indoor", () => {
    expect(parsePowerScope("indoor")).toBe("indoor");
    expect(parsePowerScope("all")).toBe("all");
    expect(parsePowerScope(undefined)).toBe("all");
    expect(parsePowerScope("buiten")).toBe("all");
  });
});

describe("withPowerScope", () => {
  const row = {
    profile_id: "p1",
    ftp_watts: 300,
    watts_5m: 380,
    wkg_5m: 5.07,
    rider_type: "puncher",
    indoor_profile: { watts_5m: 350, wkg_5m: 4.67, rider_type: "tter" },
  };

  it("laat de rij bij alles staan", () => {
    expect(withPowerScope(row, "all")).toBe(row);
  });

  it("wisselt de duren en het type voor indoor, FTP blijft", () => {
    const indoor = withPowerScope(row, "indoor");
    expect(indoor.watts_5m).toBe(350);
    expect(indoor.wkg_5m).toBe(4.67);
    expect(indoor.rider_type).toBe("tter");
    expect(indoor.ftp_watts).toBe(300);
  });

  it("geeft lege duren zonder indoorcurve, niet de volledige curve", () => {
    const indoor = withPowerScope({ ...row, indoor_profile: null }, "indoor");
    expect(indoor.watts_5m).toBeNull();
    expect(indoor.wkg_5m).toBeNull();
    expect(indoor.rider_type).toBe("unknown");
  });

  it("voegt geen kolommen toe die de rij niet had", () => {
    const indoor = withPowerScope({ profile_id: "p1", wkg_5m: 5, indoor_profile: { wkg_5m: 4, watts_5m: 300 } }, "indoor");
    expect(indoor).not.toHaveProperty("watts_5m");
    expect(indoor.wkg_5m).toBe(4);
  });
});

describe("parseOpponentSelection", () => {
  it("leest Zwift-ID's, zonder dubbelen of rommel", () => {
    expect(parseOpponentSelection("123,456,123,abc,-5,0, 789")).toEqual([123, 456, 789]);
    expect(parseOpponentSelection(["1,2", "3"])).toEqual([1, 2, 3]);
    expect(parseOpponentSelection(undefined)).toEqual([]);
  });
});
