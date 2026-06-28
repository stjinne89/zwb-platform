import Link from "next/link";
import { redirect } from "next/navigation";
import { Bike } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, SectionHeader } from "@/components/app-ui";
import { cn } from "@/lib/utils";
import {
  componentLabel,
  rangeLabel,
  type WearRange,
} from "@/lib/maintenance/component-types";
import { wearPct, wearStatus, type WearStatus } from "@/lib/maintenance/status";
import { ComponentForm } from "./_components/component-form";
import { ComponentActions } from "./_components/component-actions";

type BikeRow = {
  id: string;
  name: string | null;
  brand_model: string | null;
  distance_m: number | string;
  retired: boolean;
  image_url: string | null;
};

type ComponentRow = {
  id: string;
  bike_id: string;
  component_type: string;
  name: string | null;
  wear_range: WearRange;
  threshold_km: number;
  baseline_distance_m: number | string;
};

const STATUS_STYLE: Record<WearStatus, { label: string; badge: string; bar: string }> = {
  ok: {
    label: "OK",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  soon: {
    label: "Bijna",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  due: {
    label: "Vervangen",
    badge: "bg-destructive/10 text-destructive",
    bar: "bg-destructive",
  },
};

function bikeLabel(b: BikeRow): string {
  return b.name?.trim() || b.brand_model?.trim() || "Fiets";
}

function fmtKm(km: number): string {
  return `${Math.round(km).toLocaleString("nl-NL")} km`;
}

export default async function OnderhoudPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: conn }, { data: bikes }, { data: components }] = await Promise.all([
    supabase
      .from("strava_connections")
      .select("profile_id")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("strava_bikes")
      .select("id, name, brand_model, distance_m, retired, image_url")
      .eq("profile_id", user.id)
      .eq("source", "strava")
      .order("is_primary", { ascending: false }),
    supabase
      .from("bike_components")
      .select(
        "id, bike_id, component_type, name, wear_range, threshold_km, baseline_distance_m",
      )
      .eq("profile_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
  ]);

  const header = (
    <PageHeader
      eyebrow="Onderhoud"
      title="Onderhoud"
      description="Houd de slijtage van je onderdelen bij op basis van je Strava-kilometers."
    />
  );

  if (!conn) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          action={
            <Link
              href="/profiel#strava"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Strava koppelen
            </Link>
          }
        >
          Koppel eerst Strava om je fietsen en kilometers op te halen.
        </EmptyState>
      </div>
    );
  }

  const bikeRows = (bikes ?? []) as BikeRow[];
  if (bikeRows.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState>
          Nog geen fietsen gevonden. Zodra je Strava-sync je fietsen heeft
          opgehaald verschijnen ze hier.
        </EmptyState>
      </div>
    );
  }

  const componentRows = (components ?? []) as ComponentRow[];
  const byBike = new Map<string, ComponentRow[]>();
  for (const c of componentRows) {
    const list = byBike.get(c.bike_id) ?? [];
    list.push(c);
    byBike.set(c.bike_id, list);
  }

  const bikeOptions = bikeRows
    .filter((b) => !b.retired)
    .map((b) => ({ id: b.id, label: `${bikeLabel(b)} — ${fmtKm(Number(b.distance_m) / 1000)}` }));

  return (
    <div className="space-y-8">
      {header}

      {bikeOptions.length > 0 && <ComponentForm bikes={bikeOptions} />}

      {bikeRows.map((b) => {
        const distance = Number(b.distance_m) || 0;
        const list = byBike.get(b.id) ?? [];
        return (
          <section key={b.id}>
            <SectionHeader
              icon={b.image_url ? undefined : Bike}
              title={
                <span className="flex min-w-0 items-center gap-2">
                  {b.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.image_url}
                      alt={bikeLabel(b)}
                      className="size-7 shrink-0 rounded-md border object-cover"
                    />
                  )}
                  <span className="truncate">
                    {bikeLabel(b)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {fmtKm(distance / 1000)}
                    </span>
                  </span>
                </span>
              }
            />
            {list.length === 0 ? (
              <EmptyState>Nog geen onderdelen voor deze fiets.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {list.map((c) => {
                  const { wornKm, pct } = wearPct(
                    distance,
                    Number(c.baseline_distance_m) || 0,
                    c.threshold_km,
                  );
                  const status = wearStatus(pct);
                  const style = STATUS_STYLE[status];
                  return (
                    <li
                      key={c.id}
                      className="rounded-lg border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            {componentLabel(c.component_type)}
                            {c.name && (
                              <span className="text-sm font-normal text-muted-foreground">
                                {c.name}
                              </span>
                            )}
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-xs font-semibold",
                                style.badge,
                              )}
                            >
                              {style.label}
                            </span>
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {fmtKm(wornKm)} van {fmtKm(c.threshold_km)} ·{" "}
                            {rangeLabel(c.wear_range)}
                          </p>
                        </div>
                        <ComponentActions componentId={c.id} />
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", style.bar)}
                          style={{ width: `${Math.min(100, Math.round(pct * 100))}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
