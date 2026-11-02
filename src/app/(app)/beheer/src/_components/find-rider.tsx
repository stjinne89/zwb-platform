"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { linkSrcRider, searchSrcRaceRiders, type SrcFoundRider } from "../_actions";

const FIELD =
  "rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Op naam zoeken in de hele uitslag van een gereden race, en de renner koppelen. */
export function FindRider({
  races,
  members,
}: {
  races: Array<{ id: string; label: string }>;
  members: Array<{ id: string; name: string }>;
}) {
  const [raceId, setRaceId] = useState(races[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<SrcFoundRider[] | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [linked, setLinked] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function search(event: React.FormEvent) {
    event.preventDefault();
    if (!raceId || query.trim().length < 2) return;
    setError(null);
    setBusy("search");
    startTransition(async () => {
      const res = await searchSrcRaceRiders(raceId, query);
      setBusy(null);
      if (!res.ok) {
        setFound(null);
        setError(res.error);
        return;
      }
      setFound(res.riders);
    });
  }

  function link(rider: SrcFoundRider) {
    const profileId = choice[rider.userId];
    if (!profileId) return;
    setError(null);
    setBusy(rider.userId);
    startTransition(async () => {
      const res = await linkSrcRider(rider.userId, profileId);
      setBusy(null);
      if (!res.ok) {
        setError(`${rider.name}: ${res.error}`);
        return;
      }
      setLinked(new Set(linked).add(rider.userId));
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex flex-wrap gap-2">
        <select
          aria-label="Race"
          value={raceId}
          onChange={(e) => {
            setRaceId(e.target.value);
            setFound(null);
          }}
          className={FIELD}
        >
          {races.map((race) => (
            <option key={race.id} value={race.id}>
              {race.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          aria-label="Naam"
          placeholder="Naam"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${FIELD} min-w-0 flex-1`}
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={busy !== null || query.trim().length < 2}
        >
          {busy === "search" ? "Zoeken…" : "Zoeken"}
        </Button>
      </form>

      {found && found.length === 0 && (
        <p className="text-sm text-muted-foreground">Niemand gevonden.</p>
      )}
      {found && found.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {found.map((rider) => (
            <li key={rider.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{rider.name}</p>
                <p className="text-muted-foreground">
                  {[
                    rider.teamName ?? "Individual",
                    rider.category !== null ? `cat ${rider.category}` : null,
                    rider.time,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {linked.has(rider.userId) ? (
                <span className="text-emerald-700 dark:text-emerald-300">Gekoppeld</span>
              ) : (
                <>
                  <select
                    aria-label={`Lid voor ${rider.name}`}
                    value={choice[rider.userId] ?? ""}
                    onChange={(e) => setChoice({ ...choice, [rider.userId]: e.target.value })}
                    className={FIELD}
                  >
                    <option value="">Lid kiezen…</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy !== null || !choice[rider.userId]}
                    onClick={() => link(rider)}
                  >
                    {busy === rider.userId ? "Koppelen…" : "Koppelen"}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
