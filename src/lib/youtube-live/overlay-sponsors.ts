// De sponsors in de OBS-overlay (0354, 2026-11-23): één sponsor kan vast staan,
// de rest wisselt ernaast. Puur, voor de tests.

export function splitOverlaySponsors<T extends { overlayFixed?: boolean }>(sponsors: readonly T[]): { fixed: T | null; rotating: T[] } {
  const fixed = sponsors.find((s) => s.overlayFixed) ?? null;
  return { fixed, rotating: sponsors.filter((s) => s !== fixed) };
}
