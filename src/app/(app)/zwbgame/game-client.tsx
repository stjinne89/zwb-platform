"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Bike, Check, ChevronRight, ChevronsUp, CircleHelp, Feather, Flag, Leaf, Maximize2, Medal, Minimize2, Mountain, Pause, Play, Settings2, Shield, Swords, Trophy, Users, Wind, Zap } from "lucide-react";
import { teamTint } from "@/lib/zwbgame/colors";
import { createRace, fatigueOf, groupsOf, huntsPoints, MAX_FATIGUE, SPRINT_METERS, standings, stepRace, STEP_SECONDS, timeScale } from "@/lib/zwbgame/engine";
import { applyChallenge, buildLadderTeams, challengeable, challengeWon, normalizeLadder, teamScore, type LadderStanding, type LadderTeam } from "@/lib/zwbgame/ladder";
import { accentAhead, elevationAt, gradeAt } from "@/lib/zwbgame/routes";
import { ladderKey, readLadder, readResults, readTour, restoreRace, resultsKey, saveKey, serializeRace, tourKey } from "@/lib/zwbgame/storage";
import { OWN_TEAM, type GameBootstrap, type GameMode, type GameRoute, type Mode, type PlayerCommand, type PowerupId, type RaceResult, type RaceState, type RiderState, type Squad, type TeamOrder, type ZrlFormat } from "@/lib/zwbgame/types";
import { buildZrlTeams, ownTeamResult, scoreZrl, ZRL_FORMATS, type ZrlScore } from "@/lib/zwbgame/zrl";
import { newTour, scoreStage, stageConfig, tourDone, tourStandings, type FrrTour } from "@/lib/zwbgame/frr";
import { climbingShare } from "@/lib/zwbgame/routes";
import { refreshGame, saveGamePower, saveGamePreferences } from "./actions";
import styles from "./game.module.css";

const RaceScene = dynamic(() => import("./race-scene"), { ssr: false, loading: () => <div className={styles.sceneLoading}>Peloton opstellen…</div> });
const labels = { sprinter: "Sprinter", puncher: "Puncher", tter: "Diesel", climber: "Klimmer", allrounder: "Allrounder" };
const modes: { id: Mode; label: string; key: string; icon: React.ReactNode }[] = [
  { id: "save", label: "Sparen", key: "1", icon: <Leaf size={20} /> },
  { id: "ride", label: "Meerijden", key: "2", icon: <Bike size={20} /> },
  { id: "front", label: "Naar voren", key: "3", icon: <ChevronsUp size={20} /> },
  { id: "attack", label: "Aanvallen", key: "4", icon: <Zap size={20} /> },
];
const orders: { id: TeamOrder; label: string; key: string }[] = [
  { id: "free", label: "Vrij rijden", key: "5" },
  { id: "bring", label: "Breng me terug", key: "6" },
  { id: "leadout", label: "Lead-out", key: "7" },
  { id: "points", label: "Pak de punten", key: "8" },
];
const formats: Record<ZrlFormat, string> = { points: "Puntenrace", rot: "Race of Truth", scratch: "Scratch", ttt: "Ploegentijdrit" };
const modeNames: Record<GameMode, string> = { ladder: "CLUB LADDER", zrl: "ZRL", frr: "FRR TOUR", free: "VRIJE RACE" };
const stageName = (route: GameRoute | undefined, kind: "road" | "itt") => kind === "itt" ? "Tijdrit" : route && climbingShare(route) < 0.004 ? "Vlakke rit" : "Heuvelrit";
/** Which team orders a race knows: none alone or in a TTT, points only where segments score. */
function ordersFor(state: RaceState) {
  if (state.config.mode === "free" || state.config.mode === "frr" || (state.config.mode === "zrl" && state.config.format === "ttt")) return [];
  return orders.filter((o) => o.id !== "points" || huntsPoints(state));
}
const squad = (team: LadderTeam): Squad => ({ id: team.id, riders: team.riderIds });
function readTourSafe(playerId: string) {
  try { return readTour(localStorage.getItem(tourKey(playerId)), playerId); } catch { return null; }
}
type Outcome = { score?: [number, number]; won?: boolean; from?: number; to?: number; zrl?: ZrlScore; tour?: FrrTour } | null;
const powerups: Record<PowerupId, { label: string; icon: React.ReactNode }> = {
  feather: { label: "Veer", icon: <Feather size={16} /> },
  aero: { label: "Aerohelm", icon: <Wind size={16} /> },
  draft: { label: "Draft boost", icon: <Users size={16} /> },
};
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const km = (meters: number) => (meters / 1000).toFixed(1).replace(".", ",");
/** A stable ladder per member: the same club teams every visit. */
const ladderSeed = (id: string) => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0, 0x811c9dc5);
const climbOf = (route: GameRoute) => Math.round(route.grades.reduce((sum, g) => sum + Math.max(0, g) * 100, 0));

