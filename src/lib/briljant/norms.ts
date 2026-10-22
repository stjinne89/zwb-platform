// De ijkwaarden van ZWBriljant: tien klassen, en per facet de waarde die bij
// elk niveau hoort.
//
// De score is het niveau zelf (op het scherm in punten, 100 per niveau). Er is
// geen plafond: voorbij Diamant (9) loopt de schaal met dezelfde stap door, en de
// records liggen daar ver boven (records.ts).
//
// Puur en zonder database. De bron van elke rij staat in
// docs/zwbriljant-onderzoek.md. Geen studie koppelt vermogen aan niveaus van
// 1 tot 9; de ijkwaarden zijn inschattingen van ZWB op basis van de literatuur
// ("estimate") en staan zo ook op /hulp.

export type Level = {
  /** 0 tot en met 9; klasse n begint bij n × 100 punten. */
  n: number;
  /** De naam bij de algemene score. Racen hangt bewust niet aan zo'n groep (zie ZRS_ANCHORS). */
  name: string;
  /** Kleur van de steen: die van de vELO-klasse. */
  color: string;
  /** Metaal (Koper tot Platina) of edelsteen (Amethist tot Diamant). */
  kind: "metaal" | "edelsteen";
};

/**
 * De tien klassen: namen, volgorde en kleuren van vELO (ZwiftRacing.app,
 * reference/categories, gelezen 2026-10-21), de grenzen van ZWB: 100 punten per
 * klasse, op de ijkwaarden hieronder (eigenaar, 2026-10-21). Koper is alles onder
 * de eerste norm; Diamant is zwaar maar haalbaar. Wie de norm van een klasse
 * haalt, staat in die klasse.
 */
export const LEVELS: readonly Level[] = [
  { n: 0, name: "Koper", color: "#f19269", kind: "metaal" },
  { n: 1, name: "Brons", color: "#754514", kind: "metaal" },
  { n: 2, name: "Zilver", color: "#8e8e8e", kind: "metaal" },
  { n: 3, name: "Goud", color: "#d9b24e", kind: "metaal" },
  { n: 4, name: "Platina", color: "#d8dfdf", kind: "metaal" },
  { n: 5, name: "Amethist", color: "#9966cc", kind: "edelsteen" },
  { n: 6, name: "Saffier", color: "#0f52ba", kind: "edelsteen" },
  { n: 7, name: "Smaragd", color: "#009473", kind: "edelsteen" },
  { n: 8, name: "Robijn", color: "#9b111e", kind: "edelsteen" },
  // De recordwaarden: wat er van de allerbeste renners bekend is (zie het onderzoek).
  { n: 9, name: "Diamant", color: "#82d5f7", kind: "edelsteen" },
];

/** De klasse bij een niveau (de score of een facet); voorbij Diamant blijft het Diamant. */
export function levelOf(level: number): Level {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Math.floor(level + 1e-9)))];
}

export type Sex = "man" | "vrouw";

/**
 * Een schaal: de waarde die 0 oplevert, en per niveau (1 tot en met 9) de
 * waarde die erbij hoort. `lowerIsBetter` draait de richting om (durability:
 * minder verval is beter).
 */
export type Anchors = {
  zero: number;
  levels: readonly [number, number, number, number, number, number, number, number, number];
  lowerIsBetter?: boolean;
  /** Een inschatting van ZWB, niet rechtstreeks uit een bron. */
  estimate?: boolean;
};

export type PowerDuration = "s15" | "m1" | "m5" | "m20";

