export type MonthCell = {
  dateKey: string;
  /** Valt de dag binnen de getoonde maand of is het een uitloper? */
  inMonth: boolean;
};

export const WEEKDAY_LABELS = ["ma", "di", "wo", "do", "vr", "za", "zo"] as const;

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Zes weken van maandag tot zondag rond de gevraagde maand. UTC-rekenwerk
 * op kale datums; zomertijd speelt hier dus geen rol.
 */
export function monthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // getUTCDay: 0 = zondag. Wij starten op maandag.
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return {
      dateKey: toDateKey(day),
      inMonth: day.getUTCMonth() === month - 1 && day.getUTCFullYear() === year,
    };
  });
}

/** Verschuift maand/jaar met een aantal maanden, voor de bladerknoppen. */
export function shiftMonth(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
