"use client";

// Zwift-events die bij deze geplande training passen, met hoe goed ze passen.
//
// Beeldtaal van AdaptationProposal: een lampje, een primary-tint en twee
// knoppen. Inhoudelijk staat er alleen wat feitelijk is -- score, tijd, duur,
// route, wie er meerijdt -- en één regel over wat er níét klopt. De uitleg
// (waar de events vandaan komen, waarom een group workout vaak lager scoort)
// staat op /hulp, niet hier: dit is een schermdeel, geen handleiding.

import { useState, useTransition } from "react";
import { ExternalLink, Lightbulb } from "lucide-react";
import Link from "next/link";
import { chooseZwiftEvent, clearZwiftEvent, dismissZwiftSuggestions } from "../_actions";

/**
 * Bewust een eigen, smalle vorm en niet ZwiftEventMatch zelf: die draagt het
 * hele event mee, inclusief omschrijving en subgroepen, en dat gaat hier als
 * payload naar de browser. De kalender toont er vier regels van.
 */
export type ZwiftSuggestionView = {
  eventId: number;
  name: string;
  startAt: string;
  externalUrl: string;
  scorePct: number;
  estimatedMinutes: number | null;
  subgroupLabel: string | null;
  routeName: string | null;
  zwbSignups: number;
  /** Waarom het past. */
  strongest: string | null;
  /** Wat eraan schort; null als er niets noemenswaardigs is. */
  weakest: string | null;
};

export type ChosenZwiftEvent = {
  eventId: number;
  name: string;
  startAt: string;
  externalUrl: string;
};

function startTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Amsterdam",
  });
}

function duration(minutes: number | null) {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}u${`${rest}`.padStart(2, "0")}` : `${rest} min`;
}

type WorkoutAction = (formData: FormData) => Promise<{ ok: boolean; error?: string }>;

/**
 * Een knop die een serveractie draait en een fout laat zien in plaats van hem te
 * slikken. Kiezen kan echt mislukken -- de training kan intussen vervangen zijn
 * of niet meer gepland staan -- en dan is een knop die niets doet het
 * verwarrendste antwoord dat je kunt geven. Zelfde vorm als RemoveWorkoutButton.
 */
function ActionButton({
  action,
  workoutId,
  eventId,
  variant = "border",
  children,
}: {
  action: WorkoutAction;
  workoutId: string;
  eventId?: number;
  variant?: "primary" | "border";
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("workout_id", workoutId);
      if (eventId !== undefined) formData.set("event_id", String(eventId));
      const outcome = await action(formData);
      if (!outcome.ok) setError(outcome.error ?? "Er ging iets mis.");
    });
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={
          variant === "primary"
            ? "rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            : "rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
        }
      >
        {children}
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}

/** Groen vanaf een goede match, amber daaronder -- geen eigen kleurentaal erbij. */
function scoreTone(scorePct: number) {
  if (scorePct >= 80) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (scorePct >= 68) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

function MatchRow({ match, workoutId }: { match: ZwiftSuggestionView; workoutId: string }) {
  const facts = [
    startTime(match.startAt),
    duration(match.estimatedMinutes),
    match.subgroupLabel ? `Groep ${match.subgroupLabel}` : null,
    match.routeName,
  ].filter(Boolean);

  const zwb = match.zwbSignups;

  return (
    <li className="rounded-md border bg-background p-3">
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${scoreTone(match.scorePct)}`}
        >
          {match.scorePct}%
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{match.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{facts.join(" · ")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {match.strongest}
            {zwb > 0 ? ` · ${zwb} ZWB'er${zwb === 1 ? " rijdt" : "s rijden"} mee` : ""}
          </p>
          {match.weakest ? (
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{match.weakest}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <ActionButton
              action={chooseZwiftEvent}
              workoutId={workoutId}
              eventId={match.eventId}
              variant="primary"
            >
              Kies dit event
            </ActionButton>
            <a
              href={match.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <ExternalLink className="size-3" />
              Op Zwift
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}

export function ZwiftEventSuggestions({
  workoutId,
  matches,
  chosen,
}: {
  workoutId: string;
  matches: ZwiftSuggestionView[];
  chosen?: ChosenZwiftEvent | null;
}) {
  if (chosen) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="size-4 shrink-0 text-primary" />
          Je rijdt dit op Zwift
        </p>
        <p className="mt-1 text-sm">{chosen.name}</p>
        <p className="text-xs text-muted-foreground">Start om {startTime(chosen.startAt)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={chosen.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <ExternalLink className="size-3" />
            Op Zwift
          </a>
          <ActionButton action={clearZwiftEvent} workoutId={workoutId}>
            Andere kiezen
          </ActionButton>
        </div>
      </div>
    );
  }

  if (matches.length === 0) return null;

  return (
    <div className="rounded-md border bg-primary/5 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="size-4 shrink-0 text-primary" />
          Op Zwift
          <Link
            href="/hulp#zwift-voorstellen"
            title="Hulp bij Zwift-voorstellen"
            aria-label="Hulp bij Zwift-voorstellen"
            className="text-xs font-normal text-muted-foreground underline hover:text-foreground"
          >
            uitleg
          </Link>
        </p>
        <ActionButton action={dismissZwiftSuggestions} workoutId={workoutId}>
          Negeren
        </ActionButton>
      </div>
      <ul className="mt-2 space-y-2">
        {matches.map((match) => (
          <MatchRow key={match.eventId} match={match} workoutId={workoutId} />
        ))}
      </ul>
    </div>
  );
}
