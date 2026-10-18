// De drukvormen van het weekoverzicht: grafieken en tekeningen als vlakke
// inktpassen. Elke pas is een eigen <g> die met de rakel wordt ingedrukt; waar
// passen elkaar overlappen mengt de inkt (zie week-review.module.css).

import type {
  ClubSection,
  FormSection,
  FuelSection,
  PlanSection,
  PowerSection,
  RidesSection,
  TeamResult,
} from "@/lib/weekly-review/summary";
import s from "./week-review.module.css";

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const X = (i: number) => 26 + i * 50;
const pass = (n: 1 | 2 | 3, ghost = false) => [s.ink, n === 2 ? s.p2 : n === 3 ? s.p3 : "", ghost ? s.ghost : ""].join(" ");

const INK = { c: "var(--c)", g: "var(--g)", s: "var(--s)" } as const;

/** Een wielrenner op een racefiets: dunne velgen, beugelstuur, platte rug, helm. */
export function Rider({ x, y, scale, ink }: { x: number; y: number; scale: number; ink: keyof typeof INK }) {
  const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} style={{ color: INK[ink] }}>
      {[0, 60].map((cx) => (
        <g key={cx}>
          <path
            fillRule="evenodd"
            fill="currentColor"
            d={`M${cx - 16} 0a16 16 0 1 0 32 0a16 16 0 1 0 -32 0Zm2.6 0a13.4 13.4 0 1 0 26.8 0a13.4 13.4 0 1 0 -26.8 0Z`}
          />
          <circle cx={cx} cy={0} r={2.2} fill="currentColor" />
        </g>
      ))}
      <path {...line} strokeWidth={4.6} opacity={0.55} d="M36 -31 L21 1" />
      <path {...line} strokeWidth={6.5} opacity={0.55} d="M19 -33 L36 -31" />
      <path {...line} strokeWidth={2.4} d="M0 0 L24 3 M0 0 L20 -24 M24 3 L19 -27 M20 -24 L51 -25 M24 3 L53 -17 M51 -27 L53 -17 L60 0" />
      <path {...line} strokeWidth={2.4} d="M51 -27 L58 -28 C64 -28 65 -19 60 -17 L57 -18" />
      <path {...line} strokeWidth={3} d="M13 -29 L24 -29" />
      <path {...line} strokeWidth={7} d="M19 -33 L37 -22" />
      <path {...line} strokeWidth={5} d="M37 -22 L28 5" />
      <path {...line} strokeWidth={10} d="M18 -33 C 28 -40, 38 -43, 47 -41" />
      <path {...line} strokeWidth={4.4} d="M46 -41 L52 -31 L58 -28" />
      <circle cx={55} cy={-45} r={5.5} fill="currentColor" />
      <path fill="currentColor" d="M46 -47 C48 -55 60 -57 65 -50 L63 -47 C60 -45 53 -45 49 -45 Z" />
    </g>
  );
}

function Label({ x, y, children, soft, anchor = "start" }: { x: number; y: number; children: React.ReactNode; soft?: boolean; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={soft ? `${s.lbl} ${s.soft}` : s.lbl}>
      {children}
    </text>
  );
}

/** De stoet op het eerste scherm: één renner per rit, onder een gouden vlag. */
export function OpenerPrint({ riders }: { riders: number }) {
  // De eerste twee renners drukken altijd over de vlaggenstok en de zon heen,
  // zodat er bij elk aantal ritten inkt over inkt ligt.
  const spots = [
    [78, 160], [292, 166], [24, 250], [188, 148], [134, 238], [244, 254], [330, 246], [10, 168],
  ];
  const shown = spots.slice(0, Math.max(1, Math.min(spots.length, riders)));
  return (
    <svg viewBox="0 0 390 300" aria-hidden="true">
      <g className={pass(1)}>
        <path className={s.fg} d="M70 10 L70 290 L80 290 L80 92 L200 58 L80 22 Z" />
        <circle className={s.fs} cx={300} cy={120} r={70} />
        {/* De renners eerst in register in salie; de petrolpas erboven ligt er
            net naast, zodat aan elke rand een reepje salie blijft staan. */}
        {shown.map(([x, y]) => (
          <Rider key={`${x}-${y}`} x={x} y={y} scale={0.88} ink="s" />
        ))}
      </g>
      <g className={pass(2, true)}>
        {shown.map(([x, y]) => (
          <Rider key={`${x}-${y}`} x={x} y={y} scale={0.88} ink="c" />
        ))}
      </g>
    </svg>
  );
}

