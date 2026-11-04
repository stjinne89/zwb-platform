// Kleur van een krachtverschil, los van de rekenkern zodat ook clientcomponenten
// het kunnen gebruiken zonder de routedata mee te nemen.

/** Verschil dat we gelijk noemen, in procenten (eigen vuistregel). */
export const EVEN_PCT = 2;

export type EdgeTone = "voor" | "achter" | "gelijk";

/** Ons voordeel in hele procenten: voor vanaf +2%, achter vanaf −2%, daartussen gelijk. */
export function edgeTone(pct: number | null | undefined): EdgeTone | null {
  if (pct == null) return null;
  if (pct >= EVEN_PCT) return "voor";
  if (pct <= -EVEN_PCT) return "achter";
  return "gelijk";
}

/** Tekstkleur per toon, dezelfde groen/rood als de plus en min in de statistieken. */
export const EDGE_TONE_TEXT: Record<EdgeTone, string> = {
  voor: "text-emerald-700 dark:text-emerald-400",
  achter: "text-destructive",
  gelijk: "text-muted-foreground",
};

/** Randkleur van een chip per toon. */
export const EDGE_TONE_BORDER: Record<EdgeTone, string> = {
  voor: "border-emerald-600/40",
  achter: "border-destructive/40",
  gelijk: "",
};

export function formatEdge(pct: number) {
  return `${pct > 0 ? "+" : ""}${pct}%`;
}
