// De jaarplanning van het lid: de laag boven het schema.
//
// Het schema werkt naar één doeldatum toe; hier staat het jaar eromheen. De
// mikpunten en rustperiodes die hier in staan gaan als randvoorwaarde mee naar
// de planner (zie seasonPlanForAi in lib/training/season-data.ts), en wat er
// wringt staat als signalering bovenaan.

import { PageHeader } from "@/components/app-ui";
import { requireViewer, todayKeyAmsterdam } from "../_data";
import { loadSeason } from "./_data";
import { SeasonBand } from "./_components/season-band";
import { SeasonForms } from "./_components/season-forms";
import { SeasonList } from "./_components/season-list";
import { SeasonWarnings } from "./_components/season-warnings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JaarplanPage() {
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();
  const season = await loadSeason(viewer.admin, viewer.user.id, today);

  return (
    <div className="space-y-4">
      <PageHeader title="Jaarplan" />

      <section className="rounded-lg border bg-card p-5">
        <SeasonBand
          from={season.from}
          to={season.to}
          today={season.today}
          plans={season.plans}
          periods={season.periods}
          targets={season.targets}
          events={season.events}
        />
      </section>

      <SeasonWarnings warnings={season.warnings} />

      <SeasonForms todayKey={today} />

      <SeasonList
        today={season.today}
        targets={season.targets}
        periods={season.periods}
        plans={season.plans}
        events={season.events}
        editable
      />
    </div>
  );
}
