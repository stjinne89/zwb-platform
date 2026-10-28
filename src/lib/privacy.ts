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
 *
 * **Eén bewuste uitzondering: het eetdagboek (2026-10-14).** Dat is een nieuwe
 * categorie gegevens, maar kreeg op besluit van de eigenaar geen versie hier.
 * Alleen wie Naleving aanzet levert die gegevens aan, en tekent daar apart voor
 * (`LOG_CONSENT_VERSION` in `src/lib/nutrition/log.ts`, tabel
 * `nutrition_log_settings`). Tekst herkennen (naar de AI-aanbieder) heeft daarbovenop
 * een eigen toestemming (`ai_consent_at`), net als de trainer laten meekijken
 * (`trainer_consent_at`). `/privacy` beschrijft het wel.
 *
 * **Tweede uitzondering, op dezelfde gronden: de protocollen (2026-10-14).**
 * Wie een protocol start, tekent per start (`PROTOCOL_CONSENT_VERSION` in
 * `src/lib/protocols/consent.ts`, kolom `member_protocols.consent_version`).
 * Niemand anders levert die gegevens aan. `/privacy#protocollen` beschrijft het.
 * Ook de kerntemperatuur van een CORE-sensor bij een hitteprotocol (0238) valt
 * daaronder: die tekst kreeg een eigen protocolversie (`2026-10-14-core`), en
 * alleen runs onder die versie worden uitgelezen.
 *
 * **Derde uitzondering: ZWBieb, eerst "Wie weet wat" (2026-10-15).** Onderwerpen,
 * spullen om uit te lenen (sinds 2026-10-16), tips en gesprekken tussen twee
 * leden levert alleen aan wie meedoet of een vraag stelt; die tekent daarvoor (`MEMBER_KNOWLEDGE_CONSENT_VERSION` in
 * `src/lib/zwbieb/consent.ts`, tabel `member_knowledge`).
 * `/privacy#zwbieb` beschrijft het.
 *
 * **Vierde uitzondering: voorZpWelBokaal (2026-10-19).** Inzetten, saldo en
 * bonusantwoorden van wie zelf op Meedoen tikt; het saldo staat op de lei voor
 * de club. Meedoen is de toestemming (`BOKAAL_CONSENT_VERSION` in
 * `src/lib/bokaal/rules.ts`, tabel `bokaal_players`), besluit eigenaar.
 * `/privacy#voorzpwelbokaal` beschrijft het.
 *
 * **Vijfde uitzondering, voorgesteld: Q&A (2026-10-19).** Een vraag over de
 * app levert alleen aan wie hem zelf stelt, en die kiest per vraag wie hem
 * leest (de club of alleen het bestuur); het stellen is de toestemming (tabel
 * `member_questions`, 0254). `/privacy#qa` beschrijft het. Of dit zonder
 * nieuwe versie mag, is aan de eigenaar (zie PLAN.md, ronde "Q&A").
 *
 * **Zesde uitzondering, voorgesteld: het gezin (2026-10-20).** Aantallen
 * mee-eters (volwassenen, kinderen met een hele of halve portie) en bij welke
 * maaltijden, voor het boodschappenlijstje (0259, `nutrition_profiles`).
 * Vrijwillig, alleen zichtbaar voor het lid zelf, geen namen of leeftijden.
 * `/privacy` beschrijft het onder "Gezin". Of dit zonder nieuwe versie mag, is
 * aan de eigenaar (zie PLAN.md, ronde "Boodschappenlijst"). Daaronder valt ook
 * welk recept een lid zelf op welke dag in zijn menu zet (0261,
 * `nutrition_menu_choices`), net als favorieten alleen voor het lid zelf;
 * `/privacy` noemt het bij "Lengte en eigen recepten".
 *
 * **Zevende uitzondering, voorgesteld: recepten delen met alle leden
 * (2026-10-21).** Een eigen recept is alleen zichtbaar voor andere leden als
 * het lid dat per recept kiest, en naam en profielfoto staan er alleen bij als
 * het lid dat aanzet (0264, `nutrition_recipes.visibility` en `show_owner`).
 * `/privacy` noemt het bij "Lengte en eigen recepten". Of dit zonder nieuwe
 * versie mag, is aan de eigenaar (zie PLAN.md, ronde "Recept van een link").
 *
 * **Achtste uitzondering, besluit eigenaar: ZWBriljant (2026-10-21).** De steen
 * rekent met gegevens die leden al gaven (intervals.icu, Zwift-ID, ritten,
 * schema, geslacht; sinds dezelfde dag niet meer de beschikbaarheid) en bewaart per week alleen afgeleide scores, voor het lid
 * zelf (0265, `zwbriljant_snapshots`); geen nieuwe categorie of ontvanger, dus
 * alleen de tekst (`/privacy#zwbriljant`). Sinds 0267 (2026-10-21) is je steen
 * standaard zichtbaar voor alle goedgekeurde leden en kun je hem verbergen
 * (`zwbriljant_preferences.visible`); daarvoor (0266) moest je zelf kiezen om te
 * delen. Sinds dezelfde dag krijgt elk lid met intervals.icu een steen, ook zonder
 * ZWBriljant te openen. Het anonieme ZWB-gemiddelde (vanaf vijf leden) telt iedereen mee. Alles
 * alleen in de tekst, geen nieuwe versie (eigenaar keurt de tekst goed).
 *
 * **Negende uitzondering, besluit eigenaar: de zweettest (2026-10-25).** Het
 * zweetverlies per uur is een lichaamsgegeven, maar alleen wie de test invult
 * levert het aan, en tekent bij de eerste test (`SWEAT_CONSENT_VERSION` in
 * `src/lib/nutrition/sweat.ts`, kolom `nutrition_sweat_tests.consent_version`,
 * 0273). Het gewicht van voor en na wordt niet bewaard. Besluit 7 van
 * docs/ritvoeding-plan.md; de eigenaar keurde de tekst op `/privacy#zweettest`
 * goed op 2026-10-25.
 *
 * **Tiende uitzondering, voorgesteld: ZWBekers (2026-10-28).** Leden dragen een
 * prestatie van zichzelf, een ander lid of een team voor; het bestuur keurt
 * (0286). Nieuw is dat een lid gegevens over een ánder lid plaatst (naam bij
 * een prestatie, verhaal, eventueel een foto), die na goedkeuring alle
 * goedgekeurde leden zien. Dat lijkt op ritverslagen en verjaardagsfoto's, die
 * ook zonder nieuwe versie kwamen, maar of dat hier ook mag, is aan de
 * eigenaar: tekst op `/privacy#zwbekers`, nog niet goedgekeurd (zie PLAN.md,
 * ronde "ZWBekers").
 */
export const PRIVACY_VERSIONS = [
  "2026-05-31", // eerste verklaring
  "2026-07-28", // trainer ziet trainingsbelasting, eFTP en powercurve
  "2026-07-30", // samenvatting terugschrijven naar de Strava-omschrijving
  "2026-08-07", // live locatie tijdens tracking, en grofmazig bereden gebied
  "2026-08-18", // gezondheidsgegevens: klachtenlogboek en herstelwaarden
  "2026-09-13", // ZWB-segmentkaart en onderling clubklassement
  "2026-09-15", // ZWBlokken-titels tonen het opgegeven geslacht aan clubleden
  "2026-09-17", // coachchat: vrije tekst naar OpenAI, gesprek zichtbaar voor de trainer
  "2026-09-17-zwbgame", // tweede inhoudelijke wijziging vandaag: clubspel + sportdata-opt-in
  "2026-09-17-zwbgame-kracht", // ZWBgame leidt spelkwaliteiten af uit FTP, gewicht en Intervals-curve van alle leden
  "2026-09-30", // ritten via intervals.icu (met GPS-spoor) in badges, stats, cols en ZWBlokken, zichtbaar voor de club; trainingsdata blijft na ontkoppelen van intervals.icu, herstelwaarden niet
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
