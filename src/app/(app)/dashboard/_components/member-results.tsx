import Link from "next/link";
import { MemberLink } from "@/components/member-link";
import { loadClubRaceResults, type ClubRaceResult } from "@/lib/racen/club-results";

const MAX_RACES = 4;

// Uitslagen van leden: per race een petrol tegel zoals elk event. De titel is
// de link naar het event en dekt de tegel; de namen erboven linken naar het
// profiel van het lid.
export async function MemberResults() {
  const races = await loadClubRaceResults().catch(() => []);
  return <MemberResultTiles races={races} />;
}

/** De tegels zelf, zonder ophalen; ook op /ontwerp-voorbeeld. */
export function MemberResultTiles({ races }: { races: ClubRaceResult[] }) {
  if (races.length === 0) return null;
  return (
    <ul className="contents" aria-label="Uitslagen van leden">
      {races.slice(0, MAX_RACES).map((race) => (
        <li key={race.key} className="tg-tile tg-kalender">
          <span className="tg-tile-small line-clamp-1">
            {new Date(race.startAt).toLocaleDateString("nl-NL", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Europe/Amsterdam",
            })}
            {` · ${race.riders} ${race.riders === 1 ? "lid" : "leden"}`}
          </span>
          <Link
            href={race.href}
            className="tg-tile-title mt-0.5 line-clamp-2 !static after:absolute after:inset-0 after:content-['']"
          >
            {race.title}
          </Link>
          <ul className="mt-auto space-y-0.5 pt-3 text-[0.9375rem] leading-tight">
            {race.best.slice(0, 3).map((rider) => (
              <li key={`${rider.label}:${rider.profileId}`} className="flex items-baseline gap-1.5">
                <span className="tabular-nums font-semibold">{rider.rank}e</span>
                {rider.label && <span className="text-xs opacity-85">{rider.label}</span>}
                <MemberLink id={rider.profileId} className="relative z-10 min-w-0 truncate">
                  {rider.name}
                </MemberLink>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
