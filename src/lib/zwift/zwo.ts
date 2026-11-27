// De workout van een Zwift-groepstraining, samengevat tot duur en zwaarte.
//
// Elke subgroep van een `GROUP_WORKOUT` verwijst met `customUrl` naar een
// workoutbestand op cdn.zwift.com (gemeten 2026-11-27: bij alle 17 group
// workouts in de upcoming-lijst, ook bij een ZWB-clubevent; zonder login te
// lezen). Dat is ZWO-XML, ook als de naam op `.xml` eindigt.
//
// Bewust alleen een samenvatting en geen stappen: een ZWB-blok duurt hele
// minuten en kent binnen een blok alleen een burst vooraan of een vaste
// aan/uit-herhaling. De ladders van een groepstraining (60/45/30/15 s met 20 s
// rust) passen daar niet in. In Zwift rijdt het lid toch de workout van het
// event; het schema heeft de duur en de belasting nodig (keuze eigenaar
// 2026-11-27).

import { INTENSITY_FTP_RANGE } from "@/lib/training/workouts";

export type ZwoSummary = {
  name: string | null;
  seconds: number;
  /**
   * Het vermogen in %FTP dat over de hele duur dezelfde belasting geeft als de
   * stappen samen: de kwadratisch gemiddelde fractie. TSS rekent met IF², dus
   * één blok op dit vermogen telt even zwaar als de workout zelf.
   */
  pct: number;
};

/** Vrij rijden heeft geen doel; telt als het midden van de duurband. */
const FREE_RIDE_FRACTION =
  (INTENSITY_FTP_RANGE.endurance[0] + INTENSITY_FTP_RANGE.endurance[1]) / 200;
/** Een all-out stap zonder doel, als een burst. */
const MAX_EFFORT_FRACTION = 1.5;
/** Hoger dan dit is geen fractie van FTP meer; dan geldt de stap als vrij rijden. */
const MAX_FRACTION = 3;
/** Een workout langer dan dit is geen bruikbaar bestand. */
const MAX_SECONDS = 12 * 3600;

type Segment = { seconds: number; low: number; high: number };

function attributes(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of text.matchAll(/([A-Za-z]+)\s*=\s*"([^"]*)"/g)) out[match[1].toLowerCase()] = match[2];
  return out;
}

function seconds(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function fraction(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= MAX_FRACTION ? n : null;
}

/** Een stap van `low` naar `high`; gelijk bij een vaste stap. */
function segment(duration: number, low: number | null, high: number | null): Segment | null {
  if (duration <= 0) return null;
  const from = low ?? high ?? FREE_RIDE_FRACTION;
  const to = high ?? low ?? FREE_RIDE_FRACTION;
  return { seconds: duration, low: from, high: to };
}

function stepSegments(tag: string, attrs: Record<string, string>): Segment[] {
  const duration = seconds(attrs.duration);
  switch (tag) {
    case "steadystate":
    case "solidstate": {
      const power = fraction(attrs.power);
      const step = power != null
        ? segment(duration, power, power)
        : segment(duration, fraction(attrs.powerlow), fraction(attrs.powerhigh));
      return step ? [step] : [];
    }
    case "warmup":
    case "cooldown":
    case "ramp": {
      const step = segment(duration, fraction(attrs.powerlow), fraction(attrs.powerhigh));
      return step ? [step] : [];
    }
    case "intervalst": {
      const repeat = Math.max(1, Math.round(Number(attrs.repeat) || 1));
      const on = segment(
        seconds(attrs.onduration),
        fraction(attrs.onpower) ?? fraction(attrs.poweronlow),
        fraction(attrs.onpower) ?? fraction(attrs.poweronhigh),
      );
      const off = segment(
        seconds(attrs.offduration),
        fraction(attrs.offpower) ?? fraction(attrs.powerofflow),
        fraction(attrs.offpower) ?? fraction(attrs.poweroffhigh),
      );
      const pair = [on, off].filter((part): part is Segment => part !== null);
      return Array.from({ length: repeat }, () => pair).flat();
    }
    case "freeride": {
      const step = segment(duration, FREE_RIDE_FRACTION, FREE_RIDE_FRACTION);
      return step ? [step] : [];
    }
    case "maxeffort": {
      const step = segment(duration, MAX_EFFORT_FRACTION, MAX_EFFORT_FRACTION);
      return step ? [step] : [];
    }
    default:
      return [];
  }
}

/** Het gemiddelde van f² over een lineaire stap van a naar b. */
function meanSquare({ low: a, high: b }: Segment): number {
  return (a * a + a * b + b * b) / 3;
}

/**
 * Duur en belastingsgelijk vermogen van een ZWO-bestand, of null als het geen
 * fietsworkout is of er geen stappen in staan. Puur.
 */
export function summarizeZwo(xml: string): ZwoSummary | null {
  if (!/<workout_file\b/i.test(xml)) return null;
  const sport = /<sportType>\s*([^<]*?)\s*<\/sportType>/i.exec(xml)?.[1]?.toLowerCase();
  if (sport && sport !== "bike") return null;

  const body = /<workout>([\s\S]*?)<\/workout>/i.exec(xml)?.[1] ?? "";
  const segments = [...body.matchAll(/<([A-Za-z]+)\b([^>]*)>/g)].flatMap((match) =>
    stepSegments(match[1].toLowerCase(), attributes(match[2])),
  );
  const total = segments.reduce((sum, part) => sum + part.seconds, 0);
  if (total <= 0 || total > MAX_SECONDS) return null;

  const weighted = segments.reduce((sum, part) => sum + part.seconds * meanSquare(part), 0);
  const name = /<name>\s*([^<]*?)\s*<\/name>/i.exec(xml)?.[1] ?? "";
  return {
    name: decodeEntities(name).trim() || null,
    seconds: Math.round(total),
    pct: Math.round(Math.sqrt(weighted / total) * 100),
  };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Alleen workoutbestanden van Zwift zelf; een andere host halen we niet op. */
export function isZwiftWorkoutUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "cdn.zwift.com";
  } catch {
    return false;
  }
}
