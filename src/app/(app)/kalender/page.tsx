import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

const TYPE_LABELS: Record<string, string> = {
  outdoor: "Outdoor rit",
  zrl: "ZRL race",
  ladder: "Ladder race",
  flamme_rouge: "Flamme Rouge",
  social: "Social",
  training: "Training",
};

export default async function KalenderPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, type, start_at, location, distance_km, elevation_m")
    .order("start_at", { ascending: true });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Kalender</h1>
          <p className="mt-1 text-muted-foreground">Alle ZWB-events op één plek.</p>
        </div>
        <Link href="/kalender/nieuw">
          <Button>Nieuw event</Button>
        </Link>
      </header>

      {!events || events.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Nog geen events. Maak het eerste aan!
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={`/events/${e.id}`}
                className="flex items-center justify-between rounded-lg border bg-card p-4 transition hover:border-foreground/30"
              >
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(e.start_at).toLocaleString("nl-NL", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                    {e.location ? ` · ${e.location}` : ""}
                    {e.distance_km ? ` · ${e.distance_km} km` : ""}
                    {e.elevation_m ? ` · ${e.elevation_m} hm` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                  {TYPE_LABELS[e.type] ?? e.type}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
