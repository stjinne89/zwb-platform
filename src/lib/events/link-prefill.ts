// Van een geplakte eventlink naar een voorstel voor het eventformulier.
//
// Drie bronnen, van specifiek naar algemeen:
// - Zwift: de publieke event-API (zie zwift-route.ts). Die levert ook route en
//   ronden; dat deel blijft in lookupZwiftEvent, dit bestand doet alleen de
//   velden die ook bij andere events bestaan.
// - MyWhoosh: de detail-API achter event.mywhoosh.com, dezelfde die de
//   kalenderscan gebruikt (external-scan.ts).
// - Elke andere site: schema.org-Event-data (JSON-LD) als die er is, anders de
//   Open Graph-tags. Organisatoren van toertochten en granfondo's zetten hun
//   evenement via WordPress-, Eventbrite- of inschrijfplugins vaak als JSON-LD
//   op de pagina; Open Graph staat er vrijwel altijd, al is het alleen titel,
//   omschrijving en afbeelding.
//
// Het formulier vult alleen lege velden in; wat hier geraden wordt (categorie,
// type) is een voorstel dat de beheerder ziet voordat hij opslaat.

import * as cheerio from "cheerio";
import { assertSafeUrl } from "@/lib/net/safe-fetch";
import { amsterdamWallTimeToIso } from "@/lib/birthdays";
import { isSrcName } from "@/lib/src/feed";
import type { ZwiftEventInfo } from "@/lib/events/zwift-route";

export type EventPrefill = {
  source: "zwift" | "mywhoosh" | "web";
  title: string | null;
  description: string | null;
  /** ISO. */
  start_at: string | null;
  end_at: string | null;
  location: string | null;
  /** Waarde uit EVENT_TYPES, of null als er niets te raden viel. */
  type: string | null;
  /** Waarde uit EVENT_KINDS, of null. */
  kind: string | null;
  /** Absolute http(s)-URL van een coverafbeelding. */
  image_url: string | null;
  /** De link zoals hij op de eventpagina hoort te staan. */
  external_url: string;
  distance_km: number | null;
  elevation_m: number | null;
};

/** Langer dan dit is een halve nieuwsbrief; de link staat er toch bij. */
const MAX_DESCRIPTION = 2000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 8000;

// --- Pure logica ---------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  euro: "€",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/**
 * HTML of platte tekst naar leesbare tekst met alinea's. Zwift en MyWhoosh
 * leveren omschrijvingen als HTML (MyWhoosh zelfs met &nbsp; tussen elk woord),
 * en ook JSON-LD-omschrijvingen bevatten soms tags.
 */
export function cleanDescription(input: string | null | undefined): string | null {
  if (!input) return null;
  const text = decodeEntities(
    input
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;
  if (text.length <= MAX_DESCRIPTION) return text;
  const cut = text.slice(0, MAX_DESCRIPTION);
  const lastBreak = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(". "));
  return `${(lastBreak > MAX_DESCRIPTION / 2 ? cut.slice(0, lastBreak + 1) : cut).trim()}…`;
}

function cleanText(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const text = decodeEntities(input).replace(/\s+/g, " ").trim();
  return text || null;
}

/**
 * Een datum uit JSON-LD of een meta-tag naar ISO. Met tijdzone is hij
 * eenduidig; zonder tijdzone nemen we Nederlandse tijd, want daar staan de
 * events die hier geplakt worden. Alleen een datum wordt middernacht: de
 * beheerder ziet dat en zet de starttijd zelf.
 */
