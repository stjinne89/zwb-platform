import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ModuleName } from "@/components/club-texts-provider";

// De tegels van het dashboard: wat jij vandaag en deze week doet, in de kleur
// van hun soort (kleurbeleid in globals.css). Elke tegel is een link. Puur
// weergave; de dashboardpagina levert de data en zet de tegels in groepen.

export type VandaagWorkout = {
  id: string;
  title: string;
  /** Bijvoorbeeld "vandaag" of "morgen". */
  when: string;
  /** Staat de training vandaag gepland? Dan is de tegel goud: jij, nu. */
  today: boolean;
  /** Bijvoorbeeld "75 min · sweet spot". */
  meta: string;
  /** De blokken van de training: duur en doelvermogen als % van de FTP. */
  profile?: Array<{ minutes: number; pct: number }>;
};

/** Het verloop van een training als trapjeslijn: breedte is tijd, hoogte is
 * vermogen. Een training van één blok heeft geen verloop om te tonen. */
function WorkoutProfile({ blocks }: { blocks: Array<{ minutes: number; pct: number }> }) {
  const total = blocks.reduce((sum, block) => sum + block.minutes, 0);
  if (blocks.length < 2 || total <= 0) return null;
  const low = Math.min(40, ...blocks.map((block) => block.pct));
  const high = Math.max(110, ...blocks.map((block) => block.pct));
  const y = (pct: number) => (36 - ((pct - low) / (high - low)) * 32).toFixed(1);
  let x = 0;
  let path = "";
  for (const block of blocks) {
    const end = x + (block.minutes / total) * 100;
    path += `${path ? " L" : "M"}${x.toFixed(1)} ${y(block.pct)} L${end.toFixed(1)} ${y(block.pct)}`;
    x = end;
  }
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      role="img"
      aria-label="Verloop van de training"
      className="mt-3 h-11 w-full"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export type VandaagEvent = {
  id: string;
  title: string;
  /** Bijvoorbeeld "morgen" of "za 17 okt". */
  when: string;
  time: string;
  /** Events zijn petrol; zie het kleurbeleid in globals.css. */
  place: "kalender";
};

/** Wie er nu live rijdt op Samen fietsen. Alleen een tegel als er iemand rijdt. */
export type VandaagLive = {
  count: number;
  /** Rijdt de kijker zelf mee? Dan staat de tegel bij Mijn events. */
  mine: boolean;
  /** Bijvoorbeeld "Jij en Anna" of "Anna, Bert, Carla en 2 anderen". */
  riders: string;
};

/** Een lopend event waarin nu ZWB'ers live rijden. Eén tegel per event. */
export type VandaagLiveEvent = VandaagLive & {
  id: string;
  title: string;
};

export type VandaagStanding = {
  href: string;
  team: string;
  competition: string;
  position: number;
  totalTeams: number | null;
};

/** De laatste score van ZWBriljant, als de steen er al is. */
export type VandaagBriljant = {
  points: number;
  level: string;
  color: string;
  /** De volgende klasse en hoeveel punten nog; null in Diamant. */
  next: { name: string; toGo: number } | null;
};

/** Donkere of lichte tekst op de kleur van de klasse, naar de helderheid ervan. */
function inkOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.3 ? "var(--tg-ink)" : "var(--tg-paper)";
}

export function DashboardHeader({ weekday, date }: { weekday: string; date: string }) {
  return (
    <header className="tg-repeats-nav">
      <h1 className="tg-display">Dashboard</h1>
      <p className="text-sm lowercase leading-tight text-muted-foreground">
        {weekday} {date}
      </p>
    </header>
  );
}

/** Eén groep tegels. Dense: een brede tegel laat geen gat achter. Zonder
 * tegels verdwijnt de rij. */
export function TileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="grid grid-flow-row-dense grid-cols-2 gap-2 empty:hidden md:grid-cols-4"
    >
      {children}
    </section>
  );
}

function WorkoutTile({
  workout,
  position,
  className = "",
}: {
  workout: VandaagWorkout;
  position?: string;
  className?: string;
}) {
  return (
    <Link
      href="/zwbeter-worden"
      className={`tg-tile ${workout.today ? "tg-vandaag" : "tg-zwbeter"} ${className}`}
    >
      <span className="tg-tile-small">
        ZWBeter trainen · {workout.when}
        {position ? ` · ${position}` : ""}
      </span>
      <span className="mt-0.5 line-clamp-2 text-[2rem] font-light leading-[1.05] tracking-tight">
        {workout.title}
      </span>
      {workout.profile && <WorkoutProfile blocks={workout.profile} />}
      <span className="mt-auto flex items-end justify-between gap-3 pt-4">
        <span className="text-[0.9375rem] tabular-nums">{workout.meta}</span>
        <span className="grid min-h-11 place-items-center bg-[var(--tg-paper)] px-5 text-[0.9375rem] font-bold text-[var(--tg-ink)]">
          Open
        </span>
      </span>
    </Link>
  );
}

