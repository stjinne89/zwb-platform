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
  adviceQuery = "",
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
  /** De eigen selectie van het advies (`&met=…`), zodat sorteren die ook laat staan. */
  adviceQuery?: string;
}) {
  const sortHref = (key: LadderRiderSort) =>
    `/teams/club-ladder/${teamId}?sort=${key}${opponent ? `&tegen=${encodeURIComponent(opponent)}${adviceQuery}` : ""}#teamprofiel`;
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
  plannedHref,
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
  /** Het event van een geplande wedstrijd; daar staan advies, selectie en matchup. */
  plannedHref?: (row: ClubLadderStanding) => string | null;
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
    // Eén compacte tabel, ook op telefoonbreedte: kaarten per ploeg maakten de stand drie schermen lang.
    <div
      className={cn(
        "mt-4 overflow-x-auto",
        scrollable && "max-h-[28rem] overflow-y-auto overscroll-contain rounded-md border p-2",
      )}
    >
      <table className="w-full text-sm tabular-nums">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-1.5 pr-2 text-left font-medium sm:pr-3">Pos</th>
            <th className="py-1.5 pr-2 text-left font-medium sm:pr-3">Team</th>
            <th className="hidden py-1.5 pr-3 text-left font-medium sm:table-cell">Regio</th>
            <th className="py-1.5 pr-2 text-left font-medium sm:pr-3">Vorm</th>
            <th className="py-1.5 pr-2 text-right font-medium sm:pr-3">Move</th>
            {opponentHref && (
              <th className="py-1.5 text-right font-medium">
                <span className="sr-only sm:not-sr-only">Uitdagen</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            // De eigen ploeg staat ook in elke geplande wedstrijd, maar advies tegen jezelf is er niet.
            const plannedRow = !isSelected(row) && plannedSet.has(normalizeTeamName(row.name));
            const eventHref = plannedRow ? plannedHref?.(row) ?? null : null;
            return (
              <tr
                key={`${row.region}-${row.position}-${row.name}`}
                className={cn(
                  "border-b last:border-0",
                  isSelected(row) ? "bg-primary/10" : active === normalizeTeamName(row.name) && "bg-muted",
                )}
              >
                <td className="py-1.5 pr-2 sm:pr-3">{row.position}</td>
                <td className="whitespace-normal! py-1.5 pr-2 font-medium leading-snug sm:pr-3">{row.name}</td>
                <td className="hidden py-1.5 pr-3 text-muted-foreground sm:table-cell">{row.region}</td>
                <td className="py-1.5 pr-2 sm:pr-3">
                  <span className="flex gap-0.5 sm:gap-1">
                    {row.form.length > 0
                      ? row.form.map((result, index) => (
                          <span
                            key={`${result}-${index}`}
                            className={cn(
                              "inline-flex size-4 items-center justify-center rounded-sm border text-[10px] font-semibold sm:size-6 sm:rounded-md sm:text-xs",
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
                </td>
                <td className="whitespace-nowrap py-1.5 pr-2 text-right sm:pr-3">{row.move ?? "-"}</td>
                {opponentHref && (
                  <td className="whitespace-nowrap py-1.5 text-right">
                    {(canChallenge(row) || plannedRow) && (
                      <Link
                        href={eventHref ?? opponentHref(row)}
                        scroll={eventHref ? undefined : false}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {eventHref ? (
                          "Gepland"
                        ) : plannedRow ? (
                          <>
                            Gepland<span className="hidden sm:inline"> · advies</span>
                          </>
                        ) : (
                          "Advies"
                        )}
                      </Link>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
