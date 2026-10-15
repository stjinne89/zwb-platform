import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackLink, EmptyState, HelpLink, SectionHeader } from "@/components/app-ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive-table";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { loadRaceAnalysis, type RideOutcome } from "@/lib/zrl-analysis/load";
import type { RaceAnalysis, RiderAnalysis } from "@/lib/zrl-analysis/race";
import type { RideAnalysis } from "@/lib/zrl-analysis/ride";
import { decimal, durationLabel, raceClock, raceTime, signedSeconds, wkg } from "@/lib/zrl-analysis/format";
import { cn } from "@/lib/utils";
import { GapChart } from "../_components/gap-chart";
import { RideChart } from "../_components/ride-chart";

type PageProps = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";
// Een race van vóór 2026-10-15 krijgt bij het eerste bezoek zijn vermogen nog
// bij Zwift (uitslag en segmenten, één voor één); de eigen rit komt van intervals.icu.
export const maxDuration = 30;

export const metadata: Metadata = { title: "ZWBeter racen" };

const dateLabel = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <div className={cn("text-xl font-semibold tabular-nums tracking-tight sm:text-2xl", accent && "text-primary")}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Chip({ ms }: { ms: number }) {
  const tone = ms > 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : ms < 0 ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-muted text-muted-foreground";
  return <span className={cn("inline-block rounded-full px-2 py-0.5 font-mono text-xs tabular-nums", tone)}>{signedSeconds(ms)}</span>;
}

function TeamSummary({ analysis }: { analysis: RaceAnalysis }) {
  const { team, rival } = analysis;
  if (!team) return <EmptyState>Het team staat niet in de uitslag van deze groep.</EmptyState>;
  const rivalScore = analysis.teams.find((t) => t.team === rival?.team);
  const ttt = analysis.format === "ttt";
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat value={`${team.rank}e`} label={`van ${analysis.teams.length} in groep ${analysis.subgroupLabel}`} accent={team.rank === 1} />
      {ttt ? (
        <Stat value={raceTime(team.time)} label="ploegtijd, 4e renner" />
      ) : (
        <Stat value={String(team.total)} label="punten" />
      )}
      {ttt && rivalScore && team.time !== null && rivalScore.time !== null ? (
        <Stat value={signedSeconds(rivalScore.time - team.time)} label={`t.o.v. ${rival?.label}`} />
      ) : (
        <Stat value={String(team.riders)} label="gestart" />
      )}
      {analysis.spread !== null ? (
        <Stat value={signedSeconds(analysis.spread).replace("+", "")} label="tussen de 4 snelsten" />
      ) : (
        <Stat value={String(team.finishers)} label="gefinisht" />
      )}
    </div>
  );
}

function TeamsTable({ analysis }: { analysis: RaceAnalysis }) {
  const ttt = analysis.format === "ttt";
  const leader = analysis.teams[0];
  const columns: Array<ResponsiveColumn<RaceAnalysis["teams"][number]>> = [
    { key: "rank", header: "Pl.", cell: (t) => t.rank, secondary: true },
    { key: "team", header: "Team", cell: (t) => <span className={cn(t.own && "font-semibold")}>{t.label}</span>, primary: true },
    { key: "riders", header: "Renners", cell: (t) => `${t.finishers}/${t.riders}`, align: "right" },
    ttt
      ? { key: "time", header: "Tijd", cell: (t) => raceTime(t.time), align: "right" }
      : { key: "points", header: "Punten", cell: (t) => t.total, align: "right" },
    ...(ttt
      ? [{ key: "gap", header: "Achter", cell: (t: RaceAnalysis["teams"][number]) => (t.time !== null && leader?.time != null && t !== leader ? signedSeconds(t.time - leader.time) : "—"), align: "right" as const }]
      : []),
  ];
  return <ResponsiveTable columns={columns} rows={analysis.teams} rowKey={(t) => t.team} rowClassName={(t) => (t.own ? "bg-primary/5" : undefined)} />;
}

