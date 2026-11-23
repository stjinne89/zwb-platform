// De dagkaart bovenaan ZWBeter Vandaag: wat je vandaag doet, of waarom er niets
// meer hoeft. De dagstaat (vandaagDay) bepaalt welke vorm hij heeft.

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { InlineMoreLink } from "@/components/app-ui";
import { ClubShortName, ClubText } from "@/components/club-texts-provider";
import { buttonVariants } from "@/components/ui/button";
import type { IntervalsEvent } from "@/lib/intervals/client";
import { shiftDays } from "@/lib/training/season";
import type { suggestSegmentsForBlock } from "@/lib/training/segment-suggestions";
import type { VandaagState } from "@/lib/training/vandaag-day";
import {
  normalizeWorkoutBlocks,
  plannedWorkoutIntensity,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import type { ZwbAdvice } from "@/lib/training/zwbeterworden";
import { cn } from "@/lib/utils";
import { AdjustTodayForm } from "./adjust-today-form";
import { formatDayMonth, formatSegmentTime, publishStatusLabel } from "./format";
import { OutdoorRouteSuggestions } from "./outdoor-route-suggestions";
import { PlanCautions } from "./plan-cautions";
import { RaceWarmupControl } from "./race-warmup-control";
import type { WorkoutRow } from "./types";
import { WorkoutBlocks, WorkoutTitle, eventWorkoutBlocks } from "./workout-blocks";
import { ZwiftEventSuggestions } from "./zwift-event-suggestions";

export type TodayUpcoming =
  | { kind: "zwb"; workout: WorkoutRow }
  | { kind: "intervals"; event: IntervalsEvent };

export type TodayHub = {
  workoutId: string;
  zwiftMatches: ComponentProps<typeof ZwiftEventSuggestions>["matches"];
  zwiftChosen: ComponentProps<typeof ZwiftEventSuggestions>["chosen"];
  routes: ComponentProps<typeof OutdoorRouteSuggestions>["routes"];
  startPoints: ComponentProps<typeof OutdoorRouteSuggestions>["startPoints"];
  /** Bij een race is een buitenrondje niet aan de orde. */
  outdoor: boolean;
};

const HEADINGS: Record<VandaagState, string> = {
  training: "Training van vandaag",
  race: "Race van vandaag",
  gereden: "Gereden",
  rust: "Rustdag",
  later: "Volgende training",
  leeg: "Geen training gepland",
};

function dayLabel(value: string, today: string) {
  const day = String(value).slice(0, 10);
  if (day === today) return "Vandaag";
  if (day === shiftDays(today, 1)) return "Morgen";
  return formatDayMonth(value);
}

function Disclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group mt-3 border-t pt-1" open={defaultOpen}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="pb-2">{children}</div>
    </details>
  );
}

function Advice({ advice }: { advice: ZwbAdvice }) {
  // Niveau 1 en 2 vragen om iets anders dan het schema: die staan boven de training.
  if (advice.level <= 2) {
    return (
      <div className={`mb-4 rounded-md p-3 ${advice.block}`}>
        <p className="text-sm font-semibold">{advice.title}</p>
        <p className="mt-1 text-sm">
          <ClubText text={advice.description} />
        </p>
      </div>
    );
  }
  return (
    <p className="mt-3 text-sm">
      <span className="font-medium">{advice.title}.</span>{" "}
      <span className="text-muted-foreground">
        <ClubText text={advice.description} />
      </span>
    </p>
  );
}

function NextRow({ upcoming, today }: { upcoming: TodayUpcoming; today: string }) {
  const title =
    upcoming.kind === "zwb" ? upcoming.workout.title : (upcoming.event.name ?? "Workout");
  const when = upcoming.kind === "zwb" ? upcoming.workout.scheduled_at : upcoming.event.start_date_local;
  return (
    <Link
      href="/zwbeter-worden/schema"
      className="tg-link tg-zwbeter mt-4 flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
    >
      <span className="min-w-0 truncate">
        Volgende: <span className="font-medium">{title}</span>
      </span>
      <span className="shrink-0 tabular-nums">{dayLabel(when, today)}</span>
    </Link>
  );
}

