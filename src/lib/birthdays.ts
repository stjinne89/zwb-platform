const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type BirthdayOccurrence = {
  dateKey: string;
  year: number;
  month: number;
  day: number;
};

export function amsterdamDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function parseDateKey(value: string): BirthdayOccurrence | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { dateKey: value, year, month, day };
}

export function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function birthdayOccurrence(
  birthDate: string,
  year: number,
): BirthdayOccurrence | null {
  const parsed = parseDateKey(birthDate);
  if (!parsed) return null;

  const month = parsed.month;
  const day = month === 2 && parsed.day === 29 && !isLeapYear(year) ? 28 : parsed.day;
  return {
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    year,
    month,
    day,
  };
}

export function nextBirthdayOccurrence(
  birthDate: string,
  todayKey: string,
): BirthdayOccurrence | null {
  const today = parseDateKey(todayKey);
  if (!today) return null;

  const thisYear = birthdayOccurrence(birthDate, today.year);
  if (thisYear && thisYear.dateKey >= todayKey) return thisYear;
  return birthdayOccurrence(birthDate, today.year + 1);
}

export function ageOnBirthday(birthDate: string, celebrationYear: number) {
  const parsed = parseDateKey(birthDate);
  if (!parsed) return null;
  const age = celebrationYear - parsed.year;
  return age >= 0 ? age : null;
}

// Combineer een datum (YYYY-MM-DD) + wandkloktijd (HH:MM of HH:MM:SS) die in
// Europe/Amsterdam zijn bedoeld tot een correcte ISO-timestamp (UTC). Nodig
// omdat birthday_rides datum en tijd los opslaan zonder tijdzone, terwijl de
// liveticker een echte start_at verwacht. Gebruikt de offset-techniek met Intl
// zodat zomer-/wintertijd automatisch klopt.
export function amsterdamWallTimeToIso(
  dateKey: string,
  time: string,
): string | null {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;

  const utcGuess = Date.UTC(parsed.year, parsed.month - 1, parsed.day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcGuess));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asWall = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
  );
  const offset = asWall - utcGuess;
  return new Date(utcGuess - offset).toISOString();
}

export function formatDateKey(
  dateKey: string,
  options: Intl.DateTimeFormatOptions,
) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    ...options,
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12)));
}
