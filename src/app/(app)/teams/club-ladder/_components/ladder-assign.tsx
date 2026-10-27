"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { MemberLink } from "@/components/member-link";
import { Button } from "@/components/ui/button";
import { assignLadderRider, unassignLadderRider } from "../_actions";

export type AssignTeam = {
  id: string;
  name: string;
  archived: boolean;
  riders: Array<{ id: string; name: string }>;
};

type AssignState = {
  targetTeamId: string;
  setTargetTeamId: (id: string) => void;
  pending: boolean;
  error: string | null;
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => void;
};

const AssignContext = createContext<AssignState | null>(null);

/** Zelfde opzet als de captain-selectie bij ZRL: kies een team, tik op plus. */
export function LadderAssignProvider({
  initialTeamId,
  children,
}: {
  initialTeamId: string;
  children: ReactNode;
}) {
  const [targetTeamId, setTargetTeamId] = useState(initialTeamId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Mislukt.");
    });
  }

  return (
    <AssignContext.Provider value={{ targetTeamId, setTargetTeamId, pending, error, run }}>
      {children}
    </AssignContext.Provider>
  );
}

function useAssign() {
  const state = useContext(AssignContext);
  if (!state) throw new Error("LadderAssignProvider ontbreekt.");
  return state;
}

export function LadderTeamPicker({ teams }: { teams: AssignTeam[] }) {
  const { targetTeamId, setTargetTeamId, pending, error, run } = useAssign();

  return (
    <div className="space-y-3 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Captain-selectie</h3>
        <select
          value={targetTeamId}
          onChange={(event) => setTargetTeamId(event.target.value)}
          aria-label="Ladderteam"
          className="min-h-11 rounded-md border bg-card px-2 py-1 text-sm sm:min-h-0"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
              {team.archived ? " (archief)" : ""}
            </option>
          ))}
        </select>
      </div>

      <ul className="space-y-2">
        {teams.map((team) => (
          <li key={team.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">
              {team.name} ({team.riders.length})
            </span>
            {team.riders.map((rider) => (
              <span
                key={rider.id}
                className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-1 text-xs"
              >
                <MemberLink id={rider.id}>{rider.name}</MemberLink>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => unassignLadderRider(team.id, rider.id))}
                  aria-label={`${rider.name} uit ${team.name} halen`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function LadderAssignButton({
  riderId,
  riderName,
  teamIds,
}: {
  riderId: string;
  riderName: string;
  teamIds: string[];
}) {
  const { targetTeamId, pending, run } = useAssign();
  const inTeam = teamIds.includes(targetTeamId);

  return (
    <Button
      type="button"
      size="icon-xs"
      variant={inTeam ? "secondary" : "outline"}
      disabled={pending || inTeam || !targetTeamId}
      onClick={() => run(() => assignLadderRider(targetTeamId, riderId))}
      aria-label={`${riderName} toevoegen`}
      className="max-sm:h-11 max-sm:w-auto max-sm:gap-1 max-sm:px-4"
    >
      <Plus />
      <span className="sm:hidden">Toevoegen</span>
    </Button>
  );
}
