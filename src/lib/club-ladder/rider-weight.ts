// Gewicht in de ladder-matchup en het route-advies.
//
// W/kg alleen zegt hoe snel je klimt. Op het vlakke telt het vermogen tegenover
// je luchtweerstand, en die groeit veel minder hard dan je gewicht: bij gelijke
// W/kg is een renner van 85 kg in de groep op het vlakke zo'n 19% sterker dan
// een van 65 kg, op 4% nog 4% en op 8% 2% (bij 4 W/kg). Vraag van de eigenaar
// (2026-11-04): het gewicht van de ploeg en van elke renner telt mee.
//
// Daarom rekenen we per renner zijn W/kg om naar de W/kg die de referentierenner
// (75 kg, 175 cm) nodig heeft om op dezelfde helling even hard te gaan, met de
// Zwift-ijking van de pacingplanner (`pacing/zwift-setup.ts`): CdA naar lengte
// en gewicht, de effectieve fietsmassa, rolweerstand 0,004 en slipstream in de
// groep. Iedereen krijgt Zwifts standaardlengte; die kennen we van de
// tegenstander niet. Welke hellingen een duur op een parcours vraagt, zegt
// `durationTerrain` in `routes.ts`.
//
// Sinds 2026-11-06 alleen bergop en in de sprint (15 s). Op de vlakke stukken van
// 1, 5 en 20 minuten valt in een groep met draft niemand weg: gewicht bepaalt
// daar hoeveel moeite het kost, niet wie er lost. Daar telt gewone W/kg. Eerder
// telde ook het vlak, en stond in ZWBeasts – Galaxy Avengers (The Muckle Yin)
// een renner met 1 W/kg meer op 1, 5 en 20 minuten maar ~20 kg lichter derde
// achter twee zware sprinters (vraag van de eigenaar).

import {
  DRAFT_CDA_FACTOR,
  frontalArea,
  ZWIFT_BASE_BIKE_KG,
  ZWIFT_BASE_CDA,
  ZWIFT_DEFAULT_HEIGHT_CM,
  ZWIFT_REF_HEIGHT_CM,
  ZWIFT_REF_WEIGHT_KG,
} from "@/lib/pacing/zwift-setup";
import type { DurationTerrain, PowerDuration } from "./routes";
import { DURATIONS, topFiveAverage, type PowerWkg } from "./team-power";

/** De renner waar alles naar wordt omgerekend: Zwifts referentiegewicht. */
export const REFERENCE_KG = ZWIFT_REF_WEIGHT_KG;
/** Minimaal aantal renners met gewicht per kant voordat gewicht meetelt, zoals het vermogen. */
export const MIN_WEIGHTS = 3;

const RHO = 1.225;
const G = 9.81;
const CRR = 0.004;
const REF_AREA = frontalArea(ZWIFT_REF_HEIGHT_CM, ZWIFT_REF_WEIGHT_KG);

/** Vermogen = a·v³ + b·v: lucht in de groep en klimmen plus rollen. */
function coefficients(kg: number, pct: number) {
  const theta = Math.atan(pct / 100);
  const a = (0.5 * RHO * ZWIFT_BASE_CDA * DRAFT_CDA_FACTOR * frontalArea(ZWIFT_DEFAULT_HEIGHT_CM, kg)) / REF_AREA;
  const b = (kg + ZWIFT_BASE_BIKE_KG) * G * (Math.sin(theta) + CRR * Math.cos(theta));
  return { a, b };
}

/** Snelheid bij dit vermogen: Newton vanaf rechts van de wortel, op een stijgende, bolle functie (b > 0 bergop en vlak). */
function speedAt(watts: number, a: number, b: number) {
  let v = Math.max(Math.cbrt(watts / a), watts / b);
  for (let i = 0; i < 30; i += 1) {
    const next = v - (a * v ** 3 + b * v - watts) / (3 * a * v * v + b);
    if (Math.abs(next - v) < 1e-9) return next;
    v = next;
  }
  return v;
}

/**
 * De W/kg die de referentierenner nodig heeft om op deze helling even hard te
 * gaan als een renner van `kg` met `wkg`. Gelijk aan `wkg` bij 75 kg.
 */
