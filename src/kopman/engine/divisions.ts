import type { PackType, TeamDef, Tier } from "./types";

/**
 * The cycling pyramid (docs/kopman-piramide.md): five levels, each with its own
 * peloton and its own calendar of eight races. The top two of a season go up a
 * level, the bottom two go down. The names are made up, so they do not borrow
 * the real ones of the UCI.
 */
export type Division = {
  id: string;
  name: string;
  /** Target rating of the strongest and of the weakest rival team. */
  band: [number, number];
  /** Prize money and season coins, against the top level of the first version. */
  prize: number;
  /** The pack for a win, for the podium and for the top 10. */
  packs: { win: PackType; podium: PackType | null; top10: PackType | null };
  /** The pack for going up, or at the top level for the top two of the season. */
  promotion: PackType;
  /** Packs the shop sells at this level. */
  shop: PackType[];
  /** The equipment the rival teams ride: a full set of this tier, or none. */
  gear: Tier | null;
  /**
   * How the rivals race on the board (since 2026-11-12): extra kracht for their
   * kopmen, attacks per team per race, whether one chases your kopman's attack,
   * the chance per sector of a dirty trick against you, and how many of the
   * strongest teams also start a diamond rider.
   */
  rivals: { xp: number; attacks: number; chase: boolean; trick: number; diamonds: number };
  /** Ids from `RACES` (world.ts), in calendar order. */
  races: string[];
  teams: Omit<TeamDef, "riders">[];
};

/** Team colours, the same in every level: the strongest team of each level wears the first. */
const COLORS = ["#2f8fb5", "#4f6bf0", "#e0523f", "#1fb59a", "#a35ad6", "#ee7a2d", "#8fa3b8", "#ec5fa4", "#3fb565", "#b07d48", "#95c94a"];

/** `prefix` keeps the ids unique over all levels; the top level keeps the ids of the first version. */
function teams(prefix: string | null, names: [string, string][]): Omit<TeamDef, "riders">[] {
  const ids = ["zvk", "mbl", "hps", "kwr", "rvp", "sal", "nly", "tpv", "adf", "dzt", "vvd"];
  return names.map(([name, short], i) => ({ id: prefix ? `${prefix}${String(i + 1).padStart(2, "0")}` : ids[i], name, short, color: COLORS[i] }));
}

