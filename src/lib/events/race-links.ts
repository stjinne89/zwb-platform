// Links bij een race (migr. 0185). Zwift, ZwiftPower en ZwiftRacing volgen uit
// het Zwift-event-id; recon, ZwiftInsider en de ZWB-site vult de beheerder in.
// Een teamrace neemt de handmatige links van zijn raceweek over.

import { routes as zwiftRoutes } from "zwift-data";
import { zwiftEventUrl } from "@/lib/events/external-scan";
import { isValidDiscordUrl } from "@/lib/discord";

export const EVENT_LINK_KINDS = ["recon", "zwiftinsider", "zwb", "overig"] as const;
export type EventLinkKind = (typeof EVENT_LINK_KINDS)[number];

export const EVENT_LINK_KIND_LABELS: Record<EventLinkKind, string> = {
  recon: "Recon",
  zwiftinsider: "ZwiftInsider",
  zwb: "{kort}-website",
  overig: "Overig",
};

export type EventLinkRow = {
  id?: string;
  kind: string;
  label: string | null;
  url: string;
};

/** Een eigen icoon voor een link zonder herkenbaar sitelogo. */
export type RaceLinkIcon =
  | { image: string }
  | { glyph: "stage" | "team" | "signups" | "rules" | "bike" };

export type RaceLink = {
  key: string;
  kind: EventLinkKind | "zwift" | "zwiftpower" | "zwiftracing" | "zwifterbikes" | "racepass" | "frr" | "ladder" | "discord";
  label: string;
  url: string;
  icon?: RaceLinkIcon;
};

// De logo's in public/logos/ komen van de sites zelf, net als op het profiel
// (profile-external-links.tsx), en staan lokaal zodat we niets hotlinken.
const LOGO_BY_HOST: Array<[string, string]> = [
  ["zwiftpower.com", "/logos/zwiftpower.png"],
  ["zwiftracing.app", "/logos/zwiftracing.png"],
  ["zwiftinsider.com", "/logos/zwiftinsider.png"],
  ["wtrl.racing", "/logos/wtrl.png"],
  ["zwift.com", "/logos/zwift.png"],
  ["youtube.com", "/logos/youtube.png"],
  ["youtu.be", "/logos/youtube.png"],
  ["strava.com", "/logos/strava.png"],
  ["intervals.icu", "/logos/intervals.png"],
  ["zwbcycling.nl", "/logos/zwb.png"],
  ["discord.com", "/logos/discord.svg"],
  ["discord.gg", "/logos/discord.svg"],
  ["discordapp.com", "/logos/discord.svg"],
];

/** Het logo van de site achter deze link, of null als we er geen hebben. */
export function linkLogo(url: string): string | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const match = LOGO_BY_HOST.find(
    ([host]) => hostname === host || hostname.endsWith(`.${host}`),
  );
  return match?.[1] ?? null;
}

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

// ── Flamme Rouge Racing (migr. 0195) ────────────────────────────────────────
// De tourpagina's op flammerougeracing.com gelden voor de lopende tour; FRR
// heeft geen vaste URL per tour of etappe.

const FRR_BASE = "https://flammerougeracing.com";
/** Het tourkanaal van FRR, zoals FRR het in elk Zwift-event noemt. */
const FRR_DISCORD_URL = "https://discord.com/invite/nQNWHQK6PS";

/** Klassementen, inschrijvingen en regels van de lopende FRR-tour. */
export function frrTourLinks(): RaceLink[] {
  const links: Array<[string, string, string, RaceLinkIcon]> = [
    ["gc", "Klassement", "/tour-results-gc/", { image: "/logos/frr-geel.svg" }],
    ["stage", "Etappe-uitslag", "/tour-results-gc-stage/", { glyph: "stage" }],
    ["green", "Groene trui", "/tour-results-green/", { image: "/logos/frr-groen.svg" }],
    ["polka", "Bolletjestrui", "/tour-results-polka/", { image: "/logos/frr-bolletjes.svg" }],
    ["team", "Ploegen", "/tour-results-team/", { glyph: "team" }],
    ["registered", "Inschrijvingen", "/tour-registered/", { glyph: "signups" }],
    ["rules", "Reglement", "/tour-rules/", { glyph: "rules" }],
  ];
  return [
    ...links.map(([key, label, path, icon]) => ({
      key: `frr-${key}`,
      kind: "frr" as const,
      label,
      url: `${FRR_BASE}${path}`,
      icon,
    })),
    { key: "frr-discord", kind: "frr", label: "Discord", url: FRR_DISCORD_URL },
  ];
}

