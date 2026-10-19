// Waar de "?" bovenin heen gaat: naar de uitleg over de pagina waar je bent.
//
// Tot 2026-10-16 stond naast veel paginatitels een eigen "Hulp"-link, naast
// het vraagteken in de balk dat altijd bovenaan /hulp opende. Dat was dubbel
// (eigenaar: "die lijkt me weg te kunnen"). Nu is er één vraagteken, en dat
// weet waar je bent. Links bij één onderdeel van een pagina (de Strava-sectie
// op je profiel, LiveTrack, een dialoog) blijven: die wijzen naar uitleg over
// precies dat onderdeel.
//
// Het anker zegt welk onderwerp; lib/help-categories.ts zegt op welke
// hulppagina (/hulp/<categorie>) dat staat.
//
// Een patroon is een pad waarin "*" één segment vervangt. Het langste patroon
// dat past wint, dus /zwbeter-worden/jaarplan gaat voor /zwbeter-worden.

import { helpHrefForAnchor } from "@/lib/help-categories";

export const HELP_ANCHORS: ReadonlyArray<readonly [pattern: string, anchor: string]> = [
  ["/kalender", "events"],
  ["/kalender/nieuw", "eventbeheer"],
  ["/events/*", "events"],
  ["/events/*/bewerk", "eventbeheer"],
  ["/events/*/pacing", "pacing"],
  ["/samen-fietsen", "livetrack"],
  ["/live", "livetrack"],
  ["/zwbieb", "zwbieb"],
  ["/teams", "teams"],
  ["/teams/nieuw", "teambeheer"],
  ["/teams/*", "teambeheer"],
  ["/teams/ttt-planner", "ttt-beheer"],
  ["/stats", "mijn-statistieken"],
  ["/stats/achievements", "badges"],
  ["/profiel", "profiel"],
  ["/profiel/cols", "cols"],
  ["/mijn-garage", "mijn-garage"],
  ["/zwblokken", "zwblokken"],
  ["/zwbgame", "zwbgame"],
  ["/voorzpwelbokaal", "voorzpwelbokaal"],
  ["/verjaardagen", "verjaardagsrondje"],
  ["/community", "community"],
  ["/media/*/bewerk", "mediabeheer"],
  ["/zwbeter-worden", "trainingsruimte"],
  ["/zwbeter-worden/schema", "trainingsschema"],
  ["/zwbeter-worden/jaarplan", "jaarplan"],
  ["/zwbeter-worden/doelen", "doeltype"],
  ["/zwbeter-worden/uitgangspunten", "uitgangspunten"],
  ["/zwbeter-worden/vermogen", "vermogen"],
  ["/zwbeter-worden/logboek", "logboek"],
  ["/zwbeter-worden/racen", "racen"],
  ["/zwbeter-worden/trainer/racen", "racen-trainer"],
  ["/zwbeter-worden/core", "core-mobiliteit"],
  ["/zwbeter-worden/protocollen", "protocollen"],
  ["/zwbeter-worden/voeding", "voeding"],
  ["/zwbeter-worden/materiaal", "materiaal"],
  ["/beheer", "beheer"],
  ["/beheer/achievements", "badgebeheer"],
  ["/beheer/event-scan", "eventbeheer"],
  ["/beheer/programmas", "eventbeheer"],
  ["/beheer/notificaties", "rollenbeheer"],
  ["/beheer/rechten", "rollenbeheer"],
  ["/beheer/strava", "stravabeheer"],
];

function segments(path: string) {
  return path.split("/").filter(Boolean);
}

/** Past het patroon op het begin van het pad? "*" is één willekeurig segment. */
function matches(pattern: string[], path: string[]) {
  if (pattern.length > path.length) return false;
  return pattern.every((part, index) => part === "*" || part === path[index]);
}

/** "/hulp/<categorie>#<anker>" voor dit pad, of "/hulp" als er geen eigen uitleg is. */
export function helpHrefFor(pathname: string): string {
  const path = segments(pathname);
  let best: { anchor: string; length: number; exact: number } | null = null;
  for (const [pattern, anchor] of HELP_ANCHORS) {
    const parts = segments(pattern);
    if (!matches(parts, path)) continue;
    // Langer wint; bij gelijke lengte wint het patroon met minder "*".
    const exact = parts.filter((part) => part !== "*").length;
    if (!best || parts.length > best.length || (parts.length === best.length && exact > best.exact)) {
      best = { anchor, length: parts.length, exact };
    }
  }
  return (best && helpHrefForAnchor(best.anchor)) ?? "/hulp";
}
