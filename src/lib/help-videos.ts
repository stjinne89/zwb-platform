/**
 * Korte video's per onderdeel, in public/hulp-video/. Gemaakt met
 * scripts/instructievideo (CLIPS in scenes.mjs) en met demodata, dus zonder
 * echte leden in beeld. Komt er een clip bij of verandert een duur, dan hier
 * bijwerken; `bouw.mjs` schrijft de duur in out/hulp/clips.json.
 *
 * Gedeeld door /hulp en de starthelper op /welkom.
 */
export const HELP_VIDEOS = [
  { id: "account-aanmaken", title: "Account aanmaken", seconds: 45 },
  { id: "starthelper", title: "De starthelper", seconds: 18 },
  { id: "app-op-beginscherm", title: "App op je beginscherm", seconds: 21 },
  { id: "wegwijs", title: "Wegwijs in de app", seconds: 29 },
  { id: "zwift-id", title: "Je Zwift-ID", seconds: 20 },
  { id: "profiel", title: "Je profiel", seconds: 27 },
  { id: "strava-koppelen", title: "Strava koppelen", seconds: 17 },
  { id: "zonder-strava", title: "Ritten zonder Strava", seconds: 17 },
  { id: "intervals-koppelen", title: "intervals.icu koppelen", seconds: 19 },
  { id: "mijn-garage", title: "Je fietsen en Mijn garage", seconds: 23 },
  { id: "meldingen", title: "Meldingen aanzetten", seconds: 16 },
  { id: "live-gps", title: "Live met Garmin of Wahoo", seconds: 25 },
  { id: "aanmelden-event", title: "Aanmelden voor een event", seconds: 12 },
  { id: "kj-standen", title: "Durability: de kJ-standen", seconds: 48 },
] as const;

export type HelpVideoId = (typeof HELP_VIDEOS)[number]["id"];
export type HelpVideo = (typeof HELP_VIDEOS)[number];

export function helpVideo(id: HelpVideoId): HelpVideo {
  return HELP_VIDEOS.find((video) => video.id === id)!;
}

/** 0:17, 1:05 */
export function helpVideoDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// Een gewone link naar het mp4-bestand: op de telefoon opent de eigen
// videospeler, en er hoeft geen speler in de pagina te laden.
export function helpVideoHref(id: HelpVideoId) {
  return `/hulp-video/${id}.mp4`;
}
