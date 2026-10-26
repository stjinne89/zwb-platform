import { buildBoard, seedFor, type FieldRider } from "@/lib/bokaal/odds";
import { bonusQuestion } from "@/lib/bokaal/settle";
import type { BoardRace, PlacedBet } from "@/components/bokaal/board";

// voorZpWelBokaal met voorbeelddata: de startlijsten van HG Cross Meulebeke
// (17 okt 2026) met de CyclingFlash-ratings van 19 okt. Alleen voor
// /ontwerp-voorbeeld?scherm=bokaal.

const slug = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const field = (rows: [string, number | null][]): FieldRider[] => rows.map(([name, rating]) => ({ slug: slug(name), name, rating }));

const DAMES = field([
  ["Lucinda Brand", 1044], ["Ceylin del Carmen Alvarado", 996], ["Fem van Empel", 982], ["Marie Schreiber", 955],
  ["Aniek van Alphen", 949], ["Inge van der Heijden", 935], ["Amandine Fouquenet", 903], ["Leonie Bentveld", 903],
  ["Denise Betsema", 903], ["Annemarie Worst", 865], ["Hélène Clauzel", 849], ["Marion Norbert Riberolle", 841],
  ["Julie Brouwers", 838], ["Lucia Bramati", 832], ["Rebecca Gariboldi", 831], ["Alicia Franck", 818],
  ["Sterre Vervloet", 782], ["Anniek Mos", 753], ["Mia Aseltine", 744], ["Sanne Laurijssen", 724], ["Emily Shields", null],
]);
const HEREN = field([
  ["Michael Vanthourenhout", 942], ["Niels Vandeputte", 936], ["Jente Michels", 904], ["Witse Meeussen", 900],
  ["Gerben Kuypers", 887], ["Felipe Orts Lloret", 884], ["Joran Wyseure", 877], ["Cameron Mason", 874], ["Ryan Kamp", 874],
  ["Toon Vandebosch", 831], ["Joris Nieuwenhuis", 822], ["Giel Lejeune", 819], ["Anton Ferdinande", 818],
  ["Victor Van De Putte", 817], ["Kay De Bruyckere", 817], ["Mees Hendrikx", 805], ["Viktor Vandenberghe", 803],
  ["Yorben Lauryssen", 777], ["Ward Huybs", 769], ["Laurens Sweeck", 754], ["Filippo Cecchi", null],
]);

export const BOKAAL_NOW = Date.parse("2026-10-16T12:00:00Z");

export const BOKAAL_RACES: BoardRace[] = [
  {
    id: "00000000-0000-4000-8000-0000000000a1", category: "w", eventName: "HG Cross Meulebeke", location: "Tielt",
    startsAt: "2026-10-17T11:45:00Z", board: buildBoard(DAMES, { seed: seedFor("hg-cross-meulebeke-we-2026") }),
    bonus: bonusQuestion("marge", "w"),
  },
  {
    id: "00000000-0000-4000-8000-0000000000a2", category: "m", eventName: "HG Cross Meulebeke", location: "Tielt",
    startsAt: "2026-10-17T13:00:00Z", board: buildBoard(HEREN, { seed: seedFor("hg-cross-meulebeke-2026") }),
    bonus: bonusQuestion("jong", "m"),
  },
];

const schreiber = BOKAAL_RACES[0].board.riders.find((r) => r.slug === "marie-schreiber")!;
export const BOKAAL_PLACED: PlacedBet[] = [
  {
    id: "00000000-0000-4000-8000-0000000000b1", raceId: BOKAAL_RACES[0].id, market: "win", rider: schreiber.slug,
    riderName: schreiber.name, vs: null, vsName: null, odds: schreiber.win ?? 20, stake: 2,
  },
];
export const BOKAAL_ANSWERS: Record<string, number> = { [BOKAAL_RACES[0].id]: 1 };
