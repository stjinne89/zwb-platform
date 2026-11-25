"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, SectionHeader } from "@/components/app-ui";
import { MemberLink } from "@/components/member-link";
import type { LadderLiveOutcome, LadderLiveView } from "@/lib/club-ladder/live-load";
import type { LadderLiveCheckpoint, LadderLivePlace, LadderLiveScore } from "@/lib/club-ladder/live";
import { cn } from "@/lib/utils";

/** Zoals de live ZRL-stand: de Zwift-kant is 15 s gecachet. */
const REFRESH_MS = 15_000;
const WAITING_REFRESH_MS = 60_000;

const clock = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
const clockSeconds = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/Amsterdam",
});

/** Racetijd van de eerste: "5:04", "1:02:10". */
function raceTime(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** Achterstand: "+0,4", "+12", "+1:02". */
function gap(ms: number | null) {
  if (!ms) return "";
  if (ms < 10_000) return `+${(ms / 1000).toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `+${seconds}` : `+${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function ScoreLine({ view, score, size = "large" }: { view: LadderLiveView; score: LadderLiveScore; size?: "large" | "small" }) {
  const side = (own: boolean) =>
    cn(score.win === own && "text-primary", score.win === !own && "text-muted-foreground");
  if (size === "small") {
    return (
      <span className="tabular-nums">
        <span className={side(true)}>{score.ours}</span>–<span className={side(false)}>{score.theirs}</span>
      </span>
    );
  }
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border bg-card p-4">
      <div className={cn("min-w-0 truncate text-sm font-semibold sm:text-base", side(true))}>{view.ours}</div>
      <div className="text-3xl font-bold tabular-nums sm:text-4xl">
        <span className={side(true)}>{score.ours}</span>
        <span className="px-2 text-muted-foreground">–</span>
        <span className={side(false)}>{score.theirs}</span>
      </div>
      <div className={cn("min-w-0 truncate text-right text-sm font-semibold sm:text-base", side(false))}>{view.theirs}</div>
    </div>
  );
}

function PlaceRows({ view, places, finish }: { view: LadderLiveView; places: LadderLivePlace[]; finish: boolean }) {
  return (
    <ol className="divide-y">
      {places.map((rider) => (
        <li
          key={rider.zwiftId}
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm",
            // Een streep in plaats van een rand: de tegels maken randen van rijen leeg.
            rider.own && "bg-primary/10 shadow-[inset_4px_0_0_var(--color-primary)]",
            // Nog niet langs dit punt: staat op zijn vorige plek.
            rider.gapMs === null && "text-muted-foreground",
          )}
        >
          <span className="w-6 tabular-nums text-muted-foreground">{rider.place ?? "–"}</span>
          <span className="min-w-0 flex-1 truncate">
            <MemberLink id={rider.own ? view.profiles[String(rider.zwiftId)] : null} className={cn(rider.own && "font-semibold")}>
              {rider.name}
            </MemberLink>
          </span>
          <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
            {rider.gapMs === null && rider.place !== null ? (finish ? (view.live.final ? "DNF" : "rijdt") : "…") : gap(rider.gapMs)}
          </span>
          <span className="w-8 text-right font-semibold tabular-nums">{rider.place === null ? "" : rider.points}</span>
        </li>
      ))}
    </ol>
  );
}

function statusLine(view: LadderLiveView): string {
  const { live } = view;
  const current = live.current;
  const parts: string[] = [];
  if (live.final) parts.push("Uitslag volgens Zwift");
  else if (view.fetchedAt < view.event.startAt) parts.push(`Start ${clock.format(view.event.startAt)}`);
  else parts.push("Live");
  if (current && !live.final) parts.push(current.kind === "finish" ? `${live.finished} van ${live.starters} binnen` : `na ${current.name}`);
  parts.push(`bijgewerkt ${clockSeconds.format(view.fetchedAt)}`);
  return parts.join(" · ");
}

