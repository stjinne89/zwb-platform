import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Mountain,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  fetchIntervalsEvents,
  fetchIntervalsWellness,
  type IntervalsEvent,
  type IntervalsWellness,
} from "@/lib/intervals/client";
import {
  createTrainingGoal,
  generateAiDraft,
  grantTrainerAccess,
  publishTrainingPlan,
  revokeTrainerAccess,
  setPlanStatus,
  updateWorkout,
} from "./_actions";
import { ConnectIntervalsForm } from "./_components/connect-form";
import { DisconnectIntervalsButton } from "./_components/disconnect-button";

type ProfileRow = {
  id: string;
  display_name: string | null;
  ftp_watts: number | null;
  weight_kg: number | string | null;
  zrl_category: string | null;
  community_roles?: string[] | null;
};

type StravaActivityRow = {
  id: number;
  profile_id: string;
  name: string | null;
  sport_type: string | null;
  start_date: string;
  distance_m: number | string;
  total_elevation_gain_m: number | string;
  kudos_count: number;
  moving_time_seconds: number;
  trainer: boolean;
};

type AssignmentRow = {
  id: string;
  athlete_id: string;
  trainer_id: string;
  status: string;
  notes: string | null;
  granted_at: string;
};

type GoalRow = {
  id: string;
  profile_id: string;
  title: string;
  goal_type: string;
  target_date: string | null;
  available_days: string[];
  max_hours_per_week: number | string | null;
  preferred_mode: string;
  experience_level: string;
  desired_intensity: string;
  risk_notes: string | null;
  status: string;
};

type PlanRow = {
  id: string;
  profile_id: string;
  trainer_id: string | null;
  goal_id: string | null;
  title: string;
  summary: string | null;
  start_date: string;
  end_date: string;
  status: string;
  source: string;
  created_at: string;
};

type WorkoutRow = {
  id: string;
  plan_id: string;
  profile_id: string;
  scheduled_at: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  intensity: string;
  target_type: string;
  structure_json: Array<{ label?: string; durationMinutes?: number; target?: string; notes?: string }> | null;
  publish_status: string;
  publish_error: string | null;
};

const GOAL_LABELS: Record<string, string> = {
  zrl: "ZRL",
  ladder: "Ladder",
  outdoor_event: "Outdoor event",
  gran_fondo: "Gran fondo",
  ftp: "FTP",
  base_fitness: "Basisconditie",
  rebuild: "Herstel/opbouw",
};

const INTENSITY_LABELS: Record<string, string> = {
  recovery: "Herstel",
  endurance: "Duur",
  tempo: "Tempo",
  threshold: "Drempel",
  vo2max: "VO2max",
  anaerobic: "Anaeroob",
  race: "Race",
  rest: "Rust",
};

