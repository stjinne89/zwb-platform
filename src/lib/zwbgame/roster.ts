import { classifyRider } from "@/lib/teams/power-profile";
import type { GameRider } from "./types";

export function basicRider(id: string, name: string): GameRider {
  return { id, name, kind: "allrounder", flat: 1, climb: 1, sprint: 1, source: "basic", revision: "basic-v1", garmin: false };
}
export type MemberRow = { id: string; display_name: string; zwift_id: string | null; is_approved: boolean };
export type RosterRow = { id: string; name: string; zwift_id: string | null; claimed_by: string | null };
export function buildRoster(members: MemberRow[], entries: RosterRow[], hidden: Set<string>) {
  const identities = new Set(members.flatMap((p) => p.zwift_id ? [p.zwift_id] : []));
  const output = members.filter((p) => p.is_approved && !hidden.has(p.id)).map((p) => basicRider(p.id, p.display_name));
  for (const entry of entries) {
    // Claimed/pending/hidden members must not reappear under their roster identity.
    if (entry.claimed_by || (entry.zwift_id && identities.has(entry.zwift_id))) continue;
    if (entry.zwift_id) identities.add(entry.zwift_id);
    if (!hidden.has(`roster:${entry.id}`)) output.push(basicRider(`roster:${entry.id}`, entry.name));
  }
  return output.sort((a, b) => a.name.localeCompare(b.name, "nl"));
}
export type PowerInput = { ftp: number; weight: number; sprint?: number; minute?: number; fiveMinutes?: number; twentyMinutes?: number };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function deriveRider(id: string, name: string, input: PowerInput, source: "manual" | "intervals", revision: string, garmin = false): GameRider {
  if (!Number.isFinite(input.ftp) || input.ftp < 50 || input.ftp > 800 || !Number.isFinite(input.weight) || input.weight < 30 || input.weight > 250) throw new Error("Controleer FTP en gewicht.");
  for (const value of [input.sprint, input.minute, input.fiveMinutes, input.twentyMinutes]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 50 || value > 2500)) throw new Error("Controleer je vermogenswaarden.");
  }
  const kind = classifyRider({ ftpWatts: input.ftp, weightKg: input.weight, watts15s: input.sprint ?? input.ftp * 3, watts1m: input.minute ?? input.ftp * 1.7, watts5m: input.fiveMinutes ?? input.ftp * 1.15, watts20m: input.twentyMinutes ?? input.ftp / 0.95 });
  // Arcade speed response, not a physical watt display. Real differences remain ordered.
  return {
    id, name, kind: kind === "unknown" ? "allrounder" : kind,
    flat: +clamp(Math.pow(input.ftp / 250, 0.27), 0.8, 1.23).toFixed(3),
    climb: +clamp(Math.pow((input.ftp / input.weight) / (250 / 75), 0.3), 0.76, 1.28).toFixed(3),
    sprint: +clamp(Math.pow((input.sprint ?? input.ftp * 3) / 750, 0.22), 0.8, 1.25).toFixed(3),
    source, revision, garmin,
  };
}

export type PlatformPower = {
  profile: { ftp_watts: number | null; weight_kg: number | string | null };
  curve?: { ftp_watts: number | null; weight_kg: number | string | null; watts_15s: number | null; watts_1m: number | null; watts_5m: number | null; watts_20m: number | null } | null;
};
/**
 * Qualities from what the platform already knows: the Intervals power curve when
 * synced, otherwise FTP and weight from the profile. Weight drives climbing (W/kg).
 * Returns null without a usable FTP and weight; the member then rides a basic profile.
 */
export function platformRider(id: string, name: string, data: PlatformPower): GameRider | null {
  const number = (value: unknown) => { const n = Number(value); return value !== null && value !== undefined && value !== "" && Number.isFinite(n) ? n : undefined; };
  const inRange = (value: number | undefined) => value !== undefined && value >= 50 && value <= 2500 ? value : undefined;
  const ftp = number(data.curve?.ftp_watts) ?? number(data.profile.ftp_watts);
  const weight = number(data.curve?.weight_kg) ?? number(data.profile.weight_kg);
  if (ftp === undefined || weight === undefined || ftp < 50 || ftp > 800 || weight < 30 || weight > 250) return null;
  const input: PowerInput = { ftp, weight, sprint: inRange(number(data.curve?.watts_15s)), minute: inRange(number(data.curve?.watts_1m)), fiveMinutes: inRange(number(data.curve?.watts_5m)), twentyMinutes: inRange(number(data.curve?.watts_20m)) };
  // The revision changes with the data but must not carry raw watts into browser storage.
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(input)) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  const rider = deriveRider(id, name, input, "manual", `platform-${hash.toString(36)}`, Boolean(data.curve));
  return { ...rider, source: "platform" };
}

// Never trust the mixed-source rider_power_profiles table as proof of origin for an own game profile.
export function isAllowedActivity(activity: { source?: unknown; strava_id?: unknown; device_name?: unknown }) {
  return !activity.strava_id && typeof activity.source === "string" &&
    ["UPLOAD", "GARMIN_CONNECT", "WAHOO", "ZWIFT", "SUUNTO", "COROS", "POLAR"].includes(activity.source.toUpperCase());
}
