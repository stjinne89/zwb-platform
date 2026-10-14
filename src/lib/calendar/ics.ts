// iCalendar (RFC 5545) voor het agenda-abonnement (/api/agenda/<token>).
//
// Bewust zonder bibliotheek: we schrijven alleen VEVENT's met een vaste set
// velden, en dat is een paar regels opmaak. Tijden gaan in UTC (met Z), dus er
// hoeft geen VTIMEZONE mee; de agenda-app zet ze zelf om naar de eigen zone.
// Een item zonder echte begintijd (een training op een dag) wordt een
// hele-dag-item met VALUE=DATE.

export type IcsTiming =
  | { kind: "time"; start: Date; end: Date }
  /** Hele dag; `date` is een datumsleutel YYYY-MM-DD. */
  | { kind: "date"; date: string };

export type IcsItem = {
  /** Stabiel per item, zodat een agenda-app een wijziging als update ziet. */
  uid: string;
  summary: string;
  timing: IcsTiming;
  description?: string | null;
  location?: string | null;
  url?: string | null;
};

export type IcsCalendar = {
  name: string;
  items: IcsItem[];
  /** Tijdstempel voor DTSTAMP; los mee te geven zodat tests vast liggen. */
  now?: Date;
};

const CRLF = "\r\n";

/** Escapen van een TEXT-waarde: backslash, puntkomma, komma en nieuwe regels. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Vouwt een regel op 75 octets (RFC 5545 §3.1): vervolgregels beginnen met een
 * spatie. Er wordt nooit midden in een UTF-8-teken geknipt.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  // De eerste regel mag 75 octets, de vervolgregels 74 plus de spatie.
  let limit = 75;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/** 2026-10-14T18:30:00.000Z -> 20261014T183000Z */
export function icsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** 2026-10-14 -> 20261014 */
function icsDate(dateKey: string): string {
  return dateKey.replace(/-/g, "");
}

/** De dag na een datumsleutel; DTEND van een hele-dag-item is exclusief. */
function nextDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function eventLines(item: IcsItem, stamp: string): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${item.uid}`, `DTSTAMP:${stamp}`];
  if (item.timing.kind === "time") {
    lines.push(`DTSTART:${icsUtc(item.timing.start)}`, `DTEND:${icsUtc(item.timing.end)}`);
  } else {
    lines.push(
      `DTSTART;VALUE=DATE:${icsDate(item.timing.date)}`,
      `DTEND;VALUE=DATE:${icsDate(nextDateKey(item.timing.date))}`,
      // Een training op een dag blokkeert de agenda niet.
      "TRANSP:TRANSPARENT",
    );
  }
  lines.push(`SUMMARY:${escapeIcsText(item.summary)}`);
  if (item.location) lines.push(`LOCATION:${escapeIcsText(item.location)}`);
  if (item.description) lines.push(`DESCRIPTION:${escapeIcsText(item.description)}`);
  if (item.url) lines.push(`URL:${item.url}`);
  lines.push("END:VEVENT");
  return lines;
}

export function buildIcsCalendar({ name, items, now = new Date() }: IcsCalendar): string {
  const stamp = icsUtc(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZWB//Agenda//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(name)}`,
    "X-WR-TIMEZONE:Europe/Amsterdam",
    // Een verzoek, geen garantie: Apple en Outlook volgen het ongeveer, Google
    // kiest zijn eigen ritme.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...items.flatMap((item) => eventLines(item, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}
