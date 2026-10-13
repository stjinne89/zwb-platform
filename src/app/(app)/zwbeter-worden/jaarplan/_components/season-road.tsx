"use client";

// Het jaarplan als weg, van boven naar beneden: links het wegdek, rechts wat er
// langs die weg ligt. Het wegdek zegt hoe ver het schema is uitgewerkt (asfalt),
// wat verder weg nog alleen een route is (stippellijnen) en waar een periode de
// weg verandert: grind bij rust, een smalle strook bij rustig, klimstrepen bij
// een trainingskamp. De maanden staan er als bermpaaltjes langs.
//
// De tekening zelf staat in globals.css onder "Jaarplan: de weg"; hier staat
// alleen wat er op welke halte hoort.

import {
  useCallback,
  useState,
  useSyncExternalStore,
  useTransition,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronUp, Flag, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_LABELS, eventTypeColor, eventTypeInk } from "@/lib/event-types";
import {
  daysBetween,
  SEASON_PERIOD_KINDS,
  SEASON_PERIOD_LABELS,
  SEASON_PRIORITIES,
  SEASON_PRIORITY_LABELS,
  seasonRoad,
  type SeasonEvent,
  type SeasonPeriod,
  type SeasonPlanBar,
  type SeasonRoadStop,
  type SeasonTarget,
  type SeasonWarning,
} from "@/lib/training/season";
import { useAiDraftPoll } from "../../_components/use-ai-draft-poll";
import {
  createSeasonTarget,
  deleteSeasonPeriod,
  deleteSeasonTarget,
  requestSeasonReplan,
  startNextBlock,
  updateSeasonPeriod,
  updateSeasonTarget,
} from "../_actions";

type ActionResult = { ok: boolean; error?: string } | null;

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Een link die eruitziet als de outline-knop ernaast; Button kent geen asChild. */
const LINK_BUTTON =
  "inline-flex min-h-9 shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-3 text-[0.8rem] font-medium whitespace-nowrap transition-all hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50";

/** Dezelfde link, als de ene actie van een halte. */
const LINK_PRIMARY =
  "mt-2 inline-flex min-h-11 items-center justify-center rounded-[min(var(--radius-md),12px)] bg-primary px-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80";

function datum(dayKey: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("nl-NL", {
    ...options,
    timeZone: "UTC",
  });
}

const dagMaand = (dayKey: string) => datum(dayKey, { day: "numeric", month: "short" });

/** Hoe ver weg iets ligt, in de eenheid waarin je erover denkt. */
function afstand(today: string, dayKey: string): string | null {
  const dagen = daysBetween(today, dayKey);
  if (dagen < 0) return null;
  if (dagen === 0) return "vandaag";
  if (dagen === 1) return "morgen";
  if (dagen < 14) return `over ${dagen} dagen`;
  return `over ${Math.round(dagen / 7)} weken`;
}

// Of het verleden dichtgeklapt is, onthouden per apparaat.
const VERLEDEN_KEY = "zwb:jaarplan-verleden";

function volgVerleden(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(VERLEDEN_KEY, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VERLEDEN_KEY, onChange);
  };
}

function verledenDicht() {
  try {
    return window.localStorage.getItem(VERLEDEN_KEY) === "dicht";
  } catch {
    return false;
  }
}

function zetVerleden(dicht: boolean) {
  try {
    window.localStorage.setItem(VERLEDEN_KEY, dicht ? "dicht" : "open");
  } catch {
    // Zonder opslag klapt het alleen deze keer niet in.
  }
  window.dispatchEvent(new Event(VERLEDEN_KEY));
}

