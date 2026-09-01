// AI-generatie van het pacingplan.
//
// Zelfde patroon als src/lib/training/ai.ts: de Responses API van OpenAI met een
// strict json_schema als contract, en background-modus met polling omdat een
// Netlify-functie ruim vóór het model klaar is. De verschillen staan hieronder
// bij de betreffende functies.

import { defaultPacingPrompt } from "@/lib/pacing/prompt";

export type PacingAiStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"
  | "incomplete";

/** Wat het model teruggeeft; nog niet begrensd of doorgerekend. */
export type GeneratedPacingPlan = {
  strategy: string;
  risks: string[];
  segments: Array<{
    startKm: number;
    endKm: number;
    targetWkg: number;
    label: string;
    effort: "rustig" | "duur" | "tempo" | "drempel" | "vol";
    rationale: string;
    /** Verwijst naar een accent uit de route, of leeg voor een tussenstuk. */
    accentId: string;
  }>;
};

export type PacingAiInput = {
  athleteName: string;
  event: {
    title: string;
    type: string;
    date: string;
    /** "zwift" of "gpx" — bepaalt of drafting überhaupt speelt. */
    routeSource: "gpx" | "zwift";
    distanceKm: number;
    elevationM: number;
    laps: number | null;
    /**
     * Zwift-regels die het karakter bepalen (doubledraft, ttbikes). Puur ter
     * informatie: het rekenmodel doet niets met slipstream.
     */
    tags?: string[];
  };
  /**
   * Het parcours zoals het lid het gaat tegenkomen, met absolute kilometrering.
   * `id` is waarmee het model naar een accent verwijst.
   */
  accents: Array<{
    id: string;
    name: string;
    kind: "climb" | "sprint";
    startKm: number;
    endKm: number;
    lengthKm: number;
    avgGradientPct: number;
    lap: number | null;
  }>;
  rider: {
    cpWatts: number;
    /**
     * Waar CP vandaan komt. Staat erbij omdat het model anders niet weet of het
     * met een gemeten drempel rekent of met een clubbrede schatting.
     */
    cpSource: string;
    wPrimeJoules: number;
    ftpWatts: number | null;
    weightKg: number;
    riderType: string;
    /** Alleen de duren die voor pacing uitmaken. */
    powerCurve: Array<{ seconds: number; watts: number }>;
    /**
     * Hoeveel procent CP er af gaat na een berg werk, als het lid
     * vermoeidheidscurves heeft. Zonder dit weet het model niet dat het einde
     * van een lange rit zwaarder is dan het begin.
     */
    durabilityFadePct: number | null;
  };
  /** Actuele belasting/vorm uit intervals.icu. */
  form?: {
    ctl: number | null;
    atl: number | null;
    tsb: number | null;
  } | null;
  /**
   * Het doorgerekende basisvoorstel. Zonder dit begint het model met een leeg
   * vel en verzint het een verdeling; met dit voorstel verbetert het er een.
   */
  baseline: {
    segments: Array<{
      startKm: number;
      endKm: number;
      targetWkg: number;
      label: string;
    }>;
    estimatedMinutes: number;
    avgWkg: number;
    deepestDrawPct: number;
  };
  /** Wat het lid op vergelijkbare parcours werkelijk deed. */
  similarRides: Array<{
    name: string;
    date: string;
    distanceKm: number;
    elevationM: number;
    durationMinutes: number;
    watts: number | null;
    wkg: number | null;
    why: string;
  }>;
  /** Wat het lid zelf van dit event wil. */
  goal?: string | null;
};

const EFFORTS = ["rustig", "duur", "tempo", "drempel", "vol"] as const;

/**
 * Het contract met het model. `strict: true` betekent dat elk veld verplicht is
 * en er niets extra's bij mag; dat scheelt validatiecode aan onze kant.
 * `maxItems: 30` staat er omdat een plan dat je niet kunt onthouden geen plan is.
 */
