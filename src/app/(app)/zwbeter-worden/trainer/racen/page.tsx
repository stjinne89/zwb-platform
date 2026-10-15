// Races-tab van de trainer: de Zwift-races van het gekozen lid met de tips uit
// ZWBeter racen, om als feedback naar de coachchat te sturen. Alleen de eigen
// races van het lid; de toegang loopt via de toewijzing (trainerContext).

import Link from "next/link";
import { EmptyState, HelpLink } from "@/components/app-ui";
import {
  listRaces,
  loadCalendarPersonalRace,
  loadRaceAnalysis,
  loadZwiftLinkRace,
  type ZrlRaceListItem,
} from "@/lib/zrl-analysis/load";
import type { Advice } from "@/lib/zrl-analysis/advice";
import { cn } from "@/lib/utils";
import { trainerContext } from "../_data";
import { paramString } from "../../_components/format";
import type { SearchParamsProp } from "../../_components/types";
import { SendRaceTips } from "../_components/send-race-tips";

export const dynamic = "force-dynamic";
// De tips van een race met de eigen rit erbij vragen intervals.icu om het bestand.
export const maxDuration = 30;

/** Geen bestuurs- of captainrechten: de trainer ziet het lid, niet zijn teams. */
const NO_ACCESS = { has: () => false };

const dateLabel = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" });

async function tipsFor(race: ZrlRaceListItem, athleteId: string, admin: Parameters<typeof loadRaceAnalysis>[3]): Promise<Advice[] | null> {
  const athlete = { id: athleteId };
  if (race.kind === "zrl") {
    const outcome = await loadRaceAnalysis(race.id, athlete, NO_ACCESS, admin);
    return outcome.status === "ok" ? outcome.ownTips : null;
  }
  const outcome = race.id.startsWith("zwift-")
    ? await loadZwiftLinkRace(race.id.slice("zwift-".length), athlete, admin)
    : await loadCalendarPersonalRace(race.id, athlete, admin);
  return outcome.status === "ok" ? outcome.tips : null;
}

export default async function TrainerRacesPage({ searchParams }: SearchParamsProp) {
  const context = await trainerContext(searchParams);
  if (!context.ok) {
    return <EmptyState>{context.reason === "no-permission" ? "Je hebt geen trainer-rechten." : "Geen toegewezen leden."}</EmptyState>;
  }
  const params = (await searchParams) ?? {};
  const races = (await listRaces(context.athleteId, NO_ACCESS)).filter((race) => race.own);
  if (races.length === 0) return <EmptyState>Nog geen gereden Zwift-races.</EmptyState>;

  const selected = races.find((race) => race.id === paramString(params.race)) ?? races[0];
  const tips = await tipsFor(selected, context.athleteId, context.viewer.admin);
  const href = (race: ZrlRaceListItem) =>
    `/zwbeter-worden/trainer/racen?athlete=${encodeURIComponent(context.athleteId)}&race=${encodeURIComponent(race.id)}`;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <nav aria-label="Races" className="min-w-0">
        <ul className="divide-y rounded-lg border bg-card">
          {races.map((race) => (
            <li key={race.id}>
              <Link
                href={href(race)}
                aria-current={race.id === selected.id ? "page" : undefined}
                className={cn("tg-link tg-kalender block px-3 py-2 text-sm hover:bg-muted/50", race.id === selected.id && "bg-primary/5 font-medium")}
              >
                <span className="block truncate">{race.title}</span>
                <span className="text-xs text-muted-foreground">{dateLabel.format(new Date(race.startAt))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <section className="min-w-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{selected.title}</h2>
          <HelpLink href="/hulp#racen-trainer" />
        </div>
        {tips === null ? (
          <EmptyState>Voor deze race is er geen analyse.</EmptyState>
        ) : tips.length === 0 ? (
          <EmptyState>Geen opvallende punten in deze race.</EmptyState>
        ) : (
          <SendRaceTips key={selected.id} athleteId={context.athleteId} title={selected.title} tips={tips} />
        )}
      </section>
    </div>
  );
}
