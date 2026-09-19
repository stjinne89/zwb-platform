"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, BatteryCharging, Bike, Check, ChevronRight, ChevronsUp, CircleHelp, Droplets, Flag, HeartPulse, Leaf, Maximize2, Minimize2, Mountain, MountainSnow, Pause, Play, Rocket, Settings2, Shield, Utensils, Wind, Zap } from "lucide-react";
import { COURSES, elevationAt } from "@/lib/zwbgame/courses";
import { CARD_SECONDS, conditionsAt, createRace, standings, stepRace, STEP_SECONDS } from "@/lib/zwbgame/engine";
import { readResults, restoreRace, resultsKey, saveKey, serializeRace } from "@/lib/zwbgame/storage";
import type { CardId, CourseId, GameBootstrap, PlayerCommand, RaceResult, RaceState, RiderState, Tactic } from "@/lib/zwbgame/types";
import { refreshGame, saveGamePower, saveGamePreferences } from "./actions";
import styles from "./game.module.css";

const RaceScene = dynamic(() => import("./race-scene"), { ssr: false, loading: () => <div className={styles.sceneLoading}>Peloton opstellen…</div> });
const labels = { sprinter: "Sprinter", puncher: "Puncher", tter: "Diesel", climber: "Klimmer", allrounder: "Allrounder" };
// Four riding modes replace a separate effort slider and tactic choice.
type ModeId = "save" | "ride" | "front" | "attack";
const modes: { id: ModeId; label: string; key: string; tactic: Tactic; effort: number; icon: React.ReactNode }[] = [
  { id: "save", label: "Sparen", key: "1", tactic: "wheel", effort: 0.62, icon: <Leaf size={20} /> },
  { id: "ride", label: "Meerijden", key: "2", tactic: "wheel", effort: 0.75, icon: <Bike size={20} /> },
  { id: "front", label: "Naar voren", key: "3", tactic: "front", effort: 0.88, icon: <ChevronsUp size={20} /> },
  { id: "attack", label: "Aanvallen", key: "4", tactic: "attack", effort: 1.2, icon: <Zap size={20} /> },
];
const modeOf = (r: RiderState): ModeId => r.tactic === "attack" ? "attack" : r.tactic === "front" || r.tactic === "pull" ? "front" : r.effort < 0.7 ? "save" : "ride";
const modeCommands = (id: ModeId): PlayerCommand[] => { const mode = modes.find((m) => m.id === id)!; return [{ type: "effort", value: mode.effort }, { type: "tactic", value: mode.tactic }]; };
/** Riders on the road in groups: less than 15 m apart counts as one group. */
function groupsOf(order: RiderState[]) {
  const groups: RiderState[][] = [];
  for (const r of order.filter((x) => x.finishTime === null)) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1].distance - r.distance < 15) last.push(r); else groups.push([r]);
  }
  return groups;
}
const courseIcons = { wind: <Wind size={28} />, hills: <Mountain size={28} />, mountain: <MountainSnow size={28} /> };
const cardInfo: Record<CardId, { label: string; icon: React.ReactNode }> = {
  tailwind: { label: "Rugwind", icon: <Wind size={16} /> },
  legs: { label: "Goede benen", icon: <BatteryCharging size={16} /> },
  second: { label: "Tweede adem", icon: <HeartPulse size={16} /> },
  surprise: { label: "Verrassingsaanval", icon: <Rocket size={16} /> },
};
const windLabel = (wind: number) => wind < -0.05 ? "Rugwind" : wind > 0.9 ? "Harde tegenwind" : wind > 0.4 ? "Tegenwind" : "Lichte wind";
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function GameClient({ initial }: { initial: GameBootstrap }) {
  const [data, setData] = useState(initial);
  const [courseId, setCourseId] = useState<CourseId>("polder");
  const [race, setRace] = useState<RaceState | null>(null);
  const [paused, setPaused] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasSave, setHasSave] = useState(false);
  const [results, setResults] = useState<RaceResult[]>([]);
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
  const preview = useMemo(() => createRace({ courseId, seed: 24, playerId: data.playerId }, data.roster), [courseId, data]);
  const active = race ?? preview;
  const me = active.riders.find((r) => r.rider.id === data.playerId)!;
  const course = COURSES[active.config.courseId];
  const order = standings(active);
  const place = order.findIndex((r) => r.rider.id === data.playerId) + 1;
  const terrain = conditionsAt(active.config, me.distance);
  const helpers = active.riders.filter((r) => r.captainId === data.playerId);
  const canDrive = Boolean(race && !paused && !race.finished && me.finishTime === null);
  const mode = modeOf(me);
  const groups = groupsOf(order);
  const finishedCount = order.filter((r) => r.finishTime !== null).length;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setHasSave(Boolean(localStorage.getItem(saveKey(initial.playerId))));
        setResults(readResults(localStorage.getItem(resultsKey(initial.playerId))));
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
      while (accumulator >= STEP_SECONDS && !current.finished) {
        stepRace(current, queue.current.splice(0)); accumulator -= STEP_SECONDS; stepped = true;
        // An emptied attack reserve drops you back into the wheel instead of stalling.
        const own = current.riders.find((r) => r.rider.id === current.config.playerId);
        if (own && own.finishTime === null && own.tactic === "attack" && own.reserve < 1 && !own.boost) queue.current.push(...modeCommands("ride"));
      }
      if (stepped) {
        setRace({ ...current, riders: current.riders.map((r) => ({ ...r })) });
        if (current.tick % 25 === 0) save();
      }
      if (!current.finished) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
    // State snapshots must not restart the fixed-step clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, Boolean(race), race?.finished, save]);
  useEffect(() => {
    if (!race || me.finishTime === null) return;
    const id = `${race.config.seed}:${race.config.courseId}`;
    if (finishedSaved.current === id) return;
    const result: RaceResult = { id, courseId: race.config.courseId, date: new Date().toISOString(), place, count: race.riders.length, seconds: me.finishTime };
    const frame = requestAnimationFrame(() => {
      finishedSaved.current = id;
      try {
        const previous = readResults(localStorage.getItem(resultsKey(data.playerId)));
        const next = [result, ...previous.filter((r) => r.id !== id)].slice(0, 20);
        localStorage.setItem(resultsKey(data.playerId), JSON.stringify(next));
        localStorage.removeItem(saveKey(data.playerId)); setResults(next); setHasSave(false);
      } catch { setError("Je uitslag kon niet worden opgeslagen."); }
    });
    return () => cancelAnimationFrame(frame);
  }, [race, me.finishTime, place, data.playerId]);
  const command = useCallback((value: PlayerCommand) => { if (canDrive) queue.current.push(value); }, [canDrive]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      // A focused button keeps Space and Enter for itself; mode keys still work after a tap.
      if (target.matches("input, select, textarea") || (target.matches("button, a") && (event.key === " " || event.key === "Enter")) || event.ctrlKey || event.metaKey || event.altKey) return;
      const own = engine.current?.riders.find((r) => r.rider.id === data.playerId);
      const picked = modes.find((m) => m.key === event.key);
      if (picked) modeCommands(picked.id).forEach(command);
      if (own && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        const index = modes.findIndex((m) => m.id === modeOf(own)) + (event.key === "ArrowUp" ? 1 : -1);
        if (modes[index]) modeCommands(modes[index].id).forEach(command);
      }
      const card = /^[5-8]$/.test(event.key) ? engine.current?.riders.find((r) => r.rider.id === data.playerId)?.cards[Number(event.key) - 5] : undefined;
      if (card) command({ type: "card", card });
      if (event.key.toLowerCase() === "e") command({ type: "eat" });
      if (event.key.toLowerCase() === "d") command({ type: "drink" });
      if (event.key === " " && race) { event.preventDefault(); setPaused(true); save(); }
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
        next = text ? restoreRace(text, fresh.roster, fresh.playerId) : null;
        if (!next) { localStorage.removeItem(saveKey(fresh.playerId)); setHasSave(false); throw new Error("Deze opgeslagen race is verlopen. Start een nieuwe koers."); }
      } else {
        next = createRace({ courseId, seed: crypto.getRandomValues(new Uint32Array(1))[0], playerId: fresh.playerId }, fresh.roster);
        finishedSaved.current = null;
      }
      engine.current = next; queue.current = []; setRace({ ...next }); setPaused(false); setSettings(false); save();
    } catch (e) { setError(e instanceof Error ? e.message : "Starten mislukt."); }
    finally { setBusy(false); }
  }
  function back() { save(); setPaused(true); engine.current = null; setRace(null); }
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

  return <div className={styles.game} ref={gameRef} data-racing={race ? "true" : undefined}>
    <header className={styles.header}>
      <div className={styles.brand}><Bike size={26} /><span>ZWB<span className={styles.brandAccent}>game</span><small>JOUW CLUB. JOUW KOERS.</small></span></div>
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
      <RaceScene state={active} overview={overview} lowQuality={lowQuality} raised={Boolean(race) && landscape} />
      <div className={styles.stageShade} />
      {!race ? <div className={styles.hero}>
        <span className={styles.eyebrow}>ZWB CYCLING • CLUBKOERS</span>
        <h1>Niet de sterkste?<br /><em>Wel de slimste.</em></h1>
        <p>Kies je moment. Pak je wiel. Maak het af.</p>
        <button className={styles.primary} disabled={busy} onClick={() => start(false)}><Flag size={18} />{busy ? "Opstellen…" : "Start de koers"}<ArrowUpRight size={20} /></button>
        {hasSave && <button className={styles.resume} disabled={busy} onClick={() => start(true)}>Hervat je koers <ChevronRight size={16} /></button>}
      </div> : <>
        <div className={styles.raceTop}>
          <button className={styles.glassButton} onClick={back} aria-label="Terug naar startscherm"><ArrowLeft size={18} /></button>
          <div><span className={styles.eyebrow}>LIVE KOERS</span><h1>{course.name}</h1></div>
          <button className={styles.glassButton} disabled={busy || race.finished} onClick={() => { if (paused) void start(true); else { setPaused(true); save(); } }} aria-label={paused ? "Hervatten" : "Pauzeren"}>{paused ? <Play size={19} /> : <Pause size={19} />}</button>
        </div>
        <div className={styles.raceNumbers}><div><strong>{place}<small>/{active.riders.length}</small></strong><span>POSITIE</span></div><div><strong>{(me.speed * 3.6).toFixed(0)}<small> km/u</small></strong><span>SNELHEID</span></div><div><strong>{(Math.max(0, course.length - me.distance) / 1000).toFixed(1)}<small> km</small></strong><span>TE GAAN</span></div></div>
        <div className={styles.conditions}><span><Mountain size={14} />{(terrain.grade * 100).toFixed(1)}%</span><span><Wind size={14} />{windLabel(terrain.wind)}</span><span>{clock(active.tick * STEP_SECONDS)}</span><span className={me.sheltered ? styles.sheltered : undefined}>{me.sheltered ? "In de luwte" : "In de wind"}</span>{me.boost && <span className={styles.boost}>{cardInfo[me.boost.card].icon}{cardInfo[me.boost.card].label} {Math.ceil(me.boost.left)}s</span>}</div>
        <ol className={styles.groups} aria-label="Groepen">
          {finishedCount > 0 && <li><Flag size={12} />{finishedCount}</li>}
          {groups.map((group, i) => {
            const mine = group.includes(me);
            const gap = i === 0 ? 0 : (groups[0][0].distance - group[0].distance) / Math.max(group[0].speed, 5);
            return <li key={group[0].rider.id} data-mine={mine || undefined}>
              <span>{i === 0 && !finishedCount ? "Kop" : `+${clock(gap)}`}</span>
              <strong>{group.length}</strong>
              {mine && <em>Jij{helpers.length > 0 && <Shield size={11} aria-label="met ploeg" />}</em>}
            </li>;
          })}
        </ol>
        {paused && !race.finished && <div className={styles.pauseOverlay}><Pause size={30} /><h2>Even op adem</h2><button className={styles.primary} disabled={busy} onClick={() => start(true)}><Play size={18} />Hervatten</button></div>}
      </>}
      <div className={styles.sceneTools}><button onClick={() => setOverview(!overview)} aria-pressed={overview}>{overview ? "Volgcamera" : "Overzicht"}</button><button onClick={() => setLowQuality(!lowQuality)} aria-pressed={lowQuality}>{lowQuality ? "3D · zuinig" : "3D · hoog"}</button>{race && typeof document !== "undefined" && document.fullscreenEnabled && <button onClick={toggleFullscreen} aria-pressed={fullscreen} aria-label={fullscreen ? "Volledig scherm sluiten" : "Volledig scherm"}>{fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>}</div>
      {!race && <div className={styles.heroBadge}><Shield size={20} /><span>JIJ TEGEN DE CLUB<strong>{data.roster.length} renners · solo</strong></span></div>}
    </div>
    <div className={styles.routeStrip}>
      <span><Flag size={15} />{course.name}</span>
      <svg viewBox="0 0 500 45" preserveAspectRatio="none" role="img" aria-label="Hoogteprofiel parcours">
        {(() => {
          const samples = Array.from({ length: 101 }, (_, i) => elevationAt(course, course.length * i / 100));
          const min = Math.min(...samples), max = Math.max(...samples);
          const points = samples.map((y, i) => `${i * 5},${37 - (y - min) / Math.max(25, max - min) * 30}`).join(" ");
          return <><polygon points={`0,45 ${points} 500,45`} fill={`${course.color}1f`} /><polyline points={points} fill="none" stroke={course.color} strokeWidth="2" /><line x1={Math.max(0, Math.min(500, me.distance / course.length * 500))} x2={Math.max(0, Math.min(500, me.distance / course.length * 500))} y1="0" y2="45" stroke="#fff" strokeWidth="2" /></>;
        })()}
      </svg><span>{(course.length / 1000).toFixed(1)} km</span>
    </div>
    {race ? <>
      <div className={styles.dashboard}>
        <section className={styles.controls} aria-label="Rennerbediening">
          <div className={styles.resources}><Meter label="Energie" value={me.energy} max={me.maxEnergy} icon={<Leaf size={15} />} /><Meter label="Aanval" value={me.reserve} max={100} icon={<Zap size={15} />} /><Meter label="Drinken" value={me.hydration} max={100} icon={<Droplets size={15} />} /></div>
          <div className={styles.modes} role="group" aria-label="Rijstand">{modes.map((m) => <button key={m.id} data-mode={m.id} disabled={!canDrive} aria-pressed={mode === m.id} onClick={() => modeCommands(m.id).forEach(command)}><kbd>{m.key}</kbd>{m.icon}{m.label}</button>)}</div>
          <div className={styles.feedButtons}><button disabled={!canDrive || !me.gels || me.eating > 0 || me.drinking > 0} onClick={() => command({ type: "eat" })}><Utensils size={17} />{me.eating > 0 ? "Eten…" : "Gel nemen"}<span>{me.gels}</span></button><button disabled={!canDrive || !me.bottles || me.eating > 0 || me.drinking > 0} onClick={() => command({ type: "drink" })}><Droplets size={17} />{me.drinking > 0 ? "Drinken…" : "Bidon pakken"}<span>{me.bottles}</span></button></div>
          {me.cards.length > 0 && <div className={styles.cards} aria-label="Bonuskaarten">{me.cards.map((card, i) => <button key={`${card}-${i}`} disabled={!canDrive || Boolean(CARD_SECONDS[card] && me.boost)} onClick={() => command({ type: "card", card })}><kbd>{i + 5}</kbd>{cardInfo[card].icon}{cardInfo[card].label}</button>)}</div>}
          <div className={styles.quietStats}><span>Dagvorm {me.form >= 1 ? "+" : ""}{Math.round((me.form - 1) * 100)}%</span><span>{helpers.length ? `Ploeg · ${helpers.length} ${helpers.length === 1 ? "knecht" : "knechten"}` : "Zonder ploeg"}</span><span>Herstel ×{me.recovery.toFixed(2)}</span><span>Energiebudget {me.maxEnergy.toFixed(0)}</span><span>{me.fed ? "Bevoorrading gepasseerd" : `Bevoorrading op ${(course.feedAt / 1000).toFixed(2).replace(".", ",")} km`}</span></div>
        </section>
        <section className={styles.positions} aria-label="Koersoverzicht"><div className={styles.sectionHeading}><h2>{race.finished ? "Uitslag" : "In de koers"}</h2><span>{order.length} renners</span></div><ol>{order.map((r, index) => <li key={r.rider.id} className={r.rider.id === data.playerId ? styles.ownPosition : r.captainId === data.playerId ? styles.teamPosition : ""}><button disabled={!canDrive || r.rider.id === data.playerId || r.finishTime !== null} onClick={() => command({ type: "tactic", value: "wheel", targetId: r.rider.id })} aria-label={`Volg ${r.rider.name}`}><span>{index + 1}</span><strong>{r.rider.name}</strong>{r.captainId === data.playerId && <Shield size={11} aria-label="Jouw knecht" />}<small>{r.finishTime !== null ? clock(r.finishTime) : index === 0 ? "Kop" : `+${Math.max(0, (order[0].distance - r.distance) / Math.max(r.speed, 2)).toFixed(0)}s`}</small></button></li>)}</ol></section>
      </div>
      {me.finishTime !== null && <section className={styles.finishCard} aria-live="polite"><Flag size={30} /><div><span className={styles.eyebrow}>FINISH</span><h2>{place === 1 ? "De koers is van jou." : `Plek ${place}. Sterk gereden.`}</h2><p>{clock(me.finishTime)} · {me.attacks} aanvallen · {Math.round(me.shelteredSeconds / Math.max(1, me.finishTime) * 100)}% beschut</p></div><button className={styles.primary} onClick={back}>Nieuwe koers <ArrowUpRight size={18} /></button></section>}
    </> : <>
      <section className={styles.courseSection}><div className={styles.sectionHeading}><h2>Kies jouw koers</h2><span>4–5 min · {preview.riders.length} renners</span></div><div className={styles.courseGrid}>{Object.values(COURSES).map((c, i) => <button key={c.id} className={styles.courseCard} data-selected={courseId === c.id} aria-pressed={courseId === c.id} onClick={() => setCourseId(c.id)}><span className={styles.courseNumber}>0{i + 1}</span><span className={styles.courseIcon} style={{ color: c.color }}>{courseIcons[c.icon]}</span><h3>{c.name}</h3><p>{c.subtitle}</p><div><span>{(c.length / 1000).toFixed(1)} km</span><span>{courseId === c.id ? <Check size={18} /> : <ArrowUpRight size={18} />}</span></div></button>)}</div></section>
      <section className={styles.lobbyBottom}><div className={styles.riderCard}><span className={styles.riderAvatar}><Bike size={28} /></span><div><span className={styles.eyebrow}>JOUW RENNER</span><h2>{me.rider.name}</h2><p>{labels[me.rider.kind]} · {({ basic: "Basisprofiel", platform: "Platformgegevens", manual: "Eigen meting", intervals: "Intervals" })[me.rider.source]}</p></div><div className={styles.ability}><span>Vlak<strong>{Math.round(me.rider.flat * 100)}</strong></span><span>Klim<strong>{Math.round(me.rider.climb * 100)}</strong></span><span>Sprint<strong>{Math.round(me.rider.sprint * 100)}</strong></span></div></div><button className={styles.rosterButton} onClick={() => setRosterOpen(!rosterOpen)} aria-expanded={rosterOpen}><span>Het clubpeloton<strong>{data.roster.length} ZWB-renners</strong></span><ChevronRight size={22} /></button></section>
      {rosterOpen && <section className={styles.roster} aria-label="Clubpeloton">{data.roster.map((r) => <div key={r.id}><Bike size={16} /><strong>{r.name}</strong><span>{labels[r.kind]}</span></div>)}</section>}
      {results.length > 0 && <section className={styles.history}><div className={styles.sectionHeading}><h2>Jouw laatste koersen</h2><button onClick={() => { try { localStorage.removeItem(resultsKey(data.playerId)); setResults([]); } catch { setError("Wissen mislukt."); } }}>Wissen</button></div>{results.slice(0, 5).map((r) => <div key={r.id}><span>{COURSES[r.courseId].name}</span><span>{r.place}/{r.count}</span><span>{clock(r.seconds)}</span></div>)}</section>}
    </>}
    <footer className={styles.footer}><span>ZWBgame <span>•</span> De club aan de start.</span><Link href="/hulp#zwbgame">Spelregels <ArrowUpRight size={13} /></Link>{active.riders.some((r) => r.rider.garmin) && <span>Spelkwaliteiten mede op basis van Garmin-gegevens</span>}</footer>
  </div>;
}

function Meter({ label, value, max, icon }: { label: string; value: number; max: number; icon: React.ReactNode }) {
  return <div className={styles.meter}><span>{icon}{label}<strong>{Math.round(value)}</strong></span><meter min={0} max={max} value={value} aria-label={label} /><div className={styles.meterTrack}><i style={{ width: `${value / max * 100}%`, background: value < 22 ? "#e2704f" : undefined }} /></div></div>;
}
