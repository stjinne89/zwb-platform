/**
 * Programma's (migr. 0226): een reeks events van verschillende categorieën en
 * types die bij elkaar horen, zoals "Road to WK GF" of een ZRL-seizoen. Elk
 * event houdt zijn eigen kalenderregel; het programma is een label met een
 * eigen pagina. Een event kan in meerdere programma's zitten.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type EventProgram = { id: string; slug: string; name: string };

/** "Road to WK GF 2027!" → "road-to-wk-gf-2027". Leeg als er niets bruikbaars overblijft. */
export function slugifyProgramName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** De programma's per event, in de volgorde van `programs`. Onbekende id's vallen weg. */
export function programsByEvent(
  programs: EventProgram[],
  links: Array<{ program_id: string; event_id: string }>,
): Map<string, EventProgram[]> {
  const linked = new Map<string, Set<string>>();
  for (const link of links) {
    const set = linked.get(link.event_id) ?? new Set<string>();
    set.add(link.program_id);
    linked.set(link.event_id, set);
  }
  const result = new Map<string, EventProgram[]>();
  for (const [eventId, programIds] of linked) {
    const list = programs.filter((program) => programIds.has(program.id));
    if (list.length > 0) result.set(eventId, list);
  }
  return result;
}

/**
 * De programma's van een kalenderregel: die van het event zelf plus die van
 * alles eronder (teamevents, etappes, tijdsloten). Zo telt een raceweek mee
 * als alleen het event van één team is gekoppeld.
 */
export function programsForGroup<T extends { id: string }>(
  event: T,
  childrenByParent: Map<string, T[]>,
  byEvent: Map<string, EventProgram[]>,
): EventProgram[] {
  const seen = new Map<string, EventProgram>();
  const visit = (current: T) => {
    for (const program of byEvent.get(current.id) ?? []) seen.set(program.id, program);
    for (const child of childrenByParent.get(current.id) ?? []) visit(child);
  };
  visit(event);
  return [...seen.values()];
}

/** Wat er bij moet en wat er af moet om van `current` naar `wanted` te komen. */
export function diffProgramIds(current: string[], wanted: string[]) {
  return {
    add: wanted.filter((id) => !current.includes(id)),
    remove: current.filter((id) => !wanted.includes(id)),
  };
}

/**
 * Zet de programma's van één event gelijk aan `wanted`. Met de client van het
 * lid, zodat RLS bepaalt of het mag (aanmaker of eventbeheerder).
 */
export async function syncEventPrograms(
  client: SupabaseClient,
  eventId: string,
  wanted: string[],
): Promise<string | null> {
  const { data, error } = await client
    .from("event_program_links")
    .select("program_id")
    .eq("event_id", eventId);
  if (error) return error.message;
  const current = (data ?? []).map((row) => row.program_id as string);
  const { add, remove } = diffProgramIds(current, [...new Set(wanted)]);
  if (remove.length > 0) {
    const { error: removeError } = await client
      .from("event_program_links")
      .delete()
      .eq("event_id", eventId)
      .in("program_id", remove);
    if (removeError) return removeError.message;
  }
  if (add.length > 0) {
    const { error: addError } = await client
      .from("event_program_links")
      .insert(add.map((program_id) => ({ program_id, event_id: eventId })));
    if (addError) return addError.message;
  }
  return null;
}
