import { describe, expect, it } from "vitest";
import { buildZwiftGopherPayload } from "@/lib/ttt/zwiftgopher";
import { DEFAULT_TTT_SETTINGS } from "@/lib/ttt/types";
import { wtrlTttPower } from "@/lib/ttt/wtrl-power";

const teamIdByRef = new Map([
  ["TRC1", "team-b1"],
  ["TRC2", "team-b2"],
]);

describe("WTRL-waarden als invoer voor de TTT-planner", () => {
  it("leidt gewicht en zMAP in watt af uit zFTP", () => {
    const power = wtrlTttPower(
      [{ trc_ref: "TRC1", zwift_id: "111", zftp_w: 280, zftp_wkg: "3.50", zmap_wkg: "4.25" }],
      teamIdByRef,
    ).get("111");

    expect(power).toEqual({
      ftpWatts: 280,
      weightKg: 80,
      power300Watts: 340,
      teamIds: ["team-b1"],
    });
  });

  it("laat leeg wat niet af te leiden is", () => {
    const power = wtrlTttPower(
      [{ trc_ref: "TRC1", zwift_id: "111", zftp_w: 280, zftp_wkg: null, zmap_wkg: 4.25 }],
      teamIdByRef,
    ).get("111");

    expect(power).toMatchObject({ ftpWatts: 280, weightKg: null, power300Watts: null });
  });

  it("verzamelt de teams van een renner die in twee WTRL-teams staat", () => {
    const power = wtrlTttPower(
      [
        { trc_ref: "TRC1", zwift_id: "111", zftp_w: null, zftp_wkg: null, zmap_wkg: null },
        { trc_ref: "TRC2", zwift_id: "111", zftp_w: 250, zftp_wkg: 3.2, zmap_wkg: 4 },
        { trc_ref: "TRC9", zwift_id: "111", zftp_w: 999, zftp_wkg: 9, zmap_wkg: 9 },
      ],
      teamIdByRef,
    ).get("111");

    expect(power?.teamIds).toEqual(["team-b1", "team-b2"]);
    expect(power?.ftpWatts).toBe(250);
    expect(power?.weightKg).toBe(78.1);
  });
});

describe("renner zonder account in de ZwiftGopher-aanvraag", () => {
  const base = {
    profileId: null,
    isManual: false,
    heightCm: null,
    pullWatts: null,
    pullDurationSeconds: 30,
    role: null,
    notes: null,
  };

  it("gaat met zijn Zwift-ID mee, zonder lengte", () => {
    const payload = buildZwiftGopherPayload({
      name: "Plan",
      eventId: null,
      parentTeamId: "team-b",
      teamId: "team-b1",
      settings: DEFAULT_TTT_SETTINGS,
      riders: [
        { ...base, zwiftId: "111", name: "Anna", ftpWatts: 280, weightKg: 80, power300Watts: 340, displayOrder: 0 },
        { ...base, zwiftId: "222", name: "Bram", ftpWatts: null, weightKg: null, power300Watts: null, displayOrder: 1 },
      ],
    });

    expect(payload.riders).toEqual([111, 222]);
    expect(payload.custom_riders).toBeUndefined();
    expect(payload.rider_overrides).toEqual({
      "111": { name: "Anna", ftp: 280, weight: 80, power_300_watts: 340 },
      "222": { name: "Bram" },
    });
  });
});