export function parseEventDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const local = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?)?$/.exec(trimmed);
  if (local) return amsterdamWallTimeToIso(local[1], local[2] ?? "00:00");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return null;
  const date = new Date(trimmed.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function absoluteHttpUrl(value: unknown, base: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim(), base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Raadt de categorie uit titel, omschrijving en site. Bewust weinig regels:
 * een verkeerde gok is erger dan de standaard laten staan.
 */
export function guessEventType(
  source: EventPrefill["source"],
  title: string | null,
  description: string | null,
): string | null {
  const name = title ?? "";
  if (source === "zwift") {
    if (/zwift racing league|\bzrl\b|\bwtrl\b/i.test(name)) return "zrl";
    if (/flamme rouge|\bfrr\b/i.test(name)) return "flamme_rouge";
    if (/\bladder\b/i.test(name)) return "ladder";
    return "zwift";
  }
  if (source === "mywhoosh") return isSrcName(name) ? "src" : "mywhoosh";

  const text = `${name}\n${description ?? ""}`;
  if (/gran\s?fondo/i.test(text)) return "gran_fondo";
  if (/\bgravel\b/i.test(name)) return "gravel_race";
  if (/toertocht|tourtocht|fietstocht|cyclo(sportive)?\b|randonn[ée]e/i.test(text)) {
    return "toertocht";
  }
  return null;
}

/** Zwifts eventtypes: alleen een groepstraining zegt iets over het soort. */
export function guessEventKind(source: EventPrefill["source"], zwiftEventType: string | null) {
  if (source === "zwift" && zwiftEventType === "GROUP_WORKOUT") return "training";
  return null;
}

/** zwift-data geeft de wereld als slug: "makuri-islands" → "Makuri Islands". */
function worldName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Het voorstel uit een al opgehaald Zwift-event (zie lookupZwiftEvent). */
export function prefillFromZwift(event: ZwiftEventInfo, start: string | null): EventPrefill {
  const title = event.title || null;
  const description = cleanDescription(event.description);
  const startAt = parseEventDate(start);
  const endAt =
    startAt && event.durationMinutes
      ? new Date(Date.parse(startAt) + event.durationMinutes * 60_000).toISOString()
      : null;
  return {
    source: "zwift",
    title,
    description,
    start_at: startAt,
    end_at: endAt,
    location: event.route?.world ? `Zwift · ${worldName(event.route.world)}` : null,
    type: guessEventType("zwift", title, description),
    kind: guessEventKind("zwift", event.eventType),
    image_url: absoluteHttpUrl(event.imageUrl, event.externalUrl),
    external_url: event.externalUrl,
    distance_km: null,
    elevation_m: null,
  };
}

/** Het id uit een event.mywhoosh.com-link. */
export function parseMyWhooshEventUrl(input: string): string | null {
  const match = /event\.mywhoosh\.com\/(?:event\/detail|whoosh\/events)\/([a-z0-9]+)/i.exec(
    input.trim(),
  );
  return match?.[1] ?? null;
}

export type MyWhooshDetail = {
  name?: string | null;
  starting?: number | string | null;
  distance?: string | number | null;
  elevation?: string | number | null;
  image?: string | null;
  map?: string | null;
  details?: string | null;
};

function looseNumber(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const match = String(value ?? "").match(/(\d+(?:[.,]\d+)?)/);
  const parsed = match ? Number(match[1].replace(",", ".")) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function prefillFromMyWhoosh(event: MyWhooshDetail, id: string): EventPrefill {
  const title = cleanText(event.name);
  const description = cleanDescription(event.details);
  const starting = looseNumber(event.starting);
  const externalUrl = `https://event.mywhoosh.com/event/detail/${id}`;
  const elevation = looseNumber(event.elevation);
  return {
    source: "mywhoosh",
    title,
    description,
    start_at: starting ? new Date(starting * 1000).toISOString() : null,
    end_at: null,
    location: null,
    type: guessEventType("mywhoosh", title, description),
    kind: null,
    // De routekaart is geen cover, maar beter dan niets als er geen banner is.
    image_url: absoluteHttpUrl(event.image ?? event.map, externalUrl),
    external_url: externalUrl,
    distance_km: looseNumber(event.distance),
    elevation_m: elevation === null ? null : Math.round(elevation),
  };
}

type JsonLdNode = Record<string, unknown>;

function jsonLdNodes(value: unknown): JsonLdNode[] {
  if (Array.isArray(value)) return value.flatMap(jsonLdNodes);
  if (!value || typeof value !== "object") return [];
  const node = value as JsonLdNode;
  return [node, ...jsonLdNodes(node["@graph"])];
}

function isEventNode(node: JsonLdNode): boolean {
  const types = ([] as unknown[]).concat(node["@type"] ?? []);
  return types.some((type) => typeof type === "string" && /Event$/.test(type));
}

function jsonLdImage(value: unknown): unknown {
  if (Array.isArray(value)) return jsonLdImage(value[0]);
  if (value && typeof value === "object") return (value as JsonLdNode).url;
  return value;
}

function jsonLdLocation(value: unknown): string | null {
  const place = Array.isArray(value) ? value[0] : value;
  if (typeof place === "string") return cleanText(place);
  if (!place || typeof place !== "object") return null;
  const node = place as JsonLdNode;
  // Een online event heeft een VirtualLocation met alleen een URL.
  if (node["@type"] === "VirtualLocation") return null;
  const name = cleanText(node.name);
  const address = node.address;
  let addressText: string | null = null;
  if (typeof address === "string") {
    addressText = cleanText(address);
  } else if (address && typeof address === "object") {
    const a = address as JsonLdNode;
    addressText = [a.streetAddress, a.addressLocality]
      .map(cleanText)
      .filter(Boolean)
      .join(", ") || null;
  }
  if (name && addressText && !addressText.includes(name)) return `${name}, ${addressText}`;
  return name ?? addressText;
}

/** Titels als "Ronde van X | Wielervereniging Y": de sitenaam eraf. */
function stripSiteName(title: string | null, siteName: string | null): string | null {
  if (!title) return null;
  if (siteName) {
    const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const stripped = title.replace(new RegExp(`\\s*[|–—-]\\s*${escaped}\\s*$`, "i"), "").trim();
    if (stripped) return stripped;
  }
  return title;
}

/** Het voorstel uit de HTML van een willekeurige eventpagina. */
export function prefillFromHtml(html: string, pageUrl: string): EventPrefill {
  const $ = cheerio.load(html);
  const meta = (...keys: string[]) => {
    for (const key of keys) {
      const content = $(`meta[property="${key}"], meta[name="${key}"]`).first().attr("content");
      const text = cleanText(content);
      if (text) return text;
    }
    return null;
  };

  let event: JsonLdNode | null = null;
  $('script[type="application/ld+json"]').each((_, element) => {
    if (event) return;
    try {
      event = jsonLdNodes(JSON.parse($(element).text())).find(isEventNode) ?? null;
    } catch {
      // Kapotte JSON-LD komt voor; de meta-tags blijven dan over.
    }
  });
  const ld = (event ?? {}) as JsonLdNode;

  const siteName = meta("og:site_name");
  const title = stripSiteName(
    cleanText(ld.name) ?? meta("og:title", "twitter:title") ?? cleanText($("title").first().text()),
    siteName,
  );
  const description = cleanDescription(
    (typeof ld.description === "string" ? ld.description : null) ??
      meta("og:description", "twitter:description", "description"),
  );

  return {
    source: "web",
    title,
    description,
    start_at: parseEventDate(ld.startDate) ?? parseEventDate(meta("event:start_time")),
    end_at: parseEventDate(ld.endDate) ?? parseEventDate(meta("event:end_time")),
    location: jsonLdLocation(ld.location),
    type: guessEventType("web", title, description),
    kind: null,
    image_url:
      absoluteHttpUrl(jsonLdImage(ld.image), pageUrl) ??
      absoluteHttpUrl(meta("og:image", "og:image:url", "twitter:image"), pageUrl),
    // De link die de beheerder plakte, niet de canonical: die wijst bij
    // inschrijfplatforms soms naar een overzichtspagina.
    external_url: pageUrl,
    distance_km: null,
    elevation_m: null,
  };
}

// --- Ophalen -------------------------------------------------------------

const USER_AGENT = "Mozilla/5.0 (compatible; ZWB-Platform/1.0; +https://zwbcycling.nl)";

/**
 * GET met SSRF-controle op elke hop: safeFetch toetst alleen de eerste URL, en
 * een redirect naar een intern adres moet hier net zo goed geweigerd worden.
 */
async function fetchWithCheckedRedirects(raw: string, accept: string): Promise<Response> {
  let url = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeUrl(url);
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, accept, "accept-language": "nl,en;q=0.8" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url).toString();
      continue;
    }
    return response;
  }
  throw new Error("Te veel doorverwijzingen.");
}