function RidersTable({ analysis, ownAthleteId }: { analysis: RaceAnalysis; ownAthleteId: number | null }) {
  const ttt = analysis.format === "ttt";
  const columns: Array<ResponsiveColumn<RiderAnalysis>> = [
    {
      key: "name",
      header: "Renner",
      primary: true,
      cell: (r) => (
        <span className="font-medium">
          {r.name}
          {r.dropped && <span className="ml-2 text-xs font-normal text-muted-foreground">los</span>}
          {r.powerType && r.powerType !== "POWER_METER" && <span className="ml-2 text-xs font-normal text-muted-foreground">geschat vermogen</span>}
        </span>
      ),
    },
    { key: "time", header: ttt ? "Tijd" : "Plek", cell: (r) => (ttt ? raceTime(r.time) : r.rank ?? "—"), align: "right" },
    { key: "watts", header: "Gem.", cell: (r) => (r.avgWatts ? `${r.avgWatts} W` : "—"), align: "right" },
    { key: "wkg", header: "W/kg", cell: (r) => wkg(r.wkg), align: "right" },
    { key: "cp20", header: "Beste 20 min", cell: (r) => (r.criticalPower?.m20 ? `${r.criticalPower.m20} W · ${wkg(r.cp20Wkg)}` : "—"), align: "right" },
    { key: "cp5", header: "Beste 5 min", cell: (r) => (r.criticalPower?.m5 ? `${r.criticalPower.m5} W` : "—"), align: "right" },
    { key: "cp1", header: "Beste 1 min", cell: (r) => (r.criticalPower?.m1 ? `${r.criticalPower.m1} W` : "—"), align: "right" },
    ...(ttt ? [] : [{ key: "points", header: "Punten", cell: (r: RiderAnalysis) => r.points, align: "right" as const }]),
  ];
  return (
    <ResponsiveTable
      columns={columns}
      rows={analysis.riders}
      rowKey={(r) => String(r.athleteId)}
      rowClassName={(r) => (r.athleteId === ownAthleteId ? "bg-primary/5" : undefined)}
      minWidth={720}
    />
  );
}

