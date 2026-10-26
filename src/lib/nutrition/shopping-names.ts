// Van NEVO naar het boodschappenlijstje: een naam zoals in de winkel, de
// afdeling, en waar het handiger is een aantal in plaats van grammen.
//
// Alleen de ingrediënten van de clubrecepten staan hier; een eigen recept met
// iets anders valt terug op de opgeschoonde NEVO-naam en de NEVO-groep. Stuks-
// gewichten zijn het eetbare deel, net als de grammen in NEVO.

export const DEPARTMENTS = [
  "groente_fruit",
  "vlees_vis_vega",
  "zuivel",
  "brood_beleg",
  "houdbaar",
  "diepvries",
  "dranken",
  "voorraad",
  "overig",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  groente_fruit: "Groente en fruit",
  vlees_vis_vega: "Vlees, vis en vega",
  zuivel: "Zuivel en eieren",
  brood_beleg: "Brood en beleg",
  houdbaar: "Houdbaar",
  diepvries: "Diepvries",
  dranken: "Dranken",
  voorraad: "Kruiden en olie",
  overig: "Overig",
};

const GROUP_DEPARTMENTS: Record<string, Department> = {
  "Aardappelen en knolgewassen": "groente_fruit",
  Groente: "groente_fruit",
  Fruit: "groente_fruit",
  "Vlees en gevogelte": "vlees_vis_vega",
  "Vis, schaal- en schelpdieren": "vlees_vis_vega",
  "Vleesvervangers en zuivelvervangers": "vlees_vis_vega",
  "Melk en melkproducten": "zuivel",
  Kaas: "zuivel",
  Eieren: "zuivel",
  Brood: "brood_beleg",
  Vleeswaren: "brood_beleg",
  "Hartig broodbeleg": "brood_beleg",
  "Gebak en koek": "brood_beleg",
  "Graanproducten en meelsoorten": "houdbaar",
  Peulvruchten: "houdbaar",
  "Noten en zaden": "houdbaar",
  "Hartige sauzen": "houdbaar",
  "Suiker, snoep, zoet beleg en zoete sauzen": "houdbaar",
  Diversen: "houdbaar",
  "Niet-alcoholische dranken": "dranken",
  "Kruiden en specerijen": "voorraad",
  "Vetten en oliën": "voorraad",
};

export type PieceUnit = "stuks" | "sneetjes" | "teentjes" | "plakken";

export type ShoppingName = {
  name: string;
  department?: Department;
  /** Gram eetbaar deel per stuk, sneetje of teentje. */
  piece?: { grams: number; unit: PieceUnit };
  /** In ml of liter in plaats van gram (1 g ≈ 1 ml). */
  liquid?: boolean;
  /** Staat meestal al in de kast: op het lijstje standaard niet aangevinkt. */
  pantry?: boolean;
  /** Gekookt in NEVO, droog in de winkel: gram droog per gram gekookt. */
  dryFactor?: number;
};

const stuks = (grams: number) => ({ grams, unit: "stuks" as const });
const sneetjes = (grams: number) => ({ grams, unit: "sneetjes" as const });

