// Vermogen-tab: de power-duration curve van de renner, met vermoeidheidscurves
// en dezelfde clubbrede vergelijking als op de vermogenspagina van het lid.

import { Users } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { fetchIntervalsPowerCurve } from "@/lib/intervals/client";
import { PowerCurveChart } from "@/components/charts/power-curve-chart";
import {
  COMPARISON_RIDER_COLUMNS,
  COMPARISON_RIDER_COLUMNS_NO_FATIGUE,
  comparisonRidersFromRows,
  downsample,
} from "@/lib/teams/comparison-riders";
import type { SearchParamsProp } from "../../_components/types";
import { loadAthlete, loadAthleteConnection, trainerContext } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export default async function TrainerPowerPage({ searchParams }: SearchParamsProp) {
  const context = await trainerContext(searchParams);
  if (!context.ok) {
    return (
      <EmptyState>
        {context.reason === "no-permission"
          ? "Je hebt geen trainer-rechten."
          : "Geen toegewezen leden."}
      </EmptyState>
    );
  }
  const { viewer, athleteId } = context;

  const [athlete, connection] = await Promise.all([
    loadAthlete(viewer, athleteId),
    loadAthleteConnection(viewer, athleteId),
  ]);

  const curve = connection?.api_key
    ? await fetchIntervalsPowerCurve(connection.api_key, connection.athlete_id, "90d", {
        includeFatigue: true,
      }).catch(() => null)
    : null;
  const points = curve?.points ?? [];

  if (points.length < 2) {
    return <EmptyState>Nog geen vermogenscurve bekend voor dit lid.</EmptyState>;
  }

  // Vergelijkingscurves: dezelfde clubbrede momentopname als op de
  // vermogenspagina, leesbaar via RLS dus zonder admin-client. Zonder migratie
  // 0108 bestaat curve_points_fatigue nog niet; val dan terug.
  let comparisonRows = null;
  for (const columns of [COMPARISON_RIDER_COLUMNS, COMPARISON_RIDER_COLUMNS_NO_FATIGUE]) {
    const { data, error } = await viewer.supabase
      .from("rider_power_profiles")
      .select(columns)
      .in("sync_status", ["ok", "partial"])
      .neq("profile_id", athleteId);
    if (!error) {
      comparisonRows = data;
      break;
    }
  }
  const comparisonRiders = comparisonRidersFromRows(comparisonRows);

  return (
    <section className="rounded-lg border bg-card p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-semibold">Power-duration curve</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Users className="size-3.5" />
          {comparisonRiders.length} vergelijkbare ZWB-profielen
        </span>
      </div>
      <PowerCurveChart
        ownName={athlete?.display_name ?? "Renner"}
        ownWeightKg={athlete?.weight_kg ? Number(athlete.weight_kg) : null}
        ownPoints={downsample(points)}
        fatigueCurves={(curve?.fatigueCurves ?? []).flatMap((fatigue) => {
          const curvePoints = downsample(fatigue.points);
          return curvePoints.length > 1 ? [{ afterKj: fatigue.afterKj, points: curvePoints }] : [];
        })}
        riders={comparisonRiders}
        idSuffix="coach"
      />
    </section>
  );
}
