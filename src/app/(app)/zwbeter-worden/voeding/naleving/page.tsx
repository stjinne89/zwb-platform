import Link from "next/link";
import {
  Beef,
  Bell,
  BellOff,
  Bike,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  Wheat,
} from "lucide-react";
import { shiftDayKey } from "@/lib/training/mobility";
import { aiProcessorName } from "@/lib/ai/settings";
import { FUEL_DAY_LABELS } from "@/lib/nutrition/day-type";
import {
  dayTotals,
  firstLogDay,
  floorStatus,
  mealMacros,
  mealsByMoment,
  parseLogDay,
  repeatableMeals,
  rideFueling,
  weekSummary,
  type FloorStatus,
  type LogMacros,
} from "@/lib/nutrition/log";
import { MEAL_MOMENT_LABELS, type MealMoment } from "@/lib/nutrition/targets";
import { nutritionDay } from "@/lib/nutrition/tips";
import { searchFoods } from "../_actions";
import {
  deleteLog,
  deleteLoggedMeal,
  enableLog,
  logManualMeal,
  lookupBarcode,
  repeatMeal,
  setLogPaused,
  setReminders,
  setTrainerVisible,
} from "../_log-actions";
import {
  hasActiveTrainer,
  loadLogSettings,
  loadLoggedMeals,
  loadNutritionDayInputs,
  loadNutritionProfile,
  requireViewer,
  todayKeyAmsterdam,
} from "../_data";
import {
  DeleteLogButton,
  DeleteMealButton,
  LogActionButton,
  LogConsentForm,
} from "../_components/log-controls";
import { MealForm } from "../_components/meal-form";
import { ConsentForm } from "../_components/consent-form";
import { WeekStrip } from "../_components/week-strip";
import { pollRecognition, setRecognitionConsent, startRecognition } from "../_recognize-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Eerdere maaltijden om te herhalen komen uit deze periode. */
const REPEAT_DAYS = 30;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dayLabel(day: string, today: string) {
  if (day === today) return "Vandaag";
  if (day === shiftDayKey(today, -1)) return "Gisteren";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function macroLine(macros: LogMacros) {
  const prefix = macros.incomplete ? "≥ " : "";
  return `${prefix}${Math.round(macros.carbsG)} g koolhydraten · ${prefix}${Math.round(macros.proteinG)} g eiwit`;
}

function defaultMoment(day: string, today: string): MealMoment {
  if (day !== today) return "ontbijt";
  const hour = Number(
    new Date().toLocaleString("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", hourCycle: "h23" }),
  );
  if (hour < 10) return "ontbijt";
  if (hour < 15) return "lunch";
  if (hour < 21) return "diner";
  return "voor_slapen";
}

