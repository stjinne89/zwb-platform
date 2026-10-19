"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Feather, Users, Wind, Zap } from "lucide-react";
import { elevationAt } from "@/lib/zwbgame/routes";
import type { PowerupId, RaceEvent, RaceState } from "@/lib/zwbgame/types";
import styles from "./game.module.css";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const km = (meters: number) => (meters / 1000).toFixed(1).replace(".", ",");
const powerupNames: Record<PowerupId, string> = { feather: "Veer", aero: "Aerohelm", draft: "Draft boost", burrito: "Burrito", ghost: "Spook", anvil: "Aambeeld", steamroller: "Stoomwals" };
const eventNames: Record<RaceEvent["kind"], string> = { attack: "Aanval", empty: "W′ leeg", powerup: "Powerup", dropped: "Gelost", back: "Terug in de kopgroep" };
const W = 600, STRIP = 40;

/**
 * Your race per kilometre, after the finish: three strips on one distance axis
 * (group, W′, time in the wind) and what you did where. Numbers only; what they
 * mean is on /hulp.
 */
export function Debrief({ race }: { race: RaceState }) {
  const [hover, setHover] = useState<number | null>(null);
  const { km: rows, events } = race.log;
  if (!rows.length) return null;
  const length = race.route.length;
  const pct = (d: number) => `${Math.max(0, Math.min(100, d / length * 100))}%`;
  const width = W / rows.length;
  const secondsOf = (i: number) => Math.max(1, rows[i].t - (i ? rows[i - 1].t : 0));
  const wind = rows.reduce((sum, r) => sum + r.wind, 0);
  const dropped = events.find((e) => e.kind === "dropped");
  const empties = events.filter((e) => e.kind === "empty").length;
  const heights = Array.from({ length: 101 }, (_, i) => elevationAt(race.route, length * i / 100));
  const low = Math.min(...heights), span = Math.max(20, Math.max(...heights) - low);
  const ground = heights.map((h, i) => `${i * W / 100},${STRIP - (h - low) / span * (STRIP - 6)}`).join(" ");
  const wline = rows.map((r, i) => `${(i + 1) * width},${STRIP - r.wbal * (STRIP - 2)}`).join(" ");
  const shown = hover === null ? null : rows[hover];
  const nameOf = (e: RaceEvent) => e.kind === "powerup" && e.powerup ? powerupNames[e.powerup] : eventNames[e.kind];
  return <section className={styles.debrief} aria-label="Koersverloop">
    <div className={styles.sectionHeading}><h2>Koersverloop</h2><span>{km(length)} km</span></div>
    <div className={styles.debriefStats}>
      <span>In de wind<strong>{clock(wind)}</strong></span>
      <span>Kopgroep<strong>{dropped ? `tot km ${km(dropped.d)}` : "hele koers"}</strong></span>
      <span>W′ leeg<strong>{empties}×</strong></span>
      <span>Aanvallen<strong>{events.filter((e) => e.kind === "attack").length}</strong></span>
    </div>
    <div className={styles.debriefChart} onMouseLeave={() => setHover(null)}>
      <div className={styles.debriefMarks} aria-hidden="true">{events.filter((e) => e.kind !== "back").map((e, i) => <i key={i} style={{ left: pct(e.d) }} className={e.kind === "empty" || e.kind === "dropped" ? styles.debriefBad : styles.debriefMark} title={`${nameOf(e)} · km ${km(e.d)}`} />)}</div>
      <div className={styles.debriefStrip}><span>Groep</span><svg viewBox={`0 0 ${W} ${STRIP}`} preserveAspectRatio="none" aria-hidden="true">
        <polygon points={`0,${STRIP} ${ground} ${W},${STRIP}`} className={styles.debriefGround} />
        {rows.map((r, i) => <rect key={i} x={i * width + 1} width={width - 2} y={STRIP - 10} height="10" className={r.group === 0 ? styles.debriefFront : styles.debriefBehind} />)}
      </svg></div>
      <div className={styles.debriefStrip}><span>W′</span><svg viewBox={`0 0 ${W} ${STRIP}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2={W} y1={STRIP} y2={STRIP} className={styles.debriefAxis} vectorEffect="non-scaling-stroke" />
        <polyline points={`0,2 ${wline}`} className={styles.debriefLine} vectorEffect="non-scaling-stroke" />
      </svg></div>
      <div className={styles.debriefStrip}><span>In de wind</span><svg viewBox={`0 0 ${W} ${STRIP}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2={W} y1={STRIP} y2={STRIP} className={styles.debriefAxis} vectorEffect="non-scaling-stroke" />
        {rows.map((r, i) => { const h = Math.min(1, r.wind / secondsOf(i)) * STRIP; return <rect key={i} x={i * width + 1} width={width - 2} y={STRIP - h} height={h} className={styles.debriefBar} />; })}
      </svg></div>
      <div className={styles.debriefAxisLabels}><span>0</span><span>{km(length / 2)}</span><span>{km(length)} km</span></div>
      {/* One hit area per kilometre, wider than the marks; tap or hover shows the numbers. */}
      <div className={styles.debriefHits}>{rows.map((_, i) => <button key={i} type="button" aria-label={`Kilometer ${i + 1}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)} />)}</div>
      {hover !== null && <i className={styles.debriefCross} style={{ left: `${(hover + 0.5) / rows.length * 100}%` }} />}
      {shown && hover !== null && <div className={styles.debriefTip} style={{ left: `${Math.min(78, Math.max(22, (hover + 0.5) / rows.length * 100))}%` }}>
        <strong>km {hover + 1}</strong>
        <span>{shown.group === 0 ? "Kopgroep" : `Groep ${shown.group + 1} · +${clock(shown.gap)}`} · {shown.size} renners</span>
        <span>W′ {Math.round(shown.wbal * 100)}%</span>
        <span>In de wind {clock(shown.wind)}</span>
      </div>}
    </div>
    <ul className={styles.debriefEvents}>{events.filter((e) => e.kind !== "attack" || events.length < 12).map((e, i) => <li key={i}>
      {e.kind === "dropped" ? <ArrowDown size={13} /> : e.kind === "back" ? <ArrowUp size={13} /> : e.kind === "empty" ? <Zap size={13} /> : e.kind === "powerup" ? (e.powerup === "feather" ? <Feather size={13} /> : e.powerup === "draft" ? <Users size={13} /> : <Wind size={13} />) : <Zap size={13} />}
      <span>km {km(e.d)}</span>{nameOf(e)}
    </li>)}</ul>
    <table className={styles.srOnly}><caption>Per kilometer</caption><thead><tr><th>km</th><th>Groep</th><th>Achterstand</th><th>W′</th><th>In de wind</th></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.group + 1}</td><td>{clock(r.gap)}</td><td>{Math.round(r.wbal * 100)}%</td><td>{clock(r.wind)}</td></tr>)}</tbody></table>
  </section>;
}
