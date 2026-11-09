// De blokken onder "Jouw rit": waar de race beslist werd, model en FTP, de
// W′-rekening, versnellingen, hart, cadans, vorm, brandstof, durability en de
// klimmen tegenover eerdere keren. Elk blok alleen als de data er is; moeilijke
// begrippen met uitleg erachter (Term).

import type { ReactNode } from "react";
import type { RideAnalysis } from "@/lib/zrl-analysis/ride";
import type { ClimbHistory, RideContext } from "@/lib/zrl-analysis/ride-context";
import { PRE_RIDE_CARBS_G_PER_KG } from "@/lib/nutrition/targets";
import { decimal, durationLabel, raceClock, wkg } from "@/lib/zrl-analysis/format";
import { Term } from "./term";

const shortDate = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });
const nl1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

/** Getal met teken: +3, −12. */
function signed(value: number, unit = "") {
  return `${value > 0 ? "+" : value < 0 ? "−" : "±"}${nl1.format(Math.abs(value))}${unit}`;
}

function places(first: number, last: number) {
  return first === last ? `plek ${first}` : `plek ${first}–${last}`;
}

function Block({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-2 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="pt-1 text-sm text-muted-foreground">{children}</p>;
}

/** Het diepste W′-punt en het stuk waar het viel (tot een minuut na de top hoort bij de klim). */
function deepest(ride: RideAnalysis) {
  const dip = ride.wbal?.dips.reduce<NonNullable<RideAnalysis["wbal"]>["dips"][number] | null>((low, d) => (!low || d.low < low.low ? d : low), null) ?? null;
  const phase = dip ? ride.phases.find((p) => dip.at >= p.from && dip.at <= p.to + 60 && p.climb) ?? ride.phases.find((p) => dip.at >= p.from && dip.at <= p.to) : undefined;
  return { dip, phase };
}

export function DecisiveBlock({ ride, context }: { ride: RideAnalysis; context: RideContext }) {
  const finish = context.finish;
  if (!finish || finish.own.firstRank === 1) return null;
  const { dip, phase } = deepest(ride);
  const hardest = [...ride.phases].filter((p) => p.climb).sort((a, b) => b.np - a.np)[0];
  const { lead, own, ahead } = finish;
  return (
    <Block title="Waar de race beslist werd">
      <Row label="Kopgroep">
        {lead.size} {lead.size === 1 ? "renner" : "renners"}, {places(lead.firstRank, lead.lastRank)}
      </Row>
      {ahead && ahead !== lead && (
        <Row label="Groep voor je">
          {places(ahead.firstRank, ahead.lastRank)}, {own.behindWinner - ahead.behindWinner} s eerder
        </Row>
      )}
      <Row label="Jouw groep">
        {own.size === 1 ? "alleen" : `${own.size} renners`}, {places(own.firstRank, own.lastRank)}, {own.behindWinner} s na de winnaar
      </Row>
      {hardest && (
        <Row label="Zwaarste klim">
          {hardest.name} ({raceClock(hardest.from)}) · {hardest.np} W <Term id="np" />
          {hardest.wkg !== null ? ` · ${wkg(hardest.wkg)} W/kg` : ""}
        </Row>
      )}
      {dip && (
        <Row label={<>Diepste <Term id="wbal" /></>}>
          {dip.low}% op {raceClock(dip.at)}
          {phase ? ` (${phase.name})` : ""}
        </Row>
      )}
      {dip && phase && <Note>Waarschijnlijk ging de groep voor je op {phase.name} weg.</Note>}
    </Block>
  );
}

export function ModelBlock({ ride, context }: { ride: RideAnalysis; context: RideContext }) {
  const { profile, used, after, delta } = context.ftp;
  const cp = ride.cp;
  if (!profile && !used && !cp) return null;
  const misfit = cp && ride.wbalMin && ride.wbalMin.share < -25;
  return (
    <Block title={<>Model en <Term id="ftp" /></>}>
      {profile && <Row label="FTP in je profiel">{profile} W</Row>}
      {used && <Row label="FTP van intervals.icu">{used} W</Row>}
      {after && (
        <Row label="Na deze race">
          {after} W{delta ? ` (${signed(delta)})` : ""}
        </Row>
      )}
      {cp && (
        <Row label={<><Term id="model">W′-model</Term></>}>
          <Term id="cp" /> {cp.cp} W · <Term id="wbal" /> {decimal(cp.wPrime / 1000, 1)} kJ
        </Row>
      )}
      {cp && <Row label="Bron">{cp.source === "intervals" ? "intervals.icu, na deze rit" : "je 90-dagencurve"}</Row>}
      {ride.curveModel && ride.curveModel.wbalMin < -25 && (
        <Note>
          Met het model uit je 90-dagencurve (CP {ride.curveModel.cp} W) zakte je W′ tot {ride.curveModel.wbalMin}%. Dat kan niet: dat model past niet bij deze race.
        </Note>
      )}
      {misfit && <Note>Je W′ zakt onder −25%: het model past niet goed bij deze race.</Note>}
    </Block>
  );
}

export function WbalBlock({ ride }: { ride: RideAnalysis }) {
  const w = ride.wbal;
  if (!w) return null;
  const finale = ride.efforts?.list.filter((e) => e.from + e.seconds >= ride.series[ride.series.length - 1].t - 15).at(-1);
  return (
    <Block title={<><Term id="wbal">W′</Term>-rekening</>}>
      <Row label="Onder 25%">{raceClock(w.below25)}</Row>
      {w.below0 > 0 && <Row label="Onder nul">{raceClock(w.below0)}</Row>}
      {w.dips.map((d) => (
        <Row key={d.at} label={`Dip op ${raceClock(d.at)}`}>
          {d.low}% na een minuut op {d.minuteBefore} W
          {d.recovery !== null ? ` · terug op 50% na ${raceClock(d.recovery)}` : " · niet meer terug op 50%"}
        </Row>
      ))}
      {w.finale && <Row label="5 min voor de finish">{w.finale.share}%</Row>}
      {finale && (
        <Row label="Eindsprint">
          {finale.seconds} s op {finale.watts} W
        </Row>
      )}
      {w.atFinish !== null && <Row label="Aan de finish">{w.atFinish}%</Row>}
    </Block>
  );
}

export function EffortsBlock({ ride }: { ride: RideAnalysis }) {
  const e = ride.efforts;
  if (!e) return null;
  return (
    <Block title="Versnellingen en verloop">
      <Row label={`Versnellingen boven ${e.threshold} W`}>{e.list.length}</Row>
      {e.list.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 py-1">
          {e.list.map((x) => (
            <li key={x.from} className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs tabular-nums">
              {raceClock(x.from)} · {x.seconds} s · {x.watts} W
            </li>
          ))}
        </ul>
      )}
      <Row label={<>Boven je <Term id="ftp" /></>}>{raceClock(e.aboveFtp)}</Row>
      <Row label={<Term id="vi">Variabiliteit (VI)</Term>}>{decimal(ride.variability)}</Row>
      <Row label="Niet getrapt">{raceClock(e.coasting)}</Row>
      {ride.halves && (
        <Row label="Eerste en tweede helft">
          {ride.halves.first} W → {ride.halves.second} W
        </Row>
      )}
      {ride.halves && ride.climbing && (
        <Row label="Klimmen per helft">
          {ride.climbing.first} m → {ride.climbing.second} m
        </Row>
      )}
    </Block>
  );
}

