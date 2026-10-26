// Herinneringen van Naleving (stap 5). Draait mee in de cron van
// /api/events/reminders, die elke 15 minuten loopt.
//
// Eén moment per dag, vanaf 19:00 Nederlandse tijd, voor wie herinneringen aan
// heeft staan en niet op pauze staat. Twee soorten, elk hooguit één keer per dag:
//
//   morgen_zwaar  morgen staat een zware, lange of wedstrijddag: vanavond
//                 koolhydraatrijk eten (dezelfde regel als de tip). Rijdt het
//                 lid morgen een uur of langer, dan staat erbij wat het
//                 klaarzet (ride-plan.ts), zoals het Dagmenu het morgen toont.
//   herstel       vandaag een uur of langer gereden en nog niets bij "Na de rit".
//
// Net als de tips vraagt geen herinnering om minder te eten.

import type { SupabaseClient } from "@supabase/supabase-js";
import { amsterdamDateKey, amsterdamWallTimeToIso } from "@/lib/birthdays";
import { sendNotificationToMembers } from "@/lib/push/send";
import { shiftDayKey } from "@/lib/training/mobility";
import { FUEL_DAY_LABELS, classifyFuelDay, isKeyDay, totalMinutes, type FuelDayType } from "./day-type";
import { rankRecipes, type RecipePref } from "./menu";
import { plannedSessions, ridesOnDay, type Recipe } from "./recipes";
import { GUT_PROTOCOLS, gutTrainingOn, type GutRun } from "./gut-training";
import { currentSweatRate } from "./sweat";
import { ridePlan, ridePlanSummary, type RidePlan } from "./ride-plan";
import { ageFromBirthDate, portionEnergyFactor } from "./targets";

export const NUTRITION_REMINDER_TIME = "19:00";
/** Na dit tijdstip wordt een gemiste herinnering niet meer ingehaald. */
export const NUTRITION_REMINDER_UNTIL = "21:00";
const RECOVERY_RIDE_MINUTES = 60;

export type NutritionReminderKind = "morgen_zwaar" | "herstel";

/** Is het nu tijd om te versturen? Tussen 19:00 en 21:00 Nederlandse tijd. */
export function nutritionReminderDue(now: Date): boolean {
  const today = amsterdamDateKey(now);
  const from = amsterdamWallTimeToIso(today, NUTRITION_REMINDER_TIME);
  const until = amsterdamWallTimeToIso(today, NUTRITION_REMINDER_UNTIL);
  if (!from || !until) return false;
  return now.getTime() >= new Date(from).getTime() && now.getTime() < new Date(until).getTime();
}

export type ReminderPayload = { kind: NutritionReminderKind; title: string; body: string; url: string };

export function remindersFor(input: {
  tomorrowType: FuelDayType;
  rodeMinutesToday: number;
  recoveryLogged: boolean;
  /** Het ritplan van morgen, als er een rit van een uur of langer staat. */
  tomorrowRide?: RidePlan | null;
}): ReminderPayload[] {
  const out: ReminderPayload[] = [];
  if (isKeyDay(input.tomorrowType)) {
    const pack = input.tomorrowRide ? ` Zet klaar: ${ridePlanSummary(input.tomorrowRide)}.` : "";
    out.push({
      kind: "morgen_zwaar",
      title: `Morgen: ${FUEL_DAY_LABELS[input.tomorrowType].toLowerCase()}`,
      body: `Eet vanavond koolhydraatrijk, dan begin je morgen met volle voorraden.${pack}`,
      url: "/zwbeter-worden/voeding",
    });
  }
  if (input.rodeMinutesToday >= RECOVERY_RIDE_MINUTES && !input.recoveryLogged) {
    out.push({
      kind: "herstel",
      title: "Herstel na je rit",
      body: "Je reed vandaag een uur of langer. Bij Na de rit staat nog niets ingevuld.",
      url: "/zwbeter-worden/voeding/naleving",
    });
  }
  return out;
}

