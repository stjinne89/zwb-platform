// Spiekbriefje in de TTT Planner: een handgeschreven briefje met vuistregels, een
// check van het plan, en de lessen uit eerdere ploegentijdritten van het team en
// de renners. Alleen voor wie het plan beheert (captain, co-captain of
// rosterbeheer): het toont vermogen per renner uit de races.
//
// Het briefje is papier, ook in het donkere thema (dan iets gedimd): de kleuren
// hieronder zijn inkt op papier, geen thema-tokens.

import { Suspense } from "react";
import { Shantell_Sans } from "next/font/google";
import { unstable_cache } from "next/cache";
import { Check, Gauge, Mountain, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadTttRaces } from "@/lib/zrl-analysis/load";
import { buildCheatsheet, PULL_TARGET, type CheatFlag, type Cheatsheet, type CheatsheetRace, type CheatsheetRider } from "@/lib/ttt/lessons";
import { DRAFT_ONLY_FTP_SHARE, PULL_HIGH_SHARE, PULL_LOW_SHARE, type PlanComposition, type PlanRider } from "@/lib/zrl-analysis/advice";
import { raceTime, signedSeconds } from "@/lib/zrl-analysis/format";

// Handschrift met duidelijke cijfers: een 1 die niet op een l lijkt. De assen
// INFM (informeel) en BNCE (dansende letters) maken het meer geschreven; de
// koppen het sterkst.
const hand = Shantell_Sans({ subsets: ["latin"], weight: "variable", axes: ["BNCE", "INFM"], display: "swap" });
const HAND_TEXT = "[font-variation-settings:'INFM'_70,'BNCE'_25]";
const HAND_HEADING = "[font-variation-settings:'INFM'_100,'BNCE'_50]";

// De races veranderen alleen als er een nieuwe ploegentijdrit gereden is. Een
// uur cachen houdt de planner snel; de versie in de sleutel ververst na een deploy
// met een andere vorm.
const cachedTttRaces = unstable_cache(loadTttRaces, ["ttt-races", "v2"], { revalidate: 3600 });

const dateLabel = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });
const pct = (share: number) => `${Math.round(100 * share)}%`;

// Inkt op papier.
const INK = "#1d3540";
const PENCIL = "#55707a";
const RED = "#b3261e";
const GREEN = "#0f6e56";
const TEAL = "#1f6068";
const RULE = "border-[#d6dfdc] dark:border-[#c7cec6]";
const HIGHLIGHT = "bg-[rgba(232,190,90,0.45)] box-decoration-clone px-1";

function Title({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-lg font-bold leading-tight", HAND_HEADING, className)}>{children}</h3>;
}

/** Kopvermogen op een getekende lat van 90 tot 130% van de gemiddelde FTP, met de doelband als markeerstift. */
function PullGauge({ share }: { share: number }) {
  const min = 0.9;
  const max = 1.3;
  const x = (v: number) => 8 + ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 284;
  const inBand = share >= PULL_TARGET.low && share <= PULL_TARGET.high;
  const tooLow = share < PULL_LOW_SHARE;
  const tooHigh = share > PULL_HIGH_SHARE;
  const ink = inBand ? GREEN : tooLow || tooHigh ? RED : INK;
  const verdict = inBand
    ? "binnen doel"
    : tooLow
      ? "te zacht"
      : tooHigh
        ? "te zwaar"
        : share < PULL_TARGET.low
          ? "net onder doel"
          : "net boven doel";
  const target = `${pct(PULL_TARGET.low)}–${pct(PULL_TARGET.high)}`;
  const mx = x(share);
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span>kop</span>
        <span className="text-2xl font-bold tabular-nums">{pct(share)}</span>
        <span className="inline-flex items-center gap-1" style={{ color: ink }}>
          {inBand ? <Check aria-hidden strokeWidth={2.5} className="size-4" /> : <X aria-hidden strokeWidth={2.5} className="size-4" />}
          {verdict}
        </span>
      </p>
      <svg viewBox="0 0 300 48" className="mt-1 w-full max-w-sm" role="img" aria-label={`Kopvermogen ${pct(share)} van de gemiddelde FTP, doel ${target}`}>
        <rect
          x={x(PULL_TARGET.low)}
          y={15}
          width={x(PULL_TARGET.high) - x(PULL_TARGET.low)}
          height={15}
          rx={4}
          fill="rgba(93,202,165,0.45)"
          transform="rotate(-1.2 150 22)"
        />
        <path d="M8 23 C 70 21.5, 130 24.5, 190 22.5 S 262 23.8, 292 22.8" stroke={INK} strokeWidth={1.7} fill="none" strokeLinecap="round" />
        {[1, 1.1, 1.2].map((v) => (
          <path key={v} d={`M${x(v)} 19.5 L${x(v) + 0.6} 26.5`} stroke={PENCIL} strokeWidth={1.2} strokeLinecap="round" />
        ))}
        <path d={`M${mx} 7 L${mx + 0.8} 36`} stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
        <path d={`M${mx - 5} 3 L${mx} 9 L${mx + 5.5} 2.5`} stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x={8} y={46} fontSize={12} fill={PENCIL}>
          {pct(min)}
        </text>
        <text x={x((PULL_TARGET.low + PULL_TARGET.high) / 2)} y={46} fontSize={12} fill={PENCIL} textAnchor="middle">
          doel {target}
        </text>
        <text x={292} y={46} fontSize={12} fill={PENCIL} textAnchor="end">
          {pct(max)}
        </text>
      </svg>
    </div>
  );
}

