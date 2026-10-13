"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ZRL_2026_27_ROUNDS } from "@/lib/teams/zrl-season";
import { saveRacepasses } from "../_actions";
import type { TeamOption } from "./import-form";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Bestaande passes, per ronde per team. */
export type RacepassMap = Record<number, Record<string, string>>;

export function RacepassForm({
  teams,
  current,
  defaultRound,
}: {
  teams: TeamOption[];
  current: RacepassMap;
  defaultRound: number;
}) {
  const [round, setRound] = useState(defaultRound);
  const [urls, setUrls] = useState<Record<string, string>>(current[defaultRound] ?? {});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function pickRound(next: number) {
    setRound(next);
    setUrls(current[next] ?? {});
    setMessage(null);
  }

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveRacepasses({
        round,
        passes: teams.map((team) => ({ teamId: team.id, url: urls[team.id] ?? "" })),
      });
      setMessage(result.ok ? "Opgeslagen." : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <select
        value={round}
        onChange={(e) => pickRound(Number(e.target.value))}
        aria-label="Ronde"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {ZRL_2026_27_ROUNDS.map((r) => (
          <option key={r.round} value={r.round}>
            Ronde {r.round}
          </option>
        ))}
      </select>
      <ul className="space-y-2">
        {teams.map((team) => (
          <li key={team.id} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center">
            <label htmlFor={`racepass-${team.id}`} className="text-sm font-medium">
              {team.name}
            </label>
            <input
              id={`racepass-${team.id}`}
              type="url"
              value={urls[team.id] ?? ""}
              onChange={(e) => setUrls((prev) => ({ ...prev, [team.id]: e.target.value }))}
              placeholder="https://www.wtrl.racing/RacePass/…"
              className={FIELD}
            />
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Bezig…" : "Racepasses opslaan"}
        </Button>
        {message && <span className="text-sm text-muted-foreground">{message}</span>}
      </div>
    </div>
  );
}
