// De nasync-stappen die na binnengekomen ritten moeten draaien.
//
// Stond tot nu toe als één blok in syncStravaActivitiesForUser. Nu er een tweede
// pad bij komt (webhook-events, één rit tegelijk) moest die logica hier naartoe:
// twee kopieën van ~150 regels die uit elkaar gaan lopen is precies hoe badges en
// coltijden stil verschillend worden al naar gelang hoe een rit binnenkwam.
//
// Elke stap is best-effort en faalt stil. Dat is bewust: geen van deze stappen mag
// de ingest van de rit zelf omver trekken.
//
// De opties bepalen hoe zwaar een run is. Het webhook-pad zet de dure, op de hele
// historie werkende stappen uit (watopia-kalibratie, gear) — die horen bij de
// nachtelijke reconcile.

export type PostSyncSteps = {
  /** /athlete ophalen voor fietsen + kilometerstanden. Gethrottled op 1x/24u. */
  gear?: boolean;
  /** ZWBeter Worden-blok in de Strava-beschrijving. Aantal writes; 0 = uit. */
  summaries?: number;
  /** Vereist activity:write in de scope van het lid. */
  hasActivityWriteScope?: boolean;
  /** Geplande workouts afronden waar een rit bij hoort. */
  workoutCompletion?: boolean;
  /** Eenmalige Watopia-summit-coördinaten ophalen via de segment-API. */
  watopiaCalibration?: boolean;
  colsDetector?: boolean;
  zwblokken?: boolean;
  /** Max. dure detailcalls voor coltijden. 0 = uit. */
  colSegmentTimes?: number;
  /**
   * Volledige ZWB-segmentsync. Let op: ook met 0 kost dit calls, want
   * syncZwbSegmentsForUser haalt dan alsnog de authoritatieve PR's op (tot 100x
   * GET /segments/{id}). Alleen zetten in de nachtelijke reconcile.
   */
  zwbSegments?: number;
  /**
   * Alleen de doorrekening van al opgeslagen segment-inspanningen. Puur database,
   * geen enkele Strava-call — dit is wat het webhook-pad nodig heeft, omdat de
   * efforts daar al bij de ingest zijn meegekomen.
   */
  recomputeSegments?: boolean;
  milestones?: boolean;
  /** Ritten die zojuist zijn verwijderd; hun coltijden moeten herberekend. */
  removedActivityIds?: number[];
};

export type PostSyncResult = {
  milestoneAwards: number;
  milestoneErrors: string[];
  colSegmentTimesFetched: number;
  colSegmentTimesUpdated: number;
  colSegmentTimesRateLimited: boolean;
  zwbSegmentsFetched: number;
  zwbSegmentEffortsStored: number;
  zwbSegmentsCompleted: number;
  zwbSegmentsRateLimited: boolean;
  zwbSummariesWritten: number;
  zwbSummariesSkipped: number;
  zwbSummariesRateLimited: boolean;
};

export function emptyPostSyncResult(): PostSyncResult {
  return {
    milestoneAwards: 0,
    milestoneErrors: [],
    colSegmentTimesFetched: 0,
    colSegmentTimesUpdated: 0,
    colSegmentTimesRateLimited: false,
    zwbSegmentsFetched: 0,
    zwbSegmentEffortsStored: 0,
    zwbSegmentsCompleted: 0,
    zwbSegmentsRateLimited: false,
    zwbSummariesWritten: 0,
    zwbSummariesSkipped: 0,
    zwbSummariesRateLimited: false,
  };
}

/**
 * Stappenset voor het webhook-pad: alleen wat goedkoop is en op één verse rit
 * slaat. Gear en Watopia-kalibratie blijven bij de nachtelijke reconcile — die
 * werken op de hele historie en hoeven niet per rit.
 */
export function webhookPostSyncSteps(hasWriteScope: boolean): PostSyncSteps {
  return {
    gear: false,
    summaries: 1,
    hasActivityWriteScope: hasWriteScope,
    workoutCompletion: true,
    watopiaCalibration: false,
    colsDetector: true,
    zwblokken: true,
    // De segment-inspanningen zijn bij de ingest al meegekomen in dezelfde
    // detailcall. De volledige zwbSegments-stap blijft bewust uit: die haalt ook
    // met maxFetches 0 de authoritatieve PR's op, en dat zijn tot 100 calls.
    colSegmentTimes: 0,
    zwbSegments: undefined,
    recomputeSegments: true,
    milestones: true,
  };
}

