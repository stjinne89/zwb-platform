// Het ontwerp van een ZWBeker (wens eigenaar, 2026-10-28: "lid nomineert en
// ontwerpt de prijs"). Puur: geen three.js en geen DOM, zodat de 3D-beker in de
// galerij, het plaatje op het profiel en de controle op de server uit dezelfde
// maten komen.
//
// Een ontwerp is een handvol keuzes uit vaste lijsten plus een korte gravure.
// Geen vrije maten of kleuren: zo blijft elke beker herkenbaar als ZWBeker en
// kan niemand iets onleesbaars of ongepasts bouwen dat het bestuur moet
// terugsturen.

import { z } from "zod";

export const VORMEN = ["beker", "bokaal", "schaal", "medaille", "een"] as const;
export const METALEN = ["goud", "zilver", "brons"] as const;
export const OREN = ["geen", "rond", "vleugel"] as const;
export const SILHOUETTEN = ["slank", "klassiek", "bol"] as const;
export const VOETEN = ["laag", "hoog"] as const;
export const SOKKELS = ["zwart", "hout", "marmer"] as const;
export const LINTEN = ["petrol", "goud", "rood", "oranje"] as const;

export type Vorm = (typeof VORMEN)[number];
export type Metaal = (typeof METALEN)[number];
export type Oren = (typeof OREN)[number];
export type Silhouet = (typeof SILHOUETTEN)[number];
export type Voet = (typeof VOETEN)[number];
export type Sokkel = (typeof SOKKELS)[number];
export type Lint = (typeof LINTEN)[number];

/** Zoveel tekens passen op het plaatje van de sokkel. */
export const GRAVURE_MAX = 24;

export type BekerDesign = {
  vorm: Vorm;
  metaal: Metaal;
  oren: Oren;
  silhouet: Silhouet;
  voet: Voet;
  sokkel: Sokkel;
  lint: Lint;
  gravure: string;
  /** Alleen bij de 1: waar je nummer 1 was ("Wereld", een tijdzone) en wanneer. */
  regio: string;
  periode: string;
};

export const DEFAULT_DESIGN: BekerDesign = {
  vorm: "beker",
  metaal: "goud",
  oren: "rond",
  silhouet: "klassiek",
  voet: "laag",
  sokkel: "zwart",
  lint: "petrol",
  gravure: "",
  regio: "",
  periode: "",
};

export const LABELS = {
  vorm: { beker: "Beker", bokaal: "Bokaal", schaal: "Schaal", medaille: "Medaille", een: "Nummer 1" },
  metaal: { goud: "Goud", zilver: "Zilver", brons: "Brons" },
  oren: { geen: "Geen", rond: "Rond", vleugel: "Vleugels" },
  silhouet: { slank: "Slank", klassiek: "Klassiek", bol: "Bol" },
  voet: { laag: "Laag", hoog: "Hoog" },
  sokkel: { zwart: "Zwart", hout: "Hout", marmer: "Marmer" },
  lint: { petrol: "Petrol", goud: "Goud", rood: "Rood", oranje: "Oranje" },
} as const satisfies { [K in Exclude<keyof BekerDesign, "gravure" | "regio" | "periode">]: Record<BekerDesign[K], string> };

/**
 * De kleuren van het metaal. `hex` is wat het metaal terugkaatst (three.js) en
 * het midden van het plaatje; licht en donker zijn de glans en de schaduw op het
 * plaatje. Zo licht als echt metaal: donkerder goud ging in de petrol galerij
 * olijfgroen staan.
 */
export const METAL_COLOR: Record<Metaal, { hex: string; light: string; dark: string }> = {
  goud: { hex: "#f2c25a", light: "#fbe3a0", dark: "#8a6420" },
  zilver: { hex: "#eef1f4", light: "#ffffff", dark: "#7c858f" },
  brons: { hex: "#d39062", light: "#efc09a", dark: "#6a3f20" },
};

