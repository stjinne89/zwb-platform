// Het tabblad Uitgangspunten: de AI-invoer van een schema, omgezet naar wat een
// lid kan lezen. Los van React, zodat de vertaling te testen is.
//
// Elke groep heeft één zin over wat het schema ermee doet. Die zinnen volgen de
// regels in defaultTrainingPrompt() (lib/training/workouts.ts); verandert daar
// een regel, dan hoort de zin hier mee te veranderen.

import type { TrainingAiInput } from "@/lib/training/ai";
import { WEEKDAY_SLUGS } from "@/lib/training/availability";
import { GOAL_LABELS } from "./format";

export type BasisGroup = {
  id: string;
  title: string;
  rows: Array<{ label: string; value: string }>;
  /** Wat het schema met deze gegevens doet. */
  effect: string;
  link?: { href: string; label: string };
};

const INTENSITY_LABELS: Record<string, string> = {
  easy: "Voorzichtig",
  balanced: "Gebalanceerd",
  hard: "Ambitieus",
};
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Gemiddeld",
  advanced: "Gevorderd",
};
const WELLNESS_LABELS: Record<string, string> = {
  fresh: "Fris",
  normal: "Normaal",
  fatigued: "Vermoeid",
  unknown: "Onbekend",
};
const PRIORITY_LABELS: Record<string, string> = { a: "A-doel", b: "B-doel", c: "C-doel" };
const PERIOD_LABELS: Record<string, string> = {
  rust: "Rust",
  rustig: "Rustig",
  kamp: "Trainingskamp",
};

