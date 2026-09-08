// Bearer-controle voor de cron-endpoints.
//
// Stond vijf keer los gekopieerd, en gaf overal dezelfde nietszeggende
// afwijzing terug of het secret nu ontbrak op de server of de aanroeper de
// verkeerde waarde stuurde. Dat verschil kost bij het inrichten van een cron
// zomaar een uur: "403" zegt niet of je je header fout hebt of dat de
// omgevingsvariabele simpelweg niet gezet is.
//
// De reden onderscheidt die twee, zonder iets over het secret zelf prijs te
// geven: "niet geconfigureerd" is een eigenschap van de server, geen hint over
// de waarde.

export type CronAuthResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "mismatch"; message: string };

export function checkCronSecret(
  request: Request,
  envName: string,
): CronAuthResult {
  // .trim() vangt een onzichtbare newline af die bij kopiëren naar Netlify of
  // een cron-dienst zomaar meekomt -- een exacte vergelijking faalt daar op.
  const expected = process.env[envName]?.trim();
  if (!expected) {
    return {
      ok: false,
      reason: "not_configured",
      message: `${envName} is niet gezet op de server. Zet de variabele in Netlify en deploy daarna opnieuw: env-vars gelden pas vanaf een nieuwe deploy.`,
    };
  }

  const actual = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!actual || actual !== expected) {
    return {
      ok: false,
      reason: "mismatch",
      message:
        "Authorization-header ontbreekt of komt niet overeen. Verwacht: header 'Authorization' met als waarde 'Bearer <secret>'.",
    };
  }

  return { ok: true };
}
