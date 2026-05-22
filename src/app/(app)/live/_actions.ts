"use server";

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
