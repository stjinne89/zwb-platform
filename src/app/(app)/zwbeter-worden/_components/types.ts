// Rijtypes die door meerdere ZWBeter Worden-subpagina's worden gedeeld. Ze
// spiegelen de kolommen van de training_*-tabellen zoals we ze selecteren.

import type { WellnessSummary } from "@/lib/training/wellness";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  ftp_watts: number | null;
  weight_kg: number | string | null;
  zrl_category: string | null;
  zrl_division: string | null;
  wellness_device: string | null;
  community_roles?: string[] | null;
};

export type StravaActivityRow = {
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

export type AssignmentRow = {
  id: string;
  athlete_id: string;
  trainer_id: string;
  status: string;
  notes: string | null;
  granted_at: string;
};

export type GoalRow = {
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

export type PlanRow = {
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
  adaptation_reason: string | null;
  parent_plan_id: string | null;
  /** Het schema waar deze rij bij hoort; voor een basisplan het eigen id. */
  root_plan_id: string | null;
  adaptation_kind: string | null;
  adapt_from_date: string | null;
  ctl_projection_json?: Record<string, unknown> | null;
};

export type WorkoutRow = {
  id: string;
  plan_id: string;
  profile_id: string;
  scheduled_at: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  intensity: string;
  target_type: string;
  structure_json: Array<{
    label?: string;
    durationMinutes?: number;
    target?: string;
    notes?: string;
    intensity?: string;
  }> | null;
  status: string;
  publish_status: string;
  publish_error: string | null;
  intervals_event_id: string | null;
  intervals_external_id: string | null;
  /** 'member' is een rit die het lid zelf heeft ingepland; die ligt vast. */
  origin: string;
  superseded_at: string | null;
};

export type WorkoutReportRow = {
  id: string;
  workout_id: string;
  profile_id: string;
  athlete_rpe: number | null;
  athlete_feel: string | null;
  athlete_report: string | null;
  trainer_feedback: string | null;
  updated_at: string;
};

export type AiGenerationRow = {
  id: string;
  profile_id: string;
  goal_id: string | null;
  status: "queued" | "in_progress" | "completed" | "failed" | "cancelled";
  error: string | null;
  created_at: string;
};

export type SegmentRow = {
  segment_slug: string;
  best_time_seconds: number | null;
  zwb_segments:
    | {
        name: string;
        distance_m: number | string | null;
        elevation_gain_m: number | string | null;
        virtual: boolean | null;
      }
    | Array<{
        name: string;
        distance_m: number | string | null;
        elevation_gain_m: number | string | null;
        virtual: boolean | null;
      }>
    | null;
};

export type CoachLoadMetric = {
  ctl?: number;
  tsb?: number;
  eftp?: number;
  error?: string;
};

export type CoachRecoveryState = {
  optedIn: boolean;
  summary: WellnessSummary | null;
};

export type SearchParamsProp = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
