// De tekst waarvoor een lid tekent bij het starten van een protocol. Een nieuwe
// tekst krijgt een nieuwe waarde, en die moet ook in de check-constraint van
// member_protocols.consent_version (0237). Zelfde uitzondering op de
// privacyversie als het eetdagboek, zie src/lib/privacy.ts.

export const PROTOCOL_CONSENT_VERSION = "2026-10-14";
