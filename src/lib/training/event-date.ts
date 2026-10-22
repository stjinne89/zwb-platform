// Een clubevent dat van dag verschuift, neemt de jaarplanning en de doelen mee.
//
// Een mikpunt op een clubevent krijgt bij het toevoegen de datum van het event,
// en een doel met een doeltijd op een event ook. Daarna werd die datum nergens
// meer bijgewerkt. Op 22 oktober 2026 schoof een gran fondo een dag nadat een
// lid hem als A-doel had gekozen: de kalender zei zondag 28 maart, het jaarplan
// bleef op zaterdag 27 maart staan en rekende de taper vanaf de verkeerde dag.

import type { createAdminClient } from "@/lib/supabase/admin";
import { requestReplan } from "@/lib/training/replan";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Zet mikpunten en actieve doelen op een event naar de nieuwe startdag en vraagt
 * voor elk geraakt lid een herziening aan. Een mikpunt volgt het event altijd:
 * zijn datum is in de jaarplanning niet los te wijzigen. Een doel schuift alleen
 * mee als het op de oude dag stond; een doel dat het lid zelf op een andere dag
 * had gezet, blijft staan.
 */
export async function followEventDate(
  admin: Admin,
  eventId: string,
  oldStartAt: string,
  newStartAt: string,
): Promise<void> {
  const oldDay = amsterdamDayKey(new Date(oldStartAt));
  const newDay = amsterdamDayKey(new Date(newStartAt));
  if (oldDay === newDay) return;

  const [{ data: targets }, { data: goals }] = await Promise.all([
    admin
      .from("training_season_targets")
      .select("id, profile_id, title, target_date, goal_id")
      .eq("event_id", eventId)
      .neq("target_date", newDay),
    admin
      .from("training_goals")
      .select("id, profile_id")
      .eq("target_event_id", eventId)
      .eq("status", "active")
      .eq("target_date", oldDay),
  ]);

  const reasons = new Map<string, string>();
  for (const target of targets ?? []) {
    const targetDay = String(target.target_date).slice(0, 10);
    await admin.from("training_season_targets").update({ target_date: newDay }).eq("id", target.id);
    if (target.goal_id) {
      await admin
        .from("training_goals")
        .update({ target_date: newDay })
        .eq("id", target.goal_id)
        .eq("target_date", targetDay);
    }
    reasons.set(
      target.profile_id as string,
      `mikpunt "${target.title}" verschoven van ${targetDay} naar ${newDay}, het event is verplaatst`,
    );
  }
  for (const goal of goals ?? []) {
    await admin.from("training_goals").update({ target_date: newDay }).eq("id", goal.id);
    if (!reasons.has(goal.profile_id as string)) {
      reasons.set(
        goal.profile_id as string,
        `doel verschoven van ${oldDay} naar ${newDay}, het event is verplaatst`,
      );
    }
  }

  await Promise.all(
    [...reasons].map(([profileId, reason]) =>
      requestReplan(admin, profileId, reason).catch(() => null),
    ),
  );
}
