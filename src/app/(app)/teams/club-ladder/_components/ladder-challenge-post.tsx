"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowUpRight, Check, Copy, Megaphone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { buildChallengePost, challengeContact, type ChallengeOpponent } from "@/lib/club-ladder/challenge-post";
import { cn } from "@/lib/utils";
import { loadChallengeCaptains } from "../_actions";

const FIELD =
  "min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:min-h-0";

export type ChallengeCandidate = {
  name: string;
  ladderTeamId: number | null;
  position: number;
  /** Er staat al een wedstrijd tegen deze ploeg. */
  planned: boolean;
};

export function LadderChallengePost({
  teamName,
  candidates,
  channelUrl,
}: {
  /** Naam van ons team op de ladder. */
  teamName: string;
  candidates: ChallengeCandidate[];
  channelUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [opponents, setOpponents] = useState<ChallengeOpponent[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(candidates.filter((c) => !c.planned).map((c) => c.name)),
  );
  const [dates, setDates] = useState<string[]>(["", ""]);
  const [time, setTime] = useState("20:00");
  const [copied, setCopied] = useState<"title" | "body" | null>(null);

  function open() {
    setError(null);
    startTransition(async () => {
      const res = await loadChallengeCaptains(
        candidates.map(({ name, ladderTeamId, position }) => ({ name, ladderTeamId, position })),
      );
      if (res.ok) setOpponents(res.opponents);
      else setError(res.error);
    });
  }

  const post = useMemo(
    () =>
      buildChallengePost({
        teamName,
        dates,
        time,
        opponents: (opponents ?? []).filter((o) => chosen.has(o.name)),
      }),
    [teamName, dates, time, opponents, chosen],
  );
  const ready = dates.some(Boolean) && chosen.size > 0;

  async function copy(kind: "title" | "body") {
    try {
      await navigator.clipboard.writeText(kind === "title" ? post.title : post.body);
      setCopied(kind);
      setTimeout(() => setCopied((current) => (current === kind ? null : current)), 2000);
    } catch {
      setError("Kopiëren mislukt.");
    }
  }

  function toggle(name: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (!opponents) {
    return (
      <div className="space-y-1">
        <Button type="button" variant="outline" size="sm" onClick={open} disabled={pending}>
          <Megaphone className="size-4" />
          {pending ? "Captains ophalen…" : "Uitdaging klaarzetten"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-end gap-2">
        {dates.map((date, index) => (
          <input
            key={index}
            type="date"
            value={date}
            onChange={(event) => setDates((current) => current.map((d, i) => (i === index ? event.target.value : d)))}
            aria-label={`Dag ${index + 1}`}
            className={FIELD}
          />
        ))}
        {dates.length < 4 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setDates((current) => [...current, ""])}>
            + dag
          </Button>
        )}
        <input
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          aria-label="Tijd"
          className={FIELD}
        />
      </div>

      <ul className="space-y-1 text-sm">
        {opponents.map((opponent) => {
          const contact = challengeContact(opponent.captains);
          const planned = candidates.find((c) => c.name === opponent.name)?.planned ?? false;
          return (
            <li key={opponent.name}>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 sm:min-h-0">
                <input
                  type="checkbox"
                  checked={chosen.has(opponent.name)}
                  onChange={() => toggle(opponent.name)}
                  className="size-4"
                />
                <span className="w-6 text-right tabular-nums text-muted-foreground">{opponent.position}</span>
                <span className="font-medium">{opponent.name}</span>
                {planned && <span className="text-xs text-muted-foreground">gepland</span>}
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {contact ? (contact.discordName ? `@${contact.discordName}` : contact.name) : "geen captain"}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">{post.title}</p>
        <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 font-sans text-sm">{post.body}</pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={!ready} onClick={() => copy("title")}>
          {copied === "title" ? <Check className="size-4" /> : <Copy className="size-4" />}
          Kopieer titel
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!ready} onClick={() => copy("body")}>
          {copied === "body" ? <Check className="size-4" /> : <Copy className="size-4" />}
          Kopieer tekst
        </Button>
        <a
          href={channelUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "sm" }), !ready && "pointer-events-none opacity-50")}
          aria-disabled={!ready}
        >
          Open Discord <ArrowUpRight className="size-4" />
        </a>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
