import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { EmptyState, HelpLink, SectionHeader } from "@/components/app-ui";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { listRaces, type ZrlRaceListItem } from "@/lib/zrl-analysis/load";
import { OpenRaceForm } from "./_components/open-race-form";

export const dynamic = "force-dynamic";

const dateLabel = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Amsterdam",
});

const KIND_LABEL: Record<ZrlRaceListItem["kind"], string> = { zrl: "ZRL", frr: "FRR", zwift: "Zwift" };

function RaceList({ races }: { races: ZrlRaceListItem[] }) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {races.map((race) => (
        <li key={race.id}>
          <Link href={race.href} className="tg-link tg-kalender flex items-center gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:bg-muted/50">
            <span className="w-28 shrink-0 text-sm text-muted-foreground">{dateLabel.format(new Date(race.startAt))}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{race.title}</span>
              <span className="text-xs text-muted-foreground">
                {KIND_LABEL[race.kind]}
                {race.ttt && " · ploegentijdrit"}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function RacenPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const races = await listRaces(user.id, await getRequestAccess());
  const own = races.filter((r) => r.own);
  const led = races.filter((r) => !r.own && r.captain);
  const rest = races.filter((r) => !r.own && !r.captain);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionHeader title="Jouw races" action={<HelpLink href="/hulp#racen" />} place="zwbeter" />
        <OpenRaceForm />
        {own.length === 0 ? <EmptyState>Nog geen gereden Zwift-races.</EmptyState> : <RaceList races={own} />}
      </section>
      {led.length > 0 && (
        <section>
          <SectionHeader title="Als captain" place="zwbeter" />
          <RaceList races={led} />
        </section>
      )}
      {rest.length > 0 && (
        <section>
          <SectionHeader title="Andere teams" place="zwbeter" />
          <RaceList races={rest} />
        </section>
      )}
    </div>
  );
}