export function HeartBlock({ ride, context }: { ride: RideAnalysis; context: RideContext }) {
  const { decoupling, recovery, lthr } = context.heart;
  const { wPerBeat, aboveLthr } = ride.heart;
  if (decoupling === null && !recovery && !wPerBeat && aboveLthr === null) return null;
  return (
    <Block title="Hart">
      {decoupling !== null && <Row label={<Term id="decoupling">Decoupling</Term>}>{nl1.format(decoupling)}%</Row>}
      {wPerBeat && (
        <Row label="Watt per slag, per helft">
          {decimal(wPerBeat.first)} → {decimal(wPerBeat.second)}
        </Row>
      )}
      {recovery && (
        <Row label={<Term id="hrr">Hartslagherstel</Term>}>
          {recovery.drop} slagen in 1 min ({recovery.start} → {recovery.end})
        </Row>
      )}
      {aboveLthr !== null && lthr && (
        <Row label={<>Boven je <Term id="lthr" /> ({lthr})</>}>{raceClock(aboveLthr)}</Row>
      )}
      {ride.avgHeartRate && (
        <Row label="Gemiddeld en hoogste">
          {ride.avgHeartRate} / {ride.maxHeartRate}
        </Row>
      )}
    </Block>
  );
}

export function CadenceBlock({ ride }: { ride: RideAnalysis }) {
  const c = ride.cadenceStats;
  if (!ride.cadence && c.maxTorque === null) return null;
  return (
    <Block title={<>Cadans en <Term id="torque" /></>}>
      {ride.cadence && <Row label="Gemiddelde cadans">{ride.cadence} rpm</Row>}
      {c.aboveFtp !== null && (
        <Row label={<>Boven je <Term id="ftp" /></>}>{c.aboveFtp} rpm</Row>
      )}
      {c.grinding !== null && <Row label="Onder 70 rpm, boven 120% FTP">{raceClock(c.grinding)}</Row>}
      {c.maxTorque !== null && <Row label="Hoogste koppel">{c.maxTorque} Nm</Row>}
      {ride.cadenceAboveFtp.length > 0 && (
        <Row label="Tijd boven FTP per cadans">
          {ride.cadenceAboveFtp.map((x) => `${x.from}-${x.from + 9}: ${raceClock(x.seconds)}`).join(" · ")}
        </Row>
      )}
    </Block>
  );
}

