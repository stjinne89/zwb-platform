"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { sendNotificationToMembers, isPushConfigured } from "@/lib/push/send";

export async function broadcastNotification(formData: FormData) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return {
      ok: false as const,
      error: "Geen recht om aankondigingen te versturen.",
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim() || "/dashboard";

  if (!title || !body) {
    return { ok: false as const, error: "Titel + bericht zijn verplicht." };
  }
  if (title.length > 100 || body.length > 280) {
    return {
      ok: false as const,
      error: "Titel max 100, bericht max 280 tekens.",
    };
  }

  if (!isPushConfigured()) {
    return {
      ok: false as const,
      error:
        "VAPID-keys zijn nog niet ingesteld op de server. Vraag een dev om ze toe te voegen.",
    };
  }

  const result = await sendNotificationToMembers(
    "on_admin_broadcast",
    { title, body, url, tag: "zwb-broadcast" },
  );

  return {
    ok: true as const,
    sent: result.sent,
    pruned: result.pruned,
  };
}
