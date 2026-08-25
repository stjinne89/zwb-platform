import { loadSymptomLoadForAi } from "@/lib/training/symptoms";
import { generateTrainingPlanDraft } from "@/lib/training/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { adaptiveDailyPrompt } from "@/lib/training/workouts";
import { buildYesterdayContext } from "@/lib/training/adapt-context";
import {
  availabilityNeedsReplan,
  clearReplanPending,
  loadPendingReplan,
  planIsIgnored,
} from "@/lib/training/replan";
import { availabilityForAi, loadFixedWorkouts, mondayKey } from "@/lib/training/availability";
import {
  buildIntervalsLoad,
  buildRecentLoad,
  finishAiGeneration,
  insertPlanWorkouts,
  runPlanUpdateNow,
  STALE_GENERATION_MINUTES,
} from "@/lib/training/draft";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

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

type PlanRow = {
  id: string;
  profile_id: string;
  trainer_id: string | null;
  goal_id: string | null;
  title: string;
  end_date: string;
  root_plan_id: string | null;
  created_at: string;
};

function since(days: number) {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

/**
 * Lopende schema's om een voorstel voor te maken. Alleen basisplannen: een
 * eerdere aanpassing is zelf geen schema, en zou een voorstel op een voorstel
 * opleveren.
 */
async function latestPlanCandidates(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("training_plans")
    .select("id, profile_id, trainer_id, goal_id, title, end_date, root_plan_id, created_at")
    .is("parent_plan_id", null)
    .in("status", ["approved", "published"])
    .gte("end_date", new Date().toISOString().slice(0, 10))
    .order("updated_at", { ascending: false })
    .limit(25);
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanRow[];
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
    const outcome = await finishAiGeneration(admin, row.id as string).catch((err) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : "Ophalen faalde.",
    }));

    // Nog steeds onderweg is geen fout: OpenAI is er dan zelf nog mee bezig.
    const nogBezig =
      outcome.ok && (outcome.status === "queued" || outcome.status === "in_progress");
    if (nogBezig) continue;

    if (outcome.ok && outcome.planId) afgemaakt += 1;

    await admin.from("training_adaptation_runs").insert({
      profile_id: row.profile_id,
      trainer_id: row.trainer_id,
      status: outcome.ok && outcome.planId ? "completed" : "failed",
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
      status: outcome.ok && outcome.planId ? "generation_finished" : "generation_failed",
      draftPlanId: outcome.ok ? outcome.planId : undefined,
      error: outcome.ok ? outcome.error : outcome.error,
    });
  }
  return afgemaakt;
}

