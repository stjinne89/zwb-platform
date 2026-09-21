// Haalt de ZwiftInsider-testsheet op en vervangt de fietslijst (migratie 0177).
//
// Drie CSV-exports van dezelfde openbare sheet, samen ruim 60 kB. De adressen
// liggen vast in bike-sheet.ts; er komt geen gebruikersinvoer in een URL, dus
// geen safeFetch. Google stuurt de export door naar googleusercontent.com.

import {
  BIKE_SHEET_ID,
  BIKE_SHEET_TABS,
  bikeSheetCsvUrl,
  deriveCatalog,
  parseBaselineTab,
  parseFramesTab,
  parseWheelsTab,
  type DerivedCatalog,
} from "@/lib/zwift/bike-sheet";

type Client = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

/** Onder dit aantal frames is de sheet niet goed gelezen; dan niets vervangen. */
const MIN_FRAMES = 50;

async function fetchTab(gid: string): Promise<string> {
  const response = await fetch(bikeSheetCsvUrl(gid), {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`De sheet gaf status ${response.status}.`);
  return response.text();
}

export type BikeSyncResult = {
  frames: number;
  wheels: number;
  catalog: DerivedCatalog;
};

export async function syncBikeParts(admin: Client): Promise<BikeSyncResult> {
  const [frames, wheels, baseline] = await Promise.all([
    fetchTab(BIKE_SHEET_TABS.frames),
    fetchTab(BIKE_SHEET_TABS.wheels),
    fetchTab(BIKE_SHEET_TABS.baseline),
  ]);

  const catalog = deriveCatalog({
    frames: parseFramesTab(frames),
    wheels: parseWheelsTab(wheels),
    baseline: parseBaselineTab(baseline),
  });
  const frameCount = catalog.parts.filter((part) => part.part === "frame").length;
  const wheelCount = catalog.parts.length - frameCount;
  if (frameCount < MIN_FRAMES) {
    throw new Error(
      `Maar ${frameCount} frames gelezen; de opbouw van de sheet is waarschijnlijk veranderd. Er is niets vervangen.`,
    );
  }

  const source = `https://docs.google.com/spreadsheets/d/${BIKE_SHEET_ID} (ZwiftInsider)`;
  const syncedAt = new Date().toISOString();
  const rows = catalog.parts.map((part) => ({
    part: part.part,
    name: part.name,
    kind: part.kind,
    test_frame: part.testFrame ?? "",
    stage: part.stage,
    cda_delta: part.cdaDelta,
    kg_delta: part.kgDelta,
    source,
    synced_at: syncedAt,
  }));

  // Eerst de nieuwe rijen, dan wat er niet meer in de sheet staat weg. Zo is de
  // lijst nooit leeg voor een lid dat halverwege het pacingplan opent.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin
      .from("zwift_bike_parts")
      .upsert(rows.slice(i, i + 500), { onConflict: "part,name,test_frame,stage" });
    if (error) throw new Error(error.message);
  }
  const { error: cleanupError } = await admin
    .from("zwift_bike_parts")
    .delete()
    .lt("synced_at", syncedAt);
  if (cleanupError) throw new Error(cleanupError.message);

  return { frames: frameCount, wheels: wheelCount, catalog };
}
