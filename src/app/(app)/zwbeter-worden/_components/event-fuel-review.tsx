import { Bike } from "lucide-react";
import { formatRideMinute } from "@/lib/nutrition/ride-plan";
import type { EventFuelReview } from "@/lib/nutrition/event-review";

const grams = (value: number | null, atLeast = false) => (value == null ? "—" : `${atLeast ? "≥ " : ""}${value} g`);

/** Na het event: het plan naast wat je reed en at (stap 8 van docs/eventvoeding-plan.md). */
export function EventFuelReviewCard({ review }: { review: EventFuelReview }) {
  const { plan, ridden, eaten } = review;
  const work = [
    ridden.kj != null ? `${ridden.kj} kJ` : null,
    ridden.intensityFactor != null ? `IF ${ridden.intensityFactor.toFixed(2).replace(".", ",")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const rows: { label: string; plan: string; actual: string; note?: string }[] = [
    { label: "Duur", plan: formatRideMinute(plan.minutes), actual: formatRideMinute(ridden.minutes) },
    { label: "Verbruik", plan: grams(plan.burnG), actual: grams(ridden.burnG), note: work || undefined },
  ];
  if (eaten) {
    rows.push(
      { label: "Gegeten", plan: grams(plan.eatG), actual: grams(eaten.carbsG, eaten.incomplete) },
      { label: "Per uur", plan: grams(plan.perHourG), actual: grams(eaten.perHourG, eaten.incomplete) },
    );
  }
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <Bike className="size-4 text-primary" />
        Na afloop
      </h4>
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 font-normal" />
            <th className="py-1 text-right font-normal">Plan</th>
            <th className="py-1 text-right font-normal">Echt</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="py-1.5 text-left font-normal text-muted-foreground">
                {row.label}
              </th>
              <td className="py-1.5 text-right">{row.plan}</td>
              <td className="py-1.5 text-right">
                {row.actual}
                {row.note ? <span className="block text-xs text-muted-foreground">{row.note}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
