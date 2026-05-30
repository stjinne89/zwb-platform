// Gedeelde context-helper voor de adaptieve dag-coach: wat had de renner
// gisteren gepland vs. wat deed die werkelijk. Gebruikt door zowel de
// renner-actie "pas vandaag aan" als de dagelijkse cron.

type YesterdayContext = {
  plannedTitle: string | null;
  plannedMinutes: number | null;
  plannedIntensity: string | null;
  actualName: string | null;
  actualMinutes: number | null;
  actualLoad: number | null;
};

function amsterdamDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function buildYesterdayContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
  planId: string | null,
): Promise<YesterdayContext | null> {
  const now = Date.now();
  const yesterday = new Date(now - 24 * 3600_000);
  const yKey = amsterdamDayKey(yesterday);
  const fromIso = new Date(now - 48 * 3600_000).toISOString();
  const toIso = new Date(now).toISOString();

  // Geplande workout van gisteren (binnen het actieve plan).
  let plannedTitle: string | null = null;
  let plannedMinutes: number | null = null;
  let plannedIntensity: string | null = null;
  if (planId) {
    const { data: planned } = await admin
      .from("training_workouts")
      .select("title, duration_minutes, intensity, scheduled_at")
      .eq("plan_id", planId)
      .gte("scheduled_at", fromIso)
      .lte("scheduled_at", toIso)
      .order("scheduled_at");
    const match = (planned ?? []).find(
      (w: { scheduled_at: string }) =>
        amsterdamDayKey(new Date(w.scheduled_at)) === yKey,
    );
    if (match) {
      plannedTitle = match.title ?? null;
      plannedMinutes = match.duration_minutes ?? null;
      plannedIntensity = match.intensity ?? null;
    }
  }

  // Werkelijke Strava-rit van gisteren (langste die dag).
  const { data: acts } = await admin
    .from("strava_activities")
    .select("name, moving_time_seconds, start_date")
    .eq("profile_id", profileId)
    .gte("start_date", fromIso)
    .lte("start_date", toIso)
    .order("moving_time_seconds", { ascending: false });
  const actual = (acts ?? []).find(
    (a: { start_date: string }) =>
      amsterdamDayKey(new Date(a.start_date)) === yKey,
  );

  const actualName = actual?.name ?? null;
  const actualMinutes = actual?.moving_time_seconds
    ? Math.round(Number(actual.moving_time_seconds) / 60)
    : null;

  // Niets om mee te geven → null zodat de prompt het kan negeren.
  if (
    plannedTitle == null &&
    plannedMinutes == null &&
    actualName == null &&
    actualMinutes == null
  ) {
    return null;
  }

  return {
    plannedTitle,
    plannedMinutes,
    plannedIntensity,
    actualName,
    actualMinutes,
    actualLoad: null, // strava_activities heeft geen TSS; prompt verwerkt null
  };
}
