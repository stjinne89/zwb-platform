"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { FACET_WEIGHTS, LEVELS, type Level } from "@/lib/briljant/norms";
import { FACETS, FACET_LABELS } from "@/lib/briljant/score";
import type { BriljantView as View, FacetView, Win } from "@/lib/briljant/view";
import type { SceneStone } from "./stone-scene";
import { briljantSans, briljantSerif } from "./fonts";
import styles from "./briljant.module.css";

const HallScene = dynamic(() => import("./hall-scene"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Galerij inrichten…</div>,
});

const StoneScene = dynamic(() => import("./stone-scene"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Steen slijpen…</div>,
});

/**
 * Drie tabbladen (eigenaar, 2026-10-22): Ik is je eigen steen, ZWB de galerij (en een
 * steen daaruit los, zonder de jouwe), Vergelijken een tweede steen naast de jouwe.
 */
export type BriljantTab = "ik" | "zwb" | "vergelijken";

const TABS: Array<{ key: BriljantTab; label: string }> = [
  { key: "ik", label: "Ik" },
  { key: "zwb", label: "ZWB" },
  { key: "vergelijken", label: "Vergelijken" },
];

/**
 * Een andere steen: een lid dat deelt, het ZWB-gemiddelde, de records of je
 * mooiste steen. `label` staat boven de steen, `short` boven de kolom in het paneel.
 */
export type BriljantCompare = {
  id: string;
  name: string;
  label: string;
  short: string;
  view: View;
  /** Bij de recordsteen: de houder per onderdeel, waar die bekend is. */
  holders?: Partial<Record<FacetView["key"], string>>;
  /** Zoals in een zin ("Piet", "het gemiddelde ZWB-lid"); alleen waar vergelijkzinnen passen. */
  subject?: string;
  region?: string | null;
  date?: string | null;
};

export type BriljantHallStone = { id: string; name: string; view: View; region?: string | null; date?: string | null };

type Props = {
  tab: BriljantTab;
  /** De steen in beeld: de jouwe, of bij ZWB die van `subject`. */
  view: View;
  /**
   * De steen in beeld als die niet van jou is: bij ZWB de steen die je los bekijkt
   * (null is de galerij), bij Vergelijken de linker (null is jij).
   */
  subject: BriljantCompare | null;
  /** De maandag van de getoonde week bij een steen uit het verleden; null is nu. */
  asOf: string | null;
  asOfLabel: string | null;
  dates: { first: string | null; today: string; chosen: string | null };
  /** Bij Vergelijken: de tweede steen. */
  compare: BriljantCompare | null;
  /** Bij Vergelijken: de verschillen in woorden. */
  lines: string[];
  options: {
    /** De gemiddelde stenen met genoeg leden: van iedereen, mannen en vrouwen. */
    averages: Array<{ id: string; label: string }>;
    members: Array<{ id: string; name: string }>;
    /** Je mooiste steen tot nu toe, als keuze bij vergelijken. */
    best: boolean;
  };
  /** Waar je het meest wint met 5% beter; alleen bij je eigen steen van nu. */
  wins: Win[];
  /** De galerij: alle stenen die je mag zien, met de jouwe ("ik"); null buiten de galerij. */
  hall: BriljantHallStone[] | null;
  /** Je verbergt je steen, en ziet dus ook die van andere leden niet. */
  hidden: boolean;
};

type Panel =
  | { kind: "score" }
  | { kind: "consistency" }
  | { kind: "compare" }
  | { kind: "facet"; key: FacetView["key"] }
  | null;

/** Wat de labels en tabellen tonen: de meting (W/kg, CTL, ZRS) of de punten. */
type Unit = "waarden" | "punten";
const UNIT_KEY = "zwbriljant-weergave";
const UNIT_EVENT = "zwbriljant-weergave";