function toNum(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatKm(meters?: number) {
  if (!meters) return "-";
  return `${(meters / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;
}

function formatHours(seconds?: number) {
  if (!seconds) return "-";
  return `${(seconds / 3600).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} u`;
}

function formatMeters(m?: number) {
  if (!m) return "-";
  return `${Math.round(m).toLocaleString("nl-NL")} m`;
}

function formatNumber(n?: number, digits = 0) {
  if (n === undefined || n === null) return "-";
  return n.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formAction(action: (formData: FormData) => Promise<unknown>) {
  return action as unknown as (formData: FormData) => Promise<void>;
}

function dateValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function timeValue(value: string) {
  return new Date(value).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function byProfile<T extends { profile_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) map.set(row.profile_id, [...(map.get(row.profile_id) ?? []), row]);
  return map;
}

function byPlan<T extends { plan_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) map.set(row.plan_id, [...(map.get(row.plan_id) ?? []), row]);
  return map;
}

function loadSummary(rows: StravaActivityRow[]) {
  return rows.reduce(
    (acc, row) => ({
      activities: acc.activities + 1,
      distance: acc.distance + toNum(row.distance_m),
      elevation: acc.elevation + toNum(row.total_elevation_gain_m),
      time: acc.time + (row.moving_time_seconds ?? 0),
    }),
    { activities: 0, distance: 0, elevation: 0, time: 0 },
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className="size-5 text-primary" />
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PlanBadge({ status }: { status: string }) {
  const label =
    status === "published"
      ? "Gepubliceerd"
      : status === "approved"
        ? "Goedgekeurd"
        : status === "review"
          ? "Review"
          : status === "archived"
            ? "Archief"
            : "Concept";
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {label}
    </span>
  );
}

function WorkoutList({
  workouts,
  editable,
}: {
  workouts: WorkoutRow[];
  editable: boolean;
}) {
  if (workouts.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Nog geen workouts in dit schema.</p>;
  }

  return (
    <ul className="divide-y">
      {workouts.map((workout) => (
        <li key={workout.id} className="p-4">
          {editable ? (
            <form action={formAction(updateWorkout)} className="grid gap-3 lg:grid-cols-[120px_90px_1fr_90px_120px_auto] lg:items-end">
              <input type="hidden" name="workout_id" value={workout.id} />
              <label className="text-xs text-muted-foreground">
                Datum
                <input
                  name="date"
                  type="date"
                  defaultValue={dateValue(workout.scheduled_at)}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Tijd
                <input
                  name="time"
                  type="time"
                  defaultValue={timeValue(workout.scheduled_at)}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Titel
                <input
                  name="title"
                  defaultValue={workout.title}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Minuten
                <input
                  name="duration_minutes"
                  type="number"
                  min="1"
                  max="480"
                  defaultValue={workout.duration_minutes}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Intensiteit
                <select
                  name="intensity"
                  defaultValue={workout.intensity}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                >
                  {Object.entries(INTENSITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
                Opslaan
              </button>
              <label className="lg:col-span-6 text-xs text-muted-foreground">
                Instructie
                <textarea
                  name="description"
                  defaultValue={workout.description ?? ""}
                  rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
            </form>
          ) : (
            <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
              <span className="text-sm text-muted-foreground">
                {new Date(workout.scheduled_at).toLocaleDateString("nl-NL", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{workout.title}</p>
                <p className="text-xs text-muted-foreground">
                  {workout.duration_minutes} min - {INTENSITY_LABELS[workout.intensity] ?? workout.intensity}
                  {workout.publish_status === "failed" ? ` - publicatiefout: ${workout.publish_error}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{workout.publish_status}</span>
            </div>
          )}
          {workout.structure_json && workout.structure_json.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {workout.structure_json.slice(0, 5).map((step, idx) => (
                <span key={idx} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {step.label ?? "Blok"} {step.durationMinutes ? `${step.durationMinutes}m` : ""} {step.target ?? ""}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainingPage() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  const user = access.user;
  if (!user) redirect("/login");

  const now = new Date();
  const since14 = new Date(now);
  since14.setDate(since14.getDate() - 14);
  const since14Workouts = new Date(now);
  since14Workouts.setDate(since14Workouts.getDate() - 14);
  const since21Workouts = new Date(now);
  since21Workouts.setDate(since21Workouts.getDate() - 21);
  const since28 = new Date(now);
  since28.setDate(since28.getDate() - 28);

  const [
    { data: myProfile },
    { data: conn },
    { data: stravaRows },
    { data: trainerRows },
    { data: myAssignments },
    { data: myGoals },
    { data: myPlans },
    { data: myWorkouts },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, ftp_watts, weight_kg, zrl_category")
      .eq("id", user.id)
      .single(),
    supabase
      .from("intervals_connections")
      .select("athlete_id, athlete_name, api_key, updated_at")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("strava_activities")
      .select(
        "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer",
      )
      .eq("profile_id", user.id)
      .gte("start_date", since14.toISOString())
      .order("start_date", { ascending: false })
      .limit(40),
    supabase
      .from("profiles")
      .select("id, display_name, community_roles")
      .contains("community_roles", ["trainer"])
      .order("display_name"),
    supabase
      .from("training_coach_assignments")
      .select("id, athlete_id, trainer_id, status, notes, granted_at")
      .eq("athlete_id", user.id)
      .eq("status", "active"),
    supabase
      .from("training_goals")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("training_plans")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("training_workouts")
      .select("*")
      .eq("profile_id", user.id)
      .gte("scheduled_at", since14Workouts.toISOString())
      .order("scheduled_at", { ascending: true }),
  ]);

  let wellness: IntervalsWellness[] = [];
  let events: IntervalsEvent[] = [];
  let fetchError: string | null = null;
  if (conn?.api_key && conn.athlete_id) {
    try {
      [wellness, events] = await Promise.all([
        fetchIntervalsWellness(conn.api_key, conn.athlete_id, 90),
        fetchIntervalsEvents(conn.api_key, conn.athlete_id, 14),
      ]);
    } catch (err) {
      fetchError = err instanceof Error ? err.message : "Onbekende fout.";
    }
  }

  const activities = (stravaRows ?? []) as StravaActivityRow[];
  const totals14 = loadSummary(activities);
  const wellnessSorted = [...wellness].sort((a, b) => a.id.localeCompare(b.id));
  const latest = wellnessSorted[wellnessSorted.length - 1];
  const eftpFirst = wellnessSorted.find((w) => w.eftp)?.eftp;
  const eftpLatest = [...wellnessSorted].reverse().find((w) => w.eftp)?.eftp;
  const eftpDelta = eftpLatest && eftpFirst ? eftpLatest - eftpFirst : null;
  const upcomingEvents = [...events]
    .filter((e) => e.start_date_local >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
    .slice(0, 5);
  const myWorkoutsByPlan = byPlan((myWorkouts ?? []) as WorkoutRow[]);

  const assignments = (myAssignments ?? []) as AssignmentRow[];
  const trainerIds = assignments.map((a) => a.trainer_id);
  const trainerMap = new Map(
    ((trainerRows ?? []) as ProfileRow[]).map((trainer) => [trainer.id, trainer]),
  );
  const selectableTrainers = ((trainerRows ?? []) as ProfileRow[]).filter(
    (trainer) => trainer.id !== user.id && !trainerIds.includes(trainer.id),
  );
  const goals = (myGoals ?? []) as GoalRow[];
  const plans = (myPlans ?? []) as PlanRow[];
  const canUseAi = Boolean(process.env.OPENAI_API_KEY);
  const canCoach = access.has("training.view_assigned");

  let coachAssignments: AssignmentRow[] = [];
  let coachProfiles = new Map<string, ProfileRow>();
  let coachGoals = new Map<string, GoalRow[]>();
  let coachActivities = new Map<string, StravaActivityRow[]>();
  let coachPlans = new Map<string, PlanRow[]>();
  let coachWorkouts = new Map<string, WorkoutRow[]>();

  if (canCoach) {
    const { data: assignmentRows } = await supabase
      .from("training_coach_assignments")
      .select("id, athlete_id, trainer_id, status, notes, granted_at")
      .eq("trainer_id", user.id)
      .eq("status", "active")
      .order("granted_at", { ascending: false });
    coachAssignments = (assignmentRows ?? []) as AssignmentRow[];
    const athleteIds = coachAssignments.map((assignment) => assignment.athlete_id);
    if (athleteIds.length > 0) {
      const [{ data: profileRows }, { data: goalRows }, { data: activityRows }, { data: planRows }, { data: workoutRows }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, display_name, ftp_watts, weight_kg, zrl_category")
            .in("id", athleteIds),
          supabase
            .from("training_goals")
            .select("*")
            .in("profile_id", athleteIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("strava_activities")
            .select(
              "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer",
            )
            .in("profile_id", athleteIds)
            .gte("start_date", since28.toISOString())
            .order("start_date", { ascending: false }),
          supabase
            .from("training_plans")
            .select("*")
            .in("profile_id", athleteIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("training_workouts")
            .select("*")
            .in("profile_id", athleteIds)
            .gte("scheduled_at", since21Workouts.toISOString())
            .order("scheduled_at", { ascending: true }),
        ]);
      coachProfiles = new Map(((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
      coachGoals = byProfile((goalRows ?? []) as GoalRow[]);
      coachActivities = byProfile((activityRows ?? []) as StravaActivityRow[]);
      coachPlans = byProfile((planRows ?? []) as PlanRow[]);
      coachWorkouts = byPlan((workoutRows ?? []) as WorkoutRow[]);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">ZWB Training</p>
          <h1 className="text-3xl font-semibold tracking-tight">Coach-cockpit</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Persoonlijke trainingsdata, doelen en schema&apos;s. AI maakt alleen concepten;
            een trainer keurt altijd goed voordat iets wordt gepubliceerd.
          </p>
        </div>
        {conn ? <DisconnectIntervalsButton /> : null}
      </header>

      {fetchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {fetchError}
        </p>
      )}

      {!conn && (
        <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-semibold">Koppel intervals.icu</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Voor coachschema&apos;s gebruiken we intervals.icu als trainingskalender.
              Zonder koppeling kun je wel doelen invullen, maar publiceren lukt nog niet.
            </p>
          </div>
          <ConnectIntervalsForm />
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={TrendingUp}
          label="Fitness (CTL)"
          value={formatNumber(latest?.ctl, 1)}
          hint="Lange termijn vorm uit intervals.icu"
        />
        <MetricCard
          icon={Activity}
          label="Form (TSB)"
          value={formatNumber(
            latest?.ctl !== undefined && latest?.atl !== undefined ? latest.ctl - latest.atl : undefined,
            1,
          )}
          hint="Positief = fris, negatief = vermoeid"
        />
        <MetricCard
          icon={Mountain}
          label="eFTP"
          value={eftpLatest ? `${Math.round(eftpLatest)}w` : "-"}
          hint={
            eftpDelta !== null
              ? `${eFTPDeltaLabel(eftpDelta)} over 90 dagen`
              : `${myProfile?.ftp_watts ?? "-"}w in profiel`
          }
        />
        <MetricCard
          icon={Calendar}
          label="14 dagen totaal"
          value={formatKm(totals14.distance)}
          hint={
            activities.length > 0
              ? `${activities.length} ritten - ${formatHours(totals14.time)} - ${formatMeters(totals14.elevation)}`
              : "Nog geen recente Strava-ritten"
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5 text-primary" />
            Trainer-toegang
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jij bepaalt welke trainer jouw trainingsdata en doelen mag zien.
          </p>
          <div className="mt-4 space-y-2">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen trainer gekoppeld.</p>
            ) : (
              assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 p-3"
                >
                  <span className="text-sm font-medium">
                    {trainerMap.get(assignment.trainer_id)?.display_name ?? "Trainer"}
                  </span>
                  <form action={formAction(revokeTrainerAccess)}>
                    <input type="hidden" name="assignment_id" value={assignment.id} />
                    <button className="rounded-md border px-3 py-1 text-xs hover:bg-accent">
                      Intrekken
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
          {selectableTrainers.length > 0 && (
            <form action={formAction(grantTrainerAccess)} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <select name="trainer_id" className="rounded-md border bg-background px-3 py-2 text-sm">
                {selectableTrainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.display_name ?? "Trainer"}
                  </option>
                ))}
              </select>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Toegang geven
              </button>
            </form>
          )}
        </div>

        <form action={formAction(createTrainingGoal)} className="rounded-lg border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ClipboardList className="size-5 text-primary" />
            Nieuw trainingsdoel
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm">
              Titel
              <input name="title" required placeholder="ZRL Round 5 pieken" className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
            </label>
            <label className="text-sm">
              Doeltype
              <select name="goal_type" className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                {Object.entries(GOAL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Targetdatum
              <input name="target_date" type="date" className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
            </label>
            <label className="text-sm">
              Uren per week
              <input name="max_hours_per_week" type="number" min="1" max="30" step="0.5" className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
            </label>
            <label className="text-sm">
              Voorkeur
              <select name="preferred_mode" className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                <option value="mixed">Mix</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
              </select>
            </label>
            <label className="text-sm">
              Ervaring
              <select name="experience_level" className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                <option value="intermediate">Gemiddeld</option>
                <option value="beginner">Beginner</option>
                <option value="advanced">Gevorderd</option>
              </select>
            </label>
            <label className="text-sm">
              Belasting
              <select name="desired_intensity" className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                <option value="balanced">Gebalanceerd</option>
                <option value="easy">Voorzichtig</option>
                <option value="hard">Ambitieus</option>
              </select>
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm">Beschikbare dagen</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {["ma", "di", "wo", "do", "vr", "za", "zo"].map((day) => (
                  <label key={day} className="rounded-md border px-2 py-1 text-sm">
                    <input type="checkbox" name="available_days" value={day} className="mr-1" />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="sm:col-span-2 text-sm">
              Blessures, risico&apos;s of aandachtspunten
              <textarea name="risk_notes" rows={3} className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
            </label>
          </div>
          <button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Doel opslaan
          </button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Mijn doelen</h2>
          </div>
          {goals.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nog geen trainingsdoelen.</p>
          ) : (
            <ul className="divide-y">
              {goals.map((goal) => (
                <li key={goal.id} className="p-4">
                  <p className="font-medium">{goal.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {GOAL_LABELS[goal.goal_type] ?? goal.goal_type}
                    {goal.target_date ? ` - ${new Date(goal.target_date).toLocaleDateString("nl-NL")}` : ""}
                    {goal.max_hours_per_week ? ` - max ${goal.max_hours_per_week}u/week` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Komende workouts</h2>
            <p className="text-sm text-muted-foreground">
              Uit intervals.icu en ZWB-schema&apos;s.
            </p>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Geen geplande intervals-workouts in de komende 14 dagen.</p>
          ) : (
            <ul className="divide-y">
              {upcomingEvents.map((event) => (
                <li key={String(event.id)} className="grid gap-2 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                  <span className="text-sm text-muted-foreground">
                    {new Date(event.start_date_local).toLocaleDateString("nl-NL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <p className="truncate font-medium">{event.name ?? "Workout"}</p>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {event.icu_training_load ? `${Math.round(event.icu_training_load)} TSS` : "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Mijn ZWB-schema&apos;s</h2>
        </div>
        {plans.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nog geen ZWB-trainingsschema&apos;s.</p>
        ) : (
          <div className="divide-y">
            {plans.map((plan) => (
              <article key={plan.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <h3 className="font-semibold">{plan.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(plan.start_date).toLocaleDateString("nl-NL")} - {new Date(plan.end_date).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                  <PlanBadge status={plan.status} />
                </div>
                {plan.summary && <p className="px-4 pb-3 text-sm text-muted-foreground whitespace-pre-line">{plan.summary}</p>}
                <WorkoutList workouts={myWorkoutsByPlan.get(plan.id) ?? []} editable={false} />
              </article>
            ))}
          </div>
        )}
      </section>

      {canCoach && (
        <section className="space-y-4 border-t pt-8">
          <header>
            <p className="text-sm text-muted-foreground">Trainer-view</p>
            <h2 className="flex items-center gap-2 text-2xl font-semibold">
              <Users className="size-6 text-primary" />
              Toegewezen leden
            </h2>
          </header>
          {coachAssignments.length === 0 ? (
            <p className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
              Nog geen leden hebben jou trainer-toegang gegeven.
            </p>
          ) : (
            <div className="space-y-4">
              {coachAssignments.map((assignment) => {
                const athlete = coachProfiles.get(assignment.athlete_id);
                const athleteGoals = coachGoals.get(assignment.athlete_id) ?? [];
                const athleteActivities = coachActivities.get(assignment.athlete_id) ?? [];
                const athletePlans = coachPlans.get(assignment.athlete_id) ?? [];
                const totals = loadSummary(athleteActivities);
                return (
                  <article key={assignment.id} className="rounded-lg border bg-card">
                    <div className="border-b p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{athlete?.display_name ?? "ZWB-lid"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {athlete?.zrl_category ? `ZRL ${athlete.zrl_category} - ` : ""}
                            FTP {athlete?.ftp_watts ?? "-"}w - 28 dagen: {athleteActivities.length} ritten,
                            {" "}{formatKm(totals.distance)}, {formatHours(totals.time)}
                          </p>
                        </div>
                        <Link
                          href={`/leden/${assignment.athlete_id}`}
                          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                          Profiel <ExternalLink className="size-3" />
                        </Link>
                      </div>
                    </div>

                    <div className="grid gap-4 p-4 xl:grid-cols-[360px_1fr]">
                      <div className="space-y-3">
                        <h4 className="font-medium">Doelen</h4>
                        {athleteGoals.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Geen actieve intake gevonden.</p>
                        ) : (
                          athleteGoals.map((goal) => (
                            <div key={goal.id} className="rounded-md bg-muted/40 p-3">
                              <p className="font-medium">{goal.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {GOAL_LABELS[goal.goal_type] ?? goal.goal_type}
                                {goal.target_date ? ` - ${new Date(goal.target_date).toLocaleDateString("nl-NL")}` : ""}
                              </p>
                              <form action={formAction(generateAiDraft)} className="mt-3">
                                <input type="hidden" name="athlete_id" value={assignment.athlete_id} />
                                <input type="hidden" name="goal_id" value={goal.id} />
                                <button
                                  disabled={!canUseAi || !access.has("training.ai_generate")}
                                  className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Bot className="size-4" />
                                  AI-concept maken
                                </button>
                              </form>
                              {!canUseAi && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  OPENAI_API_KEY ontbreekt nog in de omgeving.
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Schema&apos;s</h4>
                        {athletePlans.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nog geen schema&apos;s voor dit lid.</p>
                        ) : (
                          athletePlans.map((plan) => (
                            <div key={plan.id} className="rounded-md border">
                              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-3">
                                <div>
                                  <p className="font-medium">{plan.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(plan.start_date).toLocaleDateString("nl-NL")} - {new Date(plan.end_date).toLocaleDateString("nl-NL")}
                                  </p>
                                </div>
                                <PlanBadge status={plan.status} />
                              </div>
                              <div className="flex flex-wrap gap-2 border-b p-3">
                                <form action={formAction(setPlanStatus)}>
                                  <input type="hidden" name="plan_id" value={plan.id} />
                                  <input type="hidden" name="status" value="review" />
                                  <button className="rounded-md border px-3 py-1 text-xs hover:bg-accent">
                                    Naar review
                                  </button>
                                </form>
                                <form action={formAction(setPlanStatus)}>
                                  <input type="hidden" name="plan_id" value={plan.id} />
                                  <input type="hidden" name="status" value="approved" />
                                  <button className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-accent">
                                    <CheckCircle2 className="size-3" />
                                    Goedkeuren
                                  </button>
                                </form>
                                <form action={formAction(publishTrainingPlan)}>
                                  <input type="hidden" name="plan_id" value={plan.id} />
                                  <button
                                    disabled={!access.has("training.publish_plans")}
                                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                                  >
                                    <Send className="size-3" />
                                    Publiceren
                                  </button>
                                </form>
                              </div>
                              <WorkoutList workouts={coachWorkouts.get(plan.id) ?? []} editable />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function eFTPDeltaLabel(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta.toFixed(0)}w`;
}
