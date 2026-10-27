import { describe, expect, it } from "vitest";
import {
  buildLadderRiders,
  groupLadderRidersBySex,
  onlyInLadderPool,
  parseLadderRiderSort,
  sortLadderRiders,
  type LadderRiderProfile,
} from "@/lib/club-ladder/riders";

const profiles: LadderRiderProfile[] = [
  { id: "a", event_type_interests: ["ladder"], display_name: "Anna", sex: "vrouw", zwift_id: " 101 ", zrl_category: "B", ftp_watts: 250, weight_kg: "62.5" },
  { id: "b", display_name: "Bram", sex: "man", zwift_id: "202", zrl_category: "A", ftp_watts: 320, weight_kg: 80 },
  { id: "c", display_name: " ", sex: null, zwift_id: "geen", zrl_category: null, ftp_watts: null, weight_kg: null },
];

const riders = buildLadderRiders(
  profiles,
  [
    {
      profile_id: "b",
      ftp_watts: 330,
      ftp_wkg: "4.1",
      wkg_1m: 9.2,
      wkg_5m: "5.3",
      wkg_20m: 4.3,
      rider_type: "puncher",
    },
  ],
  [
    { profile_id: "a", team_id: "t1", team_name: "ZWBeasts" },
    { profile_id: "a", team_id: "t1", team_name: "ZWBeasts" },
    { profile_id: "b", team_id: "t2", team_name: "ZWB Zwiftladies" },
    { profile_id: "a", team_id: "t3", team_name: "Aero Club" },
  ],
  new Map([
    [101, 512],
    [202, 640],
  ]),
  new Set(["c"]),
);

describe("buildLadderRiders", () => {
  it("neemt het vermogensprofiel voor het profiel-FTP en rekent anders W/kg uit gewicht", () => {
    const [anna, bram] = riders;
    expect(bram.ftpWatts).toBe(330);
    expect(bram.ftpWkg).toBe(4.1);
    expect(bram.wkg5m).toBe(5.3);
    expect(bram.riderType).toBe("puncher");
    expect(anna.ftpWatts).toBe(250);
    expect(anna.ftpWkg).toBe(4);
    expect(anna.wkg5m).toBeNull();
  });

  it("koppelt de score via het Zwift-ID", () => {
    expect(riders.map((r) => r.score)).toEqual([512, 640, null]);
    expect(riders[2].zwiftId).toBeNull();
    expect(sortLadderRiders(riders, "score").map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("splitst mannen en vrouwen, wie geen geslacht invulde apart", () => {
    expect(groupLadderRidersBySex(riders).map((g) => [g.sex, g.riders.map((r) => r.id)])).toEqual([
      ["man", ["b"]],
      ["vrouw", ["a"]],
      [null, ["c"]],
    ]);
    expect(groupLadderRidersBySex(riders.slice(0, 1)).map((g) => g.sex)).toEqual(["vrouw"]);
  });

  it("weet wie via de ladderpool in de lijst staat", () => {
    expect(riders.map((r) => r.inPool)).toEqual([false, false, true]);
    expect(riders.map((r) => r.interested)).toEqual([true, false, false]);
    expect(riders.map(onlyInLadderPool)).toEqual([false, false, true]);
    expect(onlyInLadderPool({ ...riders[0], inPool: true })).toBe(false);
    expect(onlyInLadderPool({ ...riders[2], teamIds: ["t1"] })).toBe(false);
  });

  it("toont elk ladderteam één keer, op naam", () => {
    expect(riders[0].teams).toEqual(["Aero Club", "ZWBeasts"]);
    expect(riders[0].teamIds).toEqual(["t1", "t3"]);
    expect(riders[2].teams).toEqual([]);
    expect(riders[2].name).toBe("Onbekend");
  });
});

describe("sortLadderRiders", () => {
  it("zet waardes van hoog naar laag, lege onderaan", () => {
    expect(sortLadderRiders(riders, "wkg").map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(sortLadderRiders(riders, "w5m").map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("zet tekst van A naar Z, lege onderaan", () => {
    expect(sortLadderRiders(riders, "cat").map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(sortLadderRiders(riders, "team").map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(sortLadderRiders(riders, "name").map((r) => r.name)).toEqual(["Anna", "Bram", "Onbekend"]);
  });

  it("zet binnen een categorie de hoogste W/kg bovenaan", () => {
    const sameCat = riders.map((rider) => ({ ...rider, category: "B" }));
    expect(sortLadderRiders(sameCat, "cat").map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("valt terug op W/kg bij een onbekende sortering", () => {
    expect(parseLadderRiderSort("ftp")).toBe("ftp");
    expect(parseLadderRiderSort("weight")).toBe("wkg");
    expect(parseLadderRiderSort(undefined)).toBe("wkg");
  });
});