export const SOKKEL_COLOR: Record<Sokkel, string> = {
  zwart: "#17191b",
  hout: "#6b4428",
  marmer: "#e9e6df",
};

export const LINT_COLOR: Record<Lint, string> = {
  petrol: "#0b4a56",
  goud: "#c9a45a",
  rood: "#b3262d",
  oranje: "#e8762b",
};

/** Welke keuzes bij deze vorm iets doen; de rest blijft staan maar telt niet. */
export function relevant(vorm: Vorm) {
  const lathe = vorm !== "medaille" && vorm !== "een";
  return {
    oren: vorm === "beker" || vorm === "bokaal",
    silhouet: lathe,
    voet: lathe,
    lint: vorm === "medaille",
    // De 1 (nummer 1 van de ladder, wens eigenaar 2026-10-28) graveert regio en
    // periode in plaats van een vrije regel.
    gravure: vorm !== "een",
    regioPeriode: vorm === "een",
  };
}

/** Of de vorm op zijn sokkel ronddraait: een medaille en de 1 tonen hun voorkant. */
export function spins(vorm: Vorm): boolean {
  return vorm !== "medaille" && vorm !== "een";
}

/** De regels op het plaatje van de sokkel, van boven naar onder; leeg zonder gravure. */
export function gravureLines(design: BekerDesign): string[] {
  const show = relevant(design.vorm);
  return (show.regioPeriode ? [design.regio, design.periode] : show.gravure ? [design.gravure] : []).filter(Boolean);
}

