import { loadSymptomLoadForAi } from "@/lib/training/symptoms";
import { createAdminClient } from "@/lib/supabase/admin";
import { adaptiveDailyPrompt } from "@/lib/training/workouts";
import { buildTodayRides, buildYesterdayContext } from "@/lib/training/adapt-context";
import {
  availabilityNeedsReplan,
  clearReplanPending,
  loadPendingReplan,
  planIsIgnored,
} from "@/lib/training/replan";
import { availabilityForAi, loadFixedWorkouts, mondayKey } from "@/lib/training/availability";
import { loadFtpTests, profileForAi } from "@/lib/training/ftp-test";
import type { TrainingAiInput } from "@/lib/training/ai";
import {
  buildIntervalsLoad,
  buildRecentLoad,
  finishAiGeneration,
  startBackgroundAdaptation,
  startPlanUpdate,
  STALE_GENERATION_MINUTES,
} from "@/lib/training/draft";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { amsterdamWallTimeToIso } from "@/lib/birthdays";
import { checkCronSecret } from "@/lib/cron/auth";
import { onePlanPerProfile } from "@/lib/training/active-plan";

/**
 * Hoe lang een voorstel blijft staan. Daarna is het achterhaald: het ging over
 * de trainingen van die dag, en die zijn inmiddels geweest.
 */
const PROPOSAL_TTL_DAYS = 3;

/**
 * Hoeveel volledige herzieningen deze run mag draaien. Een herziening is een
 * hele generatie over het resterende schema en duurt dus veel langer dan een
 * dagvoorstel; zonder plafond loopt de run bij een drukke dag tegen de
 * functietimeout. Wie er vandaag buiten valt, is de volgende ochtend aan de beurt —
 * de wijziging blijft immers nieuwer dan de laatste herziening.
 */
const MAX_PLAN_UPDATES_PER_RUN = 5;

/**
 * Hoeveel generaties we per run mogen uitzetten.
 *
 * Uitzetten is goedkoop vergeleken met wachten, maar het aanmelden bij OpenAI mag
 * tot vijftien seconden duren. Een paar per run past ruim binnen de
 * Netlify-invocatie; twintig niet. De cron draait elk uur, dus de rij komt er
 * vanzelf doorheen — en de dagcheck per schema zorgt dat niemand twee keer aan de
 * beurt komt.
 */
const MAX_GENERATIONS_STARTED_PER_RUN = Math.max(
  1,
  Math.min(10, Number.parseInt(process.env.TRAINING_ADAPTATION_MAX_STARTS ?? "", 10) || 3),
);

/**
 * En hoe oud hij hoogstens mag zijn om nog afgemaakt te worden.
 *
 * Dit is geen zuinigheid maar veiligheid. Een herziening beslaat de periode vanaf
 * de dag dat hij is aangevraagd; maak je er twee weken later alsnog een schema
 * van, dan is dat schema het nieuwste en overschrijft het de trainingen die het
 * lid inmiddels heeft — met een voorstel dat op verouderde gegevens rust. Wat de
 * nacht erna wordt opgepakt is nog actueel; wat ouder is, is dat niet.
 */
const STALE_GENERATION_MAX_HOURS = 18;

/** Plafond per run, zodat één nacht niet twintig OpenAI-calls achter elkaar doet. */
const MAX_STALE_GENERATIONS_PER_RUN = 10;

/**
 * Noodrem: zoveel dagvoorstellen mag deze cron per Amsterdamse dag hoogstens uitzetten,
 * over alle leden samen. Herzieningen vallen erbuiten; die hebben een eigen
 * plafond per run en verdwijnen zodra het verzoek is ingelost.
 *
 * De dagcheck hoort het al op één per schema te houden. Maar van 11 tot en met 13
 * september 2026 werkte die niet en zette elke kwartierrun opnieuw een voorstel
 * uit voor dezelfde schema's: zo'n 50 gpt-5.5-calls per dag voor drie leden. Een
 * plafond op het totaal maakt zo'n fout voortaan een kleine rekening in plaats van
 * een grote.
 */
