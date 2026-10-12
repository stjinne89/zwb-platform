import Link from "next/link";
import { EmptyState } from "@/components/app-ui";

// Het startscherm van het design "tegels": wat jij vandaag en deze week doet,
// als tegels in de kleur van de plek waar ze heen leiden. Puur weergave; de
// dashboardpagina levert de data aan.

export type VandaagWorkout = {
  title: string;
  /** Bijvoorbeeld "vandaag" of "morgen". */
  when: string;
  /** Bijvoorbeeld "75 min · sweet spot". */
  meta: string;
};

export type VandaagEvent = {
  id: string;
  title: string;
  /** Bijvoorbeeld "morgen" of "za 17 okt". */
  when: string;
  time: string;
  /** Koers hoort bij Kalender (petrol), een clubrit kleurt sage. */
  place: "kalender" | "club";
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
            <Link href="/zwbeter-worden" className="tg-tile tg-zwbeter col-span-2">
              <span className="tg-tile-small">ZWBeter trainen · {workout.when}</span>
              <span className="mt-0.5 line-clamp-2 text-[2rem] font-light leading-[1.05] tracking-tight">
                {workout.title}
              </span>
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
            <Link href={standing.href} className="tg-tile tg-meer">
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
