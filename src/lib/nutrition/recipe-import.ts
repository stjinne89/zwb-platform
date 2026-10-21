// Van een geplakte receptlink naar een voorstel voor het formulier "Eigen recept".
//
// Bijna elke receptsite (Leukerecepten, 24Kitchen, foodblogs met
// WordPress-receptplugins) zet het recept als schema.org-Recipe in JSON-LD op
// de pagina, omdat Google daarmee receptkaarten toont. Alleen dat lezen we; een
// site zonder Recipe-data geeft een melding in plaats van een gok uit de HTML.
// Allerhande weigert de pagina en gaat via de AH-API (zie fetchAllerhande).
//
// Ingrediënten komen als tekstregels ("200 g volkoren pasta"). Hier worden ze
// gesplitst in een hoeveelheid in gram of ml en een naam om in NEVO te zoeken;
// het koppelen aan NEVO zelf gebeurt in de pagina (food-query.ts). Wat geraden
// wordt (gewicht van een ui, ml als gram), ziet het lid in het formulier
// voordat het bewaart.

import * as cheerio from "cheerio";
import {
  absoluteHttpUrl,
  cleanDescription,
  cleanText,
  fetchError,
  fetchWithCheckedRedirects,
  readCapped,
} from "@/lib/events/link-prefill";
import { translateIngredient } from "./english-ingredients";
export { guessRole } from "./scale";

export type ImportedRecipe = {
  title: string;
  servings: number | null;
  minutes: number | null;
  /** De ingrediëntregels zoals de site ze geeft. */
  ingredients: string[];
  steps_md: string;
  /** Alleen https: de kolom staat niets anders toe (0264). */
  image_url: string | null;
  source_name: string;
  /** Null als de pagina geen https heeft (0213 staat alleen https toe). */
  source_url: string | null;
};

export type IngredientLine = {
  /** De regel zoals op de site. */
  line: string;
  /** Wat in NEVO gezocht wordt, in kleine letters. */
  name: string;
  /** Hoeveelheid in gram of ml; null als die niet uit de regel volgt. */
  grams: number | null;
};

const MAX_TITLE = 120;
const MAX_SOURCE_NAME = 120;
const MAX_STEPS = 5000;
const MAX_LINES = 40;
const MAX_HTML_BYTES = 3_000_000;

// --- Pure logica ---------------------------------------------------------

type JsonLdNode = Record<string, unknown>;

function jsonLdNodes(value: unknown, depth = 0): JsonLdNode[] {
  if (depth > 6) return [];
  if (Array.isArray(value)) return value.flatMap((item) => jsonLdNodes(item, depth + 1));
  if (!value || typeof value !== "object") return [];
  const node = value as JsonLdNode;
  // Een Recipe zit soms in @graph, soms als mainEntity van een WebPage.
  return [node, ...jsonLdNodes(node["@graph"], depth + 1), ...jsonLdNodes(node.mainEntity, depth + 1)];
}

function isRecipeNode(node: JsonLdNode): boolean {
  const types = ([] as unknown[]).concat(node["@type"] ?? []);
  return types.some((type) => typeof type === "string" && /(^|[/:])Recipe$/.test(type));
}

/** ISO 8601-duur ("PT1H30M", "P0DT0H45M") naar minuten. */
export function parseDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(
    value.trim(),
  );
  if (!match || value.trim().toUpperCase() === "P" || value.trim().toUpperCase() === "PT") return null;
  const [, days, hours, minutes, seconds] = match;
  const total =
    Number(days ?? 0) * 1440 + Number(hours ?? 0) * 60 + Number(minutes ?? 0) + Number(seconds ?? 0) / 60;
  return Number.isFinite(total) ? Math.round(total) : null;
}

/** recipeYield is een getal, een tekst ("4 personen") of een lijst daarvan. */
export function parseServings(value: unknown): number | null {
  for (const item of ([] as unknown[]).concat(value ?? [])) {
    const match = /\d+/.exec(String(item));
    const count = match ? Number(match[0]) : NaN;
    if (Number.isFinite(count) && count >= 1) return Math.min(count, 20);
  }
  return null;
}

