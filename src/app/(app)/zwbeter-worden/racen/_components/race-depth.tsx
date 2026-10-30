// Verdieping voor de renner zelf: verwachting tegenover uitkomst, waar de
// punten vandaan kwamen, de eigen sprints en klimmen naast eerder en het
// racebriefje, en de terugblik over alle races. Gedeeld door de ZRL-pagina en
// de pagina van een individuele race.

import { SectionHeader } from "@/components/app-ui";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import type { RaceDepth } from "@/lib/zrl-analysis/load";
import type { RiderAnalysis } from "@/lib/zrl-analysis/race";
import { pointsBySource, type PointsSource, type RaceRecord } from "@/lib/zrl-analysis/history";
import { raceClock, wkg } from "@/lib/zrl-analysis/format";
import { cn } from "@/lib/utils";
import { Stat } from "./race-parts";

const nl1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });

/** Verschil met teken en kleur: groen boven de verwachting, rood eronder. */
function Delta({ value, unit = "" }: { value: number; unit?: string }) {
  const rounded = Math.round(value * 10) / 10;
  const tone = rounded > 0 ? "text-emerald-700 dark:text-emerald-300" : rounded < 0 ? "text-red-700 dark:text-red-300" : "text-muted-foreground";
  return (
    <span className={cn("tabular-nums", tone)}>
      {rounded > 0 ? "+" : rounded < 0 ? "−" : "±"}
      {nl1.format(Math.abs(rounded))}
      {unit}
    </span>
  );
}

const SOURCE_LABEL: Record<PointsSource, string> = {
  sprint: "Sprints",
  klim: "Klimmen",
  segment: "Overige segmenten",
  finish: "Finish en podium",
};

/** Plek en punten tegenover de verwachting op ZRS van vóór de race. */
export function ExpectationStats({ rider }: { rider: RiderAnalysis }) {
  const expected = rider.expected;
  if (!expected) return null;
  const points = expected.points && rider.pointsSplit ? { scored: rider.pointsSplit.total, expected: Math.round(expected.points.total) } : null;
  const gain = rider.rank !== null ? expected.place - rider.rank : null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat value={`${expected.place}e`} label={`verwacht op ZRS${expected.scoreBefore ? ` ${Math.round(expected.scoreBefore)}` : ""}`} />
      <Stat
        value={rider.rank ? `${rider.rank}e` : "—"}
        label={gain === null ? "niet gefinisht" : gain === 0 ? "gefinisht, als verwacht" : `gefinisht, ${Math.abs(gain)} ${gain > 0 ? "voor" : "achter"} verwachting`}
        accent={gain !== null && gain > 0}
      />
      {points && (
        <>
          <Stat value={String(points.expected)} label="punten verwacht" />
          <Stat value={String(points.scored)} label={`punten gescoord (${points.scored - points.expected >= 0 ? "+" : "−"}${Math.abs(points.scored - points.expected)})`} accent={points.scored > points.expected} />
        </>
      )}
    </div>
  );
}

/** Puntenrace: per bron gescoord tegenover verwacht. */
export function PointsSources({ rider }: { rider: RiderAnalysis }) {
  const byKind = pointsBySource(rider);
  if (!byKind) return null;
  const rows = (Object.keys(SOURCE_LABEL) as PointsSource[])
    .filter((source) => source === "finish" || rider.segments.some((s) => s.kind === source))
    .map((source) => ({ source, ...byKind[source] }));
  return (
    <ResponsiveTable
      columns={[
        { key: "source", header: "Punten uit", cell: (r) => SOURCE_LABEL[r.source], primary: true },
        { key: "scored", header: "Gescoord", cell: (r) => r.scored, align: "right" },
        { key: "expected", header: "Verwacht", cell: (r) => nl1.format(r.expected), align: "right" },
        { key: "diff", header: "Verschil", cell: (r) => <Delta value={r.scored - r.expected} />, align: "right" },
      ]}
      rows={rows}
      rowKey={(r) => r.source}
    />
  );
}

