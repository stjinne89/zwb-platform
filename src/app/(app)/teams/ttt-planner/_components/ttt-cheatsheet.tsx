// Spiekbriefje in de TTT Planner: vuistregels, een check van het plan, en de
// lessen uit eerdere ploegentijdritten van het team en de renners. Alleen voor
// wie het plan beheert (captain, co-captain of rosterbeheer): het toont
// vermogen per renner uit de races.

import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { ArrowRight, Gauge, Mountain, NotebookPen, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadTttRaces } from "@/lib/zrl-analysis/load";
import { buildCheatsheet, PULL_TARGET, type CheatFlag, type Cheatsheet, type CheatsheetRace, type CheatsheetRider } from "@/lib/ttt/lessons";
import { DRAFT_ONLY_FTP_SHARE, PULL_HIGH_SHARE, PULL_LOW_SHARE, type PlanComposition, type PlanRider } from "@/lib/zrl-analysis/advice";
import { raceTime, signedSeconds, wkg } from "@/lib/zrl-analysis/format";

// De races veranderen alleen als er een nieuwe ploegentijdrit gereden is. Een
// uur cachen houdt de planner snel; de versie in de sleutel ververst na een deploy
// met een andere vorm.
const cachedTttRaces = unstable_cache(loadTttRaces, ["ttt-races", "v1"], { revalidate: 3600 });

const dateLabel = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });
const pct = (share: number) => `${Math.round(100 * share)}%`;

const TONE: Record<CheatFlag["tone"], { className: string; Icon: typeof TriangleAlert }> = {
  warn: { className: "bg-destructive/10 text-destructive", Icon: TriangleAlert },
  limit: { className: "bg-[rgb(var(--zwblok-own-text)/0.14)] text-[rgb(var(--zwblok-own-text))]", Icon: Gauge },
  note: { className: "bg-secondary text-secondary-foreground", Icon: Mountain },
};

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

function Flag({ flag }: { flag: CheatFlag }) {
  const { className, Icon } = TONE[flag.tone];
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", className)}>
        <Icon aria-hidden className="size-3" />
        {flag.label}
      </span>
      <span className="text-sm">{flag.tip}</span>
    </li>
  );
}