export function SeasonRoad({
  today,
  from,
  targets,
  periods,
  plans,
  events,
  warnings,
  editable,
}: {
  today: string;
  from: string;
  targets: SeasonTarget[];
  periods: SeasonPeriod[];
  plans: SeasonPlanBar[];
  events: SeasonEvent[];
  warnings: SeasonWarning[];
  editable: boolean;
}) {
  const stops = seasonRoad({ today, from, targets, periods, events, plans });
  const dicht = useSyncExternalStore(volgVerleden, verledenDicht, () => false);

  // Alles boven Vandaag is geweest, op een periode na die nu nog loopt.
  const nu = stops.findIndex((stop) => stop.kind === "vandaag");
  const loopt = (stop: SeasonRoadStop) =>
    stop.surface !== "voorbij" && stop.kind !== "maand" && stop.kind !== "leeg";
  const geweest = stops
    .slice(0, nu)
    .filter((stop) => stop.surface === "voorbij" && stop.kind !== "maand" && stop.kind !== "leeg");
  const zichtbaar =
    dicht && geweest.length > 0
      ? stops.filter(
          (stop, index) =>
            index >= nu ||
            loopt(stop) ||
            // Het paaltje van de lopende maand blijft boven Vandaag staan.
            (stop.kind === "maand" && stop.date.slice(0, 7) === today.slice(0, 7)),
        )
      : stops;

  if (targets.length + periods.length + events.length + plans.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
        Nog niets in je jaarplan.
      </p>
    );
  }

  const bijHalte = new Map<string, SeasonWarning[]>();
  for (const warning of warnings) {
    const key = `${warning.anchor.kind}:${warning.anchor.id}`;
    bijHalte.set(key, [...(bijHalte.get(key) ?? []), warning]);
  }
  const meldingen = (stop: SeasonRoadStop): SeasonWarning[] => {
    if (stop.kind === "periode") return bijHalte.get(`period:${stop.period.id}`) ?? [];
    if (stop.kind === "event") return bijHalte.get(`event:${stop.event.id}`) ?? [];
    if (stop.kind === "mikpunt") {
      return [
        ...(bijHalte.get(`target:${stop.target.id}`) ?? []),
        ...(stop.event ? (bijHalte.get(`event:${stop.event.id}`) ?? []) : []),
      ];
    }
    return [];
  };

  return (
    <ol className="jp-weg">
      {geweest.length > 0 ? (
        <li className="jp-halte" data-dek="voorbij">
          <div className="jp-baan" aria-hidden />
          <button
            type="button"
            className="jp-verleden"
            aria-expanded={!dicht}
            onClick={() => zetVerleden(!dicht)}
          >
            {dicht ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            {dicht ? `Verleden tonen (${geweest.length})` : "Verleden inklappen"}
          </button>
        </li>
      ) : null}
      {zichtbaar.map((stop) => (
        <Halte
          key={stop.key}
          stop={stop}
          today={today}
          editable={editable}
          warnings={meldingen(stop)}
        />
      ))}
    </ol>
  );
}

function wegdek(stop: SeasonRoadStop): string {
  if (stop.kind === "schema_eind") return "einde";
  if (stop.kind === "periode" && stop.surface !== "voorbij") return stop.period.kind;
  return stop.surface;
}

