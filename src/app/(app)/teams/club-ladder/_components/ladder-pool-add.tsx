"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addLadderRider } from "../_actions";

const FIELD =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:min-h-0";

type Option = { id: string; name: string };

/**
 * Een lid of een rosternaam zonder account in de ladder zetten. Met `teamId`
 * meteen in dat team; met `teams` is het team te kiezen (leeg = losse stukjes).
 */
export function LadderPoolAdd({
  title,
  members,
  roster,
  teamId = null,
  teams = [],
}: {
  title: string;
  members: Option[];
  roster: Option[];
  teamId?: string | null;
  teams?: Option[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  function onAdd(fd: FormData) {
    const [kind, id] = String(fd.get("rider") ?? "").split(":");
    if ((kind !== "p" && kind !== "r") || !id) return setError("Kies een renner.");
    const target = teamId ?? (String(fd.get("team_id") ?? "") || null);
    setError(null);
    startTransition(async () => {
      const res = await addLadderRider({ kind: kind === "p" ? "profile" : "roster", id }, target);
      if (!res.ok) setError(res.error ?? "Mislukt.");
      else setFormKey((key) => key + 1);
    });
  }

  const pickTeam = !teamId && teams.length > 0;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">{title}</h2>
      <form
        key={formKey}
        action={onAdd}
        className={pickTeam ? "grid gap-2 sm:grid-cols-[1fr_1fr_auto]" : "grid gap-2 sm:grid-cols-[1fr_auto]"}
      >
        <select name="rider" defaultValue="" aria-label="Renner" className={FIELD}>
          <option value="" disabled>
            Kies een renner…
          </option>
          {members.length > 0 && (
            <optgroup label="Leden">
              {members.map((member) => (
                <option key={member.id} value={`p:${member.id}`}>
                  {member.name}
                </option>
              ))}
            </optgroup>
          )}
          {roster.length > 0 && (
            <optgroup label="Rosternamen zonder account">
              {roster.map((entry) => (
                <option key={entry.id} value={`r:${entry.id}`}>
                  {entry.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {pickTeam && (
          <select name="team_id" defaultValue="" aria-label="Team" className={FIELD}>
            <option value="">Losse stukjes</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" disabled={pending} className="max-sm:h-11">
          Toevoegen
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
