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
  testedOn: string;
  testType: FtpTestType;
  resultWatts: number;
  ftpWatts: number;
};

/**
 * De uitslag vastleggen: de meting bewaren én de FTP van het profiel bijwerken.
 * Dat tweede is de hele reden dat een test in het schema staat — zonder die stap
 * blijft elk wattage in de weken erna op het oude getal gebaseerd.
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
  /**
   * Staat het profiel op "bijhouden vanuit intervals.icu", dan overschrijft de
   * eerstvolgende vermogenssync deze waarde met de eFTP van intervals. De test
   * blijft dan wel in de historie staan, maar het lid moet weten dat zijn
   * profiel het getal niet vasthoudt.
   */
  overwrittenByIntervals: boolean;
}> {
  const ftpWatts = ftpFromTest(input.testType, input.resultWatts);
  if (ftpWatts <= 0 || ftpWatts >= 800) {
    throw new Error("Die uitslag levert geen bruikbare FTP op; controleer het vermogen.");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("ftp_watts, auto_sync_physique")
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
    overwrittenByIntervals: Boolean(profile?.auto_sync_physique),
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
    .select("id, tested_on, test_type, result_watts, ftp_watts")
    .eq("profile_id", profileId)
    .order("tested_on", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    testedOn: String(row.tested_on).slice(0, 10),
    testType: (asFtpTestType(row.test_type) ?? "ramp") as FtpTestType,
    resultWatts: Number(row.result_watts),
    ftpWatts: Number(row.ftp_watts),
  }));
}

/**
 * Welke FTP het profiel hoort aan te houden nadat een uitslag is gecorrigeerd of
 * verwijderd.
 *
 * Het profiel volgt de nieuwste test, maar alleen als het die waarde ook echt
 * had: staat er een getal in dat het lid zelf heeft ingetypt of dat uit
 * intervals.icu komt, dan mag een correctie in de historie dat niet stilzwijgend
 * overschrijven. Blijft er na een verwijdering geen enkele test over, dan laten
 * we het profiel staan — elk wattage in een schema hangt eraan, dus het leeghalen
 * is schadelijker dan een verouderd getal. Het lid krijgt dat wel te zien.
 */
export function profileFtpAfterChange(input: {
  /** De FTP die nu in het profiel staat. */
  profileFtpWatts: number | null;
  /** De FTP van de gewijzigde of verwijderde test, zoals hij in de historie stond. */
  changedFtpWatts: number;
  /** De nieuwste test die er ná de wijziging nog is. */
  latestFtpWatts: number | null;
}): {
  /** De waarde die het profiel na afloop aanhoudt. */
  ftpWatts: number | null;
  /** Moet het profiel worden bijgewerkt? */
  changed: boolean;
  /** Het profiel volgde deze test en er is nu geen test meer om op terug te vallen. */
  withoutTest: boolean;
} {
  const { profileFtpWatts, changedFtpWatts, latestFtpWatts } = input;
  const followed = profileFtpWatts != null && profileFtpWatts === changedFtpWatts;
  if (!followed) return { ftpWatts: profileFtpWatts, changed: false, withoutTest: false };
  if (latestFtpWatts == null) {
    return { ftpWatts: profileFtpWatts, changed: false, withoutTest: true };
  }
  return {
    ftpWatts: latestFtpWatts,
    changed: latestFtpWatts !== profileFtpWatts,
    withoutTest: false,
  };
}

export type FtpTestChange = {
  /** De FTP die het profiel na afloop aanhoudt. */
  profileFtpWatts: number | null;
  /** Wat er stond voordat we hem bijwerkten. */
  previousProfileFtpWatts: number | null;
  profileChanged: boolean;
  /** Het profiel hing aan deze test en er is er geen meer over. */
  profileWithoutTest: boolean;
  /** Zie recordFtpTest: een profiel dat intervals.icu volgt houdt dit getal niet vast. */
  overwrittenByIntervals: boolean;
};

