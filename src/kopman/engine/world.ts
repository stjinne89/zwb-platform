// The real-world part of Kopman: climbs and sectors that exist, under races and
// teams that do not. Lengths and gradients are rounded from common sources
// (docs/kopman.md); a climb with several approaches uses the one named here.
import type { Climb, RaceDef, Sector, TeamDef } from "./types";

export const CLIMBS: Climb[] = [
  { id: "oude-kwaremont", name: "Oude Kwaremont", country: "BEL", km: 2.2, pct: 4.0, surface: "kasseien" },
  { id: "paterberg", name: "Paterberg", country: "BEL", km: 0.4, pct: 12.9, surface: "kasseien" },
  { id: "koppenberg", name: "Koppenberg", country: "BEL", km: 0.6, pct: 11.6, surface: "kasseien" },
  { id: "taaienberg", name: "Taaienberg", country: "BEL", km: 0.8, pct: 6.6, surface: "kasseien" },
  { id: "muur-geraardsbergen", name: "Muur van Geraardsbergen", country: "BEL", km: 1.1, pct: 9.3, surface: "kasseien" },
  { id: "bosberg", name: "Bosberg", country: "BEL", km: 1.0, pct: 5.8, surface: "kasseien" },
  { id: "kemmelberg", name: "Kemmelberg (Belvédère)", country: "BEL", km: 0.5, pct: 11.8, surface: "kasseien" },
  { id: "cauberg", name: "Cauberg", country: "NED", km: 1.2, pct: 5.8 },
  { id: "mur-de-huy", name: "Mur de Huy", country: "BEL", km: 1.3, pct: 9.6 },
  { id: "la-redoute", name: "Côte de La Redoute", country: "BEL", km: 1.6, pct: 9.5 },
  { id: "roche-aux-faucons", name: "Côte de la Roche-aux-Faucons", country: "BEL", km: 1.3, pct: 11.0 },
  { id: "cipressa", name: "Cipressa", country: "ITA", km: 5.6, pct: 4.1 },
  { id: "poggio", name: "Poggio di Sanremo", country: "ITA", km: 3.7, pct: 3.7 },
  { id: "santa-caterina", name: "Via Santa Caterina", country: "ITA", km: 0.5, pct: 9.0 },
  { id: "ghisallo", name: "Madonna del Ghisallo", country: "ITA", km: 8.6, pct: 6.2 },
  { id: "san-fermo", name: "San Fermo della Battaglia", country: "ITA", km: 2.7, pct: 7.2 },
  { id: "stelvio", name: "Passo dello Stelvio (Prato)", country: "ITA", km: 24.3, pct: 7.4 },
  { id: "mortirolo", name: "Passo del Mortirolo (Mazzo)", country: "ITA", km: 12.4, pct: 10.5 },
  { id: "ventoux", name: "Mont Ventoux (Bédoin)", country: "FRA", km: 21.5, pct: 7.5 },
  { id: "galibier", name: "Col du Galibier (Valloire)", country: "FRA", km: 18.1, pct: 6.9 },
  { id: "alpe-dhuez", name: "Alpe d'Huez", country: "FRA", km: 13.8, pct: 8.1 },
  { id: "angliru", name: "Alto de l'Angliru", country: "ESP", km: 12.5, pct: 10.1 },
];

export const SECTORS: Sector[] = [
  { id: "paddestraat", name: "Paddestraat", country: "BEL", km: 2.3, surface: "kasseien" },
  { id: "arenberg", name: "Trouée d'Arenberg", country: "FRA", km: 2.3, surface: "kasseien" },
  { id: "mons-en-pevele", name: "Mons-en-Pévèle", country: "FRA", km: 3.0, surface: "kasseien" },
  { id: "carrefour-arbre", name: "Carrefour de l'Arbre", country: "FRA", km: 2.1, surface: "kasseien" },
  { id: "monte-sante-marie", name: "Monte Sante Marie", country: "ITA", km: 11.5, surface: "grind" },
];

const v = (km: number) => ({ kind: "vlak" as const, km });
const k = (climb: string) => ({ kind: "klim" as const, climb });
const d = (km: number, pct: number) => ({ kind: "daal" as const, km, pct });
const s = (sector: string) => ({ kind: "sector" as const, sector });

/**
 * The season: fictional races in the order of the real one, shortened so a race
 * plays in a few minutes. Monuments give the biggest rewards.
 */
