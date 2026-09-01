import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/app-ui";
import { CP_SOURCE_LABELS } from "@/lib/pacing/cp";
import { loadPacingPage } from "@/lib/pacing/session";
import { PacingEditor } from "./_components/pacing-editor";
import { RouteShape } from "./_components/route-shape";
import { GenerateButton } from "./_components/generate-button";
import { AdoptButton, RecomputeButton, ShareToggle } from "./_components/plan-controls";

export const dynamic = "force-dynamic";

function hhmm(seconds: number) {
  const total = Math.round(seconds / 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours > 0 ? `${hours}u ${String(minutes).padStart(2, "0")}m` : `${minutes} min`;
}

export default async function PacingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");

  const result = await loadPacingPage(id);
  if (!result.ok) {
    // Een event dat niet bestaat is een 404; alle andere redenen (geen route,
    // profiel nog niet opgehaald) zijn een normale toestand met uitleg.
    if (result.error === "Event bestaat niet.") notFound();
    return (
      <div className="space-y-4">
        <BackLink eventId={id} />
        <PageHeader title="Pacingplan" />
        <section className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          {result.error}
        </section>
      </div>
    );
  }

  const { event, loaded, rider, plan, staleness, sharedPlans, similarRides } =
    result.data;
  const summary = plan.summary;

  return (
    <div className="space-y-6">
      <BackLink eventId={id} />

      <PageHeader
        title="Pacingplan"
        actions={<GenerateButton eventId={id} />}
      />

      <section className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">{event.title}</h2>
        <p className="text-sm text-muted-foreground">
          {loaded.routeName ?? "Eigen route"}
          {loaded.world ? ` · ${loaded.world}` : ""}
          {` · ${loaded.route.totalKm.toFixed(1)} km`}
          {loaded.route.accents.length > 0
            ? ` · ${loaded.route.accents.length} accent(en)`
            : ""}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerekend met CP {rider.model.cpWatts} W en W′{" "}
          {Math.round(rider.model.wPrimeJoules / 100) / 10} kJ op{" "}
          {rider.model.weightKg} kg — {CP_SOURCE_LABELS[rider.model.source]}
          {rider.durability
            ? `. Na een berg werk zakt je drempel volgens je vermoeidheidscurves met ${Math.round(rider.durability.maxFadePct)}%.`
            : "."}
        </p>
        {loaded.route.leadInApproximated && (
          <p className="mt-1 text-xs text-muted-foreground">
            De lead-in is als gelijkmatige helling benaderd.
          </p>
        )}
      </section>

      {staleness.stale && (
        <section className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <p className="font-medium">Dit plan is verouderd</p>
          <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            {staleness.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RecomputeButton eventId={id} />
            <GenerateButton eventId={id} />
          </div>
        </section>
      )}

      {summary?.strategy && (
        <section className="rounded-lg border bg-card p-4">
          <p>{summary.strategy}</p>
          {summary.risks && summary.risks.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
              {summary.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {summary?.notes && summary.notes.length > 0 && (
        <section className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <ul className="space-y-0.5">
            {summary.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      {loaded.shape && (
        <section className="rounded-lg border bg-card p-4">
          <RouteShape shape={loaded.shape} name={loaded.routeName} />
        </section>
      )}

      <PacingEditor
        eventId={id}
        route={loaded.route}
        model={rider.model}
        initialSegments={plan.segments}
        initialNotes={plan.notes}
      />

      <section className="rounded-lg border bg-card p-4">
        <ShareToggle eventId={id} shared={plan.shared} />
      </section>

      {similarRides.length > 0 && (
        <section className="rounded-lg border bg-card">
          <h2 className="border-b p-4 font-semibold">Hier lijkt het op</h2>
          <ul className="divide-y">
            {similarRides.map((scored) => (
              <li key={scored.ride.id} className="p-4">
                <p className="font-medium">{scored.ride.name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(scored.ride.date).toLocaleDateString("nl-NL", {
                    dateStyle: "medium",
                    timeZone: "Europe/Amsterdam",
                  })}
                  {` · ${scored.ride.distanceKm.toFixed(0)} km · ${Math.round(scored.ride.elevationM)} hm · ${hhmm(scored.ride.movingSeconds)}`}
                  {scored.wattsUsed ? ` · ${Math.round(scored.wattsUsed)} W` : ""}
                </p>
                {scored.reasons.length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {scored.reasons.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sharedPlans.length > 0 && (
        <section className="rounded-lg border bg-card">
          <h2 className="border-b p-4 font-semibold">Plannen van clubgenoten</h2>
          <ul className="divide-y">
            {sharedPlans.map((shared) => (
              <li
                key={shared.planId}
                className="flex flex-wrap items-center justify-between gap-2 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{shared.ownerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {shared.summary
                      ? `${hhmm(shared.summary.totalSeconds)} · ${shared.summary.avgWkg.toFixed(2)} w/kg gem. · ${shared.segments.length} stukken`
                      : `${shared.segments.length} stukken`}
                    {shared.stale ? " · verouderd" : ""}
                  </p>
                </div>
                <AdoptButton
                  eventId={id}
                  planId={shared.planId}
                  ownerName={shared.ownerName}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BackLink({ eventId }: { eventId: string }) {
  return (
    <Link
      href={`/events/${eventId}`}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Terug naar het event
    </Link>
  );
}
