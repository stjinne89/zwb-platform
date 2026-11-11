"use client";

import { FastForward, Pause, Play, Radio, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cardById } from "../engine/cards";
import { climbAt, createRace, expectedSeconds, groupsOf, kopmanOf, riding, runToEnd, stepRace, type Lineup, type Mode, type RaceEvent, type RaceState } from "../engine/race";
import { dealHand, HAND_SECONDS, playRadio, RADIO_LABELS, type RadioId } from "../engine/radio";
import { rivalTeams } from "../engine/teams";
import { PLAYER_TEAM } from "../engine/types";
import { PLAYER_COLOR, raceById } from "../engine/world";
import { Profile, type Marker } from "./profile";
import styles from "./kopman.module.css";

/** Real seconds a race should take at normal speed, before the slow parts. */
const TARGET_SECONDS = 170;
/** The parts that decide the race play at this share of normal speed. */
const KEY_SLOWDOWN = 0.4;

const MODE_LABELS: Record<Mode, string> = { mee: "Meerijden", kop: "Op kop", aanval: "Aanval", sparen: "Sparen", volgen: "Volgt", wachten: "Wacht", sprint: "Sprint", tempo: "Tempo" };

export const teamColor = (team: string) => (team === PLAYER_TEAM ? PLAYER_COLOR : rivalTeams().find((t) => t.id === team)?.color ?? "#888");
export const teamName = (team: string, own: string) => (team === PLAYER_TEAM ? own : rivalTeams().find((t) => t.id === team)?.name ?? team);
export const riderName = (id: string) => { const c = cardById(id); return `${c.first[0]}. ${c.last}`; };

