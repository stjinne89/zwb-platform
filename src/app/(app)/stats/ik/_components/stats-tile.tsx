import Link from "next/link";
import type { ReactNode } from "react";
import { AchievementBadge } from "@/components/achievement-badge";
import { createClient } from "@/lib/supabase/server";
import type { FtpAt } from "@/lib/training/ftp-history";
import { toTrainingLoadPoints } from "@/lib/training/load-points";
import {
  aggregate,
  bucketEnd,
  bucketKey,
  bucketLabel,
  bucketsBetween,
  bucketStart,
  bucketTitle,
  byDiscipline,
  calendarDays,
  efficiencyTrend,
  fitnessFromTss,
  periodRecords,
  powerTrend,
  previousYearWindow,
  EMPTY_TOTALS,
  rideRecords,
  streaks,
  totalsBetween,
  yearCumulative,
  yearEarlier,
  type Granularity,
  type PersonalRide,
  type Totals,
  type RangeKey,
} from "@/lib/stats/personal";
import { tileDef, type TileId } from "@/lib/stats/tiles";
import {
  curveGranularity,
  curveRange,
  cpSeries,
  eftpSeries,
  peakSeries,
  type CompactPoint,
} from "@/lib/stats/curves";
import { recoverySeries } from "@/lib/stats/activity-stats";
import { loadActivityStatsOnce, loadMyBadges, loadPeriodCurvesOnce, loadStatsWellness, type StatsConnection } from "../_data";
import { EnduranceChart, RecoveryChart, WbalChart, ZonesChart } from "./activity-charts";
import {
  CpChart,
  EfficiencyChart,
  EftpChart,
  FitnessChart,
  PeakChart,
  PowerChart,
  VolumeChart,
  YearChart,
} from "./chart-tiles";
import { YearCurvesChart } from "./year-curves-chart";
import { CalendarHeatmap, dayLabel, DisciplineBars, NoData, nl, RecordsList, RidesTable, TotalsGrid, Tile } from "./tiles";

export type TileContext = {
  profileId: string;
  per: Granularity;
  range: RangeKey;
  today: string;
  span: { start: string; end: string };
  keys: string[];
  rides: PersonalRide[];
  inWindow: PersonalRide[];
  ftpAt: FtpAt;
  connection: StatsConnection | null;
  page: number;
  pageHref: (page: number) => string;
};

