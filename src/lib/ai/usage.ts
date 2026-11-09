// AI-verbruik per lid (fase 0 van ZWBrandstof, 2026-11-09).
//
// Elke Claude-aanroep schrijft één regel in ai_usage (migratie 0313): van wie,
// wat voor soort, of het lid hem zelf startte, de tokens en wat dat kostte.
// Daarmee ziet het bestuur op /beheer/ai-verbruik waar het geld heen gaat,
// voordat er een muntsysteem komt. Zie PLAN.md, ronde "AI-verbruik meten".
//
// Puur en zonder imports: claude.ts (die de Netlify-achtergrondfunctie zonder
// "@/"-aliassen bundelt) en de beheerpagina gebruiken dit allebei.

/**
 * Wie de aanroep veroorzaakte.
 * - member: het lid (of zijn trainer) vroeg er zelf om, met een knop.
 * - follow_up: een herziening omdat er in de app iets veranderde, door het lid
 *   zelf (beschikbaarheid, een eigen rit) of door een ander (opstelling, een
 *   vervallen rit). De reden staat bij de generatie.
 * - automatic: de app deed het uit zichzelf (dagvoorstel, weekoverzicht,
 *   app-update).
 */
export type AiTrigger = "member" | "follow_up" | "automatic";

export const AI_TRIGGERS: readonly AiTrigger[] = ["member", "follow_up", "automatic"];

export const AI_TRIGGER_LABEL: Record<AiTrigger, string> = {
  member: "Zelf gevraagd",
  follow_up: "Na een wijziging",
  automatic: "Automatisch",
};

/** Wat bij een aanroep hoort om hem te kunnen toerekenen. */
export type AiMeter = {
  /** Het lid voor wie de aanroep is; null voor clubbrede aanroepen. */
  profileId: string | null;
  trigger: AiTrigger;
  /** De soort (AiKind uit settings.ts); zonder soort telt de functie. */
  kind?: string;
};

/** Dollars per miljoen tokens, lijstprijs van Anthropic (cache: 2026-10-06). */
type Price = { input: number; output: number; cacheRead: number };

const PRICES: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
};

/** Een cache-schrijfactie (5 minuten) kost 1,25 keer de invoerprijs. */
const CACHE_WRITE_FACTOR = 1.25;

export type AiTokens = {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
};

