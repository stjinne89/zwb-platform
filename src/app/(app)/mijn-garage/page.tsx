import Link from "next/link";
import { redirect } from "next/navigation";
import { Bike } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ConnectWithStrava, StravaAttribution } from "@/components/strava-brand";
import { EmptyState, PageHeader, SectionHeader } from "@/components/app-ui";
import { cn } from "@/lib/utils";
import {
  componentLabel,
  isDiscipline,
  isInspection,
  rangeLabel,
  type Discipline,
  type WearMetric,
  type WearRange,
} from "@/lib/maintenance/component-types";
import { formatWear, wearProgress, wearStatus, type WearStatus } from "@/lib/maintenance/status";
import { loadTips, pickTip } from "@/lib/maintenance/tips";
import { ComponentForm, type FormBike } from "./_components/component-form";
import { ComponentActions } from "./_components/component-actions";
import { BikeControls } from "./_components/bike-controls";

type BikeRow = {
  id: string;
  name: string | null;
  brand_model: string | null;
  distance_m: number | string;
  manual_distance_m: number | string | null;
  retired: boolean;
  image_url: string | null;
  source: string | null;
  discipline: string | null;
};

type ComponentRow = {
  id: string;
  bike_id: string;
  component_type: string;
  name: string | null;
  wear_range: WearRange;
  wear_metric: WearMetric | null;
  threshold_value: number | null;
  threshold_km: number;
  baseline_distance_m: number | string;
  installed_at: string | null;
};

const STATUS_STYLE: Record<
  WearStatus,
  { label: string; inspectionLabel: string; badge: string; bar: string }
> = {
  ok: {
    label: "OK",
    inspectionLabel: "OK",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  soon: {
    label: "Bijna",
    inspectionLabel: "Bijna",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  due: {
    label: "Vervangen",
    inspectionLabel: "Nakijken",
    badge: "bg-destructive/10 text-destructive",
    bar: "bg-destructive",
  },
};

function bikeLabel(b: BikeRow): string {
  return b.name?.trim() || b.brand_model?.trim() || "Fiets";
}

/** Handmatige fietsen tellen zelf; Strava-fietsen krijgen hun stand uit de sync. */
function bikeDistanceM(b: BikeRow): number {
  return b.source === "manual"
    ? Number(b.manual_distance_m) || 0
    : Number(b.distance_m) || 0;
}

function bikeDiscipline(b: BikeRow): Discipline {
  return isDiscipline(b.discipline) ? b.discipline : "race";
}

function fmtKm(km: number): string {
  return `${Math.round(km).toLocaleString("nl-NL")} km`;
}

export default async function MijnGaragePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: bikes }, { data: components }] = await Promise.all([
    supabase
      .from("strava_bikes")
      .select(
        "id, name, brand_model, distance_m, manual_distance_m, retired, image_url, source, discipline",
      )
      .eq("profile_id", user.id)
      .order("is_primary", { ascending: false }),
    supabase
      .from("bike_components")
      .select(
        "id, bike_id, component_type, name, wear_range, wear_metric, threshold_value, threshold_km, baseline_distance_m, installed_at",
      )
      .eq("profile_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
  ]);

  const header = (
    <PageHeader
      eyebrow="Mijn garage"
      title="Mijn garage"
      description="Je fietsen en de slijtage van hun onderdelen."
    />
  );

  const bikeRows = (bikes ?? []) as BikeRow[];
  if (bikeRows.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState action={<ConnectWithStrava />}>
          Nog geen fietsen. Koppel Strava, of voeg een fiets handmatig toe op je{" "}
          <Link href="/profiel#fietsen" className="underline underline-offset-2">
            profiel
          </Link>
          .
        </EmptyState>
      </div>
    );
  }

  const componentRows = (components ?? []) as ComponentRow[];
  const tips = await loadTips(
    supabase,
    componentRows.map((c) => c.component_type),
  );
  const byBike = new Map<string, ComponentRow[]>();
  for (const c of componentRows) {
    const list = byBike.get(c.bike_id) ?? [];
    list.push(c);
    byBike.set(c.bike_id, list);
  }

  const formBikes: FormBike[] = bikeRows
    .filter((b) => !b.retired)
    .map((b) => ({
      id: b.id,
      label: `${bikeLabel(b)} — ${fmtKm(bikeDistanceM(b) / 1000)}`,
      discipline: bikeDiscipline(b),
    }));

  return (
    <div className="space-y-8">
      {header}

      <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        Een wekker, geen keuring — blijf zelf kijken en voelen. Zie de{" "}
        <Link href="/voorwaarden" className="underline underline-offset-2">
          gebruikersvoorwaarden
        </Link>
        .
      </p>

      {formBikes.length > 0 && <ComponentForm bikes={formBikes} />}

      {bikeRows.map((b) => {
        const distance = bikeDistanceM(b);
        const discipline = bikeDiscipline(b);
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
              action={
                <BikeControls
                  bikeId={b.id}
                  discipline={discipline}
                  manual={b.source === "manual"}
                  distanceKm={distance / 1000}
                />
              }
            />
            {list.length === 0 ? (
              <EmptyState>Nog geen onderdelen voor deze fiets.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {list.map((c) => {
                  const metric: WearMetric = c.wear_metric ?? "km";
                  const threshold = c.threshold_value ?? c.threshold_km;
                  const { worn, pct } = wearProgress({
                    metric,
                    threshold,
                    bikeDistanceM: distance,
                    baselineDistanceM: Number(c.baseline_distance_m) || 0,
                    since: c.installed_at,
                  });
                  const status = wearStatus(pct);
                  const style = STATUS_STYLE[status];
                  const inspection = isInspection(c.component_type);
                  return (
                    <li key={c.id} className="rounded-lg border bg-card p-4">
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
                              {inspection ? style.inspectionLabel : style.label}
                            </span>
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {formatWear(metric, worn)} van {formatWear(metric, threshold)} ·{" "}
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
                      {(() => {
                        const tip = pickTip(tips, c.component_type, discipline);
                        if (!tip) return null;
                        return (
                          <p className="mt-3 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
                            {tip.body}
                            {tip.source_name && (
                              <span className="mt-0.5 block text-xs">
                                — {tip.source_name}
                                {tip.source_url && (
                                  <>
                                    {" · "}
                                    <a
                                      href={tip.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline underline-offset-2"
                                    >
                                      bron
                                    </a>
                                  </>
                                )}
                              </span>
                            )}
                          </p>
                        );
                      })()}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <StravaAttribution />
    </div>
  );
}
