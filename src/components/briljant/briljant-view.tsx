"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { setBriljantSharing } from "@/app/(app)/stats/zwbriljant/actions";
import { LEVELS, type Level } from "@/lib/briljant/norms";
import { FACETS } from "@/lib/briljant/score";
import type { BriljantView as View, FacetView, Win } from "@/lib/briljant/view";
import type { SceneStone } from "./stone-scene";
import { briljantSans, briljantSerif } from "./fonts";
import styles from "./briljant.module.css";

const HallScene = dynamic(() => import("./hall-scene"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Zaal inrichten…</div>,
});

const StoneScene = dynamic(() => import("./stone-scene"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Steen slijpen…</div>,
});

/**
 * Een tweede steen naast de jouwe: een lid dat deelt, het ZWB-gemiddelde of je
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
};

type Props = {
  view: View;
  /** De maandag van de getoonde week bij een steen uit het verleden; null is nu. */
  asOf: string | null;
  asOfLabel: string | null;
  dates: { first: string | null; today: string; chosen: string | null };
  compare: BriljantCompare | null;
  options: {
    average: { members: number } | null;
    members: Array<{ id: string; name: string }>;
    sharing: boolean;
    /** Je mooiste steen tot nu toe, als keuze bij vergelijken. */
    best: boolean;
    /** Er is iets om in de zaal te zetten naast je eigen steen. */
    hall: boolean;
  };
  /** Waar je het meest wint met 5% beter; leeg bij een steen uit het verleden. */
  wins: Win[];
  /** De zaal: alle stenen die je mag zien, met de jouwe ("ik"); null buiten de zaal. */
  hall: Array<{ id: string; name: string; view: View }> | null;
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
  compare,
  wins,
  unit,
}: {
  panel: NonNullable<Panel>;
  view: View;
  compare: BriljantCompare | null;
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
              <th>Jij</th>
              <th>{compare.short}</th>
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
          {c.hitWeeks != null && c.normHours != null && (
            <>
              <dt>Regelmaat</dt>
              <dd>
                {c.hitWeeks} van de {c.weeks} weken minstens 60% van{" "}
                {c.normSource === "schema"
                  ? `je geplande trainingstijd gereden (meestal ${nl(c.normHours, 1)} uur)`
                  : `je gebruikelijke weekuren gereden (${nl(c.normHours, 1)} uur)`}
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

export function BriljantView({ view, asOf, asOfLabel, dates, compare, options, wins, hall }: Props) {
  const labels = useRef(new Map<string, HTMLElement>());
  const [failed, setFailed] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const opener = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [aiming, setAiming] = useState(false);
  const [sharing, setSharing] = useState(options.sharing);
  const unit = useSyncExternalStore(subscribeUnit, readUnit, () => "waarden" as Unit);
  const [pending, startTransition] = useTransition();
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

  /** Datum en vergelijking staan in de adresbalk, zodat terug en delen gewoon werken. */
  const go = (next: { datum?: string | null; met?: string | null }) => {
    const params = new URLSearchParams();
    const datum = next.datum === undefined ? dates.chosen : next.datum;
    const met = next.met === undefined ? (compare?.id ?? null) : next.met;
    if (datum) params.set("datum", datum);
    if (met) params.set("met", met);
    setPanel(null);
    router.push(params.size ? `?${params.toString()}` : "?", { scroll: false });
  };

  const toggleSharing = (share: boolean) => {
    setSharing(share);
    startTransition(async () => {
      const result = await setBriljantSharing(share);
      if (!result.ok) setSharing(!share);
    });
  };

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

        <header className={styles.crest}>
          <button type="button" className={styles.score} onClick={(event) => open({ kind: "score" }, event.currentTarget)}>
            {nl(score)}
            <small>punten</small>
          </button>
          <div className={styles.rule}>
            <i style={{ width: `${Math.round(share * 100)}%` }} />
          </div>
          <p className={styles.tier}>
            <Lozenge level={view.level} />
            {view.level.name}
          </p>
          <p className={styles.next}>
            {asOfLabel
              ? `week van ${asOfLabel}`
              : view.next
                ? `nog ${view.toNext} punten tot ${view.next.name}`
                : "Diamant: de score telt door"}
          </p>
          {!asOf && view.delta4w != null && view.delta4w !== 0 && (
            <p className={styles.next}>
              {view.delta4w > 0 ? "+" : "−"}
              {Math.abs(view.delta4w)} punten in 4 weken
            </p>
          )}

          <div className={styles.controls}>
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
            <label className={styles.control}>
              <span className="sr-only">Vergelijk met</span>
              <select value={hall ? "zaal" : (compare?.id ?? "")} onChange={(event) => go({ met: event.target.value || null })}>
                <option value="">Vergelijk met…</option>
                {options.hall && <option value="zaal">De zaal: alle stenen</option>}
                {options.best && <option value="mooiste">Mijn mooiste steen</option>}
                <option value="records">Records</option>
                {options.average && <option value="zwb">ZWB-gemiddelde</option>}
                {options.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.units} role="group" aria-label="Weergave">
              {(["waarden", "punten"] as const).map((option) => (
                <button key={option} type="button" aria-pressed={unit === option} onClick={() => chooseUnit(option)}>
                  {option === "waarden" ? "Waarden" : "Punten"}
                </button>
              ))}
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={sharing}
                disabled={pending}
                onChange={(event) => toggleSharing(event.target.checked)}
              />
              <span>Deel mijn steen met leden</span>
            </label>
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
            {/* Het plaatje op de sokkel: naam, punten en klasse; kiezen zet die steen naast de jouwe. */}
            {hall.map((stone) => (
              <div key={stone.id} ref={setLabel(`hall:${stone.id}`)} className={styles.anchor}>
                <button type="button" className={styles.plaque} onClick={() => go({ met: stone.id === "ik" ? null : stone.id })}>
                  <span>{stone.name}</span>
                  <b>{nl(stone.view.points)}</b>
                  <small>{stone.view.level.name}</small>
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
                {asOf ? "toen" : "jouw score"}
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
              compare={compare}
              wins={wins}
              unit={unit}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
