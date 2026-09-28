import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { privacyConsentIsCurrent } from "@/lib/privacy";
import { basicRider, buildRoster, platformRider, type MemberRow, type PlatformPower, type RosterRow } from "./roster";
import { loadGameRoutes, loadZrlRace } from "./route-catalog";
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
  const [members, entries, preferences, profiles, exclusions, curves] = await Promise.all([
    admin.from("profiles").select("id, display_name, zwift_id, is_approved, ftp_watts, weight_kg"),
    admin.from("roster_entries").select("id, name, zwift_id, claimed_by"),
    admin.from("zwbgame_preferences").select("profile_id, visible, data_consent_version, revision"),
    admin.from("zwbgame_riders").select("profile_id, consent_revision, attributes, expires_at"),
    admin.from("zwbgame_roster_exclusions").select("roster_id"),
    admin.from("rider_power_profiles").select("profile_id, ftp_watts, weight_kg, watts_15s, watts_1m, watts_5m, watts_20m"),
  ]);
  // Fail closed: missing migrations/errors must never silently ignore opt-outs.
  if ([members, entries, preferences, profiles, exclusions].some((r) => r.error)) {
    return { playerId: member.id, roster: [], preferences: { visible: true, ownProfile: false }, available: false, routes: [], team: null, zrlTeam: null, zrlRace: null };
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
  // Power data is optional: without it members ride basic profiles and the game stays open.
  const physique = new Map((members.data ?? []).map((p) => [p.id as string, p]));
  const curveRows = new Map((curves.error ? [] : curves.data ?? []).map((c) => [c.profile_id as string, c]));
  const safeRoster: GameRider[] = roster.map((rider) => {
    const pref = prefs.get(rider.id);
    const row = saved.get(rider.id);
    if (row && pref?.data_consent_version === CONSENT_VERSION && row.consent_revision === pref.revision && Date.parse(row.expires_at) > Date.now()) {
      const attributes = attributesSchema.safeParse(row.attributes);
      if (attributes.success && !(attributes.data.source === "intervals" && !connected.has(rider.id))) return { ...rider, ...attributes.data };
    }
    const profile = physique.get(rider.id);
    if (!profile) return rider;
    return platformRider(rider.id, rider.name, { profile, curve: curveRows.get(rider.id) } as PlatformPower) ?? rider;
  });
  const own = prefs.get(member.id);
  const visible = new Set(safeRoster.map((r) => r.id));
  const [routes, ladder, zrl] = await Promise.all([loadGameRoutes(admin), loadClubTeam(admin, "ladder", member.id, visible), loadClubTeam(admin, "zrl", member.id, visible)]);
  const zrlRace = await loadZrlRace(admin, zrl?.id ?? null);
  const plain = (team: typeof ladder) => (team ? { name: team.name, memberIds: team.memberIds } : null);
  return { playerId: member.id, roster: safeRoster, available: true, routes, team: plain(ladder), zrlTeam: plain(zrl), zrlRace, preferences: { visible: own?.visible ?? true, ownProfile: ["manual", "intervals"].includes(safeRoster.find((r) => r.id === member.id)?.source ?? "") } };
}
type Admin = ReturnType<typeof createAdminClient>;
/**
 * Your ZWB Club Ladder or ZRL team, if you ride in one: an active team before one
 * in the graveyard and, for ZRL, a racing subteam (B1) before its umbrella (B).
 * Only teammates who appear in the game roster ride along. Optional: without it
 * you race with the riders closest to you in strength.
 */
async function loadClubTeam(admin: Admin, type: "ladder" | "zrl", memberId: string, visible: Set<string>): Promise<{ id: string; name: string; memberIds: string[] } | null> {
  const teams = await admin.from("teams").select("id, name, is_graveyard, parent_team_id").eq("type", type);
  if (teams.error || !teams.data?.length) return null;
  const members = await admin.from("team_members").select("team_id, profile_id").in("team_id", teams.data.map((t) => t.id));
  if (members.error) return null;
  const mine = teams.data
    .filter((t) => (members.data ?? []).some((m) => m.team_id === t.id && m.profile_id === memberId))
    .sort((a, b) => Number(Boolean(a.is_graveyard)) - Number(Boolean(b.is_graveyard)) || Number(!a.parent_team_id) - Number(!b.parent_team_id) || String(a.name).localeCompare(String(b.name)))[0];
  if (!mine) return null;
  const memberIds = (members.data ?? []).filter((m) => m.team_id === mine.id && m.profile_id !== memberId && visible.has(m.profile_id)).map((m) => m.profile_id as string);
  return { id: String(mine.id), name: String(mine.name), memberIds };
}
