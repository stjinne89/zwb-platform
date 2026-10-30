"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addToLadderPool } from "../_actions";

const FIELD =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:min-h-0";

/** Een lid in de ladderlijst zetten, ook als hij zelf geen Ladder aanvinkte. */
export function LadderPoolAdd({ members }: { members: Array<{ id: string; name: string }> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAdd(fd: FormData) {
    const profileId = String(fd.get("profile_id") ?? "");
    if (!profileId) return setError("Kies een lid.");
    setError(null);
    startTransition(async () => {
      const res = await addToLadderPool(profileId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Lid aan de puzzel toevoegen</h2>
      <form action={onAdd} className="grid gap-2 sm:grid-cols-[1fr_auto]">
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
        <Button type="submit" disabled={pending} className="max-sm:h-11">
          Toevoegen
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