/** Kilometers per dag (petrol) met de tijd (goud) erover. */
export function RidesPrint({ rides }: { rides: RidesSection }) {
  const base = 350;
  const maxKm = Math.max(...rides.perDay.map((day) => day.km), 1);
  const maxMin = Math.max(...rides.perDay.map((day) => day.minutes), 1);
  const k = 290 / maxKm;
  const t = 270 / maxMin;
  return (
    <svg viewBox="0 0 390 410" aria-label={`Kilometers per dag, samen ${Math.round(rides.km)} km`}>
      <g className={pass(1)}>
        {rides.perDay.map((day, i) => (day.km > 0 ? <rect key={day.day} className={s.fc} x={X(i)} y={base - day.km * k} width={34} height={day.km * k} /> : null))}
      </g>
      <g className={pass(2)}>
        {rides.perDay.map((day, i) => (day.minutes > 0 ? <rect key={day.day} className={s.fg} x={X(i) + 8} y={base - day.minutes * t} width={34} height={day.minutes * t} /> : null))}
      </g>
      {rides.perDay.map((day, i) =>
        day.km > 0 ? (
          <text key={day.day} x={X(i) + 17} y={base - Math.max(day.km * k, day.minutes * t) - 10} textAnchor="middle" className={s.num}>
            {Math.round(day.km)}
          </text>
        ) : (
          <rect key={day.day} className={s.dashed} x={X(i)} y={base - 3} width={34} height={3} />
        ),
      )}
      <line className={s.axis} x1={18} x2={372} y1={base} y2={base} />
      {DAY_LABELS.map((label, i) => (
        <Label key={label} x={X(i) + 17} y={base + 22} anchor="middle">{label}</Label>
      ))}
      <rect className={s.fc} x={22} y={380} width={12} height={12} />
      <Label x={40} y={390} soft>km</Label>
      <rect className={s.fg} x={80} y={380} width={12} height={12} />
      <Label x={98} y={390} soft>tijd</Label>
    </svg>
  );
}

/** Gepland (salie) en gedaan (petrol) als twee passen; waar ze overlappen klopt het. */
export function PlanPrint({ plan }: { plan: PlanSection }) {
  const base = 330;
  const max = Math.max(...plan.perDay.map((day) => day.plannedMinutes), 1);
  const k = 270 / max;
  return (
    <svg viewBox="0 0 390 400" aria-label={`${plan.done} van ${plan.planned} trainingen gedaan`}>
      <g className={pass(1)}>
        {plan.perDay.map((day, i) => (day.plannedMinutes > 0 ? <rect key={day.day} className={s.fs} x={X(i)} y={base - day.plannedMinutes * k} width={38} height={day.plannedMinutes * k} /> : null))}
      </g>
      <g className={pass(2)}>
        {plan.perDay.map((day, i) =>
          day.doneMinutes > 0 ? <rect key={day.day} className={s.fc} x={X(i) + 5} y={base - day.doneMinutes * k + 5} width={38} height={Math.max(0, day.doneMinutes * k - 5)} /> : null,
        )}
      </g>
      {plan.perDay.map((day, i) =>
        day.status === "gemist" || day.status === "overgeslagen" ? (
          <Label key={day.day} x={X(i) + 19} y={base - day.plannedMinutes * k - 10} anchor="middle">{day.status}</Label>
        ) : null,
      )}
      {DAY_LABELS.map((label, i) => (
        <Label key={label} x={X(i) + 19} y={base + 22} anchor="middle">{label}</Label>
      ))}
      <rect className={s.fs} x={22} y={366} width={12} height={12} />
      <Label x={40} y={376} soft>gepland</Label>
      <rect className={s.fc} x={118} y={366} width={12} height={12} />
      <Label x={136} y={376} soft>gedaan</Label>
    </svg>
  );
}

