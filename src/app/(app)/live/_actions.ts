"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  fetchWahooPage,
  parseWahooPage,
  WAHOO_PERMALINK_RE,
} from "@/lib/live/external-livetrack";
import {
  hashMailCode,
  inboundDomain,
  mailAddressForCode,
  newMailCode,
} from "@/lib/live/inbound-mail";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
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

export async function createLiveMailAddress() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  const domain = inboundDomain();
  if (!domain) return { ok: false as const, error: "Niet beschikbaar." };

  const code = newMailCode();
  const now = new Date().toISOString();

  await supabase
    .from("live_tracker_tokens")
    .update({ enabled: false, revoked_at: now })
    .eq("profile_id", user.id)
    .eq("provider", "mail")
    .is("revoked_at", null);

  const { error } = await supabase.from("live_tracker_tokens").insert({
    profile_id: user.id,
    provider: "mail",
    token_hash: hashMailCode(code),
    label: "LiveTrack-mail",
    enabled: true,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/live");
  return { ok: true as const, address: mailAddressForCode(code, domain) };
}

export async function revokeLiveMailAddress() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("live_tracker_tokens")
    .update({ enabled: false, revoked_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .eq("provider", "mail")
    .is("revoked_at", null);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/live");
  return { ok: true as const };
}

export async function saveWahooLink(rawUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const url = rawUrl.trim().replace(/^http:\/\//i, "https://").replace(/\/+$/, "");
  if (!WAHOO_PERMALINK_RE.test(url)) {
    return { ok: false as const, error: "Dit is geen Wahoo Live Track-link." };
  }
  try {
    const html = await fetchWahooPage(url);
    if (!html || !parseWahooPage(html).found) {
      return { ok: false as const, error: "Wahoo kent deze link niet." };
    }
  } catch {
    return { ok: false as const, error: "Wahoo is nu niet bereikbaar. Probeer het later." };
  }

  const now = new Date().toISOString();
  await supabase
    .from("live_tracker_tokens")
    .update({ enabled: false, revoked_at: now })
    .eq("profile_id", user.id)
    .eq("provider", "wahoo_link")
    .is("revoked_at", null);

  const { error } = await supabase.from("live_tracker_tokens").insert({
    profile_id: user.id,
    provider: "wahoo_link",
    // token_hash is uniek en verplicht; de link zelf staat in external_url.
    token_hash: tokenHash(randomBytes(32).toString("hex")),
    external_url: url,
    label: "Wahoo",
    enabled: true,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/live");
  return { ok: true as const };
}

export async function removeWahooLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("live_tracker_tokens")
    .update({ enabled: false, revoked_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .eq("provider", "wahoo_link")
    .is("revoked_at", null);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/live");
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
