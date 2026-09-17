"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitHit } from "@/lib/rate-limit";
import { fetchIntervalsActivities, fetchIntervalsPowerCurve } from "@/lib/intervals/client";
import { deriveRider, isAllowedActivity, type PowerInput } from "@/lib/zwbgame/roster";
import { loadGame, requireGameMember } from "@/lib/zwbgame/server";
import { CONSENT_VERSION, type GameBootstrap, type GamePreferences } from "@/lib/zwbgame/types";

type Reply<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
function failure(error: unknown): Reply<never> {
  return { ok: false, error: error instanceof Error ? error.message : "Opslaan mislukt. Probeer opnieuw." };
}
export async function refreshGame(): Promise<Reply<GameBootstrap>> {
  try { return { ok: true, data: await loadGame() }; } catch (error) { return failure(error); }
}
export async function saveGamePreferences(input: GamePreferences): Promise<Reply> {
  try {
    const data = z.object({ visible: z.boolean(), ownProfile: z.boolean() }).parse(input);
    const { client, member } = await requireGameMember();
    // Turning the own profile off deletes it (trigger); the platform data takes over again.
    const { error } = await client.from("zwbgame_preferences").upsert({ profile_id: member.id, visible: data.visible, data_consent_version: data.ownProfile ? CONSENT_VERSION : null });
    if (error) throw new Error("Spelvoorkeuren konden niet worden opgeslagen.");
    revalidatePath("/zwbgame");
    return { ok: true, data: undefined };
  } catch (error) { return failure(error); }
}
const powerSchema = z.object({
  ftp: z.number().min(50).max(800), weight: z.number().min(30).max(250),
  sprint: z.number().min(50).max(2500).optional(), minute: z.number().min(50).max(2500).optional(),
  fiveMinutes: z.number().min(50).max(2500).optional(), twentyMinutes: z.number().min(50).max(2500).optional(),
});
export async function saveGamePower(input: { source: "manual"; power: PowerInput } | { source: "intervals"; weight: number }): Promise<Reply> {
  try {
    const parsed = z.discriminatedUnion("source", [z.object({ source: z.literal("manual"), power: powerSchema }), z.object({ source: z.literal("intervals"), weight: z.number().min(30).max(250) })]).parse(input);
    const { client, member } = await requireGameMember();
    // Saving an own profile is the consent for it; the upsert keeps visibility as it was.
    let { data: pref } = await client.from("zwbgame_preferences").select("revision, data_consent_version").eq("profile_id", member.id).maybeSingle();
    if (pref?.data_consent_version !== CONSENT_VERSION) {
      const { error: consentError } = await client.from("zwbgame_preferences").upsert({ profile_id: member.id, data_consent_version: CONSENT_VERSION });
      if (consentError) throw new Error("Spelprofiel niet opgeslagen. Probeer opnieuw.");
      ({ data: pref } = await client.from("zwbgame_preferences").select("revision, data_consent_version").eq("profile_id", member.id).single());
      if (pref?.data_consent_version !== CONSENT_VERSION) throw new Error("Spelprofiel niet opgeslagen. Probeer opnieuw.");
    }
    let power: PowerInput;
    let garmin = false;
    let activityIds: string[] = [];
    if (parsed.source === "manual") power = parsed.power;
    else {
      const budget = await rateLimitHit("zwbgame-intervals", member.id, 3, 3600);
      if (!budget.allowed) throw new Error("Probeer het bijwerken over een uur opnieuw.");
      const { data: connection } = await client.from("intervals_connections").select("api_key, athlete_id").eq("profile_id", member.id).single();
      if (!connection?.api_key || !connection.athlete_id) throw new Error("Koppel eerst Intervals via je profiel.");
      const results = await Promise.allSettled([
        fetchIntervalsPowerCurve(connection.api_key, connection.athlete_id, "90d"),
        fetchIntervalsActivities(connection.api_key, connection.athlete_id, 90),
      ]);
      if (results[0].status !== "fulfilled" || results[1].status !== "fulfilled") throw new Error("Intervals is niet bereikbaar. Probeer later opnieuw.");
      const permitted = new Map(results[1].value.filter((a) => isAllowedActivity(a as typeof a & { source?: unknown })).map((a) => [a.id, a]));
      const points = results[0].value.points.filter((p) => p.activityId && permitted.has(p.activityId));
      const watts = (duration: number) => points.find((p) => p.seconds === duration)?.watts;
      const twentyMinutes = watts(1200);
      if (!twentyMinutes) throw new Error("Geen 20-minutenvermogen met bevestigde bron beschikbaar. Gebruik je eigen meting.");
      power = { ftp: Math.round(twentyMinutes * 0.95), weight: parsed.weight, sprint: watts(15), minute: watts(60), fiveMinutes: watts(300), twentyMinutes };
      activityIds = [...new Set(points.map((p) => p.activityId!))];
      garmin = activityIds.some((id) => /garmin/i.test(String((permitted.get(id) as { device_name?: string })?.device_name ?? "")));
    }
    const { id: _id, name: _name, ...attributes } = deriveRider(member.id, member.display_name, power, parsed.source, randomUUID(), garmin);
    void _id; void _name;
    const { error } = await createAdminClient().from("zwbgame_riders").upsert({ profile_id: member.id, consent_revision: pref.revision, attributes, provenance: { source: parsed.source, period: parsed.source === "intervals" ? "90d" : "own-measurement", activityIds }, generated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 86400000).toISOString() });
    if (error) throw new Error("Spelprofiel niet opgeslagen. Controleer je toestemming en probeer opnieuw.");
    revalidatePath("/zwbgame");
    return { ok: true, data: undefined };
  } catch (error) { return failure(error); }
}
export async function excludeRosterRider(rosterId: string, excluded: boolean): Promise<Reply> {
  try {
    z.string().uuid().parse(rosterId); z.boolean().parse(excluded);
    const { member } = await requireGameMember();
    if (!member.is_admin) throw new Error("Alleen beheerders kunnen dit wijzigen.");
    const admin = createAdminClient();
    const result = excluded
      ? await admin.from("zwbgame_roster_exclusions").upsert({ roster_id: rosterId, excluded_by: member.id })
      : await admin.from("zwbgame_roster_exclusions").delete().eq("roster_id", rosterId);
    if (result.error) throw new Error("De deelname kon niet worden gewijzigd.");
    revalidatePath("/zwbgame");
    return { ok: true, data: undefined };
  } catch (error) { return failure(error); }
}
