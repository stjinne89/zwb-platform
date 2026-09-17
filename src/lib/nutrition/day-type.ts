// Wat voor brandstofdag is het? Afgeleid uit wat er gepland staat en wat er al
// gereden is. Duur en intensiteit zijn genoeg: de dagbanden in targets.ts zijn
// in de bronnen ook zo geformuleerd (uren en zwaarte), niet in kJ of TSS.

export const FUEL_DAY_TYPES = ["rust", "licht", "matig", "zwaar", "lang", "wedstrijd"] as const;
export type FuelDayType = (typeof FUEL_DAY_TYPES)[number];

export const FUEL_DAY_LABELS: Record<FuelDayType, string> = {
  rust: "Rustdag",
  licht: "Lichte dag",
  matig: "Matige dag",
  zwaar: "Zware dag",
  lang: "Lange dag",
  wedstrijd: "Wedstrijddag",
};

/** Een geplande training of gereden rit, teruggebracht tot wat voeding nodig heeft. */
export type FuelSession = {
  minutes: number;
  /** WorkoutIntensity uit het schema; null voor een gereden rit zonder schema. */
  intensity: string | null;
  /** Lokaal uur van de start (0–23), als dat bekend is. */
  startHour?: number | null;
};

const HARD_INTENSITIES = new Set(["threshold", "vo2max", "anaerobic"]);

/** Vanaf deze duur is het een lange dag: 8–12 g/kg (ACSM 2016). */
export const LONG_DAY_MINUTES = 180;

function classifySession(session: FuelSession): FuelDayType {
  const { minutes, intensity } = session;
  if (minutes <= 0 || intensity === "rest") return "rust";
  if (intensity === "race") return minutes >= LONG_DAY_MINUTES ? "wedstrijd" : "zwaar";
  if (minutes >= LONG_DAY_MINUTES) return "lang";
  if (intensity === "recovery" || minutes < 60) return "licht";
  if (HARD_INTENSITIES.has(intensity ?? "") || minutes >= 90) return "zwaar";
  return "matig";
}

const RANK: Record<FuelDayType, number> = {
  rust: 0,
  licht: 1,
  matig: 2,
  zwaar: 3,
  lang: 4,
  wedstrijd: 5,
};

/**
 * Het dagtype van een verzameling sessies op één dag. Twee sessies tellen op in
 * duur; de zwaarste intensiteit bepaalt of het een zware dag is.
 */
export function classifyFuelDay(sessions: FuelSession[]): FuelDayType {
  const real = sessions.filter((session) => session.minutes > 0 && session.intensity !== "rest");
  if (real.length === 0) return "rust";

  const byOwn = real.map(classifySession).sort((a, b) => RANK[b] - RANK[a])[0];
  if (real.length === 1) return byOwn;
  const total = real.reduce((sum, session) => sum + session.minutes, 0);
  const combined = classifySession({
    minutes: total,
    intensity: real.some((session) => session.intensity === "race") ? "race" : "endurance",
  });
  return RANK[combined] > RANK[byOwn] ? combined : byOwn;
}

/** Zware, lange of wedstrijddagen: daar hangt de kwaliteit van de sessie van brandstof af. */
export function isKeyDay(dayType: FuelDayType): boolean {
  return RANK[dayType] >= RANK.zwaar;
}

/** Totale fietsduur; een rustdag in het schema telt niet mee. */
export function totalMinutes(sessions: FuelSession[]): number {
  return sessions
    .filter((session) => session.intensity !== "rest")
    .reduce((sum, session) => sum + Math.max(0, session.minutes), 0);
}
