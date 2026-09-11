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

export type PurgeResult = {
  activities: number;
  efforts: number;
  bikes: number;
};

const STRAVA_CDN_AVATAR = /strava|cloudfront\.net\/(avatar|pictures)/i;

/**
 * Wist alles wat rechtstreeks van Strava komt voor dit profiel.
 *
 * strava_activity_segment_efforts en strava_activity_summaries hangen met
 * `on delete cascade` aan strava_activities (migraties 0072 en 0102), dus die
 * verdwijnen mee. De losse delete op efforts is de vangnet-regel voor rijen die
 * ooit zonder bijbehorende activiteit zijn blijven staan.
 */
export async function purgeStravaDataForProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<PurgeResult> {
  const result: PurgeResult = { activities: 0, efforts: 0, bikes: 0 };

  const { count: activityCount } = await admin
    .from("strava_activities")
    .delete({ count: "exact" })
    .eq("profile_id", profileId);
  result.activities = activityCount ?? 0;

  const { count: effortCount } = await admin
    .from("strava_activity_segment_efforts")
    .delete({ count: "exact" })
    .eq("profile_id", profileId);
  result.efforts = effortCount ?? 0;

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
