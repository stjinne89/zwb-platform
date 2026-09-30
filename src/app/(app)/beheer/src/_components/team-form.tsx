"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveSrcTeam } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

export function SrcTeamForm({
  initial,
}: {
  initial?: { id: string; name: string; mywhooshTeamName: string | null };
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [teamName, setTeamName] = useState(initial?.mywhooshTeamName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const key = initial?.id ?? "nieuw";

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveSrcTeam({ id: initial?.id, name, mywhooshTeamName: teamName });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (!initial) {
        setName("");
        setTeamName("");
      }
      router.refresh();
    });
  }

  return (
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <div>
        <label className={LABEL} htmlFor={`src-team-name-${key}`}>
          Naam
        </label>
        <input
          id={`src-team-name-${key}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ZWB SRC"
          className={FIELD}
        />
      </div>
      <div>
        <label className={LABEL} htmlFor={`src-team-mw-${key}`}>
          Teamnaam bij MyWhoosh
        </label>
        <input
          id={`src-team-mw-${key}`}
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className={FIELD}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={submit} disabled={pending}>
          {pending ? "Bezig…" : initial ? "Opslaan" : "Team toevoegen"}
        </Button>
        {saved && !error && <span className="text-sm text-muted-foreground">Opgeslagen.</span>}
      </div>
      {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
    </div>
  );
}
