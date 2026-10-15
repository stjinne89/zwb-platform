// Cheatsheet in de TTT Planner: vuistregels, een check van het plan, en de
// lessen uit eerdere ploegentijdritten van het team en de renners. Alleen voor
// wie het plan beheert (captain, co-captain of rosterbeheer): het toont
// vermogen per renner uit de races.

import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { NotebookPen } from "lucide-react";
import { loadTttRaces } from "@/lib/zrl-analysis/load";
import { buildCheatsheet, type Cheatsheet } from "@/lib/ttt/lessons";
import type { Advice, PlanRider } from "@/lib/zrl-analysis/advice";

// De races veranderen alleen als er een nieuwe ploegentijdrit gereden is. Een
// uur cachen houdt de planner snel; de versie in de sleutel ververst na een deploy
// met een andere vorm.
const cachedTttRaces = unstable_cache(loadTttRaces, ["ttt-races", "v1"], { revalidate: 3600 });

const dateLabel = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });

function Lessons({ items }: { items: Advice[] }) {
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.finding} className="rounded-md border bg-background p-3 text-sm">
          <p className="text-muted-foreground">{a.finding}</p>
          <p className="mt-1 font-medium">{a.tip}</p>
        </li>
      ))}
    </ul>
  );
}

function Sheet({ sheet }: { sheet: Cheatsheet }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Vuistregels</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {sheet.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        {sheet.plan.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Dit plan</h3>
            <Lessons items={sheet.plan} />
          </div>
        )}
        {sheet.races.map((race) => (
          <div key={race.eventId} className="space-y-2">
            <h3 className="text-sm font-semibold">
              {race.teamName ?? "Team"}, {dateLabel.format(new Date(race.startAt))}
            </h3>
            <p className="text-sm tabular-nums">{race.result}</p>
            {race.facts.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {race.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            )}
            {race.lessons.length > 0 && <Lessons items={race.lessons} />}
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {sheet.riders.length > 0 ? (
          sheet.riders.map((rider) => (
            <div key={rider.zwiftId} className="space-y-2">
              <h3 className="text-sm font-semibold">{rider.name}</h3>
              <ul className="space-y-1 text-sm text-muted-foreground tabular-nums">
                {rider.history.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {rider.lessons.length > 0 && <Lessons items={rider.lessons} />}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Nog geen eerdere ploegentijdritten van deze renners.</p>
        )}
      </div>
    </div>
  );
}

async function LoadedSheet({ teamIds, riders }: { teamIds: string[]; riders: PlanRider[] }) {
  const records = await cachedTttRaces().catch(() => []);
  return <Sheet sheet={buildCheatsheet({ records, teamIds, riders })} />;
}

export function TttCheatsheet({ teamIds, riders }: { teamIds: string[]; riders: PlanRider[] }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <NotebookPen className="size-5 text-primary" />
        Cheatsheet
      </h2>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Eerdere ploegentijdritten laden…</p>}>
        <LoadedSheet teamIds={teamIds} riders={riders} />
      </Suspense>
    </section>
  );
}
