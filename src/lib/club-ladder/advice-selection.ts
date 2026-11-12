// Eigen selectie voor het parcoursadvies op de Club Ladder-teampagina
// (2026-11-11, vraag eigenaar: "de eigen selectie aanvinken in plaats van de
// beste 5"). Staat in de URL (`met=`), niet in de database: het is een
// proefopstelling tegen een ploeg die je nog wilt uitdagen, en daar is geen
// event om een selectie op te bewaren. Puur: geen I/O.

/** Querystring-naam van de eigen selectie. */
export const ADVICE_SELECTION_PARAM = "met";

/** Een renner heet `profile:<id>` of `roster:<id>`, net als de selectie op het event. */
const KEY = /^(profile|roster):[0-9a-f-]{36}$/i;

/** Meer kan een team niet hebben; houdt een geplakte URL klein. */
const MAX_KEYS = 40;

/**
 * De gekozen renners uit de URL, alleen wie in `allowed` staat, zonder
 * dubbelen en op de volgorde van de URL. Leeg als er niets bruikbaars staat:
 * dan rekent het advies weer met de beste vijf.
 */
export function parseAdviceSelection(value: string | string[] | undefined, allowed: Iterable<string>): string[] {
  const raw = Array.isArray(value) ? value.join(",") : value ?? "";
  const known = new Map([...allowed].map((key) => [key.toLowerCase(), key]));
  const out = new Set<string>();
  for (const part of raw.split(",")) {
    const key = part.trim().toLowerCase();
    const match = KEY.test(key) ? known.get(key) : undefined;
    if (match) out.add(match);
    if (out.size >= MAX_KEYS) break;
  }
  return [...out];
}

/** `&met=…` voor achter een URL met al een `?`, of leeg zonder selectie. */
export function adviceSelectionQuery(keys: string[]): string {
  return keys.length > 0 ? `&${ADVICE_SELECTION_PARAM}=${encodeURIComponent(keys.join(","))}` : "";
}
