// Wat van een Strava-segmentpoging in `raw` bewaard blijft.
//
// De database leest alleen `source` (eigen GPS-meting, 0199) en
// `segment.private` (klassement en KOM's); `hidden` blijft voor de zekerheid
// staan. De rest van de effort (atleet, activiteit, segmentobject, hartslag,
// achievements) was ~670 MB van een database van 1,3 GB. Migratie 0209 kort
// hetzelfde in met een trigger; dit houdt de payload naar de database klein.
export function slimSegmentEffortRaw(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const slim: Record<string, unknown> = {};
  if (source.source != null) slim.source = source.source;
  if (source.hidden != null) slim.hidden = source.hidden;
  const segment = source.segment;
  if (segment && typeof segment === "object" && !Array.isArray(segment)) {
    const isPrivate = (segment as Record<string, unknown>).private;
    if (isPrivate != null) slim.segment = { private: isPrivate };
  }
  return slim;
}