function Halte({
  stop,
  today,
  editable,
  warnings,
}: {
  stop: SeasonRoadStop;
  today: string;
  editable: boolean;
  warnings: SeasonWarning[];
}) {
  const dek = wegdek(stop);

  if (stop.kind === "maand") {
    return (
      <li className="jp-halte" data-dek={dek}>
        <div className="jp-baan" aria-hidden>
          <i className="jp-paal" />
        </div>
        <h3 className="jp-maand-naam">{stop.label}</h3>
      </li>
    );
  }

  if (stop.kind === "leeg") {
    return (
      <li className="jp-halte" data-dek={dek}>
        <div className="jp-baan" aria-hidden />
        <p className="jp-leeg-naam">{stop.label}</p>
      </li>
    );
  }

  if (stop.kind === "vandaag") {
    return (
      <li className="jp-halte jp-vandaag" data-dek={dek}>
        <div className="jp-baan" aria-hidden>
          <i className="jp-teken jp-nu" />
        </div>
        <p>
          <strong>Vandaag</strong>
          <span>
            {datum(stop.date, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </p>
      </li>
    );
  }

  return (
    <li className="jp-halte" data-dek={dek} data-voorbij={stop.surface === "voorbij" || undefined}>
      <div className="jp-baan" aria-hidden>
        <i className={`jp-teken ${teken(stop)}`} />
      </div>
      <div className="jp-inhoud">
        {stop.kind === "mikpunt" ? (
          <MikpuntHalte stop={stop} today={today} editable={editable} />
        ) : stop.kind === "event" ? (
          <EventHalte stop={stop} today={today} editable={editable} />
        ) : stop.kind === "periode" ? (
          <PeriodeHalte stop={stop} editable={editable} />
        ) : stop.kind === "schema_eind" ? (
          <SchemaEinde stop={stop} today={today} editable={editable} />
        ) : stop.kind === "schema_start" ? (
          <Regel titel={`Schema ${stop.plan.title} begint`} meta={dagMaand(stop.date)} />
        ) : (
          <Regel
            titel={`Opbouw naar ${stop.target.title}`}
            meta={`vanaf ${dagMaand(stop.date)} · ${afstand(today, stop.date)}`}
          />
        )}
        {warnings.map((warning) => (
          <Melding key={warning.id} warning={warning} />
        ))}
      </div>
    </li>
  );
}

function teken(stop: SeasonRoadStop): string {
  if (stop.kind === "mikpunt") {
    return stop.target.priority === "a"
      ? "jp-finish"
      : stop.target.priority === "b"
        ? "jp-lijn"
        : "jp-stip";
  }
  if (stop.kind === "event") return stop.event.rsvp === "yes" ? "jp-stip" : "jp-stip jp-stip-open";
  if (stop.kind === "schema_eind") return "jp-hek";
  if (stop.kind === "periode") return "";
  return "jp-start";
}

/** Het dagvak vooraan een halte: de dag groot, de maand eronder. */
function Dag({ dayKey, style }: { dayKey: string; style?: CSSProperties }) {
  return (
    <span className="jp-dag" style={style}>
      <b>{datum(dayKey, { day: "numeric" })}</b>
      {datum(dayKey, { month: "short" }).replace(".", "")}
    </span>
  );
}

/** Een halte zonder dagvak: een mededeling langs de weg. */
function Regel({ titel, meta }: { titel: string; meta: string }) {
  return (
    <div className="jp-regel">
      <p className="jp-titel">{titel}</p>
      <p className="jp-meta">{meta}</p>
    </div>
  );
}

const PRIORITEIT_STIJL: Record<SeasonTarget["priority"], CSSProperties | undefined> = {
  a: { "--row-bg": "var(--zwb-gold)", "--row-ink": "#0a2b34" } as CSSProperties,
  b: {
    "--row-bg": "var(--tg-kalender, var(--zwb-petrol))",
    "--row-ink": "#fbfbf7",
  } as CSSProperties,
  c: undefined,
};

function useActie() {
  const [pending, startTransition] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  function voerUit(fn: () => Promise<ActionResult>, klaar?: () => void) {
    setFout(null);
    startTransition(async () => {
      const result = await fn();
      if (result && !result.ok) setFout(result.error ?? "Opslaan faalde.");
      else klaar?.();
    });
  }
  return { pending, fout, voerUit };
}

function Potlood({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="jp-knop"
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
    >
      <Pencil className="size-4" />
    </button>
  );
}

function MikpuntHalte({
  stop,
  today,
  editable,
}: {
  stop: Extract<SeasonRoadStop, { kind: "mikpunt" }>;
  today: string;
  editable: boolean;
}) {
  const { target, event } = stop;
  const [bewerken, setBewerken] = useState(false);
  const { pending, fout, voerUit } = useActie();
  const meta = [
    SEASON_PRIORITY_LABELS[target.priority],
    event ? (EVENT_TYPE_LABELS[event.type] ?? event.type) : null,
    event ? (event.rsvp === "yes" ? "je doet mee" : "misschien") : null,
    afstand(today, stop.date),
  ].filter(Boolean);

  return (
    <>
      <div className="jp-kaart rounded-lg border bg-card">
        <Dag dayKey={stop.date} style={PRIORITEIT_STIJL[target.priority]} />
        <div className="jp-tekst">
          <p className="jp-titel">
            {event ? (
              <Link href={`/events/${event.id}`} className="hover:underline">
                {target.title}
              </Link>
            ) : (
              target.title
            )}
          </p>
          <p className="jp-meta">{meta.join(" · ")}</p>
          {target.note ? <p className="jp-meta">{target.note}</p> : null}
        </div>
        {editable ? (
          <div className="jp-acties">
            <Potlood
              label={`${target.title} bewerken`}
              open={bewerken}
              onClick={() => setBewerken((value) => !value)}
            />
          </div>
        ) : null}
      </div>

      {bewerken ? (
        <form
          className="jp-formulier grid gap-3 sm:grid-cols-2"
          onSubmit={(submit) => {
            submit.preventDefault();
            const formData = new FormData(submit.currentTarget);
            voerUit(
              () => updateSeasonTarget(formData),
              () => setBewerken(false),
            );
          }}
        >
          <input type="hidden" name="id" value={target.id} />
          {target.eventId ? null : (
            <>
              <label className="text-sm sm:col-span-2">
                Titel
                <input
                  name="title"
                  required
                  defaultValue={target.title}
                  className={`mt-1 ${FIELD}`}
                />
              </label>
              <label className="text-sm">
                Datum
                <input
                  type="date"
                  name="target_date"
                  required
                  defaultValue={target.targetDate}
                  className={`mt-1 ${FIELD}`}
                />
              </label>
            </>
          )}
          <label className="text-sm">
            Prioriteit
            <select name="priority" defaultValue={target.priority} className={`mt-1 ${FIELD}`}>
              {SEASON_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {SEASON_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Notitie
            <input name="note" defaultValue={target.note ?? ""} className={`mt-1 ${FIELD}`} />
          </label>
          <FormulierKnoppen
            pending={pending}
            onCancel={() => setBewerken(false)}
            onDelete={() =>
              voerUit(() => {
                const formData = new FormData();
                formData.set("id", target.id);
                return deleteSeasonTarget(formData);
              })
            }
            deleteLabel={event ? "Mikpunt weghalen" : "Verwijderen"}
          />
        </form>
      ) : null}
      {fout ? <p className="jp-fout">{fout}</p> : null}
    </>
  );
}

function EventHalte({
  stop,
  today,
  editable,
}: {
  stop: Extract<SeasonRoadStop, { kind: "event" }>;
  today: string;
  editable: boolean;
}) {
  const { event } = stop;
  const { pending, fout, voerUit } = useActie();
  const meta = [
    EVENT_TYPE_LABELS[event.type] ?? event.type,
    event.rsvp === "yes" ? "je doet mee" : "misschien",
    afstand(today, stop.date),
  ].filter(Boolean);

  return (
    <>
      <div className="jp-kaart rounded-lg border bg-card">
        <Dag
          dayKey={stop.date}
          style={
            {
              "--row-bg": eventTypeColor(event.type),
              "--row-ink": eventTypeInk(event.type),
            } as CSSProperties
          }
        />
        <div className="jp-tekst">
          <p className="jp-titel">
            <Link href={`/events/${event.id}`} className="hover:underline">
              {event.title}
            </Link>
          </p>
          <p className="jp-meta">{meta.join(" · ")}</p>
        </div>
        {/* Een event wordt pas een mikpunt als het lid dat zelf zegt: niet elke
            clubrit is iets om naartoe te werken. Het begint als C-doel; de
            prioriteit zet je daarna met het potlood. */}
        {editable && stop.surface !== "voorbij" ? (
          <div className="jp-acties">
            <button
              type="button"
              className="jp-knop"
              aria-label={`Maak een mikpunt van ${event.title}`}
              disabled={pending}
              onClick={() =>
                voerUit(() => {
                  const formData = new FormData();
                  formData.set("event_id", event.id);
                  formData.set("priority", "c");
                  return createSeasonTarget(formData);
                })
              }
            >
              <Flag className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
      {fout ? <p className="jp-fout">{fout}</p> : null}
    </>
  );
}

function PeriodeHalte({
  stop,
  editable,
}: {
  stop: Extract<SeasonRoadStop, { kind: "periode" }>;
  editable: boolean;
}) {
  const { period } = stop;
  const [bewerken, setBewerken] = useState(false);
  const { pending, fout, voerUit } = useActie();

  return (
    <>
      <div className="jp-kaart rounded-lg border bg-card">
        <Dag
          dayKey={period.startDate}
          style={
            period.kind === "kamp"
              ? ({
                  "--row-bg": "var(--tg-zwbeter, var(--zwb-teal))",
                  "--row-ink": "#fbfbf7",
                } as CSSProperties)
              : undefined
          }
        />
        <div className="jp-tekst">
          <p className="jp-titel">{period.title}</p>
          <p className="jp-meta">
            {SEASON_PERIOD_LABELS[period.kind]} · t/m {dagMaand(period.endDate)} · {stop.days}{" "}
            {stop.days === 1 ? "dag" : "dagen"}
          </p>
          {period.note ? <p className="jp-meta">{period.note}</p> : null}
        </div>
        {editable ? (
          <div className="jp-acties">
            <Potlood
              label={`${period.title} bewerken`}
              open={bewerken}
              onClick={() => setBewerken((value) => !value)}
            />
          </div>
        ) : null}
      </div>

      {bewerken ? (
        <form
          className="jp-formulier grid gap-3 sm:grid-cols-2"
          onSubmit={(submit) => {
            submit.preventDefault();
            const formData = new FormData(submit.currentTarget);
            voerUit(
              () => updateSeasonPeriod(formData),
              () => setBewerken(false),
            );
          }}
        >
          <input type="hidden" name="id" value={period.id} />
          <label className="text-sm sm:col-span-2">
            Titel
            <input name="title" required defaultValue={period.title} className={`mt-1 ${FIELD}`} />
          </label>
          <label className="text-sm">
            Van
            <input
              type="date"
              name="start_date"
              required
              defaultValue={period.startDate}
              className={`mt-1 ${FIELD}`}
            />
          </label>
          <label className="text-sm">
            Tot en met
            <input
              type="date"
              name="end_date"
              required
              defaultValue={period.endDate}
              className={`mt-1 ${FIELD}`}
            />
          </label>
          <label className="text-sm">
            Soort
            <select name="kind" defaultValue={period.kind} className={`mt-1 ${FIELD}`}>
              {SEASON_PERIOD_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {SEASON_PERIOD_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Notitie
            <input name="note" defaultValue={period.note ?? ""} className={`mt-1 ${FIELD}`} />
          </label>
          <FormulierKnoppen
            pending={pending}
            onCancel={() => setBewerken(false)}
            onDelete={() =>
              voerUit(() => {
                const formData = new FormData();
                formData.set("id", period.id);
                return deleteSeasonPeriod(formData);
              })
            }
            deleteLabel="Verwijderen"
          />
        </form>
      ) : null}
      {fout ? <p className="jp-fout">{fout}</p> : null}
    </>
  );
}

function FormulierKnoppen({
  pending,
  onCancel,
  onDelete,
  deleteLabel,
}: {
  pending: boolean;
  onCancel: () => void;
  onDelete: () => void;
  deleteLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 sm:col-span-2">
      <Button type="submit" disabled={pending} className="min-h-11 sm:min-h-0">
        {pending ? "Opslaan…" : "Opslaan"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={onCancel}
        className="min-h-11 sm:min-h-0"
      >
        Annuleren
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={onDelete}
        className="ml-auto min-h-11 sm:min-h-0"
      >
        {deleteLabel}
      </Button>
    </div>
  );
}

/** Het hek waar het asfalt ophoudt, met de knop voor het volgende blok. */
function SchemaEinde({
  stop,
  today,
  editable,
}: {
  stop: Extract<SeasonRoadStop, { kind: "schema_eind" }>;
  today: string;
  editable: boolean;
}) {
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const onCompleted = useCallback(() => setKlaar(true), []);
  const poll = useAiDraftPoll({
    onCompleted,
    failureMessage: "Je volgende blok ophalen is mislukt.",
  });

  async function start() {
    setBezig(true);
    poll.setError(null);
    const result = await startNextBlock();
    setBezig(false);
    if (!result.ok) {
      poll.setError(result.error);
      return;
    }
    poll.watch(result.generationId);
  }

  const loopt = bezig || poll.pending;

  return (
    <div className="jp-regel">
      <p className="jp-titel">Tot hier is je schema uitgewerkt</p>
      <p className="jp-meta">
        {[dagMaand(stop.date), afstand(today, stop.date)].filter(Boolean).join(" · ")}
      </p>
      {klaar ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          Je volgende blok staat klaar.
          <Link href="/zwbeter-worden/schema" className={LINK_BUTTON}>
            Naar je schema
          </Link>
        </p>
      ) : editable && stop.startTarget && !stop.startTarget.goalId ? (
        // Vanaf hier hoort een nieuw schema, naar het A-doel toe. Dat maakt de
        // trainer; het lid zet er het doel voor klaar.
        <Link
          href={`/zwbeter-worden/doelen?mikpunt=${stop.startTarget.id}`}
          className={LINK_PRIMARY}
        >
          Start schema naar {stop.startTarget.title}
        </Link>
      ) : (
        <>
          {stop.startTarget ? (
            <p className="jp-meta">Het doel voor {stop.startTarget.title} ligt bij je trainer.</p>
          ) : null}
          {editable && stop.nextBlockDue ? (
            <Button type="button" disabled={loopt} onClick={start} className="mt-2 min-h-11">
              {loopt ? "Blok wordt gemaakt…" : "Volgend blok klaarzetten"}
            </Button>
          ) : null}
        </>
      )}
      {poll.error ? <p className="jp-fout">{poll.error}</p> : null}
    </div>
  );
}

/** Een signalering op de plek waar hij speelt, met de knop die hem oplost. */
function Melding({ warning }: { warning: SeasonWarning }) {
  const { pending, fout, voerUit } = useActie();
  const action = warning.action;

  return (
    <div className="jp-let">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="jp-let-titel">{warning.title}</p>
        <p className="jp-meta">{warning.detail}</p>
        {action ? (
          <div className="mt-2">
            {action.kind === "open_schema" ? (
              <Link href="/zwbeter-worden/schema" className={LINK_BUTTON}>
                {action.label}
              </Link>
            ) : action.kind === "open_event" ? (
              <Link href={`/events/${action.eventId}`} className={LINK_BUTTON}>
                {action.label}
              </Link>
            ) : action.kind === "maak_doel" ? (
              <Link
                href={`/zwbeter-worden/doelen?mikpunt=${action.targetId}`}
                className={LINK_BUTTON}
              >
                {action.label}
              </Link>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="min-h-9"
                onClick={() =>
                  voerUit(() => {
                    if (action.kind === "herzie_schema") return requestSeasonReplan();
                    const formData = new FormData();
                    formData.set("id", action.targetId);
                    formData.set("priority", "b");
                    return updateSeasonTarget(formData);
                  })
                }
              >
                {pending ? "Bezig…" : action.label}
              </Button>
            )}
          </div>
        ) : null}
        {fout ? <p className="jp-fout">{fout}</p> : null}
      </div>
    </div>
  );
}
