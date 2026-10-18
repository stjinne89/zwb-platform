// ZWB DS: alles onder de kop van de pagina. Los van de pagina zodat het
// designvoorbeeld (app/ontwerp-voorbeeld) het met voorbeelddata kan tonen.

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { DsGroup, DsRider } from "@/lib/ds/field";
import type { DsView } from "@/lib/ds/snapshot";
import { cn } from "@/lib/utils";
import { DsCourse } from "./ds-course";

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

function oneDecimal(value: number) {
  return value.toLocaleString("nl-NL", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

/** W/kg als het gewicht bekend is, anders watt. */
function effort(wkg: number | null, watts: number | null) {
  if (wkg !== null) return `${oneDecimal(wkg)} W/kg`;
  if (watts !== null) return `${Math.round(watts)} W`;
  return "—";
}

function grade(pct: number | null) {
  if (pct === null || Math.abs(pct) < 0.5) return null;
  return `${pct > 0 ? "" : "−"}${oneDecimal(Math.abs(pct))}%`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate font-semibold tabular-nums">{value}</div>
    </div>
  );
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

function Course({ view }: { view: DsView }) {
  const { field } = view;
  if (!field.routeM || field.riders.length === 0) return null;
  const me = view.focusId;
  return (
    <div className="space-y-1">
      <DsCourse
        profile={view.profile}
        routeM={field.routeM}
        marks={field.marks}
        riders={field.riders.map((r) => ({
          id: r.zwiftId,
          name: r.name,
          zwb: r.zwb,
          me: r.zwiftId === me,
          distanceM: r.distanceM,
          speedMs: r.speedKmh / 3.6,
          finished: r.finished,
        }))}
      />
      {field.leaderM !== null && (
        <p className="flex justify-between px-1 text-xs tabular-nums text-muted-foreground">
          <span>Kop op {km(field.leaderM)}</span>
          <span>{km(field.routeM)}</span>
        </p>
      )}
    </div>
  );
}

function GroupSummary({ group, index }: { group: DsGroup; index: number }) {
  const ours = group.riders.filter((r) => r.zwb);
  const slope = grade(group.gradePct);
  return (
    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2 text-sm">
      <span className="w-5 tabular-nums text-muted-foreground">{index + 1}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">
          <span className="tabular-nums">{group.riders.length}</span>
          {ours.length > 0 && <span className="font-semibold text-primary"> · {ours.map((r) => r.name).join(", ")}</span>}
        </span>
        <span className="block text-xs tabular-nums text-muted-foreground">
          {[group.wkg !== null ? `${oneDecimal(group.wkg)} W/kg` : null, `${Math.round(group.speedKmh)} km/u`, slope]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className="w-14 text-right tabular-nums">{gap(group.gapS)}</span>
    </summary>
  );
}

function Groups({ view }: { view: DsView }) {
  const { field } = view;
  if (field.groups.length === 0) return null;
  return (
    <section className="rounded-lg border bg-card">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">Groepen</h2>
      <ol className="divide-y">
        {field.groups.map((group, i) => (
          <li key={i}>
            <details>
              <GroupSummary group={group} index={i} />
              <table className="mb-2 w-full table-fixed text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-1 text-left font-normal">Renner</th>
                    <th className="w-20 px-1 py-1 text-right font-normal">Nu</th>
                    <th className="w-20 px-1 py-1 text-right font-normal">Gem.</th>
                    <th className="w-16 px-4 py-1 text-right font-normal">km/u</th>
                  </tr>
                </thead>
                <tbody>
                  {group.riders.map((rider) => (
                    <tr key={rider.zwiftId} className={rider.zwb ? "font-semibold" : "text-muted-foreground"}>
                      <td className="truncate px-4 py-0.5">{rider.name}</td>
                      <td className="whitespace-nowrap px-1 py-0.5 text-right tabular-nums">{effort(rider.wkg, rider.watts)}</td>
                      <td className="whitespace-nowrap px-1 py-0.5 text-right tabular-nums">{effort(rider.avgWkg, rider.avgWatts)}</td>
                      <td className="px-4 py-0.5 text-right tabular-nums">{Math.round(rider.speedKmh)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RiderCard({ rider, total, routeM }: { rider: DsRider; total: number; routeM: number | null }) {
  const slope = grade(rider.gradePct);
  return (
    <li className="space-y-2 px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="w-12 tabular-nums text-muted-foreground">
          {rider.position}/{total}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{rider.name}</span>
        <span className="font-semibold tabular-nums">{rider.finished ? "Binnen" : gap(rider.gapS) || "Kop"}</span>
      </div>
      {!rider.finished && (
        <>
          <div className="grid grid-cols-3 gap-x-3 gap-y-2 sm:grid-cols-6">
            <Stat label="Nu" value={effort(rider.wkg, rider.watts)} />
            <Stat label="Gem." value={effort(rider.avgWkg, rider.avgWatts)} />
            <Stat label="km/u" value={String(Math.round(rider.speedKmh))} />
            <Stat label="Cadans" value={rider.cadenceRpm ? String(rider.cadenceRpm) : "—"} />
            <Stat label="Draft" value={rider.draft !== null ? `${rider.draft} W` : "—"} />
            <Stat label="Helling" value={slope ?? "0%"} />
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            {[
              routeM ? `nog ${km(Math.max(0, routeM - rider.distanceM))}` : null,
              rider.next ? `${rider.next.name} over ${km(rider.next.inM)}` : null,
              rider.ageS > 20 ? `${rider.ageS} s geleden gemeten` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </>
      )}
    </li>
  );
}

function OurRiders({ view }: { view: DsView }) {
  const { field } = view;
  const ours = field.riders.filter((r) => r.zwb);
  if (ours.length === 0 && view.zwbUnseen.length === 0) return null;
  return (
    <section className="rounded-lg border bg-card">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">ZWB</h2>
      <ul className="divide-y">
        {ours.map((rider) => (
          <RiderCard key={rider.zwiftId} rider={rider} total={field.riders.length} routeM={field.routeM} />
        ))}
      </ul>
      {view.zwbUnseen.length > 0 && (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">Niet in beeld: {view.zwbUnseen.join(", ")}</p>
      )}
    </section>
  );
}

export function DsSections({ view }: { view: DsView }) {
  const { field } = view;
  const started = view.now >= view.subgroup.startAt;
  return (
    <>
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
          <Course view={view} />
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
    </>
  );
}
