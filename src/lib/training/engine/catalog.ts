// De catalogus van de regelmotor: vorm + tijd + niveau → een uitgeschreven
// sessie. Geparametriseerd in plaats van een vaste lijst: een drempelsessie is
// "N x M min" en past zich aan de tijd en het niveau aan. Zie
// docs/eigen-regelmotor.md, "Catalogus".
//
// Vertrekpunt zijn de standaardworkouts uit de bibliotheek (migraties 0107,
// 0194, 0221, 0227 en 0228): hun opbouw, herstel en notities zijn door de
// eigenaar goedgekeurd. Doelen volgen de promptregels in defaultTrainingPrompt,
// ook waar de bibliotheek daar nog van afwijkt (drempel 95-102 % wordt 95-100 %
// of 90-95 %, VO2max 115-125 % wordt 110-118 %).
//
// Doelen staan altijd in %FTP, zodat blockToPowerTarget ze ook zonder FTP kan
// lezen; de notitie draagt RPE plus wattage, of RPE plus gevoelstaal.

import type {
  BuildSession,
  CatalogSession,
  SessionForm,
  SessionRequest,
} from "@/lib/training/engine/types";
import {
  alignBlockIntensity,
  plannedWorkoutIntensity,
  type WorkoutBlock,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

type Range = [number, number];

/** Minuten die een deel van de sessie mag duren: minimaal, gewoon, ruim. */
type Span = { min: number; def: number; max: number };

type BlockSpec = {
  label: string;
  minutes: number;
  range: Range;
  note: string;
  burstSeconds?: number;
  /** Een versnelling, geen sprint: de burst gaat niet voluit (openers). */
  burstEasy?: boolean;
  onOff?: { onSeconds: number; offSeconds: number; offPct: number };
  /** Werkblok van vo2max, anaeroob of sprint: krijgt de notitie lage cadans. */
  cadence?: boolean;
};

type BuildContext = { ftp: number | null; lowCadence: boolean };

// ---------------------------------------------------------------------------
// Notities: RPE en wattage op dezelfde band, zoals de prompt vraagt
// ---------------------------------------------------------------------------

const RPE_BANDS: Array<{ upTo: number; low: number; high: number; feel: string }> = [
  { upTo: 60, low: 2, high: 3, feel: "heel licht" },
  { upTo: 70, low: 4, high: 4, feel: "rustig, praattempo" },
  { upTo: 80, low: 5, high: 5, feel: "stevig, praten in zinnen" },
  { upTo: 89, low: 6, high: 6, feel: "comfortabel zwaar" },
  { upTo: 104, low: 7, high: 7, feel: "zwaar, korte zinnen" },
  { upTo: 118, low: 8, high: 8, feel: "erg zwaar, enkele woorden" },
  { upTo: 135, low: 9, high: 9, feel: "bijna voluit" },
  { upTo: Infinity, low: 10, high: 10, feel: "voluit" },
];

function rpeBand(pct: number) {
  return RPE_BANDS.find((band) => pct <= band.upTo) ?? RPE_BANDS[RPE_BANDS.length - 1];
}

/** "RPE 6" of, als het doel twee banden raakt, "RPE 2-4". */
function rpeLabel(range: Range): string {
  const low = rpeBand(range[0]).low;
  const high = rpeBand(range[1]).high;
  return low === high ? `RPE ${low}` : `RPE ${low}-${high}`;
}

function watts(ftp: number, pct: number) {
  return Math.round((ftp * pct) / 100);
}

/** "RPE 7, 225-238w" bij bekende FTP, anders "RPE 7, zwaar, korte zinnen". */
function effort(range: Range, ftp: number | null): string {
  const rpe = rpeLabel(range);
  if (ftp) return `${rpe}, ${watts(ftp, range[0])}-${watts(ftp, range[1])}w`;
  return `${rpe}, ${rpeBand(range[1]).feel}`;
}

function blockNotes(spec: BlockSpec, context: BuildContext): string {
  const parts: string[] = [];
  if (spec.onOff) {
    parts.push(
      `${spec.onOff.onSeconds} sec aan: ${effort(spec.range, context.ftp)}.`,
      `${spec.onOff.offSeconds} sec rustig op ${spec.onOff.offPct}%.`,
    );
  } else if (spec.burstSeconds) {
    parts.push(
      `${spec.burstSeconds} sec ${spec.burstEasy ? "versnellen, niet voluit" : "voluit (RPE 10)"}, daarna losdraaien: ${effort(spec.range, context.ftp)}.`,
    );
  } else {
    parts.push(`${effort(spec.range, context.ftp)}.`);
  }
  if (spec.note) parts.push(spec.note);
  if (spec.cadence && context.lowCadence) parts.push("Lage cadans 50-70.");
  return parts.join(" ");
}

function makeBlock(spec: BlockSpec, context: BuildContext): WorkoutBlock {
  const block: WorkoutBlock = {
    label: spec.label,
    durationMinutes: spec.minutes,
    target: `${spec.range[0]}-${spec.range[1]}%`,
    notes: blockNotes(spec, context),
    intensity: "endurance",
    ...(spec.burstSeconds ? { burstSeconds: spec.burstSeconds } : {}),
    ...(spec.onOff
      ? {
          onOff: {
            onSeconds: spec.onOff.onSeconds,
            offSeconds: spec.onOff.offSeconds,
            offTarget: `${spec.onOff.offPct}%`,
          },
        }
      : {}),
  };
  return alignBlockIntensity(block, context.ftp);
}

// ---------------------------------------------------------------------------
// Vaste bouwstenen
// ---------------------------------------------------------------------------

const WARMUP_RANGE: Range = [50, 65];
const COOLDOWN_RANGE: Range = [45, 55];
const EASY_RANGE: Range = [65, 70];
const ENDURANCE_NOTES = [
  "Gelijkmatig, cadans 85-95.",
  "Eet en drink op tijd.",
  "Rustig blijven, ook op de klimmetjes.",
];

/** Kleiner dan dit wordt geen los duurblok: de minuten gaan naar in- en uitrijden. */
const MIN_PAD_MINUTES = 5;

const warmup = (minutes: number): BlockSpec => ({
  label: "Warming-up",
  minutes,
  range: WARMUP_RANGE,
  note: "Rustig oplopend.",
});

const cooldown = (minutes: number): BlockSpec => ({
  label: "Cooling-down",
  minutes,
  range: COOLDOWN_RANGE,
  note: "Uitdraaien.",
});

const easy = (minutes: number, note = ENDURANCE_NOTES[0]): BlockSpec => ({
  label: "Rustige duur",
  minutes,
  range: EASY_RANGE,
  note,
});

/** Een lang duurblok in stukken van hooguit 75 minuten, elk met een eigen notitie. */
function easyChunks(minutes: number): BlockSpec[] {
  const count = minutes > 90 ? Math.ceil(minutes / 75) : 1;
  const base = Math.floor(minutes / count);
  return Array.from({ length: count }, (_, index) =>
    easy(index < minutes - base * count ? base + 1 : base, ENDURANCE_NOTES[index % ENDURANCE_NOTES.length]),
  );
}

function sprintSeries(series: number, prefix = "Sprint"): BlockSpec[] {
  return Array.from({ length: 3 }, (_, index) => ({
    label: `${prefix} ${series}.${index + 1}`,
    minutes: 5,
    range: [50, 58] as Range,
    note: "Zittend.",
    burstSeconds: 30,
  }));
}

/**
 * Verdeel de vrije minuten over in- en uitrijden: eerst tot de gewone lengte,
 * dan een los rustig duurblok, en wat daarvoor te weinig is tot de ruime lengte.
 */
function fillOverhead(rest: number, warm: Span, cool: Span) {
  let remaining = Math.max(0, rest);
  const grow = (current: number, to: number) => {
    const add = Math.max(0, Math.min(remaining, to - current));
    remaining -= add;
    return current + add;
  };
  let warmMinutes = grow(warm.min, warm.def);
  let coolMinutes = grow(cool.min, cool.def);
  let pad = 0;
  if (remaining >= MIN_PAD_MINUTES) {
    pad = remaining;
    remaining = 0;
  }
  warmMinutes = grow(warmMinutes, warm.max);
  coolMinutes = grow(coolMinutes, cool.max);
  return { warmMinutes, coolMinutes, pad };
}

// ---------------------------------------------------------------------------
// Intervalvormen: N herhalingen werk met herstel ertussen
// ---------------------------------------------------------------------------

type IntervalVariant = {
  work: BlockSpec;
  rest: { label?: string; minutes: number; range: Range; note: string };
  /** Herhalingen bij level 0 en level 1 (per serie, als er series zijn). */
  reps: [number, number];
  series?: { count: number; restMinutes: number };
  title: (reps: number) => string;
  description: string;
};

type IntervalForm = {
  kind: "interval";
  warmup: Span;
  cooldown: Span;
  variants: IntervalVariant[];
  methodLabel?: CatalogSession["methodLabel"];
  fallbackIntensity: WorkoutIntensity;
};

type SteadyCore = { blocks: BlockSpec[]; title: string; description: string };

type SteadyForm = {
  kind: "steady";
  warmup: Span;
  cooldown: Span;
  /** Ondergrens voor het deel tussen in- en uitrijden. */
  coreMin: number;
  /** Aantal varianten waar `variant` tussen kiest. */
  variants?: number;
  build: (coreMinutes: number, totalMinutes: number, variant: number) => SteadyCore;
  fallbackIntensity: WorkoutIntensity;
};

const INTERVAL_WARMUP: Span = { min: 10, def: 15, max: 20 };
const INTERVAL_COOLDOWN: Span = { min: 5, def: 10, max: 15 };

const RECOVERY_BETWEEN: Range = [50, 60];
const FULL_RECOVERY: Range = [45, 55];
const THRESHOLD_SHORT: Range = [95, 100];
const THRESHOLD_LONG: Range = [90, 95];

function intensive(minutes: number, reps: Range, note: string): IntervalVariant {
  return {
    work: { label: "Intensieve duur", minutes, range: [71, 80], note },
    rest: { label: "Rustige duur", minutes: 5, range: EASY_RANGE, note: "Terug naar duurtempo." },
    reps,
    title: (n) => `Intensieve duur ${n}x${minutes}`,
    description: `Blokken van ${minutes} minuten intensieve duur.`,
  };
}

function tempo(minutes: number, restMinutes: number, reps: Range, note: string): IntervalVariant {
  return {
    work: { label: "Tempo", minutes, range: [81, 86], note },
    rest: { minutes: restMinutes, range: RECOVERY_BETWEEN, note: "Rustig uitdraaien." },
    reps,
    title: (n) => `Tempo ${n}x${minutes}`,
    description: `Blokken van ${minutes} minuten tempo.`,
  };
}

function sweetspot(minutes: number, restMinutes: number, reps: Range, note: string): IntervalVariant {
  return {
    work: { label: "Sweet spot", minutes, range: [87, 89], note },
    rest: { minutes: restMinutes, range: RECOVERY_BETWEEN, note: "Rustig uitdraaien." },
    reps,
    title: (n) => `Sweet spot ${n}x${minutes}`,
    description: `Blokken van ${minutes} minuten net onder de drempel.`,
  };
}

function threshold(minutes: number, restMinutes: number, reps: Range, note: string): IntervalVariant {
  // Promptregel: 15 minuten of langer op 90-95 %, korter hooguit 100 %.
  const range = minutes >= 15 ? THRESHOLD_LONG : THRESHOLD_SHORT;
  return {
    work: { label: "Drempel", minutes, range, note },
    rest: { minutes: restMinutes, range: [50, 58], note: "Volledig lossen." },
    reps,
    title: (n) => `Drempel ${n}x${minutes}`,
    description: `Blokken van ${minutes} minuten op de drempel.`,
  };
}

function vo2max(minutes: number, range: Range, reps: Range, note: string): IntervalVariant {
  return {
    work: { label: "VO2max", minutes, range, note, cadence: true },
    rest: { minutes, range: FULL_RECOVERY, note: "Volledig lossen." },
    reps,
    title: (n) => `VO2max ${n}x${minutes}`,
    description: `Blokken van ${minutes} minuten VO2max.`,
  };
}

/** Korte herhalingen onder een minuut: één blok van hele minuten met onOff. */
function vo2maxOnOff(onSeconds: number, offSeconds: number, minutes: number, reps: Range): IntervalVariant {
  const perBlock = Math.round((minutes * 60) / (onSeconds + offSeconds));
  return {
    work: {
      label: `VO2max ${onSeconds}/${offSeconds}`,
      minutes,
      range: [110, 118],
      note: "Houd elke herhaling even hard.",
      onOff: { onSeconds, offSeconds, offPct: 50 },
      cadence: true,
    },
    rest: { minutes: 5, range: FULL_RECOVERY, note: "Volledig lossen." },
    reps,
    title: (n) => `VO2max ${n}x${perBlock} ${onSeconds}/${offSeconds}`,
    description: `Series van ${perBlock} keer ${onSeconds} seconden aan, ${offSeconds} seconden uit.`,
  };
}

const FORMS: Record<SessionForm, IntervalForm | SteadyForm> = {
  herstel: {
    kind: "steady",
    warmup: { min: 5, def: 5, max: 5 },
    cooldown: { min: 5, def: 5, max: 5 },
    coreMin: 20,
    fallbackIntensity: "recovery",
    build: (core, total) => ({
      blocks: [{ label: "Losdraaien", minutes: core, range: [50, 58], note: "Hoge cadans, lichte weerstand." }],
      title: `Herstel ${total} min`,
      description: "Losdraaien zonder prikkel.",
    }),
  },
  rustige_duur: {
    kind: "steady",
    warmup: { min: 10, def: 10, max: 15 },
    cooldown: { min: 5, def: 10, max: 10 },
    coreMin: 15,
    fallbackIntensity: "endurance",
    build: (core, total) => ({
      blocks: easyChunks(core),
      title: `Rustige duur ${total} min`,
      description: "Gelijkmatige duurrit voor de aerobe basis.",
    }),
  },
  lange_duur: {
    kind: "steady",
    warmup: { min: 15, def: 15, max: 15 },
    cooldown: { min: 10, def: 10, max: 15 },
    coreMin: 65,
    variants: 4,
    fallbackIntensity: "endurance",
    build: longRide,
  },
  intensieve_duur: {
    kind: "interval",
    warmup: INTERVAL_WARMUP,
    cooldown: INTERVAL_COOLDOWN,
    fallbackIntensity: "endurance",
    variants: [
      intensive(15, [2, 4], "Gelijkmatig, cadans 85-95."),
      intensive(20, [2, 3], "Stevig doorrijden zonder te forceren."),
      intensive(10, [3, 5], "Stevig maar ontspannen."),
    ],
  },
  tempo: {
    kind: "interval",
    warmup: INTERVAL_WARMUP,
    cooldown: INTERVAL_COOLDOWN,
    fallbackIntensity: "tempo",
    variants: [
      tempo(15, 6, [2, 4], "Gelijkmatig vermogen, cadans 85-95."),
      tempo(20, 6, [2, 3], "Blijf onder je drempel."),
      tempo(25, 10, [2, 3], "Zoek een stabiel ritme."),
    ],
  },
  sweetspot: {
    kind: "interval",
    warmup: INTERVAL_WARMUP,
    cooldown: INTERVAL_COOLDOWN,
    fallbackIntensity: "tempo",
    variants: [
      sweetspot(10, 5, [3, 5], "Net onder drempel; nog net geen zuurbrand."),
      sweetspot(15, 5, [2, 4], "Gelijkmatig vermogen aanhouden."),
      sweetspot(20, 5, [2, 3], "Bewaak je cadans, laat 'm niet zakken."),
      sweetspot(30, 10, [2, 2], "Verdeel je krachten over het hele blok."),
    ],
  },
  drempel: {
    kind: "interval",
    warmup: INTERVAL_WARMUP,
    cooldown: INTERVAL_COOLDOWN,
    fallbackIntensity: "threshold",
    variants: [
      threshold(8, 5, [3, 5], "Rond je FTP; controle houden."),
      threshold(12, 6, [2, 4], "Gelijkmatig; niet te hard starten."),
      threshold(20, 10, [2, 3], "Vind je ritme in de eerste 5 minuten."),
      threshold(15, 5, [2, 4], "Bewaak je houding en ademhaling."),
    ],
  },
  vo2max: {
    kind: "interval",
    warmup: INTERVAL_WARMUP,
    cooldown: INTERVAL_COOLDOWN,
    fallbackIntensity: "vo2max",
    variants: [
      vo2max(4, [108, 118], [4, 6], "Gelijkmatig; laatste minuut is de winst."),
      vo2max(3, [110, 118], [5, 8], "Eerste minuut niet te hard."),
      vo2max(5, [106, 115], [3, 5], "Deel in; blijf tot het einde op vermogen."),
      vo2maxOnOff(30, 15, 9, [2, 4]),
      vo2maxOnOff(40, 20, 10, [2, 3]),
    ],
  },
  anaeroob: {
    kind: "interval",
    warmup: INTERVAL_WARMUP,
    cooldown: INTERVAL_COOLDOWN,
    fallbackIntensity: "anaerobic",
    variants: [
      {
        work: { label: "Anaeroob", minutes: 1, range: [140, 160], note: "All-out maar gecontroleerd.", cadence: true },
        rest: { minutes: 3, range: FULL_RECOVERY, note: "Echt lossen tussen de blokken." },
        reps: [6, 10],
        title: (n) => `Anaeroob ${n}x1`,
        description: "Korte pijnblokken boven VO2max.",
      },
      {
        work: {
          label: "Anaeroob",
          minutes: 1,
          range: [135, 155],
          note: "Houd de laatste even hard als de eerste.",
          cadence: true,
        },
        rest: { minutes: 2, range: FULL_RECOVERY, note: "Kort maar volledig lossen." },
        reps: [8, 12],
        title: (n) => `Anaeroob ${n}x1`,
        description: "Volume aan korte, harde inspanningen.",
      },
      {
        work: {
          label: "Anaeroob",
          minutes: 1,
          range: [135, 155],
          note: "Hard weg, blijf staan op het pedaal.",
          cadence: true,
        },
        rest: { minutes: 2, range: FULL_RECOVERY, note: "Kort lossen." },
        reps: [4, 6],
        series: { count: 3, restMinutes: 6 },
        title: (n) => `Anaeroob 3x${n}x1`,
        description: "Series van korte, harde inspanningen; typisch racewerk.",
      },
    ],
  },
  sprint: {
    // De weinig-tijd-sessie uit de prompt: 15 min inrijden, 6 x 30 sec voluit in
    // blokken van 1 minuut, 4 min herstel, 10 min uitrijden.
    kind: "interval",
    warmup: INTERVAL_WARMUP,
    cooldown: INTERVAL_COOLDOWN,
    fallbackIntensity: "anaerobic",
    methodLabel: "veelbelovend",
    variants: [
      {
        work: { label: "Sprint", minutes: 1, range: [150, 180], note: "30 sec voluit, daarna uitrollen.", cadence: true },
        rest: { minutes: 4, range: FULL_RECOVERY, note: "Volledig herstellen." },
        reps: [6, 6],
        title: () => "Sprint 6x30s",
        description: "Zes sprints van 30 seconden voluit.",
      },
    ],
  },
  openers: {
    kind: "steady",
    warmup: { min: 10, def: 10, max: 15 },
    cooldown: { min: 5, def: 10, max: 10 },
    coreMin: 5 + openerMinutes(),
    fallbackIntensity: "endurance",
    build: (core, total) => ({
      blocks: [easy(core - openerMinutes()), ...openerBlocks()],
      title: `Openers ${total} min`,
      description: "Lichte rit met korte versnellingen voor een race of test.",
    }),
  },
};

// Function declarations: FORMS hierboven gebruikt ze al bij het laden.

/** Drie openers van een minuut met twee minuten los, dan twee korte bursts. */
function openerBlocks(): BlockSpec[] {
  const blocks: BlockSpec[] = [];
  for (let index = 1; index <= 3; index++) {
    blocks.push(
      { label: `Opener ${index}/3`, minutes: 1, range: [105, 115], note: "Net boven wedstrijdtempo." },
      { label: "Los", minutes: 2, range: [50, 58], note: "Losdraaien." },
    );
  }
  for (let index = 1; index <= 2; index++) {
    blocks.push({ label: `Burst ${index}/2`, minutes: 1, range: [50, 58], note: "", burstSeconds: 6, burstEasy: true });
  }
  return blocks;
}

function openerMinutes() {
  return openerBlocks().reduce((sum, block) => sum + block.minutes, 0);
}

/**
 * De lange rit: rustige duur, of een van de varianten uit de bibliotheek die
 * duur blijven (oplopend, sprints, souplesse). Varianten met drempel- of
 * tempoblokken laat de catalogus weg: daar verschuift het kernwerk en heet de
 * rit geen duurrit meer.
 */
function longRide(core: number, total: number, variant: number): SteadyCore {
  const plain: SteadyCore = {
    blocks: easyChunks(core),
    title: `Lange duur ${total} min`,
    description: "Lange rit voor het aerobe fundament.",
  };
  switch (variant) {
    case 1: {
      const first = Math.round(core * 0.4);
      const second = Math.round(core * 0.35);
      return {
        blocks: [
          { label: "Rustige duur", minutes: first, range: [65, 68], note: "Bewust rustig; eet en drink op tijd." },
          { label: "Rustige duur", minutes: second, range: [68, 70], note: "Iets hoger, nog steeds praattempo." },
          {
            label: "Intensieve duur",
            minutes: core - first - second,
            range: [71, 80],
            note: "Stevig doorrijden zonder te forceren.",
          },
        ],
        title: `Lange duur ${total} oplopend`,
        description: "Elk deel iets harder; het laatste stuk op intensieve duur.",
      };
    }
    case 2: {
      const series = core >= 120 ? 3 : 2;
      const free = core - series * 15;
      const base = Math.floor(free / series);
      const blocks: BlockSpec[] = [];
      for (let index = 0; index < series; index++) {
        const minutes = index === series - 1 ? free - base * (series - 1) : base;
        blocks.push(easy(minutes, ENDURANCE_NOTES[index === 0 ? 0 : 1]), ...sprintSeries(index + 1));
      }
      return {
        blocks,
        title: `Lange duur ${total} met sprints`,
        description: `Rustige duurrit met ${series} series van drie sprints van 30 seconden.`,
      };
    }
    case 3: {
      const count = Math.min(6, Math.floor((core - 20) / 10));
      if (count < 3) return plain;
      const remaining = core - (count * 10 - 5);
      const before = Math.floor(remaining / 3);
      const blocks: BlockSpec[] = [easy(before)];
      for (let index = 1; index <= count; index++) {
        blocks.push({
          label: `Souplesse ${index}/${count}`,
          minutes: 5,
          range: [71, 80],
          note: "Cadans 105-115, niet stuiteren op het zadel.",
        });
        if (index < count) blocks.push(easy(5, "Vrije cadans."));
      }
      blocks.push(easy(remaining - before, ENDURANCE_NOTES[1]));
      return {
        blocks,
        title: `Lange duur ${total} souplesse`,
        description: `Duurrit met ${count} blokken op hoge cadans.`,
      };
    }
    default:
      return plain;
  }
}

// ---------------------------------------------------------------------------
// Opbouw
// ---------------------------------------------------------------------------

function clampLevel(level: number) {
  return Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
}

function variantIndex(variant: number, count: number) {
  const n = Number.isFinite(variant) ? Math.floor(variant) : 0;
  return ((n % count) + count) % count;
}

function coreMinutes(variant: IntervalVariant, reps: number) {
  const set = reps * variant.work.minutes + (reps - 1) * variant.rest.minutes;
  if (!variant.series) return set;
  return variant.series.count * set + (variant.series.count - 1) * variant.series.restMinutes;
}

function minimalMinutes(form: IntervalForm, variant: IntervalVariant) {
  return coreMinutes(variant, variant.reps[0]) + form.warmup.min + form.cooldown.min;
}

/** De kortste sessie die deze vorm nog zinvol maakt: minimale kern, kort in- en uitrijden. */
export function minSessionMinutes(form: SessionForm): number {
  const spec = FORMS[form];
  if (spec.kind === "steady") return spec.warmup.min + spec.coreMin + spec.cooldown.min;
  return Math.min(...spec.variants.map((variant) => minimalMinutes(spec, variant)));
}

function intervalCore(variant: IntervalVariant, reps: number): BlockSpec[] {
  const work = (label: string): BlockSpec => ({ ...variant.work, label });
  const rest = (label: string): BlockSpec => ({
    label,
    minutes: variant.rest.minutes,
    range: variant.rest.range,
    note: variant.rest.note,
  });
  const restLabel = variant.rest.label ?? "Herstel";
  const blocks: BlockSpec[] = [];
  if (!variant.series) {
    for (let index = 1; index <= reps; index++) {
      blocks.push(work(`${variant.work.label} ${index}/${reps}`));
      if (index < reps) blocks.push(rest(`${restLabel} ${index}/${reps - 1}`));
    }
    return blocks;
  }
  const { count, restMinutes } = variant.series;
  for (let series = 1; series <= count; series++) {
    for (let index = 1; index <= reps; index++) {
      blocks.push(work(`${variant.work.label} ${series}.${index}`));
      if (index < reps) blocks.push(rest(restLabel));
    }
    if (series < count) {
      blocks.push({
        label: `Serieherstel ${series}`,
        minutes: restMinutes,
        range: variant.rest.range,
        note: "Volledig uitdraaien.",
      });
    }
  }
  return blocks;
}

function finish(
  request: SessionRequest,
  context: BuildContext,
  specs: BlockSpec[],
  fields: { title: string; description: string; fallbackIntensity: WorkoutIntensity; methodLabel?: CatalogSession["methodLabel"] },
): CatalogSession {
  const blocks = specs.filter((spec) => spec.minutes > 0).map((spec) => makeBlock(spec, context));
  const { intensity } = plannedWorkoutIntensity(
    { intensity: fields.fallbackIntensity, structure_json: blocks },
    context.ftp,
  );
  return {
    form: request.form,
    title: fields.title,
    description: fields.description,
    intensity,
    targetType: context.ftp ? "power" : "rpe",
    blocks,
    durationMinutes: blocks.reduce((sum, block) => sum + block.durationMinutes, 0),
    methodLabel: fields.methodLabel ?? "geen",
  };
}

function knownFtp(ftp: number | null): number | null {
  return ftp != null && Number.isFinite(ftp) && ftp > 0 ? ftp : null;
}

function buildInterval(form: IntervalForm, request: SessionRequest, max: number, limit: number) {
  const level = clampLevel(request.level);
  const start = variantIndex(request.variant, form.variants.length);
  const overhead = form.warmup.min + form.cooldown.min;
  // De gekozen variant, anders de eerstvolgende die in de gewenste tijd past,
  // anders de eerstvolgende die nog binnen de bovengrens past.
  const order = form.variants.map((_, step) => form.variants[(start + step) % form.variants.length]);
  const variant =
    order.find((candidate) => minimalMinutes(form, candidate) <= limit) ??
    order.find((candidate) => minimalMinutes(form, candidate) <= max);
  if (variant) {
    const [minReps, maxReps] = variant.reps;
    let reps = minReps + Math.round(level * (maxReps - minReps));
    while (reps > minReps && coreMinutes(variant, reps) + overhead > limit) reps--;
    const core = coreMinutes(variant, reps);
    const { warmMinutes, coolMinutes, pad } = fillOverhead(limit - core - overhead, form.warmup, form.cooldown);
    return {
      specs: [
        warmup(warmMinutes),
        ...intervalCore(variant, reps),
        ...(pad > 0 ? [easy(pad)] : []),
        cooldown(coolMinutes),
      ],
      title: variant.title(reps),
      description: variant.description,
    };
  }
  return null;
}

function steadyOverhead(span: Span, total: number) {
  if (total < 60) return span.min;
  if (total < 150) return span.def;
  return span.max;
}

function buildSteady(form: SteadyForm, request: SessionRequest, max: number, limit: number) {
  const minimum = form.warmup.min + form.coreMin + form.cooldown.min;
  if (max < minimum) return null;
  const total = Math.max(limit, minimum);
  let warmMinutes = steadyOverhead(form.warmup, total);
  let coolMinutes = steadyOverhead(form.cooldown, total);
  if (total - warmMinutes - coolMinutes < form.coreMin) {
    warmMinutes = form.warmup.min;
    coolMinutes = form.cooldown.min;
  }
  const core = form.build(total - warmMinutes - coolMinutes, total, variantIndex(request.variant, form.variants ?? 1));
  const warm = request.form === "herstel"
    ? { ...warmup(warmMinutes), range: COOLDOWN_RANGE, note: "Rustig op gang komen." }
    : warmup(warmMinutes);
  return {
    specs: [warm, ...core.blocks, cooldown(coolMinutes)],
    title: core.title,
    description: core.description,
  };
}

export const buildSession: BuildSession = (request) => {
  const form = FORMS[request.form];
  if (!form) return null;
  const max = Math.floor(request.maxMinutes);
  if (!Number.isFinite(max) || max <= 0) return null;
  const target = Number.isFinite(request.targetMinutes) ? Math.floor(request.targetMinutes) : max;
  const limit = Math.max(0, Math.min(target, max));
  const context: BuildContext = { ftp: knownFtp(request.ftpWatts), lowCadence: request.lowCadence === true };

  const built = form.kind === "interval"
    ? buildInterval(form, request, max, limit)
    : buildSteady(form, request, max, limit);
  if (!built) return null;
  return finish(request, context, built.specs, {
    title: built.title,
    description: built.description,
    fallbackIntensity: form.fallbackIntensity,
    methodLabel: form.kind === "interval" ? form.methodLabel : undefined,
  });
};

/** Kortste rit met sprints voor de overgangsperiode: drie series en tien minuten ertussen. */
export const TRANSITION_RIDE_MIN_MINUTES = 80;

/**
 * De rit voor de overgangsperiode na het laatste A- of B-mikpunt: rustige duur
 * met drie series van drie sprints van 30 seconden, elke sprint een blok van
 * 5 minuten op 50-58 % met burstSeconds 30, en 10 minuten rustige duur tussen de
 * series (promptregel "Overgangsperiode", methodLabel "veelbelovend"). Null als
 * de minuten daar niet voor volstaan.
 */
export function transitionRide(minutes: number, ftp: number | null): CatalogSession | null {
  const total = Math.floor(minutes);
  if (!Number.isFinite(total) || total < TRANSITION_RIDE_MIN_MINUTES) return null;
  const warm: Span = { min: 10, def: 15, max: 20 };
  const cool: Span = { min: 5, def: 10, max: 15 };
  const fixed = 3 * 15 + 2 * 10;
  const { warmMinutes, coolMinutes, pad } = fillOverhead(total - fixed - warm.min - cool.min, warm, cool);
  const specs: BlockSpec[] = [
    warmup(warmMinutes),
    ...(pad > 0 ? easyChunks(pad) : []),
    ...sprintSeries(1),
    easy(10, "Rustig blijven."),
    ...sprintSeries(2),
    easy(10, "Rustig blijven."),
    ...sprintSeries(3),
    cooldown(coolMinutes),
  ];
  const request: SessionRequest = {
    form: "rustige_duur",
    targetMinutes: total,
    maxMinutes: total,
    ftpWatts: ftp,
    level: 0,
    variant: 0,
  };
  return finish(request, { ftp: knownFtp(ftp), lowCadence: false }, specs, {
    title: `Rustige duur ${total} met sprints`,
    description: "Rustige duurrit met drie series van drie sprints van 30 seconden.",
    fallbackIntensity: "endurance",
    methodLabel: "veelbelovend",
  });
}
