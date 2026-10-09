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
  type: string;
  kind: string;
  from: string;
  to: string;
};

/**
 * De events die een bulkkoppeling raakt: hoofdevents en losse events van één
 * categorie in een periode. Teamevents, etappes en tijdsloten tellen op de
 * kalender via hun hoofdevent mee en worden daarom niet apart gekoppeld.
 */
async function bulkCandidates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: BulkInput,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  if (!UUID.test(input.programId)) return { ok: false, error: "Onbekend programma." };
  if (!(EVENT_TYPE_VALUES as string[]).includes(input.type)) {
    return { ok: false, error: "Kies een categorie." };
  }
  if (input.kind && !EVENT_KIND_VALUES.includes(input.kind)) {
    return { ok: false, error: "Ongeldig type." };
  }
  if (!DATE.test(input.from) || !DATE.test(input.to) || input.from > input.to) {
    return { ok: false, error: "Kies een geldige periode." };
  }
  const end = new Date(`${input.to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);

  let query = supabase
    .from("events")
    .select("id")
    .eq("type", input.type)
    .is("parent_event_id", null)
    .gte("start_at", `${input.from}T00:00:00Z`)
    .lt("start_at", end.toISOString());
  if (input.kind) query = query.eq("kind", input.kind);
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, ids: (data ?? []).map((row) => row.id as string) };
}

export async function countBulkEvents(
  input: BulkInput,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const ctx = await manager();
  if (!ctx) return { ok: false, error: "Geen recht om programma's te beheren." };
  const found = await bulkCandidates(ctx.supabase, input);
  return found.ok ? { ok: true, count: found.ids.length } : found;
}

export async function linkBulkEvents(input: BulkInput): Promise<Result> {
  const ctx = await manager();
  if (!ctx) return { ok: false, error: "Geen recht om programma's te beheren." };
  const found = await bulkCandidates(ctx.supabase, input);
  if (!found.ok) return found;
  if (found.ids.length === 0) return { ok: false, error: "Geen events gevonden." };

  const { error } = await ctx.supabase.from("event_program_links").upsert(
    found.ids.map((event_id) => ({ program_id: input.programId, event_id })),
    { onConflict: "program_id,event_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, message: `${found.ids.length} events gekoppeld.` };
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