export const DIVISIONS: Division[] = [
  {
    id: "kermis",
    name: "Kermis",
    band: [56, 51],
    prize: 0.12,
    packs: { win: "brons", podium: "brons", top10: null },
    promotion: "brons",
    shop: ["brons"],
    gear: null,
    rivals: { xp: 0, attacks: 2, chase: false, trick: 0, diamonds: 0 },
    races: ["kermis-vaart", "kempen-dorpsronde", "kasseikermis", "molenprijs", "polderkermis", "dorpsplein", "bosbergkermis", "najaarskermis"],
    teams: teams("k", [["WV De Zwaluw", "ZWA"], ["De Kasseivreters", "KSV"], ["Polderpijl", "PDP"], ["WTC Molenwiek", "MLW"], ["De Dorpsstraat", "DST"], ["Velo Kempenland", "VKL"], ["De Kerktoren", "KTR"], ["Vaartrenners", "VRT"], ["Ploeg Klaproos", "KLP"], ["De Kermisvogels", "KMV"], ["Fietsclub Zuiderwind", "FZW"]]),
  },
  {
    id: "interclub",
    name: "Interclub",
    band: [61, 56],
    prize: 0.22,
    packs: { win: "brons", podium: "brons", top10: null },
    promotion: "brons",
    shop: ["brons"],
    gear: "brons",
    rivals: { xp: 0, attacks: 2, chase: false, trick: 0, diamonds: 0 },
    races: ["vlaamse-velden", "bosbergprijs", "heuvelland", "paddestraatprijs", "clubchrono", "caubergprijs", "taaienbergprijs", "kustomloop"],
    teams: teams("i", [["Heidebloem Cycling", "HBC"], ["Scheldestroom", "SCS"], ["Kempense Pijl", "KPP"], ["Lindeboom", "LDB"], ["Noorderlicht", "NDL"], ["Dijkgraaf", "DKG"], ["Brabantse Wind", "BRW"], ["Meeuw Racing", "MWR"], ["Zuiderkruis", "ZKR"], ["De Hazelaar", "HZL"], ["Rivierland", "RVL"]]),
  },
  {
    id: "continentaal",
    name: "Continentaal",
    band: [67, 62],
    prize: 0.4,
    packs: { win: "zilver", podium: "brons", top10: null },
    promotion: "zilver",
    shop: ["brons", "zilver"],
    gear: "brons",
    rivals: { xp: 1, attacks: 3, chase: true, trick: 0, diamonds: 0 },
    races: ["ardennen-omloop", "pevele", "heuvelpijl", "dijkchrono", "comomeer-rit", "ardense-pijl", "polderprijs", "muurprijs"],
    teams: teams("c", [["Granietberg", "GRB"], ["Atlantica Cycling", "ATC"], ["Valkenhorst", "VKH"], ["Korenaar Pro", "KNA"], ["Oostzee Racing", "OZR"], ["Sneeuwgrens", "SNG"], ["Kalkrots", "KKR"], ["Duinvogel", "DVG"], ["Zilvermeer", "ZVM"], ["Bergwind", "BWD"], ["Heidepoort", "HDP"]]),
  },
  {
    id: "proftour",
    name: "Proftour",
    band: [75, 68],
    prize: 0.65,
    packs: { win: "zilver", podium: "zilver", top10: "brons" },
    promotion: "zilver",
    shop: ["brons", "zilver"],
    gear: "zilver",
    rivals: { xp: 1, attacks: 3, chase: true, trick: 0.05, diamonds: 0 },
    races: ["openingsomloop", "grindtrofee", "westhoekprijs", "limburgprijs", "pijl-van-hoei", "polderchrono", "kustprijs", "provence-bergrit"],
    teams: teams("p", [["Stormvogel Pro", "STV"], ["Lavendel Cycling", "LVD"], ["IJzerberg", "IJB"], ["Zonnedal", "ZND"], ["Hoogland Racing", "HLR"], ["Kastanje Pro", "KST"], ["Toren Racing", "TRR"], ["Golfstroom", "GFS"], ["Heuvelrug", "HVR"], ["Vuurtoren", "VTR"], ["Wilgenhof", "WGH"]]),
  },
  {
    id: "wereldtour",
    name: "Wereldtour",
    band: [86, 76],
    prize: 1,
    packs: { win: "goud", podium: "zilver", top10: "brons" },
    promotion: "diamant",
    shop: ["brons", "zilver"],
    gear: "goud",
    rivals: { xp: 2, attacks: 4, chase: true, trick: 0.08, diamonds: 3 },
    races: ["riviera", "kwaremont", "noorderkasseien", "ourthe", "lombardije-bergrit", "alpenrit", "asturie-bergrit", "herfstklassieker"],
    teams: teams(null, [["Zeevalk Cycling", "ZVK"], ["Montagna Blu", "MBL"], ["Hagedoorn-Polderstaal", "HPS"], ["Kustwind Racing", "KWR"], ["Rotsvast Pro", "RVP"], ["Sierra Alta", "SAL"], ["Nordlys Cycling", "NLY"], ["Tulpenveld", "TPV"], ["Ardennes Forêt", "ADF"], ["Duinzicht", "DZT"], ["Velocità Verde", "VVD"]]),
  },
];

export const TOP_DIVISION = DIVISIONS.length - 1;
/** Races in a season, the same in every level. */
export const SEASON_RACES = 8;
/** Places per season that go up, and that go down. */
export const PROMOTED = 2;
export const RELEGATED = 2;

const raceDivision = new Map(DIVISIONS.flatMap((d, i) => d.races.map((id) => [id, i] as const)));
/** The level a race belongs to; every race belongs to exactly one. */
export function divisionOfRace(raceId: string) {
  const i = raceDivision.get(raceId);
  if (i === undefined) throw new Error(`Koers zonder niveau: ${raceId}`);
  return i;
}