function num(value: number, digits = 0) {
  return value.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function day(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}

/** 90 → "1u30", 120 → "2u", 45 → "45 min". */
export function minutesLabel(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const rest = total % 60;
  return rest ? `${Math.floor(total / 60)}u${String(rest).padStart(2, "0")}` : `${total / 60}u`;
}

function known(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function planBasisGroups(input: Partial<TrainingAiInput>): BasisGroup[] {
  const groups: BasisGroup[] = [];

  const goal = input.goal;
  if (goal) {
    const rows = [
      { label: "Doel", value: goal.title },
      { label: "Soort", value: GOAL_LABELS[goal.type] ?? goal.type },
      ...(goal.targetDate ? [{ label: "Doeldatum", value: day(goal.targetDate) }] : []),
      ...(known(goal.maxHoursPerWeek)
        ? [{ label: "Uren per week", value: `${num(goal.maxHoursPerWeek, 1)} u` }]
        : []),
      {
        label: "Intensiteit",
        value: INTENSITY_LABELS[goal.desiredIntensity] ?? goal.desiredIntensity,
      },
      { label: "Niveau", value: LEVEL_LABELS[goal.experienceLevel] ?? goal.experienceLevel },
      ...(goal.riskNotes ? [{ label: "Aandachtspunten", value: goal.riskNotes }] : []),
    ];
    groups.push({
      id: "doel",
      title: "Doel",
      rows,
      effect:
        "De uren per week zijn waar de zwaarste week van een blok naartoe werkt. Het soort doel bepaalt of er een afbouw naar een piek komt.",
      link: { href: "/zwbeter-worden/doelen", label: "Doelen" },
    });
  }

  const standard = input.availability?.default;
  if (standard) {
    const days = WEEKDAY_SLUGS.map((slug) => {
      const minutes = Number(standard[slug] ?? 0);
      return `${slug} ${minutes > 0 ? minutesLabel(minutes) : "geen"}`;
    }).join(" · ");
    const weeks = input.availability?.weeks.length ?? 0;
    groups.push({
      id: "beschikbaarheid",
      title: "Beschikbaarheid",
      rows: [
        { label: "Standaardweek", value: days },
        ...(weeks > 0 ? [{ label: "Apart ingevulde weken", value: String(weeks) }] : []),
      ],
      effect: "Geen training op een dag zonder tijd, en nooit langer dan de tijd die er die dag is.",
      link: { href: "/zwbeter-worden/schema", label: "Schema" },
    });
  }

  const recent = input.recentLoad;
  if (recent) {
    groups.push({
      id: "gereden",
      title: "Wat je reed",
      rows: [
        {
          label: `Laatste ${recent.days} dagen`,
          value: `${num(recent.hoursPerWeek, 1)} u per week`,
        },
        { label: "Ritten per week", value: num(recent.ridesPerWeek, 1) },
        { label: "Gemiddelde rit", value: minutesLabel(recent.avgDurationMinutes) },
        { label: "Langste rit", value: minutesLabel(recent.longestRideMinutes) },
      ],
      effect:
        "Een opbouwweek komt niet onder wat je nu al rijdt, en het schema volgt je ritme van rijdagen en ritduur.",
      link: { href: "/zwbeter-worden/belasting", label: "Belasting" },
    });
  }

  const load = input.intervalsLoad;
  if (load) {
    groups.push({
      id: "vorm",
      title: "Vorm",
      rows: [
        ...(known(load.ctl) ? [{ label: "Fitness (CTL)", value: num(load.ctl, 1) }] : []),
        ...(known(load.atl) ? [{ label: "Vermoeidheid (ATL)", value: num(load.atl, 1) }] : []),
        ...(known(load.tsb) ? [{ label: "Vorm (TSB)", value: num(load.tsb, 1) }] : []),
        ...(known(load.rampRate) ? [{ label: "Stijging per week", value: num(load.rampRate, 1) }] : []),
      ],
      effect:
        "Bij een sterk negatieve vorm of een snelle stijging van je belasting begint het schema lichter.",
      link: { href: "/zwbeter-worden/belasting", label: "Belasting" },
    });
  }

  const wellness = input.wellness;
  if (wellness) {
    const readiness = known(wellness.readiness)
      ? `${num(wellness.readiness)}${wellness.readinessCurrent ? "" : ` (meting van ${day(wellness.readinessDate)}, niet meegewogen)`}`
      : null;
    groups.push({
      id: "herstel",
      title: "Herstel",
      rows: [
        { label: "Status", value: WELLNESS_LABELS[wellness.state] ?? wellness.state },
        ...(readiness ? [{ label: "Readiness", value: readiness }] : []),
        ...(known(wellness.hrv) ? [{ label: "HRV", value: num(wellness.hrv) }] : []),
        ...(known(wellness.restingHr) ? [{ label: "Rusthartslag", value: num(wellness.restingHr) }] : []),
        ...(known(wellness.sleepHours) ? [{ label: "Slaap", value: `${num(wellness.sleepHours, 1)} u` }] : []),
      ],
      effect:
        "Bij vermoeidheid, lage readiness, weinig slaap of een hogere rusthartslag schuiven zware sessies op.",
    });
  }

  const compliance = input.compliance?.summary;
  if (compliance && compliance.planned > 0) {
    groups.push({
      id: "naleving",
      title: "Gepland naast gereden",
      rows: [
        { label: "Gereden", value: `${compliance.ridden} van ${compliance.planned}` },
        ...(known(compliance.avgLoadPct)
          ? [{ label: "Belasting t.o.v. gepland", value: `${num(compliance.avgLoadPct)}%` }]
          : []),
        { label: "Zwaarder dan gepland", value: String(compliance.tooHard) },
        { label: "Lichter dan gepland", value: String(compliance.tooLight) },
      ],
      effect:
        "Rijd je steeds zwaarder dan gepland zonder dat het zwaar voelt, dan gaat het volume omhoog. Rijd je lichter of sla je over, dan wordt het schema realistischer.",
    });
  }

  const season = input.seasonPlan;
  if (season && (season.targets.length > 0 || season.periods.length > 0)) {
    groups.push({
      id: "jaarplan",
      title: "Jaarplan",
      rows: [
        ...season.targets.map((target) => ({
          label: PRIORITY_LABELS[target.priority] ?? target.priority,
          value: `${target.title} · ${day(target.date)}`,
        })),
        ...season.periods.map((period) => ({
          label: PERIOD_LABELS[period.kind] ?? period.kind,
          value: `${period.title} · ${day(period.from)} t/m ${day(period.to)}`,
        })),
      ],
      effect:
        "Naar een A-doel wordt afgebouwd, door een rustperiode loopt geen opbouw, en in een trainingskamp staat veel meer.",
      link: { href: "/zwbeter-worden/jaarplan", label: "Jaarplan" },
    });
  }

  const fixed = input.fixedWorkouts ?? [];
  if (fixed.length > 0) {
    const shown = fixed.slice(0, 6);
    groups.push({
      id: "vast",
      title: "Vaste afspraken",
      rows: [
        ...shown.map((workout) => ({
          label: day(workout.date),
          value: `${workout.title} · ${minutesLabel(workout.durationMinutes)}`,
        })),
        ...(fixed.length > shown.length
          ? [{ label: "En verder", value: `${fixed.length - shown.length} meer` }]
          : []),
      ],
      effect: "Blijven staan. Het schema plant eromheen en telt ze mee in je weekbelasting.",
    });
  }

  const profile = input.profile;
  if (profile && known(profile.ftpWatts)) {
    groups.push({
      id: "ftp",
      title: "FTP",
      rows: [
        { label: "FTP", value: `${num(profile.ftpWatts)} W` },
        { label: "Laatste test", value: profile.ftpTestedOn ? day(profile.ftpTestedOn) : "Geen" },
      ],
      effect: "Elk wattage in je schema hangt aan deze waarde.",
      link: { href: "/zwbeter-worden/vermogen", label: "Vermogen" },
    });
  }

  if (input.symptoms) {
    groups.push({
      id: "klachten",
      title: "Logboek",
      rows: [{ label: "Afgelopen week", value: input.symptoms.label }],
      effect: "Bij veel klachten wordt een zware sessie flexibeler gepland.",
      link: { href: "/zwbeter-worden/logboek", label: "Logboek" },
    });
  }

  return groups;
}
