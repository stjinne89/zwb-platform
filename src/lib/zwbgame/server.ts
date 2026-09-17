import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { privacyConsentIsCurrent } from "@/lib/privacy";
import { basicRider, buildRoster, type MemberRow, type RosterRow } from "./roster";
import { CONSENT_VERSION, type GameBootstrap, type GameRider } from "./types";
import { z } from "zod";

export const attributesSchema = z.object({
  kind: z.enum(["sprinter", "puncher", "tter", "climber", "allrounder"]),
  flat: z.number().min(0.8).max(1.23), climb: z.number().min(0.76).max(1.28), sprint: z.number().min(0.8).max(1.25),
  source: z.enum(["manual", "intervals"]), revision: z.string(), garmin: z.boolean(),
});
export async function requireGameMember() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Log in om ZWBgame te spelen.");
  const { data: member, error } = await client.from("profiles").select("id, display_name, is_approved, is_admin, privacy_accepted_version").eq("id", user.id).single();
  if (error || !member?.is_approved) throw new Error("Alleen goedgekeurde ZWB-leden kunnen spelen.");
  if (!privacyConsentIsCurrent(member.privacy_accepted_version)) throw new Error("Bevestig eerst de privacyverklaring.");
  return { client, member };
}
export async function loadGame(): Promise<GameBootstrap> {
  const { member } = await requireGameMember();
  const admin = createAdminClient();
  const [members, entries, preferences, profiles, exclusions] = await Promise.all([
    admin.from("profiles").select("id, display_name, zwift_id, is_approved"),
    admin.from("roster_entries").select("id, name, zwift_id, claimed_by"),
    admin.from("zwbgame_preferences").select("profile_id, visible, data_consent_version, revision"),
    admin.from("zwbgame_riders").select("profile_id, consent_revision, attributes, expires_at"),
    admin.from("zwbgame_roster_exclusions").select("roster_id"),
  ]);
  // Fail closed: missing migrations/errors must never silently ignore opt-outs.
  if ([members, entries, preferences, profiles, exclusions].some((r) => r.error)) {
    return { playerId: member.id, roster: [], preferences: { visible: true, dataConsent: false }, available: false };
  }
  const prefs = new Map((preferences.data ?? []).map((p) => [p.profile_id as string, p]));
  const hidden = new Set((preferences.data ?? []).filter((p) => !p.visible).map((p) => p.profile_id as string));
  for (const row of exclusions.data ?? []) hidden.add(`roster:${row.roster_id}`);
  const roster = buildRoster(members.data as MemberRow[], entries.data as RosterRow[], hidden);
  // Opting out of appearing as a bot doesn't stop you playing as yourself.
  if (!roster.some((r) => r.id === member.id)) roster.push(basicRider(member.id, member.display_name));
  const saved = new Map((profiles.data ?? []).map((p) => [p.profile_id as string, p]));
  const connectionIds = (profiles.data ?? []).filter((p) => p.attributes?.source === "intervals").map((p) => p.profile_id as string);
  const connected = new Set<string>();
  if (connectionIds.length) {
    const connections = await admin.from("intervals_connections").select("profile_id").in("profile_id", connectionIds);
    if (connections.error) throw new Error("Spelgegevens kunnen niet worden gecontroleerd.");
    for (const c of connections.data ?? []) connected.add(c.profile_id);
  }
  const safeRoster: GameRider[] = roster.map((rider) => {
    const pref = prefs.get(rider.id);
    const row = saved.get(rider.id);
    if (!row || pref?.data_consent_version !== CONSENT_VERSION || row.consent_revision !== pref.revision || Date.parse(row.expires_at) <= Date.now()) return rider;
    const attributes = attributesSchema.safeParse(row.attributes);
    if (!attributes.success || (attributes.data.source === "intervals" && !connected.has(rider.id))) return rider;
    return { ...rider, ...attributes.data };
  });
  const own = prefs.get(member.id);
  return { playerId: member.id, roster: safeRoster, available: true, preferences: { visible: own?.visible ?? true, dataConsent: own?.data_consent_version === CONSENT_VERSION } };
}