function PlanCheck({ plan }: { plan: PlanComposition }) {
  return (
    <div>
      <Title>Dit plan</Title>
      {plan.pullShare !== null && <PullGauge share={plan.pullShare} />}
      <p className={cn("border-b py-1", RULE)}>gem. FTP {Math.round(plan.avgFtp)} W</p>
      {plan.weak.map((rider) => (
        <p key={rider.name} className={cn("border-b py-1", RULE)}>
          <span className="font-bold" style={{ color: RED }}>
            {rider.name} −{Math.round(100 * (1 - rider.share))}% FTP
          </span>{" "}
          → {rider.share <= DRAFT_ONLY_FTP_SHARE ? "alleen in het wiel" : "korte en weinig beurten"}
        </p>
      ))}
    </div>
  );
}

function FlagLine({ flag }: { flag: CheatFlag }) {
  const Icon = flag.tone === "warn" ? X : flag.tone === "limit" ? Gauge : Mountain;
  return (
    <p className="leading-snug">
      <span
        className={cn("inline-flex items-center gap-1", flag.tone === "limit" && HIGHLIGHT)}
        style={{ color: flag.tone === "warn" ? RED : INK }}
      >
        <Icon aria-hidden strokeWidth={2.4} className="size-4 shrink-0" />
        {flag.label}
      </span>{" "}
      <span style={{ color: PENCIL }}>→</span> {flag.tip}
    </p>
  );
}

