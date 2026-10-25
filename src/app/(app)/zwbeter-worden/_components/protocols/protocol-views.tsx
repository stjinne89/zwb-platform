// Weergave van de protocollen, gedeeld door trainen en voeden. Server
// components; afvinken, starten en stoppen zitten in protocol-forms.tsx.

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, ExternalLink, OctagonX, Thermometer } from "lucide-react";
import { EVIDENCE_LABELS } from "@/lib/nutrition/library";
import {
  formatDose,
  phaseOn,
  protocolBySlug,
  protocolsByGroup,
  runEndDate,
  tasksForDay,
  type Protocol,
  type ProtocolCheck,
  type ProtocolCoreSession,
  type ProtocolPillar,
  type ProtocolRun,
  type ProtocolTask,
} from "@/lib/protocols";
import { analyzeHeatSession, formatCoreSession, protocolUsesCore } from "@/lib/protocols/core-temperature";
import type { DurabilityPoint } from "@/lib/training/durability-test";
import { shiftDays } from "@/lib/training/season";
import { cn } from "@/lib/utils";
import { BackLink } from "@/components/app-ui";
import { EvidenceBadge } from "@/components/evidence-badge";
import { MethodLabelBadge } from "@/components/method-label-badge";
import { startProtocol, stopProtocol, toggleProtocolTask } from "../../_protocol-actions";
import { ProtocolStartForm, ProtocolStopButton, ProtocolTaskToggle } from "./protocol-forms";

const DATE = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", timeZone: "UTC" });

export function formatDay(day: string): string {
  return DATE.format(new Date(`${day}T12:00:00Z`));
}

// Dezelfde badge als bij een kennisartikel.
function ProtocolBadges({ protocol }: { protocol: Protocol }) {
  return (
    <>
      <EvidenceBadge evidence={protocol.evidence} />
      <MethodLabelBadge label={protocol.methodLabel} />
    </>
  );
}

