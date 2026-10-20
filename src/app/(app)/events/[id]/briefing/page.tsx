import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackLink, EmptyState, SectionHeader } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive-table";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { loadRaceBriefing, type BriefingRider, type BriefingView, type OwnBriefingRider } from "@/lib/race-briefing/load";
import { FORMAT_LABELS } from "@/lib/race-briefing/rules";
import { cleanRiderName, ROLE_LABELS, type ProjectedTeam } from "@/lib/race-briefing/field";
import { climbSeconds } from "@/lib/race-briefing/route";
import { climbLabel, durationLabel, km } from "@/lib/race-briefing/tips";
import { cn } from "@/lib/utils";
import { ZwiftRouteSection } from "../_components/zwift-route-section";
import { BikeAdviceList } from "../_components/bike-advice-list";
import { saveRaceBriefing } from "./_actions";
import { RaceSheet } from "./_components/race-sheet";
import { ShareableSheet } from "./_components/share-sheet";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";
// Na het antwoord ververst de pagina de ZRS van de groep bij Zwift (één profiel
// tegelijk, ±20 s); zie lib/race-briefing/metrics.ts.
export const maxDuration = 30;

export const metadata: Metadata = { title: "Racebriefing" };

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const dateLabel = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

const nl1 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nl2 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wkg = (value: number | null | undefined) => (value == null ? "—" : nl2.format(value));
const pct = (gradient: number) => `${nl1.format(gradient * 100)} %`;

function History({ labels, places }: { labels: string[]; places: Array<number | null> }) {
  if (labels.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="tabular-nums">
      {places.map((p, i) => (
        <span key={labels[i]} className={cn("mr-1.5", p === 1 && "font-semibold")} title={labels[i]}>
          {p ?? "·"}
        </span>
      ))}
    </span>
  );
}

/** Plan en rollen voor het racebriefje; alleen voor wie het team beheert. */
function PlanForm({ view }: { view: BriefingView }) {
  if (!view.canEdit) return null;
  const inPen = view.own.filter((r) => r.inPen);
  return (
    <section className="space-y-3">
      <SectionHeader title="Plan en rollen" />
      <form action={saveRaceBriefing} className="space-y-3 rounded-lg border bg-card p-3">
        <input type="hidden" name="event_id" value={view.event.id} />
        <label htmlFor="briefing-plan" className="sr-only">
          Plan
        </label>
        <textarea id="briefing-plan" name="plan" rows={5} maxLength={4000} defaultValue={view.plan?.text ?? ""} placeholder="Plan" className={FIELD} />
        {inPen.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {inPen.map((r) => (
              <label key={r.zwiftId} className="text-sm">
                <span className="mb-1 block font-medium">{cleanRiderName(r.name)}</span>
                <input
                  id={`briefing-role-${r.zwiftId}`}
                  name={`role_${r.zwiftId}`}
                  maxLength={60}
                  defaultValue={r.captainRole ?? ""}
                  placeholder={ROLE_LABELS[r.role]}
                  className={FIELD}
                />
              </label>
            ))}
          </div>
        )}
        <Button type="submit" size="sm">
          Opslaan
        </Button>
      </form>
    </section>
  );
}

function RouteKeyPointsTable({ view }: { view: BriefingView }) {
  if (!view.route) return null;
  const { keyPoints } = view.route;
  const category = view.division?.category ?? null;
  const rows = keyPoints.climbs.map((climb) => {
    const descent = keyPoints.descentsIntoClimbs.find((d) => d.climb === climb)?.descent ?? null;
    const finale = keyPoints.finale.kind === "climb" && keyPoints.finale.climb === climb;
    return { climb, descent, finale };
  });
  if (rows.length === 0) return null;
  const columns: Array<ResponsiveColumn<(typeof rows)[number]>> = [
    { key: "km", header: "Km", cell: (r) => `${nl1.format(r.climb.startKm)}–${nl1.format(r.climb.endKm)}`, secondary: true },
    { key: "name", header: "Klim", cell: (r) => <span className="font-medium">{climbLabel(r.climb)}</span>, primary: true },
    { key: "gain", header: "Hoogte", cell: (r) => `${r.climb.gainM} m`, align: "right" },
    { key: "grade", header: "Gem. / steilst", cell: (r) => `${pct(r.climb.avgGradient)} / ${pct(r.climb.maxGradient)}`, align: "right" },
    { key: "time", header: "Kop", cell: (r) => durationLabel(climbSeconds(r.climb, category)), align: "right" },
    {
      key: "note",
      header: "",
      cell: (r) =>
        r.descent ? `na ${r.descent.dropM} m afdalen` : r.finale && keyPoints.finale.kind === "climb" ? `finale, nog ${km(keyPoints.finale.runInKm)}` : "",
    },
  ];
  return <ResponsiveTable columns={columns} rows={rows} rowKey={(r) => String(r.climb.startKm)} />;
}

