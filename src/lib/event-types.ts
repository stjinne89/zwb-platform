export const EVENT_TYPES = [
  { value: "gran_fondo", label: "Gran Fondo" },
  { value: "toertocht", label: "Toertocht" },
  { value: "gravel_race", label: "Gravel race" },
  { value: "outdoor", label: "Outdoor rit" },
  { value: "zrl", label: "ZRL race" },
  { value: "ladder", label: "Ladder race" },
  { value: "flamme_rouge", label: "Flamme Rouge" },
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

/**
 * Wat voor rit het is, los van de categorie hierboven: een Zwift-event kan een
 * training zijn, een buitenrit een social of voor een goed doel. Hooguit één
 * per event (migr. 0223; tot dan waren training en social zelf eventtypes.
 * Goed doel kwam erbij in 0225).
 */
export const EVENT_KINDS = [
  { value: "training", label: "Training" },
  { value: "social", label: "Social" },
  { value: "goed_doel", label: "Goed doel" },
] as const;

export const EVENT_KIND_VALUES: string[] = EVENT_KINDS.map((kind) => kind.value);

export const EVENT_KIND_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_KINDS.map((kind) => [kind.value, kind.label]),
);

/** Wat een lid op zijn profiel als interesse kan aanvinken. */
export const EVENT_INTEREST_OPTIONS = [...EVENT_TYPES, ...EVENT_KINDS];

/**
 * Het label van een event: "Zwift · Training". Bij Overig zegt de categorie
 * niets, dus dan staat alleen het soort er.
 */
export function eventLabel(type: string, kind?: string | null): string {
  const typeLabel = EVENT_TYPE_LABELS[type] ?? type;
  const kindLabel = kind ? EVENT_KIND_LABELS[kind] : undefined;
  if (!kindLabel) return typeLabel;
  return type === "overig" ? kindLabel : `${typeLabel} · ${kindLabel}`;
}

/**
 * Kleur per categorie op de kalender, in families: buitenritten lopen van groen
 * naar blauw (gravel amber), alles wat virtueel is van rood via oranje naar
 * geel, met ZRL naast Zwift en de Sunday Race Club naast MyWhoosh. `ink` is de
 * tekstkleur op een vol gekleurd label.
 */
const EVENT_TYPE_COLORS: Record<string, { color: string; ink: string }> = {
  gran_fondo: { color: "#059669", ink: "#ffffff" },
  toertocht: { color: "#14b8a6", ink: "#0f172a" },
  outdoor: { color: "#3b82f6", ink: "#ffffff" },
  gravel_race: { color: "#b45309", ink: "#ffffff" },
  flamme_rouge: { color: "#b91c1c", ink: "#ffffff" },
  ladder: { color: "#ef4444", ink: "#ffffff" },
  zrl: { color: "#ea580c", ink: "#ffffff" },
  zwift: { color: "#fb923c", ink: "#0f172a" },
  omnium: { color: "#f59e0b", ink: "#0f172a" },
  src: { color: "#eab308", ink: "#0f172a" },
  mywhoosh: { color: "#fde047", ink: "#0f172a" },
  overig: { color: "#94a3b8", ink: "#0f172a" },
};

export function eventTypeColor(type: string | null | undefined): string {
  return (EVENT_TYPE_COLORS[type ?? ""] ?? EVENT_TYPE_COLORS.overig).color;
}

export type EventColorStyle = {
  /** Rand links van de kalenderregel. */
  bar: string;
  /** Een training krijgt een bredere rand. */
  wideBar: boolean;
  badge: { backgroundColor: string; color?: string };
};

/**
 * De kleur van een kalenderregel. Het soort schuift de categoriekleur op: een
 * training is feller (volle kleur, brede rand), een social pastel. Een goed
 * doel houdt de gewone kleur; de kalender zet er een hartje bij.
 */
export function eventColorStyle(
  type: string | null | undefined,
  kind?: string | null,
): EventColorStyle {
  const { color, ink } = EVENT_TYPE_COLORS[type ?? ""] ?? EVENT_TYPE_COLORS.overig;
  if (kind === "training") {
    return { bar: color, wideBar: true, badge: { backgroundColor: color, color: ink } };
  }
  if (kind === "social") {
    return {
      bar: `color-mix(in oklab, ${color} 45%, white)`,
      wideBar: false,
      badge: {
        backgroundColor: `color-mix(in oklab, ${color} 30%, white)`,
        color: "#0f172a",
      },
    };
  }
  return {
    bar: color,
    wideBar: false,
    badge: { backgroundColor: `color-mix(in oklab, ${color} 20%, transparent)` },
  };
}

/**
 * Clubraces: competities waar ZWB als club of in teams aan meedoet. Het
 * dashboard zet ze boven de overige events.
 */
export const CLUB_RACE_TYPES: string[] = ["zrl", "ladder", "flamme_rouge", "omnium", "src"];
