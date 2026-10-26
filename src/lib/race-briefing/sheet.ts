// De inhoud van het racebriefje: wat de app voorstelt en wat de captain ervan
// maakt. Per blok geldt de aanpassing van de captain, anders het voorstel; een blok
// dat gelijk is aan het voorstel wordt niet bewaard, zodat het met de data
// meegroeit (bv. als de ZRS later binnenkomt). Puur: geen I/O.
//
// Aanleiding (eigenaar, 2026-10-20): in New York zijn de korte steile stukjes uit
// de subways escalators die je een duw van ±1200 W geven. Dat verandert de
// tactiek, en dat moet de captain per race op het briefje kunnen zetten.

import { cheatRules, type BriefingFormat, type CheatRule, type LimitCheck, type Powerup } from "./rules";
import { briefingMoments, type BriefingMoment } from "./tips";
import { cleanRiderName, type OwnRole } from "./field";
import { segmentLabel, type BriefingClimb, type RouteKeyPoints } from "./route";

/** Een aantekening in het getekende profiel. */
export type SketchMark = {
  fromKm: number;
  toKm: number;
  text: string;
  /** markeer: markeerstift over het stuk, label in teal; cirkel: rood omcirkeld; label: potlood erboven; boog: stippellijn met label eronder; sprint: groen over het stuk. Alle teksten schuiven op tot ze vrij staan (RouteSketch). */
  style: "markeer" | "cirkel" | "label" | "boog" | "sprint";
};

export type WatchLine = { name: string; note: string };

export type SheetContent = {
  sketch: SketchMark[];
  moments: BriefingMoment[];
  rules: CheatRule[];
  watch: WatchLine[];
  notes: string[];
};

export type SheetSection = keyof SheetContent;
export const SHEET_SECTIONS: SheetSection[] = ["sketch", "moments", "rules", "watch", "notes"];

/** Wat de captain heeft aangepast; een ontbrekend blok volgt het voorstel. */
export type SheetOverride = Partial<SheetContent>;

const MAX_ROWS = 20;
const MAX_TEXT = 120;
const MAX_KM = 500;
const SKETCH_STYLES: SketchMark["style"][] = ["markeer", "cirkel", "label", "boog", "sprint"];

const text = (value: unknown, max = MAX_TEXT) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const kmValue = (value: unknown) => {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return null;
  const n = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(n) ? Math.min(MAX_KM, Math.max(0, Math.round(n * 100) / 100)) : null;
};
const rows = (value: unknown): unknown[] => (Array.isArray(value) ? value.slice(0, MAX_ROWS) : []);

/** Alleen wat klopt, met grenzen aan lengte en aantal; lege regels vallen weg. */
export function sanitizeOverride(input: unknown): SheetOverride {
  const source = (input ?? {}) as Record<string, unknown>;
  const out: SheetOverride = {};
  if (Array.isArray(source.sketch)) {
    out.sketch = rows(source.sketch).flatMap((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const fromKm = kmValue(r.fromKm);
      const toKm = kmValue(r.toKm) ?? fromKm;
      const style = SKETCH_STYLES.find((s) => s === r.style) ?? "label";
      const t = text(r.text, 40);
      if (fromKm === null || toKm === null || !t) return [];
      return [{ fromKm: Math.min(fromKm, toKm), toKm: Math.max(fromKm, toKm), text: t, style }];
    });
  }
  if (Array.isArray(source.moments)) {
    out.moments = rows(source.moments).flatMap((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const km = kmValue(r.km);
      const what = text(r.what);
      const todo = text(r.todo);
      if (km === null || (!what && !todo)) return [];
      return [{ km, what, todo, ...(r.key ? { key: true } : {}) }];
    });
    out.moments.sort((a, b) => a.km - b.km);
  }
  if (Array.isArray(source.rules)) {
    out.rules = rows(source.rules).flatMap((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const value = text(r.value, 40);
      const t = text(r.text);
      if (!value && !t) return [];
      return [{ value, text: t, ...(r.key ? { key: true } : {}) }];
    });
  }
  if (Array.isArray(source.watch)) {
    out.watch = rows(source.watch).flatMap((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const name = text(r.name, 60);
      return name ? [{ name, note: text(r.note, 80) }] : [];
    });
  }
  if (Array.isArray(source.notes)) {
    out.notes = rows(source.notes).map((n) => text(n)).filter(Boolean);
  }
  return out;
}