/** Per segment: de renners van de ploeg met vermogen en plek in de groep. */
function SegmentsTable({ analysis }: { analysis: RaceAnalysis }) {
  const segments = analysis.route.filter((s) => s.kind !== "segment" || analysis.route.length <= 8);
  if (segments.length === 0 || analysis.riders.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[560px] text-sm tabular-nums">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Renner</th>
            {segments.map((s) => (
              <th key={s.index} className="px-3 py-2 text-right font-medium">
                {s.name}
                {s.lap > 1 ? ` (${s.lap})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {analysis.riders.map((r) => (
            <tr key={r.athleteId} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">{r.name}</td>
              {segments.map((s) => {
                const seg = r.segments.find((x) => x.index === s.index);
                return (
                  <td key={s.index} className="px-3 py-2 text-right">
                    {seg ? (
                      <>
                        <span>{seg.wkg !== null ? wkg(seg.wkg) : raceClock(seg.elapsed)}</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          {seg.rank}/{seg.of}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const RIDE_STATUS: Record<Exclude<RideOutcome["status"], "ok">, string | null> = {
  "not-riding": null,
  "no-intervals": "Koppel intervals.icu voor de analyse van je eigen rit.",
  "no-ride": "Je rit van deze race staat niet in intervals.icu.",
  "strava-only": "Je rit kwam via Strava in intervals.icu; daar zit geen bestand per seconde bij.",
  error: "intervals.icu gaf je rit nu niet. Probeer het later opnieuw.",
};

function OwnRide({ ride }: { ride: RideOutcome }) {
  if (ride.status !== "ok") {
    const message = RIDE_STATUS[ride.status];
    if (!message) return null;
    return (
      <section>
        <SectionHeader title="Jouw rit" place="zwbeter" />
        <EmptyState action={ride.status === "no-intervals" ? <Link href="/zwbeter-worden/vermogen" className="text-sm underline">Vermogen</Link> : undefined}>
          {message}
        </EmptyState>
      </section>
    );
  }
  const a: RideAnalysis = ride.analysis;
  const climbs = a.phases.filter((p) => p.climb).map((p) => ({ name: p.name, from: p.from, to: p.to }));
  return (
    <section className="space-y-4">
      <SectionHeader title="Jouw rit" action={<HelpLink href="/hulp#racen-eigen-rit" />} place="zwbeter" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={`${a.np} W`} label={a.intensity !== null ? `genormaliseerd · IF ${decimal(a.intensity)}` : "genormaliseerd"} />
        <Stat value={`${a.avgWatts} W`} label={`gemiddeld · ${a.kilojoules} kJ`} />
        <Stat value={a.avgHeartRate ? `${a.avgHeartRate} / ${a.maxHeartRate}` : "—"} label="hartslag gem. / max" />
        <Stat value={a.wbalMin ? `${a.wbalMin.share}%` : "—"} label={a.wbalMin ? `laagste W′ · ${raceClock(a.wbalMin.at)}` : "W′-balans"} />
      </div>
      <div className="rounded-lg border bg-card p-3">
        <RideChart series={a.series} climbs={climbs} ftp={ride.ftp} />
      </div>

      <ResponsiveTable
        columns={[
          { key: "name", header: "Stuk", cell: (p) => p.name, primary: true },
          { key: "time", header: "Tijd", cell: (p) => raceClock(p.to - p.from), align: "right" },
          { key: "avg", header: "Gem.", cell: (p) => `${p.avgWatts} W`, align: "right" },
          { key: "np", header: "NP", cell: (p) => `${p.np} W`, align: "right" },
          { key: "if", header: "IF", cell: (p) => decimal(p.intensity), align: "right" },
          { key: "hr", header: "Hartslag", cell: (p) => p.avgHeartRate ?? "—", align: "right" },
          { key: "cad", header: "Cadans", cell: (p) => p.cadence ?? "—", align: "right" },
          { key: "wbal", header: "Laagste W′", cell: (p) => (p.wbalMin === null ? "—" : `${p.wbalMin}%`), align: "right" },
        ]}
        rows={a.phases}
        rowKey={(p) => `${p.name}-${p.from}`}
        rowClassName={(p) => (p.climb ? "bg-muted/40" : undefined)}
        minWidth={640}
      />

      {a.best.some((b) => b.share !== null) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Beste vermogen tegenover de laatste 90 dagen</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {a.best.map((b) => (
              <li key={b.seconds} className="rounded-lg border bg-card p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{durationLabel(b.seconds)}</span>
                  <span className="font-semibold tabular-nums">{b.share !== null ? `${b.share}%` : "—"}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, b.share ?? 0)}%` }} />
                </div>
                <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {b.watts} W{b.season ? ` van ${b.season} W` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        {a.drift && (
          <div className="rounded-lg border bg-card p-3">
            <dt className="text-muted-foreground">Watt per hartslag</dt>
            <dd className="font-medium tabular-nums">
              {decimal(a.drift.first)} → {decimal(a.drift.last)} ({a.drift.change > 0 ? "+" : ""}
              {a.drift.change}%)
            </dd>
          </div>
        )}
        {a.cadenceAboveFtp.length > 0 && (
          <div className="rounded-lg border bg-card p-3">
            <dt className="text-muted-foreground">Cadans boven je FTP</dt>
            <dd className="font-medium tabular-nums">
              {a.cadenceAboveFtp.map((c) => `${c.from}-${c.from + 9}: ${raceClock(c.seconds)}`).join(" · ")}
            </dd>
          </div>
        )}
        {a.missingStart > 0 && (
          <div className="rounded-lg border bg-card p-3">
            <dt className="text-muted-foreground">Bestand begint</dt>
            <dd className="font-medium tabular-nums">{a.missingStart} s na de start</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export default async function RaceAnalysisPage({ params }: PageProps) {
  const { eventId } = await params;
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const [access, supabase] = await Promise.all([getRequestAccess(), createClient()]);
  const outcome = await loadRaceAnalysis(eventId, user, access, supabase);
  if (outcome.status === "not-found" || outcome.status === "no-access") notFound();

  if (outcome.status === "no-data") {
    return (
      <div className="space-y-4">
        <BackLink href="/zwbeter-worden/racen" label="Races" />
        <EmptyState>Voor deze race is er nog geen uitslag van Zwift.</EmptyState>
      </div>
    );
  }

  const { event, analysis, ride, ownAthleteId } = outcome;
  const ttt = analysis.format === "ttt";
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <BackLink href="/zwbeter-worden/racen" label="Races" />
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{event.title}</h2>
            <p className="text-sm text-muted-foreground">
              {dateLabel.format(new Date(event.startAt))} · {ttt ? "Ploegentijdrit" : analysis.format === "scratch" ? "Scratch" : "Puntenrace"}
              {!analysis.final && " · voorlopig"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/live/zrl/${event.id}`} className="underline">
              Live-stand
            </Link>
            <HelpLink href="/hulp#racen" />
          </div>
        </div>
      </div>

      <TeamSummary analysis={analysis} />

      {analysis.findings.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {analysis.findings.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      {ttt && analysis.gapTrace.length > 0 && analysis.rival && (
        <section className="space-y-3">
          <SectionHeader title={`Verloop tegenover ${analysis.rival.label}`} place="zwbeter" />
          <div className="rounded-lg border bg-card p-3">
            <GapChart points={analysis.gapTrace.map((g) => ({ name: g.name, ahead: g.ahead, climb: g.kind === "klim" }))} rival={analysis.rival.label} />
          </div>
          <ResponsiveTable
            columns={[
              { key: "name", header: "Stuk", cell: (s) => s.name, primary: true },
              { key: "rival", header: `t.o.v. ${analysis.rival.label}`, cell: (s) => <Chip ms={s.versusRival} />, align: "right" },
              { key: "fastest", header: "Snelste ploeg", cell: (s) => s.fastest },
            ]}
            rows={analysis.sections}
            rowKey={(s) => s.name}
          />
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader title="Renners" place="zwbeter" />
        <RidersTable analysis={analysis} ownAthleteId={ownAthleteId} />
      </section>

      {analysis.hasPower && (
        <section className="space-y-3">
          <SectionHeader title="Segmenten" place="zwbeter" />
          <SegmentsTable analysis={analysis} />
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader title="Teams in de groep" place="zwbeter" />
        <TeamsTable analysis={analysis} />
      </section>

      <OwnRide ride={ride} />
    </div>
  );
}