/**
 * Vermogen in W/kg per duur, verdeeld naar de spreiding (eigenaar, 2026-10-21),
 * net als fitheid. Bron: de Zwift-populatie per leeftijd en geslacht (onderste
 * 10%, gemiddeld, bovenste 10%; Zwift Insider), leeftijd 30 tot 49, met 5% erbij
 * omdat niet elke rit een maximale inspanning is. De spreiding volgt uit de
 * afstand tot de 10%-grenzen (1,28 standaarddeviatie). Brons tot en met Smaragd
 * liggen per duur een halve standaarddeviatie uit elkaar: Brons gemiddeld min één,
 * Goud het gemiddelde, Smaragd plus twee; nul is gemiddeld min twee. De 15
 * seconden staan niet in de Zwift-cijfers: afgeleid uit de 5 seconden (× 0,83,
 * een inschatting). Zo zijn de duren onderling eerlijk; eerst was Brons op de
 * minuut pas het bovenste derde, op 20 minuten al het onderste achtste.
 *
 * Robijn en Diamant volgen sinds 2026-10-21 dezelfde stappen (eigenaar: Diamant
 * moet haalbaar zijn, zwaar maar wel te halen): Robijn plus 2,5, Diamant plus 3
 * standaarddeviaties, ongeveer de beste 1 op 1000. Daarboven loopt de schaal met
 * dezelfde stap door, zonder plafond; de records (ongeveer 7 W/kg over 20 minuten)
 * liggen daar ver boven, rond 1100 tot 1250 punten (records.ts). Eerst waren
 * Robijn de WorldTour-winnaars en Diamant de records, en was Diamant onhaalbaar.
 */
const POWER = {
  man: {
    s15: { zero: 1.1, levels: [4.05, 5.55, 7.05, 8.55, 10.05, 11.55, 13.05, 14.55, 16.05], estimate: true },
    m1: { zero: 1.7, levels: [3.2, 3.9, 4.65, 5.4, 6.15, 6.9, 7.65, 8.4, 9.15], estimate: true },
    m5: { zero: 1.5, levels: [2.5, 3, 3.5, 4, 4.55, 5.05, 5.55, 6.05, 6.55], estimate: true },
    m20: { zero: 1.3, levels: [2.15, 2.6, 3.05, 3.45, 3.9, 4.35, 4.75, 5.2, 5.6], estimate: true },
  },
  vrouw: {
    s15: { zero: 0.95, levels: [3.1, 4.15, 5.25, 6.3, 7.35, 8.45, 9.5, 10.55, 11.6], estimate: true },
    m1: { zero: 1.45, levels: [2.6, 3.2, 3.8, 4.35, 4.95, 5.55, 6.1, 6.7, 7.25], estimate: true },
    m5: { zero: 1.2, levels: [2.1, 2.55, 3, 3.45, 3.9, 4.3, 4.75, 5.2, 5.65], estimate: true },
    m20: { zero: 1.05, levels: [1.85, 2.25, 2.6, 3, 3.4, 3.8, 4.15, 4.55, 4.95], estimate: true },
  },
} as const satisfies Record<Sex, Record<PowerDuration, Anchors>>;

/** Zonder opgegeven geslacht de waarden voor mannen. */
export function powerAnchors(duration: PowerDuration, sex: Sex | null): Anchors {
  return POWER[sex === "vrouw" ? "vrouw" : "man"][duration];
}

/**
 * De versie van de schalen. Een snapshot onthoudt met welke versie hij gerekend
 * is (`provenance.scale`); oudere tellen niet mee in de tijdlijn en de terugblik
 * wordt opnieuw gemaakt, want er staan alleen niveaus in, geen metingen om opnieuw
 * mee te rekenen.
 */
export const SCALE_VERSION = "2026-10-22-ctl40";

/**
 * De vorige versie. Migratie 0269 zet die stenen om naar SCALE_VERSION; tot dan
 * mag de terugblik ze niet opruimen, anders valt er niets meer om te zetten.
 */
export const PREVIOUS_SCALE_VERSION = "2026-10-21-sd3";

/**
 * Zwift Racing Score (0–1000) als doorlopende lijn: elke ZRS-punt is een punt, dus
 * Diamant vanaf 900 ZRS en 1000 ZRS is 1000 punten (sinds 2026-10-21; eerst was 1000
 * ZRS precies Diamant en dus onhaalbaar). Bewust niet gekoppeld aan Zwift's
 * categorieën: een score is geen groep. Omdat ZRS bij 1000 ophoudt, komt deze facet
 * nooit boven 1000 punten.
 */
