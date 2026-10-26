"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { captainTeamIds } from "@/lib/zrl-analysis/load";
import { sanitizeOverride } from "@/lib/race-briefing/sheet";

const PLAN_MAX = 4000;
const ROLE_MAX = 60;

/** Plan en rollen van de racebriefing; alleen captain van het team of teambeheer. */
export async function saveRaceBriefing(formData: FormData) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return;

  const eventId = String(formData.get("event_id") ?? "");
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id, type, team_id").eq("id", eventId).maybeSingle();
  if (!event || event.type !== "zrl" || !event.team_id) return;
  const board = access.has("teams.manage_roster") || access.has("teams.manage_results");
  if (!board && !(await captainTeamIds(access.user.id)).has(event.team_id as string)) return;

  const plan = String(formData.get("plan") ?? "").trim().slice(0, PLAN_MAX) || null;
  const roles: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    const match = /^role_(\d+)$/.exec(key);
    const role = String(value).trim().slice(0, ROLE_MAX);
    if (match && role) roles[match[1]] = role;
  }

  await admin.from("race_briefings").upsert({
    event_id: event.id,
    plan,
    roles,
    updated_by: access.user.id,
    updated_at: new Date().toISOString(),
  });
  revalidatePath(`/events/${event.id}/briefing`);
}

/**
 * Het racebriefje zoals de captain het aanpaste: alleen de blokken die afwijken
 * van het voorstel (dat verschil maakt de editor). Dezelfde rechten als het plan.
 */
export async function saveRaceSheet(eventId: string, override: unknown): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false };
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id, type, team_id").eq("id", String(eventId)).maybeSingle();
  if (!event || event.type !== "zrl" || !event.team_id) return { ok: false };
  const board = access.has("teams.manage_roster") || access.has("teams.manage_results");
  if (!board && !(await captainTeamIds(access.user.id)).has(event.team_id as string)) return { ok: false };

  const { error } = await admin.from("race_briefings").upsert({
    event_id: event.id,
    sheet: sanitizeOverride(override),
    updated_by: access.user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false };
  revalidatePath(`/events/${event.id}/briefing`);
  return { ok: true };
}