export function referenceWkg(wkg: number, kg: number, pct: number) {
  if (!(wkg > 0) || !(kg > 0)) return wkg;
  // Bergaf zou de vergelijking niet meer stijgend zijn; hellingen in het advies zijn 0% of meer.
  const slope = Math.max(0, pct);
  const rider = coefficients(kg, slope);
  const v = speedAt(wkg * kg, rider.a, rider.b);
  const ref = coefficients(REFERENCE_KG, slope);
  return (ref.a * v ** 3 + ref.b * v) / REFERENCE_KG;
}

/**
 * W/kg van een renner omgerekend naar 75 kg op wat elke duur op dit parcours
 * vraagt: bergop altijd, op het vlakke alleen voor de sprint (15 s).
 */
export function routeWkg(wkg: PowerWkg, kg: number, terrain: DurationTerrain): PowerWkg {
  const out: PowerWkg = { s15: null, m1: null, m5: null, m20: null };
  for (const d of DURATIONS) {
    const value = wkg[d];
    if (value == null || !(value > 0)) continue;
    const parts = terrain[d];
    const share = parts.reduce((sum, part) => sum + part.share, 0);
    if (!(share > 0)) {
      out[d] = value;
      continue;
    }
    // Meetkundig gemiddelde over de hellingen, zoals de verschillen elders als log-verschil tellen.
    const log =
      parts.reduce((sum, part) => {
        const counts = d === "s15" || part.pct > 0;
        return sum + part.share * Math.log(counts ? referenceWkg(value, kg, part.pct) : value);
      }, 0) / share;
    out[d] = Math.exp(log);
  }
  return out;
}

export type WeightedRider = { wkg: PowerWkg; weightKg: number | null };

const validKg = (kg: number | null | undefined): kg is number => kg != null && kg >= 30 && kg <= 200;

/** Gemiddeld gewicht van wie het heeft, op 0,1 kg; null zonder. */
export function averageWeight(riders: Array<{ weightKg: number | null }>): number | null {
  const known = riders.map((rider) => rider.weightKg).filter(validKg);
  if (known.length === 0) return null;
  return Math.round((known.reduce((sum, kg) => sum + kg, 0) / known.length) * 10) / 10;
}

/**
 * Gemiddeld gewicht om te tonen, op hele kilo's: pas vanaf drie renners met
 * gewicht, zodat het nooit het gewicht van één renner is.
 */
export function shownWeight(riders: Array<{ weightKg: number | null }>): number | null {
  if (riders.filter((rider) => validKg(rider.weightKg)).length < MIN_WEIGHTS) return null;
  const avg = averageWeight(riders);
  return avg == null ? null : Math.round(avg);
}

/** Telt gewicht mee: beide kanten hebben het van minstens drie renners. */
export function weightsUsable(...sides: Array<Array<{ weightKg: number | null }>>) {
  return sides.every((riders) => riders.filter((rider) => validKg(rider.weightKg)).length >= MIN_WEIGHTS);
}

/**
 * Het vermogen van een kant op dit parcours: per renner omgerekend naar 75 kg,
 * dan de vijf besten per duur. Wie geen gewicht heeft, krijgt het gemiddelde
 * van zijn kant. Zonder parcours of zonder gewicht gewoon de vijf besten in W/kg.
 */
export function sideRouteWkg(riders: WeightedRider[], terrain: DurationTerrain | null, useWeight: boolean): PowerWkg | null {
  if (riders.length === 0) return null;
  const fallback = averageWeight(riders);
  if (!terrain || !useWeight || fallback == null) return topFiveAverage(riders.map((rider) => rider.wkg));
  return topFiveAverage(riders.map((rider) => routeWkg(rider.wkg, validKg(rider.weightKg) ? rider.weightKg : fallback, terrain)));
}

/** Per duur het log-verschil (+ is wij sterker), null waar een kant niets heeft. */
export function logEdges(ours: PowerWkg | null, theirs: PowerWkg | null): Record<PowerDuration, number | null> {
  const out = { s15: null, m1: null, m5: null, m20: null } as Record<PowerDuration, number | null>;
  for (const d of DURATIONS) {
    const a = ours?.[d];
    const b = theirs?.[d];
    out[d] = a && b ? Math.log(a / b) : null;
  }
  return out;
}
