"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { adminAreaPermission } from "@/lib/admin-areas";
import { EVENT_KIND_VALUES, EVENT_TYPE_VALUES } from "@/lib/event-types";
import { slugifyProgramName } from "@/lib/events/programs";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function manager() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user || !access.has(adminAreaPermission("programmas"))) return null;
  return { supabase, userId: access.user.id };
}

function refresh(slug?: string) {
  revalidatePath("/beheer/programmas");
  revalidatePath("/kalender");
  if (slug) revalidatePath(`/programmas/${slug}`);
}

export async function createProgram(input: {
  name: string;
  description: string;
}): Promise<Result> {
  const ctx = await manager();
  if (!ctx) return { ok: false, error: "Geen recht om programma's te beheren." };
  const name = input.name.trim();
  const slug = slugifyProgramName(name);
  if (!name || !slug) return { ok: false, error: "Geef het programma een naam." };

  const { error } = await ctx.supabase.from("event_programs").insert({
    name,
    slug,
    description: input.description.trim() || null,
    created_by: ctx.userId,
  });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Er bestaat al een programma met deze naam." : error.message,
    };
  }
  refresh(slug);
  return { ok: true };
}

/** De slug blijft bij hernoemen staan, zodat gedeelde links blijven werken. */
export async function updateProgram(input: {
  id: string;
  name: string;
  description: string;
  archived: boolean;
}): Promise<Result> {
  const ctx = await manager();
  if (!ctx) return { ok: false, error: "Geen recht om programma's te beheren." };
  if (!UUID.test(input.id)) return { ok: false, error: "Onbekend programma." };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Geef het programma een naam." };

  const { data: current } = await ctx.supabase
    .from("event_programs")
    .select("slug, archived_at")
    .eq("id", input.id)
    .maybeSingle();
  if (!current) return { ok: false, error: "Onbekend programma." };

  const { error } = await ctx.supabase
    .from("event_programs")
    .update({
      name,
      description: input.description.trim() || null,
      archived_at: input.archived ? (current.archived_at ?? new Date().toISOString()) : null,
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  refresh(current.slug as string);
  return { ok: true };
}

export async function deleteProgram(id: string): Promise<Result> {
  const ctx = await manager();
  if (!ctx) return { ok: false, error: "Geen recht om programma's te beheren." };
  if (!UUID.test(id)) return { ok: false, error: "Onbekend programma." };
  const { error } = await ctx.supabase.from("event_programs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export type BulkInput = {
  programId: string;
  /** Leeg = alle categorieën. */
  type: string;
  kind: string;
  from: string;
  to: string;
};

export type BulkEvent = { id: string; title: string; type: string; kind: string | null; startAt: string };

/** Meer dan dit past niet in een lijst om aan te vinken; maak de periode dan korter. */
const BULK_LIMIT = 200;

/**
 * De events die je aan een programma kunt hangen: hoofdevents en losse events
 * in een periode, eventueel van één categorie of type, die er nog niet in
 * zitten. Teamevents, etappes en tijdsloten tellen op de kalender via hun
 * hoofdevent mee en staan daarom niet in de lijst.
 */
export async function findBulkEvents(
  input: BulkInput,
): Promise<{ ok: true; events: BulkEvent[]; more: boolean } | { ok: false; error: string }> {
  const ctx = await manager();
  if (!ctx) return { ok: false, error: "Geen recht om programma's te beheren." };
  if (!UUID.test(input.programId)) return { ok: false, error: "Onbekend programma." };
  if (input.type && !(EVENT_TYPE_VALUES as string[]).includes(input.type)) {
    return { ok: false, error: "Ongeldige categorie." };
  }
  if (input.kind && !EVENT_KIND_VALUES.includes(input.kind)) {
    return { ok: false, error: "Ongeldig type." };
  }
  if (!DATE.test(input.from) || !DATE.test(input.to) || input.from > input.to) {
    return { ok: false, error: "Kies een geldige periode." };
  }
  const end = new Date(`${input.to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);

  let query = ctx.supabase
    .from("events")
    .select("id, title, type, kind, start_at")
    .is("parent_event_id", null)
    .gte("start_at", `${input.from}T00:00:00Z`)
    .lt("start_at", end.toISOString())
    .order("start_at")
    .limit(BULK_LIMIT + 1);
  if (input.type) query = query.eq("type", input.type);
  if (input.kind) query = query.eq("kind", input.kind);

  const [{ data, error }, { data: linked }] = await Promise.all([
    query,
    ctx.supabase.from("event_program_links").select("event_id").eq("program_id", input.programId),
  ]);
  if (error) return { ok: false, error: error.message };
  const already = new Set((linked ?? []).map((row) => row.event_id as string));
  const rows = data ?? [];
  return {
    ok: true,
    more: rows.length > BULK_LIMIT,
    events: rows
      .slice(0, BULK_LIMIT)
      .filter((row) => !already.has(row.id as string))
      .map((row) => ({
        id: row.id as string,
        title: row.title as string,
        type: row.type as string,
        kind: (row.kind as string | null) ?? null,
        startAt: row.start_at as string,
      })),
  };
}

export async function linkEvents(programId: string, eventIds: string[]): Promise<Result> {
  const ctx = await manager();
  if (!ctx) return { ok: false, error: "Geen recht om programma's te beheren." };
  if (!UUID.test(programId) || eventIds.some((id) => !UUID.test(id))) {
    return { ok: false, error: "Onbekende koppeling." };
  }
  if (eventIds.length === 0) return { ok: false, error: "Vink minstens één event aan." };

  const { error } = await ctx.supabase.from("event_program_links").upsert(
    eventIds.map((event_id) => ({ program_id: programId, event_id })),
    { onConflict: "program_id,event_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.message };
  refresh();
  return {
    ok: true,
    message: eventIds.length === 1 ? "1 event gekoppeld." : `${eventIds.length} events gekoppeld.`,
  };
}

export async function unlinkEvent(programId: string, eventId: string): Promise<Result> {
  const ctx = await manager();
  if (!ctx) return { ok: false, error: "Geen recht om programma's te beheren." };
  if (!UUID.test(programId) || !UUID.test(eventId)) {
    return { ok: false, error: "Onbekende koppeling." };
  }
  const { error } = await ctx.supabase
    .from("event_program_links")
    .delete()
    .eq("program_id", programId)
    .eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
