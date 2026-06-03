"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { riderTypeLabel } from "@/lib/teams/power-profile";

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
    result.sort((a, b) => compareRows(a, b, sortKey, sortDirection));
    return result;
  }, [rows, query, teamId, category, riderType, sortKey, sortDirection]);

  const hasFilters = Boolean(query || teamId || category || riderType);

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Rennerrooster</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} van {rows.length} renners zichtbaar
          </p>
        </div>
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
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
              <SortableHeader label="ZRL" sortKey="zrl" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <th className="py-2 font-medium">Sync</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const power = row.power;
              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 align-top">
                    <Link href={`/leden/${row.id}`} className="font-medium hover:underline">
                      {row.name}
                    </Link>
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
                    <div className="flex max-w-56 flex-wrap gap-1">
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
                  <PowerCell watts={power?.watts15s} wkg={power?.wkg15s} />
                  <PowerCell watts={power?.watts30s} wkg={power?.wkg30s} />
                  <PowerCell watts={power?.watts1m} wkg={power?.wkg1m} />
                  <PowerCell watts={power?.watts2m} wkg={power?.wkg2m} />
                  <PowerCell watts={power?.watts5m} wkg={power?.wkg5m} />
                  <PowerCell watts={power?.watts10m} wkg={power?.wkg10m} />
                  <PowerCell watts={power?.watts20m} wkg={power?.wkg20m} />
                  <PowerCell watts={power?.ftpWatts ?? row.ftpWatts} wkg={power?.ftpWkg} />
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

function PowerCell({
  watts,
  wkg,
}: {
  watts: number | null | undefined;
  wkg: number | null | undefined;
}) {
  return (
    <td className="py-2 pr-3 align-top tabular-nums">
      <div>{fmt(watts)}w</div>
      <div className="text-xs text-muted-foreground">{fmt(wkg, 2)} w/kg</div>
    </td>
  );
}

function defaultSortDirection(key: SortKey): SortDirection {
  return ["name", "teams", "profile"].includes(key) ? "asc" : "desc";
}

function compareRows(
  a: TeamRosterRow,
  b: TeamRosterRow,
  key: SortKey,
  direction: SortDirection,
) {
  const dir = direction === "asc" ? 1 : -1;
  const av = sortValue(a, key);
  const bv = sortValue(b, key);

  if (typeof av === "number" && typeof bv === "number") {
    if (av === bv) return a.name.localeCompare(b.name, "nl");
    if (av === Number.NEGATIVE_INFINITY) return 1;
    if (bv === Number.NEGATIVE_INFINITY) return -1;
    return (av - bv) * dir;
  }

  return String(av).localeCompare(String(bv), "nl") * dir;
}

function sortValue(row: TeamRosterRow, key: SortKey): string | number {
  switch (key) {
    case "name":
      return row.name;
    case "teams":
      return row.teams.map((team) => team.name).join(", ") || "~";
    case "profile":
      return riderTypeLabel(row.power?.riderType);
    case "15s":
      return row.power?.watts15s ?? Number.NEGATIVE_INFINITY;
    case "30s":
      return row.power?.watts30s ?? Number.NEGATIVE_INFINITY;
    case "1m":
      return row.power?.watts1m ?? Number.NEGATIVE_INFINITY;
    case "2m":
      return row.power?.watts2m ?? Number.NEGATIVE_INFINITY;
    case "5m":
      return row.power?.watts5m ?? Number.NEGATIVE_INFINITY;
    case "10m":
      return row.power?.watts10m ?? Number.NEGATIVE_INFINITY;
    case "20m":
      return row.power?.watts20m ?? Number.NEGATIVE_INFINITY;
    case "ftp":
      return row.power?.ftpWatts ?? row.ftpWatts ?? Number.NEGATIVE_INFINITY;
    case "zrl":
      return row.zrlStarts;
  }
}
