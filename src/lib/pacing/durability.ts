// Duurzaamheid: je CP na tweeduizend kilojoule is niet je CP bij de start.
//
// Voor een Gran Fondo is het het verschil tussen een plan dat klopt en een plan
// dat je op driekwart laat ontploffen, precies het moment waarop de meeste ritten
// mislukken. Ook een Zwift-race van ruim een uur haalt 1000 kJ. Tot 2026-11-25
// stond hier dat het daar weinig uitmaakt, maar in de ZRL-race van 24 november
// verbruikten plannen 90–95 % van de reserve met elke klim onder CP, alleen door
// deze correctie. Sindsdien is de afname per kJ begrensd (maxFadeAt).
//
// De data ligt er al: `rider_power_profiles.curve_points_fatigue` bewaart per
// kJ-drempel een eigen vermogenscurve (intervals.icu levert `after_kj0` en
// `after_kj1`). Door op elke curve hetzelfde CP/W′-model te fitten weten we hoe
// CP zakt naarmate het werk zich opstapelt.
//
// Terughoudend gebruikt: zonder vermoeidheidscurves gebeurt er niets, en de
// afname wordt begrensd. Dit is een correctie, geen tweede model.
//
// Beperking (wetenschappelijke toets fase 5, 2026-10-16): de intensiteit van het
// eerdere werk telt zwaarder dan het aantal kilojoules (Spragg 2024;
// Sánchez-Jiménez 2025). Deze correctie rekent alleen met kJ.
//
// Een vermoeide curve is het beste dat iemand ná die kilojoules toevallig reed,
// niet het beste dat hij kon. Sinds 2026-11-23 mag het model daarom nooit lager
// uitkomen dan wat de eigen beste inspanningen bewijzen; zie liftToMeasuredEfforts.

import { FIT_MAX_SECONDS, fitCpWPrime, type CurvePoint } from "@/lib/pacing/cp";

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
 * over de steekproef dan over de renner. Gemeten afnames liggen rond 10–20 % na
 * veel hard werk (Sánchez-Jiménez 2025) en 15 % na drie uur zonder koolhydraten
 * (Norte 2026); 25 % laat daar ruimte boven.
 */
export const MAX_FADE_FRACTION = 0.25;

/**
 * De grootste afname die we bij een gegeven hoeveelheid werk accepteren. Na
 * 1000 kJ verloren amateurs 6,5–12,5 % op 20 minuten (Barsumyan 2025); 10 % zit
 * daartussen. Daarna oplopend tot het plafond van 25 % bij 2000 kJ. Een curve "na
 * 1000 kJ" is het beste dat iemand daarna toevallig reed, en bij wie zelden lang
 * en hard rijdt valt die laag uit.
 */
const FADE_LIMITS: Array<{ kj: number; fade: number }> = [
  { kj: 0, fade: 0 },
  { kj: 1000, fade: 0.1 },
  { kj: 2000, fade: MAX_FADE_FRACTION },
];

export function maxFadeAt(kj: number): number {
  if (!(kj > 0)) return 0;
  for (let i = 1; i < FADE_LIMITS.length; i++) {
    const a = FADE_LIMITS[i - 1];
    const b = FADE_LIMITS[i];
    if (kj <= b.kj) return a.fade + ((b.fade - a.fade) * (kj - a.kj)) / (b.kj - a.kj);
  }
  return MAX_FADE_FRACTION;
}

/**
 * Versie van deze berekening, bewaard bij elk plan. Een plan met een oudere
 * versie meldt zich één keer als verouderd. Versie 2: 2026-11-23, begrensd op de
 * eigen beste inspanningen. Versie 3: 2026-11-25, begrensd per kJ (maxFadeAt).
 */
export const DURABILITY_VERSION = 3;

/** De verse vermogenscurve en W′ van het lid: wat het aantoonbaar gereden heeft. */
export type MeasuredEfforts = {
  curve: CurvePoint[] | null | undefined;
  wPrimeJoules: number;
};

/**
 * Leidt uit de vermoeidheidscurves af hoe CP zakt met het verzette werk. Geeft
 * null als er te weinig te fitten valt — dan rekent het pacingplan gewoon met
 * één CP, zoals het daarvoor ook deed.
 */
