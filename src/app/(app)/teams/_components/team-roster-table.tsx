"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { riderTypeLabel } from "@/lib/teams/power-profile";
import type { WtrlRiderSummary } from "@/lib/teams/wtrl-roster";
import { PowerUnitToggle, usePowerUnit } from "@/components/power-unit";
import {
  STATUS_CLASS,
  STATUS_TITLE,
  StatusNote,
  zftpText,
  zmapText,
  zmapWatts,
} from "./wtrl-cells";
import type { PowerUnit } from "@/lib/training/power-unit";

export type TeamOption = {
  id: string;
  name: string;
  type: string;
  parentTeamId: string | null;
};

export type TeamRosterRow = {
  id: string;
  name: string;
  region: string | null;
  zrlCategory: string | null;
  ftpWatts: number | null;
  weightKg: number | null;
  teams: Array<{ id: string; name: string; role: string; parentTeamId: string | null }>;
  power: {
    riderType: string | null;
    syncStatus: string | null;
    syncedAt: string | null;
    ftpWatts: number | null;
    ftpWkg: number | null;
    watts15s: number | null;
    watts30s: number | null;
    watts1m: number | null;
    watts2m: number | null;
    watts5m: number | null;
    watts10m: number | null;
    watts20m: number | null;
    wkg15s: number | null;
    wkg30s: number | null;
    wkg1m: number | null;
    wkg2m: number | null;
    wkg5m: number | null;
    wkg10m: number | null;
    wkg20m: number | null;
  } | null;
  zrlStarts: number;
  zrlBestPosition: number | null;
  zrlAvgPoints: number | null;
  /** zFTP, zMAP en divisieadvies uit de WTRL-import (migr. 0180). */
  wtrl: WtrlRiderSummary | null;
  /** Rosternaam zonder ZWB-account; `id` is dan de rosternaam, geen profiel. */
  unregistered?: boolean;
};

const CATEGORIES = ["A", "B", "C", "D", "E"];
const TYPES = ["sprinter", "puncher", "tter", "climber", "allrounder", "unknown"];
const ROLE_LABELS: Record<string, string> = {
  captain: "Captain",
  "co-captain": "Co-captain",
};

type SortKey =
  | "name"
  | "teams"
  | "profile"
  | "15s"
  | "30s"
  | "1m"
  | "2m"
  | "5m"
  | "10m"
  | "20m"
  | "ftp"
  | "zftp"
  | "zmap"
  | "zrl";

type SortDirection = "asc" | "desc";

function fmt(value: number | null | undefined, digits = 0) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function syncedLabel(value: string | null | undefined) {
  if (!value) return "niet gesynct";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
}

