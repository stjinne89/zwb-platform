"use client";

// De maandweergave van het lid, met een detailpaneel eronder. Klik je een
// training aan, dan krijg je precies één van twee dingen: staat hij nog te
// wachten, dan zie je hoe hij eruitziet; is hij geweest, dan zie je je eigen
// rapportage met de cijfers ernaast. Daarmee vervalt de aparte terugblik-kaart:
// hetzelfde verhaal stond anders twee keer op de pagina.

import { useState } from "react";
import { CircleHelp, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import { COMPLIANCE_LABELS, COMPLIANCE_PILLS } from "@/lib/training/compliance";
import { intensityLabel, type WorkoutBlock } from "@/lib/training/workouts";
import { saveWorkoutReport } from "../_actions";
import { formatDayMonth, formAction } from "./format";
import type { WorkoutOutcome } from "./completed-workouts";
import { WorkoutBlocks } from "./workout-blocks";
import { WorkoutMetricsPanel } from "./workout-metrics-panel";
import { WorkoutCalendar, type CalendarWorkout } from "./workout-calendar";

export type MemberCalendarItem = {
  id: string;
  dateKey: string;
  title: string;
  durationMinutes: number | null;
  intensity: string | null;
  source: "zwb" | "intervals";
  skipped: boolean;
  /** Alleen voor ZWB-workouts; een intervals-event heeft geen detail. */
  detail?: {
    outcome: WorkoutOutcome;
    description: string | null;
    blocks: WorkoutBlock[];
    intervalsUrl: string | null;
    fitUrl: string | null;
    rpe: number | null;
    feel: string | null;
    report: string | null;
    trainerFeedback: string | null;
    metrics: WorkoutMetricsSnapshot | null;
  };
};

const OUTCOME_LABELS: Record<WorkoutOutcome, string> = {
  gereden: "Gereden",
  gemist: "Niet gereden",
  rustdag: "Rustdag",
  gepland: "Staat gepland",
};

const FIELD = "mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm";

function OutcomePill({ outcome, metrics }: { outcome: WorkoutOutcome; metrics: WorkoutMetricsSnapshot | null }) {
  const base = "rounded-md px-2 py-0.5 text-xs font-medium";
  if (outcome === "gereden" && metrics) {
    return (
      <span className={`${base} ${COMPLIANCE_PILLS[metrics.verdict]}`}>
        {COMPLIANCE_LABELS[metrics.verdict]}
        {metrics.loadPct == null ? "" : ` · ${metrics.loadPct}%`}
      </span>
    );
  }
  if (outcome === "gemist") {
    return <span className={`${base} ${COMPLIANCE_PILLS.niet_gereden}`}>{OUTCOME_LABELS.gemist}</span>;
  }
  return <span className={`${base} bg-muted text-muted-foreground`}>{OUTCOME_LABELS[outcome]}</span>;
}

/** Wat het lid zelf invulde; blijft ook na afloop aanpasbaar. */
function ReportForm({
  workoutId,
  rpe,
  feel,
  report,
}: {
  workoutId: string;
  rpe: number | null;
  feel: string | null;
  report: string | null;
}) {
  return (
    <form key={workoutId} action={formAction(saveWorkoutReport)} className="space-y-2">
      <input type="hidden" name="workout_id" value={workoutId} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          RPE
          <input
            name="athlete_rpe"
            type="number"
            min="1"
            max="10"
            defaultValue={rpe ?? ""}
            className={FIELD}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Gevoel
          <select name="athlete_feel" defaultValue={feel ?? ""} className={FIELD}>
            <option value="">-</option>
            <option value="goed">Goed</option>
            <option value="neutraal">Neutraal</option>
            <option value="zwaar">Zwaar</option>
            <option value="slecht">Slecht</option>
          </select>
        </label>
      </div>
      <textarea
        name="athlete_report"
        rows={3}
        defaultValue={report ?? ""}
        placeholder="Hoe ging deze training?"
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
      />
      <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
        Rapportage opslaan
      </button>
    </form>
  );
}

function WorkoutDetail({
  item,
  ftpWatts,
}: {
  item: MemberCalendarItem;
  ftpWatts?: number | null;
}) {
  const detail = item.detail;
  if (!detail) {
    return (
      <p className="text-sm text-muted-foreground">
        {item.title} - uit intervals.icu
        {item.durationMinutes ? ` - ${item.durationMinutes} min` : ""}
      </p>
    );
  }

  // Nog te rijden: laten zien wát het is. Geweest: laten zien hoe het ging.
  const upcoming = detail.outcome === "gepland";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatDayMonth(`${item.dateKey}T12:00:00`)}
            {item.durationMinutes ? ` - ${item.durationMinutes} min` : ""}
            {item.intensity ? ` - ${intensityLabel(item.intensity)}` : ""}
          </p>
        </div>
        <OutcomePill outcome={detail.outcome} metrics={detail.metrics} />
      </div>

      {upcoming ? (
        <>
          {detail.description ? (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {detail.description}
            </p>
          ) : null}
          {/* Zonder FTP kan de balk een wattdoel niet naar een band vertalen en
              vult hij elk blok volledig; dan verdwijnt het verschil tussen een
              opener en een duurblok. */}
          <WorkoutBlocks blocks={detail.blocks} ftpWatts={ftpWatts} variant="preview" />
          {detail.fitUrl || detail.intervalsUrl ? (
            <div className="flex flex-wrap gap-2">
              {detail.fitUrl ? (
                <>
                  <a
                    href={detail.fitUrl}
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    <Download className="size-3" />
                    Download FIT
                  </a>
                  <Link
                    href="/hulp#fit-export"
                    title="Hulp bij workout op je fietscomputer"
                    aria-label="Hulp bij workout op je fietscomputer"
                    className="inline-flex items-center rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <CircleHelp className="size-3.5" />
                  </Link>
                </>
              ) : null}
              {detail.intervalsUrl ? (
                <a
                  href={detail.intervalsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <ExternalLink className="size-3" />
                  In intervals.icu
                </a>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {detail.metrics ? <WorkoutMetricsPanel metrics={detail.metrics} /> : null}
          <ReportForm
            workoutId={item.id}
            rpe={detail.rpe}
            feel={detail.feel}
            report={detail.report}
          />
          {detail.trainerFeedback ? (
            <div>
              <p className="text-xs text-muted-foreground">Feedback van je trainer</p>
              <p className="mt-1 rounded-md border-l-2 border-primary bg-primary/5 p-3 text-sm whitespace-pre-line">
                {detail.trainerFeedback}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function MemberWorkoutCalendar({
  items,
  todayKey,
  ftpWatts,
}: {
  items: MemberCalendarItem[];
  todayKey: string;
  /** Voor de vermogensbanden in de blokkenbalk. */
  ftpWatts?: number | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const cells: CalendarWorkout[] = items.map((item) => ({
    id: item.id,
    dateKey: item.dateKey,
    title: item.title,
    durationMinutes: item.durationMinutes,
    intensity: item.intensity,
    source: item.source,
    skipped: item.skipped,
  }));

  return (
    <div>
      <WorkoutCalendar
        workouts={cells}
        todayKey={todayKey}
        onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
        selectedId={selectedId}
      />
      <div className="border-t p-4">
        {selected ? (
          <WorkoutDetail item={selected} ftpWatts={ftpWatts} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Klik een training voor de details of je rapportage.
          </p>
        )}
      </div>
    </div>
  );
}