const MAX_GENERATIONS_STARTED_PER_DAY = Math.max(
  1,
  Number.parseInt(process.env.TRAINING_ADAPTATION_MAX_PER_DAY ?? "", 10) || 25,
);

/**
 * Wall-clock budget voor de hele run.
 *
 * Netlify kapt een functie rond de tien seconden af, en dan is de respons weg —
 * inclusief het overzicht van wat er wél is gelukt. Beide lussen kijken hierop,
 * zodat de route altijd netjes terugkomt en vertelt waar hij is gebleven. De rest
 * volgt het uur erna; alles hier is idempotent.
 */
const RUN_BUDGET_MS = 8000;

/**
 * Welk deel daarvan het ophalen hoogstens mag kosten.
 *
 * Ophalen gaat vóór uitzetten, en één afronding (poll bij OpenAI plus het
 * opbouwen van een schema) kan al seconden duren. Zonder deze reservering vreet
 * een rij wachtende generaties het hele budget op en wordt er run na run niets
 * nieuws gestart — dan loopt de achterstand op in plaats van weg. Nu houdt elke
 * run ruimte over om ook te beginnen.
 */
const FINISH_BUDGET_SHARE = 0.6;

type PlanRow = {
  id: string;
  profile_id: string;
  trainer_id: string | null;
  goal_id: string | null;
  title: string;
  end_date: string;
  root_plan_id: string | null;
  created_at: string;
  status: string;
  updated_at: string | null;
};