/** Fitness (petrol) en vermoeidheid (goud) over zes weken. */
export function FormPrint({ form }: { form: FormSection }) {
  const weeks = form.weeks;
  const values = weeks.flatMap((week) => [week.ctl, week.atl ?? week.ctl]);
  const low = Math.min(...values) - 6;
  const high = Math.max(...values) + 4;
  const xs = (i: number) => 22 + (i * 346) / Math.max(1, weeks.length - 1);
  const y = (v: number) => 240 - ((v - low) / Math.max(1, high - low)) * 200;
  const area = (pick: (week: (typeof weeks)[number]) => number) =>
    `M22 240 ${weeks.map((week, i) => `L${xs(i)} ${y(pick(week))}`).join(" ")} L${xs(weeks.length - 1)} 240 Z`;
  const last = weeks[weeks.length - 1];
  const hasAtl = weeks.every((week) => week.atl != null);
  return (
    <svg viewBox="0 0 390 290" aria-label={`Fitness ${Math.round(form.ctlEnd)}`}>
      {hasAtl ? (
        <g className={pass(1)}>
          <path className={s.fg} d={area((week) => week.atl as number)} />
        </g>
      ) : null}
      <g className={pass(2)}>
        <path className={s.fc} d={area((week) => week.ctl)} />
      </g>
      {weeks.map((week, i) => (
        <Label key={week.weekEnd} x={xs(i)} y={262} soft={i < weeks.length - 1} anchor={i === 0 ? "start" : i === weeks.length - 1 ? "end" : "middle"}>
          {i === weeks.length - 1 ? "deze week" : `-${weeks.length - 1 - i}`}
        </Label>
      ))}
      <Label x={xs(weeks.length - 1) - 6} y={y(last.ctl) + 26} anchor="end">fitness {Math.round(last.ctl)}</Label>
      {hasAtl && last.atl != null ? (
        <Label x={xs(weeks.length - 1) - 6} y={y(last.atl) - 8} soft anchor="end">vermoeidheid {Math.round(last.atl)}</Label>
      ) : null}
    </svg>
  );
}

/** De piekwaarden van de week (goud) tegen het beste van het jaar (stippellijn). */
export function PowerPrint({ power }: { power: PowerSection }) {
  const points = power.points.filter((point) => point.week != null);
  const all = power.points.flatMap((point) => [point.week ?? 0, point.best ?? 0]).filter((v) => v > 0);
  const low = Math.min(...all) * 0.8;
  const high = Math.max(...all);
  const xs = (i: number) => 22 + (i * 346) / Math.max(1, power.points.length - 1);
  const y = (v: number) => 230 - ((v - low) / Math.max(1, high - low)) * 200;
  const weekPath = `M22 230 ${power.points.map((point, i) => (point.week != null ? `L${xs(i)} ${y(point.week)}` : "")).join(" ")} L${xs(power.points.length - 1)} 230 Z`;
  const best = power.points.map((point, i) => (point.best != null ? `${xs(i)} ${y(point.best)}` : null)).filter(Boolean);
  const recordIndex = power.record ? power.points.findIndex((point) => point.seconds === power.record?.seconds) : -1;
  return (
    <svg viewBox="0 0 390 280" aria-label="Piekvermogen van de week">
      <g className={pass(1)}>{points.length ? <path className={s.fg} d={weekPath} /> : null}</g>
      {best.length > 1 ? (
        <>
          <path d={`M${best.join(" L")}`} fill="none" stroke="var(--ink)" strokeWidth={1.6} strokeDasharray="5 4" />
          <Label x={30} y={(power.points[0].best != null ? y(power.points[0].best) : 40) + 4} soft>beste van het jaar</Label>
        </>
      ) : null}
      {power.points.map((point, i) => (
        <Label key={point.label} x={xs(i)} y={252} anchor={i === 0 ? "start" : i === power.points.length - 1 ? "end" : "middle"}>{point.label}</Label>
      ))}
      {recordIndex >= 0 && power.record ? (
        <g className={pass(3)}>
          <circle className={s.fc} cx={xs(recordIndex)} cy={y(power.record.watts)} r={9} />
          <Label x={xs(recordIndex) + (recordIndex > 2 ? -14 : 14)} y={y(power.record.watts) - 12} anchor={recordIndex > 2 ? "end" : "start"}>
            {power.record.watts} W · record
          </Label>
        </g>
      ) : null}
    </svg>
  );
}

