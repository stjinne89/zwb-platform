// De rennerpagina van zwiftracing.app (`/riders/<id>`) uitlezen.
//
// Sinds de site op Railway draait (gemeten 2026-11-11) staat er geen
// beveiligingscontrole meer voor: een gewoon verzoek zonder browser geeft de
// pagina, en de gegevens van de loader staan al in de HTML, in de vorm van
// TanStack Start (`power:$R[35]={wkg5:15.48,…}`). Daaruit lezen we twee stukken:
//
// * `power`: het beste W/kg per duur over 90 dagen, dezelfde velden als de API
//   (`wkg15` … `wkg1200`) en als de Chrome-taak tot nu toe las. Dat is het
//   hoogste W/kg, niet het W/kg van de inspanning met de meeste watt: daardoor
//   kan het een paar honderdsten hoger zijn dan de `d90` op `/power`.
// * `legacyRatings`: legacy vELO (vELO1) live, max over 30 en over 90 dagen,
//   de rating waar de Club Ladder mee rekent (zie club-ladder/legacy-velo.ts).
//
// Geen eigen HTML-parser: we zoeken de twee objecten op naam en lezen alleen
// getallen. Verandert de opbouw van de pagina, dan geeft `parseRiderPage` null
// en schrijft de sync niets.

export type RiderPagePower = { s15: number | null; m1: number | null; m2: number | null; m5: number | null; m20: number | null };
export type RiderPageLegacy = { live: number | null; max30: number | null; max90: number | null };

export type RiderPageData = {
  zwiftId: number;
  /** Null als de renner geen vermogen over 90 dagen heeft. */
  powerWkg: RiderPagePower | null;
  /** Null als de renner geen legacy vELO heeft. */
  legacy: RiderPageLegacy | null;
};

const NUMBER = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;

/** Het platte object na `key:` (eventueel `key:$R[n]=`), of null als het er niet is. */
export function readObject(html: string, key: string): Record<string, number | null> | null {
  const match = new RegExp(`[{,]${key}:(?:\\$R\\[\\d+\\]=)?\\{`).exec(html);
  if (!match) return null;
  const start = match.index + match[0].length;
  const end = html.indexOf("}", start);
  if (end < 0) return null;
  const body = html.slice(start, end);
  // Een genest object hoort hier niet; dan is de opbouw anders dan we kennen.
  if (body.includes("{")) return null;
  const out: Record<string, number | null> = {};
  for (const part of body.split(",")) {
    const colon = part.indexOf(":");
    if (colon <= 0) continue;
    const name = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    out[name] = NUMBER.test(value) ? Number(value) : null;
  }
  return out;
}

const round = (value: number | null | undefined, digits: number) => {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

/**
 * Vermogen en legacy vELO van één renner, of null als dit niet zijn pagina is
 * of de pagina een opbouw heeft die we niet kennen.
 */
export function parseRiderPage(html: string, zwiftId: number): RiderPageData | null {
  if (!new RegExp(`riderId:(?:"${zwiftId}"|${zwiftId})(?!\\d)`).test(html)) return null;
  // Het veld `power` hoort er altijd te zijn; ontbreekt het, dan is de pagina veranderd.
  if (!/[{,]power:/.test(html)) return null;

  const power = readObject(html, "power");
  const powerWkg: RiderPagePower | null = power
    ? {
        s15: round(power.wkg15, 2),
        m1: round(power.wkg60, 2),
        m2: round(power.wkg120, 2),
        m5: round(power.wkg300, 2),
        m20: round(power.wkg1200, 2),
      }
    : null;
  const hasPower = powerWkg != null && Object.values(powerWkg).some((value) => value != null);

  const ratings = readObject(html, "legacyRatings");
  const legacy: RiderPageLegacy | null = ratings
    ? { live: round(ratings.live, 1), max30: round(ratings.max30, 1), max90: round(ratings.max90, 1) }
    : null;
  const hasLegacy = legacy != null && Object.values(legacy).some((value) => value != null);

  return { zwiftId, powerWkg: hasPower ? powerWkg : null, legacy: hasLegacy ? legacy : null };
}
