// Bericht naar de fietscomputer: pushmelding plus Telegram.
//
// De push bereikt een Garmin (die toont meldingen van de telefoon). Telegram is
// er voor Wahoo: de ELEMNT toont alleen sms, WhatsApp, Telegram, Signal, Line
// en WeChat. Beide kanalen volgen dezelfde voorkeur, on_ride_message (0253).

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendNotificationToMembers } from "@/lib/push/send";
import {
  formatRideMessage,
  normalizeRideMessage,
  sendTelegramMessage,
  telegramConfig,
} from "@/lib/telegram/bot";

export type RsvpRow = { profile_id: string; status: string };

/**
 * Ontvangers van een bericht van de organisator: wie ja zei, plus wie misschien
 * zei en nu live rijdt. De afzender krijgt het eigen bericht niet.
 */
export function eventMessageRecipients(
  rsvps: RsvpRow[],
  liveProfileIds: Iterable<string>,
  senderId: string,
): string[] {
  const live = new Set(liveProfileIds);
  const ids = new Set<string>();
  for (const rsvp of rsvps) {
    if (rsvp.status === "yes" || (rsvp.status === "maybe" && live.has(rsvp.profile_id))) {
      ids.add(rsvp.profile_id);
    }
  }
  ids.delete(senderId);
  return Array.from(ids);
}

export async function deliverRideMessage(
  admin: SupabaseClient,
  {
    recipientIds,
    senderName,
    body,
    url,
    tag,
  }: {
    recipientIds: string[];
    senderName: string;
    body: string;
    url: string;
    tag: string;
  },
): Promise<{ reached: number }> {
  if (recipientIds.length === 0) return { reached: 0 };
  const text = normalizeRideMessage(body);

  const push = await sendNotificationToMembers(
    "on_ride_message",
    { title: senderName, body: text, url, tag },
    { profileIds: recipientIds },
  );
  const reached = new Set(push.reachedProfileIds);

  const config = telegramConfig();
  if (config) {
    const [{ data: links }, { data: optedOut }] = await Promise.all([
      admin
        .from("telegram_links")
        .select("profile_id, chat_id")
        .in("profile_id", recipientIds)
        .not("chat_id", "is", null),
      admin
        .from("notification_preferences")
        .select("profile_id")
        .in("profile_id", recipientIds)
        .eq("on_ride_message", false),
    ]);
    const skip = new Set((optedOut ?? []).map((row) => row.profile_id as string));
    const message = formatRideMessage(senderName, text);
    const gone: string[] = [];
    await Promise.all(
      ((links ?? []) as Array<{ profile_id: string; chat_id: number }>)
        .filter((link) => !skip.has(link.profile_id))
        .map(async (link) => {
          const result = await sendTelegramMessage(config.token, link.chat_id, message);
          if (result === "sent") reached.add(link.profile_id);
          if (result === "gone") gone.push(link.profile_id);
        }),
    );
    if (gone.length > 0) {
      await admin.from("telegram_links").delete().in("profile_id", gone);
    }
  }

  return { reached: reached.size };
}