// ── Club Ladder (migr. 0300) ────────────────────────────────────────────────
// De sync zet de wedstrijdpagina in external_url; de route op ZwiftInsider volgt
// uit de Zwift-route. Een ZwiftInsider-link van de beheerder gaat voor.

export function ladderRaceLinks(
  event: { external_url: string | null; zwift_route_id: number | string | null },
  own: RaceLink[],
): RaceLink[] {
  const links: RaceLink[] = [];
  if (event.external_url) {
    links.push({ key: "ladder-fixture", kind: "ladder", label: "Ladder-site", url: event.external_url, icon: { glyph: "stage" } });
  }
  const route = zwiftRoutes.find((item) => item.id === Number(event.zwift_route_id));
  if (route?.zwiftInsiderUrl && !own.some((link) => link.kind === "zwiftinsider")) {
    links.push({ key: `zi-${route.id}`, kind: "zwiftinsider", label: "ZwiftInsider", url: route.zwiftInsiderUrl });
  }
  return links;
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

// ── WTRL-racepass (migr. 0186) ──────────────────────────────────────────────
// Bij de ZRL meld je je aan via de racepass van je team, niet op Zwift. WTRL
// geeft er per team per ronde één uit.

export type RacepassRow = {
  team_id: string;
  url: string;
  valid_from: string;
  valid_until: string;
};

/** Alleen een https-link naar wtrl.racing telt als racepass. */
export function normalizeRacepassUrl(value: unknown): string | null {
  const url = normalizeLinkUrl(value);
  if (!url) return null;
  const hostname = new URL(url).hostname;
  return hostname === "wtrl.racing" || hostname.endsWith(".wtrl.racing") ? url : null;
}

/** De racepass van dit team voor de ronde die deze datum (yyyy-mm-dd) dekt. */
export function racepassFor(
  passes: RacepassRow[],
  teamId: string | null | undefined,
  dateKey: string,
): string | null {
  if (!teamId) return null;
  const match = passes.find(
    (pass) =>
      pass.team_id === teamId && pass.valid_from <= dateKey && dateKey <= pass.valid_until,
  );
  return match?.url ?? null;
}

// ── Discord van het team (migr. 0118) ───────────────────────────────────────
// Eén kanaal per team, beheerd op de teampagina. Een subteam zonder eigen
// kanaal gebruikt dat van zijn hoofdteam.

export type TeamDiscordRow = {
  id: string;
  parent_team_id: string | null;
  discord_url: string | null;
};

/** Het Discord-kanaal van dit team, anders dat van zijn hoofdteam. */
export function teamDiscordUrl(
  teams: TeamDiscordRow[],
  teamId: string | null | undefined,
): string | null {
  if (!teamId) return null;
  const valid = (url: string | null | undefined) =>
    url && isValidDiscordUrl(url) ? url.trim() : null;
  const team = teams.find((row) => row.id === teamId);
  if (!team) return null;
  const own = valid(team.discord_url);
  if (own) return own;
  const parent = teams.find((row) => row.id === team.parent_team_id);
  return valid(parent?.discord_url);
}

/** De Discord-chip van dit team, of null als het team geen kanaal heeft. */
export function teamDiscordLink(
  teams: TeamDiscordRow[],
  teamId: string | null | undefined,
): RaceLink | null {
  const url = teamDiscordUrl(teams, teamId);
  return url ? { key: `discord-${teamId}`, kind: "discord", label: "Discord", url } : null;
}
