// De Zwiftpuzzel op het profiel (wens eigenaar, 2026-11-25): twaalf stukken, één
// per Zwift-wereld, die inkleuren zodra een lid 100% van die wereld heeft. Hier
// de pure kant: welke wereld af is, de kleur per soort wereld en de vorm van de
// stukken. Puur, voor de test.

import { parseBlockKey } from "./grid";

/** Het soort wereld bepaalt de kleur van het stuk (gekozen variant "Per landschap"). */
export type ZwiftLandscape = "eiland" | "stad" | "bergen" | "heuvels" | "circuit";

export const ZWIFT_LANDSCAPE: Record<string, ZwiftLandscape> = {
  watopia: "eiland",
  "makuri-islands": "eiland",
  richmond: "stad",
  london: "stad",
  "new-york": "stad",
  paris: "stad",
  innsbruck: "bergen",
  france: "bergen",
  yorkshire: "heuvels",
  scotland: "heuvels",
  bologna: "circuit",
  "crit-city": "circuit",
};

export type PuzzleWorld = {
  slug: string;
  name: string;
  /** Alle wegblokken die we van deze wereld kennen (de noemer van de dekking). */
  known: string[];
};

export type PuzzlePiece = {
  slug: string;
  name: string;
  landscape: ZwiftLandscape;
  /** Aantal eigen blokken binnen de bekende wegen. */
  own: number;
  known: number;
  /** Afgerond naar beneden, zodat 99,6% nooit als 100% leest. */
  pct: number;
  done: boolean;
  /** De vorm: [dx, dy, eigen] per bekend blok, vanaf de linkerbovenhoek. */
  blocks: [number, number, boolean][];
  width: number;
  height: number;
};

/**
 * De stukken van de puzzel voor één lid. Een wereld is af als het lid elk bekend
 * wegblok heeft; dezelfde regel als de 100% op ZWBlokken zelf. Een wereld zonder
 * bekende blokken valt weg.
 */
export function puzzlePieces(worlds: PuzzleWorld[], own: Record<string, Set<string>>): PuzzlePiece[] {
  const pieces: PuzzlePiece[] = [];
  for (const world of worlds) {
    if (world.known.length === 0) continue;
    const mine = own[world.slug] ?? new Set<string>();
    const coords = world.known.map((key) => ({ ...parseBlockKey(key), mine: mine.has(key) }));
    const x0 = Math.min(...coords.map((c) => c.x));
    const y0 = Math.min(...coords.map((c) => c.y));
    const count = coords.filter((c) => c.mine).length;
    pieces.push({
      slug: world.slug,
      name: world.name,
      landscape: ZWIFT_LANDSCAPE[world.slug] ?? "stad",
      own: count,
      known: coords.length,
      pct: Math.floor((100 * count) / coords.length),
      done: count === coords.length,
      blocks: coords.map((c) => [c.x - x0, c.y - y0, c.mine]),
      width: Math.max(...coords.map((c) => c.x)) - x0 + 1,
      height: Math.max(...coords.map((c) => c.y)) - y0 + 1,
    });
  }
  return pieces;
}

type Knob = { neck: number; head: number; d1: number; d2: number };

/** Een rand met een hoekige nok op het midden: hals en kop, zoals het blokkenraster. */
function edgePoints(x0: number, y0: number, x1: number, y1: number, sign: number, k: Knob): [number, number][] {
  const length = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / length;
  const uy = (y1 - y0) / length;
  // Naar buiten bij een rondgang met de klok mee (y naar beneden).
  const nx = uy;
  const ny = -ux;
  const at = (t: number, h: number): [number, number] => [x0 + ux * t + nx * h * sign, y0 + uy * t + ny * h * sign];
  if (sign === 0) return [at(length, 0)];
  const c = length / 2;
  return [
    at(c - k.neck, 0), at(c - k.neck, k.d1), at(c - k.head, k.d1), at(c - k.head, k.d1 + k.d2),
    at(c + k.head, k.d1 + k.d2), at(c + k.head, k.d1), at(c + k.neck, k.d1), at(c + k.neck, 0),
    at(length, 0),
  ];
}

/**
 * De omtrek van het stuk op rij `row`, kolom `col` in een puzzel van `cols` bij
 * `rows`. Een gedeelde rand heeft aan de ene kant een nok en aan de andere een
 * gat; de buitenrand is recht. Het patroon wisselt als een dambord.
 */
export function piecePath(row: number, col: number, cols: number, rows: number, size: number, knob: Knob): string {
  // + is een nok naar rechts of naar onderen.
  const right = (r: number, c: number) => ((r + c) % 2 ? 1 : -1);
  const down = (r: number, c: number) => ((r * 3 + c) % 2 ? -1 : 1);
  const edges = [
    row === 0 ? 0 : -down(row - 1, col),
    col === cols - 1 ? 0 : right(row, col),
    row === rows - 1 ? 0 : down(row, col),
    col === 0 ? 0 : -right(row, col - 1),
  ];
  const x = col * size;
  const y = row * size;
  const points: [number, number][] = [
    [x, y],
    ...edgePoints(x, y, x + size, y, edges[0], knob),
    ...edgePoints(x + size, y, x + size, y + size, edges[1], knob),
    ...edgePoints(x + size, y + size, x, y + size, edges[2], knob),
    ...edgePoints(x, y + size, x, y, edges[3], knob),
  ];
  return "M" + points.map(([px, py]) => `${round(px)},${round(py)}`).join("L") + "Z";
}

const round = (n: number) => Math.round(n * 100) / 100;
