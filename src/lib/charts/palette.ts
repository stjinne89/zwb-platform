/** Het thema definieert --chart-1 t/m --chart-5 (light en dark). */
export const SERIES_COLORS = [
  "var(--chart-3)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** Kleur voor vergelijkingsreeks n; --chart-1 blijft voor de eigen reeks. */
export function seriesColor(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

/** Zoveel vergelijkingsreeksen houden nog een eigen kleur. */
export const MAX_SERIES = SERIES_COLORS.length;
