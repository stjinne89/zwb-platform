import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/net/safe-fetch";

export type ExternalEventSource = "mywhoosh" | "zwift";

export type ExternalEventCandidate = {
  source: ExternalEventSource;
  externalId: string;
  title: string;
  startAt: string;
  externalUrl: string;
  distanceKm: number | null;
  elevationM: number | null;
  rawMetadata: Record<string, unknown>;
};

export type ExternalEventScanResult = {
  candidates: ExternalEventCandidate[];
  notes: string[];
};

export type ZwiftEventApiRow = {
  id?: number | string;
  name?: string;
  description?: string | null;
  eventStart?: string;
  distanceInMeters?: number;
  durationInSeconds?: number;
  laps?: number;
  sport?: string;
  type?: string;
  eventType?: string;
  eventSeries?: { id?: number | string; name?: string | null } | null;
  eventSubgroups?: Array<{
    id?: number | string;
    subgroupLabel?: string | null;
    eventSubgroupStart?: string | null;
    distanceInMeters?: number | null;
    rangeAccessLabel?: string | null;
  }>;
};

type MyWhooshDetailApiResponse = {
  status?: boolean;
  data?: {
    event?: {
      id?: string;
      name?: string;
      starting?: number | string | null;
      distance?: string | number | null;
      elevation?: string | number | null;
      date?: string | null;
      time?: string | null;
      participants?: {
        capacity?: number | null;
        booked?: number | null;
      } | null;
      categories?: Record<string, Array<{
        distance?: number | string | null;
        elevation?: number | string | null;
        time?: string | null;
        name?: string | null;
      }>>;
    };
  };
};

type MyWhooshCard = {
  id: string;
  title: string | null;
  externalUrl: string;
  distanceKm: number | null;
  elevationM: number | null;
  sourceText: string;
};

function compactText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function parseNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseLooseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const match = String(value).match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function titleFromMyWhooshText(text: string) {
  return compactText(
    text
      .replace(/^.*?\bGMT\+4\b\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}/, "")
      .replace(/\d+(?:\.\d+)?\s*km/i, "")
      .replace(/\d+\s*m/i, "")
      .replace(/\bExplore\b.*$/i, ""),
  );
}

