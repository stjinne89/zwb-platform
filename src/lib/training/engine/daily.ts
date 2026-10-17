// De dag-aanpassing van de regelmotor: de beslisboom uit adaptiveDailyPrompt()
// als code. Vertrekpunt is currentPlan (vandaag t/m het einde van de week); de
// uitkomst bevat alleen de dagen die veranderen. Een lege lijst betekent dat het
// schema blijft zoals het is.
//
// currentPlan kent per workout alleen titel, duur en intensiteit, geen blokken.
// Een gewijzigde training wordt daarom opnieuw uit de catalogus opgebouwd, in
// dezelfde vorm (of een lichtere) en op de nieuwe duur.

import { dayIndex } from "@/lib/training/season";
import { fixedOn, periodOn, shiftDays } from "@/lib/training/engine/calendar";
import { recoverySignals } from "@/lib/training/engine/signals";
import { sessionToWorkout } from "@/lib/training/engine/workout";
import type {
  BuildSession,
  EngineReason,
  EngineResult,
  GeneratedWorkout,
  SessionForm,
  TrainingAiInput,
} from "@/lib/training/engine/types";
import { OPTIONAL_REST_RIDE_MINUTES } from "@/lib/training/workouts";

type PlannedWorkout = NonNullable<TrainingAiInput["currentPlan"]>["workouts"][number];

/** Sleutelsessies volgens de dag-prompt: drempel, VO2max en anaeroob. */
const KEY_INTENSITIES = new Set(["threshold", "vo2max", "anaerobic"]);

/** Gisteren telt als zwaarder dan gepland vanaf zoveel meer minuten. */
const HEAVIER_FACTOR = 1.2;
const HEAVIER_MIN_EXTRA = 15;
/** Intensiteitsfactor waaronder een rit "zonder intensiteit" is (rustige duur). */
const EASY_IF = 0.75;
/** Kortste rit die de motor nog voorstelt; daaronder liever niets. */
const MIN_RIDE_MINUTES = 20;
/** Een lichtere vervanger van een sleutelsessie duurt hooguit zo lang. */
const TIRED_MAX_MINUTES = 60;

export function isKeyWorkout(workout: Pick<PlannedWorkout, "intensity">): boolean {
  return KEY_INTENSITIES.has(workout.intensity);
}

/** De catalogusvorm van een geplande workout, of null als hij niet te herbouwen is. */
export function formOfPlanned(workout: PlannedWorkout): SessionForm | null {
  const title = workout.title.toLowerCase();
  switch (workout.intensity) {
    case "threshold":
      return "drempel";
    case "vo2max":
      return "vo2max";
    case "anaerobic":
      return title.includes("sprint") ? "sprint" : "anaeroob";
    case "tempo":
      return title.includes("sweet") ? "sweetspot" : "tempo";
    case "endurance":
      if (title.includes("opener")) return "openers";
      if (title.includes("intensieve")) return "intensieve_duur";
      return workout.durationMinutes >= 150 ? "lange_duur" : "rustige_duur";
    case "recovery":
      return "herstel";
    default:
      // race en rest: niet aankomen.
      return null;
  }
}

function roundTo5(minutes: number): number {
  return Math.max(5, Math.round(minutes / 5) * 5);
}

type Yesterday = NonNullable<TrainingAiInput["yesterday"]>;

/** Rit zonder geplande training, kort en rustig: de optionele rit van een rustdag. */
function isOptionalRestDayRide(yesterday: Yesterday): boolean {
  if (yesterday.plannedTitle || yesterday.actualCountsFor) return false;
  const minutes = yesterday.actualMinutes ?? 0;
  if (minutes === 0 || minutes > OPTIONAL_REST_RIDE_MINUTES) return false;
  const load = yesterday.actualLoad;
  if (load == null) return true;
  const intensityFactor = Math.sqrt(load / ((minutes / 60) * 100));
  return intensityFactor < EASY_IF;
}

/**
 * Was gisteren zwaarder dan gepland? Een verschoven training wordt vergeleken met
 * de training waarvoor hij telt; in een kamp telt alleen wat het lid zelf zegt.
 */
