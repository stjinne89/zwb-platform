// Hoofdevents en teamevents (migr. 0178).
//
// Een ZRL-raceweek is één hoofdevent zonder team, met per team een event eronder
// via `parent_event_id`. Een FRR-tour (migr. 0195, 0196) heeft een laag meer:
// de tour, daaronder de etappes, en onder elke etappe de tijdslots, allemaal
// zonder team. Overzichten (kalender, dashboard) tonen het hoofdevent; alles
// waar een lid zich voor opgeeft of op plant (RSVP, schema, verslagen) gebeurt
// op het onderste event.

import type { SupabaseClient } from "@supabase/supabase-js";

type ParentLink = { id: string; parent_event_id?: string | null };

/** Splitst een lijst events in losse/hoofdevents en teamevents per hoofdevent. */
export function groupSubEvents<T extends ParentLink>(rows: T[]) {
  const topLevel: T[] = [];
  const childrenByParent = new Map<string, T[]>();
  const ids = new Set(rows.map((row) => row.id));
  for (const row of rows) {
    // Een teamevent waarvan het hoofdevent niet in de lijst zit (ander
    // tijdvenster, geen leesrecht) blijft zichtbaar als los event.
    if (row.parent_event_id && ids.has(row.parent_event_id)) {
      const list = childrenByParent.get(row.parent_event_id) ?? [];
      list.push(row);
      childrenByParent.set(row.parent_event_id, list);
    } else {
      topLevel.push(row);
    }
  }
  return { topLevel, childrenByParent };
}

/**
 * Het teamdeel van een teamtitel: "ZRL 2026/27 · R1 · W2 · ZRL A" onder
 * "ZRL 2026/27 · R1 · W2" wordt "ZRL A". Met de hand hernoemde teamevents
 * houden hun eigen titel.
 */
export function subEventLabel(title: string, parentTitle: string) {
  const base = parentTitle.replace(/ — .*$/, "");
  if (!title.startsWith(`${base} · `)) return title;
  return title.slice(base.length + 3).replace(/ — .*$/, "");
}

/**
 * Haalt de hoofdevents uit een lijst. Nodig waar een lid zich opgeeft of plant:
 * dat hoort op het teamevent, niet op de raceweek als geheel.
 */
export async function withoutParentEvents<T extends { id: string }>(
  client: SupabaseClient,
  rows: T[],
): Promise<T[]> {
  if (rows.length === 0) return rows;
  const { data } = await client
    .from("events")
    .select("parent_event_id")
    .in(
      "parent_event_id",
      rows.map((row) => row.id),
    );
  const parents = new Set(
    ((data ?? []) as Array<{ parent_event_id: string | null }>)
      .map((row) => row.parent_event_id)
      .filter(Boolean) as string[],
  );
  return parents.size === 0 ? rows : rows.filter((row) => !parents.has(row.id));
}

type RouteFigures = {
  distance_km?: number | string | null;
  elevation_m?: number | string | null;
};

function figureRange(values: Array<number | string | null | undefined>): string | null {
  const numbers = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (numbers.length === 0) return null;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return min === max ? String(min) : `${min}–${max}`;
}

/**
 * Afstand en hoogtemeters voor een overzichtsregel. Een raceweek heeft zelf
 * geen route; dan gelden die van zijn teamevents, als bereik wanneer A/B een
 * ronde meer rijden dan C/D: "28.66–41.2".
 */
export function groupRouteFigures(event: RouteFigures, children: RouteFigures[]) {
  const own = (key: keyof RouteFigures) =>
    figureRange([event[key]]) ?? figureRange(children.map((child) => child[key]));
  return { distanceKm: own("distance_km"), elevationM: own("elevation_m") };
}
