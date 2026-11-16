"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { ArrowDown } from "lucide-react";
import { MemberLink } from "@/components/member-link";
import { Button } from "@/components/ui/button";
import {
  laterWeeksInRound,
  lineupBlocks,
  orderRankingTeams,
  riderLevel,
  sortRanking,
  splitIntoTeams,
  ZRL_BLOCK_SIZE,
  type LimitStatus,
  type RankedRider,
  type RankingAvailability,
  type RankingLineup,
  type RankingSortKey,
  type RankingTeam,
  type ZValue,
} from "@/lib/teams/zrl-ranking";
import { cn } from "@/lib/utils";
import { moveZrlLineup, setRiderAvailability, setZrlWeekLineups, type LineupRider } from "../_actions";

export type RankingEvent = { id: string; title: string; startAt: string };

/** Beschikbaarheid in een raceweek; byCaptain: door een captain gezet (0332). */
export type RankingAvailabilityEntry = {
  status: NonNullable<RankingAvailability>;
  byCaptain: boolean;
};

/** Tikken wisselt: leeg → ✓ → ? → ✗ → leeg. */
const NEXT: Record<"none" | NonNullable<RankingAvailability>, RankingAvailability> = {
  none: "available",
  available: "maybe",
  maybe: "unavailable",
  unavailable: null,
};

const COLUMNS: Array<{ key: RankingSortKey; label: string }> = [
  { key: "zftp", label: "zFTP" },
  { key: "zmap", label: "zMAP" },
  { key: "m1", label: "1m" },
  { key: "m5", label: "5m" },
  { key: "m20", label: "20m" },
];

const LEVEL_TEXT: Record<LimitStatus, string> = { ok: "Past", near: "Krap", over: "Past niet" };

const LEVEL_PILL: Record<LimitStatus, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  near: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  over: "bg-destructive/15 text-destructive",
};

const ROW_TINT: Record<LimitStatus, string> = {
  ok: "",
  near: "bg-amber-500/10",
  over: "bg-destructive/10",
};

const VALUE_TEXT: Record<LimitStatus, string> = {
  ok: "",
  near: "text-amber-700 dark:text-amber-400",
  over: "font-semibold text-destructive",
};

const AVAILABILITY: Record<NonNullable<RankingAvailability>, { mark: string; label: string; className: string }> = {
  available: { mark: "✓", label: "Beschikbaar", className: "text-emerald-600 dark:text-emerald-400" },
  maybe: { mark: "?", label: "Misschien", className: "text-amber-600 dark:text-amber-400" },
  unavailable: { mark: "✗", label: "Niet beschikbaar", className: "text-destructive" },
};

type LineupChange =
  | { type: "move"; eventId: string; riderKey: string; from: string | null; to: string | null }
  | { type: "replace"; eventIds: string[]; rows: Array<{ riderKey: string; teamId: string }> };

