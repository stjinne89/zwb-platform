"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Status = "yes" | "maybe" | "no";

export async function setRsvp(eventId: string, status: Status) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase.from("event_rsvps").upsert({
    event_id: eventId,
    profile_id: user.id,
    status,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/events/${eventId}`);
  return { ok: true as const };
}
