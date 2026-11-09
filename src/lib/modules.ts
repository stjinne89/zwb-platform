// Het register van de modules die een club aan of uit kan zetten (fase 1 van de
// generieke versie, docs/multi-club-ontwerp.md).
//
// Puur en zonder serverafhankelijkheden: de middleware, het menu, het beheer en
// de tests lezen allemaal hieruit. Wat bij deze installatie aan staat, staat in
// de tabel club_modules (0313) en komt via getClub() (lib/club.ts) of, in de
// middleware, via lib/modules-gate.ts.
//
// Een pad hoort bij de module met het langste patroon dat past. Zo valt
// /zwbeter-worden/briljant onder Rennersniveau en de rest van /zwbeter-worden
// onder Training. Een pad dat bij geen module past, hoort bij de kern en is er
// altijd: inloggen, dashboard, leden, profiel, hulp, beheer, kalender en de
// koppelingen met Strava en intervals.icu.

export type ModuleGroup = "algemeen" | "zwift";

export type ModuleKey =
  | "samen_fietsen"
  | "training"
  | "weekoverzicht"
  | "stats"
  | "bekers"
  | "segmenten"
  | "garage"
  | "whatsapp"
  | "polls"
  | "media"
  | "ritverslagen"
  | "clubverhaal"
  | "bibliotheek"
  | "sponsors"
  | "voorspelspel"
  | "blokkenjacht"
  | "teams"
  | "pacing"
  | "rennersniveau"
  | "live_race"
  | "src"
  | "omnium"
  | "managerspel";

export type ModuleDef = {
  key: ModuleKey;
  /** De neutrale naam. Een club kan een eigen naam kiezen (club_modules.label). */
  label: string;
  group: ModuleGroup;
  /**
   * Paden van de module: pagina's, beheer en API. Een patroon geldt voor het pad
   * zelf en alles eronder; `*` staat voor precies één segment.
   */
  paths: string[];
  /**
   * Cron-routes van de module. Staat de module uit, dan antwoorden die met 200
   * en doen ze niets, zodat de cronjob niet als mislukt telt.
   */
  crons?: string[];
  /** Modules die aan moeten staan voordat deze kan werken. */
  requires?: ModuleKey[];
};

export const MODULES: readonly ModuleDef[] = [
  // ── Algemeen: bruikbaar voor elke club ─────────────────────────────────
  {
    key: "samen_fietsen",
    label: "Samen fietsen",
    group: "algemeen",
    paths: ["/samen-fietsen", "/live", "/api/live"],
    crons: ["/api/live/cleanup"],
  },
  {
    key: "training",
    label: "Training",
    group: "algemeen",
    paths: ["/zwbeter-worden", "/api/training", "/beheer/houding-meetproef"],
    crons: ["/api/training/adaptations/daily"],
  },
  { key: "weekoverzicht", label: "Weekoverzicht", group: "algemeen", paths: ["/weekoverzicht"] },
  { key: "stats", label: "Stats", group: "algemeen", paths: ["/stats"] },
  {
    key: "bekers",
    label: "Badges en bekers",
    group: "algemeen",
    paths: ["/zwbekers", "/beheer/achievements", "/beheer/zwbekers", "/api/achievements"],
    crons: ["/api/achievements/finalize"],
  },
  {
    key: "segmenten",
    label: "Segmenten en cols",
    group: "algemeen",
    paths: ["/profiel/segments", "/profiel/cols"],
  },
  { key: "garage", label: "Garage", group: "algemeen", paths: ["/mijn-garage"] },
  { key: "whatsapp", label: "WhatsApp-groepen", group: "algemeen", paths: ["/community"] },
  { key: "polls", label: "Polls", group: "algemeen", paths: ["/polls"] },
  {
    key: "media",
    label: "Media",
    group: "algemeen",
    paths: ["/media", "/api/instagram"],
    crons: ["/api/instagram/sync"],
  },
  { key: "ritverslagen", label: "Ritverslagen", group: "algemeen", paths: ["/ritverslagen"] },
  {
    key: "clubverhaal",
    label: "Clubverhaal",
    group: "algemeen",
    paths: ["/clubverhaal", "/verhaal", "/beheer/clubverhaal"],
  },
  { key: "bibliotheek", label: "Bibliotheek", group: "algemeen", paths: ["/zwbieb"] },
  { key: "sponsors", label: "Sponsors", group: "algemeen", paths: ["/sponsors"] },
  { key: "voorspelspel", label: "Voorspelspel", group: "algemeen", paths: ["/voorzpwelbokaal"] },

  // ── Zwift en online racen ──────────────────────────────────────────────
  {
    key: "blokkenjacht",
    label: "Blokkenjacht",
    group: "zwift",
    paths: ["/zwblokken", "/api/zwblokken"],
    crons: ["/api/zwblokken/backfill"],
  },
  {
    key: "teams",
    label: "Teams en competities",
    group: "zwift",
    paths: [
      "/teams",
      "/beheer/zrl",
      "/beheer/frr-kalender",
      "/api/team-results",
      "/api/zrl",
      "/api/frr",
      "/api/ttt",
    ],
    crons: ["/api/team-results/sync", "/api/zrl/freeze", "/api/frr/sync"],
  },
  {
    key: "pacing",
    label: "Race-pacing",
    group: "zwift",
    paths: ["/events/*/pacing", "/events/*/briefing", "/api/events/*/pacing"],
  },
  {
    key: "rennersniveau",
    label: "Rennersniveau",
    group: "zwift",
    paths: ["/stats/zwbriljant", "/zwbeter-worden/briljant", "/api/briljant"],
    crons: ["/api/briljant/weekly", "/api/briljant/zrs-history"],
  },
  {
    key: "live_race",
    label: "Live race",
    group: "zwift",
    paths: ["/live/zrl", "/ds", "/api/live/zrl"],
    requires: ["teams"],
  },
  {
    key: "src",
    label: "Sunday Race Club",
    group: "zwift",
    paths: ["/src", "/beheer/src", "/api/src"],
    crons: ["/api/src/sync"],
  },
  { key: "omnium", label: "Omnium", group: "zwift", paths: ["/omnium", "/beheer/omnium"] },
  {
    key: "managerspel",
    label: "Managerspel",
    group: "zwift",
    paths: ["/zwbgame"],
    requires: ["teams"],
  },
];