export function StatsTile({ id, context }: { id: TileId; context: TileContext }): ReactNode {
  const def = tileDef(id);
  const { per, keys, rides, inWindow, span, today } = context;
  const multiYear = keys.length > 0 && keys[0].slice(0, 4) !== keys.at(-1)!.slice(0, 4);
  const labels = keys.map((key) => bucketLabel(key, per, multiYear));
  const titles = keys.map((key) => bucketTitle(key, per));

  switch (id) {
    case "totalen": {
      const before = previousYearWindow(span.start, span.end);
      // Valt het venster van vorig jaar (deels) vóór je eerste rit, dan zegt het
      // verschil niets; dan geen pijltjes.
      const comparable = rides.length > 0 && before.start >= rides[0].day;
      return (
        <Tile title={def.title} width={def.width} actions={<span className="text-xs text-muted-foreground">▲▼ t.o.v. vorig jaar</span>}>
          <TotalsGrid
            now={totalsBetween(rides, span.start, span.end)}
            before={comparable ? totalsBetween(rides, before.start, before.end) : EMPTY_TOTALS}
          />
        </Tile>
      );
    }
    case "volume": {
      const rows = aggregate(inWindow, keys, per);
      const openEnd = keys.length > 0 && bucketEnd(keys.at(-1)!, per) > today;
      const round = (totals: Totals) => ({
        km: Math.round(totals.km),
        hours: Math.round(totals.hours * 10) / 10,
        elevation: Math.round(totals.elevation),
        tss: Math.round(totals.tss),
        kilojoules: Math.round(totals.kilojoules),
        rides: totals.rides,
      });
      // Dezelfde periode een jaar eerder. Voor de lopende periode tot dezelfde
      // dag, anders vergelijk je een halve maand met een hele.
      const previous = keys.map((key, index) => {
        const end = openEnd && index === keys.length - 1 ? today : bucketEnd(key, per);
        const totals = totalsBetween(rides, yearEarlier(bucketStart(key, per), per), yearEarlier(end, per));
        return totals.rides > 0 ? round(totals) : null;
      });
      return (
        <Tile title={def.title} width={def.width}>
          <VolumeChart
            openEnd={openEnd}
            points={rows.map((row, index) => ({
              label: labels[index],
              title: titles[index],
              ...round(row),
              previous: previous[index],
            }))}
            metrics={["km", "hours", "elevation", "tss", "kilojoules", "rides"]}
          />
        </Tile>
      );
    }
    case "vermogen": {
      const points = powerTrend(inWindow, keys, per, context.ftpAt, today);
      return (
        <Tile title={def.title} width={def.width}>
          {points.some((point) => point.rides > 0) ? (
            <PowerChart points={points.map((point, index) => ({ ...point, label: labels[index], title: titles[index] }))} />
          ) : (
            <NoData>Geen ritten met vermogensmeter in deze periode.</NoData>
          )}
        </Tile>
      );
    }
    case "efficientie": {
      const points = efficiencyTrend(inWindow, keys, per);
      return (
        <Tile title={def.title} width={def.width}>
          {points.some((point) => point.rides > 0) ? (
            <EfficiencyChart points={points.map((point, index) => ({ ...point, label: labels[index], title: titles[index] }))} />
          ) : (
            <NoData>Geen ritten met vermogen en hartslag in deze periode.</NoData>
          )}
        </Tile>
      );
    }
    case "fitheid":
      return <FitnessTile context={context} />;
    case "jaarvergelijking": {
      const firstYear = Math.max(Number(span.start.slice(0, 4)), Number(today.slice(0, 4)) - 4);
      const years = Array.from({ length: Number(today.slice(0, 4)) - firstYear + 1 }, (_, index) => String(firstYear + index));
      const lines = yearCumulative(rides, years, today).filter((line) => line.total > 0);
      return (
        <Tile title={def.title} width={def.width}>
          {lines.length ? <YearChart lines={lines} /> : <NoData />}
        </Tile>
      );
    }
    case "kalender":
      return (
        <Tile title={def.title} width={def.width}>
          <CalendarHeatmap days={calendarDays(rides, today)} streaks={streaks(rides, today)} />
        </Tile>
      );
    case "discipline": {
      const rows = byDiscipline(inWindow);
      return (
        <Tile title={def.title} width={def.width}>
          {rows.length ? <DisciplineBars rows={rows} /> : <NoData />}
        </Tile>
      );
    }
    case "records":
      return (
        <Tile title={def.title} width={def.width}>
          <RecordsList rides={rideRecords(rides)} periods={periodRecords(rides)} />
        </Tile>
      );
    case "badges":
      return <BadgesTile context={context} />;
    case "piekvermogen":
    case "cp-wprime":
    case "curve-per-jaar":
      return <CurveTile id={id} context={context} />;
    case "eftp-gewicht":
      return <EftpTile context={context} />;
    case "zones-vermogen":
    case "zones-hartslag":
    case "wbal":
    case "duurvermogen":
      return <ActivityTile id={id} context={context} />;
    case "herstel":
      return <RecoveryTile context={context} />;
    case "ritten":
      return (
        <Tile title={def.title} width={def.width}>
          <RidesTable rides={[...inWindow].reverse()} page={context.page} pageHref={context.pageHref} />
        </Tile>
      );
  }
}

/**
 * Wat er is behaald, met de nieuwste badges erbij. Los van het gekozen venster:
 * een badge hoort bij het lid, niet bij een periode op deze pagina.
 */
