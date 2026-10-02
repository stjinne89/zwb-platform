// Beschikbaarheid voor een SRC-zondag wordt een antwoord op de eigen race
// (migr. 0201). Een lid zegt per zondag of het kan; ZWB weet uit de maandinschrijving
// of het de heren- of damesrace is. Beschikbaar is ja, misschien is misschien,
// niet is nee. Zo staat de race in "Jouw races" en in het trainingsschema, zoals
// een ZRL-opstelling dat doet.
//
// Staat de race nog niet in de kalender (de feed loopt een week vooruit), dan
// zet de sync het antwoord zodra hij de race aanmaakt.

import type { SupabaseClient } from "@supabase/supabase-js";
import { syncEventWorkout } from "@/lib/training/events";
import { requestReplan } from "@/lib/training/replan";
import type { SrcGender } from "@/lib/src/feed";
import {
  RSVP_FOR_AVAILABILITY,
  srcMonthKey,
  type SrcAvailabilityStatus,
} from "@/lib/src/month";
import type { SrcImportResult } from "@/lib/src/import";

/** De race van dit geslacht onder een zondag, of null als die er nog niet is. */
export async function srcRaceOfSunday(
  admin: SupabaseClient,
  parentId: string,
  gender: SrcGender,
): Promise<string | null> {
  const { data: children } = await admin.from("events").select("id").eq("parent_event_id", parentId);
  const ids = ((children ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (ids.length === 0) return null;
  const { data } = await admin
    .from("src_races")
    .select("event_id")
    .in("event_id", ids)
    .eq("gender", gender)
    .maybeSingle();
  return (data?.event_id as string | undefined) ?? null;
}

/** Zet het antwoord op een race en werkt het trainingsschema bij. */
export async function setSrcRaceRsvp(
  admin: SupabaseClient,
  profileId: string,
  raceId: string,
  status: SrcAvailabilityStatus,
) {
  const rsvp = RSVP_FOR_AVAILABILITY[status];
  const { error } = await admin.from("event_rsvps").upsert(
    { event_id: raceId, profile_id: profileId, status: rsvp, updated_at: new Date().toISOString() },
    { onConflict: "event_id,profile_id" },
  );
  if (error) throw new Error(error.message);
  const { inserted, removed } = await syncEventWorkout(admin, profileId, raceId, rsvp).catch(
    () => ({ inserted: false, removed: false }),
  );
  return inserted || removed;
}

/**
 * Voor races die de sync net aanmaakte: de beschikbaarheid die leden al op de
 * zondag gaven, wordt hun antwoord op de race van hun geslacht.
 */
export async function rsvpNewSrcRaces(
  admin: SupabaseClient,
  created: SrcImportResult["created"],
): Promise<number> {
  let count = 0;
  for (const race of created) {
    const [{ data: availability }, { data: entries }] = await Promise.all([
      admin
        .from("team_event_availability")
        .select("profile_id, team_id, status")
        .eq("event_id", race.parentId),
      admin
        .from("src_month_entries")
        .select("profile_id, team_id")
        .eq("month", srcMonthKey(race.sunday))
        .eq("race", race.gender),
    ]);
    const teamOf = new Map(
      ((entries ?? []) as Array<{ profile_id: string; team_id: string }>).map((row) => [
        row.profile_id,
        row.team_id,
      ]),
    );
    for (const row of (availability ?? []) as Array<{
      profile_id: string;
      team_id: string;
      status: SrcAvailabilityStatus;
    }>) {
      if (teamOf.get(row.profile_id) !== row.team_id) continue;
      try {
        const changed = await setSrcRaceRsvp(admin, row.profile_id, race.eventId, row.status);
        count += 1;
        if (changed) {
          await requestReplan(admin, row.profile_id, "Sunday Race Club in de kalender gezet.").catch(
            () => null,
          );
        }
      } catch {
        // De volgende run probeert het niet opnieuw (de race bestaat dan al); het
        // lid kan zelf op de race antwoorden.
      }
    }
  }
  return count;
}
