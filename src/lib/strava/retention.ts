// Dataretentie bij een ingetrokken Strava-koppeling.
//
// Strava's API Agreement verwacht dat je Strava-data verwijdert zodra een atleet
// de toestemming intrekt. Tot nu toe deed de app het omgekeerde: "Je gesyncte
// ritten blijven bewaard".
//
// De gekozen middenweg: de ruwe Strava-data gaat weg, de afgeleide clubdata blijft.
// Een lid dat ontkoppelt verliest dus zijn ritgeschiedenis, maar niet zijn plek in
// de clubhistorie -- behaalde badges, ZWBlokken-totalen, onderhoudsstanden en
// beklommen cols blijven staan. profile_climbed_cols degradeert daarbij netjes:
// de FK best_time_activity_id staat op `on delete set null` (migratie 0075), dus
// de tijd blijft en alleen de verwijzing naar de rit verdwijnt.
//
// Uitzondering sinds 2026-10-01: ontkoppelt een lid zelf en kiest hij "Ritten
// bewaren", dan wordt hier niets gewist (keepsStravaData in lifecycle.ts). Dat
// gaat tegen Strava's API-beleid in; de eigenaar heeft dat zo besloten.

import { INTERVALS_RIDE_ID_CEILING } from "@/lib/intervals/ride-id";

export type PurgeResult = {
  activities: number;
  segmentTimes: number;
  bikes: number;
};

const STRAVA_CDN_AVATAR = /strava|cloudfront\.net\/(avatar|pictures)/i;

/**
 * Wist alles wat rechtstreeks van Strava komt voor dit profiel.
 *
 * strava_activity_summaries hangt met `on delete cascade` aan strava_activities
 * (migratie 0102), dus die verdwijnt mee.
 */
export async function purgeStravaDataForProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<PurgeResult> {
  const result: PurgeResult = { activities: 0, segmentTimes: 0, bikes: 0 };

  // Ritten via intervals.icu (lib/intervals/rides.ts) zijn geen Strava-data en
  // blijven staan; anders verliest een lid dat overstapt meteen alles.
  const { count: activityCount } = await admin
    .from("strava_activities")
    .delete({ count: "exact" })
    .eq("profile_id", profileId)
    .gt("id", INTERVALS_RIDE_ID_CEILING);
  result.activities = activityCount ?? 0;

  // Tijden op uitgekozen segmenten die van Strava kwamen. Tot oktober 2026
  // verdwenen die vanzelf met de segmentpogingen; nu staan ze alleen nog in
  // profile_completed_segments. Cols blijven (zie boven), en een eigen GPS-tijd
  // (best_time_source = 'gps') is geen Strava-data: die wordt hierna opnieuw
  // toegepast voor het geval een Strava-tijd hem had overschreven.
  const { data: segmentRows } = await admin
    .from("zwb_segments")
    .select("slug")
    .neq("collection", "cols");
  const slugs = ((segmentRows ?? []) as Array<{ slug: string }>).map((row) => row.slug);
  if (slugs.length > 0) {
    const { count: segmentCount } = await admin
      .from("profile_completed_segments")
      .delete({ count: "exact" })
      .eq("profile_id", profileId)
      .is("best_time_source", null)
      .in("segment_slug", slugs);
    result.segmentTimes = segmentCount ?? 0;
    try {
      const { applyGpsSegmentTimesForUser } = await import("@/lib/cols/gps-col-times");
      await applyGpsSegmentTimesForUser(admin, profileId);
    } catch {
      // niet kritiek: de volgende sync van eigen ritten past ze alsnog toe
    }
  }

  // Handmatig toegevoegde fietsen zijn eigen invoer van het lid en blijven staan;
  // alleen wat uit Strava's gear-endpoint kwam gaat weg.
  const { count: bikeCount } = await admin
    .from("strava_bikes")
    .delete({ count: "exact" })
    .eq("profile_id", profileId)
    .eq("source", "strava");
  result.bikes = bikeCount ?? 0;

  // De avatar is Strava's bestand; dat blijven we niet hotlinken zonder grant.
  // Een zelf geüploade foto raken we niet aan.
  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", profileId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = { strava_id: null };
  const avatar = profile?.avatar_url as string | null | undefined;
  if (avatar && STRAVA_CDN_AVATAR.test(avatar)) patch.avatar_url = null;

  await admin.from("profiles").update(patch).eq("id", profileId);

  return result;
}

/** Puur, zodat de avatarregel in een unit-test vastligt. */
export function isStravaHostedAvatar(url: string | null | undefined): boolean {
  return Boolean(url && STRAVA_CDN_AVATAR.test(url));
}