function heavierYesterday(input: TrainingAiInput, inCamp: boolean): boolean {
  const yesterday = input.yesterday;
  if (!yesterday) return false;
  const feedbackHeavy =
    (yesterday.athleteRpe ?? 0) >= 8 ||
    yesterday.athleteFeel === "zwaar" ||
    yesterday.athleteFeel === "slecht";
  if (feedbackHeavy) return true;
  if (inCamp || isOptionalRestDayRide(yesterday)) return false;

  const actual = yesterday.actualMinutes ?? 0;
  if (actual === 0) return false;
  // Gereden voor een andere dag: dezelfde prikkel verschoven, geen extra rit.
  if (yesterday.actualCountsFor) return false;
  const planned = yesterday.plannedMinutes ?? 0;
  if (planned === 0) return actual > OPTIONAL_REST_RIDE_MINUTES;
  return actual >= planned * HEAVIER_FACTOR && actual - planned >= HEAVIER_MIN_EXTRA;
}

export function adaptDay(input: TrainingAiInput, buildSession: BuildSession): EngineResult {
  const reasons: EngineReason[] = [];
  const plan = input.currentPlan;
  if (!plan) {
    return {
      workouts: [],
      reasons: [{ rule: "dag.geen_schema", text: "Geen lopend schema om aan te passen.", caution: false }],
    };
  }

  const today = plan.fromDate;
  const ftp = input.profile.ftpWatts ?? input.intervalsLoad?.eftp ?? null;
  const planned = [...plan.workouts].sort((a, b) => a.date.localeCompare(b.date));
  const todayPlanned = planned.find((workout) => workout.date === today) ?? null;
  const signals = recoverySignals(input);

  const inCamp = periodOn(input, today) === "kamp" || periodOn(input, shiftDays(today, -1)) === "kamp";
  const restPeriod = periodOn(input, today) === "rust";
  const feeling = input.today?.feeling ?? null;
  const availableMinutes = input.today?.availableMinutes ?? null;

  // In een kamp zijn een negatieve TSB en een hoge ATL de bedoeling; daar telt
  // alleen wat het lid zelf aangeeft en wat de herstelwaarden zeggen.
  const fatigueReasons = signals.reasons.filter(
    (reason) =>
      reason.rule !== "signaal.ramp" &&
      reason.rule !== "signaal.belastbaarheid" &&
      !(inCamp && reason.rule === "signaal.tsb"),
  );
  const tired = feeling === "tired" || fatigueReasons.length > 0;
  const heavy = heavierYesterday(input, inCamp);
  const todayBlocked = (input.todayRides ?? []).length > 0 || fixedOn(input, today).length > 0;

  const build = (form: SessionForm, date: string, minutes: number, max: number) =>
    buildSession({
      form,
      targetMinutes: minutes,
      maxMinutes: max,
      ftpWatts: ftp,
      level: 0.5,
      variant: dayIndex(date),
      lowCadence: (input.protocols ?? []).some((protocol) => protocol.slug === "lage-cadans-vo2max"),
    });

  /** Een sleutelsessie lichter maken: rustige duur, korter. */
  const lighten = (workout: PlannedWorkout, cap: number | null, note: string) => {
    const minutes = Math.min(workout.durationMinutes, TIRED_MAX_MINUTES, cap ?? Infinity);
    if (minutes < MIN_RIDE_MINUTES) return null;
    const session = build("rustige_duur", workout.date, minutes, minutes);
    return session ? sessionToWorkout(workout.date, session, { note }) : null;
  };

  const workouts: GeneratedWorkout[] = [];

  if (restPeriod) {
    reasons.push({
      rule: "dag.rustperiode",
      date: today,
      text: "Vandaag valt in een rustperiode: er komt niets bij.",
      caution: false,
    });
    return { workouts, reasons };
  }

  if (todayBlocked) {
    reasons.push({
      rule: "dag.al_gereden",
      date: today,
      text: (input.todayRides ?? []).length > 0
        ? "Je hebt vandaag al gereden: vandaag komt er niets meer bij."
        : "Vandaag staat er een vaste afspraak: die blijft staan.",
      caution: false,
    });
  }

  // 1 en 2: na een zware dag of bij vermoeidheid gaat de eerstvolgende
  // sleutelsessie eruit. Vandaag als die vrij is, anders de dagen erna.
  if (heavy || tired) {
    const target = planned.find(
      (workout) =>
        isKeyWorkout(workout) &&
        !(todayBlocked && workout.date === today) &&
        fixedOn(input, workout.date).length === 0,
    );
    const why = heavy
      ? "Gisteren was zwaarder dan gepland: deze sleutelsessie wordt rustige duur."
      : "Je bent vermoeid: deze sleutelsessie wordt rustige duur.";
    if (target) {
      const cap = target.date === today ? availableMinutes : null;
      const lighter = lighten(target, cap, why);
      if (lighter) workouts.push(lighter);
      reasons.push(
        { rule: heavy ? "dag.zwaarder_gisteren" : "dag.te_moe", date: target.date, text: why, caution: true },
        ...(tired && !heavy ? fatigueReasons : []),
      );
    }
    // Moe en vandaag een rustige rit gepland: die wordt korter.
    if (tired && !todayBlocked && todayPlanned && !isKeyWorkout(todayPlanned) && target?.date !== today) {
      const form = formOfPlanned(todayPlanned);
      const minutes = roundTo5(Math.min(todayPlanned.durationMinutes * 0.75, availableMinutes ?? Infinity));
      // Een hersteltraining korter maken levert een rit onder de 90
      // minuten op; dat mag alleen als het lid zelf om een korte rit vraagt.
      const shortRecovery = form === "herstel" && availableMinutes == null;
      if (form && !shortRecovery && minutes >= MIN_RIDE_MINUTES && minutes < todayPlanned.durationMinutes) {
        const easier = form === "intensieve_duur" || form === "lange_duur" ? "rustige_duur" : form;
        const session = build(easier, today, minutes, minutes);
        if (session) {
          workouts.push(sessionToWorkout(today, session, { note: "Korter, omdat je vermoeid bent." }));
          reasons.push({ rule: "dag.te_moe_korter", date: today, text: "Vandaag korter en rustiger.", caution: true });
        }
      }
    }
    return { workouts: dedupeByDate(workouts), reasons };
  }

  if (todayBlocked) return { workouts, reasons };

  // 3: minder tijd dan gepland. De kern blijft als hij past.
  if (todayPlanned && availableMinutes != null && availableMinutes < todayPlanned.durationMinutes) {
    const form = formOfPlanned(todayPlanned);
    if (form) {
      const session =
        build(form, today, availableMinutes, availableMinutes) ??
        (availableMinutes >= MIN_RIDE_MINUTES
          ? build("rustige_duur", today, availableMinutes, availableMinutes)
          : null);
      if (session) {
        workouts.push(sessionToWorkout(today, session, { note: `Ingekort tot ${session.durationMinutes} minuten.` }));
        reasons.push({
          rule: session.form === form ? "dag.weinig_tijd" : "dag.weinig_tijd_vervangen",
          date: today,
          text:
            session.form === form
              ? "Minder tijd vandaag: de training is ingekort, de kern blijft."
              : "Minder tijd vandaag: de kern past niet, het wordt rustige duur.",
          caution: true,
        });
      } else {
        reasons.push({
          rule: "dag.te_weinig_tijd",
          date: today,
          text: "Te weinig tijd voor een zinvolle training vandaag.",
          caution: true,
        });
      }
    }
    return { workouts, reasons };
  }

  // 4: fris, en het lid vraagt er zelf om. Een rustige rit wordt intensieve duur,
  // als morgen geen sleutelsessie staat.
  if (todayPlanned && feeling === "fresh") {
    const form = formOfPlanned(todayPlanned);
    const tomorrow = planned.find((workout) => workout.date === shiftDays(today, 1));
    if (form === "rustige_duur" && !(tomorrow && isKeyWorkout(tomorrow))) {
      const minutes = Math.min(todayPlanned.durationMinutes, availableMinutes ?? Infinity);
      const session = build("intensieve_duur", today, minutes, minutes);
      if (session) {
        workouts.push(sessionToWorkout(today, session, { note: "Iets steviger, omdat je fris bent." }));
        reasons.push({
          rule: "dag.fris",
          date: today,
          text: "Je bent fris: de duurrit van vandaag is iets steviger.",
          caution: false,
        });
      }
    }
    return { workouts, reasons };
  }

  // Geen training gepland en het lid vraagt om een rit.
  if (!todayPlanned && availableMinutes != null && availableMinutes >= MIN_RIDE_MINUTES) {
    const session = build("rustige_duur", today, Math.min(availableMinutes, 90), availableMinutes);
    if (session) {
      workouts.push(sessionToWorkout(today, session));
      reasons.push({
        rule: "dag.rit_gevraagd",
        date: today,
        text: "Je vroeg om een rit op een vrije dag: rustige duur.",
        caution: false,
      });
    }
    return { workouts, reasons };
  }

  reasons.push({ rule: "dag.geen_wijziging", date: today, text: "Geen reden om het schema aan te passen.", caution: false });
  return { workouts, reasons };
}

function dedupeByDate(workouts: GeneratedWorkout[]): GeneratedWorkout[] {
  const seen = new Set<string>();
  return workouts.filter((workout) => (seen.has(workout.date) ? false : (seen.add(workout.date), true)));
}
