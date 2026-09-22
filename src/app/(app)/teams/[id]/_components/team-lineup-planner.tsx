"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { usePowerUnit } from "@/components/power-unit";
import type { WtrlRiderSummary } from "@/lib/teams/wtrl-roster";
import {
  STATUS_CLASS,
  STATUS_TITLE,
  StatusNote,
  zftpText,
  zmapText,
} from "../../_components/wtrl-cells";
import { removeTeamLineup, setTeamLineup } from "../_actions";

export type PlannerTeam = {
  id: string;
  name: string;
};

export type PlannerRider = {
  id: string;
  name: string;
  category: string | null;
  availability: "available" | "maybe" | "unavailable" | null;
  riderType: string | null;
  ftpWatts: number | null;
  ftpWkg: number | null;
  watts5m: number | null;
  watts20m: number | null;
  wkg5m: number | null;
  wkg20m: number | null;
  zrlStarts: number;
  bestPosition: number | null;
  /** Rosternaam zonder account: `id` is dan de rosternaam. */
  unregistered?: boolean;
  /** zFTP, zMAP en divisiestatus uit de WTRL-import. */
  wtrl: WtrlRiderSummary | null;
};

export type PlannerLineup = {
  id: string;
  eventId: string;
  teamId: string;
  /** Profiel of rosternaam, zelfde id als PlannerRider.id. */
  riderId: string;
  riderName: string;
  teamName: string;
};

function fmt(value: number | null | undefined, digits = 0) {
  if (value == null) return "-";
  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function TeamLineupPlanner({
  parentTeamId,
  eventId,
  teams,
  riders,
  lineups,
}: {
  parentTeamId: string;
  eventId: string;
  teams: PlannerTeam[];
  riders: PlannerRider[];
  lineups: PlannerLineup[];
}) {
  const [targetTeamId, setTargetTeamId] = useState(teams[0]?.id ?? "");
  const { unit } = usePowerUnit();
  const power = (watts: number | null, wkg: number | null) =>
    unit === "wkg" ? fmt(wkg, 2) : watts == null ? "-" : `${fmt(watts)}w`;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Per team: een renner kan in dezelfde raceweek voor meer subteams rijden.
  const selectedIds = new Set(lineups.map((lineup) => `${lineup.teamId}:${lineup.riderId}`));
  const isSelected = (rider: PlannerRider) => selectedIds.has(`${targetTeamId}:${rider.id}`);
  const hasWtrl = riders.some((rider) => rider.wtrl);

  function add(rider: PlannerRider) {
    if (!targetTeamId) return;
    setError(null);
    startTransition(async () => {
      const res = await setTeamLineup(parentTeamId, eventId, targetTeamId, {
        kind: rider.unregistered ? "roster" : "profile",
        id: rider.id,
      });
      if (!res.ok) setError(res.error);
    });
  }

  function remove(lineupId: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeTeamLineup(parentTeamId, lineupId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-3 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Captain-selectie</h4>
        <select
          value={targetTeamId}
          onChange={(event) => setTargetTeamId(event.target.value)}
          className="rounded-md border bg-card px-2 py-1 text-sm"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {lineups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lineups.map((lineup) => (
            <span
              key={lineup.id}
              className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-1 text-xs"
            >
              <span className="font-medium">{lineup.teamName}</span>
              {lineup.riderName}
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(lineup.id)}
                aria-label={`${lineup.riderName} uit lineup halen`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <ResponsiveTable
        rows={riders}
        rowKey={(rider) => rider.id}
        minWidth={620}
        columns={[
          {
            key: "name",
            header: "Renner",
            primary: true,
            cell: (rider) => {
              const status = rider.wtrl?.status ?? "ok";
              return (
                <span>
                  <span title={STATUS_TITLE[status]} className={`font-medium ${STATUS_CLASS[status]}`}>
                    {rider.name}
                  </span>
                  {rider.unregistered && (
                    <span className="ml-1 rounded-full border border-dashed px-1.5 py-0.5 text-xs text-muted-foreground">
                      niet geregistreerd
                    </span>
                  )}
                  {(rider.wtrl?.category ?? rider.category) && (
                    <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                      {rider.wtrl?.category ?? rider.category}
                    </span>
                  )}
                </span>
              );
            },
          },
          {
            key: "availability",
            header: <span title="Beschikbaar">Besch.</span>,
            secondary: true,
            cell: (rider) => <AvailabilityMark value={rider.availability} />,
          },
          // ZRL: zFTP en zMAP zijn leidend. Zonder WTRL-gegevens (bijvoorbeeld
          // een ladderteam) blijven de vermogens uit de sync staan.
          ...(hasWtrl
            ? [
                {
                  key: "zftp",
                  header: "zFTP",
                  align: "right" as const,
                  cell: (rider: PlannerRider) =>
                    rider.wtrl ? (
                      <span>
                        {zftpText(rider.wtrl, unit)}
                        <span className="block text-xs">
                          <StatusNote wtrl={rider.wtrl} metric="zftp" />
                        </span>
                      </span>
                    ) : (
                      "-"
                    ),
                },
                {
                  key: "zmap",
                  header: "zMAP",
                  align: "right" as const,
                  cell: (rider: PlannerRider) =>
                    rider.wtrl ? (
                      <span>
                        {zmapText(rider.wtrl, unit)}
                        <span className="block text-xs">
                          <StatusNote wtrl={rider.wtrl} metric="zmap" />
                        </span>
                      </span>
                    ) : (
                      "-"
                    ),
                },
              ]
            : [
                { key: "w5m", header: "5m", align: "right" as const, cell: (rider: PlannerRider) => power(rider.watts5m, rider.wkg5m) },
                { key: "w20m", header: "20m", align: "right" as const, cell: (rider: PlannerRider) => power(rider.watts20m, rider.wkg20m) },
                {
                  key: "ftp",
                  header: "FTP",
                  align: "right" as const,
                  cell: (rider: PlannerRider) => power(rider.ftpWatts, rider.ftpWkg),
                },
              ]),
          {
            key: "zrl",
            header: "ZRL",
            align: "right",
            cell: (rider) =>
              `${rider.zrlStarts} · best ${rider.bestPosition ? `#${rider.bestPosition}` : "-"}`,
          },
          {
            key: "add",
            header: <span className="sr-only">Toevoegen</span>,
            align: "right",
            cell: (rider) => (
              <Button
                type="button"
                size="icon-xs"
                variant={isSelected(rider) ? "secondary" : "outline"}
                disabled={pending || isSelected(rider)}
                onClick={() => add(rider)}
                aria-label={`${rider.name} toevoegen`}
              >
                <Plus />
              </Button>
            ),
          },
        ]}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const AVAILABILITY: Record<
  NonNullable<PlannerRider["availability"]>,
  { mark: string; label: string; className: string }
> = {
  available: { mark: "✓", label: "Beschikbaar", className: "text-emerald-600 dark:text-emerald-400" },
  maybe: { mark: "?", label: "Misschien", className: "text-amber-600 dark:text-amber-400" },
  unavailable: { mark: "✗", label: "Niet beschikbaar", className: "text-destructive" },
};

function AvailabilityMark({ value }: { value: PlannerRider["availability"] }) {
  if (!value) {
    return (
      <span className="text-muted-foreground" title="Niet opgegeven" aria-label="Niet opgegeven">
        -
      </span>
    );
  }
  const item = AVAILABILITY[value];
  return (
    <span className={`font-semibold ${item.className}`} title={item.label} aria-label={item.label}>
      {item.mark}
    </span>
  );
}