type Workout = {
  profile_id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  intensity: string | null;
  status: string | null;
  plan_id: string | null;
};

const RIDE_RECIPE_COLUMNS =
  "id, slug, title, meal_moment, fuel_profile, diet_tags, servings, prep_minutes, steps_md, is_standard, owner_id, visibility, " +
  "ingredients:nutrition_recipe_ingredients(id, sort_order, grams, role, food:nutrition_foods(id, nevo_code, name_nl, quantity_unit, kcal, carbs_g, sugars_g, protein_g, fat_g, fiber_g, sodium_mg, food_group))";

type RideProfile = { id: string; weight_kg: number | null; sex: string | null; birth_date: string | null };

type RideContext = {
  recipes: Recipe[];
  prefs: { profile_id: string; recipe_id: string; pref: string }[];
  choices: { profile_id: string; recipe_id: string }[];
  profiles: Map<string, RideProfile>;
  heights: Map<string, number | null>;
  /** Darmtraining per lid, en wie zelf voor 120 g per uur koos. */
  gutRuns: (GutRun & { profileId: string })[];
  gutHigh: Set<string>;
  /** Zweettests per lid (0273), voor het vochtdoel. */
  sweatTests: { profileId: string; testedOn: string; mlPerHour: number }[];
};

/** Wat het ritplan voor morgen nodig heeft, voor alle leden tegelijk. */
async function loadRideContext(admin: SupabaseClient, profileIds: string[], tomorrow: string): Promise<RideContext> {
  const [recipes, prefs, choices, profiles, heights, gutRuns, gutHigh, sweatTests] = await Promise.all([
    admin.from("nutrition_recipes").select(RIDE_RECIPE_COLUMNS).eq("meal_moment", "tijdens_rit"),
    admin.from("nutrition_recipe_prefs").select("profile_id, recipe_id, pref").in("profile_id", profileIds),
    admin
      .from("nutrition_menu_choices")
      .select("profile_id, recipe_id")
      .in("profile_id", profileIds)
      .eq("day", tomorrow)
      .eq("meal_moment", "tijdens_rit"),
    admin.from("profiles").select("id, weight_kg, sex, birth_date").in("id", profileIds),
    admin.from("nutrition_profiles").select("profile_id, height_cm").in("profile_id", profileIds),
    admin
      .from("member_protocols")
      .select("profile_id, protocol_slug, start_date, status")
      .in("profile_id", profileIds)
      .in("protocol_slug", [...GUT_PROTOCOLS])
      .in("status", ["actief", "afgerond"]),
    // Apart: zolang 0272 er niet is, faalt alleen deze vraag.
    admin.from("nutrition_profiles").select("profile_id").in("profile_id", profileIds).eq("ride_carbs_120", true),
    admin
      .from("nutrition_sweat_tests")
      .select("profile_id, tested_on, sweat_ml_per_hour")
      .in("profile_id", profileIds),
  ]);
  return {
    recipes: ((recipes.data ?? []) as unknown as Recipe[]).map((recipe) => ({
      ...recipe,
      diet_tags: recipe.diet_tags ?? [],
      ingredients: [...(recipe.ingredients ?? [])]
        .map((item) => ({ ...item, grams: Number(item.grams) }))
        .sort((a, b) => a.sort_order - b.sort_order),
    })),
    prefs: (prefs.data ?? []) as RideContext["prefs"],
    choices: (choices.data ?? []) as RideContext["choices"],
    profiles: new Map(((profiles.data ?? []) as RideProfile[]).map((row) => [row.id, row])),
    heights: new Map(
      ((heights.data ?? []) as { profile_id: string; height_cm: number | null }[]).map((row) => [row.profile_id, row.height_cm]),
    ),
    gutRuns: ((gutRuns.data ?? []) as { profile_id: string; protocol_slug: string; start_date: string; status: GutRun["status"] }[]).map(
      (row) => ({
        profileId: row.profile_id,
        protocolSlug: row.protocol_slug,
        startDate: String(row.start_date).slice(0, 10),
        status: row.status,
      }),
    ),
    gutHigh: new Set(((gutHigh.data ?? []) as { profile_id: string }[]).map((row) => row.profile_id)),
    sweatTests: ((sweatTests.data ?? []) as { profile_id: string; tested_on: string; sweat_ml_per_hour: number }[]).map(
      (row) => ({ profileId: row.profile_id, testedOn: String(row.tested_on).slice(0, 10), mlPerHour: Number(row.sweat_ml_per_hour) }),
    ),
  };
}

