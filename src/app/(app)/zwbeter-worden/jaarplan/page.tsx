// De jaarplanning van het lid: de laag boven het schema.
//
// Het schema is een blok van hooguit twaalf weken; hier staat het jaar eromheen
// als een weg van boven naar beneden. De mikpunten en periodes die hier in staan
// gaan als randvoorwaarde mee naar de planner (zie seasonPlanForAi in
// lib/training/season-data.ts), en wat er wringt staat op de halte waar het
// speelt.

import { PageHeader } from "@/components/app-ui";
import { requireViewer, todayKeyAmsterdam } from "../_data";
import { loadSeason } from "./_data";
import { SeasonForms } from "./_components/season-forms";
import { SeasonRoad } from "./_components/season-road";
import { SeasonStand } from "./_components/season-stand";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JaarplanPage() {
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();
  const season = await loadSeason(viewer.admin, viewer.user.id, today);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Jaarplan" />

      <SeasonStand today={season.today} targets={season.targets} plans={season.plans} />

      <SeasonForms
        todayKey={today}
        events={season.events.filter(
          (event) =>
            event.date >= today && !season.targets.some((target) => target.eventId === event.id),
        )}
      />

      <SeasonRoad
        today={season.today}
        from={season.from}
        targets={season.targets}
        periods={season.periods}
        plans={season.plans}
        events={season.events}
        warnings={season.warnings}
        editable
      />
    </div>
  );
}