function wkg(value: number | null | undefined) {
  return value == null
    ? "-"
    : value.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function eventLabel(event: RankingEvent) {
  const date = new Date(event.startAt).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
  return `${date} · ${event.title}`;
}

/** "ZRL 2026/27 · R2 · W3" → "W3". */
function weekLabel(event: RankingEvent) {
  return /\bW\d+\b/.exec(event.title)?.[0] ?? eventLabel(event);
}

const lineupRider = (rider: RankedRider): LineupRider => ({
  kind: rider.profileId ? "profile" : "roster",
  id: rider.key,
});

function applyLineupChange(state: RankingLineup[], change: LineupChange): RankingLineup[] {
  if (change.type === "replace") {
    return [
      ...state.filter((row) => !change.eventIds.includes(row.eventId)),
      ...change.eventIds.flatMap((eventId) =>
        change.rows.map((row) => ({
          id: `tmp:${eventId}:${row.teamId}:${row.riderKey}`,
          eventId,
          teamId: row.teamId,
          riderKey: row.riderKey,
        })),
      ),
    ];
  }
  const { eventId, riderKey, from, to } = change;
  const mine = (row: RankingLineup) => row.eventId === eventId && row.riderKey === riderKey;
  let next = state.filter((row) => !(mine(row) && row.teamId === from));
  if (to && !next.some((row) => mine(row) && row.teamId === to)) {
    next = [...next, { id: `tmp:${eventId}:${to}:${riderKey}`, eventId, teamId: to, riderKey }];
  }
  return next;
}

export function ZrlRankingTable({
  teams,
  riders,
  events,
  availability,
  lineups,
  teamId,
  canEditAvailability,
  canAssign,
  canAssignWeek,
}: {
  teams: RankingTeam[];
  riders: RankedRider[];
  events: RankingEvent[];
  /** `${eventId}:${rider.key}` → beschikbaarheid. */
  availability: Record<string, RankingAvailabilityEntry>;
  /** De opstelling van de raceweken (team_event_lineups). */
  lineups: RankingLineup[];
  /** Het hoofdteam waar beschikbaarheid en opstelling bij horen. */
  teamId: string;
  canEditAvailability: boolean;
  /** Renners per stuk indelen. */
  canAssign: boolean;
  /** Een hele week in één keer zetten. */
  canAssignWeek: boolean;
}) {
  const [sortKey, setSortKey] = useState<RankingSortKey>("zftp");
  const [eventId, setEventId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ordered = useMemo(() => orderRankingTeams(teams), [teams]);
  const [shown, setShown] = useOptimistic(
    availability,
    (state, change: { key: string; entry: RankingAvailabilityEntry | null }) => {
      const next = { ...state };
      if (change.entry) next[change.key] = change.entry;
      else delete next[change.key];
      return next;
    },
  );
  const [shownLineups, changeLineups] = useOptimistic(lineups, applyLineupChange);

  const entryOf = (rider: RankedRider) => (eventId ? (shown[`${eventId}:${rider.key}`] ?? null) : null);

  function cycle(rider: RankedRider) {
    if (!eventId) return;
    const key = `${eventId}:${rider.key}`;
    const status = NEXT[shown[key]?.status ?? "none"];
    setError(null);
    startTransition(async () => {
      setShown({ key, entry: status ? { status, byCaptain: true } : null });
      const res = await setRiderAvailability(teamId, eventId, lineupRider(rider), status);
      if (!res.ok) setError(res.error);
    });
  }

  function move(rider: RankedRider, from: string | null, to: string | null) {
    if (!eventId || from === to) return;
    setError(null);
    startTransition(async () => {
      changeLineups({ type: "move", eventId, riderKey: rider.key, from, to });
      const res = await moveZrlLineup(teamId, eventId, lineupRider(rider), from, to);
      if (!res.ok) setError(res.error);
    });
  }

  function replace(eventIds: string[], rows: Array<{ rider: RankedRider; teamId: string }>) {
    setError(null);
    startTransition(async () => {
      changeLineups({
        type: "replace",
        eventIds,
        rows: rows.map((row) => ({ riderKey: row.rider.key, teamId: row.teamId })),
      });
      const res = await setZrlWeekLineups(
        teamId,
        eventIds,
        rows.map((row) => ({ rider: lineupRider(row.rider), teamId: row.teamId })),
      );
      if (!res.ok) setError(res.error);
    });
  }

  const statusOf = (rider: RankedRider) => (eventId ? (shown[`${eventId}:${rider.key}`]?.status ?? null) : null);
  const present = riders.filter((rider) => statusOf(rider) !== "unavailable");
  // Blokken van 5 op de sortering; alleen het laatste blok kan korter zijn, dus
  // elk blok begint op index × 5.
  const sortedBlocks = splitIntoTeams(sortRanking(present, sortKey), ordered).map((block, index) => ({
    ...block,
    first: index * ZRL_BLOCK_SIZE,
  }));
  const weekLineups = eventId ? shownLineups.filter((row) => row.eventId === eventId) : [];
  const week = eventId ? lineupBlocks(riders, weekLineups, ordered, sortKey) : null;
  const unassigned = week ? sortRanking(present.filter((rider) => !week.assigned.has(rider.key)), sortKey) : [];
  const absent = sortRanking(
    riders.filter((rider) => statusOf(rider) === "unavailable" && !week?.assigned.has(rider.key)),
    sortKey,
  );
  const laterWeeks = eventId ? laterWeeksInRound(events, eventId) : [];

  function takeSorting() {
    if (weekLineups.length > 0 && !window.confirm("Opstelling van deze week vervangen?")) return;
    replace(
      [eventId],
      sortedBlocks.flatMap((block) =>
        block.team ? block.riders.map((rider) => ({ rider, teamId: block.team!.id })) : [],
      ),
    );
  }

  function copyToRound() {
    const overwritten = laterWeeks.filter((later) => shownLineups.some((row) => row.eventId === later.id));
    const question =
      `Naar ${laterWeeks.map(weekLabel).join(", ")} kopiëren?` +
      (overwritten.length > 0 ? `\n${overwritten.map(weekLabel).join(", ")} wordt overschreven.` : "");
    if (!window.confirm(question)) return;
    const riderByKey = new Map(riders.map((rider) => [rider.key, rider]));
    replace(
      laterWeeks.map((later) => later.id),
      weekLineups.flatMap((row) => {
        const rider = riderByKey.get(row.riderKey);
        return rider ? [{ rider, teamId: row.teamId }] : [];
      }),
    );
  }

  const assignable = canAssign && eventId !== "";
  const editAvailability = eventId !== "" && canEditAvailability;
  const colSpan = COLUMNS.length + 2;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Teamindeling</h1>
        {events.length > 0 && (
          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            className="min-h-11 max-w-full rounded-md border bg-background px-2 py-1 text-sm sm:min-h-9"
            aria-label="Wedstrijd"
          >
            <option value="">Alle renners</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {eventLabel(event)}
              </option>
            ))}
          </select>
        )}
      </header>
      {eventId && canAssignWeek && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={takeSorting} disabled={pending}>
            Neem sortering over
          </Button>
          {laterWeeks.length > 0 && (
            <Button size="sm" variant="outline" onClick={copyToRound} disabled={pending || weekLineups.length === 0}>
              Ook voor de rest van de ronde
            </Button>
          )}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <table className="w-full text-xs tabular-nums sm:text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-1 pr-2 text-left font-medium">Renner</th>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                className="px-[3px] py-1 text-right font-medium sm:px-2"
                aria-sort={sortKey === column.key ? "descending" : "none"}
              >
                <button
                  type="button"
                  onClick={() => setSortKey(column.key)}
                  className={cn(
                    "inline-flex min-h-8 flex-row-reverse items-center gap-0.5 rounded hover:text-foreground",
                    sortKey === column.key && "text-foreground",
                  )}
                >
                  {column.label}
                  {sortKey === column.key && <ArrowDown className="size-3" />}
                </button>
              </th>
            ))}
            <th className="py-1 pl-1 text-center font-medium sm:pl-2">Dev</th>
          </tr>
        </thead>

        {week
          ? week.blocks.map((block) => {
              const level: LimitStatus = block.crowded && block.level === "ok" ? "near" : block.level;
              return (
                <tbody key={block.team.id}>
                  <BlockHeader
                    name={block.team.name}
                    count={block.rows.length}
                    crowded={block.crowded}
                    level={block.rows.length > 0 ? level : null}
                    colSpan={colSpan}
                  />
                  {block.rows.map(({ rider, lineupId }, index) => (
                    <RiderRow
                      key={lineupId}
                      rider={rider}
                      position={index + 1}
                      level={riderLevel(rider, block.team.dev)}
                      inDevTeam={block.team.dev}
                      availability={entryOf(rider)}
                      onCycle={editAvailability ? () => cycle(rider) : undefined}
                      teams={assignable ? ordered : undefined}
                      teamId={block.team.id}
                      onMove={(to) => move(rider, block.team.id, to)}
                    />
                  ))}
                </tbody>
              );
            })
          : sortedBlocks.map((block) => (
              <tbody key={block.team?.id ?? "reserve"}>
                <BlockHeader
                  name={block.team?.name ?? "Reserve"}
                  count={null}
                  crowded={false}
                  level={block.team ? block.level : null}
                  colSpan={colSpan}
                />
                {block.riders.map((rider, index) => (
                  <RiderRow
                    key={rider.key}
                    rider={rider}
                    position={block.first + index + 1}
                    level={riderLevel(rider, block.team?.dev ?? false)}
                    inDevTeam={block.team?.dev ?? false}
                    availability={null}
                  />
                ))}
              </tbody>
            ))}

        {unassigned.length > 0 && (
          <tbody>
            <BlockHeader name="Niet ingedeeld" count={null} crowded={false} level={null} colSpan={colSpan} />
            {unassigned.map((rider) => (
              <RiderRow
                key={rider.key}
                rider={rider}
                position={null}
                level="ok"
                inDevTeam={false}
                availability={entryOf(rider)}
                onCycle={editAvailability ? () => cycle(rider) : undefined}
                teams={assignable ? ordered : undefined}
                teamId={null}
                onMove={(to) => move(rider, null, to)}
              />
            ))}
          </tbody>
        )}
        {absent.length > 0 && (
          <tbody>
            <BlockHeader name="Niet beschikbaar" count={null} crowded={false} level={null} colSpan={colSpan} />
            {absent.map((rider) => (
              <RiderRow
                key={rider.key}
                rider={rider}
                position={null}
                level="ok"
                inDevTeam={false}
                availability={entryOf(rider)}
                onCycle={editAvailability ? () => cycle(rider) : undefined}
                teams={assignable ? ordered : undefined}
                teamId={null}
                onMove={(to) => move(rider, null, to)}
                muted
              />
            ))}
          </tbody>
        )}
      </table>
    </section>
  );
}

