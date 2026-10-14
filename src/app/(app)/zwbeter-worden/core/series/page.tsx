import { lastDoneOn, recommendSeries, recommendStrength } from "@/lib/training/mobility";
import { saveOwnSeries } from "../_actions";
import {
  loadDayContext,
  loadExercises,
  loadSeries,
  loadSessions,
  requireViewer,
  todayKeyAmsterdam,
  type SeriesWithItems,
} from "../_data";
import { SeriesBuilder } from "../_components/series-builder";
import { SeriesCard } from "../_components/series-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Standaardseries in vaste groepen, zodat de gymblokken bij elkaar staan en
 * niet tussen de series voor en na de rit door. */
const GROUPS: { title: string; match: (series: SeriesWithItems) => boolean }[] = [
  { title: "Core en mobiliteit", match: (series) => series.goal !== "kracht" },
  {
    title: "Kracht",
    match: (series) => series.goal === "kracht" && !series.slug.startsWith("gym-"),
  },
  { title: "Gym", match: (series) => series.slug.startsWith("gym-") },
];

export default async function SeriesOverviewPage() {
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();

  const [series, sessions, exercises, dayContext] = await Promise.all([
    loadSeries(viewer),
    loadSessions(viewer, today),
    loadExercises(viewer),
    loadDayContext(viewer, today),
  ]);

  const suggestion = recommendSeries(series, sessions, today, dayContext);
  const strength = recommendStrength(series, sessions, today, dayContext);
  const suggested = (id: string) => id === suggestion?.id || id === strength?.id;

  const standard = series.filter((row) => row.is_standard);
  const own = series.filter((row) => !row.is_standard);

  const cards = (rows: SeriesWithItems[]) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <SeriesCard
          key={row.id}
          series={row}
          items={row.items}
          lastDone={lastDoneOn(sessions, row.id)}
          suggested={suggested(row.id)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => {
        const rows = standard.filter(group.match);
        if (rows.length === 0) return null;
        return (
          <section key={group.title} className="space-y-3">
            <h2 className="font-semibold">{group.title}</h2>
            {cards(rows)}
          </section>
        );
      })}

      {own.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Eigen series</h2>
          {cards(own)}
        </section>
      )}

      <SeriesBuilder exercises={exercises} saveAction={saveOwnSeries} />
    </div>
  );
}
