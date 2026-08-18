// Parsers voor de externe ID's op het profiel.
//
// Stonden eerst alleen in profile-external-links.tsx, waar ze puur bepaalden
// of er een chip getoond werd. De server action sloeg intussen élke tekst op,
// dus een profiel kon "weet ik niet" als Zwift-ID hebben. Nu is dit de enige
// bron: het formulier, de Zwift-dialoog en de server action gebruiken dezelfde
// regels.

const NUMERIC_ZWIFT_ID = /^\d+$/;
const STRAVA_HANDLE = /^[A-Za-z0-9._-]+$/;
const INTERVALS_ID = /^i\d+$/i;

/**
 * ZwiftPower en ZwiftRacing.app werken beide met het numerieke Zwift-ID.
 * Leden plakken vaak een profiel-URL; die wordt teruggebracht tot het nummer.
 */
export function zwiftId(raw: string | null | undefined): string | null {
  let id = (raw ?? "").trim();
  const pasted =
    id.match(/zwiftpower\.com\/profile\.php\?z=(\d+)/i) ??
    id.match(/zwiftracing\.app\/riders\/(\d+)/i) ??
    id.match(/zwift\.com\/[^\s]*?(\d{4,})/i);
  if (pasted) id = pasted[1];
  return NUMERIC_ZWIFT_ID.test(id) ? id : null;
}

/**
 * Strava accepteert zowel het atletennummer als de gebruikersnaam in de URL.
 * Een geplakte profiel-URL of een @-prefix wordt teruggebracht tot de handle;
 * alles met spaties of rare tekens levert geen link op.
 */
export function stravaHandle(raw: string | null | undefined): string | null {
  let handle = (raw ?? "").trim();
  const pasted = handle.match(/strava\.com\/athletes\/([^/?#]+)/i);
  if (pasted) handle = pasted[1];
  handle = handle.replace(/^@/, "");
  return STRAVA_HANDLE.test(handle) ? handle : null;
}

/**
 * intervals.icu gebruikt een athlete-ID in de vorm i141441. Een geplakte
 * profiel-URL wordt teruggebracht tot dat ID.
 */
export function intervalsId(raw: string | null | undefined): string | null {
  let id = (raw ?? "").trim();
  const pasted = id.match(/intervals\.icu\/athlete\/([^/?#]+)/i);
  if (pasted) id = pasted[1];
  return INTERVALS_ID.test(id) ? id.toLowerCase() : null;
}