function stepText(value: unknown): string | null {
  if (typeof value === "string") return cleanText(value.replace(/<[^>]+>/g, " "));
  if (value && typeof value === "object") {
    const node = value as JsonLdNode;
    return stepText(node.text) ?? stepText(node.name);
  }
  return null;
}

type StepBlock = { title: string | null; steps: string[] };

/**
 * recipeInstructions: één tekst (soms HTML), een lijst teksten, HowToSteps, of
 * HowToSections met elk hun eigen stappen.
 */
export function instructionBlocks(value: unknown): StepBlock[] {
  if (typeof value === "string") {
    const text = cleanDescription(value) ?? "";
    const steps = text
      .split(/\n+/)
      .map((line) => line.replace(/^\s*(?:(?:[-•*]|\d+[.)])\s*)+/, "").trim())
      .filter(Boolean);
    return steps.length > 0 ? [{ title: null, steps }] : [];
  }
  const items = Array.isArray(value) ? value : value ? [value] : [];
  const blocks: StepBlock[] = [];
  let loose: string[] = [];
  for (const item of items) {
    const node = item && typeof item === "object" ? (item as JsonLdNode) : null;
    const isSection = node && ([] as unknown[]).concat(node["@type"] ?? []).includes("HowToSection");
    if (node && isSection) {
      if (loose.length > 0) blocks.push({ title: null, steps: loose });
      loose = [];
      const steps = instructionBlocks(node.itemListElement).flatMap((block) => block.steps);
      if (steps.length > 0) blocks.push({ title: cleanText(node.name), steps });
      continue;
    }
    if (typeof item === "string" && /\n|<(p|li|br)/i.test(item)) {
      loose.push(...instructionBlocks(item).flatMap((block) => block.steps));
      continue;
    }
    const text = stepText(item);
    if (text) loose.push(text);
  }
  if (loose.length > 0) blocks.push({ title: null, steps: loose });
  return blocks;
}

/** Genummerde stappen in markdown, met een kopje per onderdeel. Afgekapt op een hele stap. */
export function stepsMarkdown(blocks: StepBlock[], max = MAX_STEPS): string {
  const parts: string[] = [];
  let length = 0;
  // Een kopje boven het enige onderdeel ("Bereiding") zegt niets.
  const titled = blocks.length > 1;
  for (const block of blocks) {
    const lines = [
      ...(titled && block.title ? [`**${block.title}**`, ""] : []),
      ...block.steps.map((step, index) => `${index + 1}. ${step}`),
    ];
    const text = lines.join("\n");
    const extra = (parts.length > 0 ? 2 : 0) + text.length;
    if (length + extra > max) {
      // Wat nog past van dit blok, stap voor stap.
      const fitting: string[] = [];
      let used = length + (parts.length > 0 ? 2 : 0);
      for (const line of lines) {
        if (used + line.length + 1 > max) break;
        fitting.push(line);
        used += line.length + 1;
      }
      if (fitting.some((line) => /^\d+\. /.test(line))) parts.push(fitting.join("\n"));
      break;
    }
    parts.push(text);
    length += extra;
  }
  return parts.join("\n\n");
}

