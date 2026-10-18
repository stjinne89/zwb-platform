import type { ReactNode } from "react";
import {
  cellsInScope,
  clubByDiscipline,
  clubByRegion,
  clubByRider,
  clubPreviousYear,
  clubRecords,
  clubSeries,
  clubTotals,
  clubYearLines,
  UNKNOWN_REGION,
  type ClubData,
  type ClubTotals,
} from "@/lib/stats/club";
import {
  bucketEnd,
  bucketLabel,
  bucketStart,
  bucketTitle,
  previousYearWindow,
  type Granularity,
} from "@/lib/stats/personal";
import { MIN_COMPARE_RIDES } from "@/lib/stats/compare";
import { clubTileDef, type ClubTileId } from "@/lib/stats/tiles";
import { VolumeChart, YearChart } from "../ik/_components/chart-tiles";
import { DisciplineBars, KpiGrid, NoData, Tile, nl, percentDelta } from "../ik/_components/tiles";
import type { ClubProfile } from "../_data";
import { TopRiders } from "./top-riders";

export type ClubTileContext = {
  data: ClubData;
  profiles: ClubProfile[];
  per: Granularity;
  today: string;
  span: { start: string; end: string };
  keys: string[];
  /** Eén gekozen periode, of null voor het hele bereik. */
  period: string | null;
  /** De eerste clubrit: een vergelijking met een jaar eerder heeft pas zin als dat venster erna valt. */
  firstDay: string | null;
  viewerId: string;
};

const round = (totals: ClubTotals) => ({
  km: Math.round(totals.km),
  hours: Math.round(totals.hours * 10) / 10,
  elevation: Math.round(totals.elevation),
  rides: totals.rides,
  members: totals.members,
});

