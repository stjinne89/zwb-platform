// Slijtage-evaluatie: vergelijkt per actief onderdeel de gereden km met de
// drempel en stuurt één gebundelde push als er onderdelen toe zijn aan
// vervanging. Idempotent via notified_at — een onderdeel meldt maar één keer
// (reset naar null bij vervangen of drempel aanpassen).

import { sendNotificationToMembers } from "@/lib/push/send";
import { componentLabel } from "@/lib/maintenance/component-types";

type BikeRow = { id: string; distance_m: number | string };
type ComponentRow = {
  id: string;
  bike_id: string;
  component_type: string;
  name: string | null;
  threshold_km: number;
  baseline_distance_m: number | string;
  notified_at: string | null;
};

export async function evaluateMaintenanceForProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<{ alerted: number }> {
  const [{ data: bikes }, { data: components }] = await Promise.all([
    admin.from("strava_bikes").select("id, distance_m").eq("profile_id", profileId),
    admin
      .from("bike_components")
      .select("id, bike_id, component_type, name, threshold_km, baseline_distance_m, notified_at")
      .eq("profile_id", profileId)
      .eq("status", "active"),
  ]);

  const bikeRows = (bikes ?? []) as BikeRow[];
  const componentRows = (components ?? []) as ComponentRow[];
  if (componentRows.length === 0 || bikeRows.length === 0) return { alerted: 0 };

  const bikeDistance = new Map(
    bikeRows.map((b) => [b.id, Number(b.distance_m) || 0]),
  );

  const due: ComponentRow[] = [];
  for (const c of componentRows) {
    if (c.notified_at) continue;
    const distance = bikeDistance.get(c.bike_id);
    if (distance == null) continue;
    const wornKm = (distance - (Number(c.baseline_distance_m) || 0)) / 1000;
    if (wornKm >= c.threshold_km) due.push(c);
  }

  if (due.length === 0) return { alerted: 0 };

  const names = due.map((c) => c.name?.trim() || componentLabel(c.component_type));
  const body =
    names.length === 1
      ? `${names[0]} is toe aan vervanging.`
      : `${names.length} onderdelen zijn toe aan vervanging: ${names.join(", ")}.`;

  await sendNotificationToMembers(
    "on_maintenance_due",
    { title: "Onderhoud", body, url: "/onderhoud", tag: "maintenance" },
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
