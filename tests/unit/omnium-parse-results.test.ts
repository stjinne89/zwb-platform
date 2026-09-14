import { describe, expect, it } from "vitest";
import {
  normalizeLeague,
  parseOmniumResults,
  parseSheetCsv,
  parseTimeToSeconds,
  splitLine,
} from "@/lib/omnium/parse-results";

describe("hulpfuncties", () => {
  it("vult een losse kleur aan tot de gepaarde league", () => {
    expect(normalizeLeague("RUBY")).toBe("DIAMOND-RUBY");
    expect(normalizeLeague("diamond")).toBe("DIAMOND-RUBY");
    expect(normalizeLeague("GOLD-SILVER")).toBe("GOLD-SILVER");
    expect(normalizeLeague("brons")).toBeNull();
  });

  it("leest de gangbare tijdnotaties", () => {
    expect(parseTimeToSeconds("58")).toBe(58);
    expect(parseTimeToSeconds("1:23")).toBe(83);
    expect(parseTimeToSeconds("1:02:03")).toBe(3723);
    expect(parseTimeToSeconds("58,4")).toBeCloseTo(58.4);
    expect(parseTimeToSeconds("geen tijd")).toBeNull();
  });

  it("kiest zelf het scheidingsteken", () => {
    expect(splitLine("1\tJeroen\tRUBY")).toEqual(["1", "Jeroen", "RUBY"]);
    expect(splitLine("1;Jeroen;RUBY")).toEqual(["1", "Jeroen", "RUBY"]);
    expect(splitLine("1   Jeroen   RUBY")).toEqual(["1", "Jeroen", "RUBY"]);
    expect(splitLine("1,Jeroen,RUBY")).toEqual(["1", "Jeroen", "RUBY"]);
  });
});

describe("finish-uitslag", () => {
  it("leest positie, naam, team, league en tijd", () => {
    const { rows, issues } = parseOmniumResults(
      `1\tJeroen Janssen [ZWB]\tRUBY\t18:42
2\tMartin Coffey\tRUBY\t18:45`,
      { mode: "finish" },
    );
    expect(issues).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      position: 1,
      name: "Jeroen Janssen",
      teamName: "ZWB",
      league: "DIAMOND-RUBY",
      timeSeconds: 1122,
      status: "finished",
    });
  });

  it("valt terug op de standaard-league als de regel er geen heeft", () => {
    const { rows } = parseOmniumResults("1\tJeroen Janssen\t18:42", {
      mode: "finish",
      defaultLeague: "GOLD-SILVER",
    });
    expect(rows[0].league).toBe("GOLD-SILVER");
  });

  it("meldt een regel zonder league in plaats van hem stil te laten vallen", () => {
    const { rows, issues } = parseOmniumResults("1\tJeroen Janssen\t18:42", {
      mode: "finish",
    });
    expect(rows).toHaveLength(0);
    expect(issues[0].reason).toContain("Geen league");
  });

  it("herkent DNF, DNS en DSQ", () => {
    const { rows } = parseOmniumResults(
      `1\tAnna\tRUBY\t18:42
DNF\tBert\tRUBY
DNS\tCarla\tRUBY
DSQ\tDirk\tRUBY`,
      { mode: "finish" },
    );
    expect(rows.map((row) => row.status)).toEqual([
      "finished",
      "dnf",
      "dns",
      "dsq",
    ]);
  });

  it("houdt een lang getal apart als Zwift-ID", () => {
    const { rows } = parseOmniumResults("1\t1234567\tJeroen Janssen\tRUBY\t18:42", {
      mode: "finish",
    });
    expect(rows[0].zwiftId).toBe("1234567");
    expect(rows[0].position).toBe(1);
    expect(rows[0].name).toBe("Jeroen Janssen");
  });

  it("slaat lege regels over zonder te klagen", () => {
    const { rows, issues } = parseOmniumResults("\n1\tAnna\tRUBY\t18:42\n\n", {
      mode: "finish",
    });
    expect(rows).toHaveLength(1);
    expect(issues).toHaveLength(0);
  });
});

describe("sprint quali", () => {
  it("leest naam en segmenttijd", () => {
    const { rows } = parseOmniumResults(
      `Anna\tRUBY\t0:58
Bert\tRUBY\t1:01`,
      { mode: "segment" },
    );
    expect(rows[0].segmentSeconds).toBe(58);
    expect(rows[1].segmentSeconds).toBe(61);
  });

  it("meldt een regel zonder tijd", () => {
    const { issues } = parseOmniumResults("Anna\tRUBY", { mode: "segment" });
    expect(issues[0].reason).toContain("segmenttijd");
  });
});

describe("Crit Royale", () => {
  it("leest kant-en-klare punten", () => {
    const { rows } = parseOmniumResults(
      `Anna\tRUBY\t27
Bert\tRUBY\t19`,
      { mode: "crit_points" },
    );
    expect(rows.map((row) => row.points)).toEqual([27, 19]);
  });

  it("verdeelt regels over de sprint- en finishblokken", () => {
    const { rows } = parseOmniumResults(
      `SPRINT 1
Anna\tRUBY
Bert\tRUBY
SPRINT 2
Bert\tRUBY
Anna\tRUBY
FINISH
Anna\tRUBY
Bert\tRUBY`,
      { mode: "crit_detailed" },
    );
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({ block: "sprint 1", name: "Anna", position: 1 });
    expect(rows[1]).toMatchObject({ block: "sprint 1", name: "Bert", position: 2 });
    expect(rows[2]).toMatchObject({ block: "sprint 2", name: "Bert", position: 1 });
    expect(rows[4]).toMatchObject({ block: "finish", name: "Anna", position: 1 });
  });

  it("ziet een renner met 'finish' in zijn naam niet aan voor een kopregel", () => {
    const { rows } = parseOmniumResults(
      `FINISH
Finish Line Freddy\tRUBY\t1`,
      { mode: "crit_detailed" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Finish Line Freddy");
    expect(rows[0].block).toBe("finish");
  });
});

describe("oude Google Sheet", () => {
  const CSV = `Pos,Rider,Team,Cat,Prologue,Sprint,Scratch,Crit,Total
1,Martin Coffey,,DIAMOND-RUBY,36,10,36,15,97
2,Jeroen Janssen (ZWB),,GOLD-SILVER,30,8,30,12,80`;

  it("leest de puntenkolommen per onderdeel", () => {
    const { rows, issues } = parseSheetCsv(CSV);
    expect(issues).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: "Martin Coffey",
      league: "DIAMOND-RUBY",
      total: 97,
    });
    expect(rows[0].points).toEqual({
      prologue: 36,
      sprint: 10,
      scratch: 36,
      crit: 15,
    });
  });

  it("haalt de teamnotatie uit de naam", () => {
    const { rows } = parseSheetCsv(CSV);
    expect(rows[1].name).toBe("Jeroen Janssen");
    expect(rows[1].teamName).toBe("ZWB");
  });

  it("meldt een CSV zonder rennerkolom", () => {
    const { issues } = parseSheetCsv("A,B,C\n1,2,3");
    expect(issues[0].reason).toContain("rennernamen");
  });
});