/**
 * Het ritplan van morgen voor één lid: de recepten die het lid zelf ziet
 * (clubrecepten, eigen en door leden gedeelde), dezelfde rangorde en keuze als
 * het Dagmenu, maar zonder dieetfilter (dat staat alleen in de URL).
 */
export function tomorrowRidePlan(
  ctx: RideContext,
  profileId: string,
  minutes: number,
  tomorrow: string,
  today: string,
  intensity: string | null = null,
): RidePlan | null {
  const recipes = ctx.recipes
    .filter((recipe) => recipe.is_standard || recipe.owner_id === profileId || recipe.visibility === "leden")
    .map((recipe) => ({ ...recipe, from_member: !recipe.is_standard && recipe.owner_id !== profileId }));
  const prefs = new Map(
    ctx.prefs
      .filter((row) => row.profile_id === profileId && (row.pref === "favoriet" || row.pref === "verborgen"))
      .map((row) => [row.recipe_id, row.pref as RecipePref]),
  );
  const profile = ctx.profiles.get(profileId);
  const weightKg = profile?.weight_kg && Number(profile.weight_kg) > 0 ? Number(profile.weight_kg) : null;
  const height = ctx.heights.get(profileId);
  const energyFactor = weightKg
    ? portionEnergyFactor({
        weightKg,
        heightCm: height == null ? null : Number(height),
        ageYears: ageFromBirthDate(profile?.birth_date ?? null, today),
        sex: profile?.sex ?? null,
      })
    : 1;
  const dayType = classifyFuelDay([{ minutes, intensity: null }]);
  const gut = gutTrainingOn(
    { runs: ctx.gutRuns.filter((run) => run.profileId === profileId), high: ctx.gutHigh.has(profileId) },
    tomorrow,
  );
  const ranked = rankRecipes(recipes, "tijdens_rit", {
    rider: { weightKg, energyFactor, dayType, rideMinutes: minutes, rideIntensity: intensity, rideGut: gut },
    dayType,
    tomorrowType: "rust",
    today: tomorrow,
    prefs,
    diet: null,
  }).map((item) => item.recipe);
  const choiceId = ctx.choices.find((row) => row.profile_id === profileId)?.recipe_id;
  const chosen = choiceId ? recipes.find((recipe) => recipe.id === choiceId) : undefined;
  return ridePlan({
    minutes,
    intensity,
    gut,
    sweatMlPerHour: currentSweatRate(ctx.sweatTests.filter((row) => row.profileId === profileId)),
    weightKg,
    ranked,
    lead: chosen ?? ranked[0] ?? null,
    leadChosen: Boolean(chosen),
    energyFactor,
  });
}

