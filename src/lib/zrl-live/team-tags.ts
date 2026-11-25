// Teamtag uit een Zwift-naam, voor het live ZRL-klassement.
//
// Zwift kent geen teamveld; renners zetten hun team tussen haakjes in hun naam:
// "Jeff Parker(BMTR Racing)", "M. Mendelea Ma [BMTR Racing]", "K えさちょ［NICO-ciel］".
// Gemeten 2026-09-22: 19 van de 51 renners in een ZRL-divisie hadden geen tag, en
// één team stond er in vier spellingen. Daarom is dit alleen een voorstel; een
// ploegleider stelt het bij, en sinds 2026-11-25 vult de WTRL-uitslag van
// eerdere races de indeling aan (src/lib/wtrl/assignments.ts).

import { parseZwiftZrlEventName } from "@/lib/events/zrl-event-link";

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

export type ZrlDivisionParts = {
  /** "26/27". */
  season: string;
  round: number;
  women: boolean;
  development: boolean;
  /** Kleur van de league, in kleine letters: "aqua". */
  league: string;
  number: number;
  /** Categorie, gelijk aan het Zwift-subgroeplabel: "B". */
  category: string;
};

/**
 * Sleutel van één divisie in één ronde. Zowel de live stand (uit de Zwift-
 * eventnaam) als de WTRL-import (uit de WTRL-klasse) bouwen hem, dus de vorm
 * moet aan beide kanten gelijk zijn.
 */
export function zrlDivisionKey(parts: ZrlDivisionParts): string {
  const competition = `${parts.women ? "women" : "open"}${parts.development ? " dev" : ""}`;
  return `${parts.season}|r${parts.round}|${competition}|${parts.league}|${parts.number}|${parts.category}`;
}

/** Seizoen en ronde uit "2026/27 Round 2: Team Tempo" of een Zwift-eventnaam. */
export function zrlSeasonRound(text: string): { season: string; round: number } | null {
  const season = /\b(?:\d{2})?(\d{2}\/\d{2})\b/.exec(text)?.[1];
  const round = /\bRound\s+(\d+)\b/i.exec(text)?.[1];
  return season && round ? { season, round: Number(round) } : null;
}

/**
 * Sleutel waaronder de teambijstelling bewaard blijft: seizoen, ronde, league,
 * divisie en Zwift-subgroep, uit de eventnaam ("Zwift Racing League 2026/27
 * Round 2: Team Tempo - Open Aqua League Division 4 - Race 2"). Dezelfde divisie
 * rijdt de hele ronde tegen dezelfde teams.
 *
 * Ronde 1 van 26/27 had geen rondenummer in de naam ("Zwift Racing League
 * 26/27: Fresh & Fast: Open Topaz League Division 1 - Race 1"); die houdt de
 * oude sleutel, zodat de bijstellingen van toen blijven gelden. De nieuwe naam
 * las de oude code niet ("2026/27"), waardoor elke bijstelling in ronde 2 maar
 * één week gold. Zonder herkenbare naam: per Zwift-event.
 */
export function zrlLeagueKey(eventName: string, subgroupLabel: string, zwiftEventId: string): string {
  const seasonRound = zrlSeasonRound(eventName);
  const division = parseZwiftZrlEventName(eventName);
  if (seasonRound && division?.number != null) {
    return zrlDivisionKey({ ...seasonRound, ...division, number: division.number, category: subgroupLabel });
  }
  const season = eventName.match(/\b(\d{2}\/\d{2})\b/)?.[1];
  const legacy = eventName.match(/:\s*([^:]+?)\s+Division\s+(\d+)/i);
  if (!season || !legacy) return `event:${zwiftEventId}:${subgroupLabel}`;
  return `${season}|${teamKey(legacy[1])}|${legacy[2]}|${subgroupLabel}`;
}

/**
 * Weergavenaam uit alle spellingen van één team: de vaakst getypte, bij
 * gelijkspel een met hoofdletters boven alles-klein ("Foudre" boven "foudre"),
 * dan de kaalste (zonder emoji of losse tekens).
 */
export function pickTeamLabel(spellings: string[]): string {
  const counts = new Map<string, number>();
  for (const raw of spellings) {
    const spelling = raw.trim();
    if (spelling) counts.set(spelling, (counts.get(spelling) ?? 0) + 1);
  }
  const noise = (s: string) => s.replace(/[\p{L}\p{N} ]/gu, "").length;
  const hasCapital = (s: string) => (s !== s.toLowerCase() ? 1 : 0);
  return (
    [...counts].sort(
      ([a, na], [b, nb]) =>
        nb - na || hasCapital(b) - hasCapital(a) || noise(a) - noise(b) || a.localeCompare(b),
    )[0]?.[0] ?? ""
  );
}
