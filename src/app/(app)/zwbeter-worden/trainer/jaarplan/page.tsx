// Het jaarplan van een renner, voor de trainer. Meekijken en meedenken, niet
// bewerken: de jaarplanning gaat over de vakanties en de agenda van het lid, en
// die zet niemand anders op een andere week. De RLS dwingt hetzelfde af.

import { EmptyState } from "@/components/app-ui";
import type { SearchParamsProp } from "../../_components/types";
import { todayKeyAmsterdam } from "../../_data";
import { loadSeason } from "../../jaarplan/_data";
import { SeasonBand } from "../../jaarplan/_components/season-band";
import { SeasonList } from "../../jaarplan/_components/season-list";
import { loadAthlete, trainerContext } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerJaarplanPage({ searchParams }: SearchParamsProp) {
  const context = await trainerContext(searchParams);
  if (!context.ok) {
    return (
      <EmptyState>
        {context.reason === "no-permission"
          ? "Je hebt geen trainer-rechten."
          : "Geen toegewezen leden."}
      </EmptyState>
    );
  }
  const { viewer, athleteId } = context;

  const today = todayKeyAmsterdam();
  const [athlete, season] = await Promise.all([
    loadAthlete(viewer, athleteId),
    loadSeason(viewer.admin, athleteId, today),
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Jaarplan van {athlete?.display_name ?? "de renner"}</h2>
        <div className="mt-4">
          <SeasonBand
            from={season.from}
            to={season.to}
            today={season.today}
            plans={season.plans}
            periods={season.periods}
            targets={season.targets}
            events={season.events}
          />
        </div>
      </section>

      <SeasonList
        today={season.today}
        targets={season.targets}
        periods={season.periods}
        plans={season.plans}
        events={season.events}
        editable={false}
      />
    </div>
  );
}
