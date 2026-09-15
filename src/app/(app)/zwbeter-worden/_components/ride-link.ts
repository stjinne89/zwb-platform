// Gedeeld tussen server en client: welke trainingen een rit kan zijn geweest.
// Bewust zonder imports, zodat een clientcomponent geen serverlogica meetrekt.

/** Keuzewaarde voor "deze rit hoort bij geen training". */
export const NO_WORKOUT = "geen";

export type RideLink = {
  activityId: string;
  /** De training waar de rit nu aan hangt; null als hij ongepland staat. */
  workoutId: string | null;
  /** Naam en dag van de rit, voor bij een training. */
  rideLabel: string;
  options: Array<{ workoutId: string; label: string }>;
};