export function ProtocolList({
  pillar,
  basePath,
  activeSlugs,
}: {
  pillar: ProtocolPillar;
  basePath: string;
  activeSlugs: Set<string>;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Protocollen</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {protocolsByGroup(pillar).map(({ group, protocols }) => (
          <div key={group} className="rounded-lg border bg-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h3>
            <ul className="mt-2 divide-y">
              {protocols.map((protocol) => (
                <li key={protocol.slug}>
                  <Link
                    href={`${basePath}/${protocol.slug}`}
                    className="flex min-h-[44px] items-center justify-between gap-3 py-2 text-sm hover:text-primary"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{protocol.title}</span>
                      <span className="mt-1 flex flex-wrap gap-2">
                        <ProtocolBadges protocol={protocol} />
                        {activeSlugs.has(protocol.slug) ? (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                            Loopt
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** De beste CORE-meting van een run op één dag: een die voldoet, anders de meeste minuten boven de drempel. */
function bestCoreSession(sessions: ProtocolCoreSession[], runId: string, day: string, task: ProtocolTask) {
  return sessions
    .filter((session) => session.protocolId === runId && session.day === day)
    .map((session) => ({ session, met: analyzeHeatSession(task, session).met }))
    .sort(
      (a, b) =>
        Number(b.met) - Number(a.met) ||
        b.session.minutesAbove - a.session.minutesAbove ||
        b.session.maxC - a.session.maxC,
    )[0]?.session;
}

function coreLine(session: ProtocolCoreSession): string {
  return session.rideMinutes === null
    ? formatCoreSession(session)
    : `${formatCoreSession(session)} · ${session.rideMinutes} min gereden`;
}

/** Het oordeel over één hittesessie: voldaan, of waarom niet en wat beter kan. */
function HeatSessionResult({ task, session }: { task: ProtocolTask; session: ProtocolCoreSession }) {
  const verdict = analyzeHeatSession(task, session);
  return (
    <div className="mt-1 space-y-1">
      <p className={cn("flex items-start gap-1.5 font-medium", verdict.met ? "text-primary" : "text-foreground")}>
        <Thermometer className="mt-0.5 size-4 shrink-0" />
        <span className="tabular-nums">
          {verdict.met ? "Voldaan" : "Niet voldaan"} · {coreLine(session)}
        </span>
      </p>
      {verdict.reasons.length > 0 ? (
        <ul className="space-y-0.5 pl-5.5 text-muted-foreground">
          {verdict.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {verdict.tip ? <p className="pl-5.5">{verdict.tip}</p> : null}
      {verdict.notes.map((note) => (
        <p key={note} className="flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>{note}</span>
        </p>
      ))}
    </div>
  );
}

/** De taken van één dag, met vinkjes. Leeg als er die dag niets staat. */
export function ProtocolDayTasks({
  protocol,
  run,
  day,
  weightKg,
  checks,
  coreSessions = [],
  readOnly,
}: {
  protocol: Protocol;
  run: ProtocolRun;
  day: string;
  weightKg: number | null;
  checks: ProtocolCheck[];
  coreSessions?: ProtocolCoreSession[];
  readOnly?: boolean;
}) {
  const result = tasksForDay(protocol, run, day, weightKg, checks);
  if (!result || result.tasks.length === 0) return null;
  return (
    <ul className="divide-y">
      {result.tasks.map((task) => {
        const core = task.coreMinutes ? bestCoreSession(coreSessions, run.id, day, task) : undefined;
        return (
          <li key={task.key} className="flex items-start gap-3 py-3">
            <ProtocolTaskToggle
              action={toggleProtocolTask}
              runId={run.id}
              taskKey={task.key}
              day={day}
              done={task.done}
              label={task.label}
              disabled={readOnly}
            />
            <div className="min-w-0 text-sm">
              <p className="font-medium">
                {task.label}
                {task.amount ? <span className="tabular-nums"> · {task.amount}</span> : null}
                {task.perWeek ? (
                  <span className="font-normal text-muted-foreground tabular-nums">
                    {" "}
                    · {task.weekCount ?? 0} van {task.perWeek} deze week
                  </span>
                ) : null}
              </p>
              {core ? <HeatSessionResult task={task} session={core} /> : null}
              <p className="mt-0.5 text-muted-foreground">{task.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function BulletList({ items, icon: Icon }: { items: string[]; icon: typeof CheckCircle2 }) {
  return (
    <ul className="space-y-2 rounded-lg border bg-card p-5 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function dayLabel(protocol: Protocol, fromDay: number, toDay: number): string {
  if (protocol.anchor === "wedstrijd") {
    const name = (day: number) => {
      if (day === 0) return "wedstrijddag";
      if (day === -1) return "dag ervoor";
      if (day === 1) return "dag erna";
      return day < 0 ? `${-day} dagen ervoor` : `${day} dagen erna`;
    };
    return fromDay === toDay ? name(fromDay) : `${name(fromDay)} t/m ${name(toDay)}`;
  }
  const weeks = (toDay - fromDay + 1) / 7;
  if (Number.isInteger(weeks)) return weeks === 1 ? "1 week" : `${weeks} weken`;
  return `${toDay - fromDay + 1} dagen`;
}

/** Alle ritten met kerntemperatuur in deze run, nieuwste eerst, met het oordeel. */
function CoreSessionList({
  protocol,
  run,
  sessions,
}: {
  protocol: Protocol;
  run: ProtocolRun;
  sessions: ProtocolCoreSession[];
}) {
  const rows = [...sessions].reverse().flatMap((session) => {
    const task = phaseOn(protocol, run, session.day)?.tasks.find((item) => item.coreMinutes);
    return task ? [{ session, task }] : [];
  });
  if (rows.length === 0) return null;
  return (
    <section className="max-w-3xl space-y-3">
      <h3 className="font-semibold">Hittesessies</h3>
      <ul className="divide-y rounded-lg border bg-card px-4 text-sm">
        {rows.map(({ session, task }) => (
          <li key={session.intervalsId} className="py-3">
            <p className="text-muted-foreground">{formatDay(session.day)}</p>
            <HeatSessionResult task={task} session={session} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** De eigen reeks duurtests, nieuwste bovenaan. Geen oordeel: zie durability-test.ts. */
function DurabilityTestList({ tests }: { tests: DurabilityPoint[] }) {
  if (tests.length === 0) return null;
  return (
    <section className="max-w-3xl space-y-3">
      <h3 className="font-semibold">Jouw duurtests</h3>
      <ul className="divide-y rounded-lg border bg-card px-4 text-sm">
        {[...tests].reverse().map((test) => (
          <li key={test.day} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
            <span>{formatDay(test.day)}</span>
            <span className="tabular-nums text-muted-foreground">
              Ontkoppeling {test.decoupling.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} % · {test.avgHr} bpm ·{" "}
              {test.avgWatts} W
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProtocolDetail({
  protocol,
  basePath,
  run,
  checks,
  coreSessions = [],
  durabilityTests = [],
  weightKg,
  blocker,
  today,
  races,
  readOnly,
  extra,
}: {
  protocol: Protocol;
  basePath: string;
  /** De lopende run, of null. */
  run: ProtocolRun | null;
  checks: ProtocolCheck[];
  coreSessions?: ProtocolCoreSession[];
  durabilityTests?: DurabilityPoint[];
  weightKg: number | null;
  /** Reden waarom dit lid het niet kan starten. */
  blocker: string | null;
  today: string;
  races: { date: string; title: string }[];
  readOnly?: boolean;
  /** Eigen invoer of instelling bij dit protocol, onder de metingen (zweettest, 120 g per uur). */
  extra?: ReactNode;
}) {
  const running = run && today <= runEndDate(protocol, run) ? run : null;

  return (
    <article className="space-y-6">
      <div>
        <BackLink href={basePath} label="Protocollen" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{protocol.group}</p>
        <h2 className="mt-1 text-xl font-semibold">{protocol.title}</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">{protocol.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <ProtocolBadges protocol={protocol} />
          <span className="text-muted-foreground">{protocol.goal}</span>
        </div>
      </div>

      {running ? (
        <section className="max-w-3xl space-y-3 rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Vandaag</h3>
            <p className="text-sm text-muted-foreground">
              {running.raceDate
                ? `Wedstrijd op ${formatDay(running.raceDate)}`
                : `Loopt tot ${formatDay(runEndDate(protocol, running))}`}
            </p>
          </div>
          {today < running.startDate ? (
            <p className="text-sm text-muted-foreground">Begint op {formatDay(running.startDate)}.</p>
          ) : tasksForDay(protocol, running, today, weightKg, checks)?.tasks.length ? (
            <ProtocolDayTasks
              protocol={protocol}
              run={running}
              day={today}
              weightKg={weightKg}
              checks={checks}
              coreSessions={coreSessions}
              readOnly={readOnly}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Vandaag staat er niets.</p>
          )}
          {today > running.startDate ? (
            <details className="text-sm">
              <summary className="min-h-[44px] cursor-pointer py-2 text-muted-foreground">Gisteren</summary>
              <ProtocolDayTasks
                protocol={protocol}
                run={running}
                day={shiftDays(today, -1)}
                weightKg={weightKg}
                checks={checks}
                coreSessions={coreSessions}
                readOnly={readOnly}
              />
            </details>
          ) : null}
          {readOnly ? null : <ProtocolStopButton action={stopProtocol} runId={running.id} />}
        </section>
      ) : readOnly ? null : blocker ? (
        <p className="max-w-3xl rounded-lg border bg-card p-5 text-sm text-muted-foreground">{blocker}</p>
      ) : (
        <ProtocolStartForm
          action={startProtocol}
          slug={protocol.slug}
          core={protocolUsesCore(protocol)}
          anchor={protocol.anchor}
          today={today}
          races={protocol.anchor === "wedstrijd" ? races : []}
        />
      )}

      {running ? (
        <CoreSessionList
          protocol={protocol}
          run={running}
          sessions={coreSessions.filter((session) => session.protocolId === running.id)}
        />
      ) : null}

      <DurabilityTestList tests={durabilityTests} />

      {extra}

      <section className="max-w-3xl space-y-3">
        <h3 className="font-semibold">Opzet</h3>
        <ol className="space-y-3">
          {protocol.phases.map((phase) => (
            <li key={phase.key} className="rounded-lg border bg-card p-4">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{phase.title}</span>
                <span className="text-sm text-muted-foreground">
                  {dayLabel(protocol, phase.fromDay, phase.toDay)}
                </span>
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                {phase.tasks.map((task) => (
                  <li key={task.key}>
                    <span className="font-medium">
                      {task.label}
                      {task.dose ? (
                        <span className="tabular-nums"> · {formatDose(task.dose, weightKg)}</span>
                      ) : null}
                      {task.perWeek ? ` · ${task.perWeek}× per week` : task.once ? " · één keer" : ""}
                    </span>
                    <span className="block text-muted-foreground">{task.detail}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-3xl space-y-3">
        <h3 className="font-semibold">Let op</h3>
        <BulletList items={protocol.cautions} icon={CheckCircle2} />
      </section>

      {protocol.notFor.length > 0 ? (
        <section className="max-w-3xl space-y-3">
          <h3 className="font-semibold">Niet doen</h3>
          <BulletList items={protocol.notFor} icon={OctagonX} />
        </section>
      ) : null}

      <section className="max-w-3xl space-y-3">
        <h3 className="font-semibold">Wat het bewijs niet laat zien</h3>
        <BulletList items={protocol.limits} icon={AlertTriangle} />
      </section>

      {protocol.article ? (
        <Link
          href={protocol.article.href}
          className="flex min-h-[44px] max-w-3xl items-center justify-between gap-3 rounded-lg border bg-card px-4 text-sm hover:text-primary"
        >
          <span>
            Kennisbank: <span className="font-medium">{protocol.article.title}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      <section className="max-w-3xl space-y-3">
        <h3 className="font-semibold">Bronnen</h3>
        <ol className="space-y-3 text-sm">
          {protocol.sources.map((source) => (
            <li key={source.url} className="rounded-md border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {EVIDENCE_LABELS[source.kind]}
                </span>
                <span className="text-xs text-muted-foreground">{source.year}</span>
              </div>
              <p className="mt-1">{source.citation}</p>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex min-h-[44px] items-center gap-1 break-all text-primary hover:underline"
              >
                Open bron
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            </li>
          ))}
        </ol>
      </section>

      <p className="max-w-3xl text-xs text-muted-foreground">
        Eigen samenvatting van de bronnen, niet nagekeken door een sportarts of sportdiëtist. Geen medisch
        advies.
      </p>
    </article>
  );
}

/**
 * Alleen-lezen overzicht van de lopende protocollen van een lid, voor de eigen
 * trainer. Met de taken van vandaag, zodat de trainer ziet wat er is gedaan.
 */
export function ProtocolRunsOverview({
  runs,
  checks,
  coreSessions = [],
  weightKg,
  today,
}: {
  runs: ProtocolRun[];
  checks: ProtocolCheck[];
  coreSessions?: ProtocolCoreSession[];
  weightKg: number | null;
  today: string;
}) {
  const items = runs.flatMap((run) => {
    const protocol = protocolBySlug(run.protocolSlug);
    return protocol && today <= runEndDate(protocol, run) ? [{ run, protocol }] : [];
  });
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Protocollen</h2>
      <ul className="space-y-3">
        {items.map(({ run, protocol }) => (
          <li key={run.id} className="rounded-lg border bg-card p-4">
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{protocol.title}</span>
              <span className="text-sm text-muted-foreground">
                {run.raceDate
                  ? `Wedstrijd op ${formatDay(run.raceDate)}`
                  : `${formatDay(run.startDate)} t/m ${formatDay(runEndDate(protocol, run))}`}
              </span>
            </p>
            {today >= run.startDate ? (
              <ProtocolDayTasks
                protocol={protocol}
                run={run}
                day={today}
                weightKg={weightKg}
                checks={checks}
                coreSessions={coreSessions}
                readOnly
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