export async function POST(request: Request) {
  const expected = process.env.TRAINING_ADAPTATION_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const results: Array<{ profileId: string; status: string; draftPlanId?: string; error?: string }> = [];

  try {
    const archived = await archiveStaleProposals(admin).catch(() => 0);

    // Eerst het werk dat al betaald is: generaties die op iemand wachtten.
    const finishedGenerations = await finishStaleGenerations(admin, results).catch(() => 0);

    let planUpdatesRun = 0;

    for (const plan of await latestPlanCandidates(admin)) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: existingRun } = await admin
        .from("training_adaptation_runs")
        .select("id")
        .eq("profile_id", plan.profile_id)
        .eq("source_plan_id", plan.id)
        .gte("created_at", `${today}T00:00:00.000Z`)
        .maybeSingle();
      if (existingRun) continue;

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
            const update = await runPlanUpdateNow({
              admin,
              planId: plan.id,
              actorId: plan.profile_id,
              reason: `${trigger.reason} Het schema is automatisch herzien.`,
              authorized: true,
            });

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
            await admin.from("training_adaptation_runs").insert({
              profile_id: plan.profile_id,
              trainer_id: plan.trainer_id,
              source_plan_id: plan.id,
              draft_plan_id: update.planId,
              status: "completed",
              input_json: runLog,
            });
            results.push({ profileId: plan.profile_id, status: "plan_update", draftPlanId: update.planId });
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

      try {
        const [{ data: recentActivities }, { data: goal }, { data: profile }, { data: sourceWorkouts }] =
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
            admin.from("training_workouts").select("*").eq("plan_id", plan.id).order("scheduled_at"),
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
        const { wellnessForAi } = await import("@/lib/training/wellness");
        const [wellness, yesterday, recent, intervalsLoad, availability, fixedWorkouts] =
          await Promise.all([
            wellnessForAi(admin, plan.profile_id).catch(() => null),
            buildYesterdayContext(admin, plan.profile_id, plan.id).catch(() => null),
            buildRecentLoad(admin, plan.profile_id),
            buildIntervalsLoad(admin, plan.profile_id),
            availabilityForAi(admin, plan.profile_id, today, planEnd),
            loadFixedWorkouts(admin, plan.profile_id, today, planEnd).catch(() => []),
          ]);

        // Wat er nog gepland staat vanaf vandaag; zonder dit verzint de AI de
        // resterende week opnieuw in plaats van hem aan te passen. Op profiel en
        // datum, niet op plan_id: eerdere aanpassingen wonen in afgeleide plannen.
        const { data: planned } = await admin
          .from("training_workouts")
          .select("scheduled_at, title, duration_minutes, intensity")
          .eq("profile_id", plan.profile_id)
          .is("superseded_at", null)
          .eq("status", "planned")
          .gte("scheduled_at", `${today}T00:00:00`)
          .lte("scheduled_at", `${planEnd}T23:59:59`)
          .order("scheduled_at", { ascending: true });

        const ai = await generateTrainingPlanDraft(
          {
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
            profile: {
              ftpWatts: profile.ftp_watts ?? null,
              weightKg: profile.weight_kg ? Number(profile.weight_kg) : null,
              zrlCategory: profile.zrl_category ?? null,
              sex: profile.sex ?? null,
            },
            symptoms: await loadSymptomLoadForAi(admin, plan.profile_id),
            recentLoad: recent,
            wellness: wellness
              ? {
                  days: wellness.days,
                  state: wellness.state,
                  restingHr: wellness.restingHr,
                  hrv: wellness.hrv,
                  sleepHours: wellness.sleepHours,
                  readiness: wellness.readiness,
                  readinessSource: wellness.readinessSource,
                  note: wellness.note,
                }
              : null,
            intervalsLoad,
            availability,
            fixedWorkouts,
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
          },
          adaptiveDailyPrompt(),
          { reasoningEffort: "low", minWorkouts: 1 },
        );

        // Een voorstel, geen schema: het blijft 'draft' tot het lid het toepast,
        // en hangt via root_plan_id onder het lopende schema in plaats van
        // ernaast. De titel krijgt geen suffix meer — de kaart toont zelf al dat
        // het een voorstel is.
        const { data: draft, error: draftError } = await admin
          .from("training_plans")
          .insert({
            profile_id: plan.profile_id,
            trainer_id: plan.trainer_id,
            goal_id: plan.goal_id,
            parent_plan_id: plan.id,
            root_plan_id: plan.root_plan_id ?? plan.id,
            title: ai.plan.title,
            summary: ai.plan.summary,
            start_date: ai.plan.startDate,
            end_date: ai.plan.endDate,
            status: "draft",
            source: "ai",
            adaptation_kind: "daily",
            adapt_from_date: today,
            adaptation_reason: "Dagelijkse bijstelling op basis van je laatste ritten.",
            ctl_projection_json: {
              sourcePlanId: plan.id,
              sourceWorkoutCount: (sourceWorkouts ?? []).length,
            },
          })
          .select("id")
          .single();
        if (draftError) throw new Error(draftError.message);

        await insertPlanWorkouts(
          admin,
          { id: draft.id, profile_id: plan.profile_id, trainer_id: plan.trainer_id },
          ai.plan.workouts,
        );

        await admin.from("training_adaptation_runs").insert({
          profile_id: plan.profile_id,
          trainer_id: plan.trainer_id,
          source_plan_id: plan.id,
          draft_plan_id: draft.id,
          status: "completed",
          input_json: { recent },
          response_json: ai.plan,
        });
        results.push({ profileId: plan.profile_id, status: "completed", draftPlanId: draft.id });
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

    return Response.json({ ok: true, archived, finishedGenerations, results });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Adaptatie-cron faalde." },
      { status: 500 },
    );
  }
}

export const GET = POST;
