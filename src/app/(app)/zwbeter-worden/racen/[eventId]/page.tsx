import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackLink, EmptyState, SectionHeader } from "@/components/app-ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive-table";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { loadCalendarPersonalRace, loadRaceAnalysis, raceEventType } from "@/lib/zrl-analysis/load";
import type { RaceAnalysis, RiderAnalysis } from "@/lib/zrl-analysis/race";
import { raceClock, raceTime, signedSeconds, wkg } from "@/lib/zrl-analysis/format";
import { cn } from "@/lib/utils";
import { GapChart } from "../_components/gap-chart";
import { Chip, OwnRide, Stat, TipList, dateLabel } from "../_components/race-parts";
import { PersonalRaceView } from "../_components/personal-race";

type PageProps = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";
// Een race van vóór 2026-10-15 krijgt bij het eerste bezoek zijn vermogen nog
// bij Zwift (uitslag en segmenten, één voor één); de eigen rit komt van intervals.icu.
export const maxDuration = 30;

export const metadata: Metadata = { title: "ZWBeter racen" };

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

export default async function RaceAnalysisPage({ params }: PageProps) {
  const { eventId } = await params;
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const [access, supabase, type] = await Promise.all([getRequestAccess(), createClient(), raceEventType(eventId)]);
  if (!type) notFound();
  // FRR en andere Zwift-races: de eigen race, zonder ploeg.
  if (type !== "zrl") {
    const personal = await loadCalendarPersonalRace(eventId, user, supabase);
    if (personal.status === "not-found") notFound();
    return <PersonalRaceView outcome={personal} />;
  }
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

  const { event, analysis, ride, ownAthleteId, viewer, ownTips, teamTips, riderTips } = outcome;
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
          </div>
        </div>
      </div>

      {ownAthleteId !== null && (
        <section className="space-y-3">
          <SectionHeader title="Tips voor jou" />
          {ownTips.length > 0 ? <TipList tips={ownTips} /> : <EmptyState>Geen opvallende punten in je race.</EmptyState>}
        </section>
      )}

      {viewer !== "rider" && (teamTips.length > 0 || riderTips.length > 0) && (
        <section className="space-y-3">
          <SectionHeader title="Tips voor de ploeg" />
          {teamTips.length > 0 && <TipList tips={teamTips} />}
          {riderTips.map((r) => (
            <div key={r.athleteId} className="space-y-2">
              <h3 className="text-sm font-semibold">{r.name}</h3>
              <TipList tips={r.tips} />
            </div>
          ))}
        </section>
      )}

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
          <SectionHeader title={`Verloop tegenover ${analysis.rival.label}`} />
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
        <SectionHeader title="Renners" />
        <RidersTable analysis={analysis} ownAthleteId={ownAthleteId} />
      </section>

      {analysis.hasPower && (
        <section className="space-y-3">
          <SectionHeader title="Segmenten" />
          <SegmentsTable analysis={analysis} />
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader title="Teams in de groep" />
        <TeamsTable analysis={analysis} />
      </section>

      <OwnRide ride={ride} />
    </div>
  );
}
