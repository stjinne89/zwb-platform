// Wat je in beeld hebt in het streamcenter (2026-11-26). Los van
// stream-center.ts, omdat de client dit importeert en daar serverwerk in zit
// (de links van een race).

/**
 * Wat je in beeld hebt (2026-11-26), per avond op dit apparaat bewaard: welke
 * streams verborgen zijn, Raster of Groot, en welke stream groot staat. We
 * bewaren de verborgen streams, zodat een stream die later bijkomt gewoon in
 * beeld komt.
 */
export type StreamCenterLayout = "raster" | "groot";
export type StreamCenterPrefs = { hidden: string[]; layout: StreamCenterLayout; big: string | null };

export const DEFAULT_STREAM_CENTER_PREFS: StreamCenterPrefs = { hidden: [], layout: "raster", big: null };

export function parseStreamCenterPrefs(raw: string | null): StreamCenterPrefs {
  if (!raw) return DEFAULT_STREAM_CENTER_PREFS;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof StreamCenterPrefs, unknown>>;
    return {
      hidden: Array.isArray(value.hidden) ? value.hidden.filter((id): id is string => typeof id === "string") : [],
      layout: value.layout === "groot" ? "groot" : "raster",
      big: typeof value.big === "string" ? value.big : null,
    };
  } catch {
    return DEFAULT_STREAM_CENTER_PREFS;
  }
}

/**
 * De streams in beeld, in hun eigen volgorde, en welke groot staat. Er blijft er
 * altijd minstens één in beeld. Groot alleen bij twee of meer; staat de gekozen
 * stream niet (meer) in beeld, dan de eerste.
 */
export function streamCenterView(ids: string[], prefs: StreamCenterPrefs): { visible: string[]; big: string | null } {
  const hidden = new Set(prefs.hidden);
  const shown = ids.filter((id) => !hidden.has(id));
  const visible = shown.length > 0 ? shown : ids;
  if (prefs.layout !== "groot" || visible.length < 2) return { visible, big: null };
  return { visible, big: prefs.big && visible.includes(prefs.big) ? prefs.big : visible[0] };
}

/** Een stream in of uit beeld; de laatste in beeld blijft staan. */
export function toggleStreamCenterTile(ids: string[], prefs: StreamCenterPrefs, id: string): StreamCenterPrefs {
  const { visible } = streamCenterView(ids, prefs);
  if (visible.includes(id)) {
    if (visible.length <= 1) return prefs;
    // Alleen ids van nu: oude streams van een andere avond blijven niet hangen.
    return { ...prefs, hidden: ids.filter((other) => other === id || !visible.includes(other)) };
  }
  return { ...prefs, hidden: ids.filter((other) => other !== id && !visible.includes(other)) };
}
