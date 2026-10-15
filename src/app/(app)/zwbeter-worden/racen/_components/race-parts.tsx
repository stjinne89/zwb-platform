// Bouwstenen die de ZRL-pagina en de pagina van een individuele race delen.

import Link from "next/link";
import { EmptyState, HelpLink, SectionHeader } from "@/components/app-ui";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import type { RideOutcome } from "@/lib/zrl-analysis/load";
import type { RideAnalysis } from "@/lib/zrl-analysis/ride";
import type { Advice } from "@/lib/zrl-analysis/advice";
import { decimal, durationLabel, raceClock, signedSeconds } from "@/lib/zrl-analysis/format";
import { cn } from "@/lib/utils";
import { RideChart } from "./ride-chart";

export const dateLabel = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <div className={cn("text-xl font-semibold tabular-nums tracking-tight sm:text-2xl", accent && "text-primary")}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function Chip({ ms }: { ms: number }) {
  const tone = ms > 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : ms < 0 ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-muted text-muted-foreground";
  return <span className={cn("inline-block rounded-full px-2 py-0.5 font-mono text-xs tabular-nums", tone)}>{signedSeconds(ms)}</span>;
}

export function TipList({ tips }: { tips: Advice[] }) {
  return (
    <ul className="space-y-2">
      {tips.map((t) => (
        <li key={t.finding} className="rounded-lg border bg-card p-3">
          <p className="text-sm text-muted-foreground">{t.finding}</p>
          <p className="mt-1 font-medium">{t.tip}</p>
        </li>
      ))}
    </ul>
  );
}

const RIDE_STATUS: Record<Exclude<RideOutcome["status"], "ok">, string | null> = {
  "not-riding": null,
  "no-intervals": "Koppel intervals.icu voor de analyse van je eigen rit.",
  "no-ride": "Je rit van deze race staat niet in intervals.icu.",
  "strava-only": "Je rit kwam via Strava in intervals.icu; daar zit geen bestand per seconde bij.",
  error: "intervals.icu gaf je rit nu niet. Probeer het later opnieuw.",
};

export function OwnRide({ ride }: { ride: RideOutcome }) {
  if (ride.status !== "ok") {
    const message = RIDE_STATUS[ride.status];
    if (!message) return null;
    return (
      <section>
        <SectionHeader title="Jouw rit" />
        <EmptyState action={ride.status === "no-intervals" ? <Link href="/zwbeter-worden/vermogen" className="text-sm underline">Vermogen</Link> : undefined}>
          {message}
        </EmptyState>
      </section>
    );
  }
  const a: RideAnalysis = ride.analysis;
  const climbs = a.phases.filter((p) => p.climb).map((p) => ({ name: p.name, from: p.from, to: p.to }));
  return (
    <section className="space-y-4">
      <SectionHeader title="Jouw rit" action={<HelpLink href="/hulp#racen-eigen-rit" />} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={`${a.np} W`} label={a.intensity !== null ? `genormaliseerd · IF ${decimal(a.intensity)}` : "genormaliseerd"} />
        <Stat value={`${a.avgWatts} W`} label={`gemiddeld · ${a.kilojoules} kJ`} />
        <Stat value={a.avgHeartRate ? `${a.avgHeartRate} / ${a.maxHeartRate}` : "—"} label="hartslag gem. / max" />
        <Stat value={a.wbalMin ? `${a.wbalMin.share}%` : "—"} label={a.wbalMin ? `laagste W′ · ${raceClock(a.wbalMin.at)}` : "W′-balans"} />
      </div>
      <div className="rounded-lg border bg-card p-3">
        <RideChart series={a.series} climbs={climbs} ftp={ride.ftp} />
      </div>

      <ResponsiveTable
        columns={[
          { key: "name", header: "Stuk", cell: (p) => p.name, primary: true },
          { key: "time", header: "Tijd", cell: (p) => raceClock(p.to - p.from), align: "right" },
          { key: "avg", header: "Gem.", cell: (p) => `${p.avgWatts} W`, align: "right" },
          { key: "np", header: "NP", cell: (p) => `${p.np} W`, align: "right" },
          { key: "if", header: "IF", cell: (p) => decimal(p.intensity), align: "right" },
          { key: "hr", header: "Hartslag", cell: (p) => p.avgHeartRate ?? "—", align: "right" },
          { key: "cad", header: "Cadans", cell: (p) => p.cadence ?? "—", align: "right" },
          { key: "wbal", header: "Laagste W′", cell: (p) => (p.wbalMin === null ? "—" : `${p.wbalMin}%`), align: "right" },
        ]}
        rows={a.phases}
        rowKey={(p) => `${p.name}-${p.from}`}
        rowClassName={(p) => (p.climb ? "bg-muted/40" : undefined)}
        minWidth={640}
      />

      {a.best.some((b) => b.share !== null) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Beste vermogen tegenover de laatste 90 dagen</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {a.best.map((b) => (
              <li key={b.seconds} className="rounded-lg border bg-card p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{durationLabel(b.seconds)}</span>
                  <span className="font-semibold tabular-nums">{b.share !== null ? `${b.share}%` : "—"}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, b.share ?? 0)}%` }} />
                </div>
                <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {b.watts} W{b.season ? ` van ${b.season} W` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        {a.drift && (
          <div className="rounded-lg border bg-card p-3">
            <dt className="text-muted-foreground">Watt per hartslag</dt>
            <dd className="font-medium tabular-nums">
              {decimal(a.drift.first)} → {decimal(a.drift.last)} ({a.drift.change > 0 ? "+" : ""}
              {a.drift.change}%)
            </dd>
          </div>
        )}
        {a.cadenceAboveFtp.length > 0 && (
          <div className="rounded-lg border bg-card p-3">
            <dt className="text-muted-foreground">Cadans boven je FTP</dt>
            <dd className="font-medium tabular-nums">
              {a.cadenceAboveFtp.map((c) => `${c.from}-${c.from + 9}: ${raceClock(c.seconds)}`).join(" · ")}
            </dd>
          </div>
        )}
        {a.missingStart > 0 && (
          <div className="rounded-lg border bg-card p-3">
            <dt className="text-muted-foreground">Bestand begint</dt>
            <dd className="font-medium tabular-nums">{a.missingStart} s na de start</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
