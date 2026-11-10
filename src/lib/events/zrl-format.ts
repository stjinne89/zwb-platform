// Het format van een ZRL-race (puntenrace, Race of Truth, scratch, ploegentijdrit).
//
// WTRL maakt het format per ronde bekend; de importeur raadt het daarom niet
// meer. Tot 2026-11-11 zette die week 1 altijd op Race of Truth, en ronde 2 opende
// met een ploegentijdrit. Het format komt nu uit het gekoppelde Zwift-event en
// staat daarna achter de titel: "ZRL 2026/27 · R2 · W1 · B1 — Team Time Trial".
//
// Wat Zwift opgeeft (gemeten in ronde 1, 2026/27): een tag (`rot`, `pts`,
// `zrl_points`, `scr`, `zrl_scr`, `ttt`, `zrl_ttt`), bij een ploegentijdrit het
// eventtype TEAM_TIME_TRIAL, en vaak het format tussen haakjes achter de
// beschrijving: "Race: 4 of 5 (SCRATCH RACE)".

import type { ZrlFormat } from "@/lib/zwbgame/types";

export type { ZrlFormat };

export const ZRL_FORMAT_LABEL: Record<ZrlFormat, string> = {
  points: "Points Race",
  rot: "Race of Truth",
  scratch: "Scratch Race",
  ttt: "Team Time Trial",
};

/** Het format volgens Zwift, of null als het event het niet zegt. Puur. */
export function zrlFormatFromZwift(event: unknown): ZrlFormat | null {
  const { tags, description, eventType } = (event ?? {}) as {
    tags?: unknown;
    description?: unknown;
    eventType?: unknown;
  };
  const tagSet = new Set(Array.isArray(tags) ? tags.map((tag) => String(tag).toLowerCase()) : []);
  const has = (...names: string[]) => names.some((name) => tagSet.has(name));
  const text = typeof description === "string" ? description : "";

  if (has("ttt", "zrl_ttt") || eventType === "TEAM_TIME_TRIAL" || /\((ttt|team time trial)\)/i.test(text)) {
    return "ttt";
  }
  if (has("rot", "zrl_rot") || /\(race of truth\)/i.test(text)) return "rot";
  if (has("scr", "zrl_scr") || /\(scratch( race)?\)/i.test(text)) return "scratch";
  if (has("pts", "zrl_pts", "zrl_points") || /\(points( race)?\)/i.test(text)) return "points";
  return null;
}

/** "ZRL 2026/27 · R2 · W1", met of zonder team; zo maakt de import ze aan. */
const GENERATED_TITLE = /^ZRL \S+ · R\d+ · W\d+(?: · .+)?$/;

/**
 * De titel met het format erachter, of null als er niets verandert. Een titel
 * die niet uit de import komt (met de hand hernoemd) blijft staan. Een format
 * dat er al staat, ook een verkeerd, wordt vervangen. Puur.
 */
export function zrlTitleWithFormat(title: string, format: ZrlFormat): string | null {
  const base = title.replace(/ — .*$/, "");
  if (!GENERATED_TITLE.test(base)) return null;
  const next = `${base} — ${ZRL_FORMAT_LABEL[format]}`;
  return next === title ? null : next;
}

/** Het format uit een titel die de sync heeft aangevuld, of null. Puur. */
export function zrlFormatFromTitle(title: string): ZrlFormat | null {
  const suffix = / — (.+)$/.exec(title)?.[1]?.trim().toLowerCase();
  if (!suffix) return null;
  const entry = Object.entries(ZRL_FORMAT_LABEL).find(([, label]) => label.toLowerCase() === suffix);
  return entry ? (entry[0] as ZrlFormat) : null;
}
