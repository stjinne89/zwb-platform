"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-xs">
          <thead>
            <tr className="border-b text-left uppercase tracking-wide text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Renner</th>
              <th className="py-1.5 pr-2 font-medium">Beschikbaar</th>
              <th className="py-1.5 pr-2 font-medium">Profiel</th>
              <th className="py-1.5 pr-2 font-medium">5m</th>
              <th className="py-1.5 pr-2 font-medium">20m</th>
              <th className="py-1.5 pr-2 font-medium">FTP/kg</th>
              <th className="py-1.5 pr-2 font-medium">ZRL</th>
              <th className="py-1.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {riders.map((rider) => (
              <tr key={rider.id} className="border-b last:border-0">
                <td className="py-1.5 pr-2">
                  <span className="font-medium">{rider.name}</span>
                  {rider.category && (
                    <span className="ml-1 rounded-full bg-secondary px-1 py-0.5 text-[10px] text-secondary-foreground">
                      {rider.category}
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-2">{availabilityLabel(rider.availability)}</td>
                <td className="py-1.5 pr-2">{riderTypeLabel(rider.riderType)}</td>
                <td className="py-1.5 pr-2 tabular-nums">{fmt(rider.watts5m)}w</td>
                <td className="py-1.5 pr-2 tabular-nums">{fmt(rider.watts20m)}w</td>
                <td className="py-1.5 pr-2 tabular-nums">{fmt(rider.ftpWkg, 2)}</td>
                <td className="py-1.5 pr-2 tabular-nums">
                  {rider.zrlStarts} · best {rider.bestPosition ? `#${rider.bestPosition}` : "-"}
                </td>
                <td className="py-1.5 text-right">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
