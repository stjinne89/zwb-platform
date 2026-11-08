// Gedeeld tussen server en client: welke trainingen een rit kan zijn geweest.
// Bewust zonder imports, zodat een clientcomponent geen serverlogica meetrekt.

/** Keuzewaarde voor "deze rit hoort bij geen training". */
export const NO_WORKOUT = "geen";

export type RideLink = {
  activityId: string;
  /** De training waar de rit nu aan hangt; null als hij ongepland staat. */
  workoutId: string | null;
  /** Zelf ingevoerd (Rit invoeren): het lid kan hem weer verwijderen. */
  manual?: boolean;
  /** Een andere rit overlapt deze: het lid kan de dubbele opname weghalen (0310). */
  duplicate?: boolean;
  /** Naam en dag van de rit, voor bij een training. */
  rideLabel: string;
  options: Array<{ workoutId: string; label: string }>;
  /** Gereden trainingen van dezelfde dag waar deze rit bij kan (0306). */
  joinOptions?: Array<{ parentId: string; label: string }>;
  /** Ritten die al bij deze rit horen; samen één training. */
  parts?: Array<{ activityId: string; label: string }>;
};

/** Voorvoegsel van een keuze in "Hoort bij" die de rit bij een andere rit zet. */
export const JOIN_PREFIX = "rit:";
