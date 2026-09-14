// Regressietest op een échte editie: ZWB Omnium Race 7 (seizoen 2025/26).
//
// De uitslagen hieronder zijn overgenomen uit de Drive-sheet van die editie,
// in de vorm waarin ZwiftPower ze geeft: één absolute tijd voor de leider en
// daarna verschillen in duizendsten. De verwachte punten komen uit de GC-tab van
// diezelfde sheet, die vorig seizoen met de hand in Google Sheets is gescoord.
//
// Waarom dit er staat: dit is het enige materiaal waarmee de puntenmotor tegen
// een uitkomst uit de praktijk te leggen valt. Het heeft in één keer drie dingen
// gevonden die anders op 11 oktober waren gebeurd — zie PLAN.md, ronde
// "Proefdraai op editie 7".
//
// Eén verschil is blijvend en met opzet: Ángel Jiménez en Radlrainer finishten
// in de Scratch met exact dezelfde weergegeven tijd (14:35, +02:21). De oude
// sheet brak dat gelijkspel op regelvolgorde, dit schema geeft ze allebei de
// hoogste punten (tiePolicy "high", vastgelegd in scales.ts).

import { describe, expect, it } from "vitest";
import { parseOmniumResults, type ParseMode } from "@/lib/omnium/parse-results";
import { scoreParsedRows, nameKeyOf } from "@/lib/omnium/import";
import type { Discipline } from "@/lib/omnium/scoring";


const LEAGUE = "DIAMOND-RUBY";

function run(lines: string[], mode: ParseMode, discipline: Discipline) {
  const text = lines.map((line) => `${line}\t${LEAGUE}`).join("\n");
  const parsed = parseOmniumResults(text, { mode, defaultLeague: LEAGUE });
  if (parsed.issues.length) {
    for (const issue of parsed.issues) console.log(`  ! ${issue.reason} — ${issue.raw}`);
  }
  const scored = scoreParsedRows(parsed.rows, { mode, discipline });
  return new Map(scored.map((row) => [row.riderId, row.points]));
}

const prologue = run(
  [
    "Tim Sanders [MTNT]\t9:32",
    "Alex Glenn\t9:52 +20.117s",
    "Martin Coffey\t10:01 +29.448s",
    "Duncan Edwards\t10:08 +36.506s",
    "Tom Obdam [mTNT]\t10:17 +45.431s",
    "Loris van de Kassteele (TI8)\t10:25 +53.217s",
    "Wim Van Cutsem [BikeRepublic]\t10:30 +58.711s",
    "Rick van Bergen [ZWB]\t10:34 +01:01",
    "Louis Prins (SqAzBi)\t10:39 +01:06",
    "Jos Leijten\t10:40 +01:08",
    "S Adyns (ABR)\t11:35 +02:02",
    "Rüdiger Grosch [T:f]\t11:51 +02:18",
    "Ángel Jiménez [Dragons]\t12:23 +02:50",
    "Radlrainer [Dragons]\t12:47 +03:15",
  ],
  "finish",
  "prologue",
);

const sprint = run(
  [
    "Thomas Nilsson [SZ]\t1:32",
    "Janek Czapliński (ZTPL.CC eRT)\t1:35 +3.395s",
    "Tom Obdam [mTNT]\t1:40 +8.314s",
    "Loris van de Kassteele (TI8)\t1:43 +10.598s",
    "Duncan Edwards\t1:45 +12.529s",
    "Martin Coffey\t1:45 +12.772s",
    "Louis Prins (SqAzBi)\t1:45 +13.069s",
    "Tim Sanders [MTNT]\t1:46 +13.563s",
    "Jos Leijten\t1:50 +18.365s",
    "Jake Johnson [DIRT]\t1:52 +20.058s",
  ],
  "segment",
  "sprint",
);

const scratch = run(
  [
    "Janek Czapliński (ZTPL.CC eRT)\t12:13",
    "Tim Sanders [MTNT]\t12:18 +4.696s",
    "Martin Coffey\t12:27 +13.297s",
    "Alex Glenn\t12:28 +15.112s",
    "Duncan Edwards\t12:29 +15.499s",
    "Jake Johnson [DIRT]\t12:58 +44.725s",
    "Louis Prins (SqAzBi)\t13:08 +55.111s",
    "Loris van de Kassteele (TI8)\t13:30 +01:16",
    "S Adyns (ABR)\t13:30 +01:17",
    "Wim Van Cutsem [BikeRepublic]\t14:19 +02:05",
    "Tom Obdam [mTNT]\t14:27 +02:13",
    "Ángel Jiménez [Dragons]\t14:35 +02:21",
    "Radlrainer [Dragons]\t14:35 +02:21",
  ],
  "finish",
  "scratch",
);

