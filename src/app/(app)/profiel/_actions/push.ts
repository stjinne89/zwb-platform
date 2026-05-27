"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
};

export async function savePushSubscription(input: SubscriptionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  if (!input.endpoint || !input.p256dh || !input.auth) {
    return { ok: false as const, error: "Onvolledige subscription-data." };
  }

  // Upsert op endpoint (browser hergebruikt dezelfde endpoint per device).
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profile_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false as const, error: error.message };

  // Default-preferences aanmaken als ze nog niet bestaan.
  await supabase
    .from("notification_preferences")
    .upsert({ profile_id: user.id }, { onConflict: "profile_id" });

  revalidatePath("/profiel");
  return { ok: true as const };
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("profile_id", user.id)
    .eq("endpoint", endpoint);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  return { ok: true as const };
}

export async function updateNotificationPreferences(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const prefs = {
    profile_id: user.id,
    on_new_event: formData.get("on_new_event") === "on",
    on_live_started: formData.get("on_live_started") === "on",
    on_new_badge: formData.get("on_new_badge") === "on",
    on_training_plan: formData.get("on_training_plan") === "on",
    on_admin_broadcast: formData.get("on_admin_broadcast") === "on",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(prefs, { onConflict: "profile_id" });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  return { ok: true as const };
}
