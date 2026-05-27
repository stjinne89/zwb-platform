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
              required: ["label", "durationMinutes", "target", "notes"],
              properties: {
                label: { type: "string" },
                durationMinutes: { type: "number" },
                target: { type: "string" },
                notes: { type: "string" },
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

export async function generateTrainingPlanDraft(
  input: TrainingAiInput,
): Promise<{ model: string; promptSummary: string; plan: GeneratedTrainingPlan }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ontbreekt. Zet deze in Netlify env om AI-drafts te maken.");
  }

  const model = process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-4.1-mini";
  const promptSummary = JSON.stringify(input, null, 2);
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions:
        "Je bent een Nederlandse wielercoach-assistent voor ZWB Cycling. Maak veilige, realistische concept-workouts voor review door een menselijke trainer. Geef geen medisch advies. Respecteer beschikbaarheid en max uren. Bouw gestructureerde workouts met duidelijke blokken. Beschrijf elk trainingsblok met RPE plus doelwattage of wattagerange wanneer FTP bekend is, bijvoorbeeld 'RPE 6, 210-235w'. Als FTP ontbreekt, gebruik RPE en korte gevoelstaal. Kies targetType bij voorkeur 'power' wanneer FTP bekend is.",
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
    }),
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