function firstImage(value: unknown): unknown {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstImage(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") return (value as JsonLdNode).url ?? (value as JsonLdNode).contentUrl;
  return value;
}

function httpsOnly(url: string | null): string | null {
  return url && url.startsWith("https://") && url.length <= 1000 ? url : null;
}

function publisherName(value: unknown): string | null {
  const node = Array.isArray(value) ? value[0] : value;
  if (typeof node === "string") return cleanText(node);
  if (node && typeof node === "object") return cleanText((node as JsonLdNode).name);
  return null;
}

/** Titels als "Pasta pesto | Allerhande": de sitenaam eraf. */
function stripSiteName(title: string, siteName: string | null): string {
  if (!siteName) return title;
  const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = title.replace(new RegExp(`\\s*[|–—-]\\s*${escaped}\\s*$`, "i"), "").trim();
  return stripped || title;
}

/** De link zonder volgparameters, en alleen als https. */
export function cleanSourceUrl(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    if (url.protocol !== "https:") return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    const text = url.toString();
    return text.length <= 1000 ? text : null;
  } catch {
    return null;
  }
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Een kopje tussen de ingrediënten ("TIKKA MASALA PASTE", "Voor de saus:").
 * Sommige sites zetten dat als gewone regel in recipeIngredient.
 */
function isIngredientHeading(line: string): boolean {
  return line.endsWith(":") || !/[\p{Ll}\d]/u.test(line);
}

/** Het recept uit de HTML van een receptpagina, of null als er geen Recipe-data in staat. */
export function recipeFromHtml(html: string, pageUrl: string): ImportedRecipe | null {
  const $ = cheerio.load(html);
  const meta = (...keys: string[]) => {
    for (const key of keys) {
      const text = cleanText($(`meta[property="${key}"], meta[name="${key}"]`).first().attr("content"));
      if (text) return text;
    }
    return null;
  };

  let recipe: JsonLdNode | null = null;
  $('script[type="application/ld+json"]').each((_, element) => {
    if (recipe) return;
    const raw = $(element)
      .text()
      .replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "");
    try {
      recipe = jsonLdNodes(JSON.parse(raw)).find(isRecipeNode) ?? null;
    } catch {
      // Kapotte JSON-LD komt voor; dan het volgende blok.
    }
  });
  if (!recipe) return null;
  const ld = recipe as JsonLdNode;

  const ingredients = ([] as unknown[])
    .concat(ld.recipeIngredient ?? ld.ingredients ?? [])
    .map((line) => (typeof line === "string" ? cleanText(line.replace(/<[^>]+>/g, " ")) : null))
    .filter((line): line is string => Boolean(line) && !isIngredientHeading(line!))
    .slice(0, MAX_LINES);

  let host = "";
  try {
    host = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    // pageUrl is altijd een geldige URL; zonder host blijft de naam leeg.
  }
  const siteName = publisherName(ld.publisher) ?? meta("og:site_name") ?? host;
  const rawTitle = cleanText(ld.name) ?? meta("og:title") ?? cleanText($("title").first().text());
  if (!rawTitle) return null;

  const total = parseDuration(ld.totalTime);
  const parts = [parseDuration(ld.prepTime), parseDuration(ld.cookTime)].filter((value): value is number => value != null);
  const minutes = total ?? (parts.length > 0 ? parts.reduce((sum, value) => sum + value, 0) : null);

  return {
    title: clip(stripSiteName(rawTitle, siteName), MAX_TITLE),
    servings: parseServings(ld.recipeYield),
    minutes: minutes == null ? null : Math.min(minutes, 600),
    ingredients,
    steps_md: stepsMarkdown(instructionBlocks(ld.recipeInstructions)),
    image_url: httpsOnly(
      absoluteHttpUrl(firstImage(ld.image), pageUrl) ?? absoluteHttpUrl(meta("og:image", "og:image:url"), pageUrl),
    ),
    source_name: clip(siteName || "Onbekende site", MAX_SOURCE_NAME),
    source_url: cleanSourceUrl(pageUrl),
  };
}

// Ingrediëntregels ----------------------------------------------------------

const FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };
const FRACTION_CHARS = Object.keys(FRACTIONS).join("");

