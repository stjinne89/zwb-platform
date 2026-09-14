import { describe, expect, it } from "vitest";
import { parseOmniumResults } from "@/lib/omnium/parse-results";
import { defaultModeFor, nameKeyOf, scoreParsedRows } from "@/lib/omnium/import";

function score(input: string, mode: Parameters<typeof parseOmniumResults>[1]["mode"], discipline: Parameters<typeof scoreParsedRows>[1]["discipline"]) {
  const { rows } = parseOmniumResults(input, { mode });
  return scoreParsedRows(rows, { discipline, mode });
}

describe("plakken tot punten", () => {
  it("scoort een geplakte scratch-uitslag per league", () => {
    const results = score(
      `1\tAnna\tRUBY\t25:01
2\tBert\tRUBY\t25:03
3\tCarla\tGOLD\t25:05`,
      "finish",
      "scratch",
    );
    const byName = new Map(results.map((row) => [row.riderId, row]));
    expect(byName.get(nameKeyOf("Anna"))?.points).toBe(40);
    expect(byName.get(nameKeyOf("Bert"))?.points).toBe(38);
    // Carla is de eerste van haar eigen league, dus ook 40.
    expect(byName.get(nameKeyOf("Carla"))?.points).toBe(40);
  });

  it("scoort de sprint quali op segmenttijd, niet op regelvolgorde", () => {
    const results = score(
      `Traag\tRUBY\t1:02
Snel\tRUBY\t0:58`,
      "segment",
      "sprint",
    );
    const byName = new Map(results.map((row) => [row.riderId, row]));
    expect(byName.get(nameKeyOf("Snel"))?.points).toBe(20);
    expect(byName.get(nameKeyOf("Traag"))?.points).toBe(18);
  });

  it("verdeelt de FAL-punten zelf bij een gedetailleerde crit", () => {
    const results = score(
      `SPRINT 1
Anna\tRUBY
Bert\tRUBY
FINISH
Bert\tRUBY
Anna\tRUBY`,
      "crit_detailed",
      "crit",
    );
    const byName = new Map(results.map((row) => [row.riderId, row]));
    // Anna: sprint 10 + finish 19 = 29. Bert: sprint 9 + finish 20 = 29.
    expect(byName.get(nameKeyOf("Anna"))?.sprintPoints).toBe(10);
    expect(byName.get(nameKeyOf("Anna"))?.finishPoints).toBe(19);
    expect(byName.get(nameKeyOf("Bert"))?.points).toBe(29);
  });

  it("houdt de sprintblokken in nummervolgorde", () => {
    const results = score(
      `SPRINT 2
Anna\tRUBY
SPRINT 1
Bert\tRUBY
FINISH
Anna\tRUBY
Bert\tRUBY`,
      "crit_detailed",
      "crit",
    );
    const byName = new Map(results.map((row) => [row.riderId, row]));
    // Allebei winnen ze één sprint, dus allebei 10 sprintpunten.
    expect(byName.get(nameKeyOf("Anna"))?.sprintPoints).toBe(10);
    expect(byName.get(nameKeyOf("Bert"))?.sprintPoints).toBe(10);
  });

  it("neemt kant-en-klare critpunten over", () => {
    const results = score("Anna\tRUBY\t27", "crit_points", "crit");
    expect(results[0].points).toBe(27);
  });

  it("kiest de juiste invoervorm per onderdeel", () => {
    expect(defaultModeFor("prologue")).toBe("finish");
    expect(defaultModeFor("scratch")).toBe("finish");
    expect(defaultModeFor("sprint")).toBe("segment");
    expect(defaultModeFor("crit")).toBe("crit_points");
  });

  it("voegt dezelfde renner samen op genormaliseerde naam", () => {
    expect(nameKeyOf("Jeroen Janssen [ZWB]")).toBe(nameKeyOf("jeroen  janssen"));
  });
});
