// Alles of indoor: met welke intervals.icu-curve de vermogensweergaves van
// Teams, de indeling en de Club Ladder rekenen (2026-11-19). De keuze staat in
// een cookie, zodat ze op elke pagina met vermogen meeloopt; de indoorcurve
// staat in `rider_power_profiles.indoor_profile` (migratie 0343).

export type PowerScope = "all" | "indoor";

export const POWER_SCOPE_COOKIE = "zwb-power-scope";

export function parsePowerScope(value: string | null | undefined): PowerScope {
  return value === "indoor" ? "indoor" : "all";
}

/** De sleutels die de indoorcurve vervangt; FTP en gewicht blijven van de volledige rij. */
export const INDOOR_PROFILE_KEYS = [
  "watts_15s",
  "watts_30s",
  "watts_1m",
  "watts_2m",
  "watts_5m",
  "watts_10m",
  "watts_20m",
  "wkg_15s",
  "wkg_30s",
  "wkg_1m",
  "wkg_2m",
  "wkg_5m",
  "wkg_10m",
  "wkg_20m",
  "rider_type",
] as const;

export type IndoorProfile = Partial<Record<(typeof INDOOR_PROFILE_KEYS)[number], number | string | null>>;

function indoorObject(value: unknown): IndoorProfile | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as IndoorProfile) : null;
}

/**
 * De rij zoals de gekozen bron hem toont. Indoor zonder indoorcurve geeft lege
 * duren (en type onbekend): wie nooit binnen reed, heeft geen indoorwaarde, en
 * de volledige curve laten staan zou de vergelijking stil vertekenen.
 */
export function withPowerScope<T extends object>(row: T, scope: PowerScope): T {
  if (scope === "all") return row;
  const indoor = indoorObject((row as { indoor_profile?: unknown }).indoor_profile);
  const out = { ...row } as Record<string, unknown>;
  for (const key of INDOOR_PROFILE_KEYS) {
    if (!(key in out)) continue;
    out[key] = key === "rider_type" ? (indoor?.rider_type ?? "unknown") : (indoor?.[key] ?? null);
  }
  return out as T;
}
