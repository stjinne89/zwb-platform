// Vergelijken-tab: blind oordeel AI tegen regelmotor.
//
// Per opgeslagen AI-generatie staan twee schema's naast elkaar: dat van de AI en
// dat van de motor, ter plekke uitgerekend op dezelfde invoer. Welke van wie is,
// komt pas in de pagina nadat de trainer zijn oordeel heeft opgeslagen; daarvoor
// gaat er geen herkomst mee naar de browser. Net als Beoordelen over alle
// toegewezen leden tegelijk, en zonder namen in de keuzelijst.

import Link from "next/link";
import { EmptyState } from "@/components/app-ui";
import { PowerWeight } from "@/components/power-unit";
import {
  assignSides,
  COMPARISON_MODEL_PREFIX,
  COMPARISON_SINCE,
  comparisonKindLabel,
  comparisonPair,
  comparisonWeeks,
  isComparableGeneration,
  REASON_MAX,
  tallyVerdicts,
  type ComparedWorkout,
  type Side,
  type Winner,
} from "@/lib/training/engine-comparison";
import { intensityLabel, normalizeWorkoutBlocks, type WorkoutIntensity } from "@/lib/training/workouts";
import { cn } from "@/lib/utils";
import { formatDayMonth, paramString } from "../../_components/format";
import type { SearchParamsProp } from "../../_components/types";
import { WorkoutBlocks } from "../../_components/workout-blocks";
import { loadAssignments, trainerViewer } from "../_data";
import { GenerationPicker, VerdictForm, type GenerationOption } from "./comparison-controls";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GenerationRow = {
  id: string;
  adaptation_kind: string | null;
  parent_plan_id: string | null;
  created_at: string;
};

type VerdictRow = {
  generation_id: string;
  winner: Winner;
  reason: string | null;
  generation: { model: string | null; created_at: string } | null;
};

const FEELING: Record<string, string> = { tired: "moe", normal: "normaal", fresh: "fris" };

function hours(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")} u`;
}

