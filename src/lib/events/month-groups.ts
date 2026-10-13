// Maandscheiders op de kalender: de lijst loopt door, met een kopje bij elke
// maandwissel, ook boven de lopende maand.

export type MonthGroup<T> = {
  /** "2026-11". */
  monthKey: string;
  /** "november", of "januari 2027" zodra het jaar afwijkt van nu. */
  label: string;
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
 * Verdeelt een op datum gesorteerde lijst in groepen per maand. Wat eerder
 * begon dan de lopende maand (een tour die al loopt) valt onder de lopende.
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
    const monthKey = month < currentMonth ? currentMonth : month;
    const last = groups[groups.length - 1];
    if (last && last.monthKey === monthKey) {
      last.items.push(item);
      continue;
    }
    groups.push({
      monthKey,
      label: monthLabel(monthKey, todayKey),
      items: [item],
    });
  }
  return groups;
}
