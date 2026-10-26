import type { ProtocolForAi } from "@/lib/protocols";
import { defaultTrainingPrompt } from "@/lib/training/workouts";
import type { ComplianceContext } from "@/lib/training/compliance";
import type { PreferenceForAi } from "@/lib/training/preferences";
import { PLAN_BLOCK_DAYS } from "@/lib/training/season";
import type { GoalTargetForAi } from "@/lib/training/goal-forecast";
import type { CurrentLoad } from "@/lib/training/load-basis";
import {
  createClaudeJob,
  isClaudeJobId,
  readClaudeJob,
  runClaude,
  todayLine,
  type ClaudeRequest,
} from "@/lib/ai/claude";
import { claudeSettings, usesClaude, type AiKind } from "@/lib/ai/settings";

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
    /** Burst aan het begin van het blok, in seconden; 0 zonder. Zie WorkoutBlock.burstSeconds. */
    burstSeconds?: number;
    /** Korte herhalingen (30/15): 0 als het blok er geen heeft. Zie WorkoutBlock.onOff. */
    onSeconds?: number;
    offSeconds?: number;
    offTarget?: string;
  }>;
  /** "veelbelovend" of "experimenteel" voor een methode uit de onderzoeksronde van 2026-10-16; anders "geen". */
  methodLabel?: "geen" | "veelbelovend" | "experimenteel";
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
    /**
     * Doeltijd voor een gran fondo of outdoor event, met de laatste prognose van
     * het pacingmodel: oordeel, benodigde CP en de nadruk voor het schema. Een
     * toetssteen, geen opdracht om meer te plannen; zie
     * docs/doeltijd-trainingsdoel.md.
     */
    targetTime?: GoalTargetForAi | null;
  };
  profile: {
    ftpWatts: number | null;
    /**
     * Datum van de laatste FTP-test, of null als er nooit een is gedaan. Zonder
     * dit weet de planner niet of hij met een verse of een jaar oude drempel
     * rekent, terwijl elk wattage eraan hangt.
     */
    ftpTestedOn: string | null;
    weightKg: number | null;
    zrlCategory: string | null;
    sex: string | null;
  };
  /**
   * Klachtenlast uit het logboek van het lid, als die het logboek aan heeft
   * staan. Bewust geen cyclusfase: fase-effecten op prestatie zijn in de
   * literatuur inconsistent, klachtenlast hangt wél samen met belastbaarheid.
   * Zie docs/training-en-cyclus.md.
   */
  symptoms?: {
    /** 0 = geen last, 1 = maximale last, over de afgelopen 7 dagen. */
    score: number;
    label: string;
    daysLogged: number;
  } | null;
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
    /** Uren per week over dat venster; voorgerekend zodat het model niet deelt. */
    hoursPerWeek: number;
    /**
     * Hóé dat volume gereden wordt. Zonder deze drie zag het model alleen een
     * weektotaal en goot het dat in een paar lange blokken — ook bij een lid dat
     * elke dag een uur fietst en één keer per week lang gaat.
     */
    ridesPerWeek: number;
    avgDurationMinutes: number;
    longestRideMinutes: number;
    /**
     * De belasting erbij (oktober 2026). Met alleen uren plande het model een
     * winter vol lange duurritten op 45 TSS per uur voor leden die binnen 60-80
     * rijden: meer uren, minder belasting. Optioneel: oudere invoer mist ze.
     */
    tssPerWeek?: number | null;
    loadCoverage?: number;
    indoorHoursPerWeek?: number;
    indoorTssPerHour?: number | null;
    outdoorTssPerHour?: number | null;
  };
  /**
   * Wat het lid nu aankan, in TSS per week: het hoogste van CTL × 7 en de
   * gereden belasting. Voorgerekend met currentWeeklyLoad(), zodat de planner
   * niet zelf kiest welke bron telt. Zie docs/schema-belasting-2026-10-26.md.
   */
  currentLoad?: CurrentLoad | null;
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
    /** Dag van de readiness-meting. */
    readinessDate: string | null;
    /** false = de meting is van een eerdere dag en zegt niets over vandaag. */
    readinessCurrent: boolean;
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
  /**
   * Aankomende events/races waar het schema omheen moet plannen, met hun
   * afmetingen: zonder die cijfers weet de planner niet of een event een uurtje
   * duurt of een dag.
   */
  upcomingEvents?: Array<{
    title: string;
    type: string;
    date: string;
    /** Geschatte rijtijd uit eindtijd, of uit afstand + hoogtemeters. */
    durationMinutes: number;
    distanceKm: number | null;
    elevationM: number | null;
  }>;
  /**
   * Minuten per weekdag, per week van de planperiode. Gaat vóór
   * goal.availableDays: dat kent alleen dagen, dit ook de tijd per dag.
   *
   * `weeks` bevat alleen de weken die het lid apart heeft ingevuld; voor elke
   * andere week geldt `default`. Dit was tot 0131 één platte minutenlijst van de
   * huidige week, waardoor een schema tot de doeldatum werd volgepland op de
   * beschikbaarheid van déze week.
   */
  availability?: {
    default: Record<string, number> | null;
    weeks: Array<{ weekStart: string; minutesByDay: Record<string, number> }>;
  } | null;
  /**
   * De jaarplanning van het lid, beperkt tot deze planperiode: de mikpunten met
   * hun prioriteit en de periodes waarin het niet, minder of juist veel meer
   * traint (trainingskamp).
   *
   * Dit is de laag boven het doel. `goal.targetDate` zegt waar dit schema
   * eindigt; `seasonPlan` zegt hoe het jaar eromheen loopt — dat er in juli twee
   * weken vakantie zit, en dat de piek in mei ligt en niet in maart.
   */
  seasonPlan?: {
    targets: Array<{ title: string; date: string; priority: "a" | "b" | "c" }>;
    periods: Array<{ title: string; from: string; to: string; kind: "rust" | "rustig" | "kamp" }>;
    /** Het eerste A- of B-mikpunt ná het einde van deze planperiode. */
    nextTargetAfterPlan: { title: string; date: string; priority: "a" | "b" } | null;
  } | null;
  /**
   * De periode van dit schema: een blok van hooguit twaalf weken. `goalBeyond`
   * zegt dat goal.targetDate ná dit blok ligt, zodat de planner er niet naartoe
   * tapert. Bij een herziening is planUpdate.toDate het einde.
   */
  planWindow?: { from: string; to: string; goalBeyond: boolean };
  /** Zelf ingeplande ritten, toegezegde clubevents en tests: die liggen vast. */
  fixedWorkouts?: Array<{
    date: string;
    title: string;
    durationMinutes: number;
    intensity: string;
    kind: "eigen_rit" | "clubevent" | "ftp_test";
  }>;
  /**
   * Persoonlijke voorkeuren (0230): wat het lid van zichzelf weet en wat een
   * trainer over hem weet, in hun eigen woorden. Blijvend, anders dan
   * planUpdate.reason: ze gaan in elke generatie mee.
   */
  preferences?: PreferenceForAi[];
  /**
   * Lopende trainingsprotocollen (hitte, lage cadans) met hun fases en een
   * aanwijzing hoe het schema ze verwerkt. Zie protocolsForAi in src/lib/protocols.
   */
  protocols?: ProtocolForAi[];
  /** Renner-signaal voor vandaag (dag-aanpassing): tijd + gevoel. */
  today?: {
    availableMinutes: number | null;
    feeling: "tired" | "normal" | "fresh" | null;
    note: string | null;
  } | null;
  /** Ritten die het lid vandaag al heeft gereden (dag-aanpassing en dagvoorstel). */
  todayRides?: Array<{ name: string | null; minutes: number | null; load: number | null }>;
  /** Geplande workout van gisteren vs. wat de renner werkelijk deed. */
  yesterday?: {
    plannedTitle: string | null;
    plannedMinutes: number | null;
    plannedIntensity: string | null;
    actualName: string | null;
    actualMinutes: number | null;
    actualLoad: number | null; // TSS/training load indien bekend
    /** De training van een andere dag waar de rit van gisteren voor telt, indien bekend. */
    actualCountsFor?: {
      date: string;
      title: string;
      intensity: string;
      confirmed: boolean;
    } | null;
    /** Niet-gereden trainingen van de dagen vóór gisteren. */
    recentlyMissed?: Array<{ date: string; title: string; intensity: string }>;
    /** Beleving en toelichting die het lid na deze training invulde. */
    athleteRpe: number | null;
    athleteFeel: string | null;
    athleteReport: string | null;
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
    /** Het volgende blok: toDate ligt voorbij het einde van het oude schema. */
    nextBlock?: boolean;
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
 * Geëxporteerd voor scripts/claude-replay.mjs, dat hetzelfde schema aan Claude geeft.
 */
export const planSchema = (minWorkouts: number) => ({
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
      // Eén training per dag van een heel blok. Stond op 42: een volgend blok
      // van twaalf weken hield dan na acht weken op, terwijl de einddatum van
      // het schema wel op het einde van het blok kwam te staan.
      maxItems: PLAN_BLOCK_DAYS + 1,
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
          "methodLabel",
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
          methodLabel: { type: "string", enum: ["geen", "veelbelovend", "experimenteel"] },
          structure: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "label",
                "durationMinutes",
                "target",
                "notes",
                "intensity",
                "burstSeconds",
                "onSeconds",
                "offSeconds",
                "offTarget",
              ],
              properties: {
                label: { type: "string" },
                durationMinutes: { type: "number" },
                target: { type: "string" },
                notes: { type: "string" },
                burstSeconds: { type: "number" },
                onSeconds: { type: "number" },
                offSeconds: { type: "number" },
                offTarget: { type: "string" },
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
  /** Bij Claude: welk model en welke effort (src/lib/ai/settings.ts). */
  kind?: AiKind;
};

/**
 * Welk model deze generatie gebruikt. Geëxporteerd omdat startPlanUpdate de rij
 * in training_ai_generations aanmaakt vóórdat de call naar de AI vertrekt, en
 * het model dus al moet weten. Bij Claude telt `model` uit de opties niet: de
 * aanroepers geven daar het OpenAI-model mee.
 */
export function getTrainingModel(options: GenerateTrainingPlanOptions = {}) {
  if (usesClaude()) return claudeSettings(options.kind ?? "nieuw_schema").model;
  return options.model?.trim() || process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-5.5";
}

function trainingClaudeRequest(
  input: TrainingAiInput,
  promptText: string,
  options: GenerateTrainingPlanOptions,
): ClaudeRequest {
  const { model, effort } = claudeSettings(options.kind ?? "nieuw_schema");
  return {
    model,
    effort,
    system: promptText,
    user: `${todayLine()}\n\nMaak een trainingsplan-concept op basis van deze intake en recente data:\n${JSON.stringify(input, null, 2)}`,
    schema: planSchema(options.minWorkouts ?? 3),
  };
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
  if (usesClaude()) {
    const result = await runClaude(trainingClaudeRequest(input, promptText, options));
    return {
      model: result.model,
      promptSummary: JSON.stringify(input, null, 2),
      plan: JSON.parse(result.text) as GeneratedTrainingPlan,
    };
  }
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
  if (usesClaude()) {
    const request = trainingClaudeRequest(input, promptText, options);
    const responseId = await createClaudeJob("training", request);
    return { responseId, status: "queued", model: request.model, promptSummary: JSON.stringify(input, null, 2) };
  }
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
  // Op het id, niet op AI_PROVIDER: een generatie die vóór de overstap bij
  // OpenAI startte, wordt daar ook opgehaald.
  if (isClaudeJobId(responseId)) {
    const job = await readClaudeJob(responseId);
    if (job.status === "failed") return { status: "failed", error: job.error, responseJson: null };
    if (job.status !== "completed") return { status: job.status };
    try {
      const plan = JSON.parse(job.text) as GeneratedTrainingPlan;
      return { status: "completed", plan, responseJson: plan };
    } catch {
      return { status: "failed", error: "Claude gaf geen leesbaar schema terug.", responseJson: null };
    }
  }
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

// ---------------------------------------------------------------------------
// Coachchat
//
// Een coach-antwoord is platte tekst, geen trainingsplan. De twee functies
// hierboven zijn daarvoor niet te hergebruiken: die dwingen het json_schema van
// een heel plan af. Wat ze wél delen is de achtergrond-aanpak — background: true
// plus een bewaard response_id — want een reasoning-call duurt langer dan een
// Netlify-functie mag draaien. Ze staan hier en niet in coach-chat.ts zodat
// requireOpenAiKey() en fetchOpenAiResponse() privé kunnen blijven.
// ---------------------------------------------------------------------------

/** Welk model de coach gebruikt. Losse env-knop: uitleg mag een goedkoper model
 * zijn dan een heel schema, zonder dat het een ander model wordt zodra iemand
 * OPENAI_TRAINING_MODEL omzet. */
export function getCoachModel(kind: "coach" | "weekly" = "coach"): string {
  if (usesClaude()) return claudeSettings(kind).model;
  return process.env.OPENAI_COACH_MODEL?.trim() || getTrainingModel();
}

export async function startCoachAnswerBackground(
  instructions: string,
  userText: string,
  options: { model?: string; timeoutMs?: number; kind?: "coach" | "weekly" } = {},
): Promise<{ responseId: string; status: TrainingAiResponseStatus; model: string }> {
  if (usesClaude()) {
    const { model, effort } = claudeSettings(options.kind ?? "coach");
    // De instructies (met de kennisbanken) zijn voor iedereen gelijk; gecachet
    // kost elke volgende vraag een fractie van de invoer.
    const responseId = await createClaudeJob("coach", {
      model,
      effort,
      system: instructions,
      user: `${todayLine()}\n\n${userText}`,
      cacheSystem: true,
    });
    return { responseId, status: "queued", model };
  }
  const apiKey = requireOpenAiKey();
  const model = options.model?.trim() || getCoachModel();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestBody: Record<string, any> = {
    model,
    instructions,
    input: [{ role: "user", content: [{ type: "input_text", text: userText }] }],
    background: true,
    store: true,
  };
  // Een uitleg hoeft niet zo diep na te denken als een heel schema; dat scheelt
  // wachttijd én geld.
  if (isReasoningModel(model)) requestBody.reasoning = { effort: "low" };

  const res = await fetchOpenAiResponse(
    "https://api.openai.com/v1/responses",
    apiKey,
    { method: "POST", body: JSON.stringify(requestBody) },
    options.timeoutMs ?? 20_000,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 240)}`);
  }

  const body = (await res.json()) as { id?: string; status?: TrainingAiResponseStatus };
  if (!body.id) throw new Error("OpenAI gaf geen response-id terug.");
  return { responseId: body.id, status: body.status ?? "queued", model };
}

export async function retrieveCoachAnswerBackground(
  responseId: string,
  options: { timeoutMs?: number } = {},
): Promise<
  | { status: "queued" | "in_progress" }
  | { status: "completed"; text: string }
  | { status: "failed" | "cancelled" | "incomplete"; error: string }
> {
  if (isClaudeJobId(responseId)) {
    const job = await readClaudeJob(responseId);
    if (job.status !== "completed") return job;
    const text = job.text.trim();
    return text ? { status: "completed", text } : { status: "failed", error: "Claude gaf een leeg antwoord." };
  }
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
    const text = outputText(body).trim();
    // Een leeg antwoord is een mislukking, geen antwoord: anders staat er straks
    // een lege bel in het gesprek.
    if (!text) return { status: "failed", error: "OpenAI gaf een leeg antwoord." };
    return { status, text };
  }
  return {
    status,
    error:
      body.error?.message ??
      body.incomplete_details?.reason ??
      `OpenAI response eindigde met status ${status}.`,
  };
}