/** Alleen de blokken die echt van het voorstel afwijken. */
export function diffOverride(override: SheetOverride, defaults: SheetContent): SheetOverride {
  const out: SheetOverride = {};
  for (const section of SHEET_SECTIONS) {
    const value = override[section];
    if (value !== undefined && JSON.stringify(value) !== JSON.stringify(defaults[section])) {
      (out as Record<string, unknown>)[section] = value;
    }
  }
  return out;
}

/** Wat er op het briefje staat: per blok de aanpassing, anders het voorstel. */
export function effectiveSheet(defaults: SheetContent, override: SheetOverride | null): SheetContent & { edited: SheetSection[] } {
  const edited = SHEET_SECTIONS.filter((section) => override?.[section] !== undefined);
  return {
    sketch: override?.sketch ?? defaults.sketch,
    moments: override?.moments ?? defaults.moments,
    rules: override?.rules ?? defaults.rules,
    watch: override?.watch ?? defaults.watch,
    notes: override?.notes ?? defaults.notes,
    edited,
  };
}

const shortClimb = (climb: BriefingClimb) => (climb.name ?? "klim").replace(/\s+(KOM|QOM)$/i, "");

/** Het voorstel van de app: wat er op het briefje staat zolang de captain niets aanpast. */
export function defaultSheet(input: {
  format: BriefingFormat;
  category: string | null;
  route: RouteKeyPoints | null;
  powerups: Array<{ powerup: Powerup; percent: number }>;
  own: Array<{ zwiftId: number; name: string; role: OwnRole; limits: LimitCheck }>;
  watch: Array<{ name: string; teamLabel: string | null; reason: "sterk" | "won" | "podium"; wonAt: string | null }>;
  warnings: string[];
}): SheetContent {
  const sketch: SketchMark[] = [];
  const route = input.route;
  if (route) {
    const finale = route.finale.kind === "climb" ? route.finale.climb : null;
    const marked = new Set<BriefingClimb>();
    for (const { descent, climb } of route.descentsIntoClimbs) {
      sketch.push({ fromKm: descent.startKm, toKm: climb.endKm, text: `lint → ${shortClimb(climb)}`, style: "markeer" });
      marked.add(climb);
    }
    if (finale) {
      sketch.push({ fromKm: finale.startKm, toKm: finale.endKm, text: "voluit!", style: "cirkel" });
      marked.add(finale);
    }
    for (const climb of route.climbs) {
      if (!marked.has(climb) && climb.name) sketch.push({ fromKm: climb.startKm, toKm: climb.endKm, text: shortClimb(climb), style: "label" });
    }
    // Alleen waar een sprint punten oplevert; in een scratch telt alleen de finish.
    if (input.format === "points" || input.format === "rot") {
      for (const s of route.segments) {
        // De KOM's staan er al als klim; een passage ziet de lezer aan de plek.
        if (s.kind === "sprint") sketch.push({ fromKm: s.startKm, toKm: s.endKm, text: segmentLabel(s, false), style: "sprint" });
      }
    }
    if (route.lastArchKm !== null) sketch.push({ fromKm: route.lastArchKm, toKm: route.lastArchKm, text: "laatste boog", style: "boog" });
    sketch.sort((a, b) => a.fromKm - b.fromKm);
  }
  return {
    sketch,
    moments: briefingMoments({ format: input.format, category: input.category, route, powerups: input.powerups, own: input.own }),
    rules: cheatRules(input.format, input.own.length),
    watch: input.watch.map((w) => ({
      name: cleanRiderName(w.name),
      note: [w.teamLabel, w.reason === "won" && w.wonAt ? `won ${w.wonAt}` : w.reason === "podium" ? "podium eerder" : null].filter(Boolean).join(" · "),
    })),
    notes: input.warnings,
  };
}
