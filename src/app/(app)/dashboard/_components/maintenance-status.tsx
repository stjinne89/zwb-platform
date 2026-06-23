import Link from "next/link";
import { Wrench } from "lucide-react";
import { SectionHeader, InlineMoreLink } from "@/components/app-ui";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { componentLabel } from "@/lib/maintenance/component-types";
import { wearPct, wearStatus } from "@/lib/maintenance/status";

type BikeRow = { id: string; distance_m: number | string };
type ComponentRow = {
  id: string;
  bike_id: string;
  component_type: string;
  name: string | null;
  threshold_km: number;
  baseline_distance_m: number | string;
};

// Toont alleen onderdelen die bijna/over de drempel zijn. Rendert niets als
// alles groen is of er geen fietsen/onderdelen zijn.
export async function MaintenanceStatus({ profileId }: { profileId: string }) {
  if (!profileId) return null;
  const supabase = await createClient();

  const [{ data: bikes }, { data: components }] = await Promise.all([
    supabase.from("strava_bikes").select("id, distance_m").eq("profile_id", profileId),
    supabase
      .from("bike_components")
      .select("id, bike_id, component_type, name, threshold_km, baseline_distance_m")
      .eq("profile_id", profileId)
      .eq("status", "active"),
  ]);

  const bikeRows = (bikes ?? []) as BikeRow[];
  const componentRows = (components ?? []) as ComponentRow[];
  if (bikeRows.length === 0 || componentRows.length === 0) return null;

  const bikeDistance = new Map(bikeRows.map((b) => [b.id, Number(b.distance_m) || 0]));

  const flagged = componentRows
    .map((c) => {
      const distance = bikeDistance.get(c.bike_id) ?? 0;
      const { pct } = wearPct(distance, Number(c.baseline_distance_m) || 0, c.threshold_km);
      return { c, pct, status: wearStatus(pct) };
    })
    .filter((x) => x.status !== "ok")
    .sort((a, b) => b.pct - a.pct);

  if (flagged.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Wrench}
        title={
          <Link href="/onderhoud" className="hover:text-primary hover:underline">
            Onderhoud
          </Link>
        }
        action={<InlineMoreLink href="/onderhoud">Alles</InlineMoreLink>}
      />
      <ul className="grid gap-2 sm:grid-cols-2">
        {flagged.map(({ c, status }) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm"
          >
            <span className="min-w-0 truncate">
              {componentLabel(c.component_type)}
              {c.name && (
                <span className="text-muted-foreground"> · {c.name}</span>
              )}
            </span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold",
                status === "due"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              )}
            >
              {status === "due" ? "Vervangen" : "Bijna"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