export async function processNutritionReminders(admin: SupabaseClient, now: Date) {
  if (!nutritionReminderDue(now)) return { due: false };
  const today = amsterdamDateKey(now);
  const tomorrow = shiftDayKey(today, 1);

  const { data: settings, error } = await admin
    .from("nutrition_log_settings")
    .select("profile_id")
    .eq("reminders", true)
    .eq("paused", false);
  if (error) throw new Error(`nutrition_log_settings: ${error.message}`);
  const profileIds = (settings ?? []).map((row) => row.profile_id as string);
  if (profileIds.length === 0) return { due: true, candidates: 0, sent: 0 };

  const from = `${shiftDayKey(today, -1)}T00:00:00Z`;
  const to = `${shiftDayKey(today, 3)}T00:00:00Z`;
  const [workouts, drafts, rides, meals, sends] = await Promise.all([
    admin
      .from("training_workouts")
      .select("profile_id, scheduled_at, duration_minutes, intensity, status, plan_id")
      .in("profile_id", profileIds)
      .is("superseded_at", null)
      .gte("scheduled_at", from)
      .lt("scheduled_at", to),
    // Niet-toegepaste dagvoorstellen tellen niet, net als op de voedingspagina.
    admin
      .from("training_plans")
      .select("id")
      .in("profile_id", profileIds)
      .eq("status", "draft")
      .eq("adaptation_kind", "daily"),
    admin
      .from("strava_activities")
      .select("profile_id, start_date, moving_time_seconds")
      .in("profile_id", profileIds)
      .gte("start_date", from)
      .lt("start_date", to),
    admin
      .from("nutrition_log_meals")
      .select("profile_id")
      .in("profile_id", profileIds)
      .eq("eaten_on", today)
      .eq("meal_moment", "na_rit"),
    admin.from("nutrition_reminder_sends").select("profile_id, kind").eq("sent_on", today).in("profile_id", profileIds),
  ]);

  const draftIds = new Set((drafts.data ?? []).map((row) => row.id as string));
  // Alleen ophalen als iemand morgen een rit van een uur of langer heeft.
  let rideContext: Promise<RideContext> | null = null;
  const recovered = new Set((meals.data ?? []).map((row) => row.profile_id as string));
  const alreadySent = new Set((sends.data ?? []).map((row) => `${row.profile_id}:${row.kind}`));

  let sent = 0;
  for (const profileId of profileIds) {
    const own = ((workouts.data ?? []) as Workout[]).filter(
      (row) => row.profile_id === profileId && !(row.plan_id && draftIds.has(row.plan_id)),
    );
    const ownRides = ((rides.data ?? []) as { profile_id: string; start_date: string; moving_time_seconds: number | null }[])
      .filter((row) => row.profile_id === profileId);
    const planned = plannedSessions(own, today);
    const tomorrowType = classifyFuelDay(planned.plannedTomorrow);
    const tomorrowMinutes = totalMinutes(planned.plannedTomorrow);
    // De zwaarte van de langste rit morgen, zoals het Dagmenu morgen rekent.
    const tomorrowIntensity =
      planned.plannedTomorrow
        .filter((session) => session.minutes > 0 && session.intensity !== "rest")
        .sort((a, b) => b.minutes - a.minutes)[0]?.intensity ?? null;
    let tomorrowRide: RidePlan | null = null;
    if (isKeyDay(tomorrowType) && tomorrowMinutes >= 60 && !alreadySent.has(`${profileId}:morgen_zwaar`)) {
      rideContext ??= loadRideContext(admin, profileIds, tomorrow);
      // Een fout in de voedingsdata mag de herinnering zelf niet tegenhouden.
      tomorrowRide = await rideContext
        .then((ctx) => tomorrowRidePlan(ctx, profileId, tomorrowMinutes, tomorrow, today, tomorrowIntensity))
        .catch(() => null);
    }
    const reminders = remindersFor({
      tomorrowType,
      rodeMinutesToday: totalMinutes(ridesOnDay(ownRides, today)),
      recoveryLogged: recovered.has(profileId),
      tomorrowRide,
    }).filter((reminder) => !alreadySent.has(`${profileId}:${reminder.kind}`));

    for (const reminder of reminders) {
      const result = await sendNotificationToMembers(
        "on_nutrition_reminder",
        { title: reminder.title, body: reminder.body, url: reminder.url, tag: `voeding-${reminder.kind}-${today}` },
        { profileIds: [profileId] },
      );
      sent += result.sent;
      // Ook zonder apparaat vastleggen, zodat de volgende tik het niet opnieuw probeert.
      await admin
        .from("nutrition_reminder_sends")
        .upsert({ profile_id: profileId, sent_on: today, kind: reminder.kind }, { onConflict: "profile_id,sent_on,kind" });
    }
  }
  return { due: true, candidates: profileIds.length, sent, tomorrow };
}
