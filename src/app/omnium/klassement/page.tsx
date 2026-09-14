import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app-ui";
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from "@/components/ui/responsive-table";
import {
  loadCurrentSeason,
  loadSeasonEditions,
  loadSeasonStandings,
  type PublicSeasonStanding,
} from "@/lib/omnium/public-data";

export const revalidate = 300;

export const metadata: Metadata = { title: "Season standings" };

type View = "race" | "event";

export default async function OmniumStandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; weergave?: string }>;
}) {
  const { league: leagueParam, weergave } = await searchParams;
  const view: View = weergave === "event" ? "event" : "race";

  const season = await loadCurrentSeason();
  if (!season) {
    return <EmptyState>No season has been published yet.</EmptyState>;
  }

  const [editions, standings] = await Promise.all([
    loadSeasonEditions(season.id),
    loadSeasonStandings(season.id),
  ]);

  const leagues = [...new Set(standings.map((row) => row.league))].sort();
  const league = leagueParam && leagues.includes(leagueParam) ? leagueParam : null;
  const rows = league
    ? standings.filter((row) => row.league === league)
    : standings;

  const raced = editions.filter((edition) =>
    standings.some((row) => row.pointsByEdition[String(edition.number)] !== undefined),
  );

  const columns: Array<ResponsiveColumn<PublicSeasonStanding>> = [
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
      cell: (row) => (
        <span>
          {row.riderName}
          {row.teamName && (
            <span className="text-muted-foreground"> · {row.teamName}</span>
          )}
        </span>
      ),
      primary: true,
    },
    ...(league
      ? []
      : [
          {
            key: "league",
            header: "League",
            cell: (row: PublicSeasonStanding) => row.league,
            cellClassName: "text-xs",
          },
        ]),
    ...(view === "race"
      ? raced.map((edition) => ({
          key: `edition-${edition.number}`,
          header: `R${edition.number}`,
          align: "right" as const,
          cell: (row: PublicSeasonStanding) =>
            row.pointsByEdition[String(edition.number)] ?? "—",
          cellClassName: "tabular-nums",
        }))
      : [
          ["Prologue", "prologuePoints"] as const,
          ["Scratch", "scratchPoints"] as const,
          ["Sprint", "sprintPoints"] as const,
          ["Crit", "critPoints"] as const,
        ].map(([header, key]) => ({
          key,
          header,
          align: "right" as const,
          cell: (row: PublicSeasonStanding) => row[key],
          cellClassName: "tabular-nums",
        }))),
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (row) => row.totalPoints,
      cellClassName: "tabular-nums font-medium",
    },
  ];

  const linkFor = (next: { league?: string | null; view?: View }) => {
    const params = new URLSearchParams();
    const nextLeague = next.league === undefined ? league : next.league;
    const nextView = next.view ?? view;
    if (nextLeague) params.set("league", nextLeague);
    if (nextView !== "race") params.set("weergave", nextView);
    const query = params.toString();
    return query ? `/omnium/klassement?${query}` : "/omnium/klassement";
  };

  const chip = (active: boolean) =>
    active
      ? "rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium"
      : "rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {season.name}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Season standings
        </h1>
      </header>

      {standings.length === 0 ? (
        <EmptyState>
          No results yet. The standings appear after the first edition.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Link href={linkFor({ league: null })} className={chip(!league)}>
              All leagues
            </Link>
            {leagues.map((value) => (
              <Link
                key={value}
                href={linkFor({ league: value })}
                className={chip(league === value)}
              >
                {value}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={linkFor({ view: "race" })} className={chip(view === "race")}>
              Points per round
            </Link>
            <Link
              href={linkFor({ view: "event" })}
              className={chip(view === "event")}
            >
              Points per event
            </Link>
          </div>

          <ResponsiveTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.riderId}
            empty="No riders in this league yet."
          />
        </>
      )}
    </div>
  );
}