function count(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** De tokens uit het usage-object van een Claude-antwoord. */
export function tokensFromUsage(usage: unknown): AiTokens {
  const u = (usage ?? {}) as Record<string, unknown>;
  return {
    input: count(u.input_tokens),
    output: count(u.output_tokens),
    cacheWrite: count(u.cache_creation_input_tokens),
    cacheRead: count(u.cache_read_input_tokens),
  };
}

/** Wat de tokens kostten in dollars, of null bij een model zonder bekende prijs. */
export function costUsd(model: string, tokens: AiTokens): number | null {
  const price = PRICES[model];
  if (!price) return null;
  const dollars =
    (tokens.input * price.input +
      tokens.output * price.output +
      tokens.cacheWrite * price.input * CACHE_WRITE_FACTOR +
      tokens.cacheRead * price.cacheRead) /
    1_000_000;
  return Math.round(dollars * 100_000) / 100_000;
}

/** Een regel zoals de beheerpagina hem uit ai_usage leest. */
export type AiUsageRow = {
  profileId: string | null;
  feature: string;
  kind: string;
  trigger: AiTrigger;
  costUsd: number | null;
};

export type UsageTotal = { calls: number; costUsd: number; unpriced: number };

export type UsageSummary = {
  total: UsageTotal;
  byTrigger: Record<AiTrigger, UsageTotal>;
  /** Per soort, duurste eerst. */
  byKind: Array<{ kind: string; trigger: AiTrigger; total: UsageTotal }>;
  /** Per lid, duurste eerst; clubbrede aanroepen (zonder lid) staan er niet in. */
  byMember: Array<{ profileId: string; total: UsageTotal; byTrigger: Record<AiTrigger, UsageTotal> }>;
  /** Clubbrede aanroepen, zoals de app-update. */
  club: UsageTotal;
};

function emptyTotal(): UsageTotal {
  return { calls: 0, costUsd: 0, unpriced: 0 };
}

function emptyByTrigger(): Record<AiTrigger, UsageTotal> {
  return { member: emptyTotal(), follow_up: emptyTotal(), automatic: emptyTotal() };
}

function add(total: UsageTotal, row: AiUsageRow) {
  total.calls += 1;
  if (row.costUsd == null) total.unpriced += 1;
  else total.costUsd += row.costUsd;
}

export function summarizeUsage(rows: AiUsageRow[]): UsageSummary {
  const total = emptyTotal();
  const byTrigger = emptyByTrigger();
  const club = emptyTotal();
  const kinds = new Map<string, { kind: string; trigger: AiTrigger; total: UsageTotal }>();
  const members = new Map<string, { profileId: string; total: UsageTotal; byTrigger: Record<AiTrigger, UsageTotal> }>();

  for (const row of rows) {
    add(total, row);
    add(byTrigger[row.trigger], row);

    const kindKey = `${row.kind}|${row.trigger}`;
    let kind = kinds.get(kindKey);
    if (!kind) kinds.set(kindKey, (kind = { kind: row.kind, trigger: row.trigger, total: emptyTotal() }));
    add(kind.total, row);

    if (!row.profileId) {
      add(club, row);
      continue;
    }
    let member = members.get(row.profileId);
    if (!member) {
      members.set(row.profileId, (member = { profileId: row.profileId, total: emptyTotal(), byTrigger: emptyByTrigger() }));
    }
    add(member.total, row);
    add(member.byTrigger[row.trigger], row);
  }

  const byCost = (a: { total: UsageTotal }, b: { total: UsageTotal }) =>
    b.total.costUsd - a.total.costUsd || b.total.calls - a.total.calls;
  return {
    total,
    byTrigger,
    byKind: [...kinds.values()].sort(byCost),
    byMember: [...members.values()].sort(byCost),
    club,
  };
}

/** Leesbare naam van een soort aanroep. */
export const AI_KIND_LABEL: Record<string, string> = {
  nieuw_schema: "Nieuw schema",
  plan_update: "Schema herzien",
  daily: "Dagvoorstel",
  day: "Dag aanpassen",
  coach: "Coachvraag",
  weekly: "Weekoverzicht",
  pacing: "Pacingplan",
  nutrition: "Maaltijd herkennen",
  app_updates: "App-update",
};

export type UsageMonth = {
  /** "2026-11" */
  month: string;
  /** Begin en einde (exclusief) in UTC, als ISO-tekst. */
  from: string;
  to: string;
  previous: string;
  /** Null voor de lopende maand: verder vooruit valt niets te zien. */
  next: string | null;
};

function monthKey(year: number, monthIndex: number): string {
  const d = new Date(Date.UTC(year, monthIndex, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** De gevraagde maand ("2026-11"), of de lopende bij een lege of ongeldige waarde. */
export function usageMonth(requested: string | null | undefined, now = new Date()): UsageMonth {
  const current = monthKey(now.getUTCFullYear(), now.getUTCMonth());
  const match = /^(\d{4})-(\d{2})$/.exec(requested ?? "");
  const valid = match && Number(match[2]) >= 1 && Number(match[2]) <= 12 && `${match[1]}-${match[2]}` <= current;
  const [year, monthIndex] = valid
    ? [Number(match[1]), Number(match[2]) - 1]
    : [now.getUTCFullYear(), now.getUTCMonth()];
  const month = monthKey(year, monthIndex);
  return {
    month,
    from: new Date(Date.UTC(year, monthIndex, 1)).toISOString(),
    to: new Date(Date.UTC(year, monthIndex + 1, 1)).toISOString(),
    previous: monthKey(year, monthIndex - 1),
    next: month < current ? monthKey(year, monthIndex + 1) : null,
  };
}
