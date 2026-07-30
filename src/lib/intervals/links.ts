// Deeplinks naar intervals.icu. Pure functies, los van de API-client.
//
// Let op de URL-vorm: intervals.icu gebruikt /athlete/ (enkelvoud) en de
// weekweergave onder /activities met een ?w=-parameter die de MAANDAG van de
// week bevat. Een losse datum meegeven (of /athletes/ met een s) levert een
// lege pagina op.

const BASE = "https://intervals.icu";

/** Maandag van de week waarin `dateKey` (YYYY-MM-DD) valt, als datumsleutel. */
export function intervalsWeekStart(dateKey: string): string {
  const date = new Date(`${dateKey.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateKey.slice(0, 10);
  // getUTCDay: 0 = zondag. Verschuif zo dat maandag 0 wordt.
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/**
 * Weekweergave van een athlete. Zonder athleteId valt hij terug op de generieke
 * URL; intervals.icu stuurt de ingelogde gebruiker dan zelf door.
 */
export function intervalsWeekUrl(
  athleteId: string | null | undefined,
  dateKey?: string | null,
): string {
  const week = dateKey ? `?w=${intervalsWeekStart(dateKey)}` : "";
  return athleteId
    ? `${BASE}/athlete/${athleteId}/activities${week}`
    : `${BASE}/activities${week}`;
}
