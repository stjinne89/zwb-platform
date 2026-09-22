"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { parseWtrlTeams } from "@/lib/teams/wtrl-roster";
import { importWtrlTeams } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export type ZwbTeamOption = { id: string; name: string };

function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function WtrlImportForm({
  teams,
  knownMapping,
}: {
  teams: ZwbTeamOption[];
  knownMapping: Record<string, string | null>;
}) {
  const [text, setText] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const parsed = useMemo(() => parseWtrlTeams(text), [text]);

  // Eerder gekozen koppeling, anders een ZWB-team met dezelfde naam.
  function teamFor(trcRef: string, name: string) {
    if (trcRef in choices) return choices[trcRef];
    if (trcRef in knownMapping) return knownMapping[trcRef] ?? "";
    return teams.find((team) => normalize(team.name) === normalize(name))?.id ?? "";
  }

  function submit() {
    setError(null);
    setResult(null);
    const mapping = Object.fromEntries(
      parsed.map((team) => [team.trcRef, teamFor(team.trcRef, team.name) || null]),
    );
    startTransition(async () => {
      const res = await importWtrlTeams({ text, mapping });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(`${res.teams} teams en ${res.riders} renners opgeslagen.`);
      setText("");
      setChoices({});
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        placeholder="Plak hier de teams van WTRL My Teams"
        aria-label="Tekst van WTRL My Teams"
        className={FIELD}
      />

      {parsed.length > 0 && (
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {parsed.map((team) => (
            <li key={team.trcRef} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{team.name}</p>
                <p className="text-muted-foreground">
                  {team.division ?? "Divisie onbekend"} · {team.riders.length} renners
                </p>
              </div>
              <select
                className={`${FIELD} sm:w-56`}
                value={teamFor(team.trcRef, team.name)}
                aria-label={`ZWB-team voor ${team.name}`}
                onChange={(event) =>
                  setChoices((prev) => ({ ...prev, [team.trcRef]: event.target.value }))
                }
              >
                <option value="">Niet koppelen</option>
                {teams.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <p className="text-sm text-muted-foreground">{result}</p>}

      <Button type="button" size="sm" disabled={pending || parsed.length === 0} onClick={submit}>
        {pending ? "Opslaan…" : "Opslaan"}
      </Button>
    </div>
  );
}
