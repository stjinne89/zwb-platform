import { describe, expect, it } from "vitest";
import fixture from "../fixtures/ttt/gopher-image-words.json";
import { gopherImageRiders, imageRidersText, type OcrWord } from "@/lib/ttt/gopher-image";
import { parseGopherExport } from "@/lib/ttt/zwiftgopher";

// Herkende woorden van een echte afbeelding uit ZwiftGopher (12 oktober,
// herkend op 2048 px met tesseract.js), met verzonnen namen. Het sokje voor de
// naam kwam terug als "&", "J)" en "JF"; bij de gele sok niets.
const lines = fixture.lines as OcrWord[][];

describe("gopherImageRiders", () => {
  it("leest naam, kopbeurt-watts, -duur en IF op de positie van de kolomkop", () => {
    expect(gopherImageRiders(lines, fixture.width)).toEqual([
      { name: "Anna Eenhoorn [ZWB] [ZWB Bdev]", pullWatts: 330, pullSeconds: 60, intensityFactor: 102 },
      { name: "Bram Tweelink [ZWB] [ZWB Bdev]", pullWatts: 310, pullSeconds: 30, intensityFactor: 102 },
      { name: "Cas Drieman(ZWB) [BON] [ZWB Bdev]", pullWatts: 320, pullSeconds: 30, intensityFactor: 104 },
      { name: "Dirk Vierkant (ZWB) [ZWB Bdev]", pullWatts: 300, pullSeconds: 30, intensityFactor: 101 },
      { name: "Evi Vijfhuis [ZWB Bdev]", pullWatts: 290, pullSeconds: 30, intensityFactor: 105 },
    ]);
  });

  it("houdt de voornaam als het sokje eraan vastgeplakt is", () => {
    const [header, row] = lines;
    const merged = [
      row[0],
      { text: "&Anna", x0: 77, x1: 202 },
      ...row.slice(3),
    ];
    expect(gopherImageRiders([header, merged], fixture.width)[0].name).toBe(
      "Anna Eenhoorn [ZWB] [ZWB Bdev]",
    );
  });

  it("geeft niets zonder kopregel: dan is niet zeker welk getal de kopbeurt is", () => {
    expect(gopherImageRiders(lines.slice(1), fixture.width)).toEqual([]);
  });

  it("vindt de kolommen ook als er een kolom bij komt", () => {
    // Een extra kolom tussen Duration en Pull %, zoals Show Pull Speed.
    const shift = (line: OcrWord[]) =>
      line.flatMap((word) =>
        word.x0 > 1290 ? [{ ...word, x0: word.x0 + 150, x1: word.x1 + 150 }] : [word],
      );
    const header = [...shift(lines[0]), { text: "Speed", x0: 1320, x1: 1420 }];
    const row = [...shift(lines[1]), { text: "44.6", x0: 1340, x1: 1400 }];
    expect(gopherImageRiders([header, row], 2200)).toEqual([
      { name: "Anna Eenhoorn [ZWB] [ZWB Bdev]", pullWatts: 330, pullSeconds: 60, intensityFactor: 102 },
    ]);
  });
});

describe("imageRidersText", () => {
  it("gaat door de tekstimport, met IF en zonder teamtags", () => {
    const text = imageRidersText(gopherImageRiders(lines, fixture.width));
    const plan = parseGopherExport(text);
    expect(plan.format).toBe("text");
    expect(plan.riders.map((r) => [r.name, r.pullWatts, r.pullSeconds, r.intensityFactor])).toEqual([
      ["Anna Eenhoorn", 330, 60, 102],
      ["Bram Tweelink", 310, 30, 102],
      ["Cas Drieman", 320, 30, 104],
      ["Dirk Vierkant", 300, 30, 101],
      ["Evi Vijfhuis", 290, 30, 105],
    ]);
  });

  it("leest een kleur in de vierde kolom niet als IF", () => {
    expect(parseGopherExport("Koen\t317\t30\t#ff6600").riders[0].intensityFactor).toBeNull();
  });
});
