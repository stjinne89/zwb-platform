import { formatDateKey } from "@/lib/birthdays";
import { addDays, isoWeekNumber } from "@/lib/weekly-review/period";
import { PUBLISH_WEEKDAY } from "@/lib/app-updates/schedule";
import type { AppUpdate } from "@/lib/app-updates/queries";

/** "Week 44 · 29 oktober": de week en de donderdag waarop hij verscheen. */
export function updateLabel(update: Pick<AppUpdate, "weekStart">): string {
  const thursday = addDays(update.weekStart, PUBLISH_WEEKDAY - 1);
  return `Week ${isoWeekNumber(update.weekStart)} · ${formatDateKey(thursday, { day: "numeric", month: "long" })}`;
}

export function UpdateCard({ update, id }: { update: AppUpdate; id?: string }) {
  return (
    <article id={id} className="scroll-mt-20 space-y-3 rounded-lg border bg-card p-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{updateLabel(update)}</p>
        <p className="text-sm">{update.summary}</p>
      </header>
      <UpdateList title="Nieuw" items={update.changes} />
      <UpdateList title="Opgelost" items={update.fixes} />
    </article>
  );
}

function UpdateList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