function myWhooshIdFromUrl(raw: string) {
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/event\/detail\/([^/]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function parseZwiftDate(value: string | undefined) {
  if (!value) return null;
  const normalized = value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function zwiftEventUrl(id: string | number) {
  return `https://www.zwift.com/events/view/${id}`;
}

/** Mapt een Zwift event-API-rij naar een kandidaat. `null` bij onbruikbare data. */
export function mapZwiftEventRow(
  row: ZwiftEventApiRow,
): ExternalEventCandidate | null {
  if (row.id == null || !row.name) return null;
  const startAt = parseZwiftDate(row.eventStart);
  if (!startAt) return null;

  const distanceMeters =
    Number(row.distanceInMeters) > 0
      ? Number(row.distanceInMeters)
      : Math.max(
          0,
          ...((row.eventSubgroups ?? [])
            .map((subgroup) => Number(subgroup.distanceInMeters ?? 0))
            .filter(Number.isFinite) as number[]),
        );

  return {
    source: "zwift",
    externalId: String(row.id),
    title: compactText(row.name),
    startAt,
    externalUrl: zwiftEventUrl(row.id),
    distanceKm: distanceMeters > 0 ? distanceMeters / 1000 : null,
    elevationM: null,
    rawMetadata: {
      eventType: row.eventType ?? row.type ?? null,
      sport: row.sport ?? null,
      durationInSeconds: row.durationInSeconds ?? null,
      laps: row.laps ?? null,
      series: row.eventSeries?.name ?? null,
      subgroups: (row.eventSubgroups ?? []).map((subgroup) => ({
        id: subgroup.id ?? null,
        label: subgroup.subgroupLabel ?? null,
        startAt: parseZwiftDate(subgroup.eventSubgroupStart ?? undefined),
        range: subgroup.rangeAccessLabel ?? null,
      })),
    },
  };
}

export async function scanZwiftEvents(): Promise<ExternalEventCandidate[]> {
  const response = await safeFetch(
    "https://us-or-rly101.zwift.com/api/public/events/upcoming",
    {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    },
  );
  if (!response.ok) return [];

  const rows = (await response.json()) as ZwiftEventApiRow[];
  if (!Array.isArray(rows)) return [];

  return rows
    .flatMap((row) => {
      const candidate = mapZwiftEventRow(row);
      return candidate ? [candidate] : [];
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function scanMyWhooshEvents(): Promise<ExternalEventCandidate[]> {
  const response = await safeFetch("https://mywhoosh.com/events/", {
    cache: "no-store",
  });
  if (!response.ok) return [];

  const html = await response.text();
  const $ = cheerio.load(html);
  const cards = new Map<string, MyWhooshCard>();

  $(".card").each((_, element) => {
    const card = $(element);
    const href = card.find("a[href*='event.mywhoosh.com/event/detail/']").first().attr("href");
    if (!href) return;

    const externalUrl = new URL(href, "https://mywhoosh.com").toString();
    const id = myWhooshIdFromUrl(externalUrl);
    if (!id) return;

    const text = compactText(card.text());
    const title = compactText(card.find(".card-title").first().text()) || null;
    cards.set(id, {
      id,
      title,
      externalUrl,
      distanceKm: parseNumber(text, /(\d+(?:\.\d+)?)\s*km/i),
      elevationM: parseNumber(text, /(\d+)\s*m/i),
      sourceText: text,
    });
  });

  if (cards.size === 0) {
    $("a[href*='event.mywhoosh.com/event/detail/']").each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;
      const externalUrl = new URL(href, "https://mywhoosh.com").toString();
      const id = myWhooshIdFromUrl(externalUrl);
      if (!id || cards.has(id)) return;
      const text = compactText($(element).parent().text());
      cards.set(id, {
        id,
        title: titleFromMyWhooshText(text) || null,
        externalUrl,
        distanceKm: parseNumber(text, /(\d+(?:\.\d+)?)\s*km/i),
        elevationM: parseNumber(text, /(\d+)\s*m/i),
        sourceText: text,
      });
    });
  }

  const candidates: ExternalEventCandidate[] = [];
  for (const card of cards.values()) {
    try {
      const detailResponse = await safeFetch(
        `https://event.mywhoosh.com/whoosh/events/${encodeURIComponent(card.id)}`,
        {
          cache: "no-store",
          headers: {
            accept: "application/json",
          },
        },
      );
      if (!detailResponse.ok) continue;
      const detail = (await detailResponse.json()) as MyWhooshDetailApiResponse;
      const event = detail.data?.event;
      const starting = parseLooseNumber(event?.starting);
      if (!event || !starting) continue;
      const startAt = new Date(starting * 1000).toISOString();
      const title = compactText(event.name ?? card.title ?? "");
      if (!title) continue;

      candidates.push({
      source: "mywhoosh",
      externalId: card.id,
      title,
      startAt,
      externalUrl: card.externalUrl,
      distanceKm: parseLooseNumber(event.distance) ?? card.distanceKm,
      elevationM: parseLooseNumber(event.elevation) ?? card.elevationM,
      rawMetadata: {
        sourceText: card.sourceText,
        date: event.date ?? null,
        time: event.time ?? null,
        participants: event.participants ?? null,
      },
      });
    } catch {
      // Negeer een kapotte detailpagina; andere MyWhoosh events kunnen nog werken.
    }
  }

  return candidates.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function verifyZwiftEventsPage() {
  const response = await safeFetch("https://www.zwift.com/events", {
    cache: "no-store",
  });
  if (!response.ok) {
    return "Zwift eventpagina kon niet worden opgehaald.";
  }
  const html = await response.text();
  if (/Race|Time Trial|Team Time Trial/i.test(html)) {
    return "Zwift eventfilters zijn publiek zichtbaar, maar concrete eventrijen ontbreken in server-side HTML.";
  }
  return "Zwift eventpagina is bereikbaar, maar leverde geen bruikbare eventmetadata.";
}

export async function scanExternalEvents(): Promise<ExternalEventScanResult> {
  const candidates: ExternalEventCandidate[] = [];
  const notes: string[] = [];

  try {
    const myWhooshEvents = await scanMyWhooshEvents();
    candidates.push(...myWhooshEvents);
    notes.push(
      myWhooshEvents.length > 0
        ? `MyWhoosh scan klaar: ${myWhooshEvents.length} events gevonden.`
        : "MyWhoosh scan klaar: geen events gevonden.",
    );
  } catch (error) {
    notes.push(
      error instanceof Error
        ? `MyWhoosh scan mislukt: ${error.message}`
        : "MyWhoosh scan mislukt.",
    );
  }

  try {
    const zwiftEvents = await scanZwiftEvents();
    candidates.push(...zwiftEvents);
    notes.push(
      zwiftEvents.length > 0
        ? `Zwift scan klaar: ${zwiftEvents.length} events gevonden.`
        : await verifyZwiftEventsPage(),
    );
  } catch (error) {
    notes.push(
      error instanceof Error
        ? `Zwift verificatie mislukt: ${error.message}`
        : "Zwift verificatie mislukt.",
    );
  }

  return {
    candidates: candidates.sort((a, b) => a.startAt.localeCompare(b.startAt)),
    notes,
  };
}