function Bikes({ view }: { view: BriefingView }) {
  if (!view.bikes) return null;
  const { advice, wkg: riderWkg } = view.bikes;
  const reference = advice.best.some((row) => row.frame === advice.current.frame && row.wheels === advice.current.wheels);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        Snelste fiets{" "}
        <span className="font-normal text-muted-foreground">
          · stage {advice.stage} · {nl1.format(riderWkg)} W/kg
        </span>
      </p>
      <BikeAdviceList rows={reference ? advice.best : [...advice.best, advice.current]} baseSeconds={advice.best[0].seconds} />
    </div>
  );
}

function OwnTable({ view }: { view: BriefingView }) {
  const velo = view.zwiftRacing;
  const columns: Array<ResponsiveColumn<OwnBriefingRider>> = [
    {
      key: "name",
      header: "Renner",
      primary: true,
      cell: (r) => (
        <span className="font-medium">
          {r.name}
          {!r.inPen && <span className="ml-2 text-xs font-normal text-muted-foreground">niet in de groep</span>}
        </span>
      ),
    },
    { key: "role", header: "Rol", cell: (r) => r.captainRole ?? <span className="text-muted-foreground">{ROLE_LABELS[r.role]}</span> },
    { key: "expected", header: "Verwacht", cell: (r) => r.expectedPlace ?? "—", align: "right" },
    { key: "zrs", header: "ZRS", cell: (r) => r.metrics?.racingScore ?? "—", align: "right" },
    ...(velo ? [{ key: "velo", header: "vELO", cell: (r: OwnBriefingRider) => (r.metrics?.velo ? Math.round(r.metrics.velo) : "—"), align: "right" as const }] : []),
    {
      key: "zftp",
      header: "zFTP / zMAP",
      cell: (r) => (
        <span className={cn(r.limits.status === "near" && "text-amber-600", r.limits.status === "over" && "font-semibold text-destructive")}>
          {wkg(r.zftpWkg)} / {wkg(r.zmapWkg)}
        </span>
      ),
      align: "right",
    },
    { key: "history", header: view.historyLabels.join(" · ") || "Eerder", cell: (r) => <History labels={view.historyLabels} places={r.history} />, align: "right" },
  ];
  return <ResponsiveTable columns={columns} rows={view.own} rowKey={(r) => String(r.zwiftId)} minWidth={640} />;
}

function TeamsTable({ view }: { view: BriefingView }) {
  const teams = view.projection?.teams ?? [];
  if (teams.length === 0) return null;
  const label = (t: ProjectedTeam) => view.teamLabels[t.team] ?? t.team;
  const columns: Array<ResponsiveColumn<ProjectedTeam>> = [
    { key: "team", header: "Ploeg", cell: (t) => <span className={cn(t.own && "font-semibold")}>{label(t)}</span>, primary: true },
    { key: "starters", header: "Renners", cell: (t) => t.starters, align: "right" },
    ...(view.projection?.basis && view.format !== "ttt"
      ? [{ key: "points", header: "Verwacht", cell: (t: ProjectedTeam) => t.points ?? "—", align: "right" as const }]
      : []),
    ...(view.projection?.basis
      ? [{ key: "places", header: "Plekken", cell: (t: ProjectedTeam) => <span className="tabular-nums">{t.riders.map((r) => r.place).join(", ")}</span> }]
      : []),
  ];
  return <ResponsiveTable columns={columns} rows={teams} rowKey={(t) => t.team} rowClassName={(t) => (t.own ? "bg-primary/5" : undefined)} />;
}