const planSchema = {
  type: "object",
  additionalProperties: false,
  required: ["strategy", "risks", "segments"],
  properties: {
    strategy: { type: "string" },
    risks: { type: "array", items: { type: "string" } },
    segments: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "startKm",
          "endKm",
          "targetWkg",
          "label",
          "effort",
          "rationale",
          "accentId",
        ],
        properties: {
          startKm: { type: "number" },
          endKm: { type: "number" },
          targetWkg: { type: "number" },
          label: { type: "string" },
          effort: { type: "string", enum: [...EFFORTS] },
          rationale: { type: "string" },
          accentId: { type: "string" },
        },
      },
    },
  },
} as const;

type PacingAiOptions = {
  model?: string;
  reasoningEffort?: "low" | "medium" | "high";
  timeoutMs?: number;
};

/**
 * Eigen env-variabele met terugval op die van de trainingsmodule, zodat het
 * pacingplan op een ander (goedkoper of sneller) model gezet kan worden zonder
 * de schema-generatie te raken.
 */
export function getPacingModel(options: PacingAiOptions = {}) {
  return (
    options.model?.trim() ||
    process.env.OPENAI_PACING_MODEL?.trim() ||
    process.env.OPENAI_TRAINING_MODEL?.trim() ||
    "gpt-5.5"
  );
}

function requireOpenAiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ontbreekt. Zet deze in Netlify env om pacingplannen te laten genereren.");
  }
  return apiKey;
}

// GPT-5.x / o-serie accepteren `reasoning` op de Responses API; gpt-4.x niet.
function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o[134])/i.test(model);
}

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

function buildRequestBody(
  input: PacingAiInput,
  promptText: string,
  model: string,
  options: PacingAiOptions,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    model,
    instructions: promptText,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Maak een pacingplan op basis van dit parcours, deze renner en dit basisvoorstel:\n${JSON.stringify(input, null, 2)}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "zwb_pacing_plan",
        strict: true,
        schema: planSchema,
      },
    },
  };
  if (isReasoningModel(model)) {
    body.reasoning = { effort: options.reasoningEffort ?? "medium" };
  }
  return body;
}

function parsePlanResponse(body: unknown): GeneratedPacingPlan {
  const text = outputText(body);
  if (!text) throw new Error("OpenAI gaf geen pacingplan terug.");
  return JSON.parse(text) as GeneratedPacingPlan;
}

async function fetchOpenAi(
  url: string,
  apiKey: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("OpenAI duurde te lang. Probeer het opnieuw.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function startPacingPlanBackground(
  input: PacingAiInput,
  promptText = defaultPacingPrompt(),
  options: PacingAiOptions = {},
): Promise<{
  responseId: string;
  status: PacingAiStatus;
  model: string;
  promptSummary: string;
}> {
  const apiKey = requireOpenAiKey();
  const model = getPacingModel(options);
  const promptSummary = JSON.stringify(input, null, 2);

  const res = await fetchOpenAi(
    "https://api.openai.com/v1/responses",
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        ...buildRequestBody(input, promptText, model, options),
        background: true,
        store: true,
      }),
    },
    options.timeoutMs ?? 20_000,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 240)}`);
  }

  const body = (await res.json()) as { id?: string; status?: PacingAiStatus };
  if (!body.id) throw new Error("OpenAI gaf geen response-id terug.");
  return {
    responseId: body.id,
    status: body.status ?? "queued",
    model,
    promptSummary,
  };
}

export async function retrievePacingPlan(
  responseId: string,
  options: Pick<PacingAiOptions, "timeoutMs"> = {},
): Promise<
  | { status: "queued" | "in_progress" }
  | { status: "completed"; plan: GeneratedPacingPlan; responseJson: unknown }
  | { status: "failed" | "cancelled" | "incomplete"; error: string; responseJson: unknown }
> {
  const apiKey = requireOpenAiKey();
  const res = await fetchOpenAi(
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
    status?: PacingAiStatus;
    error?: { message?: string } | null;
    incomplete_details?: { reason?: string } | null;
  };
  const status = body.status ?? "in_progress";
  if (status === "queued" || status === "in_progress") return { status };
  if (status === "completed") {
    return { status, plan: parsePlanResponse(body), responseJson: body };
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

export { defaultPacingPrompt };
