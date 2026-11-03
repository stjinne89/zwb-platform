// Hoe ver een automatische herziening vooruit herschrijft.
//
// Tot november 2026 schreef elke herziening het hele resterende schema opnieuw,
// gemiddeld 32 workouts en ~28.000 uitvoertokens, ook als alleen deze week
// veranderde. Dat was 80% van de AI-rekening (docs/claude-kosten-2026-11-03.md).
// Nu herschrijft een automatische herziening twee hele weken; de weken daarna
// blijven staan zoals ze waren. Raakt een wijziging een latere week (een race
// over vijf weken, de beschikbaarheid van een verre week), dan loopt het venster
// tot en met die week, zodat de wijziging toch wordt verwerkt.
//
// Het formulier "Schema bijwerken" en het volgende blok gebruiken dit niet: die
// veranderen de uitgangspunten van het hele schema.

import type { createAdminClient } from "@/lib/supabase/admin";
import { shiftDays } from "@/lib/training/season";
import { endOfWeekKey } from "@/lib/training/zwbeterworden";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoeveel dagen een automatische herziening minstens beslaat. */
export const REPLAN_WINDOW_DAYS = 14;

/**
 * Tot welke dag een wijziging reikt: een datum, "all" als hij het hele schema
 * raakt (de standaardweek), of null als er niets buiten het venster ligt.
 */
export type ChangeReach = string | "all" | null;

/**
 * Laatste dag van het venster, altijd een zondag (hele weken), en nooit voorbij
 * het einde van het schema.
 */
export function replanWindowEnd(fromDate: string, planEnd: string, reach: ChangeReach): string {
  if (reach === "all") return planEnd;
  const minimum = endOfWeekKey(shiftDays(fromDate, REPLAN_WINDOW_DAYS - 1));
  const end = reach && reach > minimum ? endOfWeekKey(reach) : minimum;
  return end < planEnd ? end : planEnd;
}

/**
 * Wat er sinds de laatste herziening is veranderd en hoe ver vooruit dat reikt.
 *
 * Afgeleid uit de data, niet uit de reden: verzoeken worden per nacht gebundeld
 * en de reden is vrije tekst. Telt mee:
 * - een gewijzigde weekrij van de beschikbaarheid: tot het einde van die week;
 *   de standaardweek raakt elke week, dus dan "all";
 * - een rit of event dat het lid sindsdien inplande: tot die dag;
 * - een training die sindsdien is vervallen door een regel (een dag zonder tijd)
 *   of die het lid zelf weghaalde: tot die dag. Wat een ander schema verving
 *   telt niet; anders zou de publicatie van de vorige herziening zelf het
 *   venster weer tot het einde oprekken.
 *
 * Een afgezegd event waarvan de rij is verwijderd, is hier niet meer te zien;
 * die dag wordt weer ingevuld zodra hij binnen het venster valt.
 */
export async function changeReachSince(
  admin: Admin,
  profileId: string,
  since: string,
  fromDate: string,
): Promise<ChangeReach> {
  const [{ data: availability }, { data: added }, { data: retired }, { data: skipped }] =
    await Promise.all([
      admin
        .from("training_availability")
        .select("week_start")
        .eq("profile_id", profileId)
        .gt("updated_at", since),
      admin
        .from("training_workouts")
        .select("scheduled_at")
        .eq("profile_id", profileId)
        .in("origin", ["member", "event"])
        .gt("created_at", since)
        .gte("scheduled_at", `${fromDate}T00:00:00`)
        .order("scheduled_at", { ascending: false })
        .limit(1),
      admin
        .from("training_workouts")
        .select("scheduled_at")
        .eq("profile_id", profileId)
        .gt("superseded_at", since)
        .is("superseded_by_plan_id", null)
        .gte("scheduled_at", `${fromDate}T00:00:00`)
        .order("scheduled_at", { ascending: false })
        .limit(1),
      admin
        .from("training_workouts")
        .select("scheduled_at")
        .eq("profile_id", profileId)
        .eq("status", "skipped")
        .gt("updated_at", since)
        .gte("scheduled_at", `${fromDate}T00:00:00`)
        .order("scheduled_at", { ascending: false })
        .limit(1),
    ]);

  const days: string[] = [];
  for (const row of availability ?? []) {
    if (!row.week_start) return "all";
    days.push(shiftDays(String(row.week_start).slice(0, 10), 6));
  }
  for (const row of [...(added ?? []), ...(retired ?? []), ...(skipped ?? [])]) {
    days.push(String(row.scheduled_at).slice(0, 10));
  }
  const latest = days.filter((day) => day >= fromDate).sort().pop();
  return latest ?? null;
}
