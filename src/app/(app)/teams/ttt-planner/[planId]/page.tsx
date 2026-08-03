import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, EmptyState, HelpLink } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlanRow = {
  id: string;
  event_id: string | null;
  parent_team_id: string;
  team_id: string | null;
  name: string;
  route: string;
  target_speed: number | string | null;
  intensity: number | null;
  efficiency: number | null;
  allow_zero_pulls: boolean | null;
  min_pull_duration: number | null;
  max_pull_duration: number | null;
  duration_interval: number | null;
  optimization_strategy: string | null;
  status: string;
  api_response: unknown;
  last_error: string | null;
  optimized_at: string | null;
  updated_at: string;
};

type RiderRow = {
  id: string;
  zwift_id: string | null;
  name: string;
  ftp_watts: number | null;
  weight_kg: number | string | null;
  height_cm: number | null;
  power_300_watts: number | null;
  pull_watts: number | null;
  pull_duration_seconds: number | null;
  display_order: number | null;
  role: string | null;
  notes: string | null;
  result: unknown;
};

type NamedRow = {
  id: string;
  name?: string | null;
  title?: string | null;
};

function n(value: number | string | null | undefined, digits = 0) {
  const number = Number(value ?? NaN);
  if (!Number.isFinite(number)) return "-";
  return number.toLocaleString("nl-NL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function apiData(apiResponse: unknown) {
  return typeof apiResponse === "object" &&
    apiResponse &&
    "data" in apiResponse &&
    typeof apiResponse.data === "object" &&
    apiResponse.data
    ? (apiResponse.data as Record<string, unknown>)
    : null;
}

function routeLabel(value: unknown) {
  if (value === "next_wtrl" || value === "next_zrl") return "Next ZRL";
  if (value === "next") return "Next";
  return String(value ?? "-");
}

function formatSeconds(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return [h, m, s]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .filter((part, index) => index > 0 || part !== "0")
    .join(":");
}

function exportText(plan: PlanRow, riders: RiderRow[]) {
  const rows = riders
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((rider, index) =>
      [
        index + 1,
        rider.name,
        rider.pull_watts ?? "",
        rider.pull_duration_seconds ?? "",
        rider.ftp_watts ?? "",
        rider.weight_kg ?? "",
      ].join("\t"),
    );
  return [
    plan.name,
    "Volgorde\tRider\tPull watts\tPull duur\tFTP\tGewicht",
    ...rows,
  ].join("\n");
}

export default async function TttPlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();

  const [{ data: plan }, { data: riders }] = await Promise.all([
    supabase.from("ttt_plans").select("*").eq("id", planId).maybeSingle<PlanRow>(),
    supabase
      .from("ttt_plan_riders")
      .select("*")
      .eq("plan_id", planId)
      .order("display_order"),
  ]);

  if (!plan) notFound();

  const riderRows = ((riders ?? []) as RiderRow[]).sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  const result = apiData(plan.api_response);
  const teamIds = Array.from(
    new Set([plan.parent_team_id, plan.team_id].filter(Boolean) as string[]),
  );
  const [{ data: teamRows }, { data: eventRow }] = await Promise.all([
    supabase.from("teams").select("id, name").in("id", teamIds),
    plan.event_id
      ? supabase.from("events").select("id, title").eq("id", plan.event_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const names = new Map(((teamRows ?? []) as NamedRow[]).map((row) => [row.id, row.name ?? null]));
  const parentName = names.get(plan.parent_team_id) ?? "Team";
  const raceTeamName = plan.team_id ? names.get(plan.team_id) ?? parentName : parentName;
  const eventTitle = (eventRow as NamedRow | null)?.title ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="TTT Planner"
        title={plan.name}
        description={`${raceTeamName}${eventTitle ? ` - ${eventTitle}` : ""} - ${plan.status}`}
        actions={
          <div className="flex items-center gap-2">
            <HelpLink href="/hulp#ttt-beheer" />
            <Link
              href={`/teams/ttt-planner?plan=${plan.id}`}
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Open in planner
            </Link>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Geschatte tijd" value={formatSeconds(result?.estimated_time_seconds)} />
        <Metric
          label="Gem. snelheid"
          value={
            result?.estimated_avg_speed
              ? `${n(result.estimated_avg_speed as number, 1)} kph`
              : "-"
          }
        />
        <Metric
          label="Team power"
          value={result?.team_avg_power ? `${n(result.team_avg_power as number)}w` : "-"}
        />
        <Metric label="Route" value={routeLabel(result?.route ?? plan.route)} />
      </section>

      {plan.last_error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {plan.last_error}
        </p>
      )}

      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Raceplan</h2>
          <p className="text-sm text-muted-foreground">
            Bijgewerkt {new Date(plan.updated_at).toLocaleString("nl-NL")}
          </p>
        </div>

        {riderRows.length === 0 ? (
          <EmptyState className="mt-4">Geen riders in dit plan.</EmptyState>
        ) : (
          <ResponsiveTable
            className="mt-4"
            rows={riderRows}
            rowKey={(rider) => String(rider.id)}
            minWidth={760}
            columns={[
              {
                key: "name",
                header: "Rider",
                primary: true,
                cell: (rider, index) => `${index + 1}. ${rider.name}`,
                cellClassName: "font-medium",
              },
              {
                key: "zwift",
                header: "Zwift ID",
                secondary: true,
                cell: (rider) => rider.zwift_id ?? "-",
              },
              { key: "ftp", header: "FTP", align: "right", cell: (rider) => `${n(rider.ftp_watts)}w` },
              { key: "kg", header: "Kg", align: "right", cell: (rider) => n(rider.weight_kg, 1) },
              {
                key: "p300",
                header: "300s",
                align: "right",
                cell: (rider) => `${n(rider.power_300_watts)}w`,
              },
              {
                key: "pull",
                header: "Pull watts",
                align: "right",
                cell: (rider) => `${n(rider.pull_watts)}w`,
              },
              {
                key: "pullDur",
                header: "Pull duur",
                align: "right",
                cell: (rider) => `${rider.pull_duration_seconds ?? "-"}s`,
              },
              {
                key: "notes",
                header: "Notities",
                cell: (rider) => rider.notes ?? "-",
                cellClassName: "text-muted-foreground",
              },
            ]}
          />
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Tekstexport</h2>
          <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
            {exportText(plan, riderRows)}
          </pre>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Planbestand</h2>
          <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(plan.api_response ?? {}, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
