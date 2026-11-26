import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CODE_TTL_MS, codeFromBytes, deviceExpired, shouldTouch } from "./pairing";

// TV koppelen (0374): lezen en schrijven met de service-rol, want de tv is niet
// ingelogd. Geheimen gaan als hash de database in.

const hash = (secret: string) => createHash("sha256").update(secret).digest("hex");
const secret = () => randomBytes(32).toString("base64url");

/** Een nieuwe code voor een wachtende tv, met het geheim voor de cookie van die tv. */
export async function createPairCode(
  admin: SupabaseClient,
  now = new Date(),
): Promise<{ code: string; waitSecret: string; expiresAt: string } | null> {
  // Oude codes opruimen; het kan bij elke nieuwe.
  await admin.from("tv_pair_codes").delete().lt("expires_at", now.toISOString());
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS).toISOString();
  // Een botsing met een code die nog geldt: gewoon opnieuw.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = codeFromBytes(randomBytes(6));
    const waitSecret = secret();
    const { error } = await admin
      .from("tv_pair_codes")
      .insert({ code, wait_hash: hash(waitSecret), expires_at: expiresAt });
    if (!error) return { code, waitSecret, expiresAt };
    if (error.code !== "23505") return null;
  }
  return null;
}

export type PairState =
  | { state: "wacht" }
  | { state: "verlopen" }
  | { state: "gekoppeld"; deviceKey: string };

/**
 * Is de code van deze wachtende tv goedgekeurd? Dan wordt de tv een gekoppelde
 * tv: een sleutel voor de cookie, en de code is op.
 */
export async function pairState(admin: SupabaseClient, waitSecret: string, now = new Date()): Promise<PairState> {
  const { data } = await admin
    .from("tv_pair_codes")
    .select("code, profile_id, expires_at")
    .eq("wait_hash", hash(waitSecret))
    .maybeSingle<{ code: string; profile_id: string | null; expires_at: string }>();
  if (!data) return { state: "verlopen" };
  if (!data.profile_id) {
    return Date.parse(data.expires_at) < now.getTime() ? { state: "verlopen" } : { state: "wacht" };
  }
  // Eerst de code weg: zo krijgt hij hooguit één keer een sleutel.
  const { data: removed } = await admin.from("tv_pair_codes").delete().eq("code", data.code).select("code");
  if (!removed?.length) return { state: "verlopen" };
  const deviceKey = secret();
  const { error } = await admin
    .from("tv_devices")
    .insert({ profile_id: data.profile_id, key_hash: hash(deviceKey), last_seen_at: now.toISOString() });
  return error ? { state: "verlopen" } : { state: "gekoppeld", deviceKey };
}

/** Een lid keurt een code goed. Alleen een code die nog geldt en nog niet is goedgekeurd. */
export async function approvePairCode(
  admin: SupabaseClient,
  code: string,
  profileId: string,
  now = new Date(),
): Promise<boolean> {
  const { data } = await admin
    .from("tv_pair_codes")
    .update({ profile_id: profileId })
    .eq("code", code)
    .is("profile_id", null)
    .gt("expires_at", now.toISOString())
    .select("code");
  return (data?.length ?? 0) > 0;
}

/**
 * Het lid achter deze tv, of null: onbekende sleutel, te lang niet gekeken, of
 * het lid is (nog) niet goedgekeurd. Werkt laatst gekeken bij, niet elke keer.
 */
export async function tvMember(admin: SupabaseClient, deviceKey: string, now = new Date()): Promise<string | null> {
  const { data } = await admin
    .from("tv_devices")
    .select("id, profile_id, last_seen_at, profiles(is_approved)")
    .eq("key_hash", hash(deviceKey))
    .maybeSingle<{
      id: string;
      profile_id: string;
      last_seen_at: string;
      profiles: { is_approved: boolean | null } | { is_approved: boolean | null }[] | null;
    }>();
  if (!data) return null;
  if (deviceExpired(data.last_seen_at, now)) {
    await admin.from("tv_devices").delete().eq("id", data.id);
    return null;
  }
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  if (profile?.is_approved !== true) return null;
  if (shouldTouch(data.last_seen_at, now)) {
    await admin.from("tv_devices").update({ last_seen_at: now.toISOString() }).eq("id", data.id);
  }
  return data.profile_id;
}
