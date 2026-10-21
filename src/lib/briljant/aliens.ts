// ZWBriljant: de Aliens, profs met een steen uit hun gepubliceerde vermogensdata
// (eigenaar, 2026-10-21). Gemeten waarden (hun eigen Strava- of TrainingPeaks-
// bestand) en breed geaccepteerde schattingen (de power-analyses van Velo en
// Cyclingnews, peer-reviewed onderzoek); ter inspiratie, niet als meting van ZWB.
//
// Per onderdeel telt een inspanning die hooguit 15% korter is dan de duur, of
// hooguit twee keer zo lang: een langere inspanning is een ondergrens voor de
// kortere. Een onderdeel zonder zo'n waarde blijft leeg; wie minder dan vier
// onderdelen heeft, doet niet mee. Het onderzoek per renner staat in
// docs/zwbriljant-onderzoek.md.

import type { PowerDuration } from "./norms";
import type { BriljantInput } from "./score";
import { briljantView, type BriljantView } from "./view";

export type AlienMeasurement = {
  /** In W/kg, met het gewicht dat de bron gebruikte. */
  wkg: number;
  watts: number;
  /** Wedstrijd, jaar en de werkelijke duur van de inspanning. */
  effort: string;
  kind: "gemeten" | "schatting";
  source: string;
};

export type Alien = {
  id: string;
  name: string;
  /** Kort, boven de kolom bij vergelijken. */
  short: string;
  power: Partial<Record<PowerDuration, AlienMeasurement>>;
};

/** Zoveel onderdelen met een waarde zijn nodig om mee te doen. */
export const MIN_ALIEN_MEASUREMENTS = 4;

const VDP_FLANDERS_2022 = "https://road.cc/content/news/mathieu-van-der-poel-uploads-tour-flanders-win-strava-291643";
const POGACAR_UAE_2025 = "https://velo.outsideonline.com/road/power-analysis-pogacar-dominates-uae-tour/";

export const ALIENS: Alien[] = [
  {
    id: "alien-pogacar",
    name: "Tadej Pogačar",
    short: "Pogačar",
    power: {
      s15: { watts: 800, wkg: 12.3, effort: "UAE Tour 2025, sprint op Jebel Jais (20 s)", kind: "schatting", source: POGACAR_UAE_2025 },
      m1: {
        watts: 640,
        wkg: 9.8,
        effort: "Ronde van Vlaanderen 2026, Oude Kwaremont (1:13)",
        kind: "schatting",
        source: "https://velo.outsideonline.com/road/road-racing/tour-of-flanders-power-analysis-2026",
      },
      m5: { watts: 490, wkg: 7.5, effort: "UAE Tour 2025, Jebel Hafeet (5:31)", kind: "schatting", source: POGACAR_UAE_2025 },
      // Berg (2025, Journal of Science and Cycling), nagekeken door Peter Leo.
      m20: {
        watts: 453,
        wkg: 6.9,
        effort: "Tour de France 2024, Plateau de Beille (38:38)",
        kind: "schatting",
        source: "https://velo.outsideonline.com/road/road-racing/pogacar-data-tour-de-france/",
      },
    },
  },
  {
    id: "alien-van-der-poel",
    name: "Mathieu van der Poel",
    short: "MvdP",
    power: {
      // Zijn Strava-bestanden; 75 kg is zijn Strava-gewicht.
      s15: { watts: 1137, wkg: 1137 / 75, effort: "Ronde van Vlaanderen 2022, slotsprint", kind: "gemeten", source: VDP_FLANDERS_2022 },
      m1: { watts: 727, wkg: 727 / 75, effort: "Ronde van Vlaanderen 2022, Berg ten Houte", kind: "gemeten", source: VDP_FLANDERS_2022 },
      m5: { watts: 502, wkg: 502 / 75, effort: "Ronde van Vlaanderen 2022, Oude Kwaremont", kind: "gemeten", source: VDP_FLANDERS_2022 },
      m20: {
        watts: 378,
        wkg: 5.17,
        effort: "Amstel Gold Race 2019, beste 20 minuten",
        kind: "gemeten",
        source: "https://www.cyclingweekly.com/news/racing/mathieu-van-der-poel-shares-incredible-data-amstel-gold-race-strava-421180",
      },
    },
  },
];

/** De Aliens die genoeg onderdelen met een waarde hebben. */
export const SHOWN_ALIENS = ALIENS.filter((alien) => Object.keys(alien.power).length >= MIN_ALIEN_MEASUREMENTS);

/** De steen van een Alien: alleen de onderdelen met een waarde, zonder consistentie. */
export function alienView(alien: Alien): BriljantView {
  const at = (duration: PowerDuration) => alien.power[duration]?.wkg ?? null;
  const input: BriljantInput = {
    sex: "man",
    weightKg: null,
    power: { s15: at("s15"), m1: at("m1"), m5: at("m5"), m20: at("m20") },
    fatigue: [],
    ctl: null,
    zrs: null,
  };
  return briljantView({ seed: alien.id, input, consistency: null });
}
