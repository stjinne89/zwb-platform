"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { ArrowDown } from "lucide-react";
import { MemberLink } from "@/components/member-link";
import { Button } from "@/components/ui/button";
import { WhatsAppShareLink } from "@/components/whatsapp-share-link";
import { lineupShareText } from "@/lib/teams/lineup-share";
import {
  laterWeeksInRound,
  lineupBlocks,
  orderRankingTeams,
  riderLevel,
  sortRanking,
  splitIntoTeams,
  ZRL_BLOCK_SIZE,
  type LimitStatus,
  type PowerSource,
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

/** Racefit van een raceweek: per parcours de scores, en welk team welk parcours rijdt. */
export type RankingRacefit = {
  courses: Record<
    string,
    { name: string; laps: number; borrowedFrom: string | null; scores: Record<string, number | null> }
  >;
  teamCourse: Record<string, string>;
  /** Wat de meeste teams rijden: voor wie niet is ingedeeld, en voor Neem sortering over. */
  defaultCourse: string | null;
};

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

/** Met Racefit erbij past de tabel op de telefoon niet meer: 1, 5 en 20 minuten gaan daar weg. */
const PHONE_HIDDEN = new Set<RankingSortKey>(["m1", "m5", "m20"]);

const RACEFIT_COLUMN: { key: RankingSortKey; label: string } = { key: "racefit", label: "Racefit" };

const SOURCE_LABEL: Record<PowerSource, string> = { zwiftracing: "ZwiftRacing", intervals: "intervals.icu" };

function courseLabel(course: { name: string; laps: number; borrowedFrom?: string | null }) {
  const label = course.laps > 1 ? `${course.name} · ${course.laps} rondes` : course.name;
  return course.borrowedFrom ? `${label} (geleend van ${course.borrowedFrom})` : label;
}

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
  racefit,
  racepasses,
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
  /** Per raceweek met een bekende route. */
  racefit: Record<string, RankingRacefit>;
  /** Per raceweek: subteam → URL van de WTRL-racepass. */
  racepasses: Record<string, Record<string, string>>;
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

  // Racefit alleen bij een raceweek met een bekende route; anders valt de sortering terug op zFTP.
  const weekFit = eventId ? (racefit[eventId] ?? null) : null;
  const defaultScores = weekFit?.defaultCourse ? weekFit.courses[weekFit.defaultCourse].scores : null;
  const activeKey: RankingSortKey = sortKey === "racefit" && !defaultScores ? "zftp" : sortKey;
  const scoresOfTeam = (team: string) => {
    const key = weekFit?.teamCourse[team] ?? weekFit?.defaultCourse;
    return key ? weekFit!.courses[key].scores : null;
  };
  const columns = defaultScores ? [...COLUMNS, RACEFIT_COLUMN] : COLUMNS;
  const courseTitle = weekFit ? racefitTitle(weekFit, ordered) : "";
  // Schuin, zoals een WTRL-waarde: de route is van een ander team geleend.
  const courseBorrowed = weekFit ? Object.values(weekFit.courses).some((course) => course.borrowedFrom) : false;

  const statusOf = (rider: RankedRider) => (eventId ? (shown[`${eventId}:${rider.key}`]?.status ?? null) : null);
  const present = riders.filter((rider) => statusOf(rider) !== "unavailable");
  // Blokken van 5 op de sortering; alleen het laatste blok kan korter zijn, dus
  // elk blok begint op index × 5.
  const sortedBlocks = splitIntoTeams(sortRanking(present, activeKey, defaultScores), ordered).map((block, index) => ({
    ...block,
    first: index * ZRL_BLOCK_SIZE,
  }));
  const weekLineups = eventId ? shownLineups.filter((row) => row.eventId === eventId) : [];
  const week = eventId ? lineupBlocks(riders, weekLineups, ordered, activeKey, { racefitOf: scoresOfTeam }) : null;
  const unassigned = week ? sortRanking(present.filter((rider) => !week.assigned.has(rider.key)), activeKey, defaultScores) : [];
  const absent = sortRanking(
    riders.filter((rider) => statusOf(rider) === "unavailable" && !week?.assigned.has(rider.key)),
    activeKey,
    defaultScores,
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

  function clearWeek() {
    if (!window.confirm("Opstelling van deze week wissen?")) return;
    replace([eventId], []);
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

  const selectedEvent = events.find((event) => event.id === eventId);
  const shareText =
    week && selectedEvent && weekLineups.length > 0
      ? lineupShareText({
          title: eventLabel(selectedEvent),
          teams: week.blocks.map((block) => ({
            name: block.team.name,
            riders: block.rows.map(({ rider }) => rider.name),
            racepass: racepasses[eventId]?.[block.team.id] ?? null,
          })),
        })
      : null;

  const assignable = canAssign && eventId !== "";
  const editAvailability = eventId !== "" && canEditAvailability;
  const colSpan = columns.length + 2;

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
      {eventId && (canAssignWeek || shareText) && (
        <div className="flex flex-wrap items-center gap-2">
          {canAssignWeek && (
            <>
              <Button size="sm" variant="outline" onClick={takeSorting} disabled={pending}>
                Neem {columns.find((column) => column.key === activeKey)?.label}-sortering over
              </Button>
              {laterWeeks.length > 0 && (
                <Button size="sm" variant="outline" onClick={copyToRound} disabled={pending || weekLineups.length === 0}>
                  Ook voor de rest van de ronde
                </Button>
              )}
              {weekLineups.length > 0 && (
                <Button size="sm" variant="outline" onClick={clearWeek} disabled={pending}>
                  Wis opstelling
                </Button>
              )}
            </>
          )}
          {shareText && <WhatsAppShareLink text={shareText} path={`/events/${eventId}`} separator={"\n\n"} />}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <table className="w-full text-xs tabular-nums sm:text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-1 pr-2 text-left font-medium">Renner</th>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-[3px] py-1 text-right font-medium sm:px-2",
                  defaultScores && PHONE_HIDDEN.has(column.key) && "hidden sm:table-cell",
                )}
                aria-sort={activeKey === column.key ? "descending" : "none"}
              >
                <button
                  type="button"
                  onClick={() => setSortKey(column.key)}
                  title={column.key === "racefit" ? courseTitle : undefined}
                  aria-label={column.label}
                  className={cn(
                    "inline-flex min-h-8 flex-row-reverse items-center gap-0.5 rounded hover:text-foreground",
                    activeKey === column.key && "text-foreground",
                    column.key === "racefit" && courseBorrowed && "italic",
                  )}
                >
                  {column.label}
                  {activeKey === column.key && <ArrowDown className="size-3" />}
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
                      racefit={defaultScores ? (scoresOfTeam(block.team.id)?.[rider.key] ?? null) : undefined}
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
                racefit={defaultScores ? (defaultScores[rider.key] ?? null) : undefined}
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
                racefit={defaultScores ? (defaultScores[rider.key] ?? null) : undefined}
                muted
              />
            ))}
          </tbody>
        )}
      </table>
    </section>
  );
}