async function BadgesTile({ context }: { context: TileContext }) {
  const def = tileDef("badges");
  const supabase = await createClient();
  const awards = await loadMyBadges(supabase, context.profileId);
  const milestones = awards.filter((award) => award.award_scope === "milestone").length;
  const recent = awards.filter((award) => award.achievement_badges).slice(0, 6);
  return (
    <Tile
      title={def.title}
      width={def.width}
      actions={
        <Link href="/profiel?weergave=bewerken#badges" className="text-xs font-medium text-primary hover:underline">
          Badge-kast
        </Link>
      }
    >
      {awards.length === 0 ? (
        <NoData>Nog geen badges.</NoData>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">Mijlpalen</dt>
              <dd className="text-2xl font-semibold tabular-nums">{nl(milestones)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Weekbadges</dt>
              <dd className="text-2xl font-semibold tabular-nums">{nl(awards.length - milestones)}</dd>
            </div>
          </dl>
          <ul className="mt-4 divide-y">
            {recent.map((award) => {
              const badge = award.achievement_badges!;
              return (
                <li key={award.id} className="flex items-center gap-3 py-2">
                  <AchievementBadge title={badge.title} icon={badge.icon} color={badge.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{badge.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {dayLabel(award.period_start)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Tile>
  );
}

/**
 * Met intervals.icu de CTL, ATL en vorm die intervals zelf rekent (ook over
 * ritten zonder vermogen, op hartslag). Zonder koppeling, of als intervals niet
 * antwoordt, uit de eigen TSS.
 */
async function FitnessTile({ context }: { context: TileContext }) {
  const def = tileDef("fitheid");
  const { span, today, rides, connection } = context;
  let points = null;
  if (connection) {
    const wellness = await loadStatsWellness(connection.api_key, connection.athlete_id, daysSince(span.start, today));
    const fromIntervals = wellness
      ? toTrainingLoadPoints(wellness).filter((point) => point.date >= span.start && point.ctl != null)
      : [];
    if (fromIntervals.length > 1) points = fromIntervals;
  }
  points ??= fitnessFromTss(rides, span.start, today);
  return (
    <Tile title={def.title} width={def.width}>
      {points.length > 1 ? <FitnessChart points={points} /> : <NoData>Geen TSS in deze periode.</NoData>}
    </Tile>
  );
}

function daysSince(start: string, today: string) {
  return Math.round((Date.parse(today) - Date.parse(start)) / 86_400_000) + 1;
}

function IntervalsDown() {
  return <NoData>intervals.icu gaf nu geen antwoord. Probeer het later nog eens.</NoData>;
}

/**
 * Tegels uit de powercurves per periode. Per week zijn dat te veel vragen en te
 * weinig ritten per curve, dus dan per maand.
 */
async function CurveTile({ id, context }: { id: "piekvermogen" | "cp-wprime" | "curve-per-jaar"; context: TileContext }) {
  const def = tileDef(id);
  const { span, today, profileId } = context;
  const per = id === "curve-per-jaar" ? "jaar" : curveGranularity(context.per);
  let keys = bucketsBetween(span.start, span.end, per);
  // Vijf jaar naast elkaar is het maximum dat in kleuren uit elkaar te houden is.
  if (id === "curve-per-jaar") keys = keys.slice(-5);
  const ranges = keys.map((key) => curveRange(key, per, today));
  const byRange = await loadPeriodCurvesOnce(profileId, ranges.join(",")).catch(() => null);
  if (!byRange) {
    return (
      <Tile title={def.title} width={def.width}>
        <IntervalsDown />
      </Tile>
    );
  }
  const curves: Record<string, CompactPoint[] | undefined> = Object.fromEntries(
    keys.map((key, index) => [key, byRange[ranges[index]]]),
  );
  const multiYear = keys.length > 0 && keys[0].slice(0, 4) !== keys.at(-1)!.slice(0, 4);
  const labels = keys.map((key) => bucketLabel(key, per, multiYear));
  const titles = keys.map((key) => bucketTitle(key, per));

  if (id === "curve-per-jaar") {
    const years = keys.flatMap((key) => (curves[key]?.length ? [{ year: key, points: curves[key]! }] : []));
    return (
      <Tile title={def.title} width={def.width}>
        {years.length ? <YearCurvesChart curves={years} /> : <NoData>Geen vermogensdata in deze periode.</NoData>}
      </Tile>
    );
  }
  if (id === "cp-wprime") {
    const points = cpSeries(keys, curves);
    return (
      <Tile title={def.title} width={def.width}>
        {points.some((point) => point.cpWatts != null) ? (
          <CpChart points={points.map((point, index) => ({ ...point, label: labels[index], title: titles[index] }))} />
        ) : (
          <NoData>Te weinig inspanningen tussen 2 en 20 minuten om CP en W′ te bepalen.</NoData>
        )}
      </Tile>
    );
  }
  const points = peakSeries(keys, curves);
  return (
    <Tile title={def.title} width={def.width}>
      {points.some((point) => point.watts.some((value) => value != null)) ? (
        <PeakChart points={points.map((point, index) => ({ ...point, label: labels[index], title: titles[index] }))} />
      ) : (
        <NoData>Geen vermogensdata in deze periode.</NoData>
      )}
    </Tile>
  );
}

/** eFTP en gewicht uit de wellness van intervals.icu. */
async function EftpTile({ context }: { context: TileContext }) {
  const def = tileDef("eftp-gewicht");
  const { span, today, connection, per, keys } = context;
  if (!connection) return null;
  const wellness = await loadStatsWellness(connection.api_key, connection.athlete_id, daysSince(span.start, today));
  if (!wellness) {
    return (
      <Tile title={def.title} width={def.width}>
        <IntervalsDown />
      </Tile>
    );
  }
  const multiYear = keys.length > 0 && keys[0].slice(0, 4) !== keys.at(-1)!.slice(0, 4);
  const points = eftpSeries(keys, wellness, (day) => bucketKey(day, per));
  return (
    <Tile title={def.title} width={def.width}>
      {points.some((point) => point.eftp != null || point.weightKg != null) ? (
        <EftpChart
          points={points.map((point) => ({
            ...point,
            label: bucketLabel(point.key, per, multiYear),
            title: bucketTitle(point.key, per),
          }))}
        />
      ) : (
        <NoData>Geen eFTP of gewicht in intervals.icu in deze periode.</NoData>
      )}
    </Tile>
  );
}

function ridesNote(rides: number) {
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {rides === 1 ? "1 rit" : `${rides.toLocaleString("nl-NL")} ritten`} met meting in intervals.icu
    </p>
  );
}

/**
 * Tegels uit de intervals-activiteiten zelf. Alleen ritten die rechtstreeks in
 * intervals staan hebben deze velden; de tegel zegt hoeveel ritten meetellen.
 */
async function ActivityTile({
  id,
  context,
}: {
  id: "zones-vermogen" | "zones-hartslag" | "wbal" | "duurvermogen";
  context: TileContext;
}) {
  const def = tileDef(id);
  const { span, profileId } = context;
  const per = curveGranularity(context.per);
  const stats = await loadActivityStatsOnce(profileId, bucketStart(bucketKey(span.start, per), per), span.end, per).catch(
    () => null,
  );
  if (!stats) {
    return (
      <Tile title={def.title} width={def.width}>
        <IntervalsDown />
      </Tile>
    );
  }
  const multiYear =
    stats.periods.length > 0 && stats.periods[0].key.slice(0, 4) !== stats.periods.at(-1)!.key.slice(0, 4);
  const label = (key: string) => bucketLabel(key, per, multiYear);
  const title = (key: string) => bucketTitle(key, per);
  const empty = <NoData>Geen ritten met meting in intervals.icu in deze periode.</NoData>;

  if (id === "zones-vermogen" || id === "zones-hartslag") {
    const power = id === "zones-vermogen";
    const zoneIds = power
      ? stats.powerZoneIds
      : Array.from({ length: stats.hrZoneCount }, (_, index) => `Z${index + 1}`);
    const points = stats.periods.map((period) => ({
      label: label(period.key),
      title: title(period.key),
      hours: power ? period.powerZoneHours : period.hrZoneHours,
    }));
    const any = points.some((point) => point.hours.some((value) => value > 0));
    return (
      <Tile title={def.title} width={def.width}>
        {any ? (
          <>
            <ZonesChart points={points} zoneIds={zoneIds} ariaLabel={def.title} />
            {ridesNote(stats.rides)}
          </>
        ) : (
          empty
        )}
      </Tile>
    );
  }
  if (id === "wbal") {
    const points = stats.periods.map((period) => ({
      label: label(period.key),
      title: title(period.key),
      maxWbalDepletionKj: period.maxWbalDepletionKj,
      joulesAboveFtpKj: period.joulesAboveFtpKj,
    }));
    const any = points.some((point) => point.maxWbalDepletionKj != null || point.joulesAboveFtpKj > 0);
    return (
      <Tile title={def.title} width={def.width}>
        {any ? (
          <>
            <WbalChart points={points} />
            {ridesNote(stats.rides)}
          </>
        ) : (
          empty
        )}
      </Tile>
    );
  }
  const points = stats.periods.map((period) => ({
    label: label(period.key),
    title: title(period.key),
    decoupling: period.decoupling,
    efficiencyFactor: period.efficiencyFactor,
  }));
  const any = points.some((point) => point.decoupling != null || point.efficiencyFactor != null);
  return (
    <Tile title={def.title} width={def.width}>
      {any ? (
        <>
          <EnduranceChart points={points} />
          {ridesNote(stats.rides)}
        </>
      ) : (
        empty
      )}
    </Tile>
  );
}

/** Rust-HR, HRV en slaap; alleen met de herstel-opt-in, net als op ZWBeter Worden. */
async function RecoveryTile({ context }: { context: TileContext }) {
  const def = tileDef("herstel");
  const { span, today, connection, per, keys } = context;
  if (!connection?.wellness_opt_in) return null;
  const wellness = await loadStatsWellness(connection.api_key, connection.athlete_id, daysSince(span.start, today));
  if (!wellness) {
    return (
      <Tile title={def.title} width={def.width}>
        <IntervalsDown />
      </Tile>
    );
  }
  const multiYear = keys.length > 0 && keys[0].slice(0, 4) !== keys.at(-1)!.slice(0, 4);
  const points = recoverySeries(keys, wellness, (day) => bucketKey(day, per));
  return (
    <Tile title={def.title} width={def.width}>
      {points.some((point) => point.restingHr != null || point.hrv != null || point.sleepHours != null) ? (
        <RecoveryChart
          points={points.map((point) => ({
            ...point,
            label: bucketLabel(point.key, per, multiYear),
            title: bucketTitle(point.key, per),
          }))}
        />
      ) : (
        <NoData>Geen rust-HR, HRV of slaap in intervals.icu in deze periode.</NoData>
      )}
    </Tile>
  );
}
