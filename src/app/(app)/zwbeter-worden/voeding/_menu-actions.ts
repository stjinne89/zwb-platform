"use server";

// Zelf een recept in het dag- of weekmenu zetten, en het weer aan het menu
// overlaten. De keuze staat in nutrition_menu_choices (0260); het menu zelf
// rekent src/lib/nutrition/plan.ts uit.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { shiftDayKey } from "@/lib/training/mobility";
import { choiceMoments } from "@/lib/nutrition/menu";
import { CHOICE_DAYS_AHEAD } from "@/lib/nutrition/plan";
import { MEAL_MOMENTS, type MealMoment } from "@/lib/nutrition/targets";
import { todayKeyAmsterdam } from "./_data";

type ActionResult = { ok: true } | { ok: false; error: string };

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

/** Alleen terug naar het Dagmenu of Boodschappen, met hun eigen query. */
const BACK = /^\/zwbeter-worden\/voeding(\/boodschappen)?(\?[\w=&%.,-]*)?$/;

function slot(formData: FormData): { day: string; moment: MealMoment } | { error: string } {
  const day = text(formData.get("day"));
  const moment = text(formData.get("moment"));
  const today = todayKeyAmsterdam();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < today || day > shiftDayKey(today, CHOICE_DAYS_AHEAD)) {
    return { error: "Kies een dag van vandaag tot een week vooruit." };
  }
  if (!(MEAL_MOMENTS as readonly string[]).includes(moment)) return { error: "Onbekend moment." };
  return { day, moment: moment as MealMoment };
}

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd.");
  return { supabase, user };
}

function done(formData: FormData): ActionResult {
  revalidatePath("/zwbeter-worden/voeding", "layout");
  const back = text(formData.get("terug"));
  if (BACK.test(back)) redirect(back);
  return { ok: true };
}

/** Zet een recept vast op een dag en moment; vervangt wat daar stond. */
export async function chooseMenuRecipe(formData: FormData): Promise<ActionResult> {
  const target = slot(formData);
  if ("error" in target) return { ok: false, error: target.error };
  const recipeId = text(formData.get("recipe_id"));
  if (!recipeId) return { ok: false, error: "Geen recept opgegeven." };

  const { supabase, user } = await currentUser();
  // RLS van nutrition_recipes: alleen een recept dat dit lid mag zien.
  const { data: recipe } = await supabase
    .from("nutrition_recipes")
    .select("id, meal_moment")
    .eq("id", recipeId)
    .maybeSingle();
  if (!recipe) return { ok: false, error: "Recept niet gevonden." };
  if (!choiceMoments(recipe.meal_moment as MealMoment).includes(target.moment)) {
    return { ok: false, error: "Dit recept past niet bij dit moment." };
  }

  const { error } = await supabase
    .from("nutrition_menu_choices")
    .upsert(
      { profile_id: user.id, day: target.day, meal_moment: target.moment, recipe_id: recipeId },
      { onConflict: "profile_id,day,meal_moment" },
    );
  if (error) return { ok: false, error: error.message };
  return done(formData);
}

/** Laat het moment weer aan het menu over. */
export async function clearMenuChoice(formData: FormData): Promise<ActionResult> {
  const target = slot(formData);
  if ("error" in target) return { ok: false, error: target.error };

  const { supabase, user } = await currentUser();
  const { error } = await supabase
    .from("nutrition_menu_choices")
    .delete()
    .eq("profile_id", user.id)
    .eq("day", target.day)
    .eq("meal_moment", target.moment);
  if (error) return { ok: false, error: error.message };
  return done(formData);
}
