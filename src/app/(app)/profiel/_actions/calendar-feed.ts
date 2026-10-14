"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { newCalendarFeedToken } from "@/lib/calendar/feed-token";

/** Maakt de agenda-link aan, of vervangt hem: de oude link werkt dan niet meer. */
export async function createCalendarFeedToken() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const token = newCalendarFeedToken();
  const { error } = await supabase.from("calendar_feed_tokens").upsert(
    {
      profile_id: user.id,
      token,
      created_at: new Date().toISOString(),
      last_fetched_at: null,
    },
    { onConflict: "profile_id" },
  );
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  return { ok: true as const, token };
}

export async function revokeCalendarFeedToken() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("calendar_feed_tokens")
    .delete()
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  return { ok: true as const };
}
