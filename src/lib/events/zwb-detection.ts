// Auto-detectie van ZWB-events en matching van deelnemers tegen leden.
// Gebruikt door de eventscan om ZWB's eigen ritten automatisch als concept te
// markeren en om geplakte/geimporteerde namen automatisch aan profielen te
// koppelen. Bewust conservatief: liever niets matchen dan een verkeerde match.

import type { ExternalEventCandidate } from "@/lib/events/external-scan";

export type ZwbMatchStatus = "unknown" | "likely" | "confirmed" | "manual";

// Markers die op ZWB's eigen events wijzen. Override via env
// `ZWB_EVENT_MARKERS` (komma-gescheiden) zonder code te wijzigen.
const DEFAULT_MARKERS = ["zwb", "zwift belgie", "zwift belgium"];

export function zwbEventMarkers(): string[] {
  const raw = process.env.ZWB_EVENT_MARKERS;
  const markers = raw
    ? raw.split(",").map((marker) => marker.trim()).filter(Boolean)
    : DEFAULT_MARKERS;
  return markers.map((marker) => normalizeName(marker)).filter(Boolean);
}

// Woordgrens-veilige check op genormaliseerde tekst, zodat "zwb" niet matcht
// in "zwbart" maar wel in "ZWB Woensdagrit" of "[ZWB] Race".
function markerHit(haystack: string, normalizedMarker: string) {
  return ` ${normalizeName(haystack)} `.includes(` ${normalizedMarker} `);
}

/**
 * Bepaalt of een scankandidaat een ZWB-event lijkt op basis van titel en
 * (bij Zwift) de serienaam. Geeft `confirmed` als zowel titel als serie raken,
 * `likely` bij een treffer, anders `null` (laat status ongemoeid).
 */
export function detectZwbMatchStatus(
  candidate: Pick<ExternalEventCandidate, "title" | "rawMetadata">,
): Exclude<ZwbMatchStatus, "unknown" | "manual"> | null {
  const markers = zwbEventMarkers();
  const series = String(
    (candidate.rawMetadata as { series?: unknown }).series ?? "",
  );
  const titleHit = markers.some((marker) => markerHit(candidate.title, marker));
  const seriesHit =
    series.length > 0 && markers.some((marker) => markerHit(series, marker));

  if (titleHit && seriesHit) return "confirmed";
  if (titleHit || seriesHit) return "likely";
  return null;
}

/** Lowercase, zonder diakrieten, teamtags ([..]/(..)) en losse leestekens. */
export function normalizeName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type MatchableProfile = {
  id: string;
  display_name: string;
  zwift_id: string | null;
  mywhoosh_id: string | null;
};

/**
 * Koppelt een externe deelnemer aan een profiel. Probeert eerst een exacte
 * platform-ID-match (Zwift/MyWhoosh) en valt daarna terug op een exacte match
 * op genormaliseerde weergavenaam. Geen fuzzy matching: dat geeft te snel
 * vals-positieven bij bijna-gelijke namen.
 */
export function matchProfile(
  externalName: string,
  profiles: MatchableProfile[],
  options?: { zwiftId?: string | null; myWhooshId?: string | null },
): string | null {
  const zwiftId = options?.zwiftId?.trim();
  const myWhooshId = options?.myWhooshId?.trim();
  if (zwiftId) {
    const byZwift = profiles.find((profile) => profile.zwift_id?.trim() === zwiftId);
    if (byZwift) return byZwift.id;
  }
  if (myWhooshId) {
    const byMyWhoosh = profiles.find(
      (profile) => profile.mywhoosh_id?.trim() === myWhooshId,
    );
    if (byMyWhoosh) return byMyWhoosh.id;
  }

  const normalized = normalizeName(externalName);
  if (!normalized) return null;
  const matches = profiles.filter(
    (profile) => normalizeName(profile.display_name) === normalized,
  );
  // Alleen koppelen als de naam uniek is; bij meerdere kandidaten met dezelfde
  // genormaliseerde naam laten we het aan de admin over.
  return matches.length === 1 ? matches[0].id : null;
}
