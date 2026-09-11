// Een FTP-test als onderdeel van het schema.
//
// De FTP is het getal waar elk wattage in een training aan hangt. Tot 0131 stond
// hij alleen in profiles.ftp_watts: één keer ingetypt bij je profiel, daarna
// nooit meer gemeten. Een schema van acht weken rekende dus de laatste weken met
// een waarde die het lid allang voorbij was.
//
// Twee protocollen, omdat ze elk iets anders vragen: de ramptest is kort en
// vraagt geen ervaring met doseren, de 20-minutentest ligt dichter bij een echte
// inspanning maar wil dat je jezelf kunt indelen. De omrekenfactoren (0,75 en
// 0,95) zijn de gangbare afspraak, geen natuurwet — vandaar dat we naast de
// afgeleide FTP ook de ruwe meting bewaren.

import type { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWorkoutBlocks, type WorkoutBlock } from "@/lib/training/workouts";

type Admin = ReturnType<typeof createAdminClient>;

export const FTP_TEST_TYPES = ["ramp", "twenty_min"] as const;
export type FtpTestType = (typeof FTP_TEST_TYPES)[number];

export const FTP_TEST_LABELS: Record<FtpTestType, string> = {
  ramp: "Ramptest",
  twenty_min: "20-minutentest",
};

/** Wat het lid na afloop invult; per protocol een andere meting. */
export const FTP_TEST_RESULT_LABELS: Record<FtpTestType, string> = {
  ramp: "Hoogste minuutvermogen",
  twenty_min: "Gemiddeld vermogen over de 20 minuten",
};

/** Over welke duur die meting gaat; daarop zoeken we het beste vermogen van de testdag. */
export const FTP_TEST_RESULT_SECONDS: Record<FtpTestType, number> = {
  ramp: 60,
  twenty_min: 1200,
};

/** Van ruwe meting naar FTP: 75% van de laatste minuut, 95% van twintig minuten. */
const FTP_TEST_FACTORS: Record<FtpTestType, number> = {
  ramp: 0.75,
  twenty_min: 0.95,
};

export function asFtpTestType(value: unknown): FtpTestType | null {
  const text = String(value ?? "").trim();
  return (FTP_TEST_TYPES as readonly string[]).includes(text) ? (text as FtpTestType) : null;
}

export function ftpFromTest(type: FtpTestType, resultWatts: number): number {
  return Math.round(resultWatts * FTP_TEST_FACTORS[type]);
}

export function ftpTestTitle(type: FtpTestType): string {
  return `FTP-test (${type === "ramp" ? "ramp" : "20 min"})`;
}

/**
 * De blokken van de test. Inrijden en uitrijden staan er niet voor de sier: een
 * koude ramptest meet je warmlopen, niet je drempel.
 */
export function ftpTestBlocks(type: FtpTestType): WorkoutBlock[] {
  const blocks: WorkoutBlock[] =
    type === "ramp"
      ? [
          {
            label: "Inrijden",
            durationMinutes: 10,
            target: "50-60%",
            notes: "Rustig op gang, laatste minuten een paar korte versnellingen.",
            intensity: "recovery",
          },
          {
            label: "Oplopende trap",
            durationMinutes: 20,
            target: "60-130%",
            notes: "Elke minuut ongeveer 20 watt erbij. Rijden tot je de cadans niet meer houdt.",
            intensity: "vo2max",
          },
          {
            label: "Uitrijden",
            durationMinutes: 10,
            target: "45-55%",
            notes: "Losdraaien.",
            intensity: "recovery",
          },
        ]
      : [
          {
            label: "Inrijden",
            durationMinutes: 15,
            target: "55-65%",
            notes: "Rustig op gang komen.",
            intensity: "endurance",
          },
          {
            label: "Opener",
            durationMinutes: 5,
            target: "105-115%",
            notes: "Kort scherp, om het systeem open te zetten.",
            intensity: "vo2max",
          },
          {
            label: "Herstel",
            durationMinutes: 10,
            target: "45-55%",
            notes: "Volledig herstellen voor de test.",
            intensity: "recovery",
          },
          {
            label: "Test",
            durationMinutes: 20,
            target: "95-105%",
            notes: "Zo hard als je twintig minuten kunt volhouden. Begin niet te snel.",
            intensity: "threshold",
          },
          {
            label: "Uitrijden",
            durationMinutes: 15,
            target: "45-55%",
            notes: "Losdraaien.",
            intensity: "recovery",
          },
        ];
  return normalizeWorkoutBlocks(blocks, "threshold");
}

export function ftpTestDurationMinutes(type: FtpTestType): number {
  return ftpTestBlocks(type).reduce((total, block) => total + block.durationMinutes, 0);
}

export type FtpTestRow = {
  id: string;
  workoutId: string | null;
  testedOn: string;
  testType: FtpTestType;
  resultWatts: number;
  ftpWatts: number;
};

export type FtpTestWorkout = {
  workoutId: string;
  date: string;
  testType: FtpTestType;
  status: string;
  origin: string;
};