function Hub({ hub }: { hub: TodayHub }) {
  const hasZwift = hub.zwiftMatches.length > 0 || Boolean(hub.zwiftChosen);
  if (!hasZwift && !hub.outdoor) return null;
  // Wat je al gekozen hebt blijft in beeld; de rest vraagt pas ruimte als je kijkt.
  const hasChoice = Boolean(hub.zwiftChosen) || (hub.outdoor && hub.routes.some((route) => route.chosen));
  return (
    <Disclosure
      title={hasZwift && hub.outdoor ? "Op Zwift of buiten" : hasZwift ? "Op Zwift" : "Buiten rijden"}
      defaultOpen={hasChoice}
    >
      {/* grid-cols-1 en niet het kale raster: zonder minmax(0, 1fr) rekt de kolom
          op tot de breedste regel en schuift de pagina op de telefoon zijwaarts. */}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <ZwiftEventSuggestions
          workoutId={hub.workoutId}
          matches={hub.zwiftMatches}
          chosen={hub.zwiftChosen}
        />
        {hub.outdoor ? (
          <OutdoorRouteSuggestions
            workoutId={hub.workoutId}
            routes={hub.routes}
            startPoints={hub.startPoints}
          />
        ) : null}
      </div>
    </Disclosure>
  );
}

