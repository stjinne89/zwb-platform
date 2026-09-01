// Duurzaamheid: je CP na tweeduizend kilojoule is niet je CP bij de start.
//
// Voor een Zwift-race van een uur maakt dat weinig uit. Voor een Gran Fondo is
// het het verschil tussen een plan dat klopt en een plan dat je op driekwart
// laat ontploffen — precies het moment waarop de meeste ritten mislukken.
//
// De data ligt er al: `rider_power_profiles.curve_points_fatigue` bewaart per
// kJ-drempel een eigen vermogenscurve (intervals.icu levert `after_kj0` en
// `after_kj1`). Door op elke curve hetzelfde CP/W′-model te fitten weten we hoe
// CP zakt naarmate het werk zich opstapelt.
//
// Terughoudend gebruikt: zonder vermoeidheidscurves gebeurt er niets, en de
// afname wordt begrensd. Dit is een correctie, geen tweede model.

import { fitCpWPrime, type CurvePoint } from "@/lib/pacing/cp";

export type FatigueCurve = {
  /** Hoeveel kJ er al gereden was toen deze curve gold. */
  afterKj: number;
  points: CurvePoint[];
};

export type DurabilityModel = {
  /** CP als factor van het uitgeruste CP, op de gemeten kJ-drempels. */
  anchors: Array<{ kj: number; factor: number }>;
  /** Hoeveel procent CP er op het diepste gemeten punt af gaat. */
  maxFadePct: number;
};

/**
 * Meer dan dit accepteren we niet. Een curve op een hoge kJ-drempel steunt vaak
 * op een handvol ritten; een gefitte afname van veertig procent zegt dan meer
 * over de steekproef dan over de renner.
 */
export const MAX_FADE_FRACTION = 0.25;

/**
 * Leidt uit de vermoeidheidscurves af hoe CP zakt met het verzette werk. Geeft
 * null als er te weinig te fitten valt — dan rekent het pacingplan gewoon met
 * één CP, zoals het daarvoor ook deed.
 */
export function buildDurabilityModel(
  fatigueCurves: FatigueCurve[] | null | undefined,
  baseCpWatts: number,
): DurabilityModel | null {
  if (!Array.isArray(fatigueCurves) || fatigueCurves.length === 0) return null;
  if (baseCpWatts <= 0) return null;

  const anchors: Array<{ kj: number; factor: number }> = [];
  for (const curve of fatigueCurves) {
    const kj = Number(curve.afterKj);
    if (!Number.isFinite(kj) || kj < 0) continue;
    const fit = fitCpWPrime(curve.points);
    if (!fit) continue;
    anchors.push({
      kj,
      factor: clampFactor(fit.cpWatts / baseCpWatts),
    });
  }

  if (anchors.length === 0) return null;
  anchors.sort((a, b) => a.kj - b.kj);

  // Zorg dat er een ankerpunt op nul staat, anders begint de interpolatie in het
  // luchtledige.
  if (anchors[0].kj > 0) anchors.unshift({ kj: 0, factor: 1 });

  // CP kan met meer werk niet omhoog; een fit die dat wél zegt is ruis.
  for (let i = 1; i < anchors.length; i++) {
    anchors[i].factor = Math.min(anchors[i].factor, anchors[i - 1].factor);
  }

  const lowest = anchors[anchors.length - 1].factor;
  return { anchors, maxFadePct: (1 - lowest) * 100 };
}

function clampFactor(factor: number): number {
  if (!Number.isFinite(factor)) return 1;
  return Math.min(1, Math.max(1 - MAX_FADE_FRACTION, factor));
}

/**
 * CP na `kj` kilojoule werk. Lineair tussen de ankerpunten; voorbij het laatste
 * ankerpunt blijft de afname staan in plaats van door te lopen — extrapoleren
 * op twee meetpunten is raden.
 */
export function cpAfterKj(
  model: DurabilityModel | null,
  baseCpWatts: number,
  kj: number,
): number {
  if (!model || model.anchors.length === 0) return baseCpWatts;
  const { anchors } = model;

  if (kj <= anchors[0].kj) return baseCpWatts * anchors[0].factor;
  const last = anchors[anchors.length - 1];
  if (kj >= last.kj) return baseCpWatts * last.factor;

  for (let i = 1; i < anchors.length; i++) {
    if (kj <= anchors[i].kj) {
      const a = anchors[i - 1];
      const b = anchors[i];
      const span = b.kj - a.kj;
      const t = span > 0 ? (kj - a.kj) / span : 0;
      return baseCpWatts * (a.factor + (b.factor - a.factor) * t);
    }
  }
  return baseCpWatts * last.factor;
}
