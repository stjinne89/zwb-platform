import { defaultTrainingPrompt } from "@/lib/training/workouts";
import type { ComplianceContext } from "@/lib/training/compliance";

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

export type TrainingAiResponseStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"
  | "incomplete";

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
  /**
   * Wat het lid werkelijk heeft gereden. `days` staat erbij omdat het model
   * anders zelf een periode aanneemt: het deelde de 28-daagse optelsom door vier
   * en vergeleek dat weekgemiddelde met maxHoursPerWeek, alsof dat een
   * overschrijding was die het moest compenseren.
   */
  recentLoad: {
    days: number;
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
    /** 'afgeleid' = door ZWB berekend uit HRV/rust-HR/slaap, geen meting. */
    readinessSource: "device" | "afgeleid" | null;
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
  /**
   * Minuten per weekdag die het lid deze week heeft. Gaat vóór
   * goal.availableDays: dat kent alleen dagen, dit ook de tijd per dag.
   */
  availability?: {
    weekStart: string | null;
    minutesByDay: Record<string, number>;
    source: "week" | "default";
  } | null;
  /** Zelf ingeplande ritten (clubrit, buitenrit): die liggen vast. */
  fixedWorkouts?: Array<{
    date: string;
    title: string;
    durationMinutes: number;
    intensity: string;
    kind: "eigen_rit";
  }>;
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
  /** Naleving van het lopende schema: gepland vs. werkelijk gereden. */
  compliance?: ComplianceContext | null;
  /**
   * Het lopende schema waar een dag-aanpassing op ingrijpt: wat er nog gepland
   * staat vanaf vandaag. Zonder dit zou de AI de week opnieuw moeten verzinnen.
   */
  currentPlan?: {
    title: string;
    fromDate: string;
    toDate: string;
    workouts: Array<{
      date: string;
      title: string;
      durationMinutes: number;
      intensity: string;
    }>;
  } | null;
  /** Alleen bij "schema bijwerken": wat er verandert en welk deel opnieuw mag. */
  planUpdate?: {
    reason: string;
    fromDate: string;
    toDate: string;
    previousTitle: string;
    previousSummary: string | null;
    changed: {
      hoursPerWeek?: [number | null, number | null];
      intensity?: [string, string];
      goalType?: [string, string];
      targetDate?: [string | null, string | null];
      availableDays?: [string[], string[]];
    };
    remainingWorkouts: Array<{
      date: string;
      title: string;
      durationMinutes: number;
      intensity: string;
    }>;
  } | null;
};

/**
 * `minWorkouts` verschilt per flow: een nieuw plan of een bijwerking beslaat
 * meerdere weken, maar een dag-aanpassing gaat vaak over één training. Stond dat
 * minimum op 3, dan dwong het strict schema de AI om er twee bij te verzinnen —
 * en die overschreven bij publicatie de echte workouts van die dagen.
 */
const planSchema = (minWorkouts: number) => ({
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
      minItems: minWorkouts,
      // Een bijwerking beslaat de rest van het lopende schema en kan daarmee
      // meer weken omvatten dan een nieuw concept van drie weken.
      maxItems: 42,
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
});

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

type GenerateTrainingPlanOptions = {
  model?: string;
  reasoningEffort?: "low" | "medium" | "high";
  timeoutMs?: number;
  /** Minimum aantal workouts dat het antwoord moet bevatten. Default 3. */
  minWorkouts?: number;
};

function getTrainingModel(options: GenerateTrainingPlanOptions) {
  return options.model?.trim() || process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-5.5";
}

function requireOpenAiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ontbreekt. Zet deze in Netlify env om AI-drafts te maken.");
  }
  return apiKey;
}

