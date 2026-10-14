// Herinneringen van Naleving (stap 5). Draait mee in de cron van
// /api/events/reminders, die elke 15 minuten loopt.
//
// Eén moment per dag, vanaf 19:00 Nederlandse tijd, voor wie herinneringen aan
// heeft staan en niet op pauze staat. Twee soorten, elk hooguit één keer per dag:
//
//   morgen_zwaar  morgen staat een zware, lange of wedstrijddag: vanavond
//                 koolhydraatrijk eten (dezelfde regel als de tip).
//   herstel       vandaag een uur of langer gereden en nog niets bij "Na de rit".
//
// Net als de tips vraagt geen herinnering om minder te eten.

import type { SupabaseClient } from "@supabase/supabase-js";
import { amsterdamDateKey, amsterdamWallTimeToIso } from "@/lib/birthdays";
import { sendNotificationToMembers } from "@/lib/push/send";
import { shiftDayKey } from "@/lib/training/mobility";
import { FUEL_DAY_LABELS, classifyFuelDay, isKeyDay, totalMinutes, type FuelDayType } from "./day-type";
import { plannedSessions, ridesOnDay } from "./recipes";

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
}): ReminderPayload[] {
  const out: ReminderPayload[] = [];
  if (isKeyDay(input.tomorrowType)) {
    out.push({
      kind: "morgen_zwaar",
      title: `Morgen: ${FUEL_DAY_LABELS[input.tomorrowType].toLowerCase()}`,
      body: "Eet vanavond koolhydraatrijk, dan begin je morgen met volle voorraden.",
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
    const reminders = remindersFor({
      tomorrowType: classifyFuelDay(planned.plannedTomorrow),
      rodeMinutesToday: totalMinutes(ridesOnDay(ownRides, today)),
      recoveryLogged: recovered.has(profileId),
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