export function TodayCard({
  state,
  upcoming,
  closed,
  today,
  ftpWatts,
  athleteId,
  advice,
  cautions,
  hub,
  warmup,
  segments,
  adjust,
}: {
  state: VandaagState;
  /** De training die eraan komt: de hele kaart, of een rij als de dag klaar is. */
  upcoming: TodayUpcoming | null;
  /** De gereden of vervallen training van vandaag. */
  closed: WorkoutRow | null;
  today: string;
  ftpWatts: number | null;
  athleteId?: string;
  advice: ZwbAdvice | null;
  cautions: string[];
  hub: TodayHub | null;
  warmup: ComponentProps<typeof RaceWarmupControl>["warmup"] | null;
  segments: ReturnType<typeof suggestSegmentsForBlock>;
  adjust: { show: boolean; initialOpen: boolean; canRest: boolean };
}) {
  const ahead = state === "training" || state === "race" || state === "later";
  const workout = ahead && upcoming?.kind === "zwb" ? upcoming.workout : null;
  const event = ahead && upcoming?.kind === "intervals" ? upcoming.event : null;
  const isRace = workout?.intensity === "race";
  const ftpLabel = ftpWatts ? `FTP ${ftpWatts} W` : null;
  const publishStatus = workout ? publishStatusLabel(workout.publish_status) : null;

  const links = (
    <>
      {workout?.event_id && !isRace ? (
        <InlineMoreLink href={`/events/${workout.event_id}`}>Naar het event</InlineMoreLink>
      ) : null}
      <InlineMoreLink href="/zwbeter-worden/coach">Vraag je coach</InlineMoreLink>
    </>
  );

  return (
    <section
      id="vandaag-training"
      aria-labelledby="vandaag-training-kop"
      className={cn(
        "scroll-mt-20 rounded-lg p-5",
        // De gouden lijn van de Hierregel: dit is vandaag. De paneelregel voor
        // bg-card zou hem wegpoetsen.
        state === "training" || state === "race" ? "tg-note" : "border bg-card",
      )}
    >
      <h2 id="vandaag-training-kop" className={workout || event || state === "gereden" ? "sr-only" : "text-2xl font-medium"}>
        {HEADINGS[state]}
      </h2>

      {ahead && advice && advice.level <= 2 ? <Advice advice={advice} /> : null}

      {workout ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <WorkoutTitle
                workout={workout}
                athleteId={athleteId}
                className="text-2xl font-medium leading-tight"
              />
              <p className="mt-1 text-sm text-muted-foreground">
                {state === "later" && dayLabel(workout.scheduled_at, today) !== "Morgen"
                  ? `Volgende training, ${dayLabel(workout.scheduled_at, today)}`
                  : dayLabel(workout.scheduled_at, today)}
                {" · "}
                <ClubShortName />-schema · {workout.duration_minutes} min ·{" "}
                {plannedWorkoutIntensity(workout, ftpWatts).label}
                {ftpLabel ? (
                  <>
                    {" · "}
                    <span className="whitespace-nowrap">{ftpLabel}</span>
                  </>
                ) : null}
              </p>
            </div>
            {publishStatus ? (
              <span className="text-xs text-muted-foreground">{publishStatus}</span>
            ) : null}
          </div>
          <WorkoutBlocks
            blocks={normalizeWorkoutBlocks(
              workout.structure_json,
              workout.intensity as WorkoutIntensity,
            )}
            ftpWatts={ftpWatts}
            variant="preview"
          />
        </>
      ) : null}

      {event ? (
        <>
          <p className="text-2xl font-medium leading-tight">{event.name ?? "Workout"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {dayLabel(event.start_date_local, today)} ·{" "}
            {event.icu_training_load ? `${Math.round(event.icu_training_load)} TSS` : "intervals.icu"}
            {ftpLabel ? (
              <>
                {" · "}
                <span className="whitespace-nowrap">{ftpLabel}</span>
              </>
            ) : null}
          </p>
          <WorkoutBlocks blocks={eventWorkoutBlocks(event)} ftpWatts={ftpWatts} variant="preview" />
        </>
      ) : null}

      {state === "gereden" && closed ? (
        <>
          <WorkoutTitle
            workout={closed}
            athleteId={athleteId}
            className="text-2xl font-medium leading-tight"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Gereden · {closed.duration_minutes} min ·{" "}
            {plannedWorkoutIntensity(closed, ftpWatts).label}
          </p>
        </>
      ) : null}

      {state === "rust" && closed?.status === "skipped" ? (
        <p className="mt-1 text-sm text-muted-foreground">{closed.title} is vervallen</p>
      ) : null}

      {ahead && advice && advice.level > 2 ? <Advice advice={advice} /> : null}

      {isRace && workout?.event_id ? (
        <Link
          href={`/events/${workout.event_id}`}
          className={cn(buttonVariants(), "mt-4 min-h-11 px-4")}
        >
          Naar het event
        </Link>
      ) : null}
      {workout && warmup ? (
        <div className="mt-3">
          <RaceWarmupControl raceWorkoutId={workout.id} warmup={warmup} />
        </div>
      ) : null}

      {adjust.show ? (
        <AdjustTodayForm
          initialOpen={adjust.initialOpen}
          canRest={adjust.canRest}
          secondary={Boolean(isRace && workout?.event_id)}
        >
          {ahead ? links : null}
        </AdjustTodayForm>
      ) : ahead ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 [&>a]:min-h-11">{links}</div>
      ) : null}

      {!ahead && upcoming ? <NextRow upcoming={upcoming} today={today} /> : null}
      {state === "leeg" ? (
        <div className="mt-2 flex [&>a]:min-h-11">
          <InlineMoreLink href="/zwbeter-worden/schema">Naar je schema</InlineMoreLink>
        </div>
      ) : null}

      {ahead && hub ? <Hub hub={hub} /> : null}

      {ahead && segments.length > 0 ? (
        <div className="mt-3 border-t pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Segmenten voor het zware blok
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {segments.map((segment) => (
              <span key={segment.slug} className="rounded-full border px-3 py-1 text-xs">
                {segment.name}
                <span className="ml-1.5 text-muted-foreground tabular-nums">
                  {formatSegmentTime(segment.estimatedSeconds)}
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {ahead && cautions.length > 0 ? (
        <Disclosure title="Waarom dit schema">
          <PlanCautions items={cautions} />
        </Disclosure>
      ) : null}
    </section>
  );
}
