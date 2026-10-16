import type { ReactNode } from "react";
import { fetchIntervalsWellness } from "@/lib/intervals/client";
import type { FtpAt } from "@/lib/training/ftp-history";
import { toTrainingLoadPoints } from "@/lib/training/load-points";
import {
  aggregate,
  bucketLabel,
  bucketTitle,
  byDiscipline,
  calendarDays,
  efficiencyTrend,
  fitnessFromTss,
  periodRecords,
  powerTrend,
  previousYearWindow,
  rideRecords,
  streaks,
  totalsBetween,
  yearCumulative,
  type Granularity,
  type PersonalRide,
  type RangeKey,
} from "@/lib/stats/personal";
import { tileDef, type TileId } from "@/lib/stats/tiles";
import type { StatsConnection } from "../_data";
import { EfficiencyChart, FitnessChart, PowerChart, VolumeChart, YearChart } from "./chart-tiles";
import { CalendarHeatmap, DisciplineBars, NoData, RecordsList, RidesTable, TotalsGrid, Tile } from "./tiles";

export type TileContext = {
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
      return (
        <Tile title={def.title} width={def.width}>
          <TotalsGrid now={totalsBetween(rides, span.start, span.end)} before={totalsBetween(rides, before.start, before.end)} />
        </Tile>
      );
    }
    case "volume": {
      const rows = aggregate(inWindow, keys, per);
      return (
        <Tile title={def.title} width={def.width}>
          <VolumeChart
            points={rows.map((row, index) => ({
              label: labels[index],
              title: titles[index],
              km: Math.round(row.km),
              hours: Math.round(row.hours * 10) / 10,
              elevation: Math.round(row.elevation),
              tss: Math.round(row.tss),
              kilojoules: Math.round(row.kilojoules),
              rides: row.rides,
            }))}
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
    case "ritten":
      return (
        <Tile title={def.title} width={def.width}>
          <RidesTable rides={[...inWindow].reverse()} page={context.page} pageHref={context.pageHref} />
        </Tile>
      );
  }
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
    const days = Math.min(3650, Math.round((Date.parse(today) - Date.parse(span.start)) / 86_400_000) + 1);
    const wellness = await fetchIntervalsWellness(connection.api_key, connection.athlete_id, days).catch(() => null);
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