function since(days: number) {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

/**
 * Lopende schema's om een voorstel voor te maken. Alleen basisplannen: een
 * eerdere aanpassing is zelf geen schema, en zou een voorstel op een voorstel
 * opleveren. En één per lid; zie onePlanPerProfile.
 */
async function latestPlanCandidates(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("training_plans")
    .select(
      "id, profile_id, trainer_id, goal_id, title, end_date, root_plan_id, created_at, status, updated_at",
    )
    .is("parent_plan_id", null)
    .in("status", ["approved", "published"])
    .gte("end_date", amsterdamDayKey())
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return onePlanPerProfile((data ?? []) as PlanRow[]).slice(0, 25);
}

/**
 * Heeft dit schema vandaag al een run of een generatie gehad?
 *
 * Op de generatie kijken en niet alleen op training_adaptation_runs: die tabel
 * kent geen status 'queued', dus de rij die bij het uitzetten de dagcheck moest
 * bezetten werd stilletjes geweigerd. Elke kwartierrun zag dan niets en startte
 * een nieuwe generatie. De generatierij wordt vóór de OpenAI-call geschreven en
 * is er dus altijd.
 *
 * Dit is een snelle voorselectie, geen grendel: tussen deze check en de insert
 * zitten seconden. Twee overlappende runs houdt de unieke index uit migratie 0153
 * uit elkaar; startBackgroundAdaptation meldt dat als `duplicate`.
 */
async function handledToday(
  admin: ReturnType<typeof createAdminClient>,
  plan: PlanRow,
  dayStart: string,
): Promise<boolean> {
  const [{ data: runs }, { data: generations }] = await Promise.all([
    admin
      .from("training_adaptation_runs")
      .select("id")
      .eq("profile_id", plan.profile_id)
      .eq("source_plan_id", plan.id)
      .gte("created_at", dayStart)
      .limit(1),
    admin
      .from("training_ai_generations")
      .select("id")
      .eq("parent_plan_id", plan.id)
      .in("adaptation_kind", ["daily", "plan_update"])
      .gte("created_at", dayStart)
      .limit(1),
  ]);
  return (runs ?? []).length > 0 || (generations ?? []).length > 0;
}

/** Hoeveel generaties de cron vandaag al heeft uitgezet; voor de noodrem. */
async function generationsStartedToday(
  admin: ReturnType<typeof createAdminClient>,
  dayStart: string,
): Promise<number> {
  const { count } = await admin
    .from("training_ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("adaptation_kind", "daily")
    .gte("created_at", dayStart);
  return count ?? 0;
}

/**
 * Voorstellen die niemand heeft opgepakt en die over een voorbije dag gingen.
 * Zonder dit blijven ze in het schema hangen als suggestie voor gisteren.
 */
async function archiveStaleProposals(admin: ReturnType<typeof createAdminClient>) {
  const cutoff = new Date(Date.now() - PROPOSAL_TTL_DAYS * 86400_000).toISOString();
  const { data } = await admin
    .from("training_plans")
    .update({ status: "archived" })
    .eq("adaptation_kind", "daily")
    .eq("status", "draft")
    .or(`created_at.lt.${cutoff},adapt_from_date.lt.${amsterdamDayKey()}`)
    .select("id");
  return (data ?? []).length;
}

type ReplanTrigger = {
  /** Waarom er herzien wordt; komt in de reden van het bijgewerkte schema. */
  reason: string;
  /** 'request' = vastgelegd verzoek, 'availability' = afgeleid uit tijdstempels. */
  source: "request" | "availability";
  at: string;
};

/**
 * Ligt er voor dit lid een herziening klaar die overdag niet is gelukt?
 *
 * Twee bronnen, in deze volgorde. Het vastgelegde verzoek
 * (`training_replan_requests`) is de gewone weg: elke wijziging die om een
 * herziening vraagt zet er een, en hij verdwijnt zodra er een schema uit is
 * gekomen. Dat dekt ook een afmelding, waarbij het blok uit het schema wordt
 * verwijderd en er dus niets meer valt af te lezen.
 *
 * Daarnaast blijft de afleiding op beschikbaarheid staan als terugval: die
 * wijziging is achteraf nog zichtbaar, dus een verzoek dat nooit is vastgelegd
 * (of van vóór migratie 0132 dateert) valt daar alsnog op.
 */
async function pendingReplanFor(
  admin: ReturnType<typeof createAdminClient>,
  plan: PlanRow,
  todayKey: string,
): Promise<ReplanTrigger | null> {
  // Zelfde rem als overdag: een schema dat stilligt herzien we niet, ook niet
  // in de automatische run. Het verzoek blijft staan tot het lid weer rijdt.
  if (await planIsIgnored(admin, plan.profile_id).catch(() => false)) return null;

  const request = await loadPendingReplan(admin, plan.profile_id).catch(() => null);
  if (request) {
    return { reason: request.reason, source: "request", at: request.requestedAt };
  }

  const changedAt = await availabilityChangedSinceRevision(admin, plan, todayKey).catch(
    () => null,
  );
  if (!changedAt) return null;
  return {
    reason: "Je beschikbaarheid is aangepast.",
    source: "availability",
    at: changedAt,
  };
}

/**
 * Beschikbaarheid die is gewijzigd nadat het schema voor het laatst is herzien.
 *
 * Bij het opslaan vraagt het lid al meteen een herziening aan, maar die kan zijn
 * overgeslagen: de cooldown van vijf minuten, een generatie die niemand heeft
 * opgehaald, of een mislukte call. Zonder deze controle bleef zo'n wijziging
 * liggen tot het lid toevallig iets anders deed.
 *
 * Vergeleken wordt met het laatste moment waarop het schema de beschikbaarheid
 * werkelijk heeft verwerkt: het aanmaken van het basisplan, of een geslaagde
 * herziening daarna. Een dagaanpassing telt niet mee — die laat de verdere
 * toekomst juist met rust en kan een gewijzigde week dus niet hebben verwerkt.
 *
 * Weken die al voorbij zijn tellen ook niet mee: daar valt niets meer aan te
 * plannen.
 */
async function availabilityChangedSinceRevision(
  admin: ReturnType<typeof createAdminClient>,
  plan: PlanRow,
  todayKey: string,
): Promise<string | null> {
  const weekFloor = mondayKey(todayKey);
  const [{ data: availability }, { data: lastUpdate }] = await Promise.all([
    admin
      .from("training_availability")
      .select("updated_at")
      .eq("profile_id", plan.profile_id)
      .or(`week_start.is.null,week_start.gte.${weekFloor}`)
      .order("updated_at", { ascending: false })
      .limit(1),
    admin
      .from("training_ai_generations")
      .select("created_at")
      .eq("profile_id", plan.profile_id)
      .eq("adaptation_kind", "plan_update")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const changedAt = (availability ?? [])[0]?.updated_at as string | undefined;
  const needed = availabilityNeedsReplan(
    changedAt,
    plan.created_at,
    lastUpdate?.created_at ? String(lastUpdate.created_at) : null,
  );
  return needed ? (changedAt as string) : null;
}

/**
 * Generaties die zijn blijven hangen alsnog afmaken.
 *
 * Een achtergrondgeneratie wordt pas een schema zodra iemand hem ophaalt, en dat
 * deed tot nu toe alleen de browser van het lid. Sloot dat tabblad, dan bleef de
 * generatie eeuwig op 'queued' of 'in_progress' staan: op 20 augustus 2026 gold
 * dat voor 20 van de 79 generaties, sommige weken oud. Allemaal betaald, geen
 * enkele een schema.
 */
async function finishStaleGenerations(
  admin: ReturnType<typeof createAdminClient>,
  results: Array<{ profileId: string; status: string; draftPlanId?: string; error?: string }>,
  deadline: number,
): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_GENERATION_MINUTES * 60_000).toISOString();
  const tooOld = new Date(Date.now() - STALE_GENERATION_MAX_HOURS * 3600_000).toISOString();

  // Te oud om nog een schema van te maken: afsluiten, niet uitvoeren. Anders
  // blijft de cron ze elke nacht opnieuw zien én zou hij er een schema van maken
  // dat het huidige overschrijft.
  const { data: verlopen } = await admin
    .from("training_ai_generations")
    .update({ status: "failed", error: "Niet afgemaakt binnen de tijd; verlopen." })
    .in("status", ["queued", "in_progress"])
    .lt("created_at", tooOld)
    .select("id");

  const { data: stale } = await admin
    .from("training_ai_generations")
    .select("id, profile_id, trainer_id, adaptation_kind, created_at")
    .in("status", ["queued", "in_progress"])
    .lt("created_at", cutoff)
    .gte("created_at", tooOld)
    .order("created_at", { ascending: true })
    .limit(MAX_STALE_GENERATIONS_PER_RUN);

  if ((verlopen ?? []).length > 0) {
    results.push({
      profileId: "-",
      status: `expired_${(verlopen ?? []).length}`,
    });
  }

  let afgemaakt = 0;
  for (const row of stale ?? []) {
    // Elke afronding is een poll bij OpenAI plus, als hij klaar is, het opbouwen
    // van een schema. Tien daarvan passen niet gegarandeerd in één invocatie.
    if (Date.now() > deadline) break;

    const outcome = await finishAiGeneration(admin, row.id as string).catch((err) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : "Ophalen faalde.",
    }));

    // Nog steeds onderweg is geen fout: OpenAI is er dan zelf nog mee bezig.
    const nogBezig =
      outcome.ok && (outcome.status === "queued" || outcome.status === "in_progress");
    if (nogBezig) continue;

    if (outcome.ok && outcome.planId) afgemaakt += 1;
    // Klaar, maar zonder schema: een dagvoorstel waar niets uit kwam om neer te
    // zetten. Dat is geen fout; zie createPlanFromAiGeneration.
    const nietsTeDoen = outcome.ok && outcome.status === "completed" && !outcome.planId;

    await admin.from("training_adaptation_runs").insert({
      profile_id: row.profile_id,
      trainer_id: row.trainer_id,
      status: outcome.ok && outcome.planId ? "completed" : nietsTeDoen ? "skipped" : "failed",
      draft_plan_id: outcome.ok ? outcome.planId ?? null : null,
      input_json: {
        trigger: "stale_generation",
        generationId: row.id,
        kind: row.adaptation_kind ?? "basis",
        startedAt: row.created_at,
      },
      error: outcome.ok ? (outcome.error ?? null) : outcome.error,
    });
    results.push({
      profileId: row.profile_id as string,
      status:
        outcome.ok && outcome.planId
          ? "generation_finished"
          : nietsTeDoen
            ? "generation_no_change"
            : "generation_failed",
      draftPlanId: outcome.ok ? outcome.planId : undefined,
      error: outcome.ok ? outcome.error : outcome.error,
    });
  }
  return afgemaakt;
}

