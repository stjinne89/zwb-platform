// De eigen race in een individuele Zwift-race: FRR-etappe, andere race uit de
// kalender of een geplakte link. Tips bovenaan, de details eronder.

import Link from "next/link";
import { BackLink, EmptyState, SectionHeader } from "@/components/app-ui";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import type { PersonalRaceOutcome } from "@/lib/zrl-analysis/load";
import type { RaceKind } from "@/lib/zrl-analysis/personal";
import { raceClock, raceTime, signedSeconds, wkg } from "@/lib/zrl-analysis/format";
import { OwnRide, Stat, TipList, dateLabel } from "./race-parts";
import { ExpectationStats, RaceTrendView, SegmentDepth } from "./race-depth";

const KIND_LABEL: Record<RaceKind, string> = {
  race: "Race",
  tt: "Tijdrit",
  ttt: "Ploegentijdrit",
};

export function PersonalRaceView({ outcome }: { outcome: Exclude<PersonalRaceOutcome, { status: "not-found" }> }) {
  if (outcome.status === "not-riding") {
    return (
      <div className="space-y-4">
        <BackLink href="/zwbeter-worden/racen" label="Races" />
        <EmptyState>Je staat niet in de uitslag van deze race.</EmptyState>
      </div>
    );
  }
  if (outcome.status === "no-zwift-id") {
    return (
      <div className="space-y-4">
        <BackLink href="/zwbeter-worden/racen" label="Races" />
        <EmptyState action={<Link href="/profiel?weergave=bewerken" className="text-sm underline">Profiel</Link>}>
          Vul je Zwift-ID in op je profiel.
        </EmptyState>
      </div>
    );
  }
  if (outcome.status === "no-data") {
    return (
      <div className="space-y-4">
        <BackLink href="/zwbeter-worden/racen" label="Races" />
        <EmptyState>Voor deze race is er nog geen uitslag van Zwift.</EmptyState>
      </div>
    );
  }

  const { race, frr, tips, depth } = outcome;
  const rider = race.rider;
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <BackLink href="/zwbeter-worden/racen" label="Races" />
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{outcome.title}</h2>
            <p className="text-sm text-muted-foreground">
              {dateLabel.format(new Date(outcome.startAt))} · {KIND_LABEL[outcome.kind]} · groep {race.subgroupLabel}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {outcome.calendarEventId && (
              <Link href={`/events/${outcome.calendarEventId}`} className="underline">
                Event
              </Link>
            )}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <SectionHeader title="Tips voor jou" />
        {tips.length > 0 ? <TipList tips={tips} /> : <EmptyState>Geen opvallende punten in je race.</EmptyState>}
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={rider.rank ? `${rider.rank}e` : "—"} label={`van ${race.finishers} in groep ${race.subgroupLabel}`} accent={rider.rank === 1} />
        <Stat value={raceTime(rider.time)} label="tijd" />
        <Stat
          value={race.gapToWinner === null ? "—" : race.gapToWinner === 0 ? "winst" : signedSeconds(race.gapToWinner)}
          label="op de winnaar"
        />
        {frr?.gc ? (
          <Stat value={`${frr.gc.position}e`} label={`klassement ${frr.gc.genderClass} na etappe ${frr.gc.afterStage}`} />
        ) : (
          <Stat value={rider.wkg !== null ? `${wkg(rider.wkg)} W/kg` : "—"} label={rider.avgWatts ? `gemiddeld · ${rider.avgWatts} W` : "gemiddeld"} />
        )}
      </div>

      {(rider.expected || depth.segments.length > 0) && (
        <section className="space-y-3">
          <SectionHeader title="Jouw race tegenover de verwachting" />
          <ExpectationStats rider={rider} />
          <SegmentDepth depth={depth} />
        </section>
      )}

      {race.segmentLoss.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Segmenten" />
          <ResponsiveTable
            columns={[
              { key: "name", header: "Segment", cell: (s) => s.name, primary: true },
              { key: "time", header: "Tijd", cell: (s) => raceClock(s.elapsed), align: "right" },
              {
                key: "wkg",
                header: "W/kg",
                cell: (s) => wkg(rider.segments.find((x) => x.index === s.index)?.wkg ?? null),
                align: "right",
              },
              {
                key: "rank",
                header: "Plek",
                cell: (s) => {
                  const seg = rider.segments.find((x) => x.index === s.index);
                  return seg ? `${seg.rank}/${seg.of}` : "—";
                },
                align: "right",
              },
              { key: "loss", header: "Op de snelste", cell: (s) => (s.loss > 0 ? `+${raceClock(s.loss)}` : "snelste"), align: "right" },
            ]}
            rows={race.segmentLoss}
            rowKey={(s) => String(s.index)}
            rowClassName={(s) => (s.kind === "klim" ? "bg-muted/40" : undefined)}
          />
        </section>
      )}

      {frr && frr.peers.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title={`ZWB in etappe ${frr.stage}`} />
          <ResponsiveTable
            columns={[
              { key: "name", header: "Renner", cell: (p) => <span className={p.own ? "font-semibold" : undefined}>{p.name}</span>, primary: true },
              { key: "pen", header: "Groep", cell: (p) => p.pen ?? "—" },
              { key: "slot", header: "Slot", cell: (p) => p.slot },
              { key: "time", header: "Tijd", cell: (p) => raceTime(p.timeS * 1000), align: "right" },
            ]}
            rows={frr.peers}
            rowKey={(p) => `${p.zwiftId}-${p.slot}`}
            rowClassName={(p) => (p.own ? "bg-primary/5" : undefined)}
          />
        </section>
      ) : (
        race.peers.length > 1 && (
          <section className="space-y-3">
            <SectionHeader title="ZWB in deze race" />
            <ResponsiveTable
              columns={[
                { key: "name", header: "Renner", cell: (p) => <span className={p.own ? "font-semibold" : undefined}>{p.name}</span>, primary: true },
                { key: "group", header: "Groep", cell: (p) => p.subgroupLabel },
                { key: "rank", header: "Plek", cell: (p) => `${p.rank}/${p.of}`, align: "right" },
                { key: "time", header: "Tijd", cell: (p) => raceTime(p.time), align: "right" },
              ]}
              rows={race.peers}
              rowKey={(p) => String(p.zwiftId)}
              rowClassName={(p) => (p.own ? "bg-primary/5" : undefined)}
            />
          </section>
        )
      )}

      <RaceTrendView depth={depth} />

      <OwnRide ride={outcome.ride} />
    </div>
  );
}
