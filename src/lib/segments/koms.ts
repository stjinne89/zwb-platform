// ZWB KOM: snelste ZWB'er op een segment met minstens drie ZWB-rijders (migratie 0161).
// ZWB QOM: daarnaast de snelste vrouw op zo'n segment (migratie 0162).
//
// De titels staan in zwb_segment_koms, net als badges in achievement_awards. Triggers
// markeren segmenten waarvan de stand kan zijn veranderd; deze stap in de
// webhook-taak rekent ze in kleine batches na. Live berekenen over alle segmenten liep
// op productie al tegen de statement timeout.

export const KOM_REFRESH_LIMIT = 200;
const KOM_REFRESH_TIMEOUT_MS = 1500;
/** Minder tijd over dan dit: de volgende run pakt het op. */
const KOM_MIN_REMAINING_MS = 1000;

export type SegmentKom = {
  segment_id: string;
  segment_name: string;
  distance_m: number | null;
  average_grade: number | null;
  profile_id: string;
  display_name: string | null;
  seconds: number;
  riders: number;
  achieved_at: string | null;
  title: "kom" | "qom";
};

export const SEGMENT_KOM_COLUMNS =
  "segment_id, segment_name, distance_m, average_grade, profile_id, display_name, seconds, riders, achieved_at, title";

export const KOM_BADGE = {
  kom: { label: "ZWB KOM", color: "gold" },
  qom: { label: "ZWB QOM", color: "platinum" },
} as const;

export type KomRefreshResult = { segments: number } | { skipped: true } | { error: string };

export async function refreshSegmentKoms(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  options: { deadline: number; now?: () => number },
): Promise<KomRefreshResult> {
  const remaining = options.deadline - (options.now ?? Date.now)();
  if (remaining < KOM_MIN_REMAINING_MS) return { skipped: true };
  try {
    const { data, error } = await admin.rpc("refresh_segment_koms", { p_limit: KOM_REFRESH_LIMIT })
      .abortSignal(AbortSignal.timeout(Math.min(KOM_REFRESH_TIMEOUT_MS, remaining)));
    // Zonder migratie of bij een timeout: de segmenten blijven gemarkeerd voor de volgende run.
    return error ? { error: error.message } : { segments: Number(data ?? 0) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "KOM-doorrekening faalde." };
  }
}

export function segmentStravaUrl(segmentId: string) {
  return `https://www.strava.com/segments/${segmentId}`;
}
