"use client";

import { Crown, Flag, Mountain, Play, RotateCcw, Shield, Undo2, Video, Wrench } from "lucide-react";
import { useEffect, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { BOARD_CARDS, BOARD_SECTORS, blockedReason, costOf, createBoard, currentSector, HAZARD_LABELS, HAZARD_ODDS, matesOf, PLAYS_PER_TURN, standing, playCard, rideSector, startSector, TERRAIN_LABELS, unplayCard, type BoardSector, type BoardState, type CardKind, type Hazard, type HandCard } from "../engine/board";
import { cardById } from "../engine/cards";
import { newSave, type Save } from "../engine/economy";
import { STAFF, teamBonus } from "../engine/items";
import { groupsOf, kopmanOf, results, riding, type Lineup, type RaceState } from "../engine/race";
import { loadSave } from "../engine/save";
import { PLAYER_TEAM } from "../engine/types";
import { CALENDAR, PLAYER_COLOR, raceById } from "../engine/world";
import { ChaseView } from "./chase-view";
import { Portrait, type Mood } from "./portrait";
import { Profile } from "./profile";
import { clock, riderName, teamColor, teamName } from "./race-view";
import styles from "./kopman.module.css";

/** Real seconds one sector takes on screen. */
const SECTOR_SECONDS = 3.5;

const KIND_LABELS: Record<CardKind, string> = { aanval: "Aanval", tempo: "Tempo", bescherming: "Bescherming", verstoring: "Verstoring", reactie: "Reactie", steun: "Staf", pacing: "Pacing", aero: "Aero", techniek: "Techniek" };

const pct = (n: number) => `${Math.round(n * 100)}%`;
const km = (m: number) => `${(Math.max(0, m) / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;

function store() {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

type View = "overzicht" | "beeld";
const VIEW_KEY = "kopman:koersbeeld";
function savedView(): View {
  try { return store()?.getItem(VIEW_KEY) === "beeld" ? "beeld" : "overzicht"; } catch { return "overzicht"; }
}

/** Phones, upright or on their side: the board then fills the screen, with the race view as the stage. */
const COMPACT = "(max-width: 720px), (max-height: 520px)";
function useCompact() {
  return useSyncExternalStore(
    (changed) => {
      const m = window.matchMedia(COMPACT);
      m.addEventListener("change", changed);
      return () => m.removeEventListener("change", changed);
    },
    () => window.matchMedia(COMPACT).matches,
    () => false,
  );
}

/** `?bordspel`: a board race with your current lineup and staff, any race. Reads your save, never writes it. */
export function BoardApp() {
  const [save] = useState<Save>(() => loadSave(store()) ?? newSave(1, "2026-11-11"));
  const races = CALENDAR;
  const [raceId, setRaceId] = useState(races[0].id);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const lineup: Lineup = { riders: save.lineup, kopman: save.kopman ?? save.lineup[0], bonus: teamBonus(save.items) };
  const picker = (
    <label className={styles.chip}>
      <Flag size={15} aria-hidden />
      <select className={styles.boardSelect} aria-label="Koers" value={raceId} onChange={(e) => { setRaceId(e.target.value); setSeed(Math.floor(Math.random() * 1e9)); }}>
        {races.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    </label>
  );
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.title}>Kop<span>man</span></div>
        {picker}
      </header>
      {lineup.riders.length === 5
        ? <BoardView key={`${raceId}-${seed}`} raceId={raceId} seed={seed} lineup={lineup} items={save.items} own={save.teamName} title={picker} onAgain={() => setSeed(Math.floor(Math.random() * 1e9))} />
        : <div className={styles.notice}>Stel eerst vijf renners op.</div>}
    </div>
  );
}

function hazardLine(sector: BoardSector) {
  return (Object.entries(HAZARD_ODDS[sector.terrain]) as [Hazard, number][]).map(([h, p]) => `${HAZARD_LABELS[h]} ${pct(p)}`).join(" · ");
}

function sectorTitle(sector: BoardSector) {
  return `${sector.finale ? "Finale · " : ""}${TERRAIN_LABELS[sector.terrain]}${sector.name ? ` · ${sector.name}` : ""}`;
}

/**
 * The race as a board game. In the app `onFinish` hands the result on; in the
 * preview `onAgain` starts a new one, and `title` stands in for the race name.
 */
export function BoardView({ raceId, seed, lineup, items, own, title, onAgain, onFinish }: { raceId: string; seed: number; lineup: Lineup; items: Record<string, number>; own: string; title?: ReactNode; onAgain?: () => void; onFinish?: (state: RaceState) => void }) {
  // The engine is mutable on purpose (race.ts steps in place); a counter redraws.
  const [board] = useState(() => createBoard(raceId, seed, lineup, items));
  const [tick, redraw] = useReducer((n: number) => n + 1, 0);
  const [view, setView] = useState<View>(savedView);
  const pickView = (v: View) => {
    setView(v);
    try { store()?.setItem(VIEW_KEY, v); } catch { /* the choice just is not remembered */ }
  };
  const riding_ = board.phase === "rijden";
  const finished = useRef(false);
  const done = board.phase === "klaar";
  const compact = useCompact() && !done;

  // On a phone the board covers the page; the page behind it should not scroll.
  useEffect(() => {
    if (!compact) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = before; };
  }, [compact]);

  useEffect(() => {
    if (!done || !onFinish || finished.current) return;
    finished.current = true;
    onFinish(board.race);
  }, [done, onFinish, board]);

  useEffect(() => {
    if (!riding_) return;
    const b = board;
    const sector = currentSector(b);
    const perFrame = Math.max(1, Math.ceil((sector.end - sector.start) / 11 / (SECTOR_SECONDS * 60)) * (sector.finale ? 2 : 1));
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      const done = rideSector(b, perFrame);
      if (done || now - last > 80) { last = now; redraw(); }
      if (!done) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [riding_, board, board.sector]);

  const def = raceById.get(raceId)!;
  const state = board.race;
  const sector = currentSector(board);
  const kopman = kopmanOf(state, PLAYER_TEAM)!;
  const leader = state.riders.filter(riding).reduce((a, b) => (b.distance > a.distance ? b : a), state.riders[0]);
  const groups = groupsOf(state);
  const markers = groups.flatMap((g) => [
    { distance: g[0].distance, color: "#fffaf0", size: Math.min(9, 3 + Math.sqrt(g.length)) },
    ...g.filter((r) => r.team === PLAYER_TEAM).map((r) => ({ distance: r.distance, color: PLAYER_COLOR, size: r.kopman ? 5 : 4, mine: true })),
  ]);
  const bands = board.sectors.map((s) => ({ start: s.start, end: s.end, active: s.index === board.sector && board.phase !== "klaar" }));
  const ahead = board.sectors.slice(board.sector + 1, board.sector + 1 + board.lookahead);
  const lastEvents = board.events.filter((e) => e.sector === (riding_ ? board.sector : board.sector - 1)).slice(-6);
  const mine = state.riders.filter((r) => r.team === PLAYER_TEAM).sort((a, b) => Number(b.kopman) - Number(a.kopman));
  const dekking = riding(kopman) && !board.tt ? matesOf(state, kopman).length : 0;
  const act = (fn: () => unknown) => { fn(); redraw(); };

  if (done) return onFinish ? null : <BoardResult board={board} own={own} name={def.name} onAgain={onAgain} />;

  const toggle = (
    <span className={styles.viewToggle} role="group" aria-label="Weergave">
      <button type="button" className={styles.tab} aria-pressed={view === "overzicht"} aria-label={compact ? "Overzicht" : undefined} onClick={() => pickView("overzicht")}><Mountain size={18} aria-hidden />{compact ? null : "Overzicht"}</button>
      <button type="button" className={styles.tab} aria-pressed={view === "beeld"} aria-label={compact ? "Koersbeeld" : undefined} onClick={() => pickView("beeld")}><Video size={18} aria-hidden />{compact ? null : "Koersbeeld"}</button>
    </span>
  );
  const intentList = board.intents.map((i) => (
    <div key={i.team} className={styles.intent}>
      <span className={styles.teamDot} style={{ background: teamColor(i.team) }} />
      <b>{teamName(i.team, own)}</b>
      <span>{i.kind === "aanval" ? `${cardById(i.rider).last} valt aan` : `maakt tempo met ${cardById(i.rider).last}`}</span>
    </div>
  ));
  const hand = board.hand.map((c) => <BoardCardView key={c.uid} board={board} c={c} onPlay={() => act(() => playCard(board, c.uid))} />);
  const played = board.played.map((c) => (
    <span key={c.uid} className={styles.playedChip}>
      {BOARD_CARDS[c.card].title}{c.rider ? ` · ${cardById(c.rider).last}` : ""}
      {c.rider && board.phase === "plannen" ? <button type="button" aria-label="Terugnemen" onClick={() => act(() => unplayCard(board, c.uid))}><Undo2 size={14} /></button> : null}
    </span>
  ));
  const rideButton = (
    <button type="button" className={styles.primary} disabled={board.phase !== "plannen"} onClick={() => act(() => startSector(board))}>
      <Play size={18} aria-hidden />{riding_ ? "Onderweg" : sector.finale ? "Finale rijden" : "Rijden"}
    </button>
  );
  const moodOf = (r: (typeof mine)[number]): Mood => {
    const k = board.kracht[r.id], start = board.start[r.id];
    return !riding(r) ? "rust" : k <= start * 0.25 ? "limiet" : (r.override?.mode ?? r.mode) === "aanval" ? "aanval" : "rust";
  };
  const standingOf = (r: (typeof mine)[number]) => { const w = standing(state, r); return `${w.label}${w.gap >= 5 ? ` +${clock(w.gap)}` : ""}`; };

  if (compact) {
    return (
      <div className={styles.mBoard} lang="nl">
        <div className={styles.mTop}>
          <div className={styles.mName}>{title ?? def.name}</div>
          <span className={styles.chip} aria-label={`Sector ${board.sector + 1} van ${BOARD_SECTORS}`}><span className={styles.stat}>{board.sector + 1}/{BOARD_SECTORS}</span></span>
          <span className={styles.chip}><span className={styles.stat}>{km(state.course.length - leader.distance)}</span></span>
          {board.spares ? <span className={styles.chip} aria-label={`Reservewiel ×${board.spares}`}><Wrench size={13} aria-hidden />{board.spares}</span> : null}
          {toggle}
        </div>
        <div className={`${styles.mStage} ${view === "beeld" ? "" : styles.mStageMap}`}>
          {view === "beeld" ? <ChaseView state={state} moving={riding_} frame={tick} /> : <div className={styles.mMap}><Profile course={state.course} markers={markers} bands={bands} height={120} /></div>}
          <div className={styles.mInfo}>
            <b>{sectorTitle(sector)}</b>
            <span>{km(sector.end - sector.start)}{sector.finale ? "" : ` · ${hazardLine(sector)}`}</span>
            {ahead.map((s) => <span key={s.index}>Daarna: {sectorTitle(s)}</span>)}
          </div>
          {intentList.length || lastEvents.length ? (
            <div className={styles.mFeed} aria-live="polite">
              {riding_ ? null : intentList}
              {lastEvents.length ? <div className={styles.ticker}>{lastEvents.slice(-2).map((e, n) => <div key={n} className={e.good ? undefined : styles.tickerBad}>{e.text}</div>)}</div> : null}
            </div>
          ) : null}
        </div>
        {view === "beeld" ? <div className={styles.mStrip}><Profile course={state.course} markers={markers} bands={bands} height={40} /></div> : null}
        <div className={styles.mRiders}>
          {mine.map((r) => {
            const k = board.kracht[r.id], top = Math.max(board.start[r.id], k);
            return (
              <div key={r.id} className={`${styles.mRider} ${riding(r) ? "" : styles.mOut}`}>
                <span className={styles.mFaceWrap}>
                  <span className={`${styles.mFace} ${styles[r.card.tier]}`}><Portrait card={r.card} mood={moodOf(r)} crop /></span>
                  {r.kopman ? <span className={styles.mCrown}><Crown size={11} aria-label="kopman" /></span> : null}
                  {r.kopman && riding(r) && !board.tt ? <span className={styles.mCover} aria-label={`dekking ${dekking}`}><Shield size={9} aria-hidden />{dekking}</span> : null}
                </span>
                <b>{r.card.last}</b>
                <small>{standingOf(r)}</small>
                <span className={styles.mKracht} role="meter" aria-label="Kracht" aria-valuemin={0} aria-valuemax={top} aria-valuenow={k}>
                  <span><span style={{ width: `${top ? (k / top) * 100 : 0}%` }} /></span>
                  <b>{k}</b>
                </span>
              </div>
            );
          })}
        </div>
        <div className={styles.mHand}>{hand}</div>
        <div className={styles.mActions}>
          <div className={styles.mPlayed}>
            <span className={styles.mCount}>{board.played.length}/{PLAYS_PER_TURN}</span>
            {played}
          </div>
          {rideButton}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.raceBar}>
        <div className={styles.h2}>{def.name}</div>
        <span className={styles.chip}><span className={styles.stat}>Sector {board.sector + 1}/{BOARD_SECTORS}</span></span>
        <span className={styles.chip}><span className={styles.stat}>{km(state.course.length - leader.distance)}</span></span>
        <span className={styles.chip}><span className={styles.stat}>{clock(state.time)}</span></span>
        {toggle}
      </div>
      <div className={styles.panel}>
        {view === "beeld" ? (
          <div className={styles.stack} style={{ gap: 8 }}>
            <ChaseView state={state} moving={riding_} frame={tick} />
            <Profile course={state.course} markers={markers} bands={bands} height={52} />
          </div>
        ) : <Profile course={state.course} markers={markers} bands={bands} height={120} />}
      </div>

      <div className={styles.boardGrid}>
        <div className={styles.stack}>
          <div className={`${styles.panel} ${styles.sectorPanel}`}>
            <div className={styles.row} style={{ justifyContent: "space-between" }}>
              <span className={styles.h3}>{sectorTitle(sector)}</span>
              <span className={styles.stat}>{km(sector.end - sector.start)}</span>
            </div>
            {sector.finale ? null : <div className={styles.muted}>{hazardLine(sector)}</div>}
            {ahead.map((s) => <div key={s.index} className={styles.muted}>Daarna: {sectorTitle(s)}{s.finale ? "" : ` · ${hazardLine(s)}`}</div>)}
            {intentList.length ? <div className={styles.intents}>{intentList}</div> : null}
          </div>
          {lastEvents.length ? <div className={styles.ticker}>{lastEvents.map((e, n) => <div key={n} className={e.good ? undefined : styles.tickerBad}>{e.text}</div>)}</div> : null}
          <div className={styles.stack}>
            <div className={styles.row} style={{ justifyContent: "space-between" }}>
              <span className={styles.h3}>Hand</span>
              <span className={styles.muted}>{board.played.length}/{PLAYS_PER_TURN} gespeeld</span>
            </div>
            <div className={styles.boardHand}>
              {hand}
            </div>
            {played.length ? <div className={styles.row}>{played}</div> : null}
            <div>{rideButton}</div>
          </div>
        </div>

        <div className={styles.panel}>
          {board.spares ? <div className={styles.row} style={{ marginBottom: 8 }}><span className={styles.playedChip}><Wrench size={14} aria-hidden />Reservewiel ×{board.spares}</span></div> : null}
          <div className={styles.riders}>
            {mine.map((r) => {
              const k = board.kracht[r.id], start = board.start[r.id];
              return (
                <div key={r.id} className={styles.rider}>
                  <span className={`${styles.riderFace} ${styles[r.card.tier]}`}><Portrait card={r.card} mood={moodOf(r)} crop /></span>
                  <span className={styles.riderInfo}>
                    <span><b>{riderName(r.id)}</b>{r.kopman ? <> <Crown size={13} aria-label="kopman" /></> : null}</span>
                    <small>{standingOf(r)}{r.kopman && riding(r) && !board.tt ? ` · dekking ${dekking}` : ""}</small>
                    <span className={styles.pips} role="meter" aria-label="Kracht" aria-valuemin={0} aria-valuemax={Math.max(start, k)} aria-valuenow={k}>
                      {Array.from({ length: Math.max(start, k) }, (_, i) => <span key={i} className={i < k ? styles.pipOn : undefined} />)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

function BoardCardView({ board, c, onPlay }: { board: BoardState; c: HandCard; onPlay: () => void }) {
  const def = BOARD_CARDS[c.card];
  const reason = blockedReason(board, c);
  const cost = costOf(board, c);
  const who = c.rider ? cardById(c.rider).last : STAFF[(Object.keys(STAFF) as (keyof typeof STAFF)[]).find((role) => c.uid.endsWith(`:${role}`)) ?? "trainer"].label;
  return (
    <button type="button" className={`${styles.bcard} ${styles[`k_${def.kind}`]}`} disabled={!!reason} onClick={onPlay} title={reason ?? undefined}>
      <span className={styles.bcardKind}>{KIND_LABELS[def.kind]}</span>
      <strong>{def.title}</strong>
      <span className={styles.bcardWho}>{who}</span>
      <span className={styles.bcardText}>{reason ?? def.text}</span>
      {c.rider ? <span className={styles.bcardCost} aria-label={`${cost} kracht`}>{Array.from({ length: cost }, (_, i) => <span key={i} />)}</span> : null}
    </button>
  );
}

function BoardResult({ board, own, name, onAgain }: { board: BoardState; own: string; name: string; onAgain?: () => void }) {
  const placings = results(board.race);
  const top = placings.slice(0, 10);
  const mine = placings.filter((p) => p.team === PLAYER_TEAM && (p.place > 10 || p.place === 0));
  const row = (p: (typeof placings)[number]) => (
    <tr key={p.id} className={p.team === PLAYER_TEAM ? styles.mine : undefined}>
      <td>{p.place || "–"}</td>
      <td><span className={styles.teamDot} style={{ background: teamColor(p.team) }} />{riderName(p.id)}</td>
      <td className={styles.muted}>{teamName(p.team, own)}</td>
      <td className={styles.num}>{p.place === 1 ? clock(p.time ?? 0) : p.gap === null ? "–" : p.gap === 0 ? "z.t." : `+${clock(p.gap)}`}</td>
    </tr>
  );
  return (
    <div className={styles.stack}>
      <div className={styles.panel}>
        <div className={styles.h2}>{name}</div>
        <table className={styles.table} style={{ marginTop: 8 }}>
          <thead><tr><th>#</th><th>Renner</th><th>Ploeg</th><th className={styles.num}>Tijd</th></tr></thead>
          <tbody>{top.map(row)}{mine.map(row)}</tbody>
        </table>
      </div>
      {onAgain ? <div><button type="button" className={styles.primary} onClick={onAgain}><RotateCcw size={18} aria-hidden />Nog een keer</button></div> : null}
    </div>
  );
}