export async function POST(request: Request) {
  const auth = checkCronSecret(request, "TRAINING_ADAPTATION_SECRET");
  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.message }, { status: 401 });
  }

  const admin = createAdminClient();
  const deadline = Date.now() + RUN_BUDGET_MS;
  const results: Array<{ profileId: string; status: string; draftPlanId?: string; error?: string }> = [];

  try {
    const archived = await archiveStaleProposals(admin).catch(() => 0);

    // Eerst het werk dat al betaald is: generaties die op iemand wachtten.
    const finishedGenerations = await finishStaleGenerations(
      admin,
      results,
      Date.now() + RUN_BUDGET_MS * FINISH_BUDGET_SHARE,
    ).catch(() => 0);

    let planUpdatesRun = 0;
    let generationsStarted = 0;
    // Eén dag is een Amsterdamse dag, net als adapt_from_date van het voorstel.
    // Met een UTC-grens kon een run tussen 00:00 en 02:00 's nachts (zomertijd)
    // nog als "gisteren" tellen en daarna na middernacht UTC een tweede voorstel
    // voor dezelfde Amsterdamse dag uitzetten.
    const today = amsterdamDayKey();
    const dayStart = amsterdamWallTimeToIso(today, "00:00") ?? `${today}T00:00:00.000Z`;
    let dailyStartedToday = await generationsStartedToday(admin, dayStart);

    for (const plan of await latestPlanCandidates(admin)) {
      // Plafond of budget bereikt: de rest komt volgend uur. Niet doorgaan, want
      // elke start kost tot vijftien seconden en de invocatie stopt na een
      // seconde of tien.
      if (generationsStarted >= MAX_GENERATIONS_STARTED_PER_RUN) break;
      if (Date.now() > deadline) break;

      if (await handledToday(admin, plan, dayStart)) continue;

      // Ligt er een herziening klaar, dan is een dagvoorstel het verkeerde
      // gereedschap: dat laat de verdere toekomst met rust, terwijl de wijziging
      // vaak juist over een latere week gaat. Dan draait hier een volledige
      // herziening, en die vervangt het automatische dagvoorstel — hij kijkt
      // naar dezelfde signalen en beslaat meer.
      if (planUpdatesRun < MAX_PLAN_UPDATES_PER_RUN) {
        const trigger = await pendingReplanFor(admin, plan, today);
        if (trigger) {
          planUpdatesRun += 1;
          const runLog = { trigger: trigger.source, reason: trigger.reason, at: trigger.at };
          try {
            // Uitzetten, niet uitvoeren: startPlanUpdate meldt de generatie aan bij
            // OpenAI en geeft meteen terug. finishStaleGenerations pikt hem een
            // van de volgende uren op en maakt er het schema van.
            const update = await startPlanUpdate({
              admin,
              planId: plan.id,
              actorId: plan.profile_id,
              reason: `${trigger.reason} Het schema is automatisch herzien.`,
              authorized: true,
            });
            generationsStarted += 1;

            // Geen AI-fout maar een structurele: het schema is afgelopen, hangt
            // niet aan een doel, of is verdwenen. Morgen lukt het dan ook niet,
            // dus het verzoek gaat weg in plaats van elke nacht een poging te
            // kosten.
            if (!update.ok) {
              await clearReplanPending(admin, plan.profile_id, new Date().toISOString());
              await admin.from("training_adaptation_runs").insert({
                profile_id: plan.profile_id,
                trainer_id: plan.trainer_id,
                source_plan_id: plan.id,
                status: "skipped",
                input_json: { ...runLog, error: update.error },
              });
              results.push({ profileId: plan.profile_id, status: "skipped", error: update.error });
              continue;
            }
            // Geen rij in training_adaptation_runs: er is nog geen schema, en de
            // generatie zelf bezet de dagcheck (zie handledToday).
            results.push({ profileId: plan.profile_id, status: "plan_update_queued" });
          } catch (err) {
            const error = err instanceof Error ? err.message : "Automatische herziening faalde.";
            await admin.from("training_adaptation_runs").insert({
              profile_id: plan.profile_id,
              trainer_id: plan.trainer_id,
              source_plan_id: plan.id,
              status: "failed",
              input_json: runLog,
              error,
            });
            results.push({ profileId: plan.profile_id, status: "failed", error });
          }
          continue;
        }
      }

      if (dailyStartedToday >= MAX_GENERATIONS_STARTED_PER_DAY) {
        results.push({ profileId: plan.profile_id, status: "daily_cap_reached" });
        continue;
      }

      try {
        const [{ data: recentActivities }, { data: goal }, { data: profile }] =
          await Promise.all([
            admin
              .from("strava_activities")
              .select("distance_m, total_elevation_gain_m, moving_time_seconds")
              .eq("profile_id", plan.profile_id)
              .gte("start_date", since(1)),
            plan.goal_id
              ? admin.from("training_goals").select("*").eq("id", plan.goal_id).maybeSingle()
              : Promise.resolve({ data: null }),
            admin
              .from("profiles")
              .select("display_name, ftp_watts, weight_kg, zrl_category, sex")
              .eq("id", plan.profile_id)
              .single(),
          ]);

        if (!recentActivities || recentActivities.length === 0 || !goal || !profile) {
          await admin.from("training_adaptation_runs").insert({
            profile_id: plan.profile_id,
            trainer_id: plan.trainer_id,
            source_plan_id: plan.id,
            status: "skipped",
            input_json: { reason: "Geen nieuwe activiteit of geen doel/profiel." },
          });
          results.push({ profileId: plan.profile_id, status: "skipped" });
          continue;
        }

        // De activiteiten van gisteren zijn alleen de trigger; de AI krijgt de
        // trainingsbelasting over 28 dagen, net als de andere flows.
        const today = amsterdamDayKey();
        const planEnd = String(plan.end_date).slice(0, 10);
        const { wellnessForAi, wellnessInputForAi } = await import("@/lib/training/wellness");
        const [wellness, yesterday, todayRides, recent, intervalsLoad, availability, fixedWorkouts, ftpTests] =
          await Promise.all([
            wellnessForAi(admin, plan.profile_id).catch(() => null),
            buildYesterdayContext(admin, plan.profile_id).catch(() => null),
            buildTodayRides(admin, plan.profile_id).catch(() => []),
            buildRecentLoad(admin, plan.profile_id),
            buildIntervalsLoad(admin, plan.profile_id),
            availabilityForAi(admin, plan.profile_id, today, planEnd),
            loadFixedWorkouts(admin, plan.profile_id, today, planEnd).catch(() => []),
            loadFtpTests(admin, plan.profile_id, 1).catch(() => []),
          ]);

        // Wat er nog gepland staat vanaf vandaag; zonder dit verzint de AI de
        // resterende week opnieuw in plaats van hem aan te passen. Op profiel en
        // datum, niet op plan_id: eerdere aanpassingen wonen in afgeleide plannen.
        // Zonder de vaste afspraken: die staan al in fixedWorkouts. Stonden ze hier
        // óók, dan gaf de AI de ZRL-race van vandaag terug als "de aangepaste
        // training" en kwam er een kopie naast het clubevent (22 september 2026).
        const { data: planned } = await admin
          .from("training_workouts")
          .select("scheduled_at, title, duration_minutes, intensity")
          .eq("profile_id", plan.profile_id)
          .is("superseded_at", null)
          .eq("status", "planned")
          .not("origin", "in", "(member,event)")
          .is("test_type", null)
          .gte("scheduled_at", `${today}T00:00:00`)
          .lte("scheduled_at", `${planEnd}T23:59:59`)
          .order("scheduled_at", { ascending: true });

        const input: TrainingAiInput = {
          athleteName: profile.display_name ?? "ZWB-lid",
          goal: {
            title: goal.title,
            type: goal.goal_type,
            targetDate: goal.target_date,
            availableDays: goal.available_days ?? [],
            maxHoursPerWeek: goal.max_hours_per_week ? Number(goal.max_hours_per_week) : null,
            preferredMode: goal.preferred_mode,
            experienceLevel: goal.experience_level,
            desiredIntensity: goal.desired_intensity,
            riskNotes: goal.risk_notes,
          },
          profile: profileForAi(profile, ftpTests[0]?.testedOn ?? null),
          symptoms: await loadSymptomLoadForAi(admin, plan.profile_id),
          recentLoad: recent,
          wellness: wellnessInputForAi(wellness),
          intervalsLoad,
          availability,
          fixedWorkouts,
          todayRides,
          yesterday,
          currentPlan: {
            title: plan.title,
            fromDate: today,
            toDate: planEnd,
            workouts: (planned ?? []).map((workout) => ({
              date: String(workout.scheduled_at).slice(0, 10),
              title: workout.title as string,
              durationMinutes: Number(workout.duration_minutes ?? 0),
              intensity: workout.intensity as string,
            })),
          },
        };

        // Uitzetten, niet uitvoeren. Het voorstel wordt een schema zodra
        // finishStaleGenerations 'm ophaalt, een van de volgende uren.
        const started = await startBackgroundAdaptation({
          admin,
          input,
          prompt: adaptiveDailyPrompt(),
          profileId: plan.profile_id,
          trainerId: plan.trainer_id,
          goalId: plan.goal_id,
          parentPlanId: plan.id,
          adaptationKind: "daily",
          adaptationReason: "Dagelijkse bijstelling op basis van je laatste ritten.",
          adaptFromDate: today,
          // Geen minimum: hoeft er niets te veranderen, dan is een lege lijst
          // het goede antwoord. Met minimaal één workout verzon de AI iets — een
          // rustdag of een kopie van de race van vandaag.
          options: { reasoningEffort: "low", minWorkouts: 0 },
        });
        generationsStarted += 1;

        if (!started.ok && started.duplicate) {
          // Een overlappende run was ons net voor. Niets te doen, niets te loggen.
          results.push({ profileId: plan.profile_id, status: "already_started" });
          continue;
        }

        if (!started.ok) {
          await admin.from("training_adaptation_runs").insert({
            profile_id: plan.profile_id,
            trainer_id: plan.trainer_id,
            source_plan_id: plan.id,
            status: "failed",
            input_json: { recent },
            error: started.error,
          });
          results.push({ profileId: plan.profile_id, status: "failed", error: started.error });
          continue;
        }

        // Geen rij in training_adaptation_runs: er is nog geen schema, en de
        // generatie zelf bezet de dagcheck (zie handledToday).
        dailyStartedToday += 1;
        results.push({ profileId: plan.profile_id, status: "queued" });
      } catch (err) {
        await admin.from("training_adaptation_runs").insert({
          profile_id: plan.profile_id,
          trainer_id: plan.trainer_id,
          source_plan_id: plan.id,
          status: "failed",
          error: err instanceof Error ? err.message : "Dagelijkse aanpassing faalde.",
        });
        results.push({
          profileId: plan.profile_id,
          status: "failed",
          error: err instanceof Error ? err.message : "Dagelijkse aanpassing faalde.",
        });
      }
    }

    return Response.json({
      ok: true,
      archived,
      finishedGenerations,
      generationsStarted,
      budgetSpent: Date.now() > deadline,
      results,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Adaptatie-cron faalde." },
      { status: 500 },
    );
  }
}

export const GET = POST;
