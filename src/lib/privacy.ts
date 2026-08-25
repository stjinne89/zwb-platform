/**
 * Versiebeheer op de privacyverklaring.
 *
 * Toestemming geldt voor de tekst die iemand voorgelegd kreeg, niet voor elke
 * latere versie daarvan. Verandert er inhoudelijk iets — een nieuwe verwerking,
 * een nieuwe ontvanger, een nieuwe categorie gegevens — dan is de oude
 * toestemming die wijziging niet meer gedekt en moet het lid opnieuw tekenen.
 *
 * Sinds de eerste verklaring is dat vier keer gebeurd, en niet cosmetisch: er
 * kwamen achtereenvolgens trainersinzage, terugschrijven naar Strava, live
 * locatie plus ZWBlokken, en gezondheidsgegevens bij. Dat laatste is een
 * bijzondere categorie onder de AVG.
 *
 * **Een versie erbij zetten laat élk lid opnieuw tekenen.** Doe dat dus alleen
 * bij een inhoudelijke wijziging van `/privacy`, niet bij een herformulering of
 * een typefout. De datum is die van de wijziging zelf.
 */
export const PRIVACY_VERSIONS = [
  "2026-05-31", // eerste verklaring
  "2026-07-28", // trainer ziet trainingsbelasting, eFTP en powercurve
  "2026-07-30", // samenvatting terugschrijven naar de Strava-omschrijving
  "2026-08-07", // live locatie tijdens tracking, en grofmazig bereden gebied
  "2026-08-18", // gezondheidsgegevens: klachtenlogboek en herstelwaarden
] as const;

export type PrivacyVersion = (typeof PRIVACY_VERSIONS)[number];

/** De versie waar een lid vandaag akkoord op geeft. */
export const PRIVACY_STATEMENT_VERSION: PrivacyVersion =
  PRIVACY_VERSIONS[PRIVACY_VERSIONS.length - 1];

/**
 * Is de vastgelegde toestemming nog de huidige?
 *
 * Op gelijkheid en niet op "nieuwer dan", zodat een teruggedraaide versie ook
 * klopt: staat er iets anders dan de huidige tekst, dan vragen we het opnieuw.
 * `null` betekent nooit getekend — zie `0138` voor wie dat zijn en waarom.
 */
export function privacyConsentIsCurrent(version: string | null | undefined): boolean {
  return version === PRIVACY_STATEMENT_VERSION;
}

/** Voor de leesbare regel onder aan de verklaring zelf. */
export function formatPrivacyVersion(version: string = PRIVACY_STATEMENT_VERSION): string {
  const [year, month, day] = version.split("-").map(Number);
  const months = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];
  return `${day} ${months[month - 1]} ${year}`;
}