/** Renners met precies dezelfde lessen staan op één regel. */
function groupRiders(riders: CheatsheetRider[]) {
  const groups = new Map<string, { riders: CheatsheetRider[]; flags: CheatFlag[] }>();
  for (const rider of riders) {
    if (rider.flags.length === 0) continue;
    const key = JSON.stringify(rider.flags);
    const group = groups.get(key) ?? { riders: [], flags: rider.flags };
    group.riders.push(rider);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function Riders({ riders, teamIds }: { riders: CheatsheetRider[]; teamIds: string[] }) {
  const quiet = riders.filter((r) => r.flags.length === 0);
  // Reed iemand de vorige keer bij een ander team, dan staat dat team erbij.
  const otherTeam = (rider: CheatsheetRider) => {
    const last = rider.rides[0];
    return last && !teamIds.includes(last.teamId) ? last.teamName : null;
  };
  return (
    <div>
      <Title className="mt-4">Renners</Title>
      <ul>
        {groupRiders(riders).map((group) => (
          <li key={group.riders.map((r) => r.zwiftId).join("-")} className={cn("space-y-0.5 border-b py-1.5", RULE)}>
            <p className="font-bold">
              {group.riders.map((rider, index) => (
                <span key={rider.zwiftId}>
                  {index > 0 && " · "}
                  {rider.name}
                  {otherTeam(rider) && <span className={cn("text-sm font-normal", HAND_TEXT)} style={{ color: PENCIL }}> ({otherTeam(rider)})</span>}
                </span>
              ))}
            </p>
            {group.flags.map((flag) => (
              <FlagLine key={flag.label} flag={flag} />
            ))}
          </li>
        ))}
      </ul>
      {quiet.length > 0 && (
        <p className="py-1.5" style={{ color: PENCIL }}>
          ook gereden, niets bijzonders: {quiet.map((r) => r.name).join(", ")}
        </p>
      )}
    </div>
  );
}

/** Per stuk winst of verlies op de dichtstbijzijnde ploeg, als getekende staafjes rond een stippellijn. */
function SectionBars({ race }: { race: CheatsheetRace }) {
  const max = Math.max(1000, ...race.sections.map((s) => Math.abs(s.deltaMs)));
  return (
    <ul className="mt-1 space-y-1 text-xs" style={{ color: PENCIL }}>
      {race.sections.map((section, index) => (
        <li key={`${index}-${section.name}`} className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_3.25rem] items-center gap-2">
          <span className="truncate first-letter:uppercase" title={section.name}>
            {section.name}
          </span>
          <span className="relative h-2.5">
            <span className="absolute -inset-y-1 left-1/2 border-l border-dashed" style={{ borderColor: PENCIL }} />
            <span
              className={cn("absolute inset-y-0", section.deltaMs >= 0 ? "left-1/2 rounded-[2px_7px_5px_3px]" : "right-1/2 rounded-[7px_2px_3px_6px]")}
              style={{
                width: `${(Math.abs(section.deltaMs) / max) * 50}%`,
                background: section.deltaMs >= 0 ? "rgba(29,158,117,0.55)" : "rgba(226,75,74,0.5)",
              }}
            />
          </span>
          <span className="text-right tabular-nums" style={{ color: INK }}>
            {signedSeconds(section.deltaMs)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Race({ race }: { race: CheatsheetRace }) {
  return (
    <div className="mt-4">
      <Title>
        Vorige keer · {dateLabel.format(new Date(race.startAt))}
        {race.teamName && <span className={cn("text-sm font-normal", HAND_TEXT)} style={{ color: PENCIL }}> {race.teamName}</span>}
      </Title>
      <p className="tabular-nums">
        {race.rank !== null && (
          <>
            <span className="text-xl font-bold">{race.rank}e</span>/{race.of} ·{" "}
          </>
        )}
        {raceTime(race.time)}
        {race.rival && (
          <>
            {" · "}
            <span style={{ color: race.rival.deltaMs >= 0 ? GREEN : RED }}>
              {signedSeconds(race.rival.deltaMs)} op {race.rival.label}
            </span>
          </>
        )}
      </p>
      {race.sections.length > 0 && <SectionBars race={race} />}
      {race.tips.map((tip) => (
        <p key={tip} className="mt-1 leading-snug">
          <span style={{ color: PENCIL }}>→</span> {tip}
        </p>
      ))}
    </div>
  );
}

function Rules({ sheet }: { sheet: Cheatsheet }) {
  return (
    <div>
      <Title>Onthouden</Title>
      <dl>
        {sheet.rules.map((rule) => (
          <div key={rule.value} className={cn("flex gap-3 border-b py-1 leading-snug", RULE)}>
            <dt className="w-[7.5rem] shrink-0 whitespace-nowrap font-bold tabular-nums">
              {rule.key ? (
                <span className="-ml-1.5 inline-block -rotate-2 rounded-[50%] border-2 px-2.5 py-0.5" style={{ borderColor: TEAL }}>
                  {rule.value}
                </span>
              ) : (
                rule.value
              )}
            </dt>
            <dd>{rule.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Sheet({ sheet, teamIds }: { sheet: Cheatsheet; teamIds: string[] }) {
  const empty = sheet.races.length === 0 && sheet.riders.length === 0;
  return (
    <div className="mt-3 grid gap-x-10 md:grid-cols-2">
      {/* Op de telefoon eerst het plan en de renners: daar plant de captain mee. */}
      <div className="order-2 mt-4 md:order-1 md:mt-0">
        <Rules sheet={sheet} />
        {sheet.races.map((race) => (
          <Race key={race.eventId} race={race} />
        ))}
      </div>
      <div className="order-1 md:order-2">
        {sheet.plan && <PlanCheck plan={sheet.plan} />}
        {sheet.riders.length > 0 && <Riders riders={sheet.riders} teamIds={teamIds} />}
        {empty && (
          <p className="mt-4" style={{ color: PENCIL }}>
            Nog geen eerdere ploegentijdritten van dit team of deze renners.
          </p>
        )}
      </div>
    </div>
  );
}

async function LoadedSheet({ teamIds, riders }: { teamIds: string[]; riders: PlanRider[] }) {
  const records = await cachedTttRaces().catch(() => []);
  const sheet = buildCheatsheet({ records, teamIds, riders });
  const count = new Set([...sheet.races.map((r) => r.eventId), ...sheet.riders.flatMap((r) => r.rides.map((ride) => ride.eventId))]).size;
  return (
    <>
      {count > 0 && (
        <p className="mt-2 text-sm" style={{ color: PENCIL }}>
          uit {count} eerdere {count === 1 ? "ploegentijdrit" : "ploegentijdritten"}
        </p>
      )}
      <Sheet sheet={sheet} teamIds={teamIds} />
    </>
  );
}

function Loading() {
  return (
    <div className="mt-3 space-y-3" aria-label="Spiekbriefje laden">
      {["w-1/3", "w-2/3", "w-1/2", "w-3/5"].map((width) => (
        <div key={width} className={cn("h-3 rounded bg-[#e7e0cb] motion-safe:animate-pulse", width)} />
      ))}
    </div>
  );
}

// Gescheurde randjes: een masker van getande stroken langs de randen plus een
// vlak in het midden. De bovenkant is uit een schrift gescheurd en het grilligst;
// de tegels zijn ongelijk breed, zodat de herhaling niet opvalt.
const edge = (w: number, h: number, points: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><polygon points='${points}'/></svg>`)}")`;
const TORN = {
  top: edge(126, 14, "0,14 0,7 4,1 7,4 12,1 19,9 21,3 23,5 29,7 31,3 35,9 41,2 43,10 49,5 52,9 54,11 56,3 61,2 66,10 68,10 71,11 73,4 79,6 84,2 86,9 92,2 94,10 97,1 104,10 111,4 117,8 119,11 125,9 126,7 126,14"),
  bottom: edge(98, 9, "0,0 98,0 98,5 96,8 91,5 84,5 81,7 77,6 68,2 60,7 56,5 47,4 43,8 38,8 33,4 27,6 20,5 14,3 9,6 0,5"),
  left: edge(8, 91, "8,0 8,91 5,91 5,88 3,83 5,72 2,64 3,59 6,54 5,43 4,32 5,23 2,14 5,5 5,0"),
  right: edge(8, 77, "0,0 0,77 5,77 7,71 6,65 4,57 5,50 5,46 7,35 8,30 5,24 2,15 5,4 5,0"),
};
const tornMask = {
  image: `${TORN.top}, ${TORN.bottom}, ${TORN.left}, ${TORN.right}, linear-gradient(#000, #000)`,
  position: "left top, left bottom, left top, right top, 8px 14px",
  size: "126px 14px, 98px 9px, 8px 91px, 8px 77px, calc(100% - 16px) calc(100% - 23px)",
  repeat: "repeat-x, repeat-x, repeat-y, repeat-y, no-repeat",
};
const PAPER_STYLE: React.CSSProperties = {
  color: INK,
  maskImage: tornMask.image,
  maskPosition: tornMask.position,
  maskSize: tornMask.size,
  maskRepeat: tornMask.repeat,
  WebkitMaskImage: tornMask.image,
  WebkitMaskPosition: tornMask.position,
  WebkitMaskSize: tornMask.size,
  WebkitMaskRepeat: tornMask.repeat,
};

export function TttCheatsheet({ teamIds, riders }: { teamIds: string[]; riders: PlanRider[] }) {
  return (
    <section aria-labelledby="ttt-spiekbriefje" className="w-full px-1 pt-3 pb-1 sm:px-3">
      {/* De schaduw zit op de omhulling: drop-shadow volgt de gescheurde rand. */}
      <div className="relative mx-auto max-w-5xl [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.16))_drop-shadow(0_5px_10px_rgba(0,0,0,0.08))] sm:-rotate-[0.6deg]">
        <div
          className={cn(hand.className, HAND_TEXT, "relative bg-[#fbf7ea] pt-8 pr-5 pb-7 pl-10 sm:pr-8 sm:pl-14 dark:bg-[#e6dfcc]")}
          style={PAPER_STYLE}
        >
          <span aria-hidden className="absolute inset-y-0 left-6 border-l-[1.5px] border-[#c9a15a] sm:left-10" />
          <h2 id="ttt-spiekbriefje" className={cn("text-2xl font-bold leading-tight", HAND_HEADING)}>
            <span className="border-b-2" style={{ borderColor: INK }}>
              Spiekbriefje
            </span>
          </h2>
          <Suspense fallback={<Loading />}>
            <LoadedSheet teamIds={teamIds} riders={riders} />
          </Suspense>
        </div>
        <span aria-hidden className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-3 bg-[rgba(31,96,104,0.28)]" />
        <span aria-hidden className="absolute -right-3 -bottom-1 h-5 w-16 -rotate-[38deg] bg-[rgba(31,96,104,0.22)]" />
      </div>
    </section>
  );
}
