"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { X } from "lucide-react";
import { LEVELS, type Level } from "@/lib/briljant/norms";
import type { BriljantView as View, FacetView } from "@/lib/briljant/view";
import { briljantSans, briljantSerif } from "./fonts";
import styles from "./briljant.module.css";

const StoneScene = dynamic(() => import("./stone-scene"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Steen slijpen…</div>,
});

type Panel =
  | { kind: "score" }
  | { kind: "consistency" }
  | { kind: "facet"; key: FacetView["key"] }
  | null;

const nl = (value: number, digits = 0) =>
  value.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** Een ruitje in de kleur van een klasse. */
function Lozenge({ level, className }: { level: Level; className?: string }) {
  return (
    <svg
      viewBox="0 0 11 16"
      aria-hidden
      className={className ?? styles.lozenge}
      style={{ fill: level.color }}
    >
      <polygon points="5.5,0 11,6 5.5,16 0,6" />
    </svg>
  );
}

function Meter({ facet }: { facet: FacetView }) {
  const { meter } = facet;
  const pct = Math.round(meter.share * 1000) / 10;
  return (
    <div
      className={styles.meter}
      style={{ "--fill": facet.level.color } as CSSProperties}
    >
      <div className={styles.meterValue} style={{ left: `${pct}%` }}>
        {facet.value}
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

function PanelBody({ panel, view }: { panel: NonNullable<Panel>; view: View }) {
  if (panel.kind === "facet") {
    const facet = view.facets.find((candidate) => candidate.key === panel.key)!;
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
        </dl>
      </>
    );
  }
  if (panel.kind === "consistency" && view.consistency) {
    const c = view.consistency;
    return (
      <>
        <h2 tabIndex={-1}>
          Consistentie
          <span className={styles.pts}>{Math.round(c.value * 100)}%</span>
        </h2>
        <dl>
          <dt>Regelmaat</dt>
          <dd>
            {c.hitWeeks} van de {c.weeks} weken je norm gehaald (
            {nl(c.normHours, 1)} uur per week, uit je{" "}
            {c.normSource === "schema" ? "schema" : "eigen weken"})
          </dd>
          <dt>Volhouden</dt>
          <dd>{c.streak} weken op rij</dd>
          {c.compliance != null && (
            <>
              <dt>Naleving</dt>
              <dd>
                {Math.round(c.compliance * 100)}% van je geplande trainingstijd
              </dd>
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
    </>
  );
}

export function BriljantView({ view }: { view: View }) {
  const labels = useRef(new Map<string, HTMLElement>());
  const [failed, setFailed] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const opener = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement>(null);
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
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (!panel) return;
    panelRef.current?.querySelector<HTMLElement>("h2")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, close]);

  const tierStyle = { "--tier": view.level.color } as CSSProperties;
  const share = view.next ? (score - view.level.n * 100) / 100 : 1;

  return (
    <div
      className={`${styles.root} ${briljantSerif.variable} ${briljantSans.variable}`}
      style={tierStyle}
    >
      <div className={styles.stage}>
        {!failed && (
          <StoneScene
            seed={view.seed}
            score={score}
            profile={profile}
            level={view.level}
            facets={view.facets.map((facet) => ({
              key: facet.key,
              points: facet.points,
            }))}
            labels={labels}
            onFailed={() => setFailed(true)}
          />
        )}

        {failed && (
          <div className={styles.fallback}>
            <Lozenge level={view.level} className={styles.fallbackStone} />
          </div>
        )}

        <header className={styles.crest}>
          <button
            type="button"
            className={styles.score}
            onClick={(event) => open({ kind: "score" }, event.currentTarget)}
          >
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
            {view.next
              ? `nog ${view.toNext} punten tot ${view.next.name}`
              : "Diamant: de recordwaarden"}
          </p>
          {view.delta4w != null && view.delta4w !== 0 && (
            <p className={styles.next}>
              {view.delta4w > 0 ? "+" : "−"}
              {Math.abs(view.delta4w)} punten in 4 weken
            </p>
          )}
        </header>

        {/* Zonder 3D staat de lijst met onderdelen onderin; dan geen ladder. */}
        {!failed && (
          <ol className={styles.ladder} aria-label="Klassen">
            {[...LEVELS].reverse().map((level) => (
              <li
                key={level.n}
                className={level.n === view.level.n ? styles.on : undefined}
              >
                <Lozenge level={level} />
                <span>{level.name}</span>
                <span>{level.n === 9 ? "900+" : level.n * 100}</span>
              </li>
            ))}
          </ol>
        )}

        {!failed ? (
          <div className={styles.labels}>
            <div ref={setLabel("summit")} className={styles.anchor}>
              <button
                type="button"
                className={styles.summit}
                onClick={(event) =>
                  open({ kind: "score" }, event.currentTarget)
                }
              >
                <b>{nl(score)}</b>jouw score
              </button>
            </div>
            {profile > score && (
              <div ref={setLabel("ghost")} className={styles.anchor}>
                <span className={styles.ghost}>
                  {nl(profile)} bij volle consistentie
                </span>
              </div>
            )}
            {view.consistency && (
              <div ref={setLabel("foot")} className={styles.anchor}>
                <button
                  type="button"
                  className={styles.foot}
                  onClick={(event) =>
                    open({ kind: "consistency" }, event.currentTarget)
                  }
                >
                  Consistentie{" "}
                  <b>{Math.round(view.consistency.value * 100)}%</b> · factor{" "}
                  {nl(view.consistency.factor, 2)}
                  <span>
                    de steen is {Math.round(view.consistency.factor * 100)}% van
                    zijn volle maat
                  </span>
                </button>
              </div>
            )}
            {view.facets.map((facet) => (
              <div
                key={facet.key}
                ref={setLabel(`facet:${facet.key}`)}
                className={styles.anchor}
              >
                <button
                  type="button"
                  className={styles.facet}
                  onClick={(event) =>
                    open({ kind: "facet", key: facet.key }, event.currentTarget)
                  }
                >
                  <b>
                    <Lozenge level={facet.level} className={styles.facetMark} />
                    {facet.label} {facet.points}
                  </b>
                  <span>
                    {facet.level.name} · {facet.value}
                  </span>
                </button>
              </div>
            ))}
            {LEVELS.map((level) => (
              <div
                key={level.n}
                ref={setLabel(`ref:${level.n}`)}
                className={styles.anchor}
                aria-hidden
              >
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
                <button
                  type="button"
                  onClick={(event) =>
                    open({ kind: "facet", key: facet.key }, event.currentTarget)
                  }
                >
                  <Lozenge level={facet.level} className={styles.facetMark} />
                  {facet.label} <b>{facet.points}</b>
                  <span>{facet.level.name}</span>
                </button>
              </li>
            ))}
            {view.consistency && (
              <li>
                <button
                  type="button"
                  onClick={(event) =>
                    open({ kind: "consistency" }, event.currentTarget)
                  }
                >
                  Consistentie{" "}
                  <b>{Math.round(view.consistency.value * 100)}%</b>
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
          <button
            type="button"
            className={styles.close}
            onClick={close}
            aria-label="Sluiten"
          >
            <X className="size-5" />
          </button>
          {panel && <PanelBody panel={panel} view={view} />}
        </aside>
      </div>
    </div>
  );
}
