import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import {
  encodePairingCode,
  newHelperSecrets,
  reportIsValid,
  signedCommand,
  type ObsState,
} from "@/lib/youtube-live/helper-protocol";

// De stream-hulp op de pc of Mac van een lid (livestreams, fase 3, 0340).

/** Zo lang na de laatste melding geldt de hulp als aan (hij meldt elke tien minuten). */
export const HELPER_ONLINE_MS = 15 * 60 * 1000;

export function channelHash(channel: string): string {
  return createHash("sha256").update(channel).digest("hex");
}

export function helperOnline(lastSeenAt: string | null | undefined, now = new Date()): boolean {
  return Boolean(lastSeenAt && now.getTime() - Date.parse(lastSeenAt) <= HELPER_ONLINE_MS);
}

/**
 * Een nieuwe koppelcode. Een oude hulp werkt daarna niet meer: kanaal en geheim
 * zijn vervangen. De code wordt niet bewaard, alleen kanaal en geheim.
 */
export async function createHelperPairing(admin: SupabaseClient, profileId: string): Promise<string> {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!site || !supabaseUrl || !anonKey) throw new Error("Site- of Supabase-adres ontbreekt.");
  const { channel, secret } = newHelperSecrets();
  const { error } = await admin.from("stream_helpers").upsert(
    {
      profile_id: profileId,
      channel_hash: channelHash(channel),
      channel_enc: encryptSecret(channel),
      secret_enc: encryptSecret(secret),
      obs_state: null,
      reported_at: null,
      last_seen_at: null,
      created_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );
  if (error) throw new Error(error.message);
  return encodePairingCode({ v: 1, site, supabaseUrl, anonKey, channel, secret });
}

export async function removeHelper(admin: SupabaseClient, profileId: string): Promise<void> {
  const { error } = await admin.from("stream_helpers").delete().eq("profile_id", profileId);
  if (error) throw new Error(error.message);
}

/** Stuurt start of stop over Supabase Realtime naar het kanaal van de hulp. */
export async function sendHelperCommand(
  admin: SupabaseClient,
  profileId: string,
  action: "start" | "stop",
  now = Date.now(),
): Promise<void> {
  const { data, error } = await admin
    .from("stream_helpers")
    .select("channel_enc, secret_enc")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Geen hulp-app gekoppeld.");
  const row = data as { channel_enc: string; secret_enc: string };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase is niet ingericht.");
  const res = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          topic: decryptSecret(row.channel_enc),
          event: "command",
          payload: signedCommand(decryptSecret(row.secret_enc), action, now),
          private: false,
        },
      ],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Realtime-broadcast ${res.status}`);
}

/** Een terugmelding van de hulp. Onbekend kanaal of foute handtekening: false. */
export async function recordHelperReport(
  admin: SupabaseClient,
  body: { channel?: unknown; state?: unknown; ts?: unknown; sig?: unknown },
  now = new Date(),
): Promise<boolean> {
  if (typeof body.channel !== "string" || body.channel.length < 20 || body.channel.length > 200) return false;
  const { data } = await admin
    .from("stream_helpers")
    .select("profile_id, secret_enc, reported_at")
    .eq("channel_hash", channelHash(body.channel))
    .maybeSingle();
  const row = data as { profile_id: string; secret_enc: string; reported_at: string | null } | null;
  if (!row) return false;
  const previous = row.reported_at ? Date.parse(row.reported_at) : null;
  const report = { state: body.state, ts: body.ts, sig: body.sig };
  if (!reportIsValid(decryptSecret(row.secret_enc), report, now.getTime(), previous)) return false;
  const { error } = await admin
    .from("stream_helpers")
    .update({
      obs_state: report.state as ObsState,
      reported_at: new Date(report.ts as number).toISOString(),
      last_seen_at: now.toISOString(),
    })
    .eq("profile_id", row.profile_id);
  return !error;
}
