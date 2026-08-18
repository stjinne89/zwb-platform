import type { Discipline } from "./component-types";

// Strava geeft geen fietstype terug dat we kunnen vertrouwen: `frame_type` is
// vaak leeg en kent alleen road/mtb/cross/tt. Wat leden wél invullen is de
// naam ("Crossmonster", "Zwiftmonster"), dus die gokken we uit.
//
// Bewust een gok en geen waarheid: het lid corrigeert het in Mijn garage, en
// een correctie overleeft elke volgende sync.

// Alleen een woordgrens aan de vóórkant. Leden plakken hun type aan een naam
// vast — "Zwiftmonster", "Crossmonster" — en met een sluitende \b matcht daar
// niets van. Losse afkortingen houden wél beide grenzen, anders vangt "cx"
// zomaar een willekeurig woord.
const PATTERNS: Array<{ discipline: Discipline; re: RegExp }> = [
  {
    discipline: "indoor",
    re: /\b(zwift|indoor|trainer|turbo|kickr|tacx|rollerbank|binnenfiets|smart\s?bike|elite\s?direto)|\b(neo)\b/i,
  },
  {
    discipline: "mtb",
    re: /\b(mtb|mountainbike|mountain|hardtail|fully|full\s?sus|enduro|trail|downhill|29er)|\b(dh|xc)\b/i,
  },
  {
    discipline: "gravel",
    re: /\b(gravel|grinduro|allroad|all\s?road|adventure|cyclocross|veldrit|cross)|\b(cx)\b/i,
  },
  {
    discipline: "stad",
    re: /\b(stadsfiets|city|commuter|woon\s?werk|transportfiets|omafiets|bakfiets|forens)/i,
  },
];

/**
 * Raadt het fietstype uit naam en merk/model. Valt terug op "race", want dat is
 * bij een wielerclub veruit de grootste groep.
 */
export function guessDiscipline(
  name: string | null | undefined,
  brandModel?: string | null,
): Discipline {
  const haystack = `${name ?? ""} ${brandModel ?? ""}`;
  for (const { discipline, re } of PATTERNS) {
    if (re.test(haystack)) return discipline;
  }
  return "race";
}