/** Kopvermogen op een schaal van 100 tot 150% van de gemiddelde FTP, met de doelband. */
function PullGauge({ share }: { share: number }) {
  const min = 1;
  const max = 1.5;
  const at = (v: number) => `${((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100}%`;
  const inBand = share >= PULL_TARGET.low && share <= PULL_TARGET.high;
  const off = share < PULL_LOW_SHARE || share > PULL_HIGH_SHARE;
  const target = `${pct(PULL_TARGET.low)}–${pct(PULL_TARGET.high)}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">Kopvermogen</span>
        <span className="text-lg font-semibold tabular-nums">
          {pct(share)}
          <span className="text-xs font-normal text-muted-foreground"> van gem. FTP</span>
        </span>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-muted" role="img" aria-label={`Kopvermogen ${pct(share)}, doel ${target}`}>
        <div
          className="absolute inset-y-0 rounded-full bg-emerald-500/35"
          style={{ left: at(PULL_TARGET.low), width: `calc(${at(PULL_TARGET.high)} - ${at(PULL_TARGET.low)})` }}
        />
        <div
          className={cn(
            "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
            inBand ? "bg-emerald-600 dark:bg-emerald-400" : off ? "bg-destructive" : "bg-foreground",
          )}
          style={{ left: at(share) }}
        />
      </div>
      <div className="relative mt-1 h-4 text-xs text-muted-foreground tabular-nums">
        <span className="absolute left-0">100%</span>
        <span className="absolute -translate-x-1/2" style={{ left: at((PULL_TARGET.low + PULL_TARGET.high) / 2) }}>
          doel {target}
        </span>
        <span className="absolute right-0">150%</span>
      </div>
    </div>
  );
}

function PlanCheck({ plan }: { plan: PlanComposition }) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <Heading>Dit plan</Heading>
        <span className="text-xs text-muted-foreground tabular-nums">gem. FTP {Math.round(plan.avgFtp)} W</span>
      </div>
      {plan.pullShare !== null && <PullGauge share={plan.pullShare} />}
      {plan.weak.length > 0 && (
        <ul className="space-y-1.5">
          {plan.weak.map((rider) => (
            <Flag
              key={rider.name}
              flag={{
                tone: rider.share <= DRAFT_ONLY_FTP_SHARE ? "warn" : "limit",
                label: `${rider.name} −${Math.round(100 * (1 - rider.share))}% FTP`,
                tip: rider.share <= DRAFT_ONLY_FTP_SHARE ? "Alleen in het wiel" : "Korte en weinig kopbeurten",
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Rider({ rider }: { rider: CheatsheetRider }) {
  return (
    <li className="border-t py-3">
      <p className="font-medium">{rider.name}</p>
      {rider.flags.length > 0 && (
        <ul className="mt-1.5 space-y-1.5">
          {rider.flags.map((flag) => (
            <Flag key={flag.label} flag={flag} />
          ))}
        </ul>
      )}
      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground tabular-nums">
        {rider.rides.map((ride) => (
          <li key={ride.startAt}>
            {dateLabel.format(new Date(ride.startAt))} · {ride.teamName ?? "team"}
            {ride.dropped && (
              <span className="font-medium text-destructive"> · gelost{typeof ride.dropped === "string" ? ` op ${ride.dropped}` : ""}</span>
            )}
            {ride.wkg !== null && (
              <>
                {" · "}
                <span className="font-semibold text-foreground">{wkg(ride.wkg)}</span> W/kg
              </>
            )}
            {ride.climbs.map((climb) => (
              <span key={climb.name}>
                {" · "}
                {climb.name} <span className="text-foreground">{wkg(climb.wkg)}</span>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Per stuk winst of verlies op de dichtstbijzijnde ploeg, als staafjes rond nul. */
function SectionBars({ race }: { race: CheatsheetRace }) {
  const max = Math.max(1000, ...race.sections.map((s) => Math.abs(s.deltaMs)));
  const columns = "grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_3.5rem] items-center gap-2 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3.75rem]";
  return (
    <div className="space-y-1 text-xs">
      <div className={cn(columns, "text-xs text-muted-foreground")}>
        <span />
        <span className="flex justify-between">
          <span>verlies</span>
          <span>winst</span>
        </span>
        <span />
      </div>
      <ul className="space-y-1">
        {race.sections.map((section, index) => (
          <li key={`${index}-${section.name}`} className={columns}>
            <span className="truncate text-muted-foreground first-letter:uppercase" title={section.name}>
              {section.name}
            </span>
            <span className="relative h-2">
              <span className="absolute -inset-y-0.5 left-1/2 w-px bg-border" />
              <span
                className={cn(
                  "absolute inset-y-0 rounded-sm",
                  section.deltaMs >= 0 ? "left-1/2 bg-emerald-500/70" : "right-1/2 bg-red-500/60",
                )}
                style={{ width: `${(Math.abs(section.deltaMs) / max) * 50}%` }}
              />
            </span>
            <span className="text-right tabular-nums">{signedSeconds(section.deltaMs)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Race({ race }: { race: CheatsheetRace }) {
  return (
    <article className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {race.rank !== null && (
          <span className="text-xl font-semibold tabular-nums">
            {race.rank}e<span className="text-sm font-normal text-muted-foreground">/{race.of}</span>
          </span>
        )}
        <span className="text-sm font-medium">
          {race.teamName ?? "Team"} · {dateLabel.format(new Date(race.startAt))}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">{raceTime(race.time)}</span>
        {race.rival && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              race.rival.deltaMs >= 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/15 text-red-700 dark:text-red-300",
            )}
          >
            {signedSeconds(race.rival.deltaMs)} op {race.rival.label}
          </span>
        )}
        {race.spreadMs !== null && (
          <span className="text-xs text-muted-foreground tabular-nums">4 snelsten binnen {signedSeconds(race.spreadMs).replace("+", "")}</span>
        )}
      </div>
      {race.sections.length > 0 && <SectionBars race={race} />}
      {race.tips.length > 0 && (
        <ul className="space-y-1">
          {race.tips.map((tip) => (
            <li key={tip} className="flex gap-2 text-sm">
              <ArrowRight aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
              {tip}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Sheet({ sheet }: { sheet: Cheatsheet }) {
  const empty = sheet.races.length === 0 && sheet.riders.length === 0;
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="divide-y">
        {sheet.plan && <PlanCheck plan={sheet.plan} />}
        {sheet.riders.length > 0 && (
          <div className="p-4">
            <Heading>Renners</Heading>
            <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
              {sheet.riders.map((rider) => (
                <Rider key={rider.zwiftId} rider={rider} />
              ))}
            </ul>
          </div>
        )}
        {sheet.races.length > 0 && (
          <div className="space-y-3 p-4">
            <Heading>Eerdere TTT&apos;s</Heading>
            {sheet.races.map((race) => (
              <Race key={race.eventId} race={race} />
            ))}
          </div>
        )}
        {empty && <p className="p-4 text-sm text-muted-foreground">Nog geen eerdere ploegentijdritten van dit team of deze renners.</p>}
      </div>
      <aside className="border-t bg-muted/40 p-4 lg:border-l lg:border-t-0">
        <Heading>Vuistregels</Heading>
        <dl className="mt-1 divide-y divide-dashed">
          {sheet.rules.map((rule) => (
            <div key={rule.value} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 py-2">
              <dt className="text-sm font-semibold tabular-nums">{rule.value}</dt>
              <dd className="text-sm text-muted-foreground">{rule.text}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}

async function LoadedSheet({ teamIds, riders }: { teamIds: string[]; riders: PlanRider[] }) {
  const records = await cachedTttRaces().catch(() => []);
  return <Sheet sheet={buildCheatsheet({ records, teamIds, riders })} />;
}

function Loading() {
  return (
    <div className="space-y-3 p-4" aria-label="Spiekbriefje laden">
      {["w-1/3", "w-2/3", "w-1/2", "w-3/5"].map((width) => (
        <div key={width} className={cn("h-3 rounded bg-muted motion-safe:animate-pulse", width)} />
      ))}
    </div>
  );
}

export function TttCheatsheet({ teamIds, riders }: { teamIds: string[]; riders: PlanRider[] }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <h2 className="flex items-center gap-2 border-b px-4 py-3 font-semibold">
        <NotebookPen aria-hidden className="size-5 text-primary" />
        Spiekbriefje
      </h2>
      <Suspense fallback={<Loading />}>
        <LoadedSheet teamIds={teamIds} riders={riders} />
      </Suspense>
    </section>
  );
}
