import Link from "next/link";
import { PartyPopper, Trophy } from "lucide-react";
import { InlineMoreLink, SectionHeader } from "@/components/app-ui";
import { BekerFeest } from "@/components/zwbekers/beker-feest";
import { BekerIcon } from "@/components/zwbekers/beker-icon";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { dayLabel, namesLabel } from "@/lib/zwbekers/nomination";
import { loadRecentBekers, requireBekerMember, type BekerSummary } from "@/lib/zwbekers/server";

/**
 * De ZWBekers van de afgelopen week op het dashboard (wens eigenaar,
 * 2026-10-28): wat er gepresteerd is, met een knop om de winnaars te
 * feliciteren. Nieuw voor dit toestel: slingers en confetti (BekerFeest).
 * Alleen voor wie de prijzenkast mag zien; anders niets.
 */
export async function RecentBekers() {
  let guard;
  try {
    guard = await requireBekerMember();
  } catch {
    return null;
  }
  const bekers = await loadRecentBekers(guard.client, amsterdamDayKey());
  if (bekers.length === 0) return null;
  return <RecentBekersList bekers={bekers} />;
}

/** Het blok zelf; ook op /ontwerp-voorbeeld, met voorbeeldbekers. */
export function RecentBekersList({ bekers }: { bekers: BekerSummary[] }) {
  return (
    <BekerFeest ids={bekers.map((beker) => beker.id)} className="pt-2">
      <SectionHeader icon={Trophy} title="ZWBekers van deze week" action={<InlineMoreLink href="/zwbekers">Prijzenkast</InlineMoreLink>} />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {bekers.map((beker) => {
          const who = beker.winners.map((winner) => winner.name);
          return (
            <li key={beker.id} className="flex gap-4 rounded-lg bg-[#0a2b34] p-3 text-[#f4efe4]">
              <Link
                href={`/zwbekers/${beker.id}`}
                className="flex w-20 shrink-0 items-end justify-center border-b-[3px] border-[#c9a45a] pb-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c56b]"
                tabIndex={-1}
                aria-hidden
              >
                <BekerIcon design={beker.design} title="" className="h-24 w-auto max-w-full" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/zwbekers/${beker.id}`} className="font-semibold leading-tight hover:underline">
                  {beker.title}
                </Link>
                <p className="text-sm leading-snug">
                  {beker.kind === "team" && beker.teamName ? `${beker.teamName}: ` : ""}
                  {namesLabel(who, 3)}
                </p>
                <p className="text-xs text-[#a8a296]">{dayLabel(beker.achievedOn)}</p>
                <Link
                  href={`/zwbekers/${beker.id}#felicitaties`}
                  className="mt-auto inline-flex min-h-9 w-fit items-center gap-1.5 rounded-md bg-[#e7c56b] px-3 text-sm font-medium text-[#0a2b34] hover:bg-[#f0d488] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c56b]"
                >
                  <PartyPopper className="size-4" aria-hidden />
                  Feliciteren
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </BekerFeest>
  );
}