export const MODULE_KEYS: readonly ModuleKey[] = MODULES.map((m) => m.key);

const BY_KEY = new Map<ModuleKey, ModuleDef>(MODULES.map((m) => [m.key, m]));

export function moduleDef(key: ModuleKey): ModuleDef {
  const def = BY_KEY.get(key);
  if (!def) throw new Error(`Onbekende module: ${key}`);
  return def;
}

export function isModuleKey(value: string): value is ModuleKey {
  return BY_KEY.has(value as ModuleKey);
}

function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/** Past het patroon op dit pad? Het pad zelf of iets eronder; `*` is één segment. */
export function pathMatches(pattern: string, pathname: string): boolean {
  const want = segments(pattern);
  const got = segments(pathname);
  if (got.length < want.length) return false;
  return want.every((part, i) => part === "*" || part === got[i]);
}

// Alle patronen, het langste eerst, zodat de eerste treffer de meest specifieke is.
const PATTERNS: { pattern: string; key: ModuleKey; length: number }[] = MODULES.flatMap((m) =>
  m.paths.map((pattern) => ({ pattern, key: m.key, length: segments(pattern).length })),
).sort((a, b) => b.length - a.length);

/** De module waar dit pad bij hoort, of null voor de kern. */
export function moduleForPath(pathname: string): ModuleKey | null {
  const path = pathname.split(/[?#]/, 1)[0];
  for (const { pattern, key } of PATTERNS) {
    if (pathMatches(pattern, path)) return key;
  }
  return null;
}

/** Is dit pad een cron-route van deze module? */
export function isModuleCron(key: ModuleKey, pathname: string): boolean {
  return (moduleDef(key).crons ?? []).some((cron) => pathMatches(cron, pathname));
}

/**
 * Welke modules er echt aan staan. Uit staat: wat de club heeft uitgezet, en
 * elke module waarvan een vereiste module uit staat (ook via een tussenstap).
 */
export function resolveDisabled(switchedOff: Iterable<string>): Set<ModuleKey> {
  const off = new Set<ModuleKey>();
  for (const key of switchedOff) if (isModuleKey(key)) off.add(key);
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of MODULES) {
      if (off.has(m.key)) continue;
      if ((m.requires ?? []).some((dep) => off.has(dep))) {
        off.add(m.key);
        changed = true;
      }
    }
  }
  return off;
}

/** De modules die deze module vereisen, direct of via een tussenstap. */
export function dependentsOf(key: ModuleKey): ModuleKey[] {
  const all = resolveDisabled([key]);
  all.delete(key);
  return MODULE_KEYS.filter((k) => all.has(k));
}

/** Mag dit pad getoond worden, gegeven de modules die uit staan? */
export function pathAllowed(pathname: string, disabled: ReadonlySet<ModuleKey>): boolean {
  const key = moduleForPath(pathname);
  return key === null || !disabled.has(key);
}