export function ClubTile({ id, context }: { id: ClubTileId; context: ClubTileContext }): ReactNode {
  const def = clubTileDef(id);
  const { data, per, today, span, keys, period, profiles, viewerId } = context;
  const multiYear = keys.length > 0 && keys[0].slice(0, 4) !== keys.at(-1)!.slice(0, 4);
  const scopeLabel = period ? bucketTitle(period, per) : null;
  const cells = cellsInScope(data, per, span, period);

  switch (id) {
    case "totalen": {
      // Eén gekozen periode, of het hele bereik; vergeleken met dezelfde dagen
      // een jaar eerder.
      const start = period ? bucketStart(period, per) : span.start;
      const endRaw = period ? bucketEnd(period, per) : span.end;
      const end = endRaw > today ? today : endRaw;
      const before = previousYearWindow(start, end);
      const now = clubTotals(data, start, end, per);
      // Valt het venster van vorig jaar (deels) vóór de eerste rit, dan zegt het
      // verschil niets; dan geen pijltjes.
      const comparable = context.firstDay != null && before.start >= context.firstDay;
      const earlier = comparable ? clubTotals(data, before.start, before.end, per) : null;
      const then =
        earlier && earlier.rides >= MIN_COMPARE_RIDES ? earlier : { km: 0, hours: 0, elevation: 0, rides: 0, members: 0 };
      // Leden tellen per hele week of maand. Een lopende periode tot vandaag naast
      // de hele periode van vorig jaar valt dan altijd lager uit.
      const membersComparable = !(period && endRaw > today);
      // De club groeit; meer km kan ook betekenen dat er meer leden gekoppeld zijn.
      const perMember = (totals: ClubTotals) => (totals.members > 0 ? totals.km / totals.members : 0);
      return (
        <Tile
          title={scopeLabel ? `Totalen · ${scopeLabel}` : def.title}
          width={def.width}
          info={def.info}
          actions={<span className="text-xs text-muted-foreground">▲▼ t.o.v. vorig jaar</span>}
        >
          <KpiGrid
            items={[
              { label: "Kilometers", value: nl(now.km), delta: percentDelta(now.km, then.km) },
              { label: "Uren", value: nl(now.hours), delta: percentDelta(now.hours, then.hours) },
              { label: "Hoogtemeters", value: nl(now.elevation), delta: percentDelta(now.elevation, then.elevation) },
              { label: "Ritten", value: nl(now.rides), delta: percentDelta(now.rides, then.rides) },
              {
                label: "Actieve leden",
                value: nl(now.members),
                delta: membersComparable ? percentDelta(now.members, then.members) : null,
              },
              {
                label: "Km per lid",
                value: nl(perMember(now)),
                delta: membersComparable ? percentDelta(perMember(now), perMember(then)) : null,
              },
            ]}
          />
        </Tile>
      );
    }
    case "volume": {
      const series = clubSeries(data, keys, per);
      const previous = clubPreviousYear(data, keys, per, today);
      const openEnd = keys.length > 0 && bucketEnd(keys.at(-1)!, per) > today;
      const selected = period ? keys.indexOf(period) : -1;
      return (
        <Tile title={def.title} width={def.width} info={def.info}>
          <VolumeChart
            openEnd={openEnd}
            metrics={["km", "hours", "elevation", "rides", "members"]}
            selectedIndex={selected >= 0 ? selected : null}
            points={series.map((row, index) => ({
              label: bucketLabel(row.key, per, multiYear),
              title: bucketTitle(row.key, per),
              ...round(row),
              previous: previous[index] ? round(previous[index]!) : null,
            }))}
          />
        </Tile>
      );
    }
    case "jaarvergelijking": {
      const thisYear = Number(today.slice(0, 4));
      const firstYear = Math.max(Number(span.start.slice(0, 4)), thisYear - 4);
      const years = Array.from({ length: thisYear - firstYear + 1 }, (_, index) => String(firstYear + index));
      const lines = clubYearLines(data, years, today).filter((line) => line.total > 0);
      return (
        <Tile title={def.title} width={def.width} info={def.info}>
          {lines.length ? <YearChart lines={lines} /> : <NoData />}
        </Tile>
      );
    }
    case "top": {
      const names = new Map(profiles.map((profile) => [profile.id, profile.name]));
      const rows = clubByRider(cells).map((row) => ({
        id: row.id,
        name: names.get(row.id) ?? "Onbekend",
        km: Math.round(row.km),
        hours: Math.round(row.hours * 10) / 10,
        elevation: Math.round(row.elevation),
      }));
      return (
        <Tile title={scopeLabel ? `Top riders · ${scopeLabel}` : def.title} width={def.width} info={def.info}>
          <TopRiders rows={rows} viewerId={viewerId} />
        </Tile>
      );
    }
    case "discipline": {
      const rows = clubByDiscipline(cells).map((row) => ({
        sportType: row.id,
        km: row.km,
        hours: row.hours,
        elevation: row.elevation,
        rides: row.rides,
        kilojoules: 0,
        tss: 0,
      }));
      return (
        <Tile title={scopeLabel ? `Disciplines · ${scopeLabel}` : def.title} width={def.width} info={def.info}>
          {rows.length ? <DisciplineBars rows={rows} /> : <NoData />}
        </Tile>
      );
    }
    case "regio": {
      const regions = new Map(profiles.map((profile) => [profile.id, profile.region]));
      // Twaalf regio's, plus de leden zonder regio altijd als laatste rij.
      const all = clubByRegion(cells, (profileId) => regions.get(profileId) ?? null);
      const rows = [
        ...all.filter((row) => row.id !== UNKNOWN_REGION).slice(0, 12),
        ...all.filter((row) => row.id === UNKNOWN_REGION),
      ];
      return (
        <Tile title={scopeLabel ? `Regio's · ${scopeLabel}` : def.title} width={def.width} info={def.info}>
          {rows.length ? <RegionBars rows={rows} /> : <NoData />}
        </Tile>
      );
    }
    case "records":
      return (
        <Tile title={def.title} width={def.width} info={def.info}>
          <ul className="divide-y text-sm">
            {clubRecords(data).map((record) => (
              <li key={record.label} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">{record.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{bucketTitle(record.key, record.per)}</p>
                </div>
                <span className="st-kpi st-sm shrink-0">
                  {nl(record.value)} {record.unit}
                </span>
              </li>
            ))}
          </ul>
        </Tile>
      );
  }
}

function RegionBars({ rows }: { rows: Array<{ id: string; km: number; members: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.km));
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">{row.id}</span>
            <span className="shrink-0 tabular-nums">{nl(row.km)} km</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (row.km / max) * 100)}%`, background: "var(--st-main)" }}
            />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.members === 1 ? "1 lid" : `${nl(row.members)} leden`}
          </p>
        </li>
      ))}
    </ul>
  );
}