// De gekozen weergave onthouden we per apparaat; zonder opslag gewoon de waarden.
// Zonder opslag (privévenster) werkt de knop toch, alleen zonder onthouden.
let unitInMemory: Unit = "waarden";
function readUnit(): Unit {
  try {
    const stored = window.localStorage.getItem(UNIT_KEY);
    return stored === "punten" || stored === "waarden" ? stored : unitInMemory;
  } catch {
    return unitInMemory;
  }
}
function subscribeUnit(onChange: () => void) {
  window.addEventListener(UNIT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(UNIT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function chooseUnit(next: Unit) {
  unitInMemory = next;
  try {
    window.localStorage.setItem(UNIT_KEY, next);
  } catch {}
  window.dispatchEvent(new Event(UNIT_EVENT));
}

/** De meting als die er is en gevraagd wordt; anders de punten. */
const shown = (facet: FacetView | undefined, unit: Unit) =>
  !facet ? "–" : unit === "waarden" && facet.value ? facet.value : String(facet.points);

const nl = (value: number, digits = 0) =>
  value.toLocaleString("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const sceneStone = (view: View): SceneStone => ({
  seed: view.seed,
  score: view.points,
  profile: view.profilePoints,
  level: view.level,
  facets: view.facets.map((facet) => ({ key: facet.key, points: facet.points })),
});

/** Een ruitje in de kleur van een klasse. */
function Lozenge({ level, className }: { level: Level; className?: string }) {
  return (
    <svg viewBox="0 0 11 16" aria-hidden className={className ?? styles.lozenge} style={{ fill: level.color }}>
      <polygon points="5.5,0 11,6 5.5,16 0,6" />
    </svg>
  );
}

function Meter({ facet }: { facet: FacetView }) {
  const { meter } = facet;
  const pct = Math.round(meter.share * 1000) / 10;
  return (
    <div className={styles.meter} style={{ "--fill": facet.level.color } as CSSProperties}>
      <div className={styles.meterValue} style={{ left: `${pct}%` }}>
        {facet.value || `${facet.points} punten`}
      </div>
      <div className={styles.meterTrack}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.meterEnds}>
        <span>
          {meter.from}
          {meter.fromLevel && <b>{meter.fromLevel.name}</b>}
        </span>
        <span>
          {meter.to}
          {meter.toLevel && <b>{meter.toLevel.name}</b>}
        </span>
      </div>
      <p className={styles.meterNote}>{meter.note}</p>
    </div>
  );
}

function PanelBody({
  panel,
  view,
  subject,
  compare,
  lines,
  wins,
  unit,
}: {
  panel: NonNullable<Panel>;
  view: View;
  subject: BriljantCompare | null;
  compare: BriljantCompare | null;
  lines: string[];
  wins: Win[];
  unit: Unit;
}) {
  if (panel.kind === "facet") {
    const facet = view.facets.find((candidate) => candidate.key === panel.key)!;
    const theirs = compare?.view.facets.find((candidate) => candidate.key === panel.key) ?? null;
    return (
      <>
        <h2 tabIndex={-1}>
          {facet.label}
          <span className={styles.pts}>
            {facet.points} · {facet.level.name}
          </span>
        </h2>
        <Meter facet={facet} />
        <dl>
          <dt>Meting</dt>
          <dd>
            {facet.what}
            {facet.lowerIsBetter ? " (minder is beter)" : ""}
          </dd>
          <dt>Periode</dt>
          <dd>{facet.source}</dd>
          <dt>Telt mee</dt>
          <dd>
            {nl(facet.weight * 100, 1)}% · {facet.contribution} punten
          </dd>
          {compare && (
            <>
              <dt>{compare.label}</dt>
              <dd>
                {theirs ? `${shown(theirs, unit)} · ${theirs.level.name}` : "geen gegevens"}
                {compare.holders?.[panel.key] && <span className={styles.holder}>{compare.holders[panel.key]}</span>}
              </dd>
            </>
          )}
        </dl>
      </>
    );
  }
  if (panel.kind === "compare" && compare) {
    const mine = new Map(view.facets.map((facet) => [facet.key, facet]));
    const theirs = new Map(compare.view.facets.map((facet) => [facet.key, facet]));
    // In de vaste volgorde rond de steen, ook als een van beide een onderdeel mist.
    const keys = FACETS.filter((key) => mine.has(key) || theirs.has(key));
    return (
      <>
        <h2 tabIndex={-1}>
          {compare.name}
          <span className={styles.pts}>
            {compare.view.points} · {compare.view.level.name}
          </span>
        </h2>
        <table>
          <thead>
            <tr>
              <th>Onderdeel</th>
              <th>{subject?.label ?? "Jij"}</th>
              <th>{compare.label}</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const facet = mine.get(key) ?? theirs.get(key)!;
              return (
                <tr key={key}>
                  <td>{facet.label}</td>
                  <td>{shown(mine.get(key), unit)}</td>
                  <td>
                    {shown(theirs.get(key), unit)}
                    {compare.holders?.[key] && <span className={styles.holder}>{compare.holders[key]}</span>}
                  </td>
                </tr>
              );
            })}
            <tr className={styles.sum}>
              <td>Score</td>
              <td>{view.points}</td>
              <td>{compare.view.points}</td>
            </tr>
          </tbody>
        </table>
        {lines.length > 0 && (
          <ul className={styles.lines}>
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </>
    );
  }
  if (panel.kind === "consistency" && view.consistency) {
    const c = view.consistency;
    return (
      <>
        <h2 tabIndex={-1}>
          Consistentie<span className={styles.pts}>{Math.round(c.value * 100)}%</span>
        </h2>
        <dl>
          {c.hitWeeks != null && c.norm != null && (
            <>
              <dt>Regelmaat</dt>
              <dd>
                {c.hitWeeks} van de {c.weeks} weken minstens 60% van{" "}
                {c.measure === "tss"
                  ? c.normSource === "schema"
                    ? `je geplande TSS gereden (meestal ${nl(c.norm)} TSS)`
                    : `je gebruikelijke week-TSS gereden (${nl(c.norm)} TSS)`
                  : c.normSource === "schema"
                    ? `je geplande trainingstijd gereden (meestal ${nl(c.norm, 1)} uur)`
                    : `je gebruikelijke weekuren gereden (${nl(c.norm, 1)} uur)`}
              </dd>
            </>
          )}
          {c.streak != null && (
            <>
              <dt>Volhouden</dt>
              <dd>{c.streak} weken op rij</dd>
            </>
          )}
          {c.compliance != null && (
            <>
              <dt>Naleving</dt>
              <dd>{Math.round(c.compliance * 100)}% van je geplande trainingstijd</dd>
            </>
          )}
          <dt>Telt mee</dt>
          <dd>factor {nl(c.factor, 2)} op je score</dd>
        </dl>
      </>
    );
  }
  return (
    <>
      <h2 tabIndex={-1}>
        {nl(view.points)}
        <span className={styles.pts}>punten · {view.level.name}</span>
      </h2>
      <table>
        <thead>
          <tr>
            <th>Onderdeel</th>
            <th>Punten</th>
            <th>Gewicht</th>
            <th>Bijdrage</th>
          </tr>
        </thead>
        <tbody>
          {view.facets.map((facet) => (
            <tr key={facet.key}>
              <td>{facet.label}</td>
              <td>{facet.points}</td>
              <td>{nl(facet.weight * 100, 1)}%</td>
              <td>{facet.contribution}</td>
            </tr>
          ))}
          {/* Een onderdeel zonder gegevens telt mee voor 0: de score is een optelling. */}
          {view.missing.map((key) => (
            <tr key={key} className={styles.missing}>
              <td>{FACET_LABELS[key]}</td>
              <td>–</td>
              <td>{nl(FACET_WEIGHTS[key] * 100, 1)}%</td>
              <td>0</td>
            </tr>
          ))}
          <tr className={styles.sum}>
            <td>Profielscore</td>
            <td />
            <td />
            <td>{view.profilePoints}</td>
          </tr>
          {view.consistency && (
            <tr>
              <td>Consistentie {Math.round(view.consistency.value * 100)}%</td>
              <td />
              <td>× {nl(view.consistency.factor, 2)}</td>
              <td />
            </tr>
          )}
          <tr className={styles.sum}>
            <td>Score</td>
            <td />
            <td />
            <td>{view.points}</td>
          </tr>
        </tbody>
      </table>
      {wins.length > 0 && (
        <div className={styles.wins}>
          <h3>Hier win je het meest</h3>
          <ol>
            {wins.map((win) => (
              <li key={win.key}>
                <b>{win.label}</b> +5%
                <span>
                  {win.step} · +{win.gain} punten
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

export function BriljantView({ tab, view, subject, asOf, asOfLabel, dates, compare, lines, options, wins, hall, hidden }: Props) {
  const labels = useRef(new Map<string, HTMLElement>());
  const [failed, setFailed] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const opener = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [aiming, setAiming] = useState(false);
  const unit = useSyncExternalStore(subscribeUnit, readUnit, () => "waarden" as Unit);
  const router = useRouter();
  const score = view.points;
  const profile = view.profilePoints;

  const setLabel = useCallback(
    (key: string) => (element: HTMLElement | null) => {
      if (element) labels.current.set(key, element);
      else labels.current.delete(key);
    },
    [],
  );

  const open = (next: NonNullable<Panel>, from: HTMLElement) => {
    opener.current = from;
    setPanel(next);
  };
  const close = useCallback(() => {
    setPanel(null);
    // Zonder scrollen: anders springt de pagina mee naar het label.
    opener.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!panel) return;
    panelRef.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, close]);

  // Op de telefoon vult de steen het hele scherm; de pagina eronder scrolt dan niet mee.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 640px)").matches) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, []);

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/stats");
  };

  /**
   * Tabblad, datum, het lid in de galerij en de vergelijking staan in de adresbalk,
   * zodat terug en delen gewoon werken. Een ander tabblad begint schoon.
   */
  const go = (next: { tab?: BriljantTab; datum?: string | null; lid?: string | null; van?: string | null; met?: string | null }) => {
    const target = next.tab ?? tab;
    const params = new URLSearchParams();
    if (target !== "ik") params.set("tab", target);
    const datum = next.datum !== undefined ? next.datum : target === tab ? dates.chosen : null;
    if (target === "ik" && datum) params.set("datum", datum);
    if (target === "zwb" && next.lid) params.set("lid", next.lid);
    const van = next.van !== undefined ? next.van : target === tab && tab === "vergelijken" ? (subject?.id ?? null) : null;
    if (target === "vergelijken" && van && van !== "ik") params.set("van", van);
    const met = next.met !== undefined ? next.met : target === tab ? (compare?.id ?? null) : null;
    if (target === "vergelijken" && met) params.set("met", met);
    setPanel(null);
    router.push(params.size ? `?${params.toString()}` : "?", { scroll: false });
  };

  // Alleen je eigen stenen en de records hebben metingen; van leden zie je punten.
  const hasValues = view.facets.some((facet) => facet.value) || Boolean(compare?.view.facets.some((facet) => facet.value));

  const tierStyle = { "--tier": view.level.color } as CSSProperties;
  const share = view.next ? (score - view.level.n * 100) / 100 : 1;

  return (
    <div className={`${styles.root} ${briljantSerif.variable} ${briljantSans.variable}`} style={tierStyle}>
      <div className={styles.stage}>
        {!failed && hall && (
          <HallScene
            stones={hall.map((stone) => ({ ...sceneStone(stone.view), id: stone.id }))}
            startId="ik"
            labels={labels}
            onFailed={() => setFailed(true)}
            rotate={!panel && !aiming}
          />
        )}
        {!failed && !hall && (
          <StoneScene
            {...sceneStone(view)}
            compare={compare ? sceneStone(compare.view) : null}
            labels={labels}
            onFailed={() => setFailed(true)}
            rotate={!panel && !aiming}
          />
        )}

        {failed && (
          <div className={styles.fallback}>
            <Lozenge level={view.level} className={styles.fallbackStone} />
          </div>
        )}

        <button type="button" className={styles.back} onClick={back}>
          <ArrowLeft className="size-4" aria-hidden />
          Terug
        </button>

        <nav className={styles.tabs} aria-label="ZWBriljant">
          {TABS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-current={tab === option.key ? "page" : undefined}
              onClick={() => go({ tab: option.key })}
            >
              {option.label}
            </button>
          ))}
        </nav>

        <header className={styles.crest}>
          {subject && (
            <p className={styles.who}>
              {subject.label}
              {subject.region && <i>{subject.region}</i>}
            </p>
          )}
          {/* De klasse staat op de plek van "punten": dat scheelt een regel. */}
          <button type="button" className={styles.score} onClick={(event) => open({ kind: "score" }, event.currentTarget)}>
            {nl(score)}
            <small>
              <Lozenge level={view.level} />
              {view.level.name}
            </small>
          </button>
          <div className={styles.rule}>
            <i style={{ width: `${Math.round(share * 100)}%` }} />
          </div>
          <p className={styles.next}>
            {asOfLabel
              ? `week van ${asOfLabel}`
              : subject?.date
                ? `week van ${subject.date}`
                : view.next
                ? `nog ${view.toNext} punten tot ${view.next.name}`
                : "Diamant: de score telt door"}
          </p>
          {!asOf && !subject && view.delta4w != null && view.delta4w !== 0 && (
            <p className={styles.next}>
              {view.delta4w > 0 ? "+" : "−"}
              {Math.abs(view.delta4w)} punten in 4 weken
            </p>
          )}

          <div className={styles.controls}>
            {tab === "ik" && (
              <>
                <label className={styles.control}>
                  <span className="sr-only">Datum</span>
                  <input
                    type="date"
                    min={dates.first ?? undefined}
                    max={dates.today}
                    value={asOf ? (dates.chosen ?? asOf) : dates.today}
                    disabled={!dates.first}
                    onChange={(event) => go({ datum: event.target.value && event.target.value < dates.today ? event.target.value : null })}
                  />
                </label>
                {asOf && (
                  <button type="button" className={styles.now} onClick={() => go({ datum: null })}>
                    Naar nu
                  </button>
                )}
              </>
            )}
            {tab === "zwb" && subject && (
              <>
                <button type="button" className={styles.now} onClick={() => go({ lid: null })}>
                  Naar de galerij
                </button>
                {subject.id !== "records" && (
                  <button type="button" className={styles.now} onClick={() => go({ tab: "vergelijken", met: subject.id })}>
                    Vergelijk met mij
                  </button>
                )}
              </>
            )}
            {tab === "vergelijken" && (
              <>
                {/* Links en rechts: jij, een gemiddelde, je mooiste steen, de records of een lid. */}
                {(["van", "met"] as const).map((side) => (
                  <label key={side} className={styles.control}>
                    <span className="sr-only">{side === "van" ? "Vergelijk" : "met"}</span>
                    <select
                      value={side === "van" ? (subject?.id ?? "ik") : (compare?.id ?? "")}
                      onChange={(event) => go({ [side]: event.target.value || null })}
                    >
                      <option value="ik">Jij</option>
                      {options.averages.map((average) => (
                        <option key={average.id} value={average.id}>
                          {average.label}
                        </option>
                      ))}
                      {options.best && <option value="mooiste">Mijn mooiste steen</option>}
                      <option value="records">Records</option>
                      {options.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </>
            )}
            {hidden && tab !== "ik" && (
              <Link href="/profiel#zichtbaarheid" className={styles.now}>
                Steen verborgen · delen
              </Link>
            )}
            {!hall && hasValues && (
              <div className={styles.units} role="group" aria-label="Weergave">
                {(["waarden", "punten"] as const).map((option) => (
                  <button key={option} type="button" aria-pressed={unit === option} onClick={() => chooseUnit(option)}>
                    {option === "waarden" ? "Waarden" : "Punten"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Zonder 3D staat de lijst met onderdelen onderin; dan geen ladder. */}
        {!failed && (
          <ol className={styles.ladder} aria-label="Klassen">
            {[...LEVELS].reverse().map((level) => (
              <li key={level.n} className={level.n === view.level.n ? styles.on : undefined}>
                <Lozenge level={level} />
                <span>{level.name}</span>
                <span>{level.n === 9 ? "900+" : level.n * 100}</span>
              </li>
            ))}
          </ol>
        )}

        {!failed && hall ? (
          <div className={styles.labels} onPointerOver={() => setAiming(true)} onPointerOut={() => setAiming(false)}>
            {/* Het bordje op de sokkel, zoals in een museum; kiezen toont die steen los. */}
            {hall.map((stone) => (
              <div key={stone.id} ref={setLabel(`hall:${stone.id}`)} className={styles.anchor}>
                <button
                  type="button"
                  className={styles.plaque}
                  onClick={() => go(stone.id === "ik" ? { tab: "ik" } : { lid: stone.id })}
                >
                  <b>{stone.name}</b>
                  {stone.region && <i>{stone.region}</i>}
                  <span>
                    {nl(stone.view.points)} · {stone.view.level.name}
                  </span>
                  {stone.date && <small>{stone.date}</small>}
                </button>
              </div>
            ))}
          </div>
        ) : !failed ? (
          <div
            className={styles.labels}
            // Stil zetten terwijl je een label aanwijst, zodat je raakt wat je bedoelt.
            onPointerOver={() => setAiming(true)}
            onPointerOut={() => setAiming(false)}
          >
            <div ref={setLabel("summit")} className={styles.anchor}>
              <button
                type="button"
                className={`${styles.summit} ${compare ? styles.pair : ""}`}
                onClick={(event) => open({ kind: "score" }, event.currentTarget)}
              >
                <b>{nl(score)}</b>
                {asOf ? "toen" : subject ? subject.label : "jouw score"}
              </button>
            </div>
            {profile > score && !compare && (
              <div ref={setLabel("ghost")} className={styles.anchor}>
                <span className={styles.ghost}>{nl(profile)} bij volle consistentie</span>
              </div>
            )}
            {compare && (
              <div ref={setLabel("compare")} className={styles.anchor}>
                <button type="button" className={`${styles.summit} ${styles.pair}`} onClick={(event) => open({ kind: "compare" }, event.currentTarget)}>
                  <b>{nl(compare.view.points)}</b>
                  {compare.label}
                </button>
              </div>
            )}
            {view.consistency && (
              <div ref={setLabel("foot")} className={styles.anchor}>
                <button type="button" className={styles.foot} onClick={(event) => open({ kind: "consistency" }, event.currentTarget)}>
                  Consistentie <b>{Math.round(view.consistency.value * 100)}%</b> · factor {nl(view.consistency.factor, 2)}
                  <span>de steen is {Math.round(view.consistency.factor * 100)}% van zijn volle maat</span>
                </button>
              </div>
            )}
            {/* Bij vergelijken staan de onderdelen naast elkaar in het paneel van de tweede steen. */}
            {!compare && view.facets.map((facet) => (
              <div key={facet.key} ref={setLabel(`facet:${facet.key}`)} className={styles.anchor}>
                <button type="button" className={styles.facet} onClick={(event) => open({ kind: "facet", key: facet.key }, event.currentTarget)}>
                  <b>
                    <Lozenge level={facet.level} className={styles.facetMark} />
                    {facet.label} {shown(facet, unit)}
                  </b>
                  <span>
                    {facet.level.name}
                    {unit === "waarden" && facet.value ? ` · ${facet.points} punten` : facet.value ? ` · ${facet.value}` : ""}
                  </span>
                </button>
              </div>
            ))}
            {LEVELS.map((level) => (
              <div key={level.n} ref={setLabel(`ref:${level.n}`)} className={styles.anchor} aria-hidden>
                <span className={styles.ref}>
                  <b>
                    <Lozenge level={level} className={styles.facetMark} />
                    {level.n === 0 ? "0–99" : level.n * 100}
                  </b>
                  {level.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <ul className={styles.facetList}>
            {view.facets.map((facet) => (
              <li key={facet.key}>
                <button type="button" onClick={(event) => open({ kind: "facet", key: facet.key }, event.currentTarget)}>
                  <Lozenge level={facet.level} className={styles.facetMark} />
                  {facet.label} <b>{shown(facet, unit)}</b>
                  <span>{facet.level.name}</span>
                </button>
              </li>
            ))}
            {view.consistency && (
              <li>
                <button type="button" onClick={(event) => open({ kind: "consistency" }, event.currentTarget)}>
                  Consistentie <b>{Math.round(view.consistency.value * 100)}%</b>
                </button>
              </li>
            )}
          </ul>
        )}

        {lines.length > 0 && (
          <ul className={styles.verdict} aria-label="Het verschil">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        <aside
          ref={panelRef}
          className={`${styles.panel} ${panel ? styles.panelOpen : ""}`}
          aria-hidden={!panel}
          inert={!panel}
          aria-label="Uitleg"
        >
          <button type="button" className={styles.close} onClick={close} aria-label="Sluiten">
            <X className="size-5" />
          </button>
          {panel && (
            <PanelBody
              panel={panel}
              view={view}
              subject={subject}
              compare={compare}
              lines={lines}
              wins={wins}
              unit={unit}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
