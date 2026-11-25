import { notFound, redirect } from "next/navigation";
import { amsterdamDateKey } from "@/lib/birthdays";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Het streamcenter van een race (2026-11-24) is sinds 2026-11-25 dat van de
 * avond: /streams/[datum]. Deze route blijft voor oude links en stuurt door
 * naar de dag van de race, of van zijn raceweek.
 */
export default async function EventStreamsRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("start_at, parent_event_id").eq("id", id).maybeSingle();
  const event = data as { start_at: string; parent_event_id: string | null } | null;
  if (!event) notFound();
  let startAt = event.start_at;
  if (event.parent_event_id) {
    const { data: parent } = await supabase
      .from("events")
      .select("start_at")
      .eq("id", event.parent_event_id)
      .maybeSingle();
    startAt = (parent as { start_at: string } | null)?.start_at ?? startAt;
  }
  redirect(`/streams/${amsterdamDateKey(new Date(startAt))}`);
}