// De crit van 2025/26 was een gewone race met 20-19-18…; dat is precies de
// critFinish-schaal, dus één finishblok zonder tussensprints.
const critLines = [
  "Thomas Nilsson [SZ]\t22:38",
  "Janek Czapliński (ZTPL.CC eRT)\t22:38 +0.370s",
  "Jake Johnson [DIRT]\t22:42 +4.126s",
  "Tom Obdam [mTNT]\t22:42 +4.187s",
  "Loris van de Kassteele (TI8)\t22:42 +4.321s",
  "Martin Coffey\t22:42 +4.450s",
  "Alex Glenn\t22:42 +4.467s",
  "Daniel O'Keeffe\t22:42 +4.468s", // geen deelnemer aan het Omnium
  "Louis Prins (SqAzBi)\t22:42 +4.573s",
  "Ángel Jiménez [Dragons]\t22:42 +4.745s",
  "S Adyns (ABR)\t22:46 +8.003s",
  "Duncan Edwards\t22:46 +8.264s",
  "Tim Sanders [MTNT]\t22:46 +8.321s",
  "Wim Van Cutsem [BikeRepublic]\t22:58 +19.881s",
  "Jos Leijten\t23:28 +50.580s",
  "Radlrainer [Dragons]\t23:29 +51.127s",
  "Fredrik Ludvigsson\t25:22 +02:44", // geen deelnemer aan het Omnium
];
const critMetGasten = run(critLines, "crit_detailed", "crit");
const critZonderGasten = run(
  critLines.filter((line) => !/O'Keeffe|Ludvigsson/.test(line)),
  "crit_detailed",
  "crit",
);

// De GC-tab van de sheet: prologue, sprint, scratch, crit, totaal.
const sheet: Record<string, [number, number, number, number, number]> = {
  "Martin Coffey": [36, 10, 36, 15, 97],
  "Tim Sanders": [40, 6, 38, 9, 93],
  "Duncan Edwards": [34, 12, 32, 10, 88],
  "Alex Glenn": [38, 0, 34, 14, 86],
  "Loris van de Kassteele": [30, 14, 26, 16, 86],
  "Tom Obdam": [32, 16, 20, 17, 85],
  "Janek Czapliński": [0, 18, 40, 19, 77],
  "Louis Prins": [24, 8, 28, 13, 73],
  "Wim Van Cutsem": [28, 0, 22, 8, 58],
  "S Adyns": [20, 0, 24, 11, 55],
  "Jake Johnson": [0, 2, 30, 18, 50],
  "Ángel Jiménez": [16, 0, 18, 12, 46],
  "Thomas Nilsson": [0, 20, 0, 20, 40],
  "Radlrainer": [14, 0, 16, 6, 36],
  "Jos Leijten": [22, 4, 0, 7, 33],
  "Rick van Bergen": [26, 0, 0, 0, 26],
  "Rüdiger Grosch": [18, 0, 0, 0, 18],
};

function points(map: Map<string, number>, name: string): number {
  return map.get(nameKeyOf(name)) ?? 0;
}




describe("Omnium editie 7 (2025/26), league DIAMOND-RUBY", () => {
  it("levert per renner dezelfde punten op als de handmatige sheet", () => {
    for (const [name, expected] of Object.entries(sheet)) {
      const got = [
        points(prologue, name),
        points(sprint, name),
        points(scratch, name),
        points(critZonderGasten, name),
      ];
      // De enige afwijking is het gelijkspel in de Scratch; zie de kop.
      const scratchExpected = name === "Radlrainer" ? 18 : expected[2];
      expect([name, got[0]]).toEqual([name, expected[0]]);
      expect([name, got[1]]).toEqual([name, expected[1]]);
      expect([name, got[2]]).toEqual([name, scratchExpected]);
      expect([name, got[3]]).toEqual([name, expected[3]]);
    }
  });

  it("laat een niet-ingeschreven rijder de punten van iedereen eronder verschuiven", () => {
    // Twee gasten reden de crit mee. In de oude sheet werden ze er vóór het
    // scoren uit gehaald; de import doet dat (nog) niet, en dan zakt iedereen
    // onder hen een plaats. Dit legt dat gedrag vast tot het is opgelost.
    expect(points(critMetGasten, "Louis Prins")).toBe(12);
    expect(points(critZonderGasten, "Louis Prins")).toBe(13);
  });

  it("houdt renners in dezelfde seconde uit elkaar op het verschil", () => {
    // Acht renners op "22:42"; tussen Alex Glenn en de gast zat één duizendste.
    expect(points(critZonderGasten, "Martin Coffey")).toBe(15);
    expect(points(critZonderGasten, "Alex Glenn")).toBe(14);
    expect(points(critZonderGasten, "Louis Prins")).toBe(13);
  });
});
