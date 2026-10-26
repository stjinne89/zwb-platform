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
  nextSrcMonth,
  RSVP_FOR_AVAILABILITY,
  srcMonthKey,
  type SrcAvailabilityStatus,
} from "@/lib/src/month";
import type { SrcImportResult } from "@/lib/src/import";
import { srcRaceForSex } from "@/lib/src/auto-join";

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

/**
 * Het lid paste zijn geslacht aan: de inschrijving van deze en komende maanden
 * gaat naar de race die daarbij hoort. Zonder dit bleef wie al was
 * ingeschreven vóór het profiel "vrouw" zei bij de heren staan (Femke,
 * 2026-10). Het antwoord op komende zondagen verhuist mee: de oude race krijgt
 * nee, de nieuwe het antwoord dat het lid op de zondag gaf. Alleen "man" en
 * "vrouw" verplaatsen; "zeg ik liever niet" of leeg laat staan wat er staat.
 *
 * Geeft het aantal verplaatste maanden terug.
 */
export async function followSrcProfileSex(
  admin: SupabaseClient,
  profileId: string,
  sex: string | null,
  today: string,
): Promise<number> {
  if (sex !== "man" && sex !== "vrouw") return 0;
  const race = srcRaceForSex(sex);
  const other: SrcGender = race === "women" ? "men" : "women";

  const { data } = await admin
    .from("src_month_entries")
    .select("month, team_id")
    .eq("profile_id", profileId)
    .eq("race", other)
    .gte("month", srcMonthKey(today));
  const entries = (data ?? []) as Array<{ month: string; team_id: string }>;
  let replan = false;

  for (const entry of entries) {
    const { error } = await admin
      .from("src_month_entries")
      .update({ race, updated_at: new Date().toISOString() })
      .eq("month", entry.month)
      .eq("profile_id", profileId);
    if (error) throw new Error(error.message);

    const { data: sundays } = await admin
      .from("events")
      .select("id")
      .gte("src_sunday", today > entry.month ? today : entry.month)
      .lt("src_sunday", nextSrcMonth(entry.month))
      .is("parent_event_id", null);
    for (const sunday of (sundays ?? []) as Array<{ id: string }>) {
      const { data: availability } = await admin
        .from("team_event_availability")
        .select("status")
        .eq("event_id", sunday.id)
        .eq("team_id", entry.team_id)
        .eq("profile_id", profileId)
        .maybeSingle();

      const oldRace = await srcRaceOfSunday(admin, sunday.id, other);
      if (oldRace) {
        const { data: answered } = await admin
          .from("event_rsvps")
          .select("status")
          .eq("event_id", oldRace)
          .eq("profile_id", profileId)
          .maybeSingle();
        if (answered && answered.status !== "no") {
          replan = (await setSrcRaceRsvp(admin, profileId, oldRace, "unavailable")) || replan;
        }
      }
      const newRace = await srcRaceOfSunday(admin, sunday.id, race);
      if (newRace && availability) {
        replan =
          (await setSrcRaceRsvp(
            admin,
            profileId,
            newRace,
            availability.status as SrcAvailabilityStatus,
          )) || replan;
      }
    }
  }

  if (replan) {
    await requestReplan(admin, profileId, "Sunday Race Club: andere race na profielwijziging.").catch(
      () => null,
    );
  }
  return entries.length;
}
