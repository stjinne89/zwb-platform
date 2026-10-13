"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ZRL_2026_27_ROUNDS,
  generateZrlRound,
  isTuesday,
  weeksBetween,
} from "@/lib/teams/zrl-season";
import { importZrlRound } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

export type TeamOption = { id: string; name: string };

export function ImportForm({ teams }: { teams: TeamOption[] }) {
  const [season, setSeason] = useState("2026/27");
  const [round, setRound] = useState(1);
  const [firstRaceDate, setFirstRaceDate] = useState(
    ZRL_2026_27_ROUNDS[0].firstRaceDate,
  );
  const [raceCount, setRaceCount] = useState(6);
  const [timeLocal, setTimeLocal] = useState("20:00");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Voorbeeld op basis van het eerste gekozen team, zodat je de titels ziet
  // zoals ze in de kalender komen.
  const preview = useMemo(() => {
    const teamName = teams.find((t) => t.id === teamIds[0])?.name;
    return generateZrlRound({ season, round, firstRaceDate, raceCount, timeLocal, teamName });
  }, [season, round, firstRaceDate, raceCount, timeLocal, teamIds, teams]);

  function pickRound(next: number) {
    setRound(next);
    const known = ZRL_2026_27_ROUNDS.find((r) => r.round === next);
    if (known) {
      setFirstRaceDate(known.firstRaceDate);
      setRaceCount(weeksBetween(known.firstRaceDate, known.lastRaceDate));
    }
  }

  function toggleTeam(id: string) {
    setTeamIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function submit() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await importZrlRound({
        season,
        round,
        firstRaceDate,
        raceCount,
        timeLocal,
        teamIds,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(
        res.message ??
          `${res.created} races toegevoegd${res.skipped > 0 ? `, ${res.skipped} stonden er al` : ""}.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={LABEL}>Seizoen</label>
          <input value={season} onChange={(e) => setSeason(e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Ronde</label>
          <select
            className={FIELD}
            value={round}
            onChange={(e) => pickRound(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((r) => (
              <option key={r} value={r}>
                Ronde {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Eerste race</label>
          <input
            type="date"
            value={firstRaceDate}
            onChange={(e) => setFirstRaceDate(e.target.value)}
            className={FIELD}
          />
          {firstRaceDate && !isTuesday(firstRaceDate) && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Dat is geen dinsdag. ZRL rijdt normaal op dinsdag.
            </p>
          )}
        </div>
        <div>
          <label className={LABEL}>Aantal races</label>
          <input
            type="number"
            min={1}
            max={12}
            value={raceCount}
            onChange={(e) => setRaceCount(Number(e.target.value))}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Starttijd</label>
          <input
            type="time"
            value={timeLocal}
            onChange={(e) => setTimeLocal(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <p className={LABEL}>Teams</p>
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <Button
              key={team.id}
              type="button"
              size="sm"
              variant={teamIds.includes(team.id) ? "default" : "outline"}
              onClick={() => toggleTeam(team.id)}
            >
              {team.name}
            </Button>
          ))}
        </div>
      </div>

      {preview.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Voorbeeld ({preview.length} races
            {teamIds.length > 1 ? ` × ${teamIds.length} teams` : ""})
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {preview.map((event) => (
              <li key={event.week} className="flex flex-wrap gap-2">
                <span className="tabular-nums text-muted-foreground">
                  {new Date(event.startAtIso).toLocaleString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Amsterdam",
                  })}
                </span>
                <span>{event.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <p className="text-sm text-muted-foreground">{result}</p>}

      <Button
        type="button"
        size="sm"
        disabled={pending || teamIds.length === 0 || preview.length === 0}
        onClick={submit}
      >
        {pending ? "Toevoegen…" : "In de kalender zetten"}
      </Button>
    </div>
  );
}
