import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/app-ui";
import { groupSubEvents, subEventLabel } from "@/lib/events/sub-events";
import { FRR_TOUR_COLUMNS, type FrrTourRow } from "@/lib/frr/import";
import { RefreshButton, TourForm } from "./_components/tour-form";
import { adminAreaPermission } from "@/lib/admin-areas";
import { getRequestAccess } from "@/lib/auth/request";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  title: string;
  start_at: string;
  parent_event_id: string | null;
  frr_tour_id: string | null;
  frr_stage: number | null;
  zwift_event_id: number | string | null;
};

function when(iso: string | null) {
  if (!iso) return "nooit";
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

export default async function FrrKalenderPage() {
  const supabase = await createClient();
  const access = await getRequestAccess();
  if (!access.user) redirect("/login");
  if (!access.has(adminAreaPermission("frr"))) redirect("/dashboard");

  const [{ data: tourRows }, { data: eventRows }, { data: entrantRows }] = await Promise.all([
    supabase.from("frr_tours").select(FRR_TOUR_COLUMNS).order("starts_on", { ascending: false }),
    supabase
      .from("events")
      .select("id, title, start_at, parent_event_id, frr_tour_id, frr_stage, zwift_event_id")
      .not("frr_tour_id", "is", null)
      .order("start_at")
      .limit(400),
    supabase.from("frr_slot_entrants").select("event_id").not("profile_id", "is", null),
  ]);
  const tours = (tourRows ?? []) as FrrTourRow[];
  const events = (eventRows ?? []) as EventRow[];
  // ZWB'ers per tijdslot.
  const counts = new Map<string, number>();
  for (const row of (entrantRows ?? []) as Array<{ event_id: string }>) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">FRR-kalender</h1>
      </header>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tour toevoegen
        </h2>
        <TourForm />
      </section>

      {tours.length === 0 ? (
        <EmptyState>Nog geen FRR-tours.</EmptyState>
      ) : (
        tours.map((tour) => {
          const ofTour = events.filter((event) => event.frr_tour_id === tour.id);
          const { childrenByParent } = groupSubEvents(ofTour);
          // Tourevent, etappes (met nummer) en tijdsloten (met Zwift-event), migr. 0196.
          const tourEvent = ofTour.find((event) => !event.frr_stage && !event.zwift_event_id);
          const stages = ofTour
            .filter((event) => event.frr_stage && !event.zwift_event_id)
            .sort((a, b) => (a.frr_stage ?? 0) - (b.frr_stage ?? 0));
          return (
            <section key={tour.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{tour.name}</h2>
                <span className="text-sm text-muted-foreground">
                  #{tour.zwift_tag}
                  {tour.starts_on && tour.ends_on && ` · ${tour.starts_on} t/m ${tour.ends_on}`}
                </span>
              </div>
              <TourForm
                initial={{ name: tour.name, tag: tour.zwift_tag, gcCode: tour.gc_code }}
              />
              <dl className="grid gap-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="inline text-muted-foreground">Laatste sync: </dt>
                  <dd className="inline">{when(tour.synced_at)}</dd>
                  {tour.sync_error && <p className="text-destructive">{tour.sync_error}</p>}
                </div>
                <div>
                  <dt className="inline text-muted-foreground">Klassement: </dt>
                  <dd className="inline">
                    {tour.gc_after_stage
                      ? `na etappe ${tour.gc_after_stage} (${when(tour.gc_scraped_at)})`
                      : "nog niet geladen"}
                  </dd>
                  {tour.gc_error && <p className="text-destructive">{tour.gc_error}</p>}
                </div>
              </dl>
              <RefreshButton tourId={tour.id} />
              {tourEvent && (
                <Link href={`/events/${tourEvent.id}`} className="block font-medium hover:underline">
                  {tourEvent.title}
                </Link>
              )}
              {stages.length === 0 ? (
                <EmptyState>Nog geen etappes in de kalender.</EmptyState>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {stages.map((stage) => (
                    <li key={stage.id} className="space-y-1 p-3 text-sm">
                      <Link href={`/events/${stage.id}`} className="font-medium hover:underline">
                        {stage.title}
                      </Link>
                      <div className="flex flex-wrap gap-1.5">
                        {(childrenByParent.get(stage.id) ?? []).map((slot) => {
                          const count = counts.get(slot.id);
                          return (
                            <Link
                              key={slot.id}
                              href={`/events/${slot.id}`}
                              className="rounded-full border px-2 py-0.5 text-xs tabular-nums hover:bg-muted"
                            >
                              {subEventLabel(slot.title, stage.title)}
                              {count ? ` · ${count} ZWB` : null}
                            </Link>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