/** Tooltip op Racefit: de route, of per team als de teams verschillend rijden. */
function racefitTitle(week: RankingRacefit, teams: Array<RankingTeam & { dev: boolean }>) {
  const used = new Set(Object.values(week.teamCourse));
  if (used.size <= 1) return week.defaultCourse ? courseLabel(week.courses[week.defaultCourse]) : "";
  return teams
    .filter((team) => week.teamCourse[team.id])
    .map((team) => `${team.name}: ${courseLabel(week.courses[week.teamCourse[team.id]])}`)
    .join("\n");
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
  racefit,
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
  /** Gezet (ook null): de kolom Racefit staat erbij. */
  racefit?: number | null;
  muted?: boolean;
}) {
  const mark = availability ? AVAILABILITY[availability.status] : null;
  const ownChoice = availability != null && !availability.byCaptain;
  const editable = onCycle != null && !ownChoice;
  return (
    <tr className={cn("border-b last:border-0", ROW_TINT[level], muted && "text-muted-foreground")}>
      <td className="w-full max-w-0 truncate py-1 pr-2">
        {position != null && (
          <span
            className={cn(
              "mr-1 inline-block w-4 text-right text-muted-foreground sm:mr-1.5 sm:w-5",
              // Op de telefoon zegt het keuzevakje al in welk team iemand staat.
              teams && "hidden sm:inline-block",
            )}
          >
            {position}
          </span>
        )}
        {teams && onMove && (
          <select
            value={teamId ?? ""}
            onChange={(event) => onMove(event.target.value || null)}
            className="mr-1 h-6 w-9 appearance-none rounded border bg-background px-0 text-center align-middle text-xs sm:w-auto sm:appearance-auto sm:px-0.5 sm:text-left"
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
      {(["m1", "m5", "m20"] as const).map((key) => (
        <td
          key={key}
          className={cn("px-[3px] py-1 text-right sm:px-2", racefit !== undefined && "hidden sm:table-cell")}
          title={rider.powerSource?.[key] ? SOURCE_LABEL[rider.powerSource[key]!] : undefined}
        >
          {wkg(rider.power?.[key])}
        </td>
      ))}
      {racefit !== undefined && <td className="px-[3px] py-1 text-right font-medium sm:px-2">{wkg(racefit)}</td>}
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
          title={value.source === "wtrl" ? "WTRL" : value.from ? `Geschat, ${SOURCE_LABEL[value.from]}` : undefined}
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