/** Wat de gravure mag bevatten: letters (ook met accent), cijfers, spatie en wat leestekens. */
const GRAVURE_CHARS = /^[\p{L}\p{N} .,'’&+\-–!?:/#()]*$/u;

export function cleanGravure(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const engraving = z
  .string()
  .transform(cleanGravure)
  .pipe(z.string().max(GRAVURE_MAX).regex(GRAVURE_CHARS));

const designSchema = z.object({
  vorm: z.enum(VORMEN),
  metaal: z.enum(METALEN),
  oren: z.enum(OREN),
  silhouet: z.enum(SILHOUETTEN),
  voet: z.enum(VOETEN),
  sokkel: z.enum(SOKKELS),
  lint: z.enum(LINTEN),
  gravure: engraving,
  // Ontwerpen van voor de 1 hebben deze velden niet.
  regio: engraving.default(""),
  periode: engraving.default(""),
});

/**
 * Streng, voor wat een lid instuurt: alles moet een bekende keuze zijn. Gooit
 * een ZodError bij iets anders.
 */
export function parseDesign(input: unknown): BekerDesign {
  return designSchema.parse(input);
}

/**
 * Ruim, voor wat er al staat: een onbekende of ontbrekende keuze wordt de
 * standaard, zodat een oud of beschadigd ontwerp nog steeds een beker toont.
 */
export function readDesign(stored: unknown): BekerDesign {
  const source = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const pick = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
    typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;
  const engraved = (value: unknown) => {
    const text = typeof value === "string" ? cleanGravure(value).slice(0, GRAVURE_MAX) : "";
    return GRAVURE_CHARS.test(text) ? text : "";
  };
  return {
    vorm: pick(VORMEN, source.vorm, DEFAULT_DESIGN.vorm),
    metaal: pick(METALEN, source.metaal, DEFAULT_DESIGN.metaal),
    oren: pick(OREN, source.oren, DEFAULT_DESIGN.oren),
    silhouet: pick(SILHOUETTEN, source.silhouet, DEFAULT_DESIGN.silhouet),
    voet: pick(VOETEN, source.voet, DEFAULT_DESIGN.voet),
    sokkel: pick(SOKKELS, source.sokkel, DEFAULT_DESIGN.sokkel),
    lint: pick(LINTEN, source.lint, DEFAULT_DESIGN.lint),
    gravure: engraved(source.gravure),
    regio: engraved(source.regio),
    periode: engraved(source.periode),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Maten. Eenheid: de hoogte van een gewone beker is ongeveer 1,3. De sokkel
// staat los en begint onder y = 0; de beker zelf staat op y = 0.
// ──────────────────────────────────────────────────────────────────────

export type Point = readonly [x: number, y: number];
/** Een kromme van vier punten (kubisch), voor een oor aan de rechterkant. */
export type Curve = readonly [Point, Point, Point, Point];

/** De hoogte van de sokkel onder elke vorm. */
export const SOKKEL_HEIGHT = 0.24;

const STEM_RADIUS = 0.075;
const WALL = 0.025;

/** Voet en steel, van de grond tot waar de kom begint. */
function footAndStem(voet: Voet): { points: Point[]; top: number } {
  const stem = voet === "hoog" ? 0.42 : 0.16;
  const bottom = 0.14;
  const top = bottom + stem;
  const mid = (bottom + top) / 2;
  return {
    points: [
      [0, 0],
      [0.4, 0],
      [0.42, 0.025],
      [0.4, 0.06],
      [0.24, 0.09],
      [0.11, bottom],
      [STEM_RADIUS, bottom + 0.02],
      [STEM_RADIUS, mid - 0.05],
      [0.12, mid],
      [STEM_RADIUS, mid + 0.05],
      [STEM_RADIUS, top],
    ],
    top,
  };
}

/** De straal van de kom op hoogte t (0 onder, 1 de rand), per vorm en silhouet. */
function bowlRadius(vorm: Vorm, silhouet: Silhouet, t: number): number {
  // Een klein uitlopende rand, zoals bij een echte beker.
  const lip = 0.03 * smoothstep(0.86, 1, t);
  if (vorm === "schaal") {
    const reach = silhouet === "slank" ? 0.62 : silhouet === "bol" ? 0.78 : 0.72;
    const curve = silhouet === "slank" ? Math.pow(t, 0.9) : silhouet === "bol" ? Math.sin((t * Math.PI) / 2) : 1 - Math.pow(1 - t, 1.6);
    return 0.09 + reach * curve + lip;
  }
  const narrow = vorm === "bokaal" ? 0.85 : 1;
  let shape: number;
  if (silhouet === "slank") shape = 0.26 * Math.pow(t, 0.8);
  else if (silhouet === "bol") shape = 0.4 * Math.sin(Math.PI * t * 0.85);
  else shape = 0.33 * (1 - Math.pow(1 - t, 2.2));
  return 0.09 + shape * narrow + lip;
}

function bowlHeight(vorm: Vorm): number {
  return vorm === "schaal" ? 0.2 : vorm === "bokaal" ? 0.75 : 0.8;
}

export type BodyProfile = {
  /** De buitenkant van de grond tot de rand, dan de binnenkant terug omlaag; voor een draaivorm. */
  lathe: Point[];
  /** Alleen de buitenkant, voor het silhouet. */
  outline: Point[];
  rim: Point;
  /** De deksel met knop (alleen bij een bokaal), ook een draaivorm. */
  lid: Point[] | null;
  /** Waar de kom begint en hoe hoog hij is: voor de oren. */
  bowl: { bottom: number; height: number };
};

const SAMPLES = 18;

/** Het profiel van beker, bokaal of schaal (null bij een medaille of de 1). */
export function bodyProfile(design: Pick<BekerDesign, "vorm" | "silhouet" | "voet">): BodyProfile | null {
  if (design.vorm === "medaille" || design.vorm === "een") return null;
  const base = footAndStem(design.voet);
  const height = bowlHeight(design.vorm);
  const outer: Point[] = [...base.points];
  for (let i = 1; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    outer.push([bowlRadius(design.vorm, design.silhouet, t), base.top + t * height]);
  }
  const rim = outer[outer.length - 1];
  const inner: Point[] = [[rim[0] - WALL, rim[1]]];
  for (let i = SAMPLES - 1; i >= 2; i--) {
    const t = i / SAMPLES;
    inner.push([Math.max(0.02, bowlRadius(design.vorm, design.silhouet, t) - WALL), base.top + t * height]);
  }
  inner.push([0, base.top + 0.06]);
  return {
    lathe: [...outer, ...inner],
    outline: outer,
    rim,
    lid: design.vorm === "bokaal" ? lidProfile(rim) : null,
    bowl: { bottom: base.top, height },
  };
}

/** Een gewelfde deksel op de rand, met een halsje en een bolletje erop. */
function lidProfile(rim: Point): Point[] {
  const [radius, y] = [rim[0] + 0.015, rim[1] + 0.005];
  const dome = 0.2;
  const points: Point[] = [
    [0, y],
    [radius, y],
  ];
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    const x = radius * Math.cos(a);
    if (x < 0.04) break;
    points.push([x, y + 0.02 + dome * Math.sin(a)]);
  }
  const neck = y + 0.02 + dome;
  points.push([0.035, neck], [0.035, neck + 0.04]);
  const ball = 0.07;
  const center = neck + 0.04 + ball;
  for (let i = 1; i <= 8; i++) {
    const b = (i / 8) * Math.PI;
    points.push([Math.max(0, ball * Math.sin(b)), center - ball * Math.cos(b)]);
  }
  return points;
}

/** De oren aan de rechterkant (de linker zijn het spiegelbeeld); leeg zonder oren. */
export function handleCurves(design: Pick<BekerDesign, "vorm" | "silhouet" | "voet" | "oren">): Curve[] {
  const profile = bodyProfile(design);
  if (!profile || !relevant(design.vorm).oren || design.oren === "geen") return [];
  const at = (t: number): Point => [
    bowlRadius(design.vorm, design.silhouet, t) - 0.01,
    profile.bowl.bottom + t * profile.bowl.height,
  ];
  if (design.oren === "rond") {
    const top = at(0.82);
    const bottom = at(0.3);
    return [[top, [top[0] + 0.3, top[1] + 0.02], [bottom[0] + 0.32, bottom[1] - 0.02], bottom]];
  }
  // Vleugels: hoog boven de rand uit en dan in een boog terug naar de buik.
  const top = at(0.95);
  const bottom = at(0.42);
  return [[top, [top[0] + 0.22, top[1] + 0.3], [bottom[0] + 0.48, bottom[1] + 0.02], bottom]];
}

/** Bord, schijf en lint van een medaille, met het midden van het bord op x = 0. */
export const MEDAL = {
  board: { width: 0.9, height: 1.15, depth: 0.06 },
  disc: { radius: 0.3, thickness: 0.06, center: [0, 0.45] as Point },
  ribbon: { top: 1.08, spread: 0.18, bottomSpread: 0.07, width: 0.13 },
} as const;

/**
 * De omtrek van de 1, tegen de klok in vanaf linksonder: een voetje, de staander
 * en schuin links bovenaan de vlag. Uitgezaagd en dik gemaakt in three.js.
 */
export const ONE_OUTLINE: readonly Point[] = [
  [-0.3, 0],
  [0.3, 0],
  [0.3, 0.11],
  [0.16, 0.15],
  [0.16, 1.18],
  [-0.02, 1.18],
  [-0.34, 0.96],
  [-0.34, 0.85],
  [-0.12, 0.96],
  [-0.12, 0.15],
  [-0.3, 0.11],
];
/** Hoe dik de 1 is, van voor naar achter. */
export const ONE_DEPTH = 0.16;

/** Hoe groot het geheel is, met sokkel: voor de schaal in de galerij en het plaatje. */
export function trophyBounds(design: BekerDesign): { height: number; radius: number; sokkelWidth: number } {
  if (design.vorm === "een") {
    // Breed genoeg voor twee regels gravure.
    return { height: SOKKEL_HEIGHT + 1.18, radius: 0.36, sokkelWidth: 0.9 };
  }
  if (design.vorm === "medaille") {
    const width = MEDAL.board.width + 0.2;
    return { height: SOKKEL_HEIGHT + MEDAL.board.height, radius: width / 2, sokkelWidth: width };
  }
  const profile = bodyProfile(design)!;
  const top = profile.lid ? Math.max(...profile.lid.map((point) => point[1])) : profile.rim[1];
  const bodyRadius = Math.max(...profile.outline.map((point) => point[0]));
  const handleReach = Math.max(0, ...handleCurves(design).flat().map((point) => point[0]));
  // Een kubische kromme komt niet tot zijn middelste punten: zo'n driekwart.
  const radius = Math.max(bodyRadius, handleReach * 0.85 + 0.03);
  const handleTop = Math.max(0, ...handleCurves(design).flat().map((point) => point[1]));
  return {
    height: SOKKEL_HEIGHT + Math.max(top, handleTop * 0.92),
    radius,
    sokkelWidth: Math.max(0.7, Math.min(1.5, bodyRadius * 2 + 0.16)),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Het plaatje (SVG), voor het profiel, lijsten en de kast zonder WebGL.
// ──────────────────────────────────────────────────────────────────────

/** De omtrek van beker, bokaal of schaal als SVG-pad, in de eenheden hierboven (y omhoog). */
export function silhouettePath(design: BekerDesign): string {
  if (design.vorm === "een") return `M ${ONE_OUTLINE.map(([x, y]) => `${fmt(x)} ${fmt(-y)}`).join(" L ")} Z`;
  const profile = bodyProfile(design);
  if (!profile) return "";
  const right = profile.outline;
  const left = [...right].reverse().map(([x, y]) => [-x, y] as Point);
  const ring = [...right, ...left];
  const body = `M ${ring.map(([x, y]) => `${fmt(x)} ${fmt(-y)}`).join(" L ")} Z`;
  if (!profile.lid) return body;
  const lid = profile.lid.slice(1);
  const lidRing = [...lid, ...[...lid].reverse().map(([x, y]) => [-x, y] as Point)];
  return `${body} M ${lidRing.map(([x, y]) => `${fmt(x)} ${fmt(-y)}`).join(" L ")} Z`;
}

/** De oren als SVG-pad (lijnen, met een dikke streek te tekenen), links en rechts. */
export function handlesPath(design: BekerDesign): string {
  return handleCurves(design)
    .flatMap((curve) => [curve, curve.map(([x, y]) => [-x, y] as Point) as unknown as Curve])
    .map(([a, b, c, d]) => `M ${fmt(a[0])} ${fmt(-a[1])} C ${fmt(b[0])} ${fmt(-b[1])} ${fmt(c[0])} ${fmt(-c[1])} ${fmt(d[0])} ${fmt(-d[1])}`)
    .join(" ");
}

function fmt(value: number): string {
  return (Math.round(value * 1000) / 1000).toString();
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** In een zin, voor schermlezers en het beheer: "Gouden bokaal met vleugels op een marmeren sokkel". */
export function describeDesign(design: BekerDesign): string {
  const metal = { goud: "gouden", zilver: "zilveren", brons: "bronzen" }[design.metaal];
  const sokkel = { zwart: "zwarte", hout: "houten", marmer: "marmeren" }[design.sokkel];
  if (design.vorm === "een") return `${capitalize(metal)} nummer 1 op een ${sokkel} sokkel`;
  if (design.vorm === "medaille") {
    return `${capitalize(metal)} medaille aan een ${LABELS.lint[design.lint].toLowerCase()} lint, op een ${sokkel} sokkel`;
  }
  const noun = LABELS.vorm[design.vorm].toLowerCase();
  const ears = relevant(design.vorm).oren && design.oren !== "geen"
    ? design.oren === "rond" ? " met ronde oren" : " met vleugels"
    : "";
  // "een gouden schaal", "gouden beker": het lidwoord laten we weg.
  return `${capitalize(metal)} ${noun}${ears}, ${LABELS.silhouet[design.silhouet].toLowerCase()}, op een ${sokkel} sokkel`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
