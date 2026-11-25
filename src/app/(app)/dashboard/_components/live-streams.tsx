// "Nu live": races waarvan een lid nu streamt (livestreams, fase 2, 0339).
// De status zet de cron /api/youtube/status; zonder die cron blijft dit leeg.
// Async server component achter een Suspense, zoals Jouw races.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Row = {
  event_id: string;
  /** 'extra' (0370): niet van het lid dat hem toevoegde; dan de kanaalnaam. */
  source?: string | null;
  channel_title?: string | null;
  events: { title: string } | { title: string }[] | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

const first = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? value[0] ?? null : value);

export async function LiveStreamTiles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_streams")
    .select("event_id, source, channel_title, events(title), profiles(display_name)")
    .eq("status", "live")
    .order("created_at")
    .limit(30);
  if (error || !data?.length) return null;

  const byEvent = new Map<string, { title: string; names: string[] }>();
  for (const row of data as Row[]) {
    const entry = byEvent.get(row.event_id) ?? { title: first(row.events)?.title ?? "Race", names: [] };
    const name = (row.source === "extra" ? row.channel_title : first(row.profiles)?.display_name)?.trim();
    if (name && !entry.names.includes(name)) entry.names.push(name);
    byEvent.set(row.event_id, entry);
  }

  return (
    <>
      {[...byEvent].map(([eventId, entry]) => (
        <Link key={eventId} href={`/events/${eventId}`} className="tg-tile tg-kalender">
          <span className="tg-tile-small line-clamp-1">Stream · nu</span>
          <span className="tg-tile-title mt-0.5 line-clamp-2">{entry.title}</span>
          <span className="mt-1 line-clamp-1 text-[0.9375rem]">{entry.names.join(", ")}</span>
          <span className="tg-tile-num">
            {entry.names.length || 1}
            <span className="ml-1.5 text-base font-normal tracking-normal opacity-85">live</span>
          </span>
        </Link>
      ))}
    </>
  );
}
