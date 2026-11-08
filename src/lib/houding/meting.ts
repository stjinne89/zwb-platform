// Rekenkern van de houding-meetproef (2026-11-08): hoeken uit lichaamspunten,
// oppervlak uit een masker of een met de hand getrokken omtrek, en de uitersten
// per pedaalomwenteling. Alles in pixels van het camerabeeld; de pagina rekent
// om met de stuurbreedte als schaal. Zie PLAN.md, "Houding-meetproef".

export type Punt = { x: number; y: number };
export type Monster = { t: number; v: number };

/** Hoek bij b tussen de lijnen b→a en b→c, in graden (0–180). */
export function hoek(a: Punt, b: Punt, c: Punt): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (n === 0) return Number.NaN;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Kniebuiging: 0° is een gestrekt been. */
export function knieBuiging(heup: Punt, knie: Punt, enkel: Punt): number {
  return 180 - hoek(heup, knie, enkel);
}

/** Romphoek: de lijn heup→schouder tegen de horizontaal, 0° is plat. */
export function rompHoek(heup: Punt, schouder: Punt): number {
  const dx = Math.abs(schouder.x - heup.x);
  const dy = heup.y - schouder.y; // beeld-y loopt naar beneden
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Oppervlak van een veelhoek in pixels² (schoenveterformule). */
export function veelhoekOppervlak(punten: Punt[]): number {
  if (punten.length < 3) return 0;
  let som = 0;
  for (let i = 0; i < punten.length; i++) {
    const p = punten[i];
    const q = punten[(i + 1) % punten.length];
    som += p.x * q.y - q.x * p.y;
  }
  return Math.abs(som) / 2;
}

/** Aantal pixels in een betrouwbaarheidsmasker boven de drempel. */
export function maskerPixels(masker: ArrayLike<number>, drempel = 0.5): number {
  let n = 0;
  for (let i = 0; i < masker.length; i++) if (masker[i] > drempel) n++;
  return n;
}

/** Millimeter per pixel uit twee aangeklikte stuuruiteinden. */
export function mmPerPixel(a: Punt, b: Punt, breedteMm: number): number | null {
  const px = Math.hypot(b.x - a.x, b.y - a.y);
  if (!(px > 0) || !(breedteMm > 0)) return null;
  return breedteMm / px;
}

/** Pixels² naar m² met een schaal in mm per pixel. */
export function pixelsNaarM2(pixels: number, mmPerPx: number): number {
  return (pixels * mmPerPx * mmPerPx) / 1_000_000;
}

export function mediaan(waarden: number[]): number | null {
  const v = waarden.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export type Uitersten = {
  /** Kleinste waarde per omwenteling (bij de knie: het meest gestrekt, onderin). */
  minima: Monster[];
  /** Grootste waarde per omwenteling (bij de knie: bovenin). */
  maxima: Monster[];
};

/**
 * Splitst een golvend signaal in omwentelingen door het midden te kruisen, met
 * een hysterese van 15 % van het bereik zodat ruis geen extra omwenteling
 * maakt. Per dal en per top één uiterste.
 */
export function uiterstenPerOmwenteling(monsters: Monster[]): Uitersten {
  const geldig = monsters.filter((m) => Number.isFinite(m.v));
  if (geldig.length < 4) return { minima: [], maxima: [] };
  const waarden = geldig.map((m) => m.v);
  const laag = Math.min(...waarden);
  const hoog = Math.max(...waarden);
  const bereik = hoog - laag;
  if (bereik < 5) return { minima: [], maxima: [] };
  const midden = (laag + hoog) / 2;
  const band = bereik * 0.15;

  const minima: Monster[] = [];
  const maxima: Monster[] = [];
  let fase: "onder" | "boven" | null = null;
  let uiterste: Monster | null = null;
  for (const m of geldig) {
    if (fase !== "onder" && m.v < midden - band) {
      if (fase === "boven" && uiterste) maxima.push(uiterste);
      fase = "onder";
      uiterste = m;
    } else if (fase !== "boven" && m.v > midden + band) {
      if (fase === "onder" && uiterste) minima.push(uiterste);
      fase = "boven";
      uiterste = m;
    } else if (uiterste) {
      if (fase === "onder" && m.v < uiterste.v) uiterste = m;
      if (fase === "boven" && m.v > uiterste.v) uiterste = m;
    }
  }
  // Het laatste dal of de laatste top is nog niet af en telt niet mee.
  return { minima, maxima };
}

/** Omwentelingen per minuut uit de tijden (ms) van opeenvolgende dalen. */
export function cadans(minima: Monster[]): number | null {
  if (minima.length < 3) return null;
  const tussen: number[] = [];
  for (let i = 1; i < minima.length; i++) tussen.push(minima[i].t - minima[i - 1].t);
  const m = mediaan(tussen);
  return m && m > 0 ? 60_000 / m : null;
}

function csvVeld(waarde: unknown): string {
  if (waarde === null || waarde === undefined) return "";
  const s =
    typeof waarde === "number"
      ? String(Math.round(waarde * 1000) / 1000).replace(".", ",")
      : String(waarde);
  return /[;"\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** CSV met puntkomma's, zoals Excel in het Nederlands verwacht. */
export function naarCsv(rijen: Record<string, unknown>[]): string {
  if (rijen.length === 0) return "";
  const kolommen = [...new Set(rijen.flatMap((r) => Object.keys(r)))];
  return [kolommen.join(";"), ...rijen.map((r) => kolommen.map((k) => csvVeld(r[k])).join(";"))].join(
    "\n",
  );
}

/**
 * Richtwaarde voor de kniebuiging onderin de trap, gemeten tijdens het trappen
 * en verminderd met de staande meting: 33–43° bij rustig trappen (Swart &
 * Holliday 2019, Millour 2019). Zie docs/houding-video-meetproef.md.
 */
export const KNIE_ONDERIN = { min: 33, max: 43 } as const;

/** Het model zit 3–9° naast een meting met markers (Bini 2023). */
export const MEETMARGE_GRADEN = 5;

export type Oordeel = "binnen" | "rand" | "lager" | "hoger";

/**
 * Waar een hoek valt ten opzichte van een richtwaarde. "rand": buiten de
 * richtwaarde maar binnen de meetmarge, dus niet te onderscheiden.
 */
export function beoordeel(
  waarde: number,
  bereik: { min: number; max: number },
  marge = MEETMARGE_GRADEN,
): Oordeel {
  if (waarde >= bereik.min && waarde <= bereik.max) return "binnen";
  if (waarde >= bereik.min - marge && waarde <= bereik.max + marge) return "rand";
  return waarde < bereik.min ? "lager" : "hoger";
}
