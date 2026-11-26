"use server";

import { cookies, headers } from "next/headers";
import { renderSVG } from "uqr";
import { getClub } from "@/lib/club";
import { clientIpFromHeaders, rateLimitHit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { approvePairCode, createPairCode, pairState } from "@/lib/tv/store";
import {
  CODE_TTL_MS,
  normalizeCode,
  TV_COOKIE_PATH,
  TV_KEY_COOKIE,
  TV_KEY_MAX_AGE_S,
  TV_WAIT_COOKIE,
} from "@/lib/tv/pairing";
import { youtubeLiveConfigured } from "@/lib/youtube-live/oauth";

// TV koppelen (0374). De eerste twee draaien op de tv (niet ingelogd), de
// derde op de telefoon van een lid.

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: TV_COOKIE_PATH,
};

const available = async () => youtubeLiveConfigured() && (await getClub()).isEnabled("livestream");

/** Het adres waarop de tv de app opende, voor de QR-code. */
async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host");
  if (host) return `${list.get("x-forwarded-proto") ?? "https"}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
}

export type TvCode = { ok: true; code: string; qr: string; link: string; expiresInMs: number } | { ok: false };

/** Een nieuwe code op het scherm van de tv. */
export async function startTvPairing(): Promise<TvCode> {
  if (!(await available())) return { ok: false };
  if (!(await rateLimitHit("tv-code", await clientIpFromHeaders(), 30, 3600)).allowed) return { ok: false };
  const created = await createPairCode(createAdminClient());
  if (!created) return { ok: false };
  (await cookies()).set(TV_WAIT_COOKIE, created.waitSecret, { ...cookieBase, maxAge: CODE_TTL_MS / 1000 });
  const link = `${await requestOrigin()}/tv/koppel`;
  const qr = renderSVG(`${link}?code=${created.code}`, { pixelSize: 8, border: 2 });
  return { ok: true, code: created.code, qr, link, expiresInMs: CODE_TTL_MS };
}

/** De tv vraagt of zijn code al is goedgekeurd; zo ja, dan krijgt hij zijn sleutel. */
export async function checkTvPairing(): Promise<"wacht" | "verlopen" | "gekoppeld"> {
  const store = await cookies();
  const waitSecret = store.get(TV_WAIT_COOKIE)?.value;
  if (!waitSecret) return "verlopen";
  const result = await pairState(createAdminClient(), waitSecret);
  if (result.state !== "gekoppeld") return result.state;
  store.set(TV_KEY_COOKIE, result.deviceKey, { ...cookieBase, maxAge: TV_KEY_MAX_AGE_S });
  store.delete({ name: TV_WAIT_COOKIE, path: TV_COOKIE_PATH });
  return "gekoppeld";
}

/** Een lid keurt de code van een tv goed. */
export async function approveTvCode(input: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await available())) return { ok: false, error: "Niet beschikbaar." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const { data: profile } = await supabase.from("profiles").select("is_approved").eq("id", user.id).maybeSingle();
  if (profile?.is_approved !== true) return { ok: false, error: "Je account is nog niet goedgekeurd." };
  if (!(await rateLimitHit("tv-approve", user.id, 10, 900)).allowed) {
    return { ok: false, error: "Te vaak geprobeerd. Wacht een kwartier." };
  }
  const code = normalizeCode(input);
  if (!code) return { ok: false, error: "Dat is geen code van zes tekens." };
  const approved = await approvePairCode(createAdminClient(), code, user.id);
  return approved ? { ok: true } : { ok: false, error: "Die code is onbekend of verlopen." };
}
