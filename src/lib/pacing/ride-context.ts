// Tussen de database en zwift-setup.ts: welke regels gelden bij dit event, welke
// fietsen bestaan er, en met welke fysica rekent het plan van dit lid.
//
// Alleen een Zwift-route krijgt een RideContext. Een .gpx-route rekent zonder,
// en dus precies zoals vóór 21 september 2026.

import { bikeFrames } from "zwift-data";
import { storeZwiftEventRules } from "@/lib/events/zwift-route";
import type { PacingRoute } from "@/lib/pacing/route-profile";
import {
  constraintsFromZwiftEvent,
  defaultSetup,
  normalizeSetup,
  resolveRidePhysics,
  type BikeKind,
  type BikePart,
  type EventConstraints,
  ZWIFT_REF_HEIGHT_CM,
  ZWIFT_REF_WEIGHT_KG,
  type RidePhysics,
  type RideSetup,
} from "@/lib/pacing/zwift-setup";

type Client = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type ZwiftEventContext = {
  constraints: EventConstraints;
  parts: BikePart[];
};

export type RideContext = {
  setup: RideSetup;
  physics: RidePhysics;
  /** Vingerafdruk van de fysica; verandert die, dan is het plan verouderd. */
  key: string;
};

type RulesRow = {
  zwift_event_id: number | string | null;
  zwift_event_type: string | null;
  zwift_rules: string[] | null;
  zwift_tags: string[] | null;
  zwift_bike_hash: number | string | null;
};

/**
 * Regels en fietsen voor een Zwift-event. Staan de regels nog niet op het event
 * (gekoppeld vóór migratie 0176), dan halen we ze één keer op en bewaren ze.
 * Ontbreekt de migratie nog, dan valt alles terug op een gewone wedstrijd.
 */
export async function loadZwiftEventContext(
  admin: Client,
  eventId: string,
  route: PacingRoute,
): Promise<ZwiftEventContext | null> {
  if (route.source !== "zwift") return null;

  const readRules = async () => {
    const { data, error } = await admin
      .from("events")
      .select("zwift_event_id, zwift_event_type, zwift_rules, zwift_tags, zwift_bike_hash")
      .eq("id", eventId)
      .maybeSingle();
    return error ? null : ((data as RulesRow | null) ?? null);
  };

  let rules = await readRules();
  const zwiftEventId = Number(rules?.zwift_event_id);
  if (rules && rules.zwift_rules === null && Number.isSafeInteger(zwiftEventId) && zwiftEventId > 0) {
    if (await storeZwiftEventRules(admin, eventId, zwiftEventId).catch(() => false)) {
      rules = await readRules();
    }
  }

  const bikeHash = Number(rules?.zwift_bike_hash);
  const forcedFrame =
    Number.isSafeInteger(bikeHash) && bikeHash > 0
      ? (bikeFrames.find((frame) => frame.id === bikeHash)?.name ?? null)
      : null;

  const constraints = constraintsFromZwiftEvent(
    rules
      ? {
          eventType: rules.zwift_event_type,
          rules: rules.zwift_rules ?? [],
          tags: rules.zwift_tags ?? [],
          forcedFrame,
        }
      : null,
  );

  return { constraints, parts: await loadBikeParts(admin) };
}

type PartRow = {
  part: "frame" | "wheel";
  name: string;
  kind: BikeKind;
  test_frame: string;
  stage: number;
  cda_delta: number | string;
  kg_delta: number | string;
};

/** De fietslijst; leeg als die nog niet is opgehaald of de tabel nog ontbreekt. */
export async function loadBikeParts(admin: Client): Promise<BikePart[]> {
  const { data, error } = await admin
    .from("zwift_bike_parts")
    .select("part, name, kind, test_frame, stage, cda_delta, kg_delta")
    .order("name", { ascending: true })
    .limit(2000);
  if (error || !data) return [];
  return (data as PartRow[]).map((row) => ({
    part: row.part,
    name: row.name,
    kind: row.kind,
    testFrame: row.test_frame || null,
    stage: Number(row.stage),
    cdaDelta: Number(row.cda_delta),
    kgDelta: Number(row.kg_delta),
  }));
}

/**
 * De fysica voor dit lid: de opgeslagen keuzes (of een nieuwe keuze), anders de
 * standaard voor dit event.
 */
export function rideContextFor(
  zwift: ZwiftEventContext | null,
  setup: unknown,
  weightKg: number,
  heightCm: number | null = null,
): RideContext | null {
  if (!zwift) return null;
  const normalized = normalizeSetup(setup, defaultSetup(zwift.constraints));
  const resolve = (kg: number, cm: number | null) =>
    resolveRidePhysics({
      setup: normalized,
      constraints: zwift.constraints,
      parts: zwift.parts,
      weightKg: kg,
      heightCm: cm,
    });
  // De vingerafdruk op de referentierenner: een ander gewicht meldt
  // checkStaleness al zelf, met een drempel, en lengte en gewicht horen hier
  // geen tweede keer. Wat overblijft zijn fiets, format en spelregels.
  return {
    setup: normalized,
    physics: resolve(weightKg, heightCm),
    key: rideKey(resolve(ZWIFT_REF_WEIGHT_KG, ZWIFT_REF_HEIGHT_CM)),
  };
}

/** Lengte uit het receptenboek; null als die er niet is of de tabel ontbreekt. */
export async function loadHeightCm(admin: Client, profileId: string): Promise<number | null> {
  const { data, error } = await admin
    .from("nutrition_profiles")
    .select("height_cm")
    .eq("profile_id", profileId)
    .maybeSingle();
  const height = Number((data as { height_cm?: number | null } | null)?.height_cm);
  return !error && Number.isFinite(height) && height >= 120 && height <= 230 ? height : null;
}

/** Afgerond, zodat een herberekening met dezelfde keuzes niet als wijziging telt. */
export function rideKey(physics: RidePhysics): string {
  return [
    physics.format,
    physics.cda.toFixed(4),
    physics.rolling,
    physics.bikeKg.toFixed(2),
    physics.draftFactor.toFixed(3),
    physics.pullShare?.toFixed(3) ?? "-",
    [...physics.powerups].sort().join("+") || "geen",
  ].join("|");
}
