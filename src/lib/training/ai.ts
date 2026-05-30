import { defaultTrainingPrompt } from "@/lib/training/workouts";

export type GeneratedWorkout = {
  date: string;
  title: string;
  description: string;
  durationMinutes: number;
  intensity: "recovery" | "endurance" | "tempo" | "threshold" | "vo2max" | "anaerobic" | "race" | "rest";
  targetType: "power" | "heart_rate" | "rpe" | "free";
  structure: Array<{
    label: string;
    durationMinutes: number;
    target: string;
    notes: string;
    intensity: "recovery" | "endurance" | "tempo" | "threshold" | "vo2max" | "anaerobic" | "race" | "rest";
  }>;
};

export type GeneratedTrainingPlan = {
  title: string;
  summary: string;
  startDate: string;
  endDate: string;
  workouts: GeneratedWorkout[];
  cautions: string[];
};

export type TrainingAiInput = {
  athleteName: string;
  goal: {
    title: string;
    type: string;
    targetDate: string | null;
    availableDays: string[];
    maxHoursPerWeek: number | null;
    preferredMode: string;
    experienceLevel: string;
    desiredIntensity: string;
    riskNotes: string | null;
  };
  profile: {
    ftpWatts: number | null;
    weightKg: number | null;
    zrlCategory: string | null;
  };
  recentLoad: {
    activities: number;
    distanceKm: number;
    elevationM: number;
    hours: number;
  };
  /** Herstel-trend uit intervals.icu (alleen als het lid wellness deelt). */
  wellness?: {
    days: number;
    state: "fresh" | "normal" | "fatigued" | "unknown";
    restingHr: number | null;
    hrv: number | null;
    sleepHours: number | null;
    readiness: number | null;
    note: string;
  } | null;
  /** Actuele belasting/vorm uit intervals.icu (CTL/ATL/TSB/eFTP). */
  intervalsLoad?: {
    ctl: number | null; // fitness
    atl: number | null; // vermoeidheid
    tsb: number | null; // vorm (ctl-atl)
    eftp: number | null;
    rampRate: number | null;
  } | null;
  /** Aankomende events/races waar het schema omheen moet plannen. */
  upcomingEvents?: Array<{ title: string; type: string; date: string }>;
  /** Renner-signaal voor vandaag (dag-aanpassing): tijd + gevoel. */
  today?: {
    availableMinutes: number | null;
    feeling: "tired" | "normal" | "fresh" | null;
    note: string | null;
  } | null;
  /** Geplande workout van gisteren vs. wat de renner werkelijk deed. */
  yesterday?: {
    plannedTitle: string | null;
    plannedMinutes: number | null;
    plannedIntensity: string | null;
    actualName: string | null;
    actualMinutes: number | null;
    actualLoad: number | null; // TSS/training load indien bekend
  } | null;
};

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "startDate", "endDate", "workouts", "cautions"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    cautions: { type: "array", items: { type: "string" } },
    workouts: {
      type: "array",
      minItems: 3,
      maxItems: 21,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "date",
          "title",
          "description",
          "durationMinutes",
          "intensity",
          "targetType",
          "structure",
        ],
        properties: {
          date: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          durationMinutes: { type: "number" },
          intensity: {
            type: "string",
            enum: [
              "recovery",
              "endurance",
              "tempo",
              "threshold",
              "vo2max",
              "anaerobic",
              "race",
              "rest",
            ],
          },
          targetType: { type: "string", enum: ["power", "heart_rate", "rpe", "free"] },
          structure: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "durationMinutes", "target", "notes", "intensity"],
              properties: {
                label: { type: "string" },
                durationMinutes: { type: "number" },
                target: { type: "string" },
                notes: { type: "string" },
                intensity: {
                  type: "string",
                  enum: [
                    "recovery",
                    "endurance",
                    "tempo",
                    "threshold",
                    "vo2max",
                    "anaerobic",
                    "race",
                    "rest",
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
};

function outputText(response: unknown): string {
  const record = response as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (record.output_text) return record.output_text;
  return (
    record.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

// GPT-5.x / o-serie zijn reasoning-modellen die het `reasoning`-veld accepteren
// op de Responses API; gpt-4.x niet. Zo blijft de env-override naar een ouder
// model werken zonder 400.
function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o[134])/i.test(model);
}

export async function generateTrainingPlanDraft(
  input: TrainingAiInput,
  promptText = defaultTrainingPrompt(),
  options: { reasoningEffort?: "low" | "medium" | "high" } = {},
): Promise<{ model: string; promptSummary: string; plan: GeneratedTrainingPlan }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ontbreekt. Zet deze in Netlify env om AI-drafts te maken.");
  }

  const model = process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-5.5";
  const promptSummary = JSON.stringify(input, null, 2);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestBody: Record<string, any> = {
    model,
    instructions: promptText,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Maak een trainingsplan-concept op basis van deze intake en recente data:\n${promptSummary}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "zwb_training_plan",
        strict: true,
        schema: PLAN_SCHEMA,
      },
    },
  };
  if (isReasoningModel(model)) {
    requestBody.reasoning = { effort: options.reasoningEffort ?? "medium" };
  }
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 240)}`);
  }

  const body = await res.json();
  const text = outputText(body);
  if (!text) throw new Error("OpenAI gaf geen plan terug.");
  return {
    model,
    promptSummary,
    plan: JSON.parse(text) as GeneratedTrainingPlan,
  };
}

export { defaultTrainingPrompt };
