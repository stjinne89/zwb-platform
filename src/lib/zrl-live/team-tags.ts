// Teamtag uit een Zwift-naam, voor het live ZRL-klassement.
//
// Zwift kent geen teamveld; renners zetten hun team tussen haakjes in hun naam:
// "Jeff Parker(BMTR Racing)", "M. Mendelea Ma [BMTR Racing]", "K えさちょ［NICO-ciel］".
// Gemeten 2026-09-22: 19 van de 51 renners in een ZRL-divisie hadden geen tag, en
// één team stond er in vier spellingen. Daarom is dit alleen een voorstel; een
// ploegleider stelt het bij.

const BRACKETS: Array<[string, string]> = [
  ["(", ")"], ["[", "]"], ["{", "}"], ["（", "）"], ["［", "］"], ["【", "】"], ["<", ">"],
];

/** De laatste tekst tussen haakjes, of null. */
export function extractTeamTag(name: string): string | null {
  let best: { at: number; tag: string } | null = null;
  for (const [open, close] of BRACKETS) {
    const end = name.lastIndexOf(close);
    if (end < 0) continue;
    const start = name.lastIndexOf(open, end);
    if (start < 0) continue;
    const tag = name.slice(start + open.length, end).trim();
    if (tag && (!best || end > best.at)) best = { at: end, tag };
  }
  return best?.tag ?? null;
}

/** Vergelijkingssleutel: kleine letters, zonder emoji en leestekens. */
export function teamKey(tag: string): string {
  return tag
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sleutel waaronder de teambijstelling bewaard blijft: seizoen, league, divisie
 * en Zwift-subgroep, uit de eventnaam ("Zwift Racing League 26/27: Fresh & Fast:
 * Open Topaz League Division 1 - Race 1"). Dezelfde divisie rijdt de hele ronde
 * tegen dezelfde teams. Zonder herkenbare naam: per Zwift-event.
 */
export function zrlLeagueKey(eventName: string, subgroupLabel: string, zwiftEventId: string): string {
  const season = eventName.match(/\b(\d{2}\/\d{2})\b/)?.[1];
  const division = eventName.match(/:\s*([^:]+?)\s+Division\s+(\d+)/i);
  if (!season || !division) return `event:${zwiftEventId}:${subgroupLabel}`;
  return `${season}|${teamKey(division[1])}|${division[2]}|${subgroupLabel}`;
}
