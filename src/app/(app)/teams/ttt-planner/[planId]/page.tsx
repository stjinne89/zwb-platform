import { notFound } from "next/navigation";
import { BackLink, PageHeader, EmptyState, HelpLink } from "@/components/app-ui";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { getRequestAccess } from "@/lib/auth/request";
import { createClient } from "@/lib/supabase/server";
import { formatSeconds, routeLabel, zwiftGopherData } from "@/lib/ttt/plan-export";
import { TttPlanActions } from "../_components/plan-actions";
import { TttCheatsheet } from "../_components/ttt-cheatsheet";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// De cheatsheet vult bij een oude snapshot één keer het vermogen aan bij Zwift.
export const maxDuration = 30;

type PlanRow = {
  id: string;
  event_id: string | null;
  parent_team_id: string;
  team_id: string | null;
  name: string;
  route: string;
  target_speed: number | string | null;
  api_response: unknown;
  last_error: string | null;
  published_at: string | null;
  share_token: string | null;
  updated_at: string;
};

type RiderRow = {
  id: string;
  zwift_id: string | null;
  name: string;
  ftp_watts: number | null;
  weight_kg: number | string | null;
  pull_watts: number | null;
  pull_duration_seconds: number | null;
  display_order: number | null;
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

/** IF in procenten, zoals ZwiftGopher die bij de import meegaf. */
function intensityFactor(rider: RiderRow) {
  const value =
    typeof rider.result === "object" && rider.result
      ? (rider.result as Record<string, unknown>).intensity_factor
      : null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Het plan kwam uit een export van ZwiftGopher (en niet uit de oude optimizer). */
function importInfo(apiResponse: unknown) {
  if (typeof apiResponse !== "object" || !apiResponse) return null;
  const data = apiResponse as Record<string, unknown>;
  if (data.source !== "zwiftgopher") return null;
  return {
    importedAt: typeof data.importedAt === "string" ? data.importedAt : null,
    targetSpeedKmh: typeof data.targetSpeedKmh === "number" ? data.targetSpeedKmh : null,
  };
}

function exportText(plan: PlanRow, riders: RiderRow[]) {
  const rows = riders.map((rider, index) =>
    [
      index + 1,
      rider.name,
      rider.pull_watts ?? "",
      rider.pull_duration_seconds ?? "",
      rider.ftp_watts ?? "",
      rider.weight_kg ?? "",
    ].join("\t"),
  );
  return [plan.name, "Volgorde\tRider\tPull watts\tPull duur\tFTP\tGewicht", ...rows].join("\n");
}

export default async function TttPlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();

  const [access, { data: plan }, { data: riders }] = await Promise.all([
    getRequestAccess(),
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
  const teamIds = Array.from(
    new Set([plan.parent_team_id, plan.team_id].filter(Boolean) as string[]),
  );
  const [{ data: teamRows }, { data: eventRow }, { data: captainRows }] = await Promise.all([
    supabase.from("teams").select("id, name").in("id", teamIds),
    plan.event_id
      ? supabase.from("events").select("id, title").eq("id", plan.event_id).maybeSingle()
      : Promise.resolve({ data: null }),
    access.user
      ? supabase
          .from("team_members")
          .select("team_id")
          .in("team_id", teamIds)
          .eq("profile_id", access.user.id)
          .in("role", ["captain", "co-captain"])
      : Promise.resolve({ data: [] }),
  ]);
  const canManage = access.has("teams.manage_roster") || (captainRows ?? []).length > 0;
  // Zonder raceteam geldt het plan voor het hoofdteam: dan tellen de races van de subteams.
  const { data: childTeams } = canManage && !plan.team_id
    ? await supabase.from("teams").select("id").eq("parent_team_id", plan.parent_team_id)
    : { data: [] };
  const cheatsheetTeamIds = plan.team_id
    ? [plan.team_id]
    : [plan.parent_team_id, ...((childTeams ?? []) as Array<{ id: string }>).map((t) => t.id)];

  const names = new Map(((teamRows ?? []) as NamedRow[]).map((row) => [row.id, row.name ?? null]));
  const parentName = names.get(plan.parent_team_id) ?? "Team";
  const raceTeamName = plan.team_id ? names.get(plan.team_id) ?? parentName : parentName;
  const eventTitle = (eventRow as NamedRow | null)?.title ?? null;

  const imported = importInfo(plan.api_response);
  const result = zwiftGopherData(plan.api_response);
  const hasIf = riderRows.some((rider) => intensityFactor(rider) != null);
  const hasNotes = riderRows.some((rider) => rider.notes);

  return (
    <div className="space-y-6">
      <BackLink href="/teams/ttt-planner" label="TTT Planner" />
      <PageHeader
        eyebrow="TTT Planner"
        title={plan.name}
        description={`${raceTeamName}${eventTitle ? ` - ${eventTitle}` : ""} - ${plan.published_at ? "gepubliceerd" : "concept"}`}
        actions={<HelpLink href="/hulp#ttt-beheer" />}
      />

      {canManage && (
        <TttPlanActions
          planId={plan.id}
          published={Boolean(plan.published_at)}
          shared={Boolean(plan.share_token)}
        />
      )}

      {imported ? (
        <section className="grid gap-3 md:grid-cols-3">
          <Metric label="Renners" value={String(riderRows.length)} />
          <Metric
            label="Doelsnelheid vlak"
            value={imported.targetSpeedKmh ? `${n(imported.targetSpeedKmh, 1)} kph` : "-"}
          />
          <Metric
            label="Uit ZwiftGopher"
            value={
              imported.importedAt
                ? new Date(imported.importedAt).toLocaleString("nl-NL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-"
            }
          />
        </section>
      ) : (
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
      )}

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
            minWidth={640}
            columns={[
              {
                key: "name",
                header: "Rider",
                primary: true,
                cell: (rider, index) => `${index + 1}. ${rider.name}`,
                cellClassName: "font-medium",
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
              ...(hasIf
                ? [
                    {
                      key: "if",
                      header: "IF",
                      align: "right" as const,
                      cell: (rider: RiderRow) => {
                        const value = intensityFactor(rider);
                        return value != null ? `${n(value)}%` : "-";
                      },
                    },
                  ]
                : []),
              { key: "ftp", header: "FTP", align: "right", cell: (rider) => `${n(rider.ftp_watts)}w` },
              { key: "kg", header: "Kg", align: "right", cell: (rider) => n(rider.weight_kg, 1) },
              {
                key: "zwift",
                header: "Zwift ID",
                secondary: true,
                cell: (rider) => rider.zwift_id ?? "-",
              },
              ...(hasNotes
                ? [
                    {
                      key: "notes",
                      header: "Notities",
                      cell: (rider: RiderRow) => rider.notes ?? "-",
                      cellClassName: "text-muted-foreground",
                    },
                  ]
                : []),
            ]}
          />
        )}
      </section>

      {canManage && (
        <TttCheatsheet
          teamIds={cheatsheetTeamIds}
          riders={riderRows.map((rider) => ({
            zwiftId: Number(rider.zwift_id) || null,
            name: rider.name,
            ftp: rider.ftp_watts,
            pullWatts: rider.pull_watts,
            pullSeconds: rider.pull_duration_seconds,
          }))}
        />
      )}

      <section className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Tekstexport</h2>
        <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
          {exportText(plan, riderRows)}
        </pre>
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
