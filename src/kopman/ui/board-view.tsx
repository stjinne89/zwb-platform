"use client";

import { ChevronLeft, Crown, Flag, Mountain, Play, RotateCcw, Shield, Undo2, Video, Wrench, X } from "lucide-react";
import { useEffect, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { BOARD_CARDS, BOARD_SECTORS, blockedReason, choosesRider, costOf, createBoard, currentSector, HAZARD_LABELS, PHASE_LABELS, phaseOf, HAZARD_ODDS, matesOf, PLAYS_PER_TURN, standing, playCard, rideSector, ridersFor, startSector, TERRAIN_LABELS, unplayCard, type BoardSector, type BoardState, type CardKind, type Hazard, type HandCard } from "../engine/board";
import { cardById, TYPE_LABELS } from "../engine/cards";
import { newSave, type Save } from "../engine/economy";
import { STAFF, teamBonus } from "../engine/items";
import { groupsOf, kopmanOf, results, riding, type Lineup, type RaceState, type Rider } from "../engine/race";
import { loadSave } from "../engine/save";
import { PLAYER_TEAM } from "../engine/types";
import { PLAYER_COLOR, RACES, raceById } from "../engine/world";
import { ChaseView } from "./chase-view";
import { GroupView } from "./group-view";
import { Portrait, type Mood } from "./portrait";
import { Profile } from "./profile";
import { clock, riderName, teamColor, teamName } from "./race-view";
import { RiderCardView } from "./rider-card";
import styles from "./kopman.module.css";

/** Real seconds one sector takes on screen. */
const SECTOR_SECONDS = 3.5;

const KIND_LABELS: Record<CardKind, string> = { aanval: "Aanval", tempo: "Tempo", bescherming: "Bescherming", verstoring: "Verstoring", reactie: "Reactie", steun: "Staf", pacing: "Pacing", aero: "Aero", techniek: "Techniek", ploeg: "Ploeg", streek: "Streek" };

const pct = (n: number) => `${Math.round(n * 100)}%`;
const km = (m: number) => `${(Math.max(0, m) / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;

function store() {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

type View = "overzicht" | "beeld";
// Since 2026-11-12 the overview is the groups on the profile and the default
// again; a new key, so an earlier choice for the race view does not stick.
const VIEW_KEY = "kopman:weergave";
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
  const [save] = useState<Save>(() => loadSave(store()) ?? newSave(1));
  const races = RACES;
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

/** The terrain and name of a sector; in a road race with its phase in front. */
function sectorTitle(sector: BoardSector, tt = false) {
  const phase = tt ? (sector.finale ? "Finale · " : "") : `${PHASE_LABELS[phaseOf(sector.index)]} · `;
  return `${phase}${TERRAIN_LABELS[sector.terrain]}${sector.name ? ` · ${sector.name}` : ""}`;
}

/**
 * The race as a board game. In the app `onFinish` hands the result on and
 * `onBack` leaves the race standing where it is (`active` false while you are
 * away); in the preview `onAgain` starts a new one, and `title` stands in for
 * the race name.
 */
export function BoardView({ raceId, seed, lineup, items, own, title, active = true, onBack, onAgain, onFinish }: { raceId: string; seed: number; lineup: Lineup; items: Record<string, number>; own: string; title?: ReactNode; active?: boolean; onBack?: () => void; onAgain?: () => void; onFinish?: (state: RaceState) => void }) {
  // The engine is mutable on purpose (race.ts steps in place); a counter redraws.
  const [board] = useState(() => createBoard(raceId, seed, lineup, items));
  const [tick, redraw] = useReducer((n: number) => n + 1, 0);
  const [view, setView] = useState<View>(savedView);
  // The card waiting for a rider: tap a card, then the rider who plays it.
  const [picking, setPicking] = useState<string | null>(null);
  // The rider whose card is open, to look at his qualities mid-race.
  const [sheet, setSheet] = useState<string | null>(null);
  const pickView = (v: View) => {
    setView(v);
    try { store()?.setItem(VIEW_KEY, v); } catch { /* the choice just is not remembered */ }
  };
  const riding_ = board.phase === "rijden";
  const finished = useRef(false);
  const done = board.phase === "klaar";
  const compact = useCompact() && !done && active;

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
  const pick = board.phase === "plannen" ? board.hand.find((c) => c.uid === picking && !blockedReason(board, c)) : undefined;
  const pickRiders = pick ? ridersFor(board, pick) : [];
  const tapCard = (c: HandCard) => {
    if (pick === c) { setPicking(null); return; }
    const riders = ridersFor(board, c);
    if (choosesRider(board, c) && riders.length > 1) { setPicking(c.uid); return; }
    setPicking(null);
    act(() => playCard(board, c.uid, riders[0]));
  };
  const giveTo = (id: string) => {
    if (!pick) return;
    const uid = pick.uid;
    setPicking(null);
    act(() => playCard(board, uid, id));
  };
  /** A tap on a rider: give one of yours the waiting card, or open his card (also a rival's). */
  const tapRider = (id: string) => (pick && pickRiders.includes(id) ? giveTo(id) : pick ? undefined : setSheet(id));
  /** While a card waits for a rider: what it costs this rider, or null if he cannot play it. */
  const pickCost = (id: string) => (pick && pickRiders.includes(id) ? costOf(board, pick, id) : null);
  const dots = (n: number) => <span className={styles.pickCost}>{Array.from({ length: n }, (_, i) => <span key={i} />)}</span>;

  if (done) return onFinish ? null : <BoardResult board={board} own={own} name={def.name} onAgain={onAgain} />;

  const toggle = (
    <span className={styles.viewToggle} role="group" aria-label="Weergave">
      <button type="button" aria-pressed={view === "overzicht"} aria-label={compact ? "Overzicht" : undefined} onClick={() => pickView("overzicht")}><Mountain size={16} aria-hidden />{compact ? null : "Overzicht"}</button>
      <button type="button" aria-pressed={view === "beeld"} aria-label={compact ? "Koersbeeld" : undefined} onClick={() => pickView("beeld")}><Video size={16} aria-hidden />{compact ? null : "Koersbeeld"}</button>
    </span>
  );
  const back = onBack ? (
    <button type="button" className={`${styles.ghost} ${styles.backButton}`} aria-label={compact ? "Terug" : undefined} onClick={() => { setPicking(null); onBack(); }}>
      <ChevronLeft size={16} aria-hidden />{compact ? null : "Terug"}
    </button>
  ) : null;
  const intentList = board.intents.map((i) => (
    <div key={i.team} className={styles.intent} title={teamName(i.team, own)}>
      <span className={styles.teamDot} style={{ background: teamColor(i.team) }} />
      <b>{teamName(i.team, own)}</b>
      <span>{i.kind === "aanval" ? `${cardById(i.rider).last} valt aan` : `maakt tempo met ${cardById(i.rider).last}`}</span>
    </div>
  ));
  const hand = board.hand.map((c) => <BoardCardView key={c.uid} board={board} c={c} picked={pick === c} onPlay={() => tapCard(c)} />);
  const played = board.played.map((c) => (
    <span key={c.uid} className={styles.playedChip}>
      {BOARD_CARDS[c.card].title}{c.rider ? ` · ${cardById(c.rider).last}` : ""}
      {c.rider && board.phase === "plannen" ? <button type="button" aria-label="Terugnemen" onClick={() => act(() => unplayCard(board, c.uid))}><Undo2 size={14} /></button> : null}
    </span>
  ));
  const rideButton = (
    <button type="button" className={styles.primary} disabled={board.phase !== "plannen"} onClick={() => { setPicking(null); act(() => startSector(board)); }}>
      <Play size={18} aria-hidden />{riding_ ? "Onderweg" : sector.finale ? "Finale rijden" : "Rijden"}
    </button>
  );
  const moodOf = (r: (typeof mine)[number]): Mood => {
    const k = board.kracht[r.id], start = board.start[r.id];
    const mode = r.override?.mode ?? r.mode;
    return !riding(r) ? "rust" : k <= start * 0.25 ? "limiet" : mode === "aanval" || mode === "sprint" ? "aanval" : "rust";
  };
  const standingOf = (r: (typeof mine)[number]) => { const w = standing(state, r); return `${w.label}${w.gap >= 5 ? ` +${clock(w.gap)}` : ""}`; };
  const groupView = <GroupView state={state} sector={sector} moving={riding_} moodOf={moodOf} onRider={tapRider} />;
  const sheetRider = sheet ? state.riders.find((r) => r.id === sheet) : undefined;
  const sheetView = sheetRider ? <RiderSheet rider={sheetRider} kracht={board.kracht[sheetRider.id]} start={board.start[sheetRider.id]} where={standingOf(sheetRider)} team={sheetRider.team === PLAYER_TEAM ? null : teamName(sheetRider.team, own)} onClose={() => setSheet(null)} /> : null;

  if (compact) {
    return (
      <div className={styles.mBoard} lang="nl">
        <div className={styles.mTop}>
          {back}
          <div className={styles.mName}>{title ?? def.name}</div>
          <span className={styles.chip} aria-label={`Sector ${board.sector + 1} van ${BOARD_SECTORS}`}><span className={styles.stat}>{board.sector + 1}/{BOARD_SECTORS}</span></span>
          <span className={styles.chip}><span className={styles.stat}>{km(state.course.length - leader.distance)}</span></span>
          {board.spares ? <span className={styles.chip} aria-label={`Reservewiel ×${board.spares}`}><Wrench size={13} aria-hidden />{board.spares}</span> : null}
          {toggle}
        </div>
        <div className={`${styles.mStage} ${view === "beeld" ? "" : styles.mStageMap}`}>
          {view === "beeld" ? <ChaseView state={state} moving={riding_} frame={tick} /> : null}
          <div className={styles.mInfo}>
            <b>{sectorTitle(sector, board.tt)}</b>
            <span>{km(sector.end - sector.start)}{sector.finale ? "" : ` · ${hazardLine(sector)}`}</span>
            {ahead.map((s) => <span key={s.index}>Daarna: {sectorTitle(s, board.tt)}</span>)}
          </div>
          {view === "beeld" ? null : <div className={styles.mGroups}>{groupView}</div>}
          {intentList.length || lastEvents.length ? (
            <div className={styles.mFeed} aria-live="polite">
              {riding_ ? null : intentList}
              {lastEvents.length ? <div className={styles.ticker}>{lastEvents.slice(riding_ || !intentList.length ? -2 : -1).map((e, n) => <div key={n} className={e.good ? undefined : styles.tickerBad}>{e.text}</div>)}</div> : null}
            </div>
          ) : null}
        </div>
        <div className={styles.mStrip}><Profile course={state.course} markers={markers} bands={bands} height={40} /></div>
        <div className={styles.mRiders}>
          {mine.map((r) => {
            const k = board.kracht[r.id], top = Math.max(board.start[r.id], k);
            const cost = pickCost(r.id);
            return (
              <button key={r.id} type="button" onClick={() => tapRider(r.id)} aria-label={cost === null ? r.card.last : `${r.card.last}: ${cost} kracht`} disabled={!!pick && cost === null} className={`${styles.mRider} ${riding(r) ? "" : styles.mOut} ${cost !== null ? styles.mPick : pick ? styles.mDim : ""}`}>
                <span className={styles.mFaceWrap}>
                  <span className={`${styles.mFace} ${styles[r.card.tier]}`}><Portrait card={r.card} mood={moodOf(r)} crop /></span>
                  {r.kopman ? <span className={styles.mCrown}><Crown size={11} aria-label="kopman" /></span> : null}
                  {r.kopman && riding(r) && !board.tt ? <span className={styles.mCover} aria-label={`dekking ${dekking}`}><Shield size={9} aria-hidden />{dekking}</span> : null}
                </span>
                <b>{r.card.last}</b>
                {cost === null ? <small>{standingOf(r)}</small> : dots(cost)}
                <span className={styles.mKracht} role="meter" aria-label="Kracht" aria-valuemin={0} aria-valuemax={top} aria-valuenow={k}>
                  <span><span style={{ width: `${top ? (k / top) * 100 : 0}%` }} /></span>
                  <b>{k}</b>
                </span>
              </button>
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
        {sheetView}
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.raceBar}>
        {back}
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
        ) : (
          <div className={styles.stack} style={{ gap: 8 }}>
            <Profile course={state.course} markers={markers} bands={bands} height={44} />
            <div className={styles.dGroups}>{groupView}</div>
          </div>
        )}
      </div>

      <div className={styles.boardGrid}>
        <div className={styles.stack}>
          <div className={`${styles.panel} ${styles.sectorPanel}`}>
            <div className={styles.row} style={{ justifyContent: "space-between" }}>
              <span className={styles.h3}>{sectorTitle(sector, board.tt)}</span>
              <span className={styles.stat}>{km(sector.end - sector.start)}</span>
            </div>
            {sector.finale ? null : <div className={styles.muted}>{hazardLine(sector)}</div>}
            {ahead.map((s) => <div key={s.index} className={styles.muted}>Daarna: {sectorTitle(s, board.tt)}{s.finale ? "" : ` · ${hazardLine(s)}`}</div>)}
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
              const cost = pickCost(r.id);
              return (
                <button key={r.id} type="button" onClick={() => tapRider(r.id)} aria-label={cost === null ? riderName(r.id) : `${riderName(r.id)}: ${cost} kracht`} disabled={!!pick && cost === null} className={`${styles.rider} ${styles.riderButton} ${cost !== null ? styles.riderPick : pick ? styles.mDim : ""}`}>
                  <span className={`${styles.riderFace} ${styles[r.card.tier]}`}><Portrait card={r.card} mood={moodOf(r)} crop /></span>
                  <span className={styles.riderInfo}>
                    <span><b>{riderName(r.id)}</b>{r.kopman ? <> <Crown size={13} aria-label="kopman" /></> : null}</span>
                    {cost === null ? <small>{standingOf(r)}{r.kopman && riding(r) && !board.tt ? ` · dekking ${dekking}` : ""}</small> : dots(cost)}
                    <span className={styles.pips} role="meter" aria-label="Kracht" aria-valuemin={0} aria-valuemax={Math.max(start, k)} aria-valuenow={k}>
                      {Array.from({ length: Math.max(start, k) }, (_, i) => <span key={i} className={i < k ? styles.pipOn : undefined} />)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {sheetView}
    </div>
  );
}

/** A rider mid-race, yours or a rival: his card with all his qualities, his kracht and where he rides. */
function RiderSheet({ rider, kracht, start, where, team, onClose }: { rider: Rider; kracht: number; start: number; where: string; team: string | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const top = Math.max(start, kracht);
  return (
    <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={riderName(rider.id)} onClick={onClose}>
      <div className={styles.sheetCard} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={`${styles.ghost} ${styles.sheetClose}`} aria-label="Sluiten" onClick={onClose} autoFocus><X size={16} aria-hidden /></button>
        <RiderCardView card={rider.card} kopman={rider.kopman} live />
        <div className={styles.sheetFacts}>
          <span>Kracht</span>
          <span className={styles.pips} role="meter" aria-label="Kracht" aria-valuemin={0} aria-valuemax={top} aria-valuenow={kracht}>
            {Array.from({ length: top }, (_, i) => <span key={i} className={i < kracht ? styles.pipOn : undefined} />)}
            <b>{kracht}/{start}</b>
          </span>
          <span>Plek</span><b>{where}</b>
          {team ? <><span>Ploeg</span><b>{team}</b></> : null}
        </div>
      </div>
    </div>
  );
}

/** A card in the hand. A team card shows the type that brought it and what it costs that type. */
function BoardCardView({ board, c, picked, onPlay }: { board: BoardState; c: HandCard; picked: boolean; onPlay: () => void }) {
  const def = BOARD_CARDS[c.card];
  const reason = blockedReason(board, c);
  const cost = costOf(board, c);
  const who = c.rider ? cardById(c.rider).last : c.type === "ploeg" ? "Ploeg" : c.type ? (c.type === "klassieker" ? "Klassieker" : TYPE_LABELS[c.type]) : def.kind === "streek" ? "Streek" : STAFF[(Object.keys(STAFF) as (keyof typeof STAFF)[]).find((role) => c.uid.endsWith(`:${role}`)) ?? "trainer"].label;
  return (
    <button type="button" className={`${styles.bcard} ${styles[`k_${def.kind}`]} ${picked ? styles.bcardPicked : ""}`} disabled={!!reason} onClick={onPlay} title={reason ?? undefined} aria-pressed={choosesRider(board, c) ? picked : undefined}>
      <span className={styles.bcardKind}>{KIND_LABELS[def.kind]}</span>
      <strong>{def.title}</strong>
      <span className={styles.bcardWho}>{who}</span>
      <span className={styles.bcardText}>{reason ?? (picked ? "Kies een renner" : def.text)}</span>
      {c.type ? <span className={styles.bcardCost} aria-label={`${cost} kracht`}>{Array.from({ length: cost }, (_, i) => <span key={i} />)}</span> : null}
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