export function GameClient({ initial }: { initial: GameBootstrap }) {
  const [data, setData] = useState(initial);
  const [mode, setMode] = useState<GameMode>("ladder");
  const [routeId, setRouteId] = useState(initial.routes[0]?.id ?? "");
  const [format, setFormat] = useState<ZrlFormat>(initial.zrlRace?.format ?? "points");
  const [rivalId, setRivalId] = useState<string | null>(null);
  const [ladder, setLadder] = useState<LadderStanding | null>(null);
  const [tour, setTour] = useState<FrrTour | null>(null);
  const [race, setRace] = useState<RaceState | null>(null);
  const [paused, setPaused] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasSave, setHasSave] = useState(false);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [overview, setOverview] = useState(false);
  const [lowQuality, setLowQuality] = useState(false);
  const [settings, setSettings] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);
  const engine = useRef<RaceState | null>(null);
  const queue = useRef<PlayerCommand[]>([]);
  const finishedSaved = useRef<string | null>(null);

  // ZRL: the route of the next club race comes first when the calendar has one.
  const routeList = mode === "zrl" && data.zrlRace ? [data.zrlRace.route, ...data.routes] : data.routes;
  // FRR: the tour in progress, or the one you would start (its stages are fixed).
  const shownTour = useMemo(() => (tour && !tourDone(tour) ? tour : data.routes.length ? newTour(data.roster, data.playerId, data.routes, ladderSeed(data.playerId)) : null), [tour, data]);
  const stage = shownTour ? stageConfig(shownTour, data.playerId) : null;
  // A stage whose route left the library shows a plain grid; starting it asks for a new tour.
  const route = mode === "frr" ? data.routes.find((r) => r.id === stage?.routeId) ?? data.routes[0] : routeList.find((r) => r.id === routeId) ?? routeList[0];
  const teams = useMemo(() => buildLadderTeams(data.roster, data.playerId, data.team, ladderSeed(data.playerId)), [data]);
  const zrlTeams = useMemo(() => buildZrlTeams(data.roster, data.playerId, data.zrlTeam, ladderSeed(data.playerId)), [data]);
  const standing = useMemo(() => normalizeLadder(ladder, teams.rivals), [ladder, teams]);
  const targets = challengeable(standing.order);
  const rival = teams.rivals.find((t) => t.id === (rivalId && targets.includes(rivalId) ? rivalId : targets[targets.length - 1]));
  const teamName = (id: string, inMode: GameMode = mode) => id === OWN_TEAM ? (inMode === "zrl" ? zrlTeams.own.name : teams.own.name) : [...teams.rivals, ...zrlTeams.rivals].find((t) => t.id === id)?.name ?? id;
  const squadsFor = (m: GameMode): Squad[] | undefined => m === "ladder" ? (rival ? [squad(teams.own), squad(rival)] : undefined) : m === "zrl" ? [squad(zrlTeams.own), ...zrlTeams.rivals.map(squad)] : undefined;
  // The lobby shows the start grid; during a race the engine state takes over. At the
  // top of the ladder there is nobody left to challenge, so the grid is a plain one.
  const shownMode: GameMode = (mode === "ladder" && !rival) || (mode === "frr" && stage?.routeId !== route?.id) ? "free" : mode;
  const preview = !race && route ? createRace(shownMode === "frr" && stage ? { ...stage, seed: 24 } : {
    mode: shownMode, format: shownMode === "zrl" ? format : undefined, routeId: route.id, seed: 24, playerId: data.playerId, squads: squadsFor(shownMode),
  }, data.roster, route) : null;
  const active = race ?? preview;
  const me = active?.riders.find((r) => r.rider.id === data.playerId);
  const nameOf = (id: string) => data.roster.find((r) => r.id === id)?.name ?? "Gast";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setHasSave(Boolean(localStorage.getItem(saveKey(initial.playerId))));
        setResults(readResults(localStorage.getItem(resultsKey(initial.playerId))));
        setLadder(readLadder(localStorage.getItem(ladderKey(initial.playerId))));
        setTour(readTour(localStorage.getItem(tourKey(initial.playerId)), initial.playerId));
      } catch { setError("Opslag is niet beschikbaar; deze race wordt niet bewaard."); }
      setLowQuality(window.matchMedia("(max-width: 760px)").matches);
    });
    return () => cancelAnimationFrame(frame);
  }, [initial.playerId]);
  const save = useCallback(() => {
    const current = engine.current;
    if (!current || current.finished || current.riders.find((r) => r.rider.id === data.playerId)?.finishTime !== null) return;
    try { localStorage.setItem(saveKey(data.playerId), serializeRace(current)); setHasSave(true); }
    catch { setError("Opslaan lukt niet; houd dit venster open om door te spelen."); }
  }, [data.playerId]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) { setPaused(true); save(); } };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", save);
    return () => { save(); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", save); };
  }, [save]);
  const ticks = race ? timeScale(race.route) : 1;
  useEffect(() => {
    if (!race || paused || race.finished) return;
    let frame = 0, previous = 0, accumulator = 0;
    const animate = (timestamp: number) => {
      const current = engine.current;
      if (!current) return;
      if (document.hidden) { setPaused(true); save(); return; }
      if (previous) accumulator += Math.min((timestamp - previous) / 1000, 0.5);
      previous = timestamp;
      let stepped = false;
      // Time runs compressed: each shown step covers several simulation steps.
      while (accumulator >= STEP_SECONDS && !current.finished) {
        for (let i = 0; i < ticks && !current.finished; i++) stepRace(current, queue.current.splice(0));
        accumulator -= STEP_SECONDS; stepped = true;
        const own = current.riders.find((r) => r.rider.id === current.config.playerId);
        // An emptied W′ drops you back into the wheel, except in the sprint itself.
        if (own && own.finishTime === null && own.mode === "attack" && own.wbal < 1 && current.route.length - own.distance > SPRINT_METERS) queue.current.push({ type: "mode", value: "ride" });
        // Once you are over the line the rest of the race is settled at once.
        if (own && own.finishTime !== null) while (!current.finished) stepRace(current);
      }
      if (stepped) {
        setRace({ ...current, riders: current.riders.map((r) => ({ ...r })) });
        if (current.tick % (25 * ticks) < ticks) save();
      }
      if (!current.finished) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
    // State snapshots must not restart the fixed-step clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, Boolean(race), race?.finished, save, ticks]);
  useEffect(() => {
    if (!race?.finished) return;
    const own = race.riders.find((r) => r.rider.id === data.playerId);
    const id = `${race.config.seed}:${race.config.routeId}`;
    if (!own || finishedSaved.current === id) return;
    const order = standings(race);
    const zrl = race.config.mode === "zrl" ? scoreZrl(race) : undefined;
    const mine = zrl && ownTeamResult(zrl);
    const score: [number, number] | undefined = race.config.mode === "ladder" ? teamScore(race) : zrl && mine?.points !== null && mine ? [mine.points ?? 0, zrl.teams[0].points ?? 0] : undefined;
    const result: RaceResult = {
      id, mode: race.config.mode, route: race.route.name, date: new Date().toISOString(), place: order.indexOf(own) + 1, count: race.riders.length, seconds: own.finishTime ?? race.tick * STEP_SECONDS, score,
      ...(zrl && mine ? { format: race.config.format, teamRank: [mine.rank, zrl.teams.length] as [number, number] } : {}),
    };
    // FRR: the stage goes into the tour, once.
    let nextTour: FrrTour | null = null;
    if (race.config.mode === "frr" && race.config.stage) {
      const current = readTourSafe(data.playerId);
      if (current && current.results.length === race.config.stage.index && current.stages[race.config.stage.index]?.routeId === race.config.routeId) {
        nextTour = { ...current, results: [...current.results, scoreStage(race, current)] };
      }
      result.stage = [race.config.stage.index + 1, current?.stages.length ?? race.config.stage.index + 1];
    }
    const frame = requestAnimationFrame(() => {
      finishedSaved.current = id;
      let next: LadderStanding | null = null;
      let change: Outcome = { score, zrl, tour: nextTour ?? undefined };
      if (nextTour) { try { localStorage.setItem(tourKey(data.playerId), JSON.stringify(nextTour)); } catch { setError("De tourstand kon niet worden opgeslagen."); } setTour(nextTour); }
      const rivalTeam = race.config.squads?.[1]?.id;
      if (race.config.mode === "ladder" && score && rivalTeam) {
        const won = challengeWon(score);
        const before = standing.order.indexOf(OWN_TEAM) + 1;
        next = { ...standing, order: applyChallenge(standing.order, OWN_TEAM, rivalTeam, won), history: [{ date: result.date, rival: rivalTeam, route: race.route.name, score, won }, ...standing.history].slice(0, 20) };
        change = { score, won, from: before, to: next.order.indexOf(OWN_TEAM) + 1 };
      }
      setOutcome(change);
      try {
        const previous = readResults(localStorage.getItem(resultsKey(data.playerId)));
        const list = [result, ...previous.filter((r) => r.id !== id)].slice(0, 20);
        localStorage.setItem(resultsKey(data.playerId), JSON.stringify(list));
        if (next) { localStorage.setItem(ladderKey(data.playerId), JSON.stringify(next)); setLadder(next); }
        localStorage.removeItem(saveKey(data.playerId)); setResults(list); setHasSave(false);
      } catch { setError("Je uitslag kon niet worden opgeslagen."); if (next) setLadder(next); }
    });
    return () => cancelAnimationFrame(frame);
  }, [race, data.playerId, standing]);
  const canDrive = Boolean(race && !paused && !race.finished && me && me.finishTime === null);
  const command = useCallback((value: PlayerCommand) => { if (canDrive) queue.current.push(value); }, [canDrive]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      // A focused button keeps Enter for itself; the other keys still work after a tap.
      if (target.matches("input, select, textarea") || (target.matches("button, a") && event.key === "Enter") || event.ctrlKey || event.metaKey || event.altKey) return;
      const own = engine.current?.riders.find((r) => r.rider.id === data.playerId);
      const picked = modes.find((m) => m.key === event.key);
      if (picked) command({ type: "mode", value: picked.id });
      const order = engine.current ? ordersFor(engine.current).find((o) => o.key === event.key) : undefined;
      if (order) command({ type: "order", value: order.id });
      if (own && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        const next = modes[modes.findIndex((m) => m.id === own.mode) + (event.key === "ArrowUp" ? 1 : -1)];
        if (next) command({ type: "mode", value: next.id });
      }
      // As in Zwift, the space bar fires your powerup.
      if (event.key === " " && race) { event.preventDefault(); command({ type: "powerup" }); }
      if ((event.key === "Escape" || event.key.toLowerCase() === "p") && race) { setPaused(true); save(); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [command, race, save, data.playerId]);

  async function reload() {
    const response = await refreshGame();
    if (!response.ok) throw new Error(response.error);
    if (!response.data.available) throw new Error("ZWBgame is tijdelijk niet beschikbaar.");
    setData(response.data); return response.data;
  }
  async function start(resume: boolean) {
    setBusy(true); setError("");
    try {
      const fresh = await reload();
      let next: RaceState | null = null;
      if (resume) {
        const text = engine.current ? serializeRace(engine.current) : localStorage.getItem(saveKey(fresh.playerId));
        next = text ? restoreRace(text, fresh.roster, [...fresh.routes, ...(fresh.zrlRace ? [fresh.zrlRace.route] : [])], fresh.playerId) : null;
        if (!next) { localStorage.removeItem(saveKey(fresh.playerId)); setHasSave(false); throw new Error("Deze opgeslagen race is verlopen. Start een nieuwe koers."); }
      } else {
        const freshRoutes = mode === "zrl" && fresh.zrlRace ? [fresh.zrlRace.route, ...fresh.routes] : fresh.routes;
        const chosen = freshRoutes.find((r) => r.id === routeId) ?? freshRoutes[0];
        if (!chosen) throw new Error("Er is nog geen route beschikbaar.");
        let squads: Squad[] | undefined;
        if (mode === "ladder") {
          const freshTeams = buildLadderTeams(fresh.roster, fresh.playerId, fresh.team, ladderSeed(fresh.playerId));
          const freshRival = freshTeams.rivals.find((t) => t.id === rival?.id);
          if (!freshRival) throw new Error("Kies een ploeg om uit te dagen.");
          squads = [squad(freshTeams.own), squad(freshRival)];
        } else if (mode === "frr") {
          let current = readTourSafe(fresh.playerId);
          if (!current || tourDone(current)) {
            current = newTour(fresh.roster, fresh.playerId, fresh.routes, crypto.getRandomValues(new Uint32Array(1))[0]);
            localStorage.setItem(tourKey(fresh.playerId), JSON.stringify(current)); setTour(current);
          }
          const config = stageConfig(current, fresh.playerId)!;
          const stageRoute = fresh.routes.find((r) => r.id === config.routeId);
          if (!stageRoute) { localStorage.removeItem(tourKey(fresh.playerId)); setTour(null); throw new Error("Een route van deze tour is niet meer beschikbaar. Start een nieuwe tour."); }
          next = createRace({ ...config, seed: crypto.getRandomValues(new Uint32Array(1))[0] }, fresh.roster, stageRoute);
        } else if (mode === "zrl") {
          const freshTeams = buildZrlTeams(fresh.roster, fresh.playerId, fresh.zrlTeam, ladderSeed(fresh.playerId));
          squads = [squad(freshTeams.own), ...freshTeams.rivals.map(squad)];
        }
        if (mode !== "frr") next = createRace({
          mode, format: mode === "zrl" ? format : undefined, routeId: chosen.id, seed: crypto.getRandomValues(new Uint32Array(1))[0], playerId: fresh.playerId, squads,
        }, fresh.roster, chosen);
        finishedSaved.current = null;
      }
      if (!next) throw new Error("Starten mislukt.");
      setOutcome(null);
      engine.current = next; queue.current = []; setRace({ ...next }); setPaused(false); setSettings(false); save();
    } catch (e) { setError(e instanceof Error ? e.message : "Starten mislukt."); }
    finally { setBusy(false); }
  }
  function stopTour() {
    try { localStorage.removeItem(tourKey(data.playerId)); } catch { /* nothing stored */ }
    setTour(null);
  }
  function back() { save(); setPaused(true); engine.current = null; setRace(null); setOutcome(null); }
  async function updatePreferences(visible: boolean, ownProfile: boolean) {
    setBusy(true); setError("");
    try { const result = await saveGamePreferences({ visible, ownProfile }); if (!result.ok) throw new Error(result.error); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Opslaan mislukt."); }
    finally { setBusy(false); }
  }
  async function powerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const optional = (key: string) => form.get(key) ? Number(form.get(key)) : undefined;
    try {
      const source = form.get("source");
      const result = await saveGamePower(source === "intervals" ? { source, weight: Number(form.get("weight")) } : { source: "manual", power: { ftp: Number(form.get("ftp")), weight: Number(form.get("weight")), sprint: optional("sprint"), minute: optional("minute"), fiveMinutes: optional("fiveMinutes") } });
      if (!result.ok) throw new Error(result.error);
      await reload(); setSettings(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Spelprofiel opslaan mislukt."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    // Same query as the landscape layout in the stylesheet.
    const query = window.matchMedia("(orientation: landscape) and (max-height: 540px)");
    const update = () => setLandscape(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === gameRef.current);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return; }
      await gameRef.current?.requestFullscreen();
      // Phones that allow it turn to landscape; others keep their orientation.
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape").catch(() => undefined);
    } catch { /* fullscreen is optional */ }
  }

  if (!route || !active || !me) {
    return <div className={styles.game}><div className={styles.error} role="status">Er is nog geen route beschikbaar.</div></div>;
  }
  const shown = active.route;
  const order = standings(active);
  const place = order.indexOf(me) + 1;
  const groups = groupsOf(order);
  const finishedCount = order.filter((r) => r.finishTime !== null).length;
  const remaining = Math.max(0, shown.length - me.distance);
  const next = accentAhead(shown, me.distance);
  const sprinting = remaining < SPRINT_METERS;
  const activeMode = active.config.mode;
  const score = activeMode === "ladder" ? teamScore(active) : null;
  const rivalName = activeMode === "ladder" && active.config.squads?.[1] ? teamName(active.config.squads[1].id, "ladder") : "";
  const zrl = activeMode === "zrl" ? scoreZrl(active) : null;
  const zrlOwn = zrl && ownTeamResult(zrl);
  const myPoints = zrl?.riders.get(me.rider.id);
  const ttt = activeMode === "zrl" && active.config.format === "ttt";
  const together = active.riders.filter((r) => r.team === OWN_TEAM && r.finishTime === null && Math.abs(r.distance - me.distance) < 20).length;
  const raceOrders = ordersFor(active);
  const ownName = teamName(OWN_TEAM, activeMode);
  const stageInfo = active.config.stage;
  const stages = shownTour?.stages.length ?? 0;
  const standingNow = shownTour ? tourStandings(shownTour) : null;
  const freshness = Math.round((1 - fatigueOf(me) / MAX_FATIGUE) * 100);
  const road = me.tucked ? "Supertuck" : me.sheltered ? "In het wiel" : "In de wind";
  const ownRank = standing.order.indexOf(OWN_TEAM) + 1;

  return <div className={styles.game} ref={gameRef} data-racing={race ? "true" : undefined}>
    <header className={styles.header}>
      <div className={styles.brand}><Bike size={26} /><span>ZWB<span className={styles.brandAccent}>game</span><small>ZWIFT-KOERS. JOUW TACTIEK.</small></span></div>
      <div className={styles.headerActions}>
        <Link href="/hulp#zwbgame" aria-label="Spelregels" title="Spelregels"><CircleHelp size={20} /></Link>
        {!race && <button onClick={() => setSettings(!settings)} aria-expanded={settings} aria-label="Spelinstellingen"><Settings2 size={20} /></button>}
        <span className={styles.memberPill}><span />{me.rider.name}</span>
      </div>
    </header>
    {error && <div className={styles.error} role="alert">{error}</div>}
    {!race && settings && <section className={styles.settings} aria-label="Spelinstellingen">
      <div className={styles.sectionHeading}><h2>Jouw spelprofiel</h2><Link href="/privacy">Privacy</Link></div>
      <label className={styles.toggle}><input type="checkbox" checked={data.preferences.visible} disabled={busy} onChange={(e) => updatePreferences(e.target.checked, data.preferences.ownProfile)} />Als herkenbare renner meedoen</label>
      <form onSubmit={powerSubmit} className={styles.powerForm}>
        <label>Bron<select name="source" defaultValue="manual"><option value="manual">Eigen meting</option><option value="intervals">Intervals · 90 dagen</option></select></label>
        <label>Gewicht (kg)<input name="weight" type="number" min="30" max="250" step="0.1" required /></label>
        <label>FTP (W)<input name="ftp" type="number" min="50" max="800" /></label>
        <label>15 seconden (W)<input name="sprint" type="number" min="50" max="2500" /></label>
        <label>1 minuut (W)<input name="minute" type="number" min="50" max="2500" /></label>
        <label>5 minuten (W)<input name="fiveMinutes" type="number" min="50" max="2500" /></label>
        <div className={styles.formActions}>
          <button className={styles.primary} disabled={busy} type="submit"><Check size={16} />Spelprofiel bijwerken</button>
          {data.preferences.ownProfile && <button type="button" className={styles.secondary} disabled={busy} onClick={() => updatePreferences(data.preferences.visible, false)}>Platformgegevens gebruiken</button>}
        </div>
      </form>
    </section>}
    <div className={styles.stage} data-testid="game-stage">
      <RaceScene state={active} overview={overview} lowQuality={lowQuality} raised={Boolean(race) && landscape} stepTicks={ticks} />
      <div className={styles.stageShade} />
      {!race ? <div className={styles.hero}>
        <span className={styles.eyebrow}>ZWB CYCLING • {modeNames[mode]}</span>
        <h1>Niet de sterkste?<br /><em>Wel de slimste.</em></h1>
        <p>{mode === "ladder" && rival ? `${teams.own.name} daagt ${rival.name} uit.` : mode === "zrl" ? `${zrlTeams.own.name} · ${formats[format]}` : mode === "frr" && stage?.stage ? `Etappe ${stage.stage.index + 1} van ${stages} · ${stageName(route, stage.stage.kind)}` : "Kies je moment. Pak je wiel. Maak het af."}</p>
        <button className={styles.primary} disabled={busy || (mode === "ladder" && !rival)} onClick={() => start(false)}><Flag size={18} />{busy ? "Opstellen…" : mode === "frr" && stage?.stage ? `Start etappe ${stage.stage.index + 1}` : "Start de koers"}<ArrowUpRight size={20} /></button>
        {hasSave && <button className={styles.resume} disabled={busy} onClick={() => start(true)}>Hervat je koers <ChevronRight size={16} /></button>}
      </div> : <>
        <div className={styles.raceTop}>
          <button className={styles.glassButton} onClick={back} aria-label="Terug naar startscherm"><ArrowLeft size={18} /></button>
          <div><span className={styles.eyebrow}>{modeNames[activeMode]}{activeMode === "zrl" && active.config.format ? ` · ${formats[active.config.format].toUpperCase()}` : ""}{stageInfo ? ` · ETAPPE ${stageInfo.index + 1} · ${stageName(shown, stageInfo.kind).toUpperCase()}` : ""}</span><h1>{shown.name}</h1></div>
          <button className={styles.glassButton} disabled={busy || race.finished} onClick={() => { if (paused) void start(true); else { setPaused(true); save(); } }} aria-label={paused ? "Hervatten" : "Pauzeren"}>{paused ? <Play size={19} /> : <Pause size={19} />}</button>
        </div>
        <div className={styles.raceNumbers}><div><strong>{place}<small>/{active.riders.length}</small></strong><span>POSITIE</span></div><div><strong>{(me.speed * 3.6).toFixed(0)}<small> km/u</small></strong><span>SNELHEID</span></div><div><strong>{km(remaining)}<small> km</small></strong><span>TE GAAN</span></div>{score && <div data-testid="team-score"><strong>{score[0]}<small> – {score[1]}</small></strong><span>PLOEGEN</span></div>}{zrlOwn && !ttt && <div data-testid="team-score"><strong>{zrlOwn.points}<small> #{zrlOwn.rank}</small></strong><span>PLOEGPUNTEN</span></div>}{ttt && <div data-testid="team-score"><strong>{together}<small>/5</small></strong><span>BIJ ELKAAR</span></div>}{stageInfo && <div data-testid="team-score"><strong>{stageInfo.index + 1}<small>/{stages}</small></strong><span>ETAPPE</span></div>}</div>
        <div className={styles.conditions}><span><Mountain size={14} />{(gradeAt(shown, me.distance) * 100).toFixed(1)}%</span><span><Zap size={14} />{Math.round(me.effort * 100)}% drempel</span><span className={me.sheltered || me.tucked ? styles.sheltered : undefined}>{road}</span>{next && <span>{/sprint|kom/i.test(next.name) ? next.name : `${next.kind === "sprint" ? "Sprint" : "KOM"} ${next.name}`}{next.start > me.distance ? ` · ${km(next.start - me.distance)} km` : ""}</span>}<span>{clock(active.tick * STEP_SECONDS)}</span>{me.active && <span className={styles.boost}>{powerups[me.active.id].icon}{powerups[me.active.id].label} {Math.ceil(me.active.left)}s</span>}</div>
        <ol className={styles.groups} aria-label="Groepen">
          {finishedCount > 0 && <li><Flag size={12} />{finishedCount}</li>}
          {groups.map((group, i) => {
            const mine = group.includes(me);
            const gap = i === 0 ? 0 : (groups[0][0].distance - group[0].distance) / Math.max(group[0].speed, 5);
            const mates = group.filter((r) => r.team === OWN_TEAM).length, rivals = group.filter((r) => r.team && r.team !== OWN_TEAM).length;
            return <li key={group[0].rider.id} data-mine={mine || undefined}>
              <span>{i === 0 && !finishedCount ? "Kop" : `+${clock(gap)}`}</span>
              <strong>{group.length}</strong>
              {score && <small>{mates}–{rivals}</small>}
              {zrl && mates > 0 && <small><Shield size={10} />{mates}</small>}
              {mine && <em>Jij</em>}
            </li>;
          })}
        </ol>
        {paused && !race.finished && <div className={styles.pauseOverlay}><Pause size={30} /><h2>Even op adem</h2><button className={styles.primary} disabled={busy} onClick={() => start(true)}><Play size={18} />Hervatten</button></div>}
      </>}
      <div className={styles.sceneTools}><button onClick={() => setOverview(!overview)} aria-pressed={overview}>{overview ? "Volgcamera" : "Overzicht"}</button><button onClick={() => setLowQuality(!lowQuality)} aria-pressed={lowQuality}>{lowQuality ? "3D · zuinig" : "3D · hoog"}</button>{race && typeof document !== "undefined" && document.fullscreenEnabled && <button onClick={toggleFullscreen} aria-pressed={fullscreen} aria-label={fullscreen ? "Volledig scherm sluiten" : "Volledig scherm"}>{fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>}</div>
      {!race && mode === "ladder" && <div className={styles.heroBadge}><Trophy size={20} /><span>{teams.own.name.toUpperCase()}<strong>Plek {ownRank} van {standing.order.length}</strong></span></div>}
    </div>
    <div className={styles.routeStrip}>
      <span><Flag size={15} />{shown.name}</span>
      <svg viewBox="0 0 500 45" preserveAspectRatio="none" role="img" aria-label="Hoogteprofiel route">
        {(() => {
          const samples = Array.from({ length: 101 }, (_, i) => elevationAt(shown, shown.length * i / 100));
          const min = Math.min(...samples), max = Math.max(...samples);
          const points = samples.map((y, i) => `${i * 5},${37 - (y - min) / Math.max(25, max - min) * 30}`).join(" ");
          const x = (d: number) => Math.max(0, Math.min(500, d / shown.length * 500));
          return <><polygon points={`0,45 ${points} 500,45`} fill="#d2a95f1f" /><polyline points={points} fill="none" stroke="#d2a95f" strokeWidth="2" />
            {shown.accents.filter((a) => a.banner).map((a) => <rect key={`${a.name}-${a.start}`} x={x(a.start)} width={Math.max(2, x(a.end) - x(a.start))} y="40" height="5" fill={a.kind === "sprint" ? "#3fa34d" : "#c8402f"} />)}
            {shown.lapLines.map((d) => <line key={d} x1={x(d)} x2={x(d)} y1="0" y2="45" stroke="#8fc4cc" strokeDasharray="3 3" />)}
            <line x1={x(me.distance)} x2={x(me.distance)} y1="0" y2="45" stroke="#fff" strokeWidth="2" /></>;
        })()}
      </svg><span>{km(shown.length)} km</span>
    </div>
    {race ? <>
      <div className={styles.dashboard}>
        <section className={styles.controls} aria-label="Rennerbediening">
          <div className={styles.resources}><Meter label="W′" value={me.wbal} max={me.wprime} icon={<Zap size={15} />} /><Meter label="Frisheid" value={freshness} max={100} icon={<Leaf size={15} />} /></div>
          <div className={styles.modes} role="group" aria-label="Rijstand">{modes.map((m) => <button key={m.id} data-mode={m.id} disabled={!canDrive} aria-pressed={me.mode === m.id} onClick={() => command({ type: "mode", value: m.id })}><kbd>{m.key}</kbd>{m.icon}{m.id === "attack" && sprinting ? "Sprinten" : m.label}</button>)}</div>
          <div className={styles.feedButtons}>
            <button className={styles.powerup} disabled={!canDrive || !me.powerup || Boolean(me.active)} onClick={() => command({ type: "powerup" })} aria-label={me.powerup ? `Powerup ${powerups[me.powerup].label}` : "Geen powerup"}><kbd>Spatie</kbd>{me.active ? <>{powerups[me.active.id].icon}{powerups[me.active.id].label} {Math.ceil(me.active.left)}s</> : me.powerup ? <>{powerups[me.powerup].icon}{powerups[me.powerup].label}</> : "Geen powerup"}</button>
          </div>
          {raceOrders.length > 0 && <div className={styles.cards} role="group" aria-label="Ploegorder">{raceOrders.map((o) => <button key={o.id} disabled={!canDrive} aria-pressed={active.order === o.id} onClick={() => command({ type: "order", value: o.id })}><kbd>{o.key}</kbd><Shield size={14} />{o.label}</button>)}</div>}
          <div className={styles.quietStats}><span>Dagvorm {me.form >= 1 ? "+" : ""}{Math.round((me.form - 1) * 100)}%</span><span>{me.attacks} aanvallen</span><span>{Math.round(me.shelteredSeconds / Math.max(1, active.tick * STEP_SECONDS) * 100)}% in het wiel</span>{score && <span>{teams.own.name} {score[0]} – {score[1]} {rivalName}</span>}{myPoints && <span>FAL {myPoints.fal} · FTS {myPoints.fts} · FIN {myPoints.fin}{myPoints.podium ? ` · podium ${myPoints.podium}` : ""}</span>}</div>
        </section>
        <section className={styles.positions} aria-label="Koersoverzicht"><div className={styles.sectionHeading}><h2>{race.finished ? "Uitslag" : "In de koers"}</h2><span>{order.length} renners</span></div><ol>{order.map((r, index) => <li key={r.rider.id} className={r.rider.id === data.playerId ? styles.ownPosition : r.team === OWN_TEAM ? styles.teamPosition : ""}><button disabled={!canDrive || r.rider.id === data.playerId || r.finishTime !== null} onClick={() => command({ type: "mode", value: "ride", targetId: r.rider.id })} aria-label={`Volg ${r.rider.name}`}><span>{index + 1}</span><strong>{r.rider.name}</strong>{r.team === OWN_TEAM && r.rider.id !== data.playerId && <Shield size={11} aria-label="Ploeggenoot" />}{r.team && r.team !== OWN_TEAM && <i className={styles.rivalDot} style={{ background: teamTint(r.team).helmet }} aria-label={teamName(r.team, activeMode)} />}<small>{r.finishTime !== null ? clock(r.finishTime) : index === 0 ? "Kop" : `+${Math.max(0, (order[0].distance - r.distance) / Math.max(r.speed, 2)).toFixed(0)}s`}</small></button></li>)}</ol></section>
      </div>
      {race.finished && <FinishCard me={me} place={place} race={race} outcome={outcome} rivalName={rivalName} ownName={ownName} teamName={(id) => teamName(id, activeMode)} nameOf={nameOf} onBack={back} />}
    </> : <>
      <div className={styles.modeTabs} role="tablist" aria-label="Spelvorm">
        <button role="tab" aria-selected={mode === "ladder"} onClick={() => setMode("ladder")}><Trophy size={16} />Ladder</button>
        <button role="tab" aria-selected={mode === "zrl"} onClick={() => { setMode("zrl"); if (data.zrlRace) setRouteId(data.zrlRace.route.id); }}><Medal size={16} />ZRL</button>
        <button role="tab" aria-selected={mode === "frr"} onClick={() => setMode("frr")}><Flag size={16} />FRR</button>
        <button role="tab" aria-selected={mode === "free"} onClick={() => setMode("free")}><Bike size={16} />Vrije race</button>
      </div>
      {mode === "frr" && shownTour && standingNow && <section className={styles.ladder} aria-label="Tour">
        <div className={styles.sectionHeading}><h2>{tour && !tourDone(tour) ? "Tour" : "Nieuwe tour"}</h2>{tour && !tourDone(tour) ? <button onClick={stopTour}>Tour stoppen</button> : <span>{shownTour.stages.length} etappes</span>}</div>
        <ol>{shownTour.stages.map((s, i) => {
          const done = shownTour.results[i];
          const mine = done && done.times[0] !== null ? [...done.times].filter((t): t is number => t !== null).sort((a, b) => a - b).indexOf(done.times[0]!) + 1 : null;
          return <li key={i} data-own={i === shownTour.results.length || undefined}>
            <span>{i + 1}</span>
            <div><strong>{data.routes.find((r) => r.id === s.routeId)?.name ?? s.routeId}</strong><small>{stageName(data.routes.find((r) => r.id === s.routeId), s.kind)}{done ? ` · ${mine ? `plek ${mine}` : "niet binnen"}` : ""}</small></div>
            {done && <Check size={16} />}
          </li>;
        })}</ol>
        {shownTour.results.length > 0 && <>
          <div className={styles.sectionHeading} style={{ marginTop: 18 }}><h2>Klassement</h2><span>{standingNow.gc.findIndex((r) => r.id === data.playerId) >= 0 ? `Jij: ${standingNow.gc.findIndex((r) => r.id === data.playerId) + 1}e` : "Jij: niet geklasseerd"}</span></div>
          <ol>{standingNow.gc.slice(0, 5).map((r, i) => <li key={r.id} data-own={r.id === data.playerId || undefined}><span>{i + 1}</span><div><strong>{nameOf(r.id)}</strong></div><small>{i === 0 ? "—" : `+${clock(r.gap)}`}</small></li>)}</ol>
          <div className={styles.ladderHistory}>{([["Geel", standingNow.gc[0]], ["Groen", standingNow.green[0]], ["Bolletjes", standingNow.polka[0]], ["Blauw", standingNow.blue[0]]] as const).map(([jersey, rider]) => rider && <span key={jersey}>{jersey}: {nameOf(rider.id)}</span>)}</div>
        </>}
      </section>}
      {mode === "zrl" && <section className={styles.ladder} aria-label="ZRL">
        {data.zrlRace && <p className={styles.zrlNext}><Medal size={15} /><span>{new Date(data.zrlRace.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}</span><strong>{data.zrlRace.title}</strong></p>}
        <div className={styles.formatPicker} role="radiogroup" aria-label="Format">{ZRL_FORMATS.map((f) => <button key={f} role="radio" aria-checked={format === f} onClick={() => setFormat(f)}>{formats[f]}</button>)}</div>
        <div className={styles.sectionHeading}><h2>Ploegen</h2><span>{active.riders.length} renners</span></div>
        <ol>{[zrlTeams.own, ...zrlTeams.rivals].map((team) => <li key={team.id} data-own={team.id === OWN_TEAM || undefined}>
          <i className={styles.rivalDot} style={{ background: teamTint(team.id).helmet }} />
          <div><strong>{team.name}</strong><small>{team.riderIds.map(nameOf).join(" · ")}</small></div>
        </li>)}</ol>
      </section>}
      {mode === "ladder" && <section className={styles.ladder} aria-label="Ladder">
        <div className={styles.sectionHeading}><h2>Ladder</h2><span>5 tegen 5</span></div>
        <ol>{standing.order.map((id, i) => {
          const team = id === OWN_TEAM ? teams.own : teams.rivals.find((t) => t.id === id)!;
          const open = targets.includes(id);
          return <li key={id} data-own={id === OWN_TEAM || undefined} data-selected={rival?.id === id || undefined}>
            <span>{i + 1}</span>
            <div><strong>{team.name}</strong><small>{team.riderIds.map(nameOf).join(" · ")}</small></div>
            {open && <button aria-pressed={rival?.id === id} onClick={() => setRivalId(id)}><Swords size={14} />{rival?.id === id ? "Uitgedaagd" : "Uitdagen"}</button>}
          </li>;
        })}</ol>
        {standing.history.length > 0 && <div className={styles.ladderHistory}>{standing.history.slice(0, 3).map((h) => <span key={h.date}>{h.won ? "W" : "V"} · {teamName(h.rival)} · {h.score[0]}–{h.score[1]}</span>)}</div>}
      </section>}
      {mode !== "frr" && <section className={styles.courseSection}><div className={styles.sectionHeading}><h2>Kies de route</h2><span>{active.riders.length} renners</span></div><div className={styles.courseGrid}>{routeList.map((r, i) => <button key={r.id} className={styles.courseCard} data-selected={route.id === r.id} aria-pressed={route.id === r.id} onClick={() => setRouteId(r.id)}><span className={styles.courseNumber}>{mode === "zrl" && data.zrlRace?.route.id === r.id ? "ZRL" : `0${i + 1}`}</span><span className={styles.courseIcon}>{climbOf(r) / r.length * 1000 > 6 ? <Mountain size={26} /> : <Wind size={26} />}</span><h3>{r.name}</h3><p>{r.laps > 1 ? `${r.laps} ronden · ` : ""}{climbOf(r)} hm{r.accents.some((a) => a.banner) ? ` · ${r.accents.filter((a) => a.banner).length} segmenten` : ""}</p><div><span>{km(r.length)} km</span><span>{route.id === r.id ? <Check size={18} /> : <ArrowUpRight size={18} />}</span></div></button>)}</div></section>}
      <section className={styles.lobbyBottom}><div className={styles.riderCard}><span className={styles.riderAvatar}><Bike size={28} /></span><div><span className={styles.eyebrow}>JOUW RENNER</span><h2>{me.rider.name}</h2><p>{labels[me.rider.kind]} · {({ basic: "Basisprofiel", platform: "Platformgegevens", manual: "Eigen meting", intervals: "Intervals" })[me.rider.source]}</p></div><div className={styles.ability}><span>Vlak<strong>{Math.round(me.rider.flat * 100)}</strong></span><span>Klim<strong>{Math.round(me.rider.climb * 100)}</strong></span><span>Sprint<strong>{Math.round(me.rider.sprint * 100)}</strong></span></div></div><button className={styles.rosterButton} onClick={() => setRosterOpen(!rosterOpen)} aria-expanded={rosterOpen}><span>Het clubpeloton<strong>{data.roster.length} ZWB-renners</strong></span><ChevronRight size={22} /></button></section>
      {rosterOpen && <section className={styles.roster} aria-label="Clubpeloton">{data.roster.map((r) => <div key={r.id}><Bike size={16} /><strong>{r.name}</strong><span>{labels[r.kind]}</span></div>)}</section>}
      {results.length > 0 && <section className={styles.history}><div className={styles.sectionHeading}><h2>Jouw laatste koersen</h2><button onClick={() => { try { localStorage.removeItem(resultsKey(data.playerId)); setResults([]); } catch { setError("Wissen mislukt."); } }}>Wissen</button></div>{results.slice(0, 5).map((r) => <div key={r.id}><span>{r.route}</span><span>{r.teamRank ? `${r.teamRank[0]}e van ${r.teamRank[1]}` : r.score ? `${r.score[0]}–${r.score[1]}` : `${r.place}/${r.count}`}</span><span>{clock(r.seconds)}</span></div>)}</section>}
    </>}
    <footer className={styles.footer}><span>ZWBgame <span>•</span> De club aan de start.</span><Link href="/hulp#zwbgame">Spelregels <ArrowUpRight size={13} /></Link>{active.riders.some((r) => r.rider.garmin) && <span>Spelkwaliteiten mede op basis van Garmin-gegevens</span>}</footer>
  </div>;
}

function FinishCard({ me, place, race, outcome, rivalName, ownName, teamName, nameOf, onBack }: { me: RiderState; place: number; race: RaceState; outcome: Outcome; rivalName: string; ownName: string; teamName: (id: string) => string; nameOf: (id: string) => string; onBack: () => void }) {
  if (outcome?.tour) {
    const tour = outcome.tour, standing = tourStandings(tour), n = tour.results.length;
    const gc = standing.gc.findIndex((r) => r.id === me.rider.id);
    const title = tourDone(tour)
      ? (gc === 0 ? "De tour is van jou." : gc > 0 ? `Tour klaar: ${gc + 1}e in het klassement.` : "Tour klaar, zonder klassement.")
      : `Etappe ${n}: plek ${place}.`;
    const jerseys = ([["geel", standing.gc[0]], ["groen", standing.green[0]], ["bolletjes", standing.polka[0]], ["blauw", standing.blue[0]]] as const)
      .filter(([, rider]) => rider?.id === me.rider.id).map(([jersey]) => jersey);
    const line = gc >= 0 ? `Klassement: ${gc + 1}e${gc > 0 ? `, +${clock(standing.gc[gc].gap)}` : ""}` : "Niet meer in het klassement";
    return <section className={styles.finishCard} aria-live="polite"><Flag size={30} /><div><span className={styles.eyebrow}>{tourDone(tour) ? "EINDKLASSEMENT" : `ETAPPE ${n} VAN ${tour.stages.length}`}</span><h2>{title}</h2><p>{line}{jerseys.length ? ` · trui: ${jerseys.join(", ")}` : ""} · leider {nameOf(standing.gc[0]?.id ?? me.rider.id)}</p></div><button className={styles.primary} onClick={onBack}>{tourDone(tour) ? "Nieuwe koers" : "Naar de tour"} <ArrowUpRight size={18} /></button></section>;
  }
  const score = outcome?.score;
  const zrl = outcome?.zrl;
  const mine = zrl && ownTeamResult(zrl);
  const title = zrl && mine
    ? (mine.league ? `${ownName} wordt ${mine.rank}e van ${zrl.teams.length}: ${mine.league} leaguepunten.` : `${ownName} heeft geen uitslag: minder dan vier renners binnen.`)
    : race.config.mode === "ladder" && score ? (outcome?.won ? `${ownName} wint ${score[0]}–${score[1]}.` : `${rivalName} houdt stand, ${score[1]}–${score[0]}.`) : place === 1 ? "De koers is van jou." : `Plek ${place}. Sterk gereden.`;
  const ladder = race.config.mode === "ladder" && score && outcome?.from && outcome.to ? (outcome.to < outcome.from ? `Ladder: plek ${outcome.from} → ${outcome.to}` : `Ladder: plek ${outcome.to}`) : null;
  const winner = zrl && zrl.teams[0].id !== "own" ? ` · winnaar ${teamName(zrl.teams[0].id)}` : "";
  return <section className={styles.finishCard} aria-live="polite"><Flag size={30} /><div><span className={styles.eyebrow}>FINISH</span><h2>{title}</h2><p>{me.finishTime !== null ? `${clock(me.finishTime)} · plek ${place}/${race.riders.length}` : "Niet gefinisht"} · {me.attacks} aanvallen · {Math.round(me.shelteredSeconds / Math.max(1, race.tick * STEP_SECONDS) * 100)}% in het wiel{ladder ? ` · ${ladder}` : ""}{winner}</p></div><button className={styles.primary} onClick={onBack}>Nieuwe koers <ArrowUpRight size={18} /></button></section>;
}

function Meter({ label, value, max, icon }: { label: string; value: number; max: number; icon: React.ReactNode }) {
  const share = Math.max(0, Math.min(1, value / max));
  return <div className={styles.meter}><span>{icon}{label}<strong>{Math.round(share * 100)}</strong></span><meter min={0} max={max} value={value} aria-label={label} /><div className={styles.meterTrack}><i style={{ width: `${share * 100}%`, background: share < 0.22 ? "#e2704f" : undefined }} /></div></div>;
}
