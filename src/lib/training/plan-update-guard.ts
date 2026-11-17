/**
 * Is het antwoord op een herziening (plan_update) te kapot om te publiceren?
 *
 * Een herziening vervangt bij publicatie het hele bereik (publishRange): alles
 * wat er stond en niet terugkomt, valt weg. Op 17 november 2026 gaf de AI voor
 * Karen een samenvatting van een blok van zes weken, maar maar één echte
 * training plus een lege plaatshouder (datum "x", titel "x"). De plaatshouder
 * viel stil weg en de ene training verving 26 trainingen tot eind december,
 * ook in intervals.icu.
 *
 * Twee signalen, allebei ruim gekozen zodat een echte herziening erdoor komt:
 * - een training zonder geldige datum: dat is geen planning maar vulsel;
 * - minder dan een kwart van de trainingen die er in het venster stonden, terwijl
 *   dat er minstens zes waren. Een herziening die echt zoveel schrapt (ziek,
 *   geen tijd meer) hoort dat via de beschikbaarheid te doen, en die ruimt dagen
 *   zonder tijd zelf op; de AI laat dan niet driekwart van het schema leeg.
 *
 * Geeft de reden terug, of null als het antwoord gepubliceerd mag worden. Bij een
 * reden blijft het lopende schema staan.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Vanaf zoveel openstaande trainingen telt de kwart-regel. */
export const MIN_REMAINING_FOR_RATIO = 6;

type PlanUpdateInput = {
  fromDate?: unknown;
  toDate?: unknown;
  remainingWorkouts?: Array<{ date?: unknown }>;
};

function readPlanUpdate(promptSummary: string | null): PlanUpdateInput | null {
  try {
    const parsed = JSON.parse(promptSummary ?? "") as { planUpdate?: PlanUpdateInput };
    return parsed.planUpdate ?? null;
  } catch {
    return null;
  }
}

function isoDay(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const day = value.slice(0, 10);
  return ISO_DATE.test(day) && !Number.isNaN(Date.parse(day)) ? day : null;
}

export function brokenPlanUpdateReason(
  workouts: Array<{ date?: unknown }>,
  promptSummary: string | null,
): string | null {
  const invalid = workouts.filter((workout) => !isoDay(workout.date));
  if (invalid.length > 0) {
    return `Het AI-antwoord bevat ${invalid.length === 1 ? "een training" : `${invalid.length} trainingen`} zonder geldige datum; het lopende schema blijft staan.`;
  }

  const update = readPlanUpdate(promptSummary);
  if (!update) return null;
  const from = isoDay(update.fromDate);
  const to = isoDay(update.toDate);
  const inWindow = (day: string | null) =>
    day !== null && (!from || day >= from) && (!to || day <= to);

  const remaining = (update.remainingWorkouts ?? []).filter((workout) => inWindow(isoDay(workout.date)));
  if (remaining.length < MIN_REMAINING_FOR_RATIO) return null;

  const returned = workouts.filter((workout) => inWindow(isoDay(workout.date)));
  if (returned.length * 4 < remaining.length) {
    return `Het AI-antwoord geeft ${returned.length} van de ${remaining.length} trainingen in het venster terug; het lopende schema blijft staan.`;
  }
  return null;
}
