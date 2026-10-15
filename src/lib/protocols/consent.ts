// De tekst waarvoor een lid tekent bij het starten van een protocol. Een nieuwe
// tekst krijgt een nieuwe waarde, en die moet ook in de check-constraint van
// member_protocols.consent_version (0237, uitgebreid in 0238). Zelfde
// uitzondering op de privacyversie als het eetdagboek, zie src/lib/privacy.ts.
//
// 2026-10-14-core: bij een hitteprotocol leest ZWB de kerntemperatuur van een
// CORE-sensor uit intervals.icu. Alleen runs met deze versie doen daaraan mee
// (core-fill.ts); wie onder de eerste tekst startte, tekende daar niet voor.

export const PROTOCOL_CONSENT_VERSION = "2026-10-14-core";

/** Alle versies die de database accepteert, oudste eerst. */
export const PROTOCOL_CONSENT_VERSIONS = ["2026-10-14", PROTOCOL_CONSENT_VERSION] as const;
