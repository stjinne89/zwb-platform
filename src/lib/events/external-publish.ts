// Pure afleidingen voor het publiceren van externe (Zwift/MyWhoosh) concepten
// naar de kalender. Los van de server-action zodat ze unit-getest kunnen worden.

export type ExternalEventTypeMapping = {
  type: string;
  location: string;
};

// Eigen eventtype + locatie per bron, zodat een gepubliceerd Zwift-/MyWhoosh-
// concept als zodanig op de kalender staat in plaats van als generiek "Online".
export function eventTypeForSource(source: string | null): ExternalEventTypeMapping {
  if (source === "zwift") return { type: "zwift", location: "Zwift" };
  if (source === "mywhoosh") return { type: "mywhoosh", location: "MyWhoosh" };
  return { type: "overig", location: "Online" };
}

// ZwiftPower toont de uitslag per event op events.php?zid=<zwift-event-id>. Dat
// id is exact het externe id van het Zwift-concept (ook in de zwift.com-link),
// dus de uitslag-URL is deterministisch af te leiden.
export function resultsUrlForSource(
  source: string | null,
  externalId: string | null,
): string | null {
  if (source !== "zwift") return null;
  const zid = String(externalId ?? "").trim();
  return /^\d+$/.test(zid) ? `https://zwiftpower.com/events.php?zid=${zid}` : null;
}
