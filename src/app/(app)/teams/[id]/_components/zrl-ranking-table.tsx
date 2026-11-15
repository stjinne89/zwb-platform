"use client";

import { useMemo, useState } from "react";
import { ArrowDown } from "lucide-react";
import { MemberLink } from "@/components/member-link";
import {
  orderRankingTeams,
  riderLevel,
  sortRanking,
  splitIntoTeams,
  ZRL_BLOCK_SIZE,
  type LimitStatus,
  type RankedRider,
  type RankingAvailability,
  type RankingSortKey,
  type RankingTeam,
  type ZValue,
} from "@/lib/teams/zrl-ranking";
import { cn } from "@/lib/utils";

export type RankingEvent = { id: string; title: string; startAt: string };

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

export function ZrlRankingTable({
  teams,
  riders,
  events,
  availability,
}: {
  teams: RankingTeam[];
  riders: RankedRider[];
  events: RankingEvent[];
  /** `${eventId}:${rider.key}` → status. */
  availability: Record<string, RankingAvailability>;
}) {
  const [sortKey, setSortKey] = useState<RankingSortKey>("zftp");
  const [eventId, setEventId] = useState("");
  const ordered = useMemo(() => orderRankingTeams(teams), [teams]);

  const statusOf = (rider: RankedRider) =>
    eventId ? (availability[`${eventId}:${rider.key}`] ?? null) : null;

  const { blocks, absent } = useMemo(() => {
    const status = (rider: RankedRider) =>
      eventId ? (availability[`${eventId}:${rider.key}`] ?? null) : null;
    const present = riders.filter((rider) => status(rider) !== "unavailable");
    const away = riders.filter((rider) => status(rider) === "unavailable");
    // Alleen het laatste blok kan korter zijn dan 5, dus elk blok begint op index × 5.
    return {
      blocks: splitIntoTeams(sortRanking(present, sortKey), ordered).map((block, index) => ({
        ...block,
        first: index * ZRL_BLOCK_SIZE,
      })),
      absent: sortRanking(away, sortKey),
    };
  }, [riders, sortKey, eventId, availability, ordered]);

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Teamindeling</h2>
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
        {blocks.map((block) => (
          <tbody key={block.team?.id ?? "reserve"}>
            <tr className={cn("border-t-2", block.level === "over" ? "border-destructive" : "border-foreground/40")}>
              <th colSpan={COLUMNS.length + 2} className="py-1.5 text-left">
                <span className="font-semibold">{block.team?.name ?? "Reserve"}</span>
                {block.team && (
                  <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-xs font-medium", LEVEL_PILL[block.level])}>
                    {LEVEL_TEXT[block.level]}
                  </span>
                )}
              </th>
            </tr>
            {block.riders.map((rider, index) => (
              <RiderRow
                key={rider.key}
                rider={rider}
                position={block.first + index + 1}
                level={riderLevel(rider, block.team?.dev ?? false)}
                inDevTeam={block.team?.dev ?? false}
                availability={statusOf(rider)}
              />
            ))}
          </tbody>
        ))}
        {absent.length > 0 && (
          <tbody>
            <tr className="border-t-2 border-foreground/40">
              <th colSpan={COLUMNS.length + 2} className="py-1.5 text-left font-semibold">
                Niet beschikbaar
              </th>
            </tr>
            {absent.map((rider) => (
              <RiderRow
                key={rider.key}
                rider={rider}
                position={null}
                level="ok"
                inDevTeam={false}
                availability="unavailable"
                muted
              />
            ))}
          </tbody>
        )}
      </table>
    </section>
  );
}

function RiderRow({
  rider,
  position,
  level,
  inDevTeam,
  availability,
  muted = false,
}: {
  rider: RankedRider;
  position: number | null;
  level: LimitStatus;
  inDevTeam: boolean;
  availability: RankingAvailability;
  muted?: boolean;
}) {
  const mark = availability ? AVAILABILITY[availability] : null;
  return (
    <tr className={cn("border-b last:border-0", ROW_TINT[level], muted && "text-muted-foreground")}>
      <td className="w-full max-w-0 truncate py-1 pr-2">
        {position != null && <span className="mr-1 inline-block w-4 text-right text-muted-foreground sm:mr-1.5 sm:w-5">{position}</span>}
        {mark && (
          <span className={cn("mr-1 font-semibold", mark.className)} title={mark.label} aria-label={mark.label}>
            {mark.mark}
          </span>
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