function FloorBar({
  icon: Icon,
  label,
  status,
  incomplete,
}: {
  icon: typeof Wheat;
  label: string;
  status: FloorStatus;
  incomplete: boolean;
}) {
  return (
    <div className="tg-metric rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {incomplete ? "≥ " : ""}
            {status.eatenG} g
          </p>
        </div>
        <Icon className="size-5 text-primary" />
      </div>
      {status.floorG != null && (
        <>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={status.floorG}
            aria-valuenow={Math.min(status.eatenG, status.floorG)}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(status.progress * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {status.reached ? "Gehaald" : `Nog ${status.remainingG} g`} · minstens {status.floorG} g
          </p>
        </>
      )}
    </div>
  );
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ dag?: string | string[] }>;
}) {
  const params = await searchParams;
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();
  const settings = await loadLogSettings(viewer);

  if (!settings) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Naleving</h2>
        <LogConsentForm action={enableLog} />
        <Link
          href="/hulp/kennis#voeding"
          className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground hover:underline"
        >
          Hoe dit werkt
        </Link>
      </div>
    );
  }

  const day = parseLogDay(one(params.dag), today);
  const [profile, history, hasTrainer] = await Promise.all([
    loadNutritionProfile(viewer, day),
    loadLoggedMeals(viewer, shiftDayKey(today, -REPEAT_DAYS), today),
    hasActiveTrainer(viewer),
  ]);
  const weekDays = Array.from({ length: 7 }, (_, i) => shiftDayKey(today, i - 6));
  const inputs = await loadNutritionDayInputs(viewer, [...new Set([...weekDays, day])], profile.weightKg);
  const fuelDay = nutritionDay(inputs.get(day)!);
  const week = weekSummary(
    weekDays.map((entry) => {
      const fuel = nutritionDay(inputs.get(entry)!);
      return {
        day: entry,
        dayType: fuel.dayType,
        carbs: fuel.carbs,
        protein: fuel.protein,
        meals: history.filter((meal) => meal.eatenOn === entry),
      };
    }),
  );

  const meals = history.filter((meal) => meal.eatenOn === day);
  const totals = dayTotals(meals);
  const groups = mealsByMoment(meals);
  const repeats = repeatableMeals(history);
  const ride = rideFueling(meals, fuelDay.rideMinutes);

  const dayHref = (value: string) => `/zwbeter-worden/voeding/naleving${value === today ? "" : `?dag=${value}`}`;
  const previous = day > firstLogDay(today) ? shiftDayKey(day, -1) : null;
  const next = day < today ? shiftDayKey(day, 1) : null;
  const navClass = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border hover:border-primary";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Naleving</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="first-letter:uppercase">{dayLabel(day, today)}</span> · {FUEL_DAY_LABELS[fuelDay.dayType]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {previous ? (
            <Link href={dayHref(previous)} aria-label="Vorige dag" className={navClass}>
              <ChevronLeft className="size-4" />
            </Link>
          ) : null}
          {next ? (
            <Link href={dayHref(next)} aria-label="Volgende dag" className={navClass}>
              <ChevronRight className="size-4" />
            </Link>
          ) : null}
        </div>
      </div>

      <section className={`grid gap-3 sm:grid-cols-2 ${ride ? "lg:grid-cols-3" : ""}`}>
        <FloorBar
          icon={Wheat}
          label="Koolhydraten"
          status={floorStatus(totals.carbsG, fuelDay.carbs)}
          incomplete={totals.incomplete}
        />
        <FloorBar
          icon={Beef}
          label="Eiwit"
          status={floorStatus(totals.proteinG, fuelDay.protein)}
          incomplete={totals.incomplete}
        />
        {ride && (
          <div className="tg-metric rounded-md border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Onderweg</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{ride.perHourG} g/u</p>
              </div>
              <Bike className="size-5 text-primary" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {ride.reached ? "Gehaald" : "Nog niet"} · minstens {ride.floorPerHourG} g/u
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Na de rit: {ride.recoveryLogged ? "ingevuld" : "nog niet ingevuld"}
            </p>
          </div>
        )}
      </section>

      {!profile.weightKg && (
        <p className="text-sm">
          <Link href="/profiel?weergave=bewerken" className="font-medium text-primary hover:underline">
            Vul je gewicht in
          </Link>{" "}
          <span className="text-muted-foreground">voor doelen in grammen.</span>
        </p>
      )}

      <WeekStrip days={week.days} tally={week.tally} selected={day} hrefFor={dayHref} />

      {groups.length > 0 && (
        <section className="space-y-4">
          {groups.map((group) => (
            <div key={group.moment} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {MEAL_MOMENT_LABELS[group.moment]}
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">{macroLine(group.total)}</span>
              </div>
              <ul className="mt-2 divide-y">
                {group.meals.map((meal) => (
                  <li key={meal.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{meal.title}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">{macroLine(mealMacros(meal))}</p>
                    </div>
                    <DeleteMealButton mealId={meal.id} title={meal.title} action={deleteLoggedMeal} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {settings.paused ? (
        <p className="text-sm text-muted-foreground">Gepauzeerd.</p>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">Toevoegen</h3>
              <Link
                href="/zwbeter-worden/voeding"
                className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Uit je dagmenu
                <ChevronRight className="size-4" />
              </Link>
            </div>
            {!settings.recognition && (
              <ConsentForm
                action={setRecognitionConsent}
                text={`Mijn omschrijving van een maaltijd gaat naar ${aiProcessorName()}, dat herkent wat erin zit en de hoeveelheden schat. Ik controleer elke hoeveelheid voor het bewaren.`}
              >
                <Sparkles className="size-4" />
                Tekst herkennen aanzetten
              </ConsentForm>
            )}
            <MealForm
              day={day}
              defaultMoment={defaultMoment(day, today)}
              saveAction={logManualMeal}
              searchAction={searchFoods}
              barcodeAction={lookupBarcode}
              recognition={settings.recognition ? { start: startRecognition, poll: pollRecognition } : undefined}
            />
          </section>

          {repeats.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-semibold">Opnieuw</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {repeats.map((meal) => (
                  <li key={meal.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{meal.title}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {MEAL_MOMENT_LABELS[meal.moment]} · {macroLine(mealMacros(meal))}
                      </p>
                    </div>
                    <LogActionButton
                      action={repeatMeal}
                      fields={{ meal_id: meal.id, day }}
                      size="sm"
                      ariaLabel={`${meal.title} opnieuw toevoegen`}
                    >
                      <RotateCcw className="size-4" />
                    </LogActionButton>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {hasTrainer && !settings.trainerVisible && (
        <ConsentForm
          action={setTrainerVisible}
          text="Mijn trainer mag mijn eetdagboek inzien: wat ik at en of ik mijn minimum haalde. Ik kan dit altijd weer uitzetten."
        >
          <UserCheck className="size-4" />
          Trainer laten meekijken
        </ConsentForm>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <LogActionButton action={setReminders} fields={{ on: settings.reminders ? "0" : "1" }}>
          {settings.reminders ? <BellOff className="size-4" /> : <Bell className="size-4" />}
          {settings.reminders ? "Herinneringen uit" : "Herinneringen aan"}
        </LogActionButton>
        {settings.trainerVisible && (
          <LogActionButton action={setTrainerVisible} fields={{ on: "0" }}>
            <UserX className="size-4" />
            Trainer niet meer laten meekijken
          </LogActionButton>
        )}
        <LogActionButton action={setLogPaused} fields={{ paused: settings.paused ? "0" : "1" }}>
          {settings.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          {settings.paused ? "Hervatten" : "Pauzeren"}
        </LogActionButton>
        {settings.recognition && (
          <LogActionButton action={setRecognitionConsent} fields={{ on: "0" }}>
            Tekst herkennen uit
          </LogActionButton>
        )}
        <DeleteLogButton action={deleteLog} />
        <Link
          href="/hulp/kennis#voeding"
          className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground hover:underline"
        >
          Hoe dit werkt
        </Link>
      </div>
    </div>
  );
}