export function buildDurabilityModel(
  fatigueCurves: FatigueCurve[] | null | undefined,
  baseCpWatts: number,
  measured?: MeasuredEfforts,
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

  const lifted = (measured ? liftToMeasuredEfforts(anchors, baseCpWatts, measured) : anchors).map(
    (anchor) => ({ kj: anchor.kj, factor: Math.max(anchor.factor, 1 - maxFadeAt(anchor.kj)) }),
  );
  const lowest = lifted[lifted.length - 1].factor;
  return { anchors: lifted, maxFadePct: (1 - lowest) * 100 };
}

function clampFactor(factor: number): number {
  if (!Number.isFinite(factor)) return 1;
  return Math.min(1, Math.max(1 - MAX_FADE_FRACTION, factor));
}

/**
 * Tilt de afname op tot wat de eigen beste inspanningen bewijzen. Wie P watt
 * reed gedurende t seconden, verzette P·t aan werk en had daarbij hoogstens W′
 * aan reserve: CP lag aan het eind dus minstens op P − W′/t. CP zakt alleen met
 * meer werk, dus die ondergrens geldt ook voor alles daarvóór.
 *
 * Alleen inspanningen vanaf twintig minuten: korter is het bereik van de fit
 * zelf. De afname op de gemeten kJ-drempels blijft staan, tenzij een inspanning
 * ze tegenspreekt.
 */
function liftToMeasuredEfforts(
  anchors: DurabilityModel["anchors"],
  baseCpWatts: number,
  { curve, wPrimeJoules }: MeasuredEfforts,
): DurabilityModel["anchors"] {
  if (!Array.isArray(curve)) return anchors;

  const measuredFade: DurabilityModel = { anchors, maxFadePct: 0 };
  const factorAt = (kj: number) => cpAfterKj(measuredFade, 1, kj);
  const floors = curve
    .flatMap((point) => {
      const seconds = Number(point.seconds);
      const watts = Number(point.watts);
      if (!(seconds >= FIT_MAX_SECONDS) || !(watts > 0)) return [];
      const factor = Math.min(1, (watts - wPrimeJoules / seconds) / baseCpWatts);
      return factor > 0 ? [{ kj: (watts * seconds) / 1000, factor }] : [];
    })
    .sort((a, b) => b.kj - a.kj);
  if (floors.length === 0) return anchors;

  const knots = [
    ...new Set([
      ...anchors.map((anchor) => anchor.kj),
      ...floors.filter((floor) => floor.factor > factorAt(floor.kj)).map((floor) => floor.kj),
    ]),
  ].sort((a, b) => b - a);

  // Van achter naar voren: elke knoop ligt minstens op de hoogste vloer erna.
  let next = 0;
  let highestFloor = 0;
  const lifted = knots.map((kj) => {
    while (next < floors.length && floors[next].kj >= kj) {
      highestFloor = Math.max(highestFloor, floors[next].factor);
      next++;
    }
    return { kj, factor: Math.max(factorAt(kj), highestFloor) };
  });
  lifted.reverse();

  // Een vlak stuk heeft alleen zijn twee uiteinden nodig.
  return lifted.filter(
    (anchor, index) =>
      index === 0 ||
      index === lifted.length - 1 ||
      anchor.factor !== lifted[index - 1].factor ||
      anchor.factor !== lifted[index + 1].factor,
  );
}

/**
 * CP na `kj` kilojoule werk. Lineair tussen de ankerpunten; voorbij het laatste
 * ankerpunt blijft de afname staan in plaats van door te lopen — extrapoleren
 * op twee meetpunten is raden. Nooit meer afname dan maxFadeAt: tussen twee
 * ankers ver uit elkaar zou de lijn er anders onder duiken.
 */
export function cpAfterKj(
  model: DurabilityModel | null,
  baseCpWatts: number,
  kj: number,
): number {
  if (!model || model.anchors.length === 0) return baseCpWatts;
  return Math.max(interpolatedCp(model.anchors, baseCpWatts, kj), baseCpWatts * (1 - maxFadeAt(kj)));
}

function interpolatedCp(
  anchors: DurabilityModel["anchors"],
  baseCpWatts: number,
  kj: number,
): number {
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