const NUMBER = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[${FRACTION_CHARS}]?|[${FRACTION_CHARS}])`;
const QUANTITY = new RegExp(String.raw`^(${NUMBER})(?:\s*(?:-|–|à|a|tot|to|of)\s*(${NUMBER}))?\s*`, "i");

function numberValue(text: string): number {
  const trimmed = text.trim();
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(trimmed);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = /^(\d+)\/(\d+)$/.exec(trimmed);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const char = trimmed.slice(-1);
  if (FRACTIONS[char] != null) {
    const whole = trimmed.slice(0, -1).trim();
    return (whole ? Number(whole.replace(",", ".")) : 0) + FRACTIONS[char];
  }
  return Number(trimmed.replace(",", "."));
}

/** Gram of ml per eenheid. Lepels en kopjes zijn omrekeningen; ml telt als gram. */
const UNIT_GRAMS: Array<[RegExp, number]> = [
  [/^(?:kg|kilo(?:gram)?s?)$/, 1000],
  [/^(?:g|gr|gram|grams|grammen)$/, 1],
  [/^(?:l|ltr|liter|liters|litre|litres)$/, 1000],
  [/^(?:dl|deciliter)$/, 100],
  [/^(?:cl|centiliter)$/, 10],
  [/^(?:ml|milliliter|milliliters)$/, 1],
  [/^(?:el|eetl|eetlepels?|tbsp|tbs|tablespoons?)$/, 15],
  [/^(?:tl|theel|theelepels?|tsp|teaspoons?)$/, 5],
  [/^(?:kopjes?)$/, 150],
  [/^(?:cups?)$/, 240],
  [/^(?:oz|ounces?)$/, 28],
  [/^(?:lbs?|pounds?)$/, 454],
  [/^(?:teentjes?|tenen|teen|cloves?)$/, 5],
  // Een stuk gember of kurkuma: "5cm piece of ginger".
  [/^cm$/, 5],
  [/^(?:snufjes?|snuf|mespuntj?e?s?|pinch)$/, 1],
];

/** Eenheden zonder vast gewicht: weg uit de naam, gewicht alleen uit "(400 g)". */
const COUNT_UNITS =
  /^(?:blikj?e?s?|blikken|pakj?e?s?|pakken|zakj?e?s?|zakken|bosj?e?s?|bossen|stuks?|plakj?e?s?|plakken|takj?e?s?|handj?e?s?|handvol|scheutj?e?s?|scheut|potj?e?s?|potten|bakj?e?s?|flesj?e?s?|cans?|tins?|jars?|slices?|bunch(?:es)?|handfuls?|sprigs?|knobs?|pieces?|sticks?|bags?|packs?|packets?)$/;

/**
 * Gewicht van één stuk bij een regel zonder eenheid ("2 uien"). Ruwe
 * gemiddelden; het lid ziet en verbetert de hoeveelheid in het formulier.
 */
const PIECE_GRAMS: Record<string, number> = {
  ei: 55,
  eieren: 55,
  ui: 100,
  uien: 100,
  sjalot: 30,
  sjalotten: 30,
  tomaat: 100,
  tomaten: 100,
  paprika: 150,
  "paprika's": 150,
  banaan: 120,
  bananen: 120,
  appel: 150,
  appels: 150,
  avocado: 150,
  "avocado's": 150,
  citroen: 100,
  citroenen: 100,
  limoen: 60,
  limoenen: 60,
  wortel: 80,
  wortels: 80,
  winterpeen: 200,
  courgette: 300,
  courgettes: 300,
  aubergine: 300,
  aubergines: 300,
  aardappel: 100,
  aardappelen: 100,
  komkommer: 350,
  prei: 200,
  knoflook: 5,
};

const NAME_NOISE = /\b(?:ca\.?|circa|ongeveer|optioneel|naar smaak|naar keuze|eventueel|evt\.?|of meer)\b/gi;

/** "200 g volkoren pasta" → naam "volkoren pasta", 200 gram. */
export function parseIngredientLine(line: string): IngredientLine {
  const original = line.trim();
  let rest = original.replace(/^[-•*]\s*/, "");

  // "(400 g)" bij een blik of pak: gewicht per stuk.
  const packed = /\((\d+(?:[.,]\d+)?)\s*(g|gr|gram|kg|ml|cl|dl|l)\)/i.exec(rest);
  let perPack = packed ? numberValue(packed[1]) * unitGrams(packed[2].toLowerCase())! : null;

  let quantity: number | null = null;
  const match = QUANTITY.exec(rest);
  if (match) {
    const first = numberValue(match[1]);
    const second = match[2] ? numberValue(match[2]) : null;
    quantity = second != null && Number.isFinite(second) ? (first + second) / 2 : first;
    if (!Number.isFinite(quantity) || quantity <= 0) quantity = null;
    rest = rest.slice(match[0].length);
  }
  // Engels: "1 x 400g tin of", "½ a bunch of", "1 small handful of".
  const times = /^[x×]\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l)\b\s*/i.exec(rest);
  if (times) {
    perPack = numberValue(times[1]) * unitGrams(times[2].toLowerCase())!;
    rest = rest.slice(times[0].length);
  }
  rest = rest.replace(/^(?:an?\s+)?(?:(?:small|large|medium|big|heaped|level|good|generous)\s+)?(?=\S+\s)/i, "");

  let grams: number | null = null;
  const unitMatch = /^([\p{L}']+)\.?(?:\s+|$)/u.exec(rest);
  const unitWord = unitMatch?.[1].toLowerCase() ?? "";
  const perUnit = unitWord ? unitGrams(unitWord) : null;
  if (perUnit != null) {
    rest = rest.slice(unitMatch![0].length);
    grams = (quantity ?? 1) * perUnit;
  } else if (unitWord && COUNT_UNITS.test(unitWord)) {
    rest = rest.slice(unitMatch![0].length);
    grams = perPack != null ? (quantity ?? 1) * perPack : null;
  } else if (quantity != null) {
    grams = perPack != null ? quantity * perPack : null;
  }

  const name = translateIngredient(cleanIngredientName(rest));
  if (grams == null && quantity != null && perPack == null) {
    const piece = PIECE_GRAMS[name.split(" ")[0]] ?? PIECE_GRAMS[name.split(" ").at(-1) ?? ""];
    if (piece != null) grams = quantity * piece;
  }

  return {
    line: original,
    name,
    grams: grams == null ? null : Math.min(5000, Math.max(1, Math.round(grams))),
  };
}

function unitGrams(word: string): number | null {
  for (const [pattern, grams] of UNIT_GRAMS) if (pattern.test(word)) return grams;
  return null;
}

function cleanIngredientName(text: string): string {
  return text
    .replace(/\([^)]*\)/g, " ")
    .split(/[,;]/)[0]
    .replace(NAME_NOISE, " ")
    .replace(/^\s*(?:van|de|het|een|of)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// NEVO-zoektermen ---------------------------------------------------------

const ADJECTIVES = new Set([
  "verse",
  "vers",
  "grote",
  "groot",
  "kleine",
  "klein",
  "middelgrote",
  "fijne",
  "fijngehakte",
  "fijngesneden",
  "gesneden",
  "gesnipperde",
  "geraspte",
  "biologische",
  "bio",
  "rijpe",
  "koude",
  "warme",
  "lauwwarme",
  "extra",
  "vierge",
  "en",
  "met",
  "voor",
]);

/** Enkelvoud van een Nederlands meervoud, voor NEVO ("tomaten" → "tomaat"). */
export function singular(word: string): string {
  if (word === "eieren") return "ei";
  if (word.endsWith("'s")) return word.slice(0, -2);
  if (word.endsWith("en") && word.length >= 4) {
    const stem = word.slice(0, -2);
    if (/(el|er)$/.test(stem)) return stem;
    if (/([^aeiou])\1$/.test(stem)) return stem.slice(0, -1);
    const short = /^(.*[^aeiou])([aeiou])([^aeiou])$/.exec(stem);
    if (short) return `${short[1]}${short[2]}${short[2]}${short[3]}`;
    return stem;
  }
  if (word.endsWith("s") && word.length > 4 && /[aeiouylnr]s$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Woorden die NEVO onder een andere naam kent. */
const NEVO_SYNONYMS: Record<string, string> = {
  spaghetti: "pasta",
  penne: "pasta",
  fusilli: "pasta",
  macaroni: "pasta",
  tagliatelle: "pasta",
  linguine: "pasta",
  farfalle: "pasta",
  orzo: "pasta",
  kipdijfilet: "kip",
  kippendijen: "kip",
  kippendijfilet: "kip",
  cherrytomaten: "tomaat kers",
  cherrytomaatjes: "tomaat kers",
  tomaatjes: "tomaat kers",
  kookroom: "room kook",
  slagroom: "room slag",
  creme: "room",
};

/** Zoektermen voor NEVO, beste eerst: de hele naam, dan het hoofdwoord (meestal achteraan). */
export function searchCandidates(name: string, max = 4): string[] {
  const words = name
    .toLowerCase()
    .split(/[^\p{L}']+/u)
    .filter((word) => word.length >= 2 && !ADJECTIVES.has(word));
  if (words.length === 0) return [];
  const last = words[words.length - 1];
  const candidates = [
    words.join(" "),
    NEVO_SYNONYMS[last] ?? "",
    [...words.slice(0, -1), singular(last)].join(" "),
    last,
    singular(last),
    words[0],
  ];
  return [...new Set(candidates.filter((term) => term.length >= 2))].slice(0, max);
}

const PREPARED = /\b(?:bereid|gekookt|gebakken|gegrild|gestoofd|huishoudelijk|maaltijd|salade|soep)\b/i;
const COMPOSITE = /\s(?:m|z|met)\s/i;

/**
 * Het NEVO-product voor een receptregel uit de treffers van één zoekterm. Een
 * ingrediëntenlijst geeft rauwe hoeveelheden, dus "Pasta witte rauw" gaat voor
 * "Pasta speculoos-". Is het beste wat er is een bereid gerecht ("Spaghetti
 * bolognese m kaas huishoudelijk bereid"), dan liever niets: dan zoekt het lid.
 */
export function pickFood<T extends { name_nl: string }>(foods: T[]): T | null {
  const score = (name: string) =>
    (/\brauw\b/i.test(name) ? 0 : 1) +
    (/\brauwe\b/i.test(name) ? 1 : 0) +
    (PREPARED.test(name) ? 2 : 0) +
    (COMPOSITE.test(name) ? 2 : 0);
  const best = foods
    .map((food, index) => ({ food, index, score: score(food.name_nl) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)[0];
  if (!best) return null;
  if (PREPARED.test(best.food.name_nl) && COMPOSITE.test(best.food.name_nl)) return null;
  return best.food;
}

// --- Ophalen -------------------------------------------------------------

export type RecipeImportResult = { ok: true; recipe: ImportedRecipe } | { ok: false; error: string };

// Allerhande weigert onze server de webpagina (403, ook met een browser als
// user-agent: de botbescherming kijkt verder dan die header). De AH-app haalt
// recepten op uit api.ah.nl met een anoniem token, zonder login; die route
// gebruiken we, met onze eigen user-agent. Niet gedocumenteerd, dus het kan
// zonder aankondiging stoppen: dan krijgt het lid de gewone melding.

const AH_API = "https://api.ah.nl";
const AH_RECIPE_PATH = /^\/allerhande\/recept\/R-R(\d{1,10})(?:[/?#]|$)/i;
const AH_TIMEOUT_MS = 8000;
const AH_USER_AGENT = "Mozilla/5.0 (compatible; ZWB-Platform/1.0; +https://zwbcycling.nl)";

/** Het receptnummer uit een Allerhande-link, of null voor elke andere link. */
export function allerhandeRecipeId(link: string): number | null {
  try {
    const url = new URL(link.trim());
    if (!/^(?:www\.)?ah\.(?:nl|be)$/i.test(url.hostname)) return null;
    const match = AH_RECIPE_PATH.exec(url.pathname);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

export type AllerhandeRecipe = {
  title?: unknown;
  servings?: { number?: unknown } | null;
  cookTime?: unknown;
  ovenTime?: unknown;
  ingredients?: Array<{ text?: unknown }> | null;
  preparation?: { steps?: unknown } | null;
  images?: Array<{ url?: unknown; width?: unknown }> | null;
};

/** Het antwoord van de AH-API als voorstel voor het formulier. */
export function recipeFromAllerhande(data: AllerhandeRecipe, pageUrl: string): ImportedRecipe | null {
  const title = cleanText(data.title);
  if (!title) return null;
  const ingredients = (data.ingredients ?? [])
    .map((item) => cleanText(item?.text))
    .filter((line): line is string => Boolean(line))
    .slice(0, MAX_LINES);
  // Bereidings- en oventijd; wachten (marineren, een nacht laten staan) niet.
  const times = [data.cookTime, data.ovenTime].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  const minutes = times.length > 0 ? Math.min(Math.round(times.reduce((sum, value) => sum + value, 0)), 600) : null;
  // De kleinste foto van minstens 800 breed; anders de grootste die er is.
  const images = (data.images ?? [])
    .filter((image) => typeof image?.url === "string" && typeof image.width === "number")
    .sort((a, b) => (a.width as number) - (b.width as number));
  const image = images.find((item) => (item.width as number) >= 800) ?? images[images.length - 1];
  return {
    title: clip(title, MAX_TITLE),
    servings: parseServings(data.servings?.number),
    minutes,
    ingredients,
    steps_md: stepsMarkdown(instructionBlocks(data.preparation?.steps)),
    image_url: httpsOnly(typeof image?.url === "string" ? image.url : null),
    source_name: "Allerhande",
    source_url: cleanSourceUrl(pageUrl),
  };
}

const AH_RECIPE_QUERY = `query($id: Int!) { recipe(id: $id) {
  title servings { number } cookTime ovenTime
  ingredients { text } preparation { steps } images { url width }
} }`;

let ahToken: { value: string; expiresAt: number } | null = null;

async function allerhandeToken(): Promise<string> {
  if (ahToken && ahToken.expiresAt > Date.now()) return ahToken.value;
  const response = await fetch(`${AH_API}/mobile-auth/v1/auth/token/anonymous`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json", "user-agent": AH_USER_AGENT },
    body: JSON.stringify({ clientId: "appie" }),
    signal: AbortSignal.timeout(AH_TIMEOUT_MS),
  });
  const body = (await response.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown } | null;
  if (!response.ok || typeof body?.access_token !== "string") throw new Error("Deze site laat het recept niet ophalen.");
  // Een week geldig; een uur eerder opnieuw, zodat een lopend verzoek niet verloopt.
  const seconds = typeof body.expires_in === "number" ? body.expires_in : 3600;
  ahToken = { value: body.access_token, expiresAt: Date.now() + Math.max(seconds - 3600, 60) * 1000 };
  return ahToken.value;
}

async function fetchAllerhande(id: number, link: string): Promise<RecipeImportResult> {
  try {
    const response = await fetch(`${AH_API}/graphql`, {
      method: "POST",
      cache: "no-store",
      headers: {
        authorization: `Bearer ${await allerhandeToken()}`,
        "content-type": "application/json",
        "user-agent": AH_USER_AGENT,
      },
      body: JSON.stringify({ query: AH_RECIPE_QUERY, variables: { id } }),
      signal: AbortSignal.timeout(AH_TIMEOUT_MS),
    });
    if (response.status === 401) ahToken = null;
    if (!response.ok) return { ok: false, error: "Deze site laat het recept niet ophalen." };
    const body = JSON.parse(new TextDecoder().decode(await readCapped(response, MAX_HTML_BYTES))) as {
      data?: { recipe?: AllerhandeRecipe | null };
    };
    const recipe = body.data?.recipe ? recipeFromAllerhande(body.data.recipe, link.trim()) : null;
    if (!recipe || recipe.ingredients.length === 0) {
      return { ok: false, error: "Op deze pagina staat geen recept dat we kunnen lezen." };
    }
    return { ok: true, recipe };
  } catch (err) {
    return { ok: false, error: fetchError(err, "Kon de pagina niet bereiken.") };
  }
}

export async function fetchRecipe(link: string): Promise<RecipeImportResult> {
  const allerhandeId = allerhandeRecipeId(link);
  if (allerhandeId != null) return fetchAllerhande(allerhandeId, link);
  try {
    const response = await fetchWithCheckedRedirects(link.trim(), "text/html,application/xhtml+xml");
    // Grote sites weigeren soms verzoeken van servers; dat omzeilen we niet.
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: "Deze site laat het recept niet ophalen." };
    }
    if (!response.ok) return { ok: false, error: `De site gaf status ${response.status}.` };
    const type = response.headers.get("content-type") ?? "";
    if (type && !/html/i.test(type)) return { ok: false, error: "Deze link is geen webpagina." };
    const html = new TextDecoder().decode(await readCapped(response, MAX_HTML_BYTES));
    const recipe = recipeFromHtml(html, response.url || link.trim());
    if (!recipe || recipe.ingredients.length === 0) {
      return { ok: false, error: "Op deze pagina staat geen recept dat we kunnen lezen." };
    }
    return { ok: true, recipe };
  } catch (err) {
    return { ok: false, error: fetchError(err, "Kon de pagina niet bereiken.") };
  }
}