function buildTrainingPlanRequestBody(
  input: TrainingAiInput,
  promptText: string,
  model: string,
  options: GenerateTrainingPlanOptions,
) {
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
            text: `Maak een trainingsplan-concept op basis van deze intake en recente data:\n${JSON.stringify(input, null, 2)}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "zwb_training_plan",
        strict: true,
        schema: planSchema(options.minWorkouts ?? 3),
      },
    },
  };
  if (isReasoningModel(model)) {
    requestBody.reasoning = { effort: options.reasoningEffort ?? "medium" };
  }
  return requestBody;
}

function parseTrainingPlanResponse(body: unknown): GeneratedTrainingPlan {
  const text = outputText(body);
  if (!text) throw new Error("OpenAI gaf geen plan terug.");
  return JSON.parse(text) as GeneratedTrainingPlan;
}

async function fetchOpenAiResponse(
  url: string,
  apiKey: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: abortController.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("OpenAI duurde te lang. Probeer opnieuw of gebruik een sneller trainingsmodel.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateTrainingPlanDraft(
  input: TrainingAiInput,
  promptText = defaultTrainingPrompt(),
  options: GenerateTrainingPlanOptions = {},
): Promise<{ model: string; promptSummary: string; plan: GeneratedTrainingPlan }> {
  const apiKey = requireOpenAiKey();
  const model = getTrainingModel(options);
  const timeoutMs = options.timeoutMs ?? 45_000;
  const promptSummary = JSON.stringify(input, null, 2);
  const requestBody = buildTrainingPlanRequestBody(input, promptText, model, options);

  const res = await fetchOpenAiResponse(
    "https://api.openai.com/v1/responses",
    apiKey,
    {
      method: "POST",
      body: JSON.stringify(requestBody),
    },
    timeoutMs,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 240)}`);
  }

  const body = await res.json();
  return {
    model,
    promptSummary,
    plan: parseTrainingPlanResponse(body),
  };
}

export async function startTrainingPlanDraftBackground(
  input: TrainingAiInput,
  promptText = defaultTrainingPrompt(),
  options: GenerateTrainingPlanOptions = {},
): Promise<{ responseId: string; status: TrainingAiResponseStatus; model: string; promptSummary: string }> {
  const apiKey = requireOpenAiKey();
  const model = getTrainingModel(options);
  const promptSummary = JSON.stringify(input, null, 2);
  const requestBody = {
    ...buildTrainingPlanRequestBody(input, promptText, model, options),
    background: true,
    store: true,
  };

  const res = await fetchOpenAiResponse(
    "https://api.openai.com/v1/responses",
    apiKey,
    {
      method: "POST",
      body: JSON.stringify(requestBody),
    },
    options.timeoutMs ?? 20_000,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 240)}`);
  }

  const body = (await res.json()) as {
    id?: string;
    status?: TrainingAiResponseStatus;
  };
  if (!body.id) throw new Error("OpenAI gaf geen response-id terug.");
  return {
    responseId: body.id,
    status: body.status ?? "queued",
    model,
    promptSummary,
  };
}

export async function retrieveTrainingPlanDraftBackground(
  responseId: string,
  options: Pick<GenerateTrainingPlanOptions, "timeoutMs"> = {},
): Promise<
  | { status: "queued" | "in_progress" }
  | { status: "completed"; plan: GeneratedTrainingPlan; responseJson: unknown }
  | { status: "failed" | "cancelled" | "incomplete"; error: string; responseJson: unknown }
> {
  const apiKey = requireOpenAiKey();
  const res = await fetchOpenAiResponse(
    `https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}`,
    apiKey,
    { method: "GET" },
    options.timeoutMs ?? 15_000,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 240)}`);
  }

  const body = (await res.json()) as {
    status?: TrainingAiResponseStatus;
    error?: { message?: string } | null;
    incomplete_details?: { reason?: string } | null;
  };
  const status = body.status ?? "in_progress";
  if (status === "queued" || status === "in_progress") return { status };
  if (status === "completed") {
    return { status, plan: parseTrainingPlanResponse(body), responseJson: body };
  }
  return {
    status,
    error:
      body.error?.message ??
      body.incomplete_details?.reason ??
      `OpenAI response eindigde met status ${status}.`,
    responseJson: body,
  };
}

export { defaultTrainingPrompt };
