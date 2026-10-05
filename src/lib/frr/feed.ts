// Een FRR-tour uit de Zwift-kalender: etappes met tijdsloten (migr. 0195).
//
// FRR zet elke etappe als losse Zwift-events neer, één per tijdslot, allemaal
// met de tourtag (`frrignite`). De publieke API geeft ze in één keer terug met
// `?tags=`. Een etappe herkennen we aan de naam, niet aan de dag: het laatste
// slot (23:30 UTC) valt in Nederland al op de volgende dag.
//
// Puur, zodat het op de vastgelegde Ignite-feed getest kan worden.

import type { ZwiftEventApiRow } from "@/lib/events/external-scan";
import { mapZwiftEvent, type ZwiftEventInfo } from "@/lib/events/zwift-route";

export const FRR_TAG_PATTERN = /^frr[a-z0-9]+$/;

export type FrrStageName = {
  tourName: string;
  stage: number;
  /** "iTT", "Queen", … of null. */
  suffix: string | null;
};

export type FrrSlot = {
  zwiftEventId: number;
  startAt: string;
  description: string | null;
  info: ZwiftEventInfo;
};

export type FrrStage = {
  stage: number;
  suffix: string | null;
  tourName: string;
  /** Oplopend op starttijd. */
  slots: FrrSlot[];
};

export type FrrFeed = {
  tourName: string | null;
  stages: FrrStage[];
  /** Eventnamen zonder herkenbaar etappenummer. */
  unrecognised: string[];
  warnings: string[];
};

/** "Tour Ignite - Stage 3 iTT" en "Tour Ignite - Queen Stage 8". */
export function parseFrrStageName(name: string): FrrStageName | null {
  const match =
    /^(.+?)\s+[-–]\s+(?:(\S+)\s+)?Stage\s+(\d+)(?:\s+(.+))?$/i.exec(name.trim());
  if (!match) return null;
  const stage = Number(match[3]);
  if (!Number.isSafeInteger(stage) || stage < 1) return null;
  const suffix = [match[2], match[4]].filter(Boolean).join(" ").trim();
  return { tourName: match[1].trim(), stage, suffix: suffix || null };
}

export function groupFrrFeed(rows: ZwiftEventApiRow[]): FrrFeed {
  const byStage = new Map<number, FrrStage>();
  const unrecognised: string[] = [];
  const warnings: string[] = [];
  const tourNames = new Set<string>();

  for (const row of rows) {
    const info = mapZwiftEvent(row);
    if (!info || !info.startAt) continue;
    const startAt = new Date(info.startAt).toISOString();
    const parsed = parseFrrStageName(info.title);
    if (!parsed) {
      unrecognised.push(info.title || String(info.eventId));
      continue;
    }
    tourNames.add(parsed.tourName);
    const stage = byStage.get(parsed.stage) ?? {
      stage: parsed.stage,
      suffix: parsed.suffix,
      tourName: parsed.tourName,
      slots: [],
    };
    if (stage.slots.some((slot) => slot.zwiftEventId === info.eventId)) continue;
    stage.slots.push({
      zwiftEventId: info.eventId,
      startAt,
      description: (row.description ?? "").trim() || null,
      info,
    });
    byStage.set(parsed.stage, stage);
  }

  const stages = [...byStage.values()].sort((a, b) => a.stage - b.stage);
  for (const stage of stages) {
    stage.slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
    const routes = new Set(stage.slots.map((slot) => slot.info.routeId));
    if (routes.size > 1) {
      warnings.push(`Etappe ${stage.stage} heeft slots op verschillende routes.`);
    }
  }
  if (tourNames.size > 1) {
    warnings.push(`Meer dan één tour onder deze tag: ${[...tourNames].join(", ")}.`);
  }

  return {
    tourName: tourNames.size === 1 ? [...tourNames][0] : null,
    stages,
    unrecognised,
    warnings,
  };
}

/** "Tour Ignite" → "Ignite". */
export function frrShortName(tourName: string) {
  return tourName.replace(/^tour\s+/i, "").trim() || tourName.trim();
}

function suffixLabel(suffix: string | null) {
  if (!suffix) return null;
  return suffix.replace(/\bqueen\b/i, "Koninginnenrit");
}

/** Titel van het tourevent: "FRR Ignite". */
export function frrTourTitle(tourName: string) {
  return `FRR ${frrShortName(tourName)}`;
}

/**
 * Titel van een etappe: "FRR Ignite · Etappe 3 · iTT". De toevoeging staat met
 * " · " en niet met " — ", want subEventLabel knipt alles na " — " weg en dan
 * zou de knop in de kalender "iTT" missen.
 */
export function frrStageTitle(tourName: string, stage: number, suffix: string | null) {
  const base = `${frrTourTitle(tourName)} · Etappe ${stage}`;
  const extra = suffixLabel(suffix);
  return extra ? `${base} · ${extra}` : base;
}

/**
 * Een individuele tijdrit: "iTT" of "TT" in de titel, of het eventtype van
 * Zwift. Een ploegentijdrit ("TTT") niet.
 */
export function isFrrTimeTrial(event: { title: string | null; zwiftEventType?: string | null }) {
  return event.zwiftEventType === "TIME_TRIAL" || /\bi?TT\b/i.test(event.title ?? "");
}

/** Titel van een tijdslot: "FRR Ignite · Etappe 3 · iTT · 07:00". */
export function frrSlotTitle(
  tourName: string,
  stage: number,
  suffix: string | null,
  label: string,
) {
  return `${frrStageTitle(tourName, stage, suffix)} · ${label}`;
}

/**
 * Een titel die de import zelf maakte, en dus bijgewerkt mag worden. Ook de
 * vorm van vóór het tourevent ("… · Etappe 3 — iTT").
 */
export function isGeneratedFrrTitle(title: string) {
  return /^FRR [^·]+( · Etappe \d+( · [^·]+?)?( — [^·]+)?( · \d{2}:\d{2}( \(\+1\))?)?)?$/.test(
    title,
  );
}

const TIME = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});
const DAY = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Amsterdam",
});

/** Nederlandse dag van een tijdstip, als "2026-10-03". */
export function amsterdamDay(iso: string) {
  return DAY.format(new Date(iso));
}

/**
 * Starttijd van een slot in Nederlandse tijd. Valt het slot na middernacht, dan
 * met "(+1)", zodat 01:30 niet vóór 07:00 van dezelfde etappe lijkt te liggen.
 */
export function frrSlotLabel(startAt: string, stageDay: string) {
  const time = TIME.format(new Date(startAt));
  return amsterdamDay(startAt) > stageDay ? `${time} (+1)` : time;
}