export function clock(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

function keyMoment(state: RaceState) {
  const leader = state.riders.filter(riding).reduce((a, b) => (b.distance > a.distance ? b : a), state.riders[0]);
  const remaining = state.course.length - leader.distance;
  if (remaining < 5000) return true;
  const climb = climbAt(state.course, leader.distance);
  const last = [...state.course.features].reverse().find((f) => f.kind === "klim");
  if (climb && climb === last) return true;
  const kopman = kopmanOf(state, PLAYER_TEAM);
  return !!kopman && (kopman.override?.mode === "aanval" || kopman.mode === "aanval");
}

function eventText(e: RaceEvent, own: string) {
  if (e.kind === "aanval" && e.rider) { const r = cardById(e.rider); return <><b>Aanval</b> van {r.first} {r.last}</>; }
  if (e.kind === "ontsnapping") return <><b>Ontsnapping</b> van {e.text} renners</>;
  if (e.kind === "ingelopen") return <><b>Ingelopen</b>: de ontsnapping is terug</>;
  if (e.kind === "radio" && e.text) return <><b>{own}</b>: {RADIO_LABELS[e.text as RadioId]?.title}</>;
  if (e.kind === "finish" && e.rider) { const r = cardById(e.rider); return <><b>Winst</b> voor {r.first} {r.last}</>; }
  return null;
}

type View = {
  time: number;
  toGo: number;
  groups: { key: string; label: string; size: number; gap: number; dots: { id: string; team: string }[] }[];
  more: number;
  markers: Marker[];
  mine: { id: string; kopman: boolean; status: string; reserve: number }[];
  events: RaceEvent[];
  timerLeft: number;
};

/** What the screen shows, taken from the engine a few times a second. */
function snapshot(state: RaceState, handElapsed: number): View {
  const groups = groupsOf(state);
  const leader = groups[0]?.[0];
  const biggest = groups.reduce((a, g, i) => (g.length > (groups[a]?.length ?? 0) ? i : a), 0);
  const label = (i: number) => (i === 0 ? "Kop" : i === biggest && groups[i].length >= 10 ? "Peloton" : `Groep ${i + 1}`);
  return {
    time: state.time,
    toGo: leader ? Math.max(0, state.course.length - leader.distance) : 0,
    groups: groups.slice(0, 6).map((g, i) => ({ key: g[0].id, label: label(i), size: g.length, gap: i === 0 ? 0 : (groups[0][0].distance - g[0].distance) / Math.max(4, g[0].speed), dots: g.slice(0, 30).map((r) => ({ id: r.id, team: r.team })) })),
    more: Math.max(0, groups.length - 6),
    markers: groups.flatMap((g) => [
      { distance: g[0].distance, color: "#cfe3f7", size: Math.min(9, 3 + Math.sqrt(g.length)) },
      ...g.filter((r) => r.team === PLAYER_TEAM).map((r) => ({ distance: r.distance, color: PLAYER_COLOR, size: 4, mine: true })),
    ]),
    mine: state.riders.filter((r) => r.team === PLAYER_TEAM).map((r) => {
      const gi = groups.findIndex((g) => g.includes(r));
      return { id: r.id, kopman: r.kopman, status: riding(r) ? `${gi >= 0 ? label(gi) : ""} · ${MODE_LABELS[r.override?.mode ?? r.mode]}` : "Binnen", reserve: r.wbal / r.wprime };
    }),
    events: state.events.slice(-4).reverse(),
    timerLeft: Math.max(0, 1 - handElapsed / HAND_SECONDS),
  };
}

export function RaceView({ raceId, seed, lineup, own, onFinish }: { raceId: string; seed: number; lineup: Lineup; own: string; onFinish: (state: RaceState) => void }) {
  const [initial] = useState(() => createRace(raceId, seed, lineup));
  const engine = useRef(initial);
  const [view, setView] = useState<View>(() => snapshot(initial, 0));
  const [speed, setSpeed] = useState(1);
  const [hand, setHand] = useState<RadioId[]>(() => dealHand(initial, 0));
  const handClock = useRef({ number: 0, elapsed: 0 });
  const done = useRef(false);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);

  useEffect(() => {
    const state = engine.current;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastPaint = 0;
    const perSecond = (expectedSeconds(state.course) * 1.3) / TARGET_SECONDS;
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (speed > 0 && !state.finished) {
        acc += dt * perSecond * speed * (keyMoment(state) ? KEY_SLOWDOWN : 1);
        let steps = Math.min(600, Math.floor(acc));
        acc -= steps;
        while (steps-- > 0 && !state.finished) stepRace(state);
        if (!state.course.tt) {
          handClock.current.elapsed += dt;
          if (handClock.current.elapsed >= HAND_SECONDS) {
            handClock.current = { number: handClock.current.number + 1, elapsed: 0 };
            setHand(dealHand(state, handClock.current.number));
          }
        }
      }
      if (now - lastPaint > 100 || state.finished) { lastPaint = now; setView(snapshot(state, handClock.current.elapsed)); }
      if (state.finished) {
        if (!done.current) { done.current = true; finishRef.current(state); }
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onHide = () => { if (document.hidden) setSpeed(0); };
    document.addEventListener("visibilitychange", onHide);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onHide); };
  }, [speed]);

  const def = raceById.get(raceId)!;
  const play = (id: RadioId) => { if (playRadio(engine.current, id)) setHand((h) => h.filter((x) => x !== id)); };
  const skip = () => {
    runToEnd(engine.current);
    setView(snapshot(engine.current, 0));
    if (!done.current) { done.current = true; finishRef.current(engine.current); }
  };

  return (
    <div className={styles.race} role="region" aria-label={def.name}>
      <div className={styles.raceBar}>
        <div className={styles.h2}>{def.name}</div>
        <span className={styles.chip}><span className={styles.stat}>{(view.toGo / 1000).toFixed(1)} km</span></span>
        <span className={styles.chip}><span className={styles.stat}>{clock(view.time)}</span></span>
        <div className={styles.speed}>
          <button type="button" aria-pressed={speed === 0} aria-label="Pauze" onClick={() => setSpeed(0)}><Pause size={16} /></button>
          <button type="button" aria-pressed={speed === 1} aria-label="Normaal" onClick={() => setSpeed(1)}><Play size={16} /></button>
          <button type="button" aria-pressed={speed === 4} aria-label="Snel" onClick={() => setSpeed(4)}><FastForward size={16} /></button>
          <button type="button" aria-label="Naar de finish" onClick={skip}><SkipForward size={16} /></button>
        </div>
      </div>
      <div className={styles.panel}><Profile course={initial.course} markers={view.markers} height={130} /></div>
      {initial.course.tt ? null : (
        <div className={styles.stack} aria-live="polite">
          <div className={styles.row}><Radio size={16} aria-hidden /><span className={styles.h3}>Radio</span></div>
          {hand.length ? (
            <div className={styles.hand}>
              {hand.map((id) => <button key={id} type="button" className={styles.radio} onClick={() => play(id)}><strong>{RADIO_LABELS[id].title}</strong><span>{RADIO_LABELS[id].text}</span></button>)}
            </div>
          ) : <div className={styles.muted}>Geen orders</div>}
          <div className={styles.handTimer} aria-hidden><span style={{ width: `${view.timerLeft * 100}%` }} /></div>
        </div>
      )}
      <div className={styles.raceGrid}>
        <div className={styles.panel}>
          <div className={styles.groups}>
            {view.groups.map((g) => (
              <div key={g.key} className={styles.group}>
                <span>{g.label} · {g.size}</span>
                <span className={styles.groupDots}>{g.dots.map((r) => <span key={r.id} className={`${styles.dot} ${r.team === PLAYER_TEAM ? styles.dotMine : ""}`} style={{ background: teamColor(r.team) }} title={riderName(r.id)} />)}</span>
                <span className={styles.stat}>{g.gap ? `+${clock(g.gap)}` : ""}</span>
              </div>
            ))}
            {view.more ? <div className={styles.muted}>+{view.more} groepen</div> : null}
          </div>
        </div>
        <div className={styles.panel}>
          <div className={styles.riders}>
            {view.mine.map((r) => (
              <div key={r.id} className={styles.rider}>
                <span><b>{riderName(r.id)}</b>{r.kopman ? " · kopman" : ""}</span>
                <small>{r.status}</small>
                <span className={styles.bar} role="meter" aria-label="Reserve" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.reserve * 100)}><span style={{ width: `${r.reserve * 100}%` }} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {view.events.length ? <div className={styles.ticker}>{view.events.map((e, i) => <div key={`${e.t}-${i}`}>{Math.round(e.km)} km · {eventText(e, own)}</div>)}</div> : null}
    </div>
  );
}