function FieldTable({ view }: { view: BriefingView }) {
  const velo = view.zwiftRacing;
  const columns: Array<ResponsiveColumn<BriefingRider>> = [
    { key: "place", header: "#", cell: (r) => r.expectedPlace ?? "—", secondary: true },
    { key: "name", header: "Renner", cell: (r) => <span className={cn(r.own && "font-semibold")}>{r.name}</span>, primary: true },
    { key: "team", header: "Ploeg", cell: (r) => r.teamLabel ?? "—" },
    { key: "zrs", header: "ZRS", cell: (r) => r.racingScore ?? "—", align: "right" },
    ...(velo
      ? [
          { key: "velo", header: "vELO", cell: (r: BriefingRider) => (r.velo ? Math.round(r.velo) : "—"), align: "right" as const },
          { key: "m1", header: "1 min", cell: (r: BriefingRider) => wkg(r.power?.m1), align: "right" as const },
          { key: "m5", header: "5 min", cell: (r: BriefingRider) => wkg(r.power?.m5), align: "right" as const },
        ]
      : []),
    { key: "history", header: view.historyLabels.join(" · ") || "Eerder", cell: (r) => <History labels={view.historyLabels} places={r.history} />, align: "right" },
  ];
  return (
    <ResponsiveTable
      columns={columns}
      rows={view.field}
      rowKey={(r) => String(r.zwiftId)}
      rowClassName={(r) => (r.own ? "bg-primary/5" : undefined)}
      minWidth={velo ? 720 : 560}
    />
  );
}

const FIELD_MISSING: Record<NonNullable<BriefingView["fieldMissing"]>, string> = {
  "no-zwift-event": "Aan deze race hangt nog geen Zwift-event.",
  "no-entrants": "Er staat nog niemand in de groep bij Zwift.",
  error: "Zwift gaf de groep nu niet. Probeer het later opnieuw.",
  started: "De race is begonnen; het veld staat op de live stand.",
};

/** "racebriefje-bdev-2026-10-20.png" */
function sheetFileName(view: BriefingView): string {
  const team = (view.event.teamName ?? "team").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const day = new Date(view.event.startAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  return `racebriefje-${team}-${day}.png`;
}

export default async function RaceBriefingPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const [access, supabase] = await Promise.all([getRequestAccess(), createClient()]);
  const outcome = await loadRaceBriefing(id, user, access, supabase);
  if (outcome.status === "not-found") notFound();
  const { view } = outcome;
  const loaded = view.route?.loaded ?? null;
  const meta = [
    FORMAT_LABELS[view.format],
    view.division?.label,
    view.subgroupLabel ? `groep ${view.subgroupLabel}` : null,
    view.field.length ? `${view.field.length} renners` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <BackLink href={`/events/${view.event.id}`} label="Race" />
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Racebriefing {view.event.teamName}</h1>
            <p className="text-sm text-muted-foreground">
              {dateLabel.format(new Date(view.event.startAt))} · {meta.join(" · ")}
            </p>
          </div>
          {view.event.zwiftEventId && (
            <Link href={`/live/zrl/${view.event.id}`} className="text-sm underline">
              Live stand
            </Link>
          )}
        </div>
      </div>

      <ShareableSheet fileName={sheetFileName(view)} title={`Racebriefje ${view.event.teamName ?? ""}`.trim()}>
        <RaceSheet view={view} />
      </ShareableSheet>

      {view.format === "ttt" && (
        <Link href={`/teams/ttt-planner?event=${view.event.id}&team=${view.event.teamId}`} className="text-sm underline">
          TTT Planner
        </Link>
      )}

      <PlanForm view={view} />

      {loaded && (
        <section className="space-y-3">
          <ZwiftRouteSection
            routeName={loaded.routeName}
            world={loaded.world}
            laps={null}
            totalKm={loaded.route.totalKm}
            segments={loaded.route.segments}
            accents={loaded.route.accents}
            shape={null}
          />
          <RouteKeyPointsTable view={view} />
          <Bikes view={view} />
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader title="Onze ploeg" />
        {view.own.length > 0 ? <OwnTable view={view} /> : <EmptyState>Nog geen renners van ons in de groep of de opstelling.</EmptyState>}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Het veld" />
        {view.fieldMissing ? (
          <EmptyState>{FIELD_MISSING[view.fieldMissing]}</EmptyState>
        ) : (
          <>
            <TeamsTable view={view} />
            <FieldTable view={view} />
          </>
        )}
      </section>
    </div>
  );
}