/** De eigen sprints en klimmen: vandaag, de verwachting, eerder en het briefje. */
export function SegmentDepth({ depth }: { depth: RaceDepth }) {
  if (depth.segments.length === 0) return null;
  const withPoints = depth.segments.some((s) => s.points !== null);
  const withTarget = depth.segments.some((s) => s.target || s.pr);
  return (
    <ResponsiveTable
      columns={[
        {
          key: "name",
          header: "Segment",
          primary: true,
          cell: (s) => (
            <span className="font-medium">
              {s.name}
              {s.fastestYet && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">snelste</span>}
            </span>
          ),
        },
        {
          key: "today",
          header: "Vandaag",
          cell: (s) => `${raceClock(s.elapsed)}${s.wkg !== null ? ` · ${wkg(s.wkg)} W/kg` : ""}`,
          align: "right",
        },
        {
          key: "fal",
          header: "Over de streep",
          cell: (s) => (
            <>
              {s.falRank}/{s.of}
              {s.expectedFalRank !== null && <span className="ml-1 text-xs text-muted-foreground">verw. {s.expectedFalRank}</span>}
            </>
          ),
          align: "right",
        },
        ...(withPoints
          ? [
              {
                key: "points",
                header: "Punten",
                cell: (s: RaceDepth["segments"][number]) =>
                  s.points === null ? "—" : (
                    <>
                      {s.points}
                      {s.expectedPoints !== null && (
                        <span className="ml-1 text-xs">
                          <Delta value={s.points - s.expectedPoints} />
                        </span>
                      )}
                    </>
                  ),
                align: "right" as const,
              },
            ]
          : []),
        {
          key: "earlier",
          header: "Eerder",
          cell: (s) =>
            s.earlier ? (
              <>
                {raceClock(s.earlier.bestElapsed)}
                {s.earlier.bestWkg !== null && ` · ${wkg(s.earlier.bestWkg)}`}
                <span className="ml-1 text-xs text-muted-foreground">beste van {s.earlier.count}</span>
              </>
            ) : (
              "—"
            ),
          align: "right",
        },
        ...(withTarget
          ? [
              {
                key: "target",
                header: "Briefje",
                cell: (s: RaceDepth["segments"][number]) =>
                  s.target ? (
                    <>
                      {raceClock(s.target.seconds)}
                      {s.target.neededWatts !== null && ` · ${s.target.neededWatts} W`}
                      {s.pr && <span className="ml-1 text-xs text-muted-foreground">PR {raceClock(s.pr.seconds)}</span>}
                    </>
                  ) : s.pr ? (
                    <span className="text-muted-foreground">PR {raceClock(s.pr.seconds)}</span>
                  ) : (
                    "—"
                  ),
                align: "right" as const,
              },
            ]
          : []),
      ]}
      rows={depth.segments}
      rowKey={(s) => String(s.index)}
      rowClassName={(s) => (s.kind === "klim" ? "bg-muted/40" : undefined)}
      minWidth={720}
    />
  );
}

function pointsCell(race: RaceRecord) {
  if (!race.pointsSplit || !race.points) return "—";
  return (
    <>
      {race.pointsSplit.total}
      {race.expectedPoints && (
        <span className="ml-1 text-xs">
          <Delta value={race.pointsSplit.total - race.expectedPoints.total} />
        </span>
      )}
    </>
  );
}

/** Over alle bewaarde races: plek en punten tegenover de verwachting, en waar de punten vandaan komen. */
export function RaceTrendView({ depth }: { depth: RaceDepth }) {
  const { trend } = depth;
  if (trend.races.length < 2) return null;
  const sprint = trend.sources.find((s) => s.source === "sprint");
  const klim = trend.sources.find((s) => s.source === "klim");
  const finish = trend.sources.find((s) => s.source === "finish");
  return (
    <section className="space-y-3">
      <SectionHeader title="Jouw races" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {trend.placeGain !== null && (
          <Stat value={`${trend.placeGain > 0 ? "+" : trend.placeGain < 0 ? "−" : "±"}${nl1.format(Math.abs(trend.placeGain))}`} label={`plekken t.o.v. ZRS, ${trend.placed} races`} accent={trend.placeGain > 0} />
        )}
        {[sprint, klim, finish].map((s) =>
          s ? (
            <Stat
              key={s.source}
              value={`${s.perRace > 0 ? "+" : s.perRace < 0 ? "−" : "±"}${nl1.format(Math.abs(s.perRace))}`}
              label={`punten per race, ${SOURCE_LABEL[s.source].toLowerCase()} (${s.races})`}
              accent={s.perRace > 0}
            />
          ) : null,
        )}
      </div>
      <ResponsiveTable
        columns={[
          { key: "date", header: "Datum", cell: (r) => shortDate.format(new Date(r.startAt)), secondary: true },
          { key: "title", header: "Race", cell: (r) => r.title, primary: true },
          {
            key: "place",
            header: "Plek",
            cell: (r) => (
              <>
                {r.place ?? "—"}/{r.finishers}
                {r.expectedPlace !== null && <span className="ml-1 text-xs text-muted-foreground">verw. {r.expectedPlace}</span>}
              </>
            ),
            align: "right",
          },
          { key: "points", header: "Punten", cell: pointsCell, align: "right" },
          {
            key: "sprint",
            header: "Sprints",
            cell: (r) => (r.byKind && r.segments.some((s) => s.kind === "sprint") ? <Delta value={r.byKind.sprint.scored - r.byKind.sprint.expected} /> : "—"),
            align: "right",
          },
          {
            key: "klim",
            header: "Klimmen",
            cell: (r) => (r.byKind && r.segments.some((s) => s.kind === "klim") ? <Delta value={r.byKind.klim.scored - r.byKind.klim.expected} /> : "—"),
            align: "right",
          },
          { key: "s15", header: "Beste 15 s", cell: (r) => (r.best15Wkg !== null ? `${wkg(r.best15Wkg)} W/kg` : "—"), align: "right" },
        ]}
        rows={trend.races}
        rowKey={(r) => r.zwiftEventId}
        minWidth={720}
      />
    </section>
  );
}
