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
// * `phenotype.label`: het rennerstype (sinds 2026-11-12, voor het racebriefje).
//
// Geen eigen HTML-parser: we zoeken de twee objecten op naam en lezen alleen
// getallen. Verandert de opbouw van de pagina, dan geeft `parseRiderPage` null
// en schrijft de sync niets.
//
// De vermogenspagina (`/riders/<id>/power`) heeft een eigen curve, met per duur
// een `d90`. Op 2026-11-23 bleek `power` een race te missen die daar wel in stond
// (20 min 4,43 tegen 5,23 W/kg). Die pagina heeft op zijn beurt geen
// `legacyRatings`, dus de sync leest beide en neemt per duur de hoogste.

export type RiderPagePower = { s15: number | null; m1: number | null; m2: number | null; m5: number | null; m20: number | null };
export type RiderPageLegacy = { live: number | null; max30: number | null; max90: number | null };

export type RiderPageData = {
  zwiftId: number;
  /** Null als de renner geen vermogen over 90 dagen heeft. */
  powerWkg: RiderPagePower | null;
  /** Null als de renner geen legacy vELO heeft. */
  legacy: RiderPageLegacy | null;
  /** Rennerstype volgens ZwiftRacing ("sprinter", "puncheur" …), of null. */
  phenotype: string | null;
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

const isPageOf = (html: string, zwiftId: number) => new RegExp(`riderId:(?:"${zwiftId}"|${zwiftId})(?!\\d)`).test(html);

/**
 * Kent ZwiftRacing deze renner niet? Dan geeft de site geen 404 maar status 200
 * met "Rider not found": de loader van zijn rennerroute gaf `l:null` en er staat
 * geen `riderId` in (gezien 2026-11-25). Zonder deze herkenning stopte de sync
 * daar elke run met "pagina niet herkend" en kwam hij niet bij de renners erna.
 */
export function isRiderNotFound(html: string, zwiftId: number): boolean {
  if (isPageOf(html, zwiftId)) return false;
  // De delen van de route-ID staan tussen NUL-tekens: `i:"\0riders\0$riderId\0riders\0<id>"`.
  return new RegExp(`i:"[^"]*\\$riderId[^"]*[^\\d"]${zwiftId}",[^{}]*?[{,]l:null[,}]`).test(html);
}

/**
 * Vermogen en legacy vELO van één renner, of null als dit niet zijn pagina is
 * of de pagina een opbouw heeft die we niet kennen.
 */
export function parseRiderPage(html: string, zwiftId: number): RiderPageData | null {
  if (!isPageOf(html, zwiftId)) return null;
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

  // Het type staat naast de scores per type, een object één laag dieper.
  const phenotype = /[{,]phenotype:(?:\$R\[\d+\]=)?\{(?:[^{}]|\{[^{}]*\})*?[{,]label:"([A-Za-z]{2,30})"/.exec(html)?.[1] ?? null;

  return { zwiftId, powerWkg: hasPower ? powerWkg : null, legacy: hasLegacy ? legacy : null, phenotype };
}

/**
 * Het W/kg per duur over 90 dagen uit de curve van de vermogenspagina, of null
 * als dit niet zijn pagina is of de curve ontbreekt.
 */
export function parseRiderPowerCurve(html: string, zwiftId: number): RiderPagePower | null {
  if (!isPageOf(html, zwiftId)) return null;
  const open = /[{,]curve:(?:\$R\[\d+\]=)?\[/.exec(html);
  if (!open) return null;

  // Eventnamen weg (die kunnen haakjes bevatten); alleen de duur-ID's blijven.
  const rest = html
    .slice(open.index + open[0].length - 1)
    .replace(/"(?:[^"\\]|\\.)*"/g, (text) => (/^"w\d+"$/.test(text) ? text : '""'));
  let depth = 0;
  let end = -1;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "[") depth += 1;
    else if (rest[i] === "]" && --depth === 0) {
      end = i;
      break;
    }
  }
  if (end < 0) return null;

  const wkg = new Map<string, number>();
  for (const entry of rest.slice(0, end).split(/(?=\{id:")/)) {
    const id = /^\{id:"(w\d+)"/.exec(entry)?.[1];
    const d90 = /[{,]d90:(?:\$R\[\d+\]=)?\{([^{}]*)\}/.exec(entry)?.[1];
    const value = d90 ? /(?:^|,)wkg:(\d+(?:\.\d+)?)/.exec(d90)?.[1] : undefined;
    if (id && value) wkg.set(id, Number(value));
  }
  const curve: RiderPagePower = {
    s15: round(wkg.get("w15"), 2),
    m1: round(wkg.get("w60"), 2),
    m2: round(wkg.get("w120"), 2),
    m5: round(wkg.get("w300"), 2),
    m20: round(wkg.get("w1200"), 2),
  };
  return Object.values(curve).some((value) => value != null) ? curve : null;
}

/** Per duur de hoogste van twee reeksen; null als geen van beide iets heeft. */
export function highestPower(a: RiderPagePower | null, b: RiderPagePower | null): RiderPagePower | null {
  if (!a || !b) return a ?? b;
  const high = (x: number | null, y: number | null) => (x == null ? y : y == null ? x : Math.max(x, y));
  return { s15: high(a.s15, b.s15), m1: high(a.m1, b.m1), m2: high(a.m2, b.m2), m5: high(a.m5, b.m5), m20: high(a.m20, b.m20) };
}
