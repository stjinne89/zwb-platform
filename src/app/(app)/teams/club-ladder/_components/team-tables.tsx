import Link from "next/link";
import { EmptyState } from "@/components/app-ui";
import { MemberLink } from "@/components/member-link";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import type { ClubLadderStanding } from "@/lib/club-ladder/summary";
import type { LadderRiderSort } from "@/lib/club-ladder/riders";
import { normalizeTeamName } from "@/lib/ladder";
import { riderTypeLabel } from "@/lib/teams/power-profile";
import { cn } from "@/lib/utils";
import { n, type TeamProfileRider } from "../_lib/load";
import { LadderTeamRemoveButton } from "./ladder-team-remove";

export function TeamRidersTable({
  riders,
  sort,
  teamId,
  teamName,
  scoreLabel,
  canRemove,
  opponent = null,
}: {
  riders: TeamProfileRider[];
  sort: LadderRiderSort;
  teamId: string;
  teamName: string;
  scoreLabel: string;
  /** Teams buiten de puzzel: daar haal je een lid hier uit het team. */
  canRemove: boolean;
  /** Gekozen tegenstander, zodat sorteren het advies laat staan. */
  opponent?: string | null;
}) {
  const sortHref = (key: LadderRiderSort) =>
    `/teams/club-ladder/${teamId}?sort=${key}${opponent ? `&tegen=${encodeURIComponent(opponent)}` : ""}#teamprofiel`;
  // Op telefoonbreedte is de kop het label in de kaart; sorteren gaat daar via de knoppen.
  const header = (key: LadderRiderSort, label: string) => (
    <>
      <span className="sm:hidden">{label}</span>
      <Link
        href={sortHref(key)}
        scroll={false}
        aria-current={sort === key ? "true" : undefined}
        className={cn(
          "max-sm:hidden hover:text-foreground",
          sort === key && "text-foreground underline underline-offset-4",
        )}
      >
        {label}
      </Link>
    </>
  );
  const wkg = (value: number | null) => n(value, 2);
  const mobileSorts: Array<[LadderRiderSort, string]> = [
    ["wkg", "W/kg"],
    ["score", scoreLabel],
    ["ftp", "FTP"],
    ["w1m", "1m"],
    ["w5m", "5m"],
    ["w20m", "20m"],
    ["cat", "Cat"],
    ["name", "Naam"],
  ];

  return (
    <>
      <nav aria-label="Sorteren" className="mt-4 flex flex-wrap gap-1.5 sm:hidden">
        {mobileSorts.map(([key, label]) => (
          <Link
            key={key}
            href={sortHref(key)}
            scroll={false}
            aria-current={sort === key ? "true" : undefined}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs",
              sort === key ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <ResponsiveTable
        className="mt-3 sm:mt-4"
        rows={riders}
        rowKey={(rider) => rider.id}
        minWidth={760}
        columns={[
          {
            key: "rider",
            header: header("name", "Renner"),
            primary: true,
            cell: (rider) =>
              rider.rosterEntryId ? (
                <span>
                  {rider.name}{" "}
                  <span className="text-xs font-normal text-muted-foreground">geen account</span>
                </span>
              ) : (
                <MemberLink id={rider.id}>{rider.name}</MemberLink>
              ),
            cellClassName: "font-medium",
          },
          {
            key: "cat",
            header: header("cat", "Cat"),
            cell: (rider) => rider.category ?? "-",
          },
          {
            key: "score",
            header: header("score", scoreLabel),
            align: "right",
            cell: (rider) => n(rider.score),
            cellClassName: "tabular-nums",
          },
          {
            key: "type",
            header: "Type",
            cell: (rider) => (rider.riderType ? riderTypeLabel(rider.riderType) : "-"),
          },
          {
            key: "ftp",
            header: header("ftp", "FTP"),
            align: "right",
            cell: (rider) => (rider.ftpWatts == null ? "-" : `${n(rider.ftpWatts)}w`),
            cellClassName: "tabular-nums",
          },
          {
            key: "wkg",
            header: header("wkg", "W/kg"),
            align: "right",
            cell: (rider) => wkg(rider.ftpWkg),
            cellClassName: "tabular-nums font-medium",
          },
          {
            key: "w1m",
            header: header("w1m", "1m W/kg"),
            align: "right",
            cell: (rider) => wkg(rider.wkg1m),
            cellClassName: "tabular-nums",
          },
          {
            key: "w5m",
            header: header("w5m", "5m W/kg"),
            align: "right",
            cell: (rider) => wkg(rider.wkg5m),
            cellClassName: "tabular-nums",
          },
          {
            key: "w20m",
            header: header("w20m", "20m W/kg"),
            align: "right",
            cell: (rider) => wkg(rider.wkg20m),
            cellClassName: "tabular-nums",
          },
          ...(canRemove
            ? [
                {
                  key: "remove",
                  header: <span className="sr-only">Uit het team</span>,
                  align: "right" as const,
                  cell: (rider: TeamProfileRider) => (
                    <LadderTeamRemoveButton
                      teamId={teamId}
                      teamName={teamName}
                      rider={{ kind: rider.rosterEntryId ? "roster" : "profile", id: rider.id }}
                      riderName={rider.name}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </>
  );
}

export function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between gap-3 text-muted-foreground">
        <p className="text-xs uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function StandingsTable({
  rows,
  selectedAliases,
  challengeable = [],
  planned = [],
  opponentHref,
  activeOpponent,
  scrollable = false,
}: {
  rows: ClubLadderStanding[];
  selectedAliases: string[];
  /** Namen van de ploegen die uit te dagen zijn. */
  challengeable?: string[];
  /** Namen van de ploegen met een geplande wedstrijd tegen dit team. */
  planned?: string[];
  opponentHref?: (row: ClubLadderStanding) => string;
  activeOpponent?: string | null;
  /** De hele ranking in een eigen scrollvak, voor een team zonder plek in de stand. */
  scrollable?: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState className="mt-4">Geen publieke rankingrows gevonden.</EmptyState>;
  }

  const normalizedAliases = selectedAliases.map(normalizeTeamName);
  const challengeSet = new Set(challengeable.map(normalizeTeamName));
  const plannedSet = new Set(planned.map(normalizeTeamName));
  const active = activeOpponent ? normalizeTeamName(activeOpponent) : null;
  const isSelected = (row: (typeof rows)[number]) =>
    normalizedAliases.includes(normalizeTeamName(row.name));
  const canChallenge = (row: (typeof rows)[number]) => challengeSet.has(normalizeTeamName(row.name));
  return (
    <div className={cn(scrollable && "mt-4 max-h-[28rem] overflow-y-auto overscroll-contain rounded-md border p-2")}>
      <ResponsiveTable
        className={scrollable ? undefined : "mt-4"}
        rows={rows}
        rowKey={(row) => `${row.region}-${row.position}-${row.name}`}
        minWidth={680}
        rowClassName={(row) =>
          isSelected(row)
            ? "bg-primary/10"
            : active === normalizeTeamName(row.name)
              ? "bg-muted"
              : undefined
        }
        columns={[
          {
            key: "team",
            header: "Team",
            primary: true,
            cell: (row) => row.name,
            cellClassName: "font-medium",
          },
          {
            key: "region",
            header: "Regio",
            secondary: true,
            cell: (row) => row.region,
          },
          {
            key: "position",
            header: "Pos",
            cell: (row) => row.position,
            cellClassName: "tabular-nums",
          },
          {
            key: "form",
            header: "Vorm",
            cell: (row) => (
              <span className="flex gap-1">
                {row.form.length > 0
                  ? row.form.map((result, index) => (
                      <span
                        key={`${result}-${index}`}
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-md border text-xs font-semibold",
                          result === "W"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-muted bg-muted text-muted-foreground",
                        )}
                      >
                        {result}
                      </span>
                    ))
                  : "-"}
              </span>
            ),
          },
          {
            key: "move",
            header: "Move",
            align: "right",
            cell: (row) => row.move ?? "-",
          },
          ...(opponentHref
            ? [
                {
                  key: "challenge",
                  header: "Uitdagen",
                  align: "right" as const,
                  cell: (row: ClubLadderStanding) =>
                    canChallenge(row) || plannedSet.has(normalizeTeamName(row.name)) ? (
                      <Link
                        href={opponentHref(row)}
                        scroll={false}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {plannedSet.has(normalizeTeamName(row.name)) ? "Gepland · advies" : "Advies"}
                      </Link>
                    ) : (
                      ""
                    ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
