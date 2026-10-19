// Telegram-bot voor berichten naar de fietscomputer.
//
// Een Wahoo ELEMNT toont alleen meldingen van sms, WhatsApp, Telegram, Signal,
// Line en WeChat; een pushmelding van ZWB komt er niet op. Telegram heeft een
// gratis bot-API, dus een ZWB-bot bereikt de ELEMNT via de Telegram-app.
//
// Koppelen: het lid opent t.me/<bot>?start=<token>; de bot krijgt dan
// "/start <token>" binnen op de webhook en slaat de chat-id op. Alleen de
// SHA-256-hash van het token staat in telegram_links.
//
//   TELEGRAM_BOT_TOKEN       token van BotFather (alleen server)
//   TELEGRAM_BOT_USERNAME    gebruikersnaam van de bot, zonder @
//   TELEGRAM_WEBHOOK_SECRET  secret_token van setWebhook; Telegram stuurt het
//                            mee in X-Telegram-Bot-Api-Secret-Token

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { RIDE_MESSAGE_MAX } from "./limits";

export { RIDE_MESSAGE_MAX };

export const LINK_TOKEN_TTL_MS = 30 * 60 * 1000;
/** Telegram staat in de start-parameter alleen A-Z, a-z, 0-9, _ en - toe, tot 64 tekens. */
const START_TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

export function telegramConfig(env: Record<string, string | undefined> = process.env) {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const username = env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (!token || !username) return null;
  return { token, username };
}

export function hashLinkToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newLinkToken() {
  return randomBytes(24).toString("base64url");
}

export function telegramStartUrl(username: string, token: string) {
  return `https://t.me/${username}?start=${token}`;
}

/** Het token uit "/start <token>" (ook "/start@ZwbBot <token>"), anders null. */
export function startTokenFromText(text: string | undefined | null): string | null {
  const match = (text ?? "").trim().match(/^\/start(?:@\w+)?\s+(\S+)$/);
  if (!match) return null;
  return START_TOKEN_RE.test(match[1]) ? match[1] : null;
}

export function isStopCommand(text: string | undefined | null) {
  return /^\/stop(?:@\w+)?$/.test((text ?? "").trim());
}

export function verifyWebhookSecret(header: string | null, secret: string | undefined) {
  const expected = secret?.trim();
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Eén regel: wit samenvoegen en afkappen op de lengte die een fietscomputer toont. */
export function normalizeRideMessage(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, RIDE_MESSAGE_MAX);
}

export function formatRideMessage(senderName: string, body: string) {
  return `${senderName}: ${normalizeRideMessage(body)}`;
}

export type TelegramSendResult = "sent" | "gone" | "failed";

/**
 * Bericht naar één chat. "gone" betekent dat de chat niet meer bereikbaar is
 * (bot geblokkeerd of chat verwijderd); de koppeling kan dan weg.
 */
export async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string,
): Promise<TelegramSendResult> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return "sent";
    if (res.status === 403) return "gone";
    if (res.status === 400) {
      const data = (await res.json().catch(() => null)) as { description?: string } | null;
      if (/chat not found/i.test(data?.description ?? "")) return "gone";
    }
    return "failed";
  } catch {
    return "failed";
  }
}
