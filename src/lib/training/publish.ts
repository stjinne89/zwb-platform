import type { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteIntervalsWorkoutEvent,
  upsertIntervalsWorkoutEvent,
  type IntervalsEvent,
} from "@/lib/intervals/client";
import {
  blocksToIntervalsText,
  blocksToWorkoutDoc,
  estimateTrainingLoad,
  normalizeWorkoutBlocks,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

type Admin = ReturnType<typeof createAdminClient>;

export type PushResult = {
  connected: boolean;
  pushed: number;
  failed: number;
  /** Workouts van andere plannen die door dit schema zijn vervangen. */
  superseded: number;
  /**
   * Workouts van dít plan die tijdens de publicatie zelf werden vervangen. Geen
   * fout: een nieuwer schema heeft ze overgenomen terwijl wij stonden te pushen.
   */
  skipped: number;
};

type SchedulableWorkout = {
  id: string;
  scheduled_at: string;
  publish_status: string;
  intervals_event_id: string | null;
};

/**
 * Verschuift een lid een gepubliceerde workout in intervals.icu, dan volgt ZWB
 * die datum. Alleen datumverschuivingen; hernoemen of verwijderen negeren we.
 * Geeft de bijgewerkte datums terug zodat de aanroeper direct kan renderen.
 */
export async function syncWorkoutDatesFromIntervals<T extends SchedulableWorkout>(
  admin: Admin,
  workouts: T[],
  events: IntervalsEvent[],
): Promise<Map<string, string>> {
  const eventDates = new Map(
    events.map((event) => [String(event.id), String(event.start_date_local).slice(0, 10)]),
  );
  const moved = new Map<string, string>();
  for (const workout of workouts) {
    if (workout.publish_status !== "published" || !workout.intervals_event_id) continue;
    const eventDate = eventDates.get(workout.intervals_event_id);
    if (!eventDate || eventDate === workout.scheduled_at.slice(0, 10)) continue;
    // Tijdstip en tijdzone blijven staan; alleen de datum schuift mee.
    moved.set(workout.id, `${eventDate}${workout.scheduled_at.slice(10)}`);
  }

  await Promise.all(
    Array.from(moved).map(([id, scheduledAt]) =>
      admin.from("training_workouts").update({ scheduled_at: scheduledAt }).eq("id", id),
    ),
  );
  return moved;
}

type SupersedeCandidate = {
  plan_id: string;
  scheduled_at: string;
  status: string;
  origin?: string;
  test_type?: string | null;
};

/** Wat het lid zelf heeft vastgezet; een herziening plant daaromheen. */
const FIXED_ORIGINS = new Set(["member", "event"]);

/**
 * Welke van de gevonden workouts werkelijk vervangen worden.
 *
 * Vijf regels, elk uit een bug:
 * - Alleen wat nog gepland staat. Gereden of gerapporteerde sessies zijn
 *   geschiedenis, geen planning.
 * - Nooit wat het lid zelf heeft vastgezet: een eigen rit of een toegezegd
 *   clubevent is een afspraak, geen voorstel.
 * - Nooit een test. Een FTP-test is een meetmoment dat de trainer heeft gekozen
 *   en waar de wattages van de weken erna aan hangen; een herziening die hem
 *   wegstreept haalt de meting uit het schema en laat het lid met een
 *   uitslagvraag zonder training achter. Dit geldt ook voor een test die uit de
 *   bibliotheek komt en dus origin 'ai' draagt.
 * - Nooit een workout uit een plan dat ná dit plan is gemaakt. Dat is een
 *   recentere beslissing; zonder deze regel streepten twee herzieningen elkaar
 *   volledig weg en bleef er van een hele week niets over.
 * - Buiten een bereik alleen de datums waar dit plan zelf iets neerzet; mét
 *   bereik geldt het hele bereik, zodat een geschrapte trainingsdag ook echt
 *   vervalt.
 */
export function supersedableWorkouts<T extends SupersedeCandidate>(
  candidates: T[],
  options: { newerPlanIds: Set<string>; dayKeys: Set<string>; wholeRange: boolean },
): T[] {
  return candidates.filter(
    (row) =>
      row.status === "planned" &&
      !FIXED_ORIGINS.has(row.origin ?? "ai") &&
      !row.test_type &&
      !options.newerPlanIds.has(row.plan_id) &&
      (options.wholeRange || options.dayKeys.has(String(row.scheduled_at).slice(0, 10))),
  );
}

/**
 * Ruimt de workouts op die door dit schema worden vervangen: workouts van
 * ándere plannen van dit lid op dezelfde datums. Zonder deze stap bleef de oude
 * training na een aanpassing in intervals.icu staan en zag het lid er twee.
 *
 * Met `range` geldt het hele bereik als vervangen, niet alleen de datums waar
 * het nieuwe schema toevallig ook een workout heeft. Dat is nodig bij een
 * bijwerking: die kan een trainingsdag laten vervallen, en zonder bereik zou de
 * oude workout van die dag blijven staan.
 *
 * We markeren ze (superseded_at) in plaats van ze te verwijderen, zodat
 * zichtbaar blijft wat er oorspronkelijk gepland stond. Al gereden of
 * gerapporteerde workouts laten we staan — die zijn geschiedenis, geen planning.
 *
 * Ritten die het lid zelf heeft ingepland (origin 'member') blijven óók staan:
 * die zijn een afspraak, geen voorstel. Een herziening plant eromheen; hem hier
 * wegstrepen zou de clubrit van zaterdag laten verdwijnen.
 */
export async function retireSupersededWorkouts(
  admin: Admin,
  planId: string,
  profileId: string,
  connection: { api_key: string; athlete_id: string } | null,
  range?: { from: string; to: string } | null,
): Promise<number> {
  const { data: incoming } = await admin
    .from("training_workouts")
    .select("scheduled_at")
    .eq("plan_id", planId);
  const dayKeys = new Set(
    (incoming ?? []).map((row) => String(row.scheduled_at).slice(0, 10)),
  );
  if (dayKeys.size === 0 && !range) return 0;

  const days = [...dayKeys].sort();
  const from = range?.from ?? days[0];
  const to = range?.to ?? days[days.length - 1];
  if (!from || !to) return 0;

  // Plannen die ná dit plan zijn gemaakt vertegenwoordigen een recentere
  // beslissing en mogen niet worden weggestreept door een oudere publicatie.
  // Zonder deze grens streepten twee herzieningen elkaar volledig weg: de eerste
  // verving de tweede en de tweede daarna de eerste, waarna er van een hele week
  // geen enkele workout meer overbleef.
  const { data: thisPlan } = await admin
    .from("training_plans")
    .select("created_at")
    .eq("id", planId)
    .maybeSingle();
  const { data: newerPlans } = thisPlan
    ? await admin
        .from("training_plans")
        .select("id")
        .eq("profile_id", profileId)
        .gt("created_at", thisPlan.created_at)
    : { data: [] as { id: string }[] };
  const newerPlanIds = new Set((newerPlans ?? []).map((row) => row.id as string));

  const { data: others } = await admin
    .from("training_workouts")
    .select("id, plan_id, scheduled_at, intervals_event_id, status, origin, test_type")
    .eq("profile_id", profileId)
    .neq("plan_id", planId)
    .is("superseded_at", null)
    .gte("scheduled_at", `${from}T00:00:00`)
    .lte("scheduled_at", `${to}T23:59:59`);

  const superseded = supersedableWorkouts(others ?? [], {
    newerPlanIds,
    dayKeys,
    wholeRange: Boolean(range),
  });
  if (superseded.length === 0) return 0;

  for (const workout of superseded) {
    // Eerst markeren, dan pas wissen. Andersom bleef er een event achter: de
    // publicatie van een ouder plan kon tussen ons lezen en ons wissen in nog
    // een nieuw intervals_event_id op deze rij zetten, en dat id gooiden we er
    // daarna overheen. Zodra superseded_at staat, weigert pushOneWorkout de rij
    // en ligt het event-id vast.
    const { data: retired } = await admin
      .from("training_workouts")
      .update({
        superseded_at: new Date().toISOString(),
        superseded_by_plan_id: planId,
        publish_status: "pending",
      })
      .eq("id", workout.id)
      .is("superseded_at", null)
      .select("id");
    if (!retired || retired.length === 0) continue;
    if (!connection) continue;

    const { data: current } = await admin
      .from("training_workouts")
      .select("intervals_event_id")
      .eq("id", workout.id)
      .maybeSingle();
    if (!current?.intervals_event_id) continue;

    // Alleen leegmaken als het wissen lukte. Blijft het id staan, dan is het
    // event nog te vinden en op te ruimen; nullen we het bij een fout tóch, dan
    // is het spoor weg en staat er voorgoed een blok in intervals.icu dat ZWB
    // niet meer kent.
    const wiped = await deleteIntervalsWorkoutEvent(
      connection.api_key,
      connection.athlete_id,
      current.intervals_event_id,
    ).then(
      () => true,
      () => false,
    );
    if (wiped) {
      await admin
        .from("training_workouts")
        .update({ intervals_event_id: null })
        .eq("id", workout.id);
    }
  }
  return superseded.length;
}

/**
 * Zet alle workouts van een schema in de intervals.icu-kalender. Per workout
 * wordt publish_status bijgewerkt, zodat een mislukte push zichtbaar blijft.
 */
export async function pushPlanWorkoutsToIntervals(
  admin: Admin,
  planId: string,
  profileId: string,
): Promise<PushResult> {
  const [{ data: conn }, { data: riderProfile }, { data: plan }, { data: workouts }] =
    await Promise.all([
      admin
        .from("intervals_connections")
        .select("api_key, athlete_id")
        .eq("profile_id", profileId)
        .maybeSingle(),
      admin.from("profiles").select("ftp_watts").eq("id", profileId).maybeSingle(),
      admin
        .from("training_plans")
        .select("adapt_from_date, end_date")
        .eq("id", planId)
        .maybeSingle(),
      // Vervangen workouts horen niet meer in de kalender. Zonder dit filter
      // zette een herpublicatie van een ouder plan zijn al vervangen sessies
      // opnieuw in intervals.icu — zichtbaar daar, maar onvindbaar in ZWB.
      admin
        .from("training_workouts")
        .select("*")
        .eq("plan_id", planId)
        .is("superseded_at", null)
        .order("scheduled_at", { ascending: true }),
    ]);
  if (!conn?.api_key || !conn?.athlete_id) {
    return { connected: false, pushed: 0, failed: 0, superseded: 0, skipped: 0 };
  }

  // Een bijgewerkt schema vervangt alles vanaf de bijwerkdatum, ook de dagen
  // waar het nu bewust géén training meer plant.
  const range = plan?.adapt_from_date
    ? {
        from: String(plan.adapt_from_date).slice(0, 10),
        to: String(plan.end_date).slice(0, 10),
      }
    : null;

  // Eerst opruimen, dan pas de nieuwe workouts plaatsen: anders staan er kort
  // twee trainingen op dezelfde dag in intervals.icu.
  const superseded = await retireSupersededWorkouts(
    admin,
    planId,
    profileId,
    { api_key: conn.api_key, athlete_id: conn.athlete_id },
    range,
  ).catch(() => 0);

  const riderFtp = riderProfile?.ftp_watts ? Number(riderProfile.ftp_watts) : null;
  let pushed = 0;
  let failed = 0;
  let skipped = 0;
  for (const workout of workouts ?? []) {
    const outcome = await pushOneWorkout(admin, workout as PublishableWorkout, conn, riderFtp);
    if (outcome === "pushed") pushed++;
    else if (outcome === "skipped") skipped++;
    else failed++;
  }

  return { connected: true, pushed, failed, superseded, skipped };
}

type PublishableWorkout = {
  id: string;
  scheduled_at: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  intensity: WorkoutIntensity;
  structure_json: unknown;
  intervals_event_id: string | null;
  intervals_external_id: string | null;
};

type IntervalsAuth = { api_key: string; athlete_id: string };

/** Geplaatst, overgeslagen omdat een nieuwer schema hem overnam, of mislukt. */
type PushOutcome = "pushed" | "skipped" | "failed";

/**
 * Eén workout naar intervals.icu, en de uitkomst vastleggen op de rij zelf.
 *
 * De workoutlijst wordt aan het begin van de publicatie ingelezen en daarna
 * doet de lus er per training een HTTP-call over; een schema van zestig
 * trainingen staat zo een kwartier te pushen. Publiceert er in dat kwartier een
 * tweede schema, dan vervangt dat deze workout terwijl wij hem nog plaatsen.
 *
 * Vandaar twee keer superseded_at: één keer vooraf, zodat we het event meestal
 * niet eens aanmaken, en één keer in de update die de uitkomst wegschrijft.
 * Alleen die tweede is waterdicht, en precies in dat gaatje zijn op 24 augustus
 * 2026 de weesevents ontstaan — geplaatst in intervals.icu, teruggeschreven op
 * een rij die ZWB al vervangen had, en daarna door niets meer opgeruimd. Het lid
 * zag ze als tweede blok naast elke training van de komende twee weken.
 */
async function pushOneWorkout(
  admin: Admin,
  workout: PublishableWorkout,
  conn: IntervalsAuth,
  riderFtp: number | null,
): Promise<PushOutcome> {
  try {
    const { data: fresh } = await admin
      .from("training_workouts")
      .select("superseded_at")
      .eq("id", workout.id)
      .maybeSingle();
    if (fresh?.superseded_at) return "skipped";

    const blocks = normalizeWorkoutBlocks(workout.structure_json, workout.intensity);
    const intervalsText = blocksToIntervalsText(blocks);
    const trainingLoad = estimateTrainingLoad(blocks, riderFtp);
    const externalId = workout.intervals_external_id ?? `zwb-${workout.id}`;
    // intervals.icu parseert de description NIET server-side, dus moeten we
    // zelf een geldig native workout_doc meesturen. Zonder steps bevat de
    // FIT-export 0 stappen en weigeren Garmin/Wahoo het bestand als corrupt.
    const workoutDoc = blocksToWorkoutDoc(blocks, riderFtp);
    const event = await upsertIntervalsWorkoutEvent(conn.api_key, conn.athlete_id, {
      id: workout.intervals_event_id,
      externalId,
      startDateLocal: String(workout.scheduled_at).slice(0, 16),
      name: workout.title,
      description: [intervalsText, workout.description].filter(Boolean).join("\n\n"),
      category: "WORKOUT",
      type: "Ride",
      target: "POWER",
      trainingLoad,
      durationMinutes: workout.duration_minutes,
      workoutDoc,
    });
    const { data: claimed } = await admin
      .from("training_workouts")
      .update({
        intervals_event_id: String(event.id),
        intervals_external_id: externalId,
        publish_status: "published",
        publish_error: null,
      })
      .eq("id", workout.id)
      .is("superseded_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) {
      // Vervangen terwijl de call liep. Het event moet meteen weer weg: laten
      // staan levert een blok in intervals.icu op dat geen enkele actieve
      // workout meer kent, en dat de schemakalender als vreemd event náást de
      // vervanger tekent.
      await deleteIntervalsWorkoutEvent(conn.api_key, conn.athlete_id, String(event.id)).catch(
        () => null,
      );
      return "skipped";
    }
    return "pushed";
  } catch (err) {
    await admin
      .from("training_workouts")
      .update({
        publish_status: "failed",
        publish_error: err instanceof Error ? err.message : "Publicatie faalde.",
      })
      .eq("id", workout.id)
      .is("superseded_at", null);
    return "failed";
  }
}

/**
 * Zet één gewijzigde workout meteen in intervals.icu. Bedoeld voor een losse
 * aanpassing door de trainer: zonder dit bleef de wijziging in ZWB hangen tot
 * iemand het hele schema opnieuw publiceerde, en reed het lid ondertussen de
 * oude versie van zijn fietscomputer.
 *
 * Alleen voor workouts die daar al staan; een nog niet gepubliceerde workout
 * gaat mee met de publicatie van het schema.
 */
export async function pushWorkoutToIntervals(
  admin: Admin,
  workoutId: string,
): Promise<{ connected: boolean; ok: boolean }> {
  const { data: workout } = await admin
    .from("training_workouts")
    .select(
      "id, profile_id, scheduled_at, title, description, duration_minutes, intensity, structure_json, intervals_event_id, intervals_external_id",
    )
    .eq("id", workoutId)
    .maybeSingle();
  if (!workout) return { connected: false, ok: false };

  const [{ data: conn }, { data: riderProfile }] = await Promise.all([
    admin
      .from("intervals_connections")
      .select("api_key, athlete_id")
      .eq("profile_id", workout.profile_id)
      .maybeSingle(),
    admin.from("profiles").select("ftp_watts").eq("id", workout.profile_id).maybeSingle(),
  ]);
  if (!conn?.api_key || !conn?.athlete_id) return { connected: false, ok: false };

  const outcome = await pushOneWorkout(
    admin,
    workout as PublishableWorkout,
    { api_key: conn.api_key, athlete_id: conn.athlete_id },
    riderProfile?.ftp_watts ? Number(riderProfile.ftp_watts) : null,
  );
  return { connected: true, ok: outcome === "pushed" };
}
