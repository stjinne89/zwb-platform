import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { AutoRefresh } from "@/app/omnium/_components/auto-refresh";
import { BackLink, PageHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { getRequestUser } from "@/lib/auth/request";
import { loadDsView, type DsView } from "@/lib/ds/snapshot";
import type { DsRider } from "@/lib/ds/field";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "ZWB DS" };

/** "+0:18", of "+1:05". */
function gap(seconds: number | null) {
  if (seconds === null) return "";
  const s = Math.round(seconds);
  if (s < 1) return "";
  return `+${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function km(meters: number) {
  return `${(meters / 1000).toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function clock(ms: number) {
  return new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }).format(ms);
}

/** W/kg als het gewicht bekend is, anders watt. */
function effort(rider: DsRider) {
  if (rider.wkg !== null) return `${rider.wkg.toLocaleString("nl-NL", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} W/kg`;
  if (rider.watts !== null) return `${rider.watts} W`;
  return "";
}

function Status({ view }: { view: DsView }) {
  const parts = [view.subgroup.label ? `Groep ${view.subgroup.label}` : null];
  if (view.now < view.subgroup.startAt) {
    parts.push(`start ${clock(view.subgroup.startAt)}`);
  } else if (view.newestStateAt) {
    parts.push(`bijgewerkt ${Math.max(0, Math.round((view.now - view.newestStateAt) / 1000))} s geleden`);
  }
  if (view.problem === "zwift") parts.push("Zwift remt af");
  if (view.problem === "database") parts.push("niet bij te werken");
  return <p className="text-sm text-muted-foreground">{parts.filter(Boolean).join(" · ")}</p>;
}

function CourseBar({ view }: { view: DsView }) {
  const { field } = view;
  if (!field.routeM || field.leaderM === null) return null;
  const at = (m: number) => `${Math.min(100, Math.max(0, (m / (field.routeM as number)) * 100))}%`;
  const zwb = field.riders.filter((r) => r.zwb && !r.finished);
  return (
    <section className="rounded-lg border bg-card px-4 py-3">
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
        {field.marks.map((mark) => (
          <span
            key={`${mark.name}-${mark.atM}`}
            title={mark.name}
            className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-muted-foreground/50"
            style={{ left: at(mark.atM) }}
          />
        ))}
        {field.groups.map((group, i) => (
          <span
            key={i}
            title={`${group.riders.length}`}
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground"
            style={{ left: at(group.riders[0].distanceM) }}
          />
        ))}
        {zwb.map((rider) => (
          <span
            key={rider.zwiftId}
            title={rider.name}
            className="absolute bottom-0 size-2 -translate-x-1/2 rounded-full bg-primary"
            style={{ left: at(rider.distanceM) }}
          />
        ))}
      </div>
      <p className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{km(field.leaderM)}</span>
        <span>{km(field.routeM)}</span>
      </p>
    </section>
  );
}

function Groups({ view }: { view: DsView }) {
  const { field } = view;
  if (field.groups.length === 0) return null;
  return (
    <section className="rounded-lg border bg-card">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">Groepen</h2>
      <ol className="divide-y">
        {field.groups.map((group, i) => {
          const ours = group.riders.filter((r) => r.zwb);
          return (
            <li key={i}>
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-6 tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="tabular-nums">{group.riders.length}</span>
                    {ours.length > 0 && (
                      <span className="font-semibold text-primary"> · {ours.map((r) => r.name).join(", ")}</span>
                    )}
                  </span>
                  <span className="w-14 text-right tabular-nums">{gap(group.gapS)}</span>
                </summary>
                <ul className="space-y-0.5 px-4 pb-2 pl-13 text-sm">
                  {group.riders.map((rider) => (
                    <li key={rider.zwiftId} className={cn("flex gap-3", rider.zwb ? "font-semibold" : "text-muted-foreground")}>
                      <span className="min-w-0 flex-1 truncate">{rider.name}</span>
                      <span className="tabular-nums">{effort(rider)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function OurRiders({ view }: { view: DsView }) {
  const { field } = view;
  const ours = field.riders.filter((r) => r.zwb);
  if (ours.length === 0) return null;
  const total = field.riders.length;
  return (
    <section className="rounded-lg border bg-card">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">ZWB</h2>
      <ul className="divide-y">
        {ours.map((rider) => (
          <li key={rider.zwiftId} className="px-4 py-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-12 tabular-nums text-muted-foreground">
                {rider.position}/{total}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{rider.name}</span>
              <span className="tabular-nums">{rider.finished ? "Binnen" : gap(rider.gapS)}</span>
            </div>
            {!rider.finished && (
              <p className="pl-15 text-xs tabular-nums text-muted-foreground">
                {[
                  field.routeM ? `nog ${km(Math.max(0, field.routeM - rider.distanceM))}` : null,
                  rider.next ? `${rider.next.name} over ${km(rider.next.inM)}` : null,
                  effort(rider) || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function DsPage({ params, searchParams }: PageProps) {
  const { eventId } = await params;
  const query = (await searchParams) ?? {};
  const user = await getRequestUser();
  let viewerZwiftId: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("zwift_id").eq("id", user.id).maybeSingle();
    viewerZwiftId = (data?.zwift_id as string | null) ?? null;
  }
  const outcome = await loadDsView(eventId, {
    subgroupId: typeof query.groep === "string" ? query.groep : undefined,
    viewerZwiftId,
  });
  if (outcome.status === "not-found" || outcome.status === "no-zwift-event") notFound();

  if (outcome.status !== "ok") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <BackLink href={`/events/${eventId}`} label="Event" />
        <PageHeader eyebrow="ZWB DS" title="Raceoverzicht" />
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          {outcome.status === "not-configured" ? "ZWB DS staat nog niet aan." : "Zwift is nu niet bereikbaar."}
        </p>
      </div>
    );
  }

  const { view } = outcome;
  const { field } = view;
  const started = view.now >= view.subgroup.startAt;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {view.live && <AutoRefresh seconds={15} />}
      <BackLink href={`/events/${view.event.id}`} label="Event" />
      <PageHeader
        eyebrow="ZWB DS"
        title={view.event.title}
        actions={
          view.event.zrlLiveHref ? (
            <Link href={view.event.zrlLiveHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              <Trophy className="size-3.5" />
              Live stand
            </Link>
          ) : undefined
        }
      />
      <Status view={view} />

      {view.subgroups.length > 1 && (
        <nav className="flex flex-wrap gap-2">
          {view.subgroups.map((s) => (
            <Link
              key={s.id}
              href={`/ds/${view.event.id}?groep=${s.id}`}
              className={cn(
                buttonVariants({ size: "sm", variant: s.id === view.subgroup.id ? "default" : "outline" }),
              )}
            >
              {s.label || s.id}
              {s.zwb > 0 && <span className="tabular-nums opacity-70">{s.zwb}</span>}
            </Link>
          ))}
        </nav>
      )}

      {started && field.riders.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Nog geen renners in beeld.</p>
      ) : (
        <>
          <CourseBar view={view} />
          <OurRiders view={view} />
          <Groups view={view} />
        </>
      )}

      {field.finished.length > 0 && (
        <section className="rounded-lg border bg-card">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">Binnen</h2>
          <p className="px-4 py-2 text-sm text-muted-foreground">{field.finished.map((r) => r.name).join(", ")}</p>
        </section>
      )}
    </div>
  );
}
