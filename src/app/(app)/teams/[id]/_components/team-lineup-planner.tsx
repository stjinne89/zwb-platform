"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { riderTypeLabel } from "@/lib/teams/power-profile";
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
  ftpWkg: number | null;
  watts5m: number | null;
  watts20m: number | null;
  zrlStarts: number;
  bestPosition: number | null;
};

export type PlannerLineup = {
  id: string;
  eventId: string;
  teamId: string;
  profileId: string;
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectedIds = new Set(lineups.map((lineup) => lineup.profileId));

  function add(profileId: string) {
    if (!targetTeamId) return;
    setError(null);
    startTransition(async () => {
      const res = await setTeamLineup(parentTeamId, eventId, targetTeamId, profileId);
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
        minWidth={760}
        columns={[
          {
            key: "name",
            header: "Renner",
            primary: true,
            cell: (rider) => (
              <span>
                <span className="font-medium">{rider.name}</span>
                {rider.category && (
                  <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                    {rider.category}
                  </span>
                )}
              </span>
            ),
          },
          {
            key: "profile",
            header: "Profiel",
            secondary: true,
            cell: (rider) =>
              `${riderTypeLabel(rider.riderType)} · ${availabilityLabel(rider.availability)}`,
          },
          {
            key: "availability",
            header: "Beschikbaar",
            hideOnCard: true,
            cell: (rider) => availabilityLabel(rider.availability),
          },
          { key: "w5m", header: "5m", align: "right", cell: (rider) => `${fmt(rider.watts5m)}w` },
          { key: "w20m", header: "20m", align: "right", cell: (rider) => `${fmt(rider.watts20m)}w` },
          {
            key: "ftpwkg",
            header: "FTP/kg",
            align: "right",
            cell: (rider) => fmt(rider.ftpWkg, 2),
          },
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
                variant={selectedIds.has(rider.id) ? "secondary" : "outline"}
                disabled={pending || selectedIds.has(rider.id)}
                onClick={() => add(rider.id)}
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

function availabilityLabel(value: PlannerRider["availability"]) {
  switch (value) {
    case "available":
      return "Ja";
    case "maybe":
      return "Misschien";
    case "unavailable":
      return "Nee";
    default:
      return "-";
  }
}