export function FormBlock({ context }: { context: RideContext }) {
  const f = context.form;
  const planned = context.planned;
  if (!f && !planned) return null;
  const usual = (value: number | null, usualValue: number | null, unit = "") =>
    value === null ? null : `${Math.round(value)}${unit}${usualValue ? ` (gewoonlijk ${usualValue}${unit})` : ""}`;
  return (
    <Block title={<><Term id="form">Vorm</Term> en planning</>}>
      {f?.tsb != null && (
        <Row label={<Term id="form">Vorm</Term>}>
          {signed(f.tsb)} (fitheid {f.ctl}, vermoeidheid {f.atl})
        </Row>
      )}
      {f?.hrv != null && <Row label={<Term id="hrv" />}>{usual(f.hrv, f.usualHrv)}</Row>}
      {f?.restingHr != null && <Row label="Rusthartslag">{usual(f.restingHr, f.usualRestingHr)}</Row>}
      {f?.sleepHours != null && <Row label="Slaap">{nl1.format(f.sleepHours)} u</Row>}
      {planned && (
        <Row label="In je schema">
          {planned.name}
          {planned.compliance !== null && (
            <>
              {" "}
              · {planned.compliance}% <Term id="compliance" />
            </>
          )}
        </Row>
      )}
    </Block>
  );
}

export function FuelBlock({ ride, context }: { ride: RideAnalysis; context: RideContext }) {
  const f = context.fuel;
  const preRide = ride.weightKg ? Math.round(PRE_RIDE_CARBS_G_PER_KG * ride.weightKg) : null;
  return (
    <Block title="Brandstof">
      <Row label={<>In de race</>}>
        {f.kjRace} <Term id="kj" />
      </Row>
      {f.kjRide !== null && f.kjRide > f.kjRace && (
        <Row label="Hele rit, met opwarmen">
          {f.kjRide} <Term id="kj" />
        </Row>
      )}
      {f.carbsUsed !== null && <Row label="Koolhydraten verbruikt">ongeveer {f.carbsUsed} g</Row>}
      <Note>
        {f.perHour
          ? `Voor een race van ${f.minutes} min: ${f.perHour.min} tot ${f.perHour.max} g koolhydraten per uur onderweg.`
          : `Onder een uur heb je onderweg niets nodig${preRide ? `; eet in de uren ervoor zo'n ${preRide} g koolhydraten` : ""}.`}
      </Note>
    </Block>
  );
}

export function DurabilityBlock({ ride }: { ride: RideAnalysis }) {
  if (ride.durability.length === 0) return null;
  return (
    <Block title={<Term id="durability">Durability</Term>}>
      {ride.durability.map((row) =>
        row.best.map((b) => (
          <Row key={`${row.afterKj}-${b.seconds}`} label={`${durationLabel(b.seconds)} na ${row.afterKj} kJ`}>
            {b.watts} W
            {b.fatigued ? ` · vermoeid best ${b.fatigued} W` : ""}
            {b.fresh ? ` · fris ${b.fresh} W` : ""}
          </Row>
        )),
      )}
    </Block>
  );
}

export function ClimbHistoryBlock({ ride, climbs }: { ride: RideAnalysis; climbs: ClimbHistory[] }) {
  if (climbs.length === 0) return null;
  return (
    <Block title="Klimmen tegenover eerdere keren">
      {climbs.map((c) => {
        const today = ride.phases.find((p) => p.name === c.name);
        return (
          <div key={c.name} className="space-y-0.5 border-t pt-1.5 first:border-t-0 first:pt-0">
            <Row label={c.name}>
              {today ? `${raceClock(today.to - today.from)}${today.wkg !== null ? ` · ${wkg(today.wkg)} W/kg` : ""}` : "—"}
            </Row>
            {c.last && (
              <Row label={`Vorige keer (${shortDate.format(new Date(c.last.racedAt))})`}>
                {raceClock(c.last.seconds)}
                {c.last.wkg !== null ? ` · ${wkg(c.last.wkg)} W/kg` : ""}
              </Row>
            )}
            {c.best && c.times > 1 && (
              <Row label={`Snelste van ${c.times}`}>
                {raceClock(c.best.seconds)}
                {c.best.wkg !== null ? ` · ${wkg(c.best.wkg)} W/kg` : ""}
              </Row>
            )}
          </div>
        );
      })}
    </Block>
  );
}

export function RideBlocks({ ride, context, climbs }: { ride: RideAnalysis; context: RideContext; climbs: ClimbHistory[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DecisiveBlock ride={ride} context={context} />
      <WbalBlock ride={ride} />
      <ModelBlock ride={ride} context={context} />
      <EffortsBlock ride={ride} />
      <ClimbHistoryBlock ride={ride} climbs={climbs} />
      <HeartBlock ride={ride} context={context} />
      <CadenceBlock ride={ride} />
      <FormBlock context={context} />
      <FuelBlock ride={ride} context={context} />
      <DurabilityBlock ride={ride} />
    </div>
  );
}