function BlockHeader({
  name,
  count,
  crowded,
  level,
  colSpan,
}: {
  name: string;
  count: number | null;
  crowded: boolean;
  level: LimitStatus | null;
  colSpan: number;
}) {
  return (
    <tr className={cn("border-t-2", level === "over" ? "border-destructive" : "border-foreground/40")}>
      <th colSpan={colSpan} className="py-1.5 text-left">
        <span className="font-semibold">{name}</span>
        {count != null && (
          <span
            className={cn(
              "ml-1.5 font-normal tabular-nums text-muted-foreground",
              crowded && "font-medium text-amber-700 dark:text-amber-400",
            )}
          >
            {count}/{ZRL_BLOCK_SIZE}
          </span>
        )}
        {level && (
          <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-xs font-medium", LEVEL_PILL[level])}>
            {LEVEL_TEXT[level]}
          </span>
        )}
      </th>
    </tr>
  );
}

function RiderRow({
  rider,
  position,
  level,
  inDevTeam,
  availability,
  onCycle,
  teams,
  teamId = null,
  onMove,
  muted = false,
}: {
  rider: RankedRider;
  position: number | null;
  level: LimitStatus;
  inDevTeam: boolean;
  availability: RankingAvailabilityEntry | null;
  /** Gezet: de captain mag tikken; alleen als de renner het niet zelf koos. */
  onCycle?: () => void;
  /** Gezet: de captain kan de renner in een team zetten. */
  teams?: Array<RankingTeam & { dev: boolean }>;
  teamId?: string | null;
  onMove?: (teamId: string | null) => void;
  muted?: boolean;
}) {
  const mark = availability ? AVAILABILITY[availability.status] : null;
  const ownChoice = availability != null && !availability.byCaptain;
  const editable = onCycle != null && !ownChoice;
  return (
    <tr className={cn("border-b last:border-0", ROW_TINT[level], muted && "text-muted-foreground")}>
      <td className="w-full max-w-0 truncate py-1 pr-2">
        {position != null && <span className="mr-1 inline-block w-4 text-right text-muted-foreground sm:mr-1.5 sm:w-5">{position}</span>}
        {teams && onMove && (
          <select
            value={teamId ?? ""}
            onChange={(event) => onMove(event.target.value || null)}
            className="mr-1 h-6 rounded border bg-background px-0.5 align-middle text-xs"
            aria-label={`Team van ${rider.name}`}
          >
            <option value="">–</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
        {editable ? (
          <button
            type="button"
            onClick={onCycle}
            className={cn(
              "mr-1 inline-flex size-6 items-center justify-center rounded border border-dashed align-middle font-semibold",
              mark ? mark.className : "text-muted-foreground",
            )}
            title={mark ? `${mark.label} (captain)` : "Niet opgegeven"}
            aria-label={`Beschikbaarheid van ${rider.name}: ${mark ? mark.label : "niet opgegeven"}`}
          >
            {mark?.mark ?? "·"}
          </button>
        ) : (
          mark && (
            <span className={cn("mr-1 font-semibold", mark.className)} title={mark.label} aria-label={mark.label}>
              {mark.mark}
            </span>
          )
        )}
        <MemberLink id={rider.profileId} className="font-medium">
          {rider.name}
        </MemberLink>
        {!rider.profileId && <span className="ml-1 hidden text-muted-foreground sm:inline">· geen account</span>}
      </td>
      <ZCell value={rider.zftp} status={rider.category} />
      <ZCell value={rider.zmap} status={rider.category} />
      <td className="px-[3px] py-1 text-right sm:px-2">{wkg(rider.power?.m1)}</td>
      <td className="px-[3px] py-1 text-right sm:px-2">{wkg(rider.power?.m5)}</td>
      <td className="px-[3px] py-1 text-right sm:px-2">{wkg(rider.power?.m20)}</td>
      <td className="py-1 pl-1 text-center sm:pl-2">
        <DevMark status={rider.dev} emphasize={inDevTeam} />
      </td>
    </tr>
  );
}

function ZCell({ value, status }: { value: ZValue | null; status: LimitStatus | null }) {
  return (
    <td className={cn("px-[3px] py-1 text-right sm:px-2", status === "over" && VALUE_TEXT.over)}>
      {value ? (
        <span
          className={cn(value.source === "wtrl" && "italic text-muted-foreground")}
          title={value.source === "wtrl" ? "WTRL" : undefined}
        >
          {wkg(value.value)}
        </span>
      ) : (
        "-"
      )}
    </td>
  );
}

function DevMark({ status, emphasize }: { status: LimitStatus | null; emphasize: boolean }) {
  if (status == null) return <span className="text-muted-foreground">-</span>;
  const mark = status === "ok" ? "✓" : status === "near" ? "~" : "✗";
  return (
    <span
      className={cn(emphasize ? VALUE_TEXT[status] || "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}
      title={status === "ok" ? "Past in Dev" : status === "near" ? "Krap voor Dev" : "Past niet in Dev"}
    >
      {mark}
    </span>
  );
}
