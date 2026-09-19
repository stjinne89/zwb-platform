import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from "@/components/ui/responsive-table";
import {
  loadEditionBySlug,
  loadEditionParts,
  loadEditionResults,
  loadEditionPrizeAwards,
  loadEditionStandings,
  type PublicResult,
  type PublicStanding,
} from "@/lib/omnium/public-data";
import type { Discipline } from "@/lib/omnium/scoring";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ editie: string }>;
  searchParams: Promise<{ league?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { editie } = await params;
  const found = await loadEditionBySlug(editie);
  return { title: found ? `Results — ${found.edition.title}` : "Results" };
}

const STATUS_LABEL: Record<string, string> = {
  dnf: "DNF",
  dns: "DNS",
  dsq: "DSQ",
};

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}s`;
  return `${minutes}:${String(Math.floor(rest)).padStart(2, "0")}`;
}

export default async function OmniumResultsPage({
  params,
  searchParams,
}: PageProps) {
  const { editie } = await params;
  const { league: leagueParam } = await searchParams;
  const found = await loadEditionBySlug(editie);
  if (!found) notFound();

  const { edition } = found;
  const [parts, standings, results, awards] = await Promise.all([
    loadEditionParts(edition.id),
    loadEditionStandings(edition.id),
    loadEditionResults(edition.id),
    loadEditionPrizeAwards(edition.id),
  ]);

  const leagues = [...new Set(standings.map((row) => row.league))].sort();
  const league = leagueParam && leagues.includes(leagueParam) ? leagueParam : null;
  const shownStandings = league
    ? standings.filter((row) => row.league === league)
    : standings;
  const provisional = standings.some((row) => row.isProvisional);

  const standingColumns: Array<ResponsiveColumn<PublicStanding>> = [
    {
      key: "rank",
      header: "#",
      cell: (row) => `${row.rank}${row.rankShared ? "=" : ""}`,
      cellClassName: "tabular-nums text-muted-foreground",
      secondary: true,
    },
    {
      key: "rider",
      header: "Rider",
      cell: (row) => row.riderName,
      primary: true,
    },
    ...(league
      ? []
      : [
          {
            key: "league",
            header: "League",
            cell: (row: PublicStanding) => row.league,
            cellClassName: "text-xs",
          },
        ]),
    {
      key: "prologue",
      header: "Prologue",
      align: "right",
      cell: (row) => row.prologuePoints,
      cellClassName: "tabular-nums",
    },
    {
      key: "scratch",
      header: "Scratch",
      align: "right",
      cell: (row) => row.scratchPoints,
      cellClassName: "tabular-nums",
    },
    {
      key: "sprint",
      header: "Sprint",
      align: "right",
      cell: (row) => row.sprintPoints,
      cellClassName: "tabular-nums",
    },
    {
      key: "crit",
      header: "Crit",
      align: "right",
      cell: (row) => row.critPoints,
      cellClassName: "tabular-nums",
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (row) => row.totalPoints,
      cellClassName: "tabular-nums font-medium",
    },
  ];

  const resultColumns = (
    discipline: Discipline,
  ): Array<ResponsiveColumn<PublicResult>> => [
    {
      key: "position",
      header: "#",
      cell: (row) =>
        row.status === "finished"
          ? (row.position ?? "—")
          : (STATUS_LABEL[row.status] ?? row.status),
      cellClassName: "tabular-nums text-muted-foreground",
      secondary: true,
    },
    {
      key: "rider",
      header: "Rider",
      cell: (row) => row.riderName,
      primary: true,
    },
    ...(league
      ? []
      : [
          {
            key: "league",
            header: "League",
            cell: (row: PublicResult) => row.league,
            cellClassName: "text-xs",
          },
        ]),
    {
      key: "time",
      header: discipline === "sprint" ? "Segment" : "Time",
      align: "right",
      cell: (row) =>
        discipline === "sprint"
          ? formatSeconds(row.segmentSeconds)
          : (row.timeText ?? "—"),
      cellClassName: "tabular-nums",
    },
    {
      key: "points",
      header: "Points",
      align: "right",
      cell: (row) =>
        row.voidedReason ? (
          <span title="No points: this rider did not start any other event">
            0
            <span className="text-muted-foreground"> ({row.pointsRaw})</span>
          </span>
        ) : (
          row.points
        ),
      cellClassName: "tabular-nums font-medium",
    },
  ];

  const chip = (active: boolean) =>
    active
      ? "rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium"
      : "rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted";

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Round {edition.number}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Results — {edition.title}
        </h1>
        {provisional && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Provisional: not every event has been scored yet.
          </p>
        )}
      </header>

      {standings.length === 0 ? (
        <EmptyState>Results will appear here after the race.</EmptyState>
      ) : (
        <>
          {leagues.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/omnium/${edition.slug}/results`} className={chip(!league)}>
                All leagues
              </Link>
              {leagues.map((value) => (
                <Link
                  key={value}
                  href={`/omnium/${edition.slug}/results?league=${encodeURIComponent(value)}`}
                  className={chip(league === value)}
                >
                  {value}
                </Link>
              ))}
            </div>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Edition classification
            </h2>
            <ResponsiveTable
              columns={standingColumns}
              rows={shownStandings}
              rowKey={(row) => row.riderId}
            />
          </section>

          {parts.map((part) => {
            const rows = results
              .filter((row) => row.discipline === part.discipline)
              .filter((row) => !league || row.league === league);
            if (rows.length === 0) return null;
            return (
              <section key={part.id} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {part.orderIndex}. {part.title}
                </h2>
                <ResponsiveTable
                  columns={resultColumns(part.discipline)}
                  rows={rows}
                  rowKey={(row) => `${part.id}-${row.riderId}`}
                />
              </section>
            );
          })}
        </>
      )}

      {awards.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Prize winners
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {awards
              .filter((award) => !league || award.league === league)
              .map((award) => (
                <article key={award.id} className="rounded-lg border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {award.league ?? "Overall"}
                  </p>
                  <h3 className="font-semibold">{award.riderName}</h3>
                  <p className="text-sm">{award.title}</p>
                </article>
              ))}
          </div>
        </section>
      )}

      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href={`/omnium/${edition.slug}`} className="underline">
          Edition details
        </Link>
        <Link href="/omnium/standings" className="underline">
          Season standings
        </Link>
      </nav>
    </div>
  );
}
