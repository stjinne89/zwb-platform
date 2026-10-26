import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashLinkToken,
  isStopCommand,
  sendTelegramMessage,
  startTokenFromText,
  telegramConfig,
  verifyWebhookSecret,
} from "@/lib/telegram/bot";

// Webhook van de ZWB-Telegram-bot. Alleen privéchats; de bot doet twee dingen:
//   /start <token>  koppelt deze chat aan het lid dat de link maakte
//   /stop           ontkoppelt
// Altijd 200 terug (behalve bij een fout geheim), anders blijft Telegram de
// update herhalen.

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number; type?: string };
  };
};

const ok = () => NextResponse.json({ ok: true });

export async function POST(request: NextRequest) {
  const config = telegramConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: "Niet ingesteld." }, { status: 503 });
  }
  if (
    !verifyWebhookSecret(
      request.headers.get("x-telegram-bot-api-secret-token"),
      process.env.TELEGRAM_WEBHOOK_SECRET,
    )
  ) {
    return NextResponse.json({ ok: false, error: "Ongeldig geheim." }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return ok();
  }
  const chatId = update.message?.chat?.id;
  if (!chatId || update.message?.chat?.type !== "private") return ok();
  const text = update.message?.text;
  const reply = (message: string) => sendTelegramMessage(config.token, chatId, message);
  const admin = createAdminClient();

  if (isStopCommand(text)) {
    await admin.from("telegram_links").delete().eq("chat_id", chatId);
    await reply("Ontkoppeld. Je krijgt geen ritberichten van ZWB meer.");
    return ok();
  }

  const token = startTokenFromText(text);
  if (!token) {
    await reply("Deze bot stuurt alleen berichten tijdens ZWB-ritten.");
    return ok();
  }

  const { data: link } = await admin
    .from("telegram_links")
    .select("profile_id, link_token_expires_at")
    .eq("link_token_hash", hashLinkToken(token))
    .maybeSingle();
  if (!link || !link.link_token_expires_at || Date.parse(link.link_token_expires_at) < Date.now()) {
    await reply("Deze koppellink is verlopen. Maak een nieuwe op Samen fietsen.");
    return ok();
  }

  // Eén Telegram-account hoort bij één lid: een oude koppeling van deze chat
  // aan een ander profiel vervalt.
  await admin
    .from("telegram_links")
    .delete()
    .eq("chat_id", chatId)
    .neq("profile_id", link.profile_id);
  const { error } = await admin
    .from("telegram_links")
    .update({
      chat_id: chatId,
      linked_at: new Date().toISOString(),
      link_token_hash: null,
      link_token_expires_at: null,
    })
    .eq("profile_id", link.profile_id);
  await reply(
    error
      ? "Koppelen mislukte. Probeer het opnieuw vanaf Samen fietsen."
      : "Gekoppeld aan ZWB. Berichten tijdens je rit komen hier binnen.",
  );
  return ok();
}
