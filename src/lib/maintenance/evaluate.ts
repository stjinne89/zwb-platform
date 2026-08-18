// Slijtage-evaluatie: kijkt per actief onderdeel of de drempel gehaald is en
// stuurt één gebundelde push. Idempotent via notified_at — een onderdeel meldt
// maar één keer (reset naar null bij vervangen of drempel aanpassen).
//
// Sinds Mijn garage rekent niet alles in kilometers: remvloeistof, kabels,
// vering en stuurlint gaan op maanden sinds de montagedatum.

import { sendNotificationToMembers } from "@/lib/push/send";
import { componentLabel, isInspection, type WearMetric } from "@/lib/maintenance/component-types";
import { wearProgress } from "@/lib/maintenance/status";

type BikeRow = {
  id: string;
  distance_m: number | string;
  manual_distance_m: number | string | null;
  source: string | null;
};

type ComponentRow = {
  id: string;
  bike_id: string;
  component_type: string;
  name: string | null;
  wear_metric: WearMetric | null;
  threshold_value: number | null;
  threshold_km: number;
  baseline_distance_m: number | string;
  installed_at: string | null;
  notified_at: string | null;
};

export async function evaluateMaintenanceForProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<{ alerted: number }> {
  const [{ data: bikes }, { data: components }] = await Promise.all([
    admin
      .from("strava_bikes")
      .select("id, distance_m, manual_distance_m, source")
      .eq("profile_id", profileId),
    admin
      .from("bike_components")
      .select(
        "id, bike_id, component_type, name, wear_metric, threshold_value, threshold_km, baseline_distance_m, installed_at, notified_at",
      )
      .eq("profile_id", profileId)
      .eq("status", "active"),
  ]);

  const bikeRows = (bikes ?? []) as BikeRow[];
  const componentRows = (components ?? []) as ComponentRow[];
  if (componentRows.length === 0 || bikeRows.length === 0) return { alerted: 0 };

  const bikeDistance = new Map(
    bikeRows.map((b) => [
      b.id,
      b.source === "manual"
        ? Number(b.manual_distance_m) || 0
        : Number(b.distance_m) || 0,
    ]),
  );

  const due: ComponentRow[] = [];
  for (const c of componentRows) {
    if (c.notified_at) continue;
    const distance = bikeDistance.get(c.bike_id);
    if (distance == null) continue;
    const { pct } = wearProgress({
      metric: c.wear_metric ?? "km",
      threshold: c.threshold_value ?? c.threshold_km,
      bikeDistanceM: distance,
      baselineDistanceM: Number(c.baseline_distance_m) || 0,
      since: c.installed_at,
    });
    if (pct >= 1) due.push(c);
  }

  if (due.length === 0) return { alerted: 0 };

  // Nakijkpunten (balhoofd, zadelpen) vervang je niet, dus die krijgen andere
  // woorden — anders staat er "vervang je balhoofdlager".
  const replace = due.filter((c) => !isInspection(c.component_type));
  const inspect = due.filter((c) => isInspection(c.component_type));
  const label = (c: ComponentRow) => c.name?.trim() || componentLabel(c.component_type);
  const parts: string[] = [];
  if (replace.length > 0) {
    parts.push(`${replace.map(label).join(", ")} ${replace.length === 1 ? "is" : "zijn"} toe aan vervanging.`);
  }
  if (inspect.length > 0) {
    parts.push(`Even nakijken: ${inspect.map(label).join(", ")}.`);
  }

  await sendNotificationToMembers(
    "on_maintenance_due",
    { title: "Mijn garage", body: parts.join(" "), url: "/mijn-garage", tag: "maintenance" },
    { profileIds: [profileId] },
  );

  await admin
    .from("bike_components")
    .update({ notified_at: new Date().toISOString() })
    .in(
      "id",
      due.map((c) => c.id),
    );

  return { alerted: due.length };
}