async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Bestand is te groot.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/**
 * Onze eigen meldingen (SSRF-weigering, te groot) zijn Nederlands en mogen
 * door; "fetch failed" en een time-out zeggen een beheerder niets.
 */
function fetchError(err: unknown, fallback: string): string {
  if (err instanceof Error && !/fetch failed|abort|timeout|network/i.test(err.message)) {
    return err.message;
  }
  return fallback;
}

export type PrefillResult = { ok: true; prefill: EventPrefill } | { ok: false; error: string };

export async function fetchMyWhooshPrefill(id: string): Promise<PrefillResult> {
  try {
    const response = await fetchWithCheckedRedirects(
      `https://event.mywhoosh.com/whoosh/events/${encodeURIComponent(id)}`,
      "application/json",
    );
    if (!response.ok) return { ok: false, error: `MyWhoosh gaf status ${response.status}.` };
    const body = (await response.json()) as { data?: { event?: MyWhooshDetail } };
    const event = body.data?.event;
    if (!event?.name) return { ok: false, error: "MyWhoosh kent dit event niet." };
    return { ok: true, prefill: prefillFromMyWhoosh(event, id) };
  } catch (err) {
    return { ok: false, error: fetchError(err, "Kon MyWhoosh niet bereiken.") };
  }
}

export async function fetchWebPrefill(link: string): Promise<PrefillResult> {
  try {
    const response = await fetchWithCheckedRedirects(link, "text/html,application/xhtml+xml");
    if (!response.ok) return { ok: false, error: `De site gaf status ${response.status}.` };
    const type = response.headers.get("content-type") ?? "";
    if (type && !/html/i.test(type)) return { ok: false, error: "Deze link is geen webpagina." };
    const html = new TextDecoder().decode(await readCapped(response, MAX_HTML_BYTES));
    const prefill = prefillFromHtml(html, link);
    if (!prefill.title && !prefill.description && !prefill.start_at) {
      return { ok: false, error: "Op deze pagina staat geen eventinformatie." };
    }
    return { ok: true, prefill };
  } catch (err) {
    return { ok: false, error: fetchError(err, "Kon de pagina niet bereiken.") };
  }
}

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
/** Ruim onder de 20 MB van de event-photos-bucket (migr. 0060). */
const MAX_COVER_BYTES = 8_000_000;

/** Een coverafbeelding van een andere site ophalen om zelf te bewaren. */
export async function fetchCoverImage(
  imageUrl: string,
): Promise<{ bytes: Uint8Array; contentType: string; ext: string } | null> {
  try {
    const response = await fetchWithCheckedRedirects(imageUrl, "image/*");
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = IMAGE_TYPES[contentType];
    if (!ext) return null;
    return { bytes: await readCapped(response, MAX_COVER_BYTES), contentType, ext };
  } catch {
    return null;
  }
}
