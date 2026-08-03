"use server";

// Acties voor het core- en mobiliteitsspoor.
//
// Afvinken gebeurt handmatig: er is geen rit om aan te koppelen, dus geen
// Strava-matching en geen compliance-oordeel. Een sessie hier komt nergens in
// TSS, CTL of naleving terecht.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { seriesMinutes, type MobilitySeriesItem } from "@/lib/training/mobility";

const FEELINGS = ["goed", "neutraal", "zwaar"];

type ActionResult = { ok: true } | { ok: false; error: string };

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function todayKeyAmsterdam() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

async function currentUser() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) throw new Error("Niet ingelogd.");
  return { supabase, access, user: access.user };
}

function refresh() {
  revalidatePath("/zwbeter-worden/core", "layout");
  revalidatePath("/zwbeter-worden");
}

/** Serie van vandaag afvinken. Dubbel indienen is onschadelijk: de unique-index
 * op (profile_id, series_id, completed_on) maakt er één rij van. */
export async function completeSeries(formData: FormData): Promise<ActionResult> {
  const seriesId = text(formData.get("series_id"));
  if (!seriesId) return { ok: false, error: "Geen serie opgegeven." };

  const feel = text(formData.get("feel"));
  const minutesRaw = Number(text(formData.get("minutes")));
  const minutes = Number.isFinite(minutesRaw) && minutesRaw > 0 ? Math.round(minutesRaw) : null;

  const { supabase, user } = await currentUser();
  const { error } = await supabase.from("mobility_sessions").upsert(
    {
      profile_id: user.id,
      series_id: seriesId,
      completed_on: todayKeyAmsterdam(),
      minutes,
      feel: FEELINGS.includes(feel) ? feel : null,
      note: text(formData.get("note")) || null,
    },
    { onConflict: "profile_id,series_id,completed_on" },
  );
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true };
}

/** Per ongeluk afgevinkt terugdraaien. */
export async function undoSession(formData: FormData): Promise<ActionResult> {
  const sessionId = text(formData.get("session_id"));
  if (!sessionId) return { ok: false, error: "Geen sessie opgegeven." };

  const { supabase, user } = await currentUser();
  const { error } = await supabase
    .from("mobility_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("profile_id", user.id);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true };
}

/**
 * Een eigen serie bewaren. De oefeningen komen als `exercise_ids` in de
 * volgorde waarin het lid ze heeft neergezet; dosering nemen we over uit de
 * oefening zelf, zodat de bouwer geen formulier vol getallen wordt.
 */
export async function saveOwnSeries(formData: FormData): Promise<ActionResult> {
  const title = text(formData.get("title"));
  if (!title) return { ok: false, error: "Geef je serie een naam." };

  const exerciseIds = String(formData.get("exercise_ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (exerciseIds.length === 0) return { ok: false, error: "Kies minstens één oefening." };

  const { supabase, user } = await currentUser();

  const { data: exercises, error: exerciseError } = await supabase
    .from("mobility_exercises")
    .select("id, default_hold_seconds, default_reps, is_unilateral")
    .in("id", exerciseIds);
  if (exerciseError) return { ok: false, error: exerciseError.message };

  const byId = new Map((exercises ?? []).map((row) => [row.id as string, row]));
  const chosen = exerciseIds.filter((id) => byId.has(id));
  if (chosen.length === 0) return { ok: false, error: "Kies minstens één oefening." };

  const timing = text(formData.get("timing")) || "rustdag";
  // Lange holds horen niet in een serie vóór de rit; dat kost vermogen. De
  // database bewaakt dit ook, maar een nette melding is beter dan een
  // trigger-fout in beeld.
  if (timing === "pre_ride") {
    const tooLong = chosen.some(
      (id) => (byId.get(id)?.default_hold_seconds ?? 0) > 60,
    );
    if (tooLong) {
      return {
        ok: false,
        error: "Een serie vóór de rit mag geen oefening met een hold langer dan 60 seconden bevatten.",
      };
    }
  }

  const items = chosen.map((id, index) => {
    const exercise = byId.get(id)!;
    return {
      exercise_id: id,
      sort_order: index,
      sets: 1,
      reps: (exercise.default_reps as number | null) ?? null,
      hold_seconds: (exercise.default_hold_seconds as number | null) ?? null,
      rest_seconds: 20,
    };
  });

  // Duur schatten met dezelfde helper als de UI, zodat de kaart en de detailpagina
  // hetzelfde getal tonen.
  const minutes = seriesMinutes(
    items.map(
      (item, index) =>
        ({
          id: `${index}`,
          series_id: "",
          sort_order: item.sort_order,
          sets: item.sets,
          reps: item.reps,
          hold_seconds: item.hold_seconds,
          rest_seconds: item.rest_seconds,
          exercise: {
            is_unilateral: Boolean(byId.get(item.exercise_id)?.is_unilateral),
          },
        }) as unknown as MobilitySeriesItem,
    ),
  );

  const slug = `eigen-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
  const { data: series, error: seriesError } = await supabase
    .from("mobility_series")
    .insert({
      slug,
      title,
      subtitle: null,
      goal: text(formData.get("goal")) || "stabiliteit",
      timing,
      duration_minutes: Math.min(60, minutes),
      level: 1,
      is_standard: false,
      owner_id: user.id,
    })
    .select("id")
    .single();
  if (seriesError || !series) {
    return { ok: false, error: seriesError?.message ?? "Serie opslaan mislukt." };
  }

  const { error: itemsError } = await supabase
    .from("mobility_series_items")
    .insert(items.map((item) => ({ ...item, series_id: series.id })));
  if (itemsError) {
    // Geen halve serie laten staan: zonder oefeningen is hij nutteloos.
    await supabase.from("mobility_series").delete().eq("id", series.id);
    return { ok: false, error: itemsError.message };
  }

  refresh();
  return { ok: true };
}

export async function deleteOwnSeries(formData: FormData): Promise<ActionResult> {
  const seriesId = text(formData.get("series_id"));
  if (!seriesId) return { ok: false, error: "Geen serie opgegeven." };

  const { supabase, user } = await currentUser();
  const { error } = await supabase
    .from("mobility_series")
    .delete()
    .eq("id", seriesId)
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true };
}