/** De stand als blokken, het eigen team in goud. */
export function TeamPrint({ result }: { result: TeamResult }) {
  const count = Math.min(result.teams, 24);
  const width = 346 / count;
  const rankIndex = Math.min(result.rank, count) - 1;
  return (
    <svg viewBox="0 0 390 230" aria-label={`${result.team} ${result.rank}e van ${result.teams}`}>
      <g className={pass(1)}>
        {Array.from({ length: count }, (_, i) =>
          i === rankIndex ? null : <rect key={i} className={s.fs} x={22 + i * width} y={190 - (150 - (i * 120) / count)} width={width - 4} height={150 - (i * 120) / count} />,
        )}
      </g>
      <g className={pass(2)}>
        <rect className={s.fg} x={22 + rankIndex * width} y={190 - (150 - (rankIndex * 120) / count)} width={width - 4} height={150 - (rankIndex * 120) / count} />
      </g>
      <Label x={22 + rankIndex * width + (width - 4) / 2} y={190 - (150 - (rankIndex * 120) / count) - 10} anchor="middle">{result.team}</Label>
      <Label x={22 + (width - 4) / 2} y={212} anchor="middle">1</Label>
      <Label x={22 + (count - 1) * width + (width - 4) / 2} y={212} anchor="middle">{result.teams}</Label>
    </svg>
  );
}

/** Gelogde dagen als stippen, core als blokken. */
export function FuelPrint({ fuel }: { fuel: FuelSection }) {
  return (
    <svg viewBox="0 0 390 250" aria-hidden="true">
      {fuel.loggedDays ? (
        <>
          <g className={pass(1)}>
            {fuel.loggedDays.map((logged, i) => (logged ? <circle key={i} className={s.fs} cx={X(i) + 17} cy={60} r={18} /> : null))}
          </g>
          {fuel.loggedDays.map((logged, i) => (
            <g key={i}>
              {!logged ? <circle className={s.dashed} cx={X(i) + 17} cy={60} r={18} /> : null}
              <Label x={X(i) + 17} y={100} anchor="middle">{DAY_LABELS[i]}</Label>
            </g>
          ))}
        </>
      ) : null}
      {fuel.mobilitySessions > 0 ? (
        <>
          <g className={pass(2)}>
            {Array.from({ length: Math.min(7, fuel.mobilitySessions) }, (_, i) => (
              <rect key={i} className={s.fc} x={22 + i * 58} y={150} width={50} height={22} />
            ))}
          </g>
          <Label x={22} y={196}>
            {fuel.mobilitySessions}× core{fuel.mobilityMinutes ? ` · ${fuel.mobilityMinutes} min` : ""}
          </Label>
        </>
      ) : null}
    </svg>
  );
}

/** De clubrit als stoet tegen een heuvel. */
export function ClubPrint({ club }: { club: ClubSection }) {
  const riders = Math.min(11, club.clubRides[0]?.riders ?? 0);
  const spots = [[30, 236], [86, 222], [140, 214], [194, 196], [246, 170], [292, 142], [334, 118], [60, 160], [116, 150], [174, 130], [232, 104]];
  return (
    <svg viewBox="0 0 390 280" aria-hidden="true">
      <g className={pass(1)}>
        <path className={s.fs} d="M0 230 C 90 170, 180 210, 260 120 S 360 60, 390 50 L390 280 L0 280 Z" />
        {spots.slice(0, riders).map(([x, y], i) => (
          <Rider key={i} x={x} y={y} scale={0.5} ink="g" />
        ))}
      </g>
      <g className={pass(2, true)}>
        {spots.slice(0, riders).map(([x, y], i) => (
          <Rider key={i} x={x} y={y} scale={0.5} ink={i === 4 ? "g" : "c"} />
        ))}
      </g>
    </svg>
  );
}

export function CoachPrint() {
  return (
    <svg viewBox="0 0 390 200" aria-hidden="true" preserveAspectRatio="none">
      <g className={pass(1)}>
        <path className={s.fs} d="M0 120 C 80 60, 160 140, 250 80 S 360 40, 390 60 L390 200 L0 200Z" />
      </g>
      <g className={pass(2)}>
        <path className={s.fc} d="M0 160 C 100 120, 200 180, 300 130 S 370 120, 390 120 L390 200 L0 200Z" />
      </g>
    </svg>
  );
}
