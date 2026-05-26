"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MODES = [
  "outdoor",
  "zwift",
  "mywhoosh",
  "wahoo_indoor",
  "other_indoor",
] as const;
type Mode = (typeof MODES)[number];

type StartInput = {
  mode: string;
  status_text?: string | null;
  external_track_url?: string | null;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function startSession(input: StartInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  if (!MODES.includes(input.mode as Mode)) {
    return { ok: false as const, error: "Ongeldige mode." };
  }
  if (input.external_track_url && !/^https?:\/\//i.test(input.external_track_url)) {
    return { ok: false as const, error: "Externe URL moet starten met http:// of https://" };
  }
  if (input.mode === "outdoor" && !input.external_track_url?.trim()) {
    return {
      ok: false as const,
      error:
        "Gebruik OwnTracks voor echte outdoor GPS, of vul een Garmin/Wahoo LiveTrack-link in.",
    };
  }

  // Sluit eerst bestaande actieve sessies van deze gebruiker af.
  await supabase
    .from("live_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .is("ended_at", null);

  const { data, error } = await supabase
    .from("live_sessions")
    .insert({
      profile_id: user.id,
      mode: input.mode,
      source: input.external_track_url?.trim() ? "external" : "manual",
      status_text: input.status_text?.trim() || null,
      external_track_url: input.external_track_url?.trim() || null,
      visibility: "members",
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/live");
  revalidatePath("/samen-fietsen");
  return { ok: true as const, sessionId: data.id };
}

export async function createOwnTracksToken() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const rawToken = `zwb_ot_${randomBytes(32).toString("base64url")}`;
  const now = new Date().toISOString();

  await supabase
    .from("live_tracker_tokens")
    .update({ enabled: false, revoked_at: now })
    .eq("profile_id", user.id)
    .eq("provider", "owntracks")
    .is("revoked_at", null);

  const { error } = await supabase.from("live_tracker_tokens").insert({
    profile_id: user.id,
    provider: "owntracks",
    token_hash: tokenHash(rawToken),
    label: "OwnTracks",
    enabled: true,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/live");
  revalidatePath("/samen-fietsen");
  return { ok: true as const, token: rawToken };
}

export async function revokeOwnTracksTokens() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("live_tracker_tokens")
    .update({ enabled: false, revoked_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .eq("provider", "owntracks")
    .is("revoked_at", null);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/live");
  revalidatePath("/samen-fietsen");
  return { ok: true as const };
}

export async function updateStatus(
  sessionId: string,
  patch: { status_text?: string | null; external_track_url?: string | null },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const updates: Record<string, string | null> = {};
  if (patch.status_text !== undefined) {
    updates.status_text = patch.status_text?.trim() || null;
  }
  if (patch.external_track_url !== undefined) {
    if (
      patch.external_track_url &&
      !/^https?:\/\//i.test(patch.external_track_url)
    ) {
      return { ok: false as const, error: "Externe URL moet starten met http:// of https://" };
    }
    updates.external_track_url = patch.external_track_url?.trim() || null;
  }

  const { error } = await supabase
    .from("live_sessions")
    .update(updates)
    .eq("id", sessionId)
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/live");
  revalidatePath("/samen-fietsen");
  return { ok: true as const };
}

export async function heartbeat(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("live_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("profile_id", user.id)
    .is("ended_at", null);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function endSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("live_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/live");
  revalidatePath("/samen-fietsen");
  return { ok: true as const };
}
