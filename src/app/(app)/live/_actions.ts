"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
import { rateLimitHit } from "@/lib/rate-limit";
import { deliverRideMessage } from "@/lib/ride-messages/deliver";
import {
  hashLinkToken,
  LINK_TOKEN_TTL_MS,
  newLinkToken,
  normalizeRideMessage,
  telegramConfig,
  telegramStartUrl,
} from "@/lib/telegram/bot";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
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

/**
 * Hartslag delen op Samen fietsen (0193). Aan = toestemming met tijdstip;
 * uit = geen hartslag meer opslaan en de al opgeslagen hartslag wissen.
 */
export async function setHeartRateSharing(on: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("profiles")
    .update({ live_heart_rate_consent_at: on ? new Date().toISOString() : null })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  if (!on) {
    // Leden mogen live_positions niet wijzigen; wissen gaat via de admin-client.
    const { error: wipeError } = await createAdminClient()
      .from("live_positions")
      .update({ heart_rate: null })
      .eq("profile_id", user.id)
      .not("heart_rate", "is", null);
    if (wipeError) return { ok: false as const, error: wipeError.message };
  }

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

/**
 * Eenmalige koppellink voor de Telegram-bot (0253). Een bestaande koppeling
 * blijft staan tot de bot het nieuwe token ontvangt.
 */
export async function createTelegramLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  const config = telegramConfig();
  if (!config) return { ok: false as const, error: "Niet beschikbaar." };

  const token = newLinkToken();
  const { error } = await createAdminClient()
    .from("telegram_links")
    .upsert(
      {
        profile_id: user.id,
        link_token_hash: hashLinkToken(token),
        link_token_expires_at: new Date(Date.now() + LINK_TOKEN_TTL_MS).toISOString(),
      },
      { onConflict: "profile_id" },
    );
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const, url: telegramStartUrl(config.username, token) };
}

export async function removeTelegramLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase.from("telegram_links").delete().eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/live");
  revalidatePath("/samen-fietsen");
  return { ok: true as const };
}

const LIVE_STALE_MS = 15 * 60 * 1000;

/** Bericht van een lid naar iemand die nu live rijdt, op diens fietscomputer. */
export async function sendRiderMessage(recipientId: string, rawBody: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (recipientId === user.id) return { ok: false as const, error: "Dat ben je zelf." };

  const body = normalizeRideMessage(rawBody);
  if (!body) return { ok: false as const, error: "Leeg bericht." };

  const { data: sender } = await supabase
    .from("profiles")
    .select("display_name, is_approved")
    .eq("id", user.id)
    .maybeSingle();
  if (!sender?.is_approved) return { ok: false as const, error: "Geen toegang." };

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id")
    .eq("profile_id", recipientId)
    .is("ended_at", null)
    .gte("last_seen_at", new Date(Date.now() - LIVE_STALE_MS).toISOString())
    .limit(1)
    .maybeSingle();
  if (!session) return { ok: false as const, error: "Deze renner rijdt niet meer live." };

  if (!(await rateLimitHit("ride_message", user.id, 10, 600)).allowed) {
    return { ok: false as const, error: "Te veel berichten. Wacht even." };
  }

  const { reached } = await deliverRideMessage(createAdminClient(), {
    recipientIds: [recipientId],
    senderName: sender.display_name || "ZWB'er",
    body,
    url: "/samen-fietsen",
    tag: `ride-${recipientId}`,
  });
  return { ok: true as const, reached };
}
