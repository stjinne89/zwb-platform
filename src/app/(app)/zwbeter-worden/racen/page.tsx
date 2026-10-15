import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { EmptyState, HelpLink, SectionHeader } from "@/components/app-ui";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { listZrlRaces, type ZrlRaceListItem } from "@/lib/zrl-analysis/load";

export const dynamic = "force-dynamic";

const dateLabel = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Amsterdam",
});

function RaceList({ races }: { races: ZrlRaceListItem[] }) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {races.map((race) => (
        <li key={race.id}>
          <Link
            href={`/zwbeter-worden/racen/${race.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:bg-muted/50"
          >
            <span className="w-28 shrink-0 text-sm text-muted-foreground">{dateLabel.format(new Date(race.startAt))}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{race.title}</span>
              {race.ttt && <span className="text-xs text-muted-foreground">Ploegentijdrit</span>}
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
  const races = await listZrlRaces(user.id, await getRequestAccess());
  const own = races.filter((r) => r.own);
  const led = races.filter((r) => !r.own && r.captain);
  const rest = races.filter((r) => !r.own && !r.captain);

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader title="Jouw races" action={<HelpLink href="/hulp#racen" />} place="zwbeter" />
        {own.length === 0 ? <EmptyState>Nog geen gereden ZRL-races.</EmptyState> : <RaceList races={own} />}
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