/** De nieuwste uitslag van een lid, of null als er geen test meer is. */
async function latestFtpTestFtp(admin: Admin, profileId: string): Promise<number | null> {
  const { data } = await admin
    .from("training_ftp_tests")
    .select("ftp_watts, tested_on, created_at")
    .eq("profile_id", profileId)
    .order("tested_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);
  const row = (data ?? [])[0];
  return row ? Number(row.ftp_watts) : null;
}

/** Het profiel achter de gecorrigeerde historie aan trekken. */
async function syncProfileToLatestTest(
  admin: Admin,
  profileId: string,
  changedFtpWatts: number,
): Promise<FtpTestChange> {
  const { data: profile } = await admin
    .from("profiles")
    .select("ftp_watts, auto_sync_physique")
    .eq("id", profileId)
    .maybeSingle();
  const current = profile?.ftp_watts == null ? null : Number(profile.ftp_watts);
  const outcome = profileFtpAfterChange({
    profileFtpWatts: current,
    changedFtpWatts,
    latestFtpWatts: await latestFtpTestFtp(admin, profileId),
  });

  if (outcome.changed && outcome.ftpWatts != null) {
    const { error } = await admin
      .from("profiles")
      .update({ ftp_watts: outcome.ftpWatts })
      .eq("id", profileId);
    if (error) throw new Error(error.message);
  }

  return {
    profileFtpWatts: outcome.ftpWatts,
    previousProfileFtpWatts: current,
    profileChanged: outcome.changed,
    profileWithoutTest: outcome.withoutTest,
    overwrittenByIntervals: Boolean(profile?.auto_sync_physique),
  };
}

/** De uitslag zoals hij in de historie staat, met de eigenaarscontrole erbij. */
async function ownFtpTest(admin: Admin, testId: string, profileId: string) {
  const { data } = await admin
    .from("training_ftp_tests")
    .select("id, profile_id, workout_id, ftp_watts")
    .eq("id", testId)
    .maybeSingle();
  if (!data || data.profile_id !== profileId) throw new Error("Deze test hoort niet bij jou.");
  return {
    workoutId: (data.workout_id as string | null) ?? null,
    ftpWatts: Number(data.ftp_watts),
  };
}

/**
 * Een uitslag corrigeren. De ruwe meting wordt met de hand ingetypt en gaat dus
 * soms mis; zonder correctie blijft die typefout niet alleen in de historie
 * staan maar ook in de FTP waar elk wattage in het schema aan hangt.
 *
 * De FTP blijft afgeleid: hij volgt uit meting en protocol, precies zoals bij
 * het opslaan. Zo kan een correctie geen combinatie opleveren die met de
 * omrekenfactor in strijd is.
 */
export async function updateFtpTest(
  admin: Admin,
  input: {
    testId: string;
    profileId: string;
    testedOn: string;
    testType: FtpTestType;
    resultWatts: number;
  },
): Promise<FtpTestChange & { ftpWatts: number }> {
  const existing = await ownFtpTest(admin, input.testId, input.profileId);

  const ftpWatts = ftpFromTest(input.testType, input.resultWatts);
  if (ftpWatts <= 0 || ftpWatts >= 800) {
    throw new Error("Die uitslag levert geen bruikbare FTP op; controleer het vermogen.");
  }

  const { error } = await admin
    .from("training_ftp_tests")
    .update({
      tested_on: input.testedOn,
      test_type: input.testType,
      result_watts: Math.round(input.resultWatts * 10) / 10,
      ftp_watts: ftpWatts,
    })
    .eq("id", input.testId)
    .eq("profile_id", input.profileId);
  if (error) throw new Error(error.message);

  return { ...(await syncProfileToLatestTest(admin, input.profileId, existing.ftpWatts)), ftpWatts };
}

/**
 * Een uitslag verwijderen.
 *
 * Hoorde er een testworkout bij, dan gaat die terug naar 'planned'. Dat is geen
 * kosmetiek: loadFtpTestState() leest "afgerond" als "uitslag is er", dus een
 * afgeronde test zonder meting zou nergens meer om een uitslag vragen.
 */
export async function deleteFtpTest(
  admin: Admin,
  input: { testId: string; profileId: string },
): Promise<FtpTestChange & { workoutReopened: boolean }> {
  const existing = await ownFtpTest(admin, input.testId, input.profileId);

  const { error } = await admin
    .from("training_ftp_tests")
    .delete()
    .eq("id", input.testId)
    .eq("profile_id", input.profileId);
  if (error) throw new Error(error.message);

  let workoutReopened = false;
  if (existing.workoutId) {
    const { data: reopened } = await admin
      .from("training_workouts")
      .update({ status: "planned" })
      .eq("id", existing.workoutId)
      .eq("profile_id", input.profileId)
      .eq("status", "completed")
      .select("id");
    workoutReopened = (reopened ?? []).length > 0;
  }

  return {
    ...(await syncProfileToLatestTest(admin, input.profileId, existing.ftpWatts)),
    workoutReopened,
  };
}
