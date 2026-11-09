// Clubherkenning (fase 4): waaraan de app ziet dat een event, een renner of een
// uitslagregel van de club is. Puur, zodat ook code die in de browser kan
// belanden het kan gebruiken; de waarden komen uit getClub().recognition.

export type ClubRecognition = {
  /** Woorden in een eventtitel of -serie die op een eigen event wijzen. */
  eventMarkers: string[];
  /** De teamtag achter een naam, zoals "ZWB" in "Linda Kuiper [ZWB]". */
  teamTag: string;
};

/**
 * Volgorde: de env ZWB_EVENT_MARKERS (komma-gescheiden), dan de kolom, dan de
 * korte naam. Zo verandert er niets als de env op Netlify een eigen waarde heeft.
 */
export function buildClubRecognition(input: {
  shortName: string;
  eventMarkers?: string[] | null;
  teamTag?: string | null;
  envMarkers?: string | null;
}): ClubRecognition {
  const fromEnv = (input.envMarkers ?? "")
    .split(",")
    .map((marker) => marker.trim())
    .filter(Boolean);
  const fromColumn = (input.eventMarkers ?? []).map((marker) => marker.trim()).filter(Boolean);
  const eventMarkers = fromEnv.length ? fromEnv : fromColumn.length ? fromColumn : [input.shortName];
  return { eventMarkers, teamTag: input.teamTag?.trim() || input.shortName };
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Noemt de tekst de club als los woord ("ZWB" wel, "zwbart" niet)? */
export function mentionsClub(text: string, teamTag: string): boolean {
  const tag = teamTag.trim();
  if (!tag) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(tag)}([^a-z0-9]|$)`, "i").test(text);
}