export function TeamRosterTable({
  rows,
  teams,
}: {
  rows: TeamRosterRow[];
  teams: TeamOption[];
}) {
  const [query, setQuery] = useState("");
  const [teamId, setTeamId] = useState("");
  const [category, setCategory] = useState("");
  const [riderType, setRiderType] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { unit } = usePowerUnit();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = rows.filter((row) => {
      if (q && !`${row.name} ${row.region ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      if (teamId && !row.teams.some((team) => team.id === teamId || team.parentTeamId === teamId)) {
        return false;
      }
      if (category && row.zrlCategory !== category) return false;
      const type = row.power?.riderType ?? "unknown";
      if (riderType && type !== riderType) return false;
      return true;
    });
    result.sort((a, b) => compareRows(a, b, sortKey, sortDirection, unit));
    return result;
  }, [rows, query, teamId, category, riderType, sortKey, sortDirection, unit]);

  const hasFilters = Boolean(query || teamId || category || riderType);

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Renners</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} van {rows.length} renners zichtbaar
          </p>
        </div>
        <div className="flex items-center gap-2">
        <PowerUnitToggle />
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setTeamId("");
              setCategory("");
              setRiderType("");
            }}
          >
            <X className="size-4" />
            Wissen
          </Button>
        )}
        </div>
      </header>

      <div className="grid gap-2 rounded-md border bg-background p-2 text-sm md:grid-cols-[1.4fr_1fr_0.7fr_1fr]">
        <label className="flex items-center gap-2 rounded-md border bg-card px-2 py-1">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek renner"
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
        <select
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          className="rounded-md border bg-card px-2 py-1"
        >
          <option value="">Alle teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-md border bg-card px-2 py-1"
        >
          <option value="">Alle cats</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={riderType}
          onChange={(event) => setRiderType(event.target.value)}
          className="rounded-md border bg-card px-2 py-1"
        >
          <option value="">Alle profielen</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {riderTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      {/* Op telefoonbreedte is 1300px tabel drie schermen scrollen; daar tonen
          we per renner een kaart met de kerncijfers. */}
      <ul className="space-y-2 sm:hidden">
        {filtered.map((row) => {
          const power = row.power;
          return (
            <li key={row.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <RiderName row={row} />
                {row.zrlCategory && (
                  <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                    {row.zrlCategory}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {riderTypeLabel(power?.riderType)}
                {row.region ? ` · ${row.region}` : ""}
              </p>
              {row.teams.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {row.teams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted"
                    >
                      {team.name}
                      {ROLE_LABELS[team.role] ? ` · ${ROLE_LABELS[team.role]}` : ""}
                    </Link>
                  ))}
                </div>
              )}
              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t pt-2.5 text-sm">
                {(
                  [
                    ["FTP", power?.ftpWatts ?? row.ftpWatts, power?.ftpWkg],
                    ["5m", power?.watts5m, power?.wkg5m],
                    ["1m", power?.watts1m, power?.wkg1m],
                    ["15s", power?.watts15s, power?.wkg15s],
                  ] as const
                ).map(([label, watts, wkg]) => (
                  <div key={label} className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="tabular-nums">{powerText(watts, wkg, unit)}</dd>
                  </div>
                ))}
                {row.wtrl && (
                  <div className="col-span-2 flex items-baseline justify-between gap-2">
                    <dt className="text-muted-foreground">WTRL</dt>
                    <dd className="tabular-nums">
                      <WtrlSummary wtrl={row.wtrl} unit={unit} />
                    </dd>
                  </div>
                )}
                <div className="col-span-2 flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">ZRL</dt>
                  <dd className="tabular-nums">
                    {row.zrlStarts} starts · best{" "}
                    {row.zrlBestPosition ? `#${row.zrlBestPosition}` : "-"} ·{" "}
                    {fmt(row.zrlAvgPoints, 1)} pt
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[1300px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <SortableHeader label="Renner" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="Teams" sortKey="teams" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="Profiel" sortKey="profile" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="15s" sortKey="15s" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="30s" sortKey="30s" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="1m" sortKey="1m" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="2m" sortKey="2m" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="5m" sortKey="5m" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="10m" sortKey="10m" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="20m" sortKey="20m" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="FTP" sortKey="ftp" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="zFTP" sortKey="zftp" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="zMAP" sortKey="zmap" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SortableHeader label="ZRL" sortKey="zrl" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <th className="py-2 font-medium">Bijgewerkt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const power = row.power;
              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 align-top">
                    <RiderName row={row} />
                    <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                      {row.zrlCategory && (
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-secondary-foreground">
                          {row.zrlCategory}
                        </span>
                      )}
                      {row.region && <span>{row.region}</span>}
                    </div>
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <div className="flex max-w-36 flex-wrap gap-1">
                      {row.teams.length === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        row.teams.map((team) => (
                          <Link
                            key={team.id}
                            href={`/teams/${team.id}`}
                            className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted"
                          >
                            {team.name}
                            {ROLE_LABELS[team.role] ? ` · ${ROLE_LABELS[team.role]}` : ""}
                          </Link>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-3 align-top">
                    {riderTypeLabel(power?.riderType)}
                  </td>
                  <PowerCell unit={unit} watts={power?.watts15s} wkg={power?.wkg15s} />
                  <PowerCell unit={unit} watts={power?.watts30s} wkg={power?.wkg30s} />
                  <PowerCell unit={unit} watts={power?.watts1m} wkg={power?.wkg1m} />
                  <PowerCell unit={unit} watts={power?.watts2m} wkg={power?.wkg2m} />
                  <PowerCell unit={unit} watts={power?.watts5m} wkg={power?.wkg5m} />
                  <PowerCell unit={unit} watts={power?.watts10m} wkg={power?.wkg10m} />
                  <PowerCell unit={unit} watts={power?.watts20m} wkg={power?.wkg20m} />
                  <PowerCell unit={unit} watts={power?.ftpWatts ?? row.ftpWatts} wkg={power?.ftpWkg} />
                  <td className="py-2 pr-3 align-top tabular-nums">
                    {row.wtrl ? (
                      <>
                        <div>{zftpText(row.wtrl, unit)}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.wtrl.category ? `Cat ${row.wtrl.category}` : "-"}
                          <StatusNote status={row.wtrl.zftpStatus} />
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 align-top tabular-nums">
                    {row.wtrl ? (
                      <>
                        <div>{zmapText(row.wtrl, unit)}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.wtrl.advice ?? "-"}
                          <StatusNote status={row.wtrl.zmapStatus} />
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <div className="tabular-nums">{row.zrlStarts} starts</div>
                    <div className="text-xs text-muted-foreground">
                      best {row.zrlBestPosition ? `#${row.zrlBestPosition}` : "-"} · {fmt(row.zrlAvgPoints, 1)} pt
                    </div>
                  </td>
                  <td className="py-2 align-top text-xs text-muted-foreground">
                    {power?.syncStatus === "error" ? "fout" : syncedLabel(power?.syncedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  function toggleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(defaultSortDirection(nextKey));
  }
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <th className="py-2 pr-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-muted ${
          active ? "text-foreground" : ""
        }`}
      >
        {label}
        {active &&
          (direction === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          ))}
      </button>
    </th>
  );
}

function RiderName({ row }: { row: TeamRosterRow }) {
  const status = row.wtrl?.status ?? "ok";
  if (!row.unregistered) {
    return (
      <Link
        href={`/leden/${row.id}`}
        title={STATUS_TITLE[status]}
        className={`font-medium hover:underline ${STATUS_CLASS[status]}`}
      >
        {row.name}
      </Link>
    );
  }
  return (
    <span>
      <span title={STATUS_TITLE[status]} className={`font-medium ${STATUS_CLASS[status]}`}>
        {row.name}
      </span>
      <span className="ml-2 rounded-full border border-dashed px-1.5 py-0.5 text-xs text-muted-foreground">
        niet geregistreerd
      </span>
    </span>
  );
}

/** Op de rennerkaart (telefoon) alles op één regel. */
function WtrlSummary({ wtrl, unit }: { wtrl: WtrlRiderSummary; unit: PowerUnit }) {
  return (
    <>
      {wtrl.category && <span className="font-medium">{wtrl.category} · </span>}
      zFTP {zftpText(wtrl, unit)}
      <StatusNote status={wtrl.zftpStatus} /> · zMAP {zmapText(wtrl, unit)}
      <StatusNote status={wtrl.zmapStatus} /> · {wtrl.advice ?? "-"}
    </>
  );
}

function powerText(
  watts: number | null | undefined,
  wkg: number | null | undefined,
  unit: PowerUnit,
) {
  if (unit === "wkg") return wkg ? fmt(wkg, 2) : "-";
  return watts ? `${fmt(watts)}w` : "-";
}

function PowerCell({
  watts,
  wkg,
  unit,
}: {
  watts: number | null | undefined;
  wkg: number | null | undefined;
  unit: PowerUnit;
}) {
  return <td className="py-2 pr-3 align-top tabular-nums">{powerText(watts, wkg, unit)}</td>;
}

function defaultSortDirection(key: SortKey): SortDirection {
  return ["name", "teams", "profile"].includes(key) ? "asc" : "desc";
}

function compareRows(
  a: TeamRosterRow,
  b: TeamRosterRow,
  key: SortKey,
  direction: SortDirection,
  unit: PowerUnit,
) {
  const dir = direction === "asc" ? 1 : -1;
  const av = sortValue(a, key, unit);
  const bv = sortValue(b, key, unit);

  if (typeof av === "number" && typeof bv === "number") {
    if (av === bv) return a.name.localeCompare(b.name, "nl");
    if (av === Number.NEGATIVE_INFINITY) return 1;
    if (bv === Number.NEGATIVE_INFINITY) return -1;
    return (av - bv) * dir;
  }

  return String(av).localeCompare(String(bv), "nl") * dir;
}

function sortValue(row: TeamRosterRow, key: SortKey, unit: PowerUnit): string | number {
  const pick = (watts: number | null | undefined, wkg: number | null | undefined) =>
    (unit === "wkg" ? wkg : watts) ?? Number.NEGATIVE_INFINITY;
  switch (key) {
    case "name":
      return row.name;
    case "teams":
      return row.teams.map((team) => team.name).join(", ") || "~";
    case "profile":
      return riderTypeLabel(row.power?.riderType);
    case "15s":
      return pick(row.power?.watts15s, row.power?.wkg15s);
    case "30s":
      return pick(row.power?.watts30s, row.power?.wkg30s);
    case "1m":
      return pick(row.power?.watts1m, row.power?.wkg1m);
    case "2m":
      return pick(row.power?.watts2m, row.power?.wkg2m);
    case "5m":
      return pick(row.power?.watts5m, row.power?.wkg5m);
    case "10m":
      return pick(row.power?.watts10m, row.power?.wkg10m);
    case "20m":
      return pick(row.power?.watts20m, row.power?.wkg20m);
    case "ftp":
      return pick(row.power?.ftpWatts ?? row.ftpWatts, row.power?.ftpWkg);
    case "zftp":
      return pick(row.wtrl?.zftpW, row.wtrl?.zftpWkg);
    case "zmap":
      return pick(row.wtrl ? zmapWatts(row.wtrl) : null, row.wtrl?.zmapWkg);
    case "zrl":
      return row.zrlStarts;
  }
}
