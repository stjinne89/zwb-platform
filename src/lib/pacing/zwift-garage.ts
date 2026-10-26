// De Zwift-garage van een lid: welke frames (met upgradeniveau) en welke wielen
// het in Zwift heeft. Snelste fiets rekent daarmee in het pacingplan en in de
// racebriefing. ZWB kan de garage niet uit Zwift lezen; het lid vult hem in op
// /mijn-garage/zwift. Tabel member_zwift_bikes, migratie 0277.

import type { BikePart } from "@/lib/pacing/zwift-setup";

type Client = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type ZwiftGarage = {
  /** Frame → upgradeniveau. */
  frames: Record<string, number>;
  /** Leeg = niet ingevuld: dan tellen alle wielen mee. */
  wheels: string[];
};

export type GarageRow = { part: "frame" | "wheel"; name: string; stage: number };

/**
 * Van rijen naar een garage, met alleen namen die de fietslijst kent: een naam
 * die na een nieuwe sheet verdwenen is, telt niet mee. Null zonder frames, dan
 * rekent Snelste fiets met alle fietsen.
 */
export function garageFromRows(rows: GarageRow[], parts: BikePart[]): ZwiftGarage | null {
  const frameNames = new Set(parts.filter((part) => part.part === "frame").map((part) => part.name));
  const wheelNames = new Set(parts.filter((part) => part.part === "wheel").map((part) => part.name));
  const frames: Record<string, number> = {};
  const wheels: string[] = [];
  for (const row of rows) {
    if (row.part === "frame" && frameNames.has(row.name)) {
      frames[row.name] = Math.min(5, Math.max(0, Math.round(Number(row.stage) || 0)));
    } else if (row.part === "wheel" && wheelNames.has(row.name)) {
      wheels.push(row.name);
    }
  }
  return Object.keys(frames).length > 0 ? { frames, wheels } : null;
}

/** De rijen van dit lid; leeg als de tabel nog ontbreekt (migratie 0277). */
export async function loadGarageRows(client: Client, profileId: string): Promise<GarageRow[]> {
  const { data, error } = await client
    .from("member_zwift_bikes")
    .select("part, name, stage")
    .eq("profile_id", profileId)
    .limit(1000);
  if (error || !data) return [];
  return (data as GarageRow[]).map((row) => ({ part: row.part, name: row.name, stage: Number(row.stage) || 0 }));
}

export async function loadZwiftGarage(
  client: Client,
  profileId: string,
  parts: BikePart[],
): Promise<ZwiftGarage | null> {
  return garageFromRows(await loadGarageRows(client, profileId), parts);
}
