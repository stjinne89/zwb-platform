// Links bij een race (migr. 0185). Zwift, ZwiftPower en ZwiftRacing volgen uit
// het Zwift-event-id; recon, ZwiftInsider en de ZWB-site vult de beheerder in.
// Een teamrace neemt de handmatige links van zijn raceweek over.

import { zwiftEventUrl } from "@/lib/events/external-scan";

export const EVENT_LINK_KINDS = ["recon", "zwiftinsider", "zwb", "overig"] as const;
export type EventLinkKind = (typeof EVENT_LINK_KINDS)[number];

export const EVENT_LINK_KIND_LABELS: Record<EventLinkKind, string> = {
  recon: "Recon",
  zwiftinsider: "ZwiftInsider",
  zwb: "ZWB-website",
  overig: "Overig",
};

export type EventLinkRow = {
  id?: string;
  kind: string;
  label: string | null;
  url: string;
};

export type RaceLink = {
  key: string;
  kind: EventLinkKind | "zwift" | "zwiftpower" | "zwiftracing";
  label: string;
  url: string;
};

export function isEventLinkKind(value: unknown): value is EventLinkKind {
  return EVENT_LINK_KINDS.includes(value as EventLinkKind);
}

function zwiftId(value: number | string | null | undefined): string | null {
  const id = String(value ?? "").trim();
  return /^\d+$/.test(id) ? id : null;
}

export function zwiftPowerEventUrl(id: number | string) {
  return `https://zwiftpower.com/events.php?zid=${id}`;
}

export function zwiftRacingEventUrl(id: number | string) {
  return `https://www.zwiftracing.app/events/${id}`;
}

/** Zwift, ZwiftPower en ZwiftRacing voor één Zwift-event. */
export function derivedZwiftLinks(zwiftEventId: number | string | null | undefined): RaceLink[] {
  const id = zwiftId(zwiftEventId);
  if (!id) return [];
  return [
    { key: `zwift-${id}`, kind: "zwift", label: "Zwift", url: zwiftEventUrl(id) },
    { key: `zp-${id}`, kind: "zwiftpower", label: "ZwiftPower", url: zwiftPowerEventUrl(id) },
    { key: `zr-${id}`, kind: "zwiftracing", label: "ZwiftRacing", url: zwiftRacingEventUrl(id) },
  ];
}

/** Alleen https-links; alles anders valt weg. */
export function normalizeLinkUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Het eigen label, anders de naam van de soort, bij "overig" de hostnaam. */
export function linkLabel(kind: EventLinkKind, label: string | null, url: string): string {
  const own = (label ?? "").trim();
  if (own) return own;
  return kind === "overig" ? host(url) : EVENT_LINK_KIND_LABELS[kind];
}

/**
 * Handmatige links van het event, aangevuld met die van de raceweek. Een URL
 * die het event zelf al heeft, komt niet nog eens van de raceweek.
 */
export function mergeLinks(own: EventLinkRow[], parent: EventLinkRow[]): RaceLink[] {
  const seen = new Set<string>();
  const out: RaceLink[] = [];
  for (const row of [...own, ...parent]) {
    if (!isEventLinkKind(row.kind)) continue;
    const url = normalizeLinkUrl(row.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      key: row.id ?? url,
      kind: row.kind,
      label: linkLabel(row.kind, row.label, url),
      url,
    });
  }
  // Vaste volgorde per soort; binnen een soort de volgorde van de beheerder.
  const order = (kind: RaceLink["kind"]) => EVENT_LINK_KINDS.indexOf(kind as EventLinkKind);
  return out
    .map((link, index) => ({ link, index }))
    .sort((a, b) => order(a.link.kind) - order(b.link.kind) || a.index - b.index)
    .map(({ link }) => link);
}
