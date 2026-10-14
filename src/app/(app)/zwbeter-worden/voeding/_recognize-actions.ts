"use server";

// Een maaltijd herkennen uit een foto of omschrijving (Naleving, stap 3).
//
// Het model draait in background-modus en de pagina vraagt het antwoord op,
// net als het pacingplan: een Netlify-functie is eerder klaar dan het model.
// De foto gaat alleen in het verzoek mee en wordt nergens bewaard. Wat het
// model teruggeeft zijn namen en grammen; de koppeling aan NEVO gebeurt hier,
// en het lid bevestigt alles in het formulier voor er iets wordt bewaard.

import { revalidatePath } from "next/cache";
import {
  RECOGNITION_TEXT_MAX,
  isImageDataUrl,
  parseRecognition,
  recognitionRequestBody,
  recognitionsLeft,
  responseText,
  type RecognitionKind,
} from "@/lib/nutrition/recognize";
import { foodSearchTokens } from "@/lib/nutrition/food-search";
import { searchFoods, type FoodOption } from "./_actions";
import { loadLogSettings, requireViewer, type Viewer } from "./_data";

type ActionResult = { ok: true } | { ok: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function openAiKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

async function openAi(path: string, init: RequestInit, timeoutMs: number) {
  const key = openAiKey();
  if (!key) throw new Error("Herkennen staat nu niet aan.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`https://api.openai.com/v1/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Foto en tekst herkennen aan of uit, met een eigen toestemming. */
export async function setRecognitionConsent(formData: FormData): Promise<ActionResult> {
  const on = formData.get("on") === "1";
  if (on && formData.get("consent") !== "on") return { ok: false, error: "Vink de toestemming aan." };
  const viewer = await requireViewer();
  const { error } = await viewer.supabase
    .from("nutrition_log_settings")
    .update({ ai_consent_at: on ? new Date().toISOString() : null })
    .eq("profile_id", viewer.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/zwbeter-worden/voeding/naleving");
  return { ok: true };
}

async function usedLastDay(viewer: Viewer): Promise<number> {
  const { count } = await viewer.supabase
    .from("nutrition_log_ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", viewer.user.id)
    .gte("used_at", new Date(Date.now() - DAY_MS).toISOString());
  return count ?? 0;
}

export type StartResult = { ok: true; id: string; left: number } | { ok: false; error: string };

/** Start een herkenning. `image` is een verkleinde JPEG als data-URL. */
export async function startRecognition(input: { image?: string; text?: string }): Promise<StartResult> {
  const image = input.image && isImageDataUrl(input.image) ? input.image : undefined;
  const text = input.text?.trim().slice(0, RECOGNITION_TEXT_MAX) || undefined;
  if (!image && !text) return { ok: false, error: "Maak een foto of beschrijf wat je at." };
  const kind: RecognitionKind = image ? "foto" : "tekst";

  const viewer = await requireViewer();
  const settings = await loadLogSettings(viewer);
  if (!settings || settings.paused || !settings.recognition) {
    return { ok: false, error: "Zet eerst foto en tekst herkennen aan." };
  }
  const left = recognitionsLeft(await usedLastDay(viewer));
  if (left === 0) return { ok: false, error: "Je hebt het maximum voor vandaag bereikt. Voer de maaltijd zelf in." };

  let id: string;
  try {
    const res = await openAi(
      "responses",
      {
        method: "POST",
        body: JSON.stringify({ ...recognitionRequestBody({ image, text }), background: true, store: true }),
      },
      20_000,
    );
    if (!res.ok) return { ok: false, error: "Herkennen lukt nu niet. Voer de maaltijd zelf in." };
    const body = (await res.json()) as { id?: string };
    if (!body.id) return { ok: false, error: "Herkennen lukt nu niet. Voer de maaltijd zelf in." };
    id = body.id;
  } catch (err) {
    const message = err instanceof Error && err.message.startsWith("Herkennen") ? err.message : null;
    return { ok: false, error: message ?? "Herkennen lukt nu niet. Voer de maaltijd zelf in." };
  }

  // Via de service role: leden kunnen deze tabel alleen lezen (0234).
  const { error } = await viewer.admin
    .from("nutrition_log_ai_usage")
    .insert({ profile_id: viewer.user.id, kind, response_id: id });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id, left: left - 1 };
}

export type RecognizedRow = {
  name: string;
  grams: number;
  gramsMin: number;
  gramsMax: number;
  /** De beste NEVO-treffers, de eerste voorgekozen. Leeg als NEVO niets vond. */
  matches: FoodOption[];
};

export type PollResult =
  | { status: "busy" }
  | { status: "done"; rows: RecognizedRow[]; questions: string[]; kind: RecognitionKind }
  | { status: "failed"; error: string };

async function nevoMatches(term: string): Promise<FoodOption[]> {
  const found = await searchFoods(term);
  if (found.length > 0) return found.slice(0, 4);
  // Te specifiek: dan alleen de eerste twee woorden, zoals "rijst witte".
  const shorter = foodSearchTokens(term).slice(0, 2).join(" ");
  if (shorter && shorter !== term.toLowerCase()) return (await searchFoods(shorter)).slice(0, 4);
  return [];
}

/** Haal het antwoord op; alleen wie de herkenning startte, kan dat. */
export async function pollRecognition(id: string): Promise<PollResult> {
  const viewer = await requireViewer();
  const { data: usage } = await viewer.supabase
    .from("nutrition_log_ai_usage")
    .select("kind")
    .eq("response_id", id)
    .eq("profile_id", viewer.user.id)
    .maybeSingle();
  if (!usage) return { status: "failed", error: "Deze herkenning bestaat niet." };

  let body: { status?: string };
  try {
    const res = await openAi(`responses/${encodeURIComponent(id)}`, { method: "GET" }, 10_000);
    if (!res.ok) return { status: "failed", error: "Herkennen lukt nu niet. Voer de maaltijd zelf in." };
    body = (await res.json()) as { status?: string };
  } catch {
    return { status: "busy" };
  }
  if (body.status === "queued" || body.status === "in_progress") return { status: "busy" };
  if (body.status !== "completed") {
    return { status: "failed", error: "Herkennen lukt nu niet. Voer de maaltijd zelf in." };
  }

  let recognition;
  try {
    recognition = parseRecognition(JSON.parse(responseText(body)));
  } catch {
    return { status: "failed", error: "Herkennen lukt nu niet. Voer de maaltijd zelf in." };
  }
  if (recognition.parts.length === 0) return { status: "failed", error: "Geen eten herkend." };

  const rows = await Promise.all(
    recognition.parts.map(async (part) => ({
      name: part.name,
      grams: part.grams,
      gramsMin: part.gramsMin,
      gramsMax: part.gramsMax,
      matches: await nevoMatches(part.searchTerm),
    })),
  );
  return { status: "done", rows, questions: recognition.questions, kind: usage.kind as RecognitionKind };
}