export default async function TrainerComparePage({ searchParams }: SearchParamsProp) {
  const viewer = await trainerViewer();
  if (!viewer.access.has("training.view_assigned")) {
    return <EmptyState>Je hebt geen trainer-rechten.</EmptyState>;
  }

  const [assignments, params] = await Promise.all([
    loadAssignments(viewer),
    searchParams ?? Promise.resolve<Record<string, string | string[] | undefined>>({}),
  ]);
  const athleteIds = assignments.map((assignment) => assignment.athlete_id);
  if (athleteIds.length === 0) return <EmptyState>Geen toegewezen leden.</EmptyState>;

  const [{ data: generationRows }, { data: verdictRows }] = await Promise.all([
    viewer.supabase
      .from("training_ai_generations")
      .select("id, adaptation_kind, parent_plan_id, created_at")
      .in("profile_id", athleteIds)
      .eq("status", "completed")
      .not("response_json", "is", null)
      .like("model", `${COMPARISON_MODEL_PREFIX}%`)
      .gte("created_at", COMPARISON_SINCE)
      .order("created_at", { ascending: false })
      .limit(200),
    // Zonder 0247 geeft dit een fout; dan telt de pagina gewoon nul oordelen.
    viewer.supabase
      .from("training_engine_comparisons")
      .select("generation_id, winner, reason, generation:training_ai_generations(model, created_at)")
      .eq("trainer_id", viewer.user.id),
  ]);

  const generations = (generationRows ?? []) as GenerationRow[];
  if (generations.length === 0) return <EmptyState>Geen generaties om te vergelijken.</EmptyState>;

  // Oordelen op oudere (GPT-)generaties blijven bewaard, maar tellen niet mee.
  const verdicts = new Map(
    ((verdictRows ?? []) as unknown as VerdictRow[])
      .filter((row) => isComparableGeneration(row.generation))
      .map((row) => [row.generation_id, row]),
  );
  const tally = tallyVerdicts([...verdicts.values()]);

  const requested = paramString(params.g);
  const selected =
    generations.find((row) => row.id === requested) ??
    generations.find((row) => !verdicts.has(row.id)) ??
    generations[0];
  const verdict = verdicts.get(selected.id) ?? null;
  const nextOpen = generations.find((row) => row.id !== selected.id && !verdicts.has(row.id));

  const { data: detail } = await viewer.supabase
    .from("training_ai_generations")
    .select("prompt_summary, response_json")
    .eq("id", selected.id)
    .maybeSingle();
  const pair = detail ? comparisonPair(detail.prompt_summary, detail.response_json) : null;

  const options: GenerationOption[] = generations.map((row) => ({
    id: row.id,
    label: `${formatDayMonth(row.created_at, false)} · ${comparisonKindLabel(row.adaptation_kind, row.parent_plan_id)}`,
    judged: verdicts.has(row.id),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card p-3">
        <GenerationPicker options={options} selectedId={selected.id} />
        <p className="text-sm text-muted-foreground">
          {tally.total} {tally.total === 1 ? "oordeel" : "oordelen"}
          {verdict ? ` · motor ${tally.engine} · AI ${tally.ai} · gelijk ${tally.gelijk}` : null}
        </p>
        {nextOpen ? (
          <Link
            href={`/zwbeter-worden/trainer/vergelijken?g=${nextOpen.id}`}
            className="ml-auto text-sm text-muted-foreground hover:text-foreground"
          >
            Volgende open →
          </Link>
        ) : null}
      </div>

      {pair ? (
        <ComparisonBody generationId={selected.id} pair={pair} verdict={verdict} />
      ) : (
        <EmptyState>Niet te vergelijken.</EmptyState>
      )}
    </div>
  );
}

function ComparisonBody({
  generationId,
  pair,
  verdict,
}: {
  generationId: string;
  pair: NonNullable<ReturnType<typeof comparisonPair>>;
  verdict: VerdictRow | null;
}) {
  const sides = assignSides(generationId, pair.ai, pair.engine);
  const input = pair.input;
  const isDaily = pair.mode === "daily";
  // Een dagaanpassing levert alleen gewijzigde dagen; een lege kant laat die dag staan.
  const empty = isDaily ? "Ongewijzigd" : "–";
  const weeks = comparisonWeeks(sides.a, sides.b, isDaily ? (input.currentPlan?.workouts ?? []) : []);
  // De herkomst alleen na het oordeel. Labels en keuze volgen de kolommen zoals
  // ze nu staan; de winnaar is opgeslagen als ai/engine, dus dat klopt ook als
  // de volgorde ooit verandert.
  const aiSide: Side = sides.engineSide === "a" ? "b" : "a";
  const owner = (side: Side) => (verdict ? (side === sides.engineSide ? "motor" : "AI") : null);
  const chosen: Side | "gelijk" | null = verdict
    ? verdict.winner === "gelijk"
      ? "gelijk"
      : verdict.winner === "engine"
        ? sides.engineSide
        : aiSide
    : null;

  const today = input.today;
  const context = [
    isDaily && today?.feeling ? `Gevoel ${FEELING[today.feeling] ?? today.feeling}` : null,
    isDaily && today?.availableMinutes != null ? `${today.availableMinutes} min beschikbaar` : null,
    isDaily && today?.note ? `“${today.note}”` : null,
    input.planUpdate?.reason ? `“${input.planUpdate.reason}”` : null,
  ].filter(Boolean);

  return (
    <PowerWeight weightKg={input.profile?.weightKg ?? null} ftpWatts={input.profile?.ftpWatts ?? null}>
      <section className="space-y-3 rounded-lg border bg-card p-3 sm:p-4">
        {context.length ? <p className="text-sm text-muted-foreground">{context.join(" · ")}</p> : null}

        <div className="grid grid-cols-2 gap-3 border-b pb-2 sm:grid-cols-[6rem_1fr_1fr]">
          <span className="hidden sm:block" />
          {(["a", "b"] as const).map((side) => (
            <p key={side} className="flex items-center gap-2 font-semibold">
              {side.toUpperCase()}
              {owner(side) ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    chosen === side ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {owner(side)}
                </span>
              ) : null}
            </p>
          ))}
        </div>

        {weeks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Beide: geen wijziging.</p>
        ) : (
          weeks.map((week) => (
            <div key={week.weekStart} className="space-y-2">
              <div className="grid grid-cols-2 gap-3 text-xs font-medium text-muted-foreground sm:grid-cols-[6rem_1fr_1fr]">
                <span className="col-span-2 sm:col-span-1">Week {formatDayMonth(week.weekStart, false)}</span>
                {/* Bij een dagaanpassing zou het totaal alleen de gewijzigde dagen tellen. */}
                {isDaily ? null : (
                  <>
                    <span className="tabular-nums">{hours(week.aMinutes)}</span>
                    <span className="tabular-nums">{hours(week.bMinutes)}</span>
                  </>
                )}
              </div>
              {week.days.map((day) => (
                <div
                  key={day.date}
                  className="grid grid-cols-2 gap-3 border-t pt-2 sm:grid-cols-[6rem_1fr_1fr]"
                >
                  <div className="col-span-2 text-sm sm:col-span-1">
                    <p className="font-medium">{formatDayMonth(day.date)}</p>
                    {day.was.map((was, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        Was: {was.title} · {was.durationMinutes} min
                      </p>
                    ))}
                  </div>
                  <WorkoutCell workouts={day.a} ftpWatts={input.profile?.ftpWatts ?? null} empty={empty} />
                  <WorkoutCell workouts={day.b} ftpWatts={input.profile?.ftpWatts ?? null} empty={empty} />
                </div>
              ))}
            </div>
          ))
        )}

        <div className="border-t pt-3">
          {verdict ? (
            <p className="text-sm">
              {chosen === "gelijk" ? "Gelijk" : `${chosen?.toUpperCase()} beter`}
              {verdict.reason ? <span className="text-muted-foreground"> · {verdict.reason}</span> : null}
            </p>
          ) : (
            <VerdictForm key={generationId} generationId={generationId} reasonMax={REASON_MAX} />
          )}
        </div>
      </section>
    </PowerWeight>
  );
}

function WorkoutCell({
  workouts,
  ftpWatts,
  empty,
}: {
  workouts: ComparedWorkout[];
  ftpWatts: number | null;
  empty: string;
}) {
  if (workouts.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="min-w-0 space-y-3">
      {workouts.map((workout, index) => (
        <div key={index} className="min-w-0">
          <p className="text-sm font-medium">{workout.title}</p>
          <p className="text-xs text-muted-foreground">
            {workout.durationMinutes} min · {intensityLabel(workout.intensity)}
          </p>
          <WorkoutBlocks
            blocks={normalizeWorkoutBlocks(workout.structure, workout.intensity as WorkoutIntensity)}
            ftpWatts={ftpWatts}
          />
          {workout.description ? (
            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground" title={workout.description}>
              {workout.description}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
