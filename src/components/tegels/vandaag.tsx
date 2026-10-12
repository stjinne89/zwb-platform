import Link from "next/link";
import { EmptyState } from "@/components/app-ui";

// Het startscherm van het design "tegels": wat jij vandaag en deze week doet,
// als tegels in de kleur van de plek waar ze heen leiden. Puur weergave; de
// dashboardpagina levert de data aan.

export type VandaagWorkout = {
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

export type VandaagStanding = {
  href: string;
  team: string;
  competition: string;
  position: number;
  totalTeams: number | null;
};

export function TegelsVandaag({
  weekday,
  date,
  workout,
  events,
  standing,
}: {
  weekday: string;
  date: string;
  workout: VandaagWorkout | null;
  events: VandaagEvent[];
  standing: VandaagStanding | null;
}) {
  const empty = !workout && events.length === 0 && !standing;
  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between gap-4">
        <h1 className="tg-display">Vandaag</h1>
        <p className="pb-1 text-right text-sm lowercase leading-tight text-muted-foreground">
          {weekday}
          <br />
          {date}
        </p>
      </header>

      {empty ? (
        <EmptyState>Niets gepland deze week.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {workout && (
            <Link
              href="/zwbeter-worden"
              className={`tg-tile col-span-2 ${workout.today ? "tg-vandaag" : "tg-zwbeter"}`}
            >
              <span className="tg-tile-small">ZWBeter trainen · {workout.when}</span>
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
          )}

          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className={`tg-tile tg-${event.place}`}>
              <span className="tg-tile-small">{event.when}</span>
              <span className="tg-tile-title mt-0.5 line-clamp-3">{event.title}</span>
              <span className="tg-tile-num">{event.time}</span>
            </Link>
          ))}

          {standing && (
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
          )}
        </div>
      )}
    </section>
  );
}