/** De trainingen van de eerstvolgende trainingsdag. Meer dan één (een warming-up
 * voor een race, twee events op een dag): veeg ertussen, de volgende steekt een
 * stukje uit. */
export function WorkoutTiles({ workouts }: { workouts: VandaagWorkout[] }) {
  if (workouts.length === 0) return null;
  if (workouts.length === 1) return <WorkoutTile workout={workouts[0]} className="col-span-2" />;
  return (
    <div
      role="group"
      aria-label="Trainingen"
      className="col-span-2 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {workouts.map((workout, index) => (
        <WorkoutTile
          key={workout.id}
          workout={workout}
          position={`${index + 1} van ${workouts.length}`}
          className="w-[88%] shrink-0 snap-start focus-visible:[outline-offset:-2px]"
        />
      ))}
    </div>
  );
}

export function LiveTogetherTile({ live }: { live: VandaagLive }) {
  return (
    // Sage: de club en de mensen, net als Samen fietsen onder Club.
    <Link href="/samen-fietsen" className="tg-tile tg-club">
      <span className="tg-tile-small">Samen fietsen · nu</span>
      <span className="tg-tile-title mt-0.5 line-clamp-3">{live.riders}</span>
      <span className="tg-tile-num">
        {live.count}
        <span className="ml-1.5 text-base font-normal tracking-normal opacity-85">live</span>
      </span>
    </Link>
  );
}

export function LiveEventTile({ event }: { event: VandaagLiveEvent }) {
  return (
    // Petrol, net als de andere events.
    <Link href={`/events/${event.id}`} className="tg-tile tg-kalender">
      <span className="tg-tile-small line-clamp-1">Event · nu</span>
      <span className="tg-tile-title mt-0.5 line-clamp-2">{event.title}</span>
      <span className="mt-1 line-clamp-1 text-[0.9375rem]">{event.riders}</span>
      <span className="tg-tile-num">
        {event.count}
        <span className="ml-1.5 text-base font-normal tracking-normal opacity-85">live</span>
      </span>
    </Link>
  );
}

export function EventTile({ event }: { event: VandaagEvent }) {
  return (
    <Link href={`/events/${event.id}`} className={`tg-tile tg-${event.place}`}>
      <span className="tg-tile-small">{event.when}</span>
      <span className="tg-tile-title mt-0.5 line-clamp-3">{event.title}</span>
      <span className="tg-tile-num">{event.time}</span>
    </Link>
  );
}

export function BriljantTile({ briljant }: { briljant: VandaagBriljant }) {
  return (
    // Helemaal in de kleur van je klasse (eigenaar, 2026-10-21), zodat hij opvalt.
    <Link
      href="/stats/zwbriljant"
      className="tg-tile"
      style={{ "--tg-bg": briljant.color, "--tg-fg": inkOn(briljant.color) } as CSSProperties}
    >
      <span className="tg-tile-small"><ModuleName module="rennersniveau" /></span>
      <span className="tg-tile-title mt-0.5">{briljant.level}</span>
      {briljant.next && (
        <span className="tg-tile-small mt-1">
          nog {briljant.next.toGo} tot {briljant.next.name}
        </span>
      )}
      <span className="tg-tile-num">
        {briljant.points.toLocaleString("nl-NL")}
        <span className="ml-1.5 text-base font-normal tracking-normal opacity-85">punten</span>
      </span>
    </Link>
  );
}

export function StandingTile({ standing }: { standing: VandaagStanding }) {
  return (
    <Link href={standing.href} className="tg-tile tg-kalender">
      <span className="tg-tile-small line-clamp-1">Club · {standing.competition}</span>
      <span className="tg-tile-title mt-0.5 line-clamp-2">{standing.team}</span>
      <span className="tg-tile-num">
        {standing.position}e
        {standing.totalTeams ? (
          <span className="ml-1.5 text-base font-normal tracking-normal opacity-85">
            van {standing.totalTeams}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
