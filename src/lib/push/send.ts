// Web Push send-helper.
//
// Verstuurt notificaties naar een of meerdere profiles op basis van
// hun opt-in preferences. Faalt stil per device; een 410/404 betekent
// dat de subscription verlopen is en wordt opgeruimd.
//
// VAPID-keys (genereer eenmalig met `npx web-push generate-vapid-keys`):
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY (gedeeld met client, in subscribe-call)
//   VAPID_PRIVATE_KEY            (alleen server)
//   VAPID_SUBJECT                ('mailto:info@zwbcycling.nl' bv.)

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export type NotificationTrigger =
  | "on_new_event"
  | "on_live_started"
  | "on_new_badge"
  | "on_admin_broadcast";

let vapidConfigured = false;
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const subject = process.env.VAPID_SUBJECT?.trim();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!subject || !publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return ensureVapid();
}

type SubscriptionRow = {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Verstuur een notificatie naar alle leden met de juiste opt-in.
 * Sluit `excludeProfileId` uit (vaak de creator van een event die
 * 'm zelf niet hoeft te ontvangen).
 */
export async function sendNotificationToMembers(
  trigger: NotificationTrigger,
  payload: PushPayload,
  options: { excludeProfileId?: string; profileIds?: string[] } = {},
): Promise<{ sent: number; pruned: number; skipped: boolean }> {
  if (!ensureVapid()) {
    // Geen keys geconfigureerd: no-op, log enkel.
    console.warn(
      "[push] VAPID env vars ontbreken; notificatie niet verzonden.",
    );
    return { sent: 0, pruned: 0, skipped: true };
  }

  const admin = createAdminClient();

  // Profiles die deze trigger willen ontvangen.
  const { data: prefsRows } = await admin
    .from("notification_preferences")
    .select("profile_id")
    .eq(trigger, true);

  let profileIds = (prefsRows ?? []).map((r) => r.profile_id as string);
  if (options.profileIds) {
    const allowed = new Set(options.profileIds);
    profileIds = profileIds.filter((id) => allowed.has(id));
  }
  if (options.excludeProfileId) {
    profileIds = profileIds.filter((id) => id !== options.excludeProfileId);
  }
  profileIds = Array.from(new Set(profileIds));
  if (profileIds.length === 0) {
    return { sent: 0, pruned: 0, skipped: false };
  }

  const { data: subRows } = await admin
    .from("push_subscriptions")
    .select("id, profile_id, endpoint, p256dh, auth")
    .in("profile_id", profileIds);
  const subs = (subRows ?? []) as SubscriptionRow[];
  if (subs.length === 0) {
    return { sent: 0, pruned: 0, skipped: false };
  }

  const payloadStr = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;
  const toPruneIds: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payloadStr,
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          toPruneIds.push(s.id);
          pruned++;
        }
        // Andere errors: silent; we gaan niet de hele batch faillen.
      }
    }),
  );

  if (toPruneIds.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("id", toPruneIds);
  }

  // last_used_at bijwerken voor wat er gelukt is is nice-to-have maar
  // niet kritiek; sla over voor performance.

  return { sent, pruned, skipped: false };
}