export async function runPostSyncForProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
  accessToken: string,
  steps: PostSyncSteps,
): Promise<PostSyncResult> {
  const result = emptyPostSyncResult();

  try {
    // Onderhoud: fiets-kilometerstanden + slijtage EERST, vóór het zware werk
    // hieronder. Zo landt de gear-data altijd — ook als de col-detector of de
    // evaluators op een grote historie tegen de functietimeout aanlopen.
    if (steps.gear) {
      try {
        const { syncStravaBikesForUser } = await import("@/lib/strava/client");
        await syncStravaBikesForUser(admin, profileId, accessToken, {
          minIntervalHours: 24,
        });
        const { evaluateMaintenanceForProfile } = await import(
          "@/lib/maintenance/evaluate"
        );
        await evaluateMaintenanceForProfile(admin, profileId);
      } catch {
        // niet kritiek voor de sync-flow
      }
    }

    // ZWBeter Worden-samenvatting in de Strava-beschrijving. Zonder activity:write
    // in de scope slaan we het stil over — dat lid moet Strava eerst opnieuw
    // koppelen.
    const maxSummaryWrites = steps.summaries ?? 0;
    if (maxSummaryWrites > 0 && steps.hasActivityWriteScope) {
      try {
        const { writeZwbSummariesForUser } = await import(
          "@/lib/strava/summary-writer"
        );
        const summaryResult = await writeZwbSummariesForUser(
          admin,
          profileId,
          accessToken,
          { maxWrites: maxSummaryWrites },
        );
        result.zwbSummariesWritten = summaryResult.written;
        result.zwbSummariesSkipped = summaryResult.skipped;
        result.zwbSummariesRateLimited = summaryResult.rateLimited;
      } catch {
        // niet kritiek voor de sync-flow
      }
    }

    // Geplande workouts afronden waar een rit bij hoort, zodat het lid het
    // bevestigscherm krijgt. Hangt alleen aan intervals.icu, dus los van de
    // Strava-scope hierboven.
    if (steps.workoutCompletion) {
      try {
        const { detectCompletedWorkouts } = await import("@/lib/training/completion");
        await detectCompletedWorkouts(admin, profileId);
      } catch {
        // niet kritiek voor de sync-flow
      }
    }

    if (steps.watopiaCalibration) {
      try {
        const { calibrateWatopiaCols } = await import("@/lib/cols/watopia");
        await calibrateWatopiaCols(admin, accessToken);
      } catch {
        // niet kritiek
      }
    }

    if (steps.colsDetector) {
      try {
        const { syncClimbedColsForUser } = await import("@/lib/cols/detector");
        await syncClimbedColsForUser(admin, profileId);
      } catch {
        // niet kritiek voor de sync-flow
      }
    }

    if (steps.zwblokken) {
      try {
        const { syncBlocksForUser } = await import("@/lib/zwblokken/sync");
        await syncBlocksForUser(admin, profileId);
      } catch {
        // niet kritiek voor de sync-flow
      }
    }

    const removedActivityIds = steps.removedActivityIds ?? [];
    if (removedActivityIds.length > 0) {
      try {
        const { repairDeletedColBestTimesForUser } = await import(
          "@/lib/cols/segment-times"
        );
        await repairDeletedColBestTimesForUser(admin, profileId, removedActivityIds);
      } catch {
        // niet kritiek voor de sync-flow
      }
    }

    const maxColSegmentFetches = steps.colSegmentTimes ?? 0;
    if (maxColSegmentFetches > 0) {
      try {
        const { syncColSegmentTimesForUser } = await import(
          "@/lib/cols/segment-times"
        );
        const segmentResult = await syncColSegmentTimesForUser(
          admin,
          accessToken,
          profileId,
          { maxFetches: maxColSegmentFetches },
        );
        result.colSegmentTimesFetched = segmentResult.fetched;
        result.colSegmentTimesUpdated = segmentResult.updated;
        result.colSegmentTimesRateLimited = segmentResult.rateLimited;
      } catch {
        // niet kritiek voor de sync-flow
      }
    }

    if (steps.recomputeSegments) {
      try {
        const { mirrorLegacyColsToSegments, recomputeCompletedSegmentsForUser } =
          await import("@/lib/segments/sync");
        await mirrorLegacyColsToSegments(admin, profileId);
        const completed = await recomputeCompletedSegmentsForUser(admin, profileId);
        result.zwbSegmentsCompleted = completed.completed;
      } catch {
        // niet kritiek voor de sync-flow
      }
    }

    if (steps.zwbSegments != null) {
      try {
        const { syncZwbSegmentsForUser } = await import("@/lib/segments/sync");
        const segmentResult = await syncZwbSegmentsForUser(
          admin,
          accessToken,
          profileId,
          { maxFetches: steps.zwbSegments },
        );
        result.zwbSegmentsFetched = segmentResult.fetched;
        result.zwbSegmentEffortsStored = segmentResult.storedEfforts;
        result.zwbSegmentsCompleted = segmentResult.completed;
        result.zwbSegmentsRateLimited = segmentResult.rateLimited;
      } catch {
        // niet kritiek voor de sync-flow
      }
    }

    if (steps.milestones) {
      const { evaluateMilestonesForUser } = await import(
        "@/lib/achievements/milestone-evaluators"
      );
      const milestoneResult = await evaluateMilestonesForUser(admin, profileId);
      result.milestoneAwards = milestoneResult.awarded;
      result.milestoneErrors = milestoneResult.errors;
    }
  } catch (err) {
    result.milestoneErrors = [
      err instanceof Error ? err.message : "Milestonebadges beoordelen faalde.",
    ];
  }

  return result;
}
