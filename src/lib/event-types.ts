export const EVENT_TYPES = [
  { value: "gran_fondo", label: "Gran Fondo" },
  { value: "toertocht", label: "Toertocht" },
  { value: "gravel_race", label: "Gravel race" },
  { value: "outdoor", label: "Outdoor rit" },
  { value: "zrl", label: "ZRL race" },
  { value: "ladder", label: "Ladder race" },
  { value: "flamme_rouge", label: "Flamme Rouge" },
  { value: "social", label: "Social" },
  { value: "training", label: "Training" },
  { value: "zwift", label: "Zwift" },
  { value: "mywhoosh", label: "MyWhoosh" },
  { value: "src", label: "Sunday Race Club" },
  { value: "omnium", label: "ZWB Omnium" },
  { value: "overig", label: "Overig" },
] as const;

export const EVENT_TYPE_VALUES = EVENT_TYPES.map((type) => type.value);

export const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map((type) => [type.value, type.label]),
);

export type EventTypeColor = {
  /** Bolletje in het kalenderfilter. */
  dot: string;
  /** Gekleurde rand links van de kalenderregel. */
  bar: string;
  /** Het typelabel zelf. */
  badge: string;
};

/**
 * Kleur per eventtype op de kalender. Verwante types delen een familie:
 * buitenritten groen, clubraces warm, de virtuele platforms blauw. De namen
 * staan voluit, anders vindt Tailwind de klassen niet.
 */
export const EVENT_TYPE_COLORS: Record<string, EventTypeColor> = {
  gran_fondo: {
    dot: "bg-emerald-600",
    bar: "before:bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  toertocht: {
    dot: "bg-lime-500",
    bar: "before:bg-lime-500",
    badge: "bg-lime-100 text-lime-900 dark:bg-lime-500/20 dark:text-lime-200",
  },
  gravel_race: {
    dot: "bg-amber-700",
    bar: "before:bg-amber-700",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-600/25 dark:text-amber-200",
  },
  outdoor: {
    dot: "bg-teal-500",
    bar: "before:bg-teal-500",
    badge: "bg-teal-100 text-teal-900 dark:bg-teal-500/20 dark:text-teal-200",
  },
  zrl: {
    dot: "bg-orange-500",
    bar: "before:bg-orange-500",
    badge: "bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200",
  },
  ladder: {
    dot: "bg-red-500",
    bar: "before:bg-red-500",
    badge: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
  },
  flamme_rouge: {
    dot: "bg-rose-600",
    bar: "before:bg-rose-600",
    badge: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200",
  },
  src: {
    dot: "bg-pink-500",
    bar: "before:bg-pink-500",
    badge: "bg-pink-100 text-pink-900 dark:bg-pink-500/20 dark:text-pink-200",
  },
  omnium: {
    dot: "bg-fuchsia-600",
    bar: "before:bg-fuchsia-600",
    badge: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
  },
  zwift: {
    dot: "bg-blue-500",
    bar: "before:bg-blue-500",
    badge: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200",
  },
  mywhoosh: {
    dot: "bg-cyan-500",
    bar: "before:bg-cyan-500",
    badge: "bg-cyan-100 text-cyan-900 dark:bg-cyan-500/20 dark:text-cyan-200",
  },
  training: {
    dot: "bg-indigo-500",
    bar: "before:bg-indigo-500",
    badge: "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-200",
  },
  social: {
    dot: "bg-violet-500",
    bar: "before:bg-violet-500",
    badge: "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200",
  },
  overig: {
    dot: "bg-slate-400",
    bar: "before:bg-slate-400",
    badge: "bg-slate-200 text-slate-900 dark:bg-slate-500/25 dark:text-slate-200",
  },
};

export function eventTypeColor(type: string | null | undefined): EventTypeColor {
  return EVENT_TYPE_COLORS[type ?? ""] ?? EVENT_TYPE_COLORS.overig;
}

/**
 * Clubraces: competities waar ZWB als club of in teams aan meedoet. Het
 * dashboard zet ze boven de overige events.
 */
export const CLUB_RACE_TYPES: string[] = ["zrl", "ladder", "flamme_rouge", "omnium", "src"];
