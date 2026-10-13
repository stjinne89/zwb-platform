// Maandscheiders op de kalender: de lijst loopt door, met een kopje bij elke
// maandwissel. De lopende maand krijgt er geen; daar begint de lijst al mee.

export type MonthGroup<T> = {
  /** "2026-11"; `null` voor alles tot en met de lopende maand. */
  monthKey: string | null;
  /** "november", of "januari 2027" zodra het jaar afwijkt van nu. */
  label: string | null;
  items: T[];
};

function monthLabel(monthKey: string, todayKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", {
    month: "long",
    timeZone: "UTC",
    ...(monthKey.slice(0, 4) === todayKey.slice(0, 4) ? {} : { year: "numeric" }),
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

/**
 * Verdeelt een op datum gesorteerde lijst in groepen per maand. Wat in de
 * lopende maand of eerder begon (een tour die al loopt) blijft samen bovenaan,
 * zonder kopje.
 */
export function groupByMonth<T>(
  items: T[],
  dateKeyOf: (item: T) => string,
  todayKey: string,
): MonthGroup<T>[] {
  const currentMonth = todayKey.slice(0, 7);
  const groups: MonthGroup<T>[] = [];
  for (const item of items) {
    const month = dateKeyOf(item).slice(0, 7);
    const monthKey = month <= currentMonth ? null : month;
    const last = groups[groups.length - 1];
    if (last && last.monthKey === monthKey) {
      last.items.push(item);
      continue;
    }
    groups.push({
      monthKey,
      label: monthKey ? monthLabel(monthKey, todayKey) : null,
      items: [item],
    });
  }
  return groups;
}