/** Per NEVO-code. */
export const SHOPPING_NAMES: Record<number, ShoppingName> = {
  // Aardappelen en groente
  1: { name: "Aardappelen" },
  2: { name: "Nieuwe aardappelen" },
  671: { name: "Zoete aardappelen" },
  5418: { name: "Gnocchi", department: "houdbaar" },
  689: { name: "Avocado's", piece: stuks(140) },
  958: { name: "Rode bieten (gekookt)" },
  50: { name: "Sperziebonen" },
  921: { name: "Broccoli" },
  19: { name: "Champignons" },
  922: { name: "Courgettes", piece: stuks(300) },
  953: { name: "Doperwten", department: "diepvries" },
  2402: { name: "Kappertjes", department: "houdbaar" },
  830: { name: "Knoflook", piece: { grams: 4, unit: "teentjes" } },
  2739: { name: "Komkommers", piece: stuks(400) },
  959: { name: "Boerenkool" },
  69: { name: "Witte kool" },
  2900: { name: "Maïs (blik)", department: "houdbaar" },
  1892: { name: "Paksoi" },
  31: { name: "Groene paprika's", piece: stuks(150) },
  884: { name: "Rode paprika's", piece: stuks(150) },
  35: { name: "Peultjes" },
  562: { name: "Prei" },
  557: { name: "Bleekselderij" },
  2346: { name: "Sla" },
  2736: { name: "Rucola" },
  51: { name: "Spinazie" },
  58: { name: "Taugé" },
  60: { name: "Tomaten", piece: stuks(100) },
  2498: { name: "Gezeefde tomaten", department: "houdbaar" },
  2293: { name: "Tomatenblokjes (blik)", department: "houdbaar" },
  2731: { name: "Cherrytomaten" },
  2378: { name: "Zongedroogde tomaten", department: "houdbaar" },
  63: { name: "Uien", piece: stuks(100) },
  5459: { name: "Rode uien", piece: stuks(100) },
  2737: { name: "Bosuien", piece: stuks(15) },
  71: { name: "Wortels" },
  // Fruit
  148: { name: "Aardbeien" },
  875: { name: "Appels", piece: stuks(135) },
  151: { name: "Bananen", piece: stuks(110) },
  152: { name: "Blauwe bessen" },
  161: { name: "Frambozen" },
  5120: { name: "Kiwi's", piece: stuks(75) },
  2748: { name: "Peren", piece: stuks(150) },
  1127: { name: "Citroenen", piece: stuks(40) },
  175: { name: "Gedroogde abrikozen", department: "houdbaar" },
  2890: { name: "Gedroogde cranberry's", department: "houdbaar" },
  181: { name: "Dadels", department: "houdbaar" },
  33: { name: "Rozijnen", department: "houdbaar" },
  3336: { name: "Olijven", department: "houdbaar" },
  // Verse kruiden staan bij de groente
  2177: { name: "Basilicum", department: "groente_fruit" },
  829: { name: "Bieslook", department: "groente_fruit" },
  3450: { name: "Munt", department: "groente_fruit" },
  128: { name: "Peterselie", department: "groente_fruit" },
  832: { name: "Gember", department: "groente_fruit" },
  // Vlees, vis en vega
  3034: { name: "Mager rundergehakt" },
  1634: { name: "Kipfilet" },
  1400: { name: "Biefstuk" },
  1663: { name: "Mager rundvlees" },
  820: { name: "Kabeljauw" },
  2299: { name: "Tilapia" },
  1587: { name: "Zalm" },
  1096: { name: "Gerookte zalm" },
  1590: { name: "Tonijn in water (blik)", department: "houdbaar" },
  5573: { name: "Tempeh" },
  5519: { name: "Tofu" },
  // Zuivel en eieren
  83: { name: "Eieren", piece: stuks(55) },
  286: { name: "Halfvolle melk", liquid: true },
  289: { name: "Karnemelk", liquid: true },
  1464: { name: "Chocolademelk", liquid: true },
  3180: { name: "Sojadrink", department: "zuivel", liquid: true },
  5247: { name: "Sojayoghurt", department: "zuivel" },
  305: { name: "Magere kwark" },
  5538: { name: "Lactosevrije kwark" },
  5295: { name: "Skyr" },
  5271: { name: "Griekse yoghurt 0%" },
  1502: { name: "Halfvolle yoghurt" },
  301: { name: "Magere yoghurt" },
  282: { name: "Vanillevla" },
  2276: { name: "Kookroom light", liquid: true },
  812: { name: "Zure room" },
  1382: { name: "Kaas" },
  3362: { name: "Feta" },
  1955: { name: "Mozzarella" },
  718: { name: "Parmezaanse kaas" },
  3377: { name: "Ricotta" },
  654: { name: "Hüttenkäse" },
  517: { name: "Smeerkaas" },
  310: { name: "Roomboter", department: "zuivel", pantry: true },
  // Brood en beleg
  2811: { name: "Volkorenbrood", piece: sneetjes(35) },
  2351: { name: "Wit brood", piece: sneetjes(30) },
  242: { name: "Roggebrood", piece: sneetjes(40) },
  233: { name: "Krentenbrood", piece: sneetjes(35) },
  2793: { name: "Stokbrood", piece: stuks(250) },
  2790: { name: "Pitabroodjes", piece: stuks(75) },
  2798: { name: "Volkoren bolletjes", piece: stuks(55) },
  2795: { name: "Harde witte bolletjes", piece: stuks(60) },
  230: { name: "Zachte witte bolletjes", piece: stuks(50) },
  2803: { name: "Krentenbollen", piece: stuks(60) },
  5264: { name: "Luchtige crackers", piece: stuks(10) },
  1481: { name: "Rijstwafels", piece: stuks(8) },
  240: { name: "Ontbijtkoek", piece: { grams: 25, unit: "plakken" } },
  2239: { name: "Mueslirepen", piece: stuks(25) },
  2359: { name: "Wraps", department: "brood_beleg", piece: stuks(60) },
  5482: { name: "Volkoren wraps", department: "brood_beleg", piece: stuks(60) },
  784: { name: "Achterham" },
  2654: { name: "Kipfilet (beleg)" },
  3345: { name: "Rosbief" },
  3207: { name: "Hummus" },
  455: { name: "Pindakaas" },
  // Houdbaar
  4: { name: "Pasta" },
  811: { name: "Volkorenpasta" },
  5: { name: "Witte rijst" },
  712: { name: "Zilvervliesrijst" },
  3153: { name: "Quinoa" },
  1015: { name: "Bulgur" },
  1889: { name: "Couscous" },
  5518: { name: "Volkoren couscous" },
  // Rijstnoedels wegen gekookt ongeveer drie keer zoveel als droog.
  3206: { name: "Mihoen", dryFactor: 1 / 3 },
  213: { name: "Havervlokken" },
  2809: { name: "Muesli" },
  2081: { name: "Cornflakes" },
  530: { name: "Pannenkoekenmix" },
  3184: { name: "Kidneybonen (blik)" },
  3049: { name: "Witte bonen (blik)" },
  5176: { name: "Zwarte bonen (blik)" },
  3185: { name: "Kikkererwten (blik)" },
  5169: { name: "Linzen (blik)" },
  120: { name: "Gedroogde linzen" },
  5049: { name: "Amandelen" },
  207: { name: "Gemengde noten" },
  206: { name: "Walnoten" },
  838: { name: "Sesamzaad" },
  872: { name: "Zonnebloempitten" },
  2178: { name: "Groene pesto" },
  2290: { name: "Kokosmelk", department: "houdbaar", liquid: true },
  432: { name: "Pure chocolade" },
  431: { name: "Melkchocolade" },
  445: { name: "Jam" },
  752: { name: "Winegums" },
  // Dranken
  383: { name: "Appelsap", liquid: true },
  410: { name: "Sinaasappelsap", liquid: true },
  463: { name: "Limonadesiroop", liquid: true },
  747: { name: "Water", liquid: true, pantry: true },
  // Voorraadkast
  841: { name: "Zout", department: "voorraad", pantry: true },
  823: { name: "Peper", pantry: true },
  601: { name: "Olijfolie", liquid: true, pantry: true },
  317: { name: "Zonnebloemolie", liquid: true, pantry: true },
  3376: { name: "Sesamolie", liquid: true, pantry: true },
  842: { name: "Bouillonpoeder", pantry: true },
  1221: { name: "Chilipoeder", pantry: true },
  826: { name: "Kaneel", pantry: true },
  1223: { name: "Kerriepoeder", pantry: true },
  827: { name: "Komijnzaad", pantry: true },
  1228: { name: "Oregano", pantry: true },
  1229: { name: "Paprikapoeder", pantry: true },
  824: { name: "Mosterd", pantry: true },
  1232: { name: "Sambal oelek", pantry: true },
  1215: { name: "Ketjap", department: "voorraad", liquid: true, pantry: true },
  5470: { name: "Sojasaus", department: "voorraad", liquid: true, pantry: true },
  5253: { name: "Balsamico-azijn", department: "voorraad", liquid: true, pantry: true },
  430: { name: "Cacaopoeder", pantry: true },
  220: { name: "Tarwebloem", pantry: true },
  1020: { name: "Zelfrijzend bakmeel", pantry: true },
  222: { name: "Volkorenmeel", pantry: true },
  215: { name: "Maïzena", pantry: true },
  1013: { name: "Paneermeel", pantry: true },
  377: { name: "Kristalsuiker", pantry: true },
  374: { name: "Bruine basterdsuiker", pantry: true },
  378: { name: "Keukenstroop", pantry: true },
  3063: { name: "Ahornsiroop", pantry: true },
  443: { name: "Honing", pantry: true },
};

const NEVO_SUFFIXES = /\s+(rauw|onbereid|gem|gemiddeld)$/i;

/**
 * Een leesbare naam uit een NEVO-naam zonder eigen vertaling: "rauw" en
 * "gem" eraf, en "Kool bloem-" wordt "Bloemkool".
 */
export function cleanNevoName(nameNl: string): string {
  let name = nameNl.trim();
  while (NEVO_SUFFIXES.test(name)) name = name.replace(NEVO_SUFFIXES, "");
  const compound = /^(\S+) (\S+)-(.*)$/.exec(name);
  if (compound) {
    const [, head, prefix, rest] = compound;
    name = `${prefix.charAt(0).toUpperCase()}${prefix.slice(1).toLowerCase()}${head.toLowerCase()}${rest}`;
  }
  return name;
}

export function departmentFor(nevoCode: number, foodGroup: string | null | undefined): Department {
  return SHOPPING_NAMES[nevoCode]?.department ?? GROUP_DEPARTMENTS[foodGroup ?? ""] ?? "overig";
}