export const CALENDAR: RaceDef[] = [
  { id: "openingsomloop", name: "Openingsomloop", country: "BEL", kind: "klassieker", items: [v(30), k("taaienberg"), v(12), s("paddestraat"), v(10), k("muur-geraardsbergen"), v(6), k("bosberg"), v(12)] },
  { id: "grindtrofee", name: "Grindtrofee van Toscane", country: "ITA", kind: "klassieker", items: [v(25), s("monte-sante-marie"), v(28), k("santa-caterina"), v(0.4)] },
  { id: "riviera", name: "Lenteklassieker van de Rivièra", country: "ITA", kind: "monument", items: [v(70), k("cipressa"), d(4.5, 5), v(8), k("poggio"), d(3.4, 4), v(2.5)] },
  { id: "westhoekprijs", name: "Westhoekprijs", country: "BEL", kind: "klassieker", items: [v(40), k("kemmelberg"), d(1.2, 5), v(15), k("kemmelberg"), d(1.2, 5), v(18)] },
  { id: "kwaremont", name: "Kwaremontklassieker", country: "BEL", kind: "monument", items: [v(30), k("koppenberg"), v(8), k("taaienberg"), v(10), k("oude-kwaremont"), v(3), k("paterberg"), v(10), k("oude-kwaremont"), v(3), k("paterberg"), v(13)] },
  { id: "noorderkasseien", name: "Kasseienklassieker van het Noorden", country: "FRA", kind: "monument", items: [v(30), s("arenberg"), v(20), s("mons-en-pevele"), v(15), s("carrefour-arbre"), v(14)] },
  { id: "limburgprijs", name: "Limburgse Heuvelprijs", country: "NED", kind: "klassieker", items: [v(35), k("cauberg"), d(1.5, 4), v(15), k("cauberg"), v(1.8)] },
  { id: "pijl-van-hoei", name: "Pijl van Hoei", country: "BEL", kind: "klassieker", items: [v(40), k("mur-de-huy"), d(3, 4), v(20), k("mur-de-huy")] },
  { id: "ourthe", name: "Klassieker van de Ourthe", country: "BEL", kind: "monument", items: [v(40), k("la-redoute"), d(2.5, 5), v(20), k("roche-aux-faucons"), d(2.5, 5), v(13)] },
  { id: "lombardije-bergrit", name: "Bergrit van Lombardije", country: "ITA", kind: "rit", items: [v(20), k("stelvio"), d(25, 6.5), v(20), k("mortirolo"), d(12, 8), v(6)] },
  { id: "polderchrono", name: "Polderchrono", country: "NED", kind: "tijdrit", items: [v(32)] },
  { id: "kustprijs", name: "Grote Prijs van de Kust", country: "BEL", kind: "klassieker", items: [v(90)] },
  { id: "provence-bergrit", name: "Bergrit van de Provence", country: "FRA", kind: "rit", items: [v(40), k("ventoux")] },
  { id: "alpenrit", name: "Koninginnenrit van de Alpen", country: "FRA", kind: "rit", items: [v(20), k("galibier"), d(30, 4.2), v(15), k("alpe-dhuez")] },
  { id: "asturie-bergrit", name: "Bergrit van Asturië", country: "ESP", kind: "rit", items: [v(50), k("angliru")] },
  { id: "herfstklassieker", name: "Herfstklassieker van Como", country: "ITA", kind: "monument", items: [v(40), k("ghisallo"), d(8, 5.5), v(20), k("san-fermo"), d(2.5, 6), v(4)] },
];

export const PLAYER_COLOR = "#ffc53d";

export const TEAM_NAMES: Omit<TeamDef, "riders">[] = [
  { id: "zvk", name: "Zeevalk Cycling", short: "ZVK", color: "#2f8fb5" },
  { id: "mbl", name: "Montagna Blu", short: "MBL", color: "#4f6bf0" },
  { id: "hps", name: "Hagedoorn-Polderstaal", short: "HPS", color: "#e0523f" },
  { id: "kwr", name: "Kustwind Racing", short: "KWR", color: "#1fb59a" },
  { id: "rvp", name: "Rotsvast Pro", short: "RVP", color: "#a35ad6" },
  { id: "sal", name: "Sierra Alta", short: "SAL", color: "#ee7a2d" },
  { id: "nly", name: "Nordlys Cycling", short: "NLY", color: "#8fa3b8" },
  { id: "tpv", name: "Tulpenveld", short: "TPV", color: "#ec5fa4" },
  { id: "adf", name: "Ardennes Forêt", short: "ADF", color: "#3fb565" },
  { id: "dzt", name: "Duinzicht", short: "DZT", color: "#b07d48" },
  { id: "vvd", name: "Velocità Verde", short: "VVD", color: "#95c94a" },
];

export const climbById = new Map(CLIMBS.map((c) => [c.id, c]));
export const sectorById = new Map(SECTORS.map((x) => [x.id, x]));
export const raceById = new Map(CALENDAR.map((r) => [r.id, r]));
