"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { MemberLink } from "@/components/member-link";
import { Button } from "@/components/ui/button";
import { clearLadderCaptain, setLadderCaptain } from "../_actions";

const FIELD =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:min-h-0";

export type CaptainTeam = {
  id: string;
  name: string;
  archived: boolean;
  captains: Array<{ id: string; name: string; role: "captain" | "co-captain" }>;
};

export function LadderCaptains({
  teams,
  members,
  initialTeamId,
}: {
  teams: CaptainTeam[];
  members: Array<{ id: string; name: string }>;
  initialTeamId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Mislukt.");
    });
  }

  function onAdd(fd: FormData) {
    const teamId = String(fd.get("team_id") ?? "");
    const profileId = String(fd.get("profile_id") ?? "");
    const role = fd.get("role") === "co-captain" ? "co-captain" : "captain";
    if (!teamId || !profileId) return setError("Kies een team en een lid.");
    run(() => setLadderCaptain(teamId, profileId, role));
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Captains</h2>
      <form action={onAdd} className="grid gap-2 sm:grid-cols-[1fr_1fr_10rem_auto]">
        <select name="team_id" defaultValue={initialTeamId} aria-label="Ladderteam" className={FIELD}>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
              {team.archived ? " (archief)" : ""}
            </option>
          ))}
        </select>
        <select name="profile_id" defaultValue="" aria-label="Lid" className={FIELD}>
          <option value="" disabled>
            Kies een lid…
          </option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <select name="role" defaultValue="captain" aria-label="Rol" className={FIELD}>
          <option value="captain">Captain</option>
          <option value="co-captain">Co-captain</option>
        </select>
        <Button type="submit" disabled={pending} className="max-sm:h-11">
          Toevoegen
        </Button>
      </form>

      <ul className="space-y-2">
        {teams.map((team) => (
          <li key={team.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{team.name}</span>
            {team.captains.length === 0 ? (
              <span className="text-muted-foreground">-</span>
            ) : (
              team.captains.map((captain) => (
                <span
                  key={captain.id}
                  className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs"
                >
                  <MemberLink id={captain.id}>{captain.name}</MemberLink>
                  <span className="text-muted-foreground">
                    {captain.role === "captain" ? "captain" : "co-captain"}
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => clearLadderCaptain(team.id, captain.id))}
                    aria-label={`${captain.name} geen captain meer van ${team.name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