function Earlier({ view, checkpoints }: { view: LadderLiveView; checkpoints: LadderLiveCheckpoint[] }) {
  if (checkpoints.length === 0) return null;
  return (
    <section>
      <SectionHeader title="Tussenstanden" />
      <ul className="space-y-2">
        {checkpoints.map((checkpoint) => (
          <li key={checkpoint.index}>
            <details className="rounded-lg border bg-card">
              <summary className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{checkpoint.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{raceTime(checkpoint.leaderMs)}</span>
                <span className="w-14 text-right font-semibold">
                  <ScoreLine view={view} score={checkpoint.score} size="small" />
                </span>
              </summary>
              <div className="border-t">
                <PlaceRows view={view} places={checkpoint.places} finish={false} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Voor de eerste doorkomst: wie er bij Zwift staat ingeschreven, per ploeg. */
function StartList({ view }: { view: LadderLiveView }) {
  const sides = [
    { name: view.ours, riders: view.riders.filter((r) => r.own) },
    { name: view.theirs, riders: view.riders.filter((r) => !r.own) },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sides.map((side) => (
        <section key={side.name} className="rounded-lg border bg-card">
          <h2 className="flex items-center justify-between border-b px-3 py-2 text-sm font-semibold">
            <span className="truncate">{side.name}</span>
            <span className="text-xs font-normal tabular-nums text-muted-foreground">{side.riders.length}</span>
          </h2>
          <ul className="divide-y">
            {side.riders.map((rider) => (
              <li key={rider.zwiftId} className="truncate px-3 py-2 text-sm">
                <MemberLink id={rider.own ? view.profiles[String(rider.zwiftId)] : null}>{rider.name}</MemberLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function LiveView({ view }: { view: LadderLiveView }) {
  const { live } = view;
  const current = live.current;
  const earlier = live.checkpoints.slice(0, -1).reverse();
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{statusLine(view)}</p>
      {current ? (
        <>
          <ScoreLine view={view} score={current.score} />
          <section>
            <SectionHeader
              title={current.kind === "finish" ? "Finish" : current.name}
              action={<span className="text-xs tabular-nums text-muted-foreground">{raceTime(current.leaderMs)}</span>}
            />
            <div className="rounded-lg border bg-card">
              <PlaceRows view={view} places={current.places} finish={current.kind === "finish"} />
            </div>
          </section>
          <Earlier view={view} checkpoints={earlier} />
        </>
      ) : (
        <>
          <EmptyState>{view.noRoute ? "Op deze route alleen de finish." : "Nog geen doorkomst."}</EmptyState>
          <StartList view={view} />
        </>
      )}
      {view.incomplete && <p className="text-xs text-muted-foreground">Zwift gaf niet alles door; de stand kan achterlopen.</p>}
    </div>
  );
}

export function LadderLiveBoard({ eventId, initial }: { eventId: string; initial: LadderLiveOutcome }) {
  const [outcome, setOutcome] = useState(initial);
  const done = outcome.status === "over" || (outcome.status === "ok" && outcome.view.live.final);

  useEffect(() => {
    if (done) return;
    const every = outcome.status === "waiting" ? WAITING_REFRESH_MS : REFRESH_MS;
    const id = setInterval(async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/live`, { cache: "no-store" });
        if (!response.ok) return;
        setOutcome((await response.json()) as LadderLiveOutcome);
      } catch {
        // Even geen verbinding: de vorige stand blijft staan.
      }
    }, every);
    return () => clearInterval(id);
  }, [eventId, done, outcome.status]);

  if (outcome.status === "ok") return <LiveView view={outcome.view} />;
  if (outcome.status === "waiting") {
    return <EmptyState>Live vanaf {clock.format(outcome.liveFrom)}.</EmptyState>;
  }
  if (outcome.status === "over") {
    return (
      <EmptyState action={<Link href={`/events/${eventId}#uitslag`} className="text-sm underline">Uitslag</Link>}>
        De race is voorbij.
      </EmptyState>
    );
  }
  if (outcome.status === "no-zwift-event") return <EmptyState>Deze race heeft geen Zwift-event.</EmptyState>;
  return <EmptyState>Zwift is nu niet bereikbaar.</EmptyState>;
}