export const ZRS_ANCHORS: Anchors = {
  zero: 0,
  levels: [100, 200, 300, 400, 500, 600, 700, 800, 900],
};

/**
 * Fitheid als CTL (trainingsbelasting over 42 dagen, TSS per dag), verdeeld naar de
 * spreiding onder amateurs in plaats van in gelijke stappen naar de profs
 * (eigenaar, 2026-10-21: "100 is voor een amateur zeer hoog"). Goud ligt sinds
 * 2026-10-22 op CTL 40, op dezelfde basis als vermogen: het gemiddelde van alle
 * renners, niet van wie gestructureerd traint (eigenaar). Met Goud op 50 stond de
 * club op fitheid twee à drie klassen lager dan op vermogen (mediaan CTL 43, Zilver).
 * Een spreiding van ongeveer 20, Brons tot Smaragd een halve standaarddeviatie (10)
 * uit elkaar, van 20 tot 100 (Diamant); daarboven telt elke 10 CTL 100 punten door,
 * dus de WorldTour in het seizoen (150) is 1400. Eerst 30 tot 110, daarvoor 15, 30,
 * 45, 65, 85, 105, 125, 150, 180.
 */
export const CTL_ANCHORS: Anchors = {
  zero: 0,
  levels: [20, 30, 40, 50, 60, 70, 80, 90, 100],
  estimate: true,
};

/**
 * Durability als verval in procenten per 10 kJ/kg voorafgaand werk, op de beste
 * minuut (sinds 2026-10-21; eerst de beste 20 of 5 minuten). De ijkwaarden zijn
 * afgeleid uit het verval van het hele vermogensprofiel: WorldTour ongeveer 1,5 en
 * ProTeam 2,2 (Mateo-March 2022, na 45 kJ/kg, voor alle duren van 10 s tot 2 uur),
 * succesvolle amateurs ongeveer 5 en minder succesvolle ongeveer 9,6 (Barsumyan
 * 2025, op 20 minuten na 1000 kJ). Voor de minuut zijn ze dus een inschatting.
 * Minder verval is beter. Sinds 2026-10-21 is Diamant het niveau van de WorldTour
 * (1,5) en Robijn dat van ProTeam (2,2), zodat Diamant haalbaar is; daarboven loopt
 * de schaal door tot geen verval (rond 1100 punten). Eerst was Diamant 0,7.
 */
export const DURABILITY_ANCHORS: Anchors = {
  zero: 18,
  levels: [12.5, 9.5, 7, 5, 4, 3.2, 2.6, 2.2, 1.5],
  lowerIsBetter: true,
  estimate: true,
};

/** Durability telt pas vanaf zoveel voorafgaand werk; daaronder zegt het verval weinig. */
export const DURABILITY_MIN_KJ_PER_KG = 10;

/**
 * Het gewicht van elke facet in de score (onderbouwing in
 * docs/zwbriljant-onderzoek.md). Vermogen samen 50% (eigenaar, 2026-10-22: een
 * betere balans; eerst 60%), niet gelijk verdeeld: 5 minuten voorspelt het best
 * (Leo 2022; Mateo-March 2025), daarna 20 minuten, de minuut beslist Zwift-races
 * (Varesco 2025) en de sprint alleen sprintfinishes (van Erp 2021). Fitheid 15%
 * (eerst 10%): in de literatuur een zwakke voorspeller (Marchal 2025; Vermeire
 * 2019), maar de steen moet ook zeggen hoe fit je bent en wat je training oplevert
 * (eigenaar). De andere vrijgekomen 5% gelijk naar durability en racen, elk 17,5%.
 * De score telt de gewogen facetten op; een facet zonder gegevens draagt niets
 * bij (sinds 2026-10-22; eerst gingen de gewichten van de rest weer naar 100%).
 */
export const FACET_WEIGHTS = {
  sprint: 0.05,
  anaeroob: 0.1,
  vo2max: 0.2,
  drempel: 0.15,
  durability: 0.175,
  fitheid: 0.15,
  racen: 0.175,
} as const;