/**
 * Welke test er nog komt, en welke op een uitslag wacht.
 *
 * Tot september 2026 wachtte alleen een test op 'planned' op een uitslag. Maar
 * de ritsync zet een workout op 'completed' zodra er een rit aan hangt — precies
 * op het moment dat je hem gereden hebt — en dan verdween het invulveld. Zo
 * bleven Barts ramptests van 3 en 10 september zonder uitslag. Nu telt alleen of
 * er een uitslag bij hoort, niet de status.
 */
export function pickFtpTestState(
  workouts: FtpTestWorkout[],
  recorded: Array<{ workoutId: string | null; testedOn: string }>,
  todayKey: string,
): { upcoming: FtpTestWorkout | null; awaitingResult: FtpTestWorkout | null } {
  // Eén test per dag. Een test uit de bibliotheek naast een ingeplande test is
  // dezelfde meting; die van het lid gaat voor.
  const byDate = new Map<string, FtpTestWorkout>();
  for (const workout of workouts) {
    if (workout.status === "skipped") continue;
    const current = byDate.get(workout.date);
    if (!current || (current.origin !== "member" && workout.origin === "member")) {
      byDate.set(workout.date, workout);
    }
  }

  // De dag van een uitslag: die van zijn workout als hij eraan hangt, anders de
  // ingevulde testdatum. Een losse uitslag dekt zo ook de test van die dag.
  const dateOf = new Map(workouts.map((workout) => [workout.workoutId, workout.date]));
  const recordedIds = new Set(recorded.flatMap((test) => (test.workoutId ? [test.workoutId] : [])));
  const recordedDates = [
    ...new Set(
      recorded.map((test) => (test.workoutId && dateOf.get(test.workoutId)) || test.testedOn),
    ),
  ].sort();
  const newestRecorded = recordedDates[recordedDates.length - 1] ?? null;

  const open = [...byDate.values()]
    .filter((test) => !recordedIds.has(test.workoutId) && !recordedDates.includes(test.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    upcoming: open.find((test) => test.date > todayKey && test.status === "planned") ?? null,
    // De laatste die geweest is; een test van vandaag mag je 's avonds invullen.
    // Een test van vóór de laatste uitslag is door die uitslag ingehaald.
    awaitingResult:
      [...open]
        .reverse()
        .find(
          (test) => test.date <= todayKey && (newestRecorded == null || test.date > newestRecorded),
        ) ?? null,
  };
}

/**
 * De uitslag vastleggen: de meting bewaren én de FTP van het profiel bijwerken.
 * Dat tweede is de hele reden dat een test in het schema staat — zonder die stap
 * blijft elk wattage in de weken erna op het oude getal gebaseerd.
 *
 * De test gaat voor op intervals.icu: de powerprofiel-sync schuift zijn eFTP
 * niet meer over een profiel dat een testuitslag heeft (zie teams/_actions.ts).
 */
export async function recordFtpTest(
  admin: Admin,
  input: {
    profileId: string;
    workoutId?: string | null;
    testedOn: string;
    testType: FtpTestType;
    resultWatts: number;
    note?: string | null;
    actorId: string;
  },
): Promise<{
  ftpWatts: number;
  previousFtpWatts: number | null;
}> {
  const ftpWatts = ftpFromTest(input.testType, input.resultWatts);
  if (ftpWatts <= 0 || ftpWatts >= 800) {
    throw new Error("Die uitslag levert geen bruikbare FTP op; controleer het vermogen.");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("ftp_watts")
    .eq("id", input.profileId)
    .maybeSingle();

  const { error } = await admin.from("training_ftp_tests").insert({
    profile_id: input.profileId,
    workout_id: input.workoutId ?? null,
    tested_on: input.testedOn,
    test_type: input.testType,
    result_watts: Math.round(input.resultWatts * 10) / 10,
    ftp_watts: ftpWatts,
    note: input.note ?? null,
    created_by: input.actorId,
  });
  if (error) throw new Error(error.message);

  const { error: profileError } = await admin
    .from("profiles")
    .update({ ftp_watts: ftpWatts })
    .eq("id", input.profileId);
  if (profileError) throw new Error(profileError.message);

  return {
    ftpWatts,
    previousFtpWatts: profile?.ftp_watts == null ? null : Number(profile.ftp_watts),
  };
}

/** De laatste tests van een lid, nieuwste eerst. */
export async function loadFtpTests(
  admin: Admin,
  profileId: string,
  limit = 5,
): Promise<FtpTestRow[]> {
  const { data } = await admin
    .from("training_ftp_tests")
    .select("id, workout_id, tested_on, test_type, result_watts, ftp_watts")
    .eq("profile_id", profileId)
    .order("tested_on", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    workoutId: (row.workout_id as string | null) ?? null,
    testedOn: String(row.tested_on).slice(0, 10),
    testType: (asFtpTestType(row.test_type) ?? "ramp") as FtpTestType,
    resultWatts: Number(row.result_watts),
    ftpWatts: Number(row.ftp_watts),
  }));
}
