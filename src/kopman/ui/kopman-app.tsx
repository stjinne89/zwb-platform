"use client";

import { CalendarDays, Coins, Crown, Flag, Gift, Package, Play, Trophy, Users, Wand2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cardById, TIER_LABELS, TYPE_LABELS } from "../engine/cards";
import { buildCourse, courseKind, courseWeights, fitFor } from "../engine/course";
import { bestLineup, buyPack, currentRace, DAILY_PACK_RACES, DUPLICATE_COINS, finishRace, LINEUP_SIZE, newSave, newSeason, NEXT_TIER, openPackOf, packsLeftToday, raceSeed, seasonDone, seasonStandings, sellSpares, setKopman, sparesByTier, today, toggleLineup, TRADE_COST, tradeUp, type Pull, type RaceReward, type Save } from "../engine/economy";
import { bestItems, GEAR_SLOTS, isItem, STAFF_ROLES, teamBonus, type TeamBonus } from "../engine/items";
import { KIND_ODDS, PACK_LABELS, PACK_ODDS, PACK_PRICE, PITY_PACKS } from "../engine/packs";
import { results, type Placing, type RaceState } from "../engine/race";
import { PLAYER_TEAM, RIDER_TYPES, TIERS, type PackType, type RiderType, type Tier } from "../engine/types";
import { CALENDAR, raceById } from "../engine/world";
import { loadSave, SAVE_KEY, storeSave } from "../engine/save";
import { ItemCardView, SlotTile } from "./item-card";
import { Profile } from "./profile";
import { clock, RaceView, riderName, teamColor, teamName } from "./race-view";
import { Portrait, type Mood } from "./portrait";
import { RiderCardView } from "./rider-card";
import styles from "./kopman.module.css";

type Tab = "koers" | "ploeg" | "pakketten" | "seizoen";
const TABS: { id: Tab; label: string; icon: typeof Flag }[] = [
  { id: "koers", label: "Koers", icon: Flag },
  { id: "ploeg", label: "Ploeg", icon: Users },
  { id: "pakketten", label: "Pakketten", icon: Package },
  { id: "seizoen", label: "Seizoen", icon: Trophy },
];
const KIND_LABELS = { klassieker: "Klassieker", monument: "Monument", rit: "Bergrit", tijdrit: "Tijdrit" } as const;
const pct = (n: number) => `${Math.round(n * 100)}%`;

function newSeed() {
  try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch { return Math.floor(Math.random() * 2 ** 32); }
}

function browserStore() {
  try { return window.localStorage; } catch { return null; }
}

export function KopmanApp() {
  const [save, setSave] = useState<Save | null>(null);
  const saveRef = useRef<Save | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("koers");
  const [racing, setRacing] = useState<{ raceId: string; seed: number; riders: string[]; kopman: string; bonus: TeamBonus } | null>(null);
  const [result, setResult] = useState<{ raceId: string; placings: Placing[]; reward: RaceReward } | null>(null);
  const [reveal, setReveal] = useState<{ title: string; pulls: Pull[] } | null>(null);

  const update = useCallback((next: Save) => {
    saveRef.current = next;
    setSave(next);
    if (!storeSave(browserStore(), next)) setNotice("Opslaan lukt niet in deze browser. Je voortgang verdwijnt als je de pagina sluit.");
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const store = browserStore();
      let raw: string | null = null;
      try { raw = store?.getItem(SAVE_KEY) ?? null; } catch { raw = null; }
      const loaded = loadSave(store);
      if (loaded) { saveRef.current = loaded; setSave(loaded); return; }
      if (raw) {
        try { store?.setItem(`${SAVE_KEY}:kapot`, raw); } catch { /* best effort */ }
        setNotice("Je opgeslagen spel was beschadigd. Je begint opnieuw.");
      }
      update(newSave(newSeed(), today()));
    });
    return () => cancelAnimationFrame(frame);
  }, [update]);

  const onFinish = useCallback((state: RaceState) => {
    const current = saveRef.current;
    if (!current) return;
    const placings = results(state);
    const { save: next, reward } = finishRace(current, placings, today());
    update(next);
    setRacing(null);
    setResult({ raceId: state.raceId, placings, reward });
  }, [update]);

  if (!save) return <div className={styles.app}><div className={styles.muted} role="status">Ploeg opstellen…</div></div>;

  const date = today();
  const left = packsLeftToday(save, date);
  const race = currentRace(save);

  const start = () => {
    if (!race || save.lineup.length !== LINEUP_SIZE || !save.kopman) return;
    setRacing({ raceId: race.id, seed: raceSeed(save), riders: save.lineup, kopman: save.kopman, bonus: teamBonus(save.items) });
  };
  const open = (type: PackType) => {
    const opened = openPackOf(save, type);
    if (!opened) return;
    update(opened.save);
    setReveal({ title: PACK_LABELS[opened.type], pulls: opened.pulls });
  };
  const trade = (tier: Tier) => {
    const traded = tradeUp(save, tier);
    if (!traded) return;
    update(traded.save);
    setReveal({ title: "Ruil", pulls: [traded.pull] });
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.title}>Kop<span>man</span></div>
        <div className={styles.wallet}>
          <span className={styles.chip} title="Munten"><Coins size={15} aria-hidden /><span className={styles.stat}>{save.coins.toLocaleString("nl-NL")}</span><span className={styles.srOnly}>munten</span></span>
          <span className={styles.chip} title="Ongeopende pakketten"><Package size={15} aria-hidden />{save.packs.length}<span className={styles.srOnly}>pakketten</span></span>
          <span className={styles.chip} title="Koersen met een pakket vandaag"><Gift size={15} aria-hidden />{left}/{DAILY_PACK_RACES}</span>
        </div>
      </header>
      {notice ? <div className={styles.notice} role="alert" style={{ marginBottom: 12 }}>{notice}</div> : null}
      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={styles.tab} onClick={() => setTab(t.id)}>
            <t.icon size={18} aria-hidden />{t.label}{t.id === "pakketten" && save.packs.length ? ` (${save.packs.length})` : ""}
          </button>
        ))}
      </div>
      {tab === "koers" ? <RaceTab save={save} update={update} onStart={start} /> : null}
      {tab === "ploeg" ? <TeamTab save={save} update={update} /> : null}
      {tab === "pakketten" ? <PacksTab save={save} update={update} onOpen={open} onTrade={trade} /> : null}
      {tab === "seizoen" ? <SeasonTab save={save} update={update} /> : null}

      {racing ? <RaceView raceId={racing.raceId} seed={racing.seed} lineup={{ riders: racing.riders, kopman: racing.kopman, bonus: racing.bonus }} own={save.teamName} onFinish={onFinish} /> : null}
      {result ? <ResultView result={result} own={save.teamName} onClose={() => setResult(null)} onPacks={() => { setResult(null); setTab("pakketten"); }} /> : null}
      {reveal ? <PackReveal reveal={reveal} owned={{ ...save.collection, ...save.items }} onClose={() => setReveal(null)} /> : null}
    </div>
  );
}

function RaceTab({ save, update, onStart }: { save: Save; update: (s: Save) => void; onStart: () => void }) {
  if (seasonDone(save)) {
    const standings = seasonStandings(save);
    const rank = standings.findIndex((t) => t.id === PLAYER_TEAM) + 1;
    return (
      <div className={styles.stack}>
        <div className={styles.panel}>
          <div className={styles.h2}>Seizoen {save.season} klaar</div>
          <p className={styles.muted} style={{ margin: "6px 0 12px" }}>{save.teamName} werd {rank}e met {standings[rank - 1].points} punten.</p>
          <button type="button" className={styles.primary} onClick={() => update(newSeason(save))}><CalendarDays size={18} aria-hidden />Nieuw seizoen</button>
        </div>
        <StandingsTable save={save} />
      </div>
    );
  }
  const race = currentRace(save)!;
  const course = buildCourse(race);
  const weights = courseWeights(course);
  const climbs = course.features;
  const ready = save.lineup.length === LINEUP_SIZE && !!save.kopman;
  return (
    <div className={styles.stack}>
      <div className={styles.panel}>
        <div className={styles.raceHead}>
          <div>
            <div className={styles.h2}>{race.name}</div>
            <div className={styles.row} style={{ marginTop: 4, gap: 8 }}>
              <span className={`${styles.badge} ${race.kind === "monument" ? styles.badgeMonument : ""}`}>{KIND_LABELS[race.kind]}</span>
              <span className={styles.muted}>{Math.round(course.length / 1000)} km · {courseKind(course)} · {race.country} · Koers {save.raceIndex + 1} van {CALENDAR.length}</span>
            </div>
          </div>
          <button type="button" className={styles.primary} disabled={!ready} onClick={onStart}><Play size={18} aria-hidden />Start</button>
        </div>
        <div style={{ margin: "12px 0" }}><Profile course={course} /></div>
        {climbs.length ? <div className={styles.features}>{climbs.map((f) => <span key={`${f.name}-${f.start}`} className={`${styles.feature} ${f.kind === "kasseien" ? styles.featureKas : f.kind === "grind" ? styles.featureGrind : ""}`}>{f.name}</span>)}</div> : null}
      </div>
      <div className={styles.panel}>
        <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <span className={styles.h3}>Opstelling</span>
          <button type="button" className={styles.ghost} onClick={() => update(bestLineup(save, race.id))}><Wand2 size={15} aria-hidden />Beste opstelling</button>
        </div>
        <div className={styles.lineupGrid}>
          {Array.from({ length: LINEUP_SIZE }, (_, i) => save.lineup[i]).map((id, i) => id
            ? <RiderCardView key={id} card={cardById(id)} small live kopman={id === save.kopman} fit={fitFor(cardById(id), weights)} />
            : <div key={`leeg-${i}`} className={styles.emptySlot}>Leeg</div>)}
        </div>
      </div>
    </div>
  );
}

function TeamTab({ save, update }: { save: Save; update: (s: Save) => void }) {
  const [filter, setFilter] = useState<RiderType | "alle">("alle");
  const race = currentRace(save);
  const weights = race ? courseWeights(buildCourse(race)) : null;
  const owned = Object.keys(save.collection).map(cardById).filter((c) => filter === "alle" || c.type === filter).sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id));
  return (
    <div className={styles.stack}>
      <div className={styles.panel}>
        <label className={styles.row}>
          <span className={styles.h3}>Ploegnaam</span>
          <input className={styles.nameInput} value={save.teamName} maxLength={40} onChange={(e) => update({ ...save, teamName: e.target.value.trimStart() || "Mijn ploeg" })} />
        </label>
      </div>
      <div className={styles.panel}>
        <div className={styles.h3} style={{ marginBottom: 10 }}>Opstelling {save.lineup.length}/{LINEUP_SIZE}</div>
        <div className={styles.lineupGrid}>
          {Array.from({ length: LINEUP_SIZE }, (_, i) => save.lineup[i]).map((id, i) => id ? (
            <RiderCardView key={id} card={cardById(id)} small live kopman={id === save.kopman} fit={weights ? fitFor(cardById(id), weights) : undefined}>
              <div className={styles.cardActions}>
                <button type="button" aria-pressed={id === save.kopman} aria-label="Kopman" onClick={() => update(setKopman(save, id))}><Crown size={14} aria-hidden /></button>
                <button type="button" onClick={() => update(toggleLineup(save, id))}>Eruit</button>
              </div>
            </RiderCardView>
          ) : <div key={`leeg-${i}`} className={styles.emptySlot}>Leeg</div>)}
        </div>
      </div>
      <ItemsPanels items={save.items} />
      <div className={styles.panel}>
        <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <span className={styles.h3}>Verzameling · {Object.keys(save.collection).length}</span>
          <div className={styles.filters}>
            <button type="button" aria-pressed={filter === "alle"} onClick={() => setFilter("alle")}>Alle</button>
            {RIDER_TYPES.map((t) => <button key={t} type="button" aria-pressed={filter === t} onClick={() => setFilter(t)}>{TYPE_LABELS[t]}</button>)}
          </div>
        </div>
        <div className={styles.cardGrid}>
          {owned.map((card) => {
            const inLineup = save.lineup.includes(card.id);
            return (
              <RiderCardView key={card.id} card={card} kopman={card.id === save.kopman} fit={weights ? fitFor(card, weights) : undefined}>
                <div className={styles.cardActions}>
                  <button type="button" aria-pressed={inLineup} disabled={!inLineup && save.lineup.length >= LINEUP_SIZE} onClick={() => update(toggleLineup(save, card.id))}>{inLineup ? "In ploeg" : "Opstellen"}</button>
                  {save.collection[card.id] > 1 ? <span className={styles.badge}>×{save.collection[card.id]}</span> : null}
                </div>
              </RiderCardView>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ItemsPanels({ items }: { items: Record<string, number> }) {
  const best = bestItems(items);
  return (
    <>
      <div className={styles.panel}>
        <div className={styles.h3} style={{ marginBottom: 10 }}>Materiaal</div>
        <div className={styles.slotGrid}>{GEAR_SLOTS.map((slot) => <SlotTile key={slot} slot={slot} item={best[slot]} />)}</div>
      </div>
      <div className={styles.panel}>
        <div className={styles.h3} style={{ marginBottom: 10 }}>Personeel</div>
        <div className={styles.slotGrid}>{STAFF_ROLES.map((role) => <SlotTile key={role} slot={role} item={best[role]} />)}</div>
      </div>
    </>
  );
}

function OddsLine({ type }: { type: PackType }) {
  const odds = PACK_ODDS[type];
  return (
    <>
      <div className={styles.odds}>{TIERS.filter((t) => odds[t] > 0).map((t) => `${t} ${pct(odds[t])}`).join(" · ")}{type === "goud" ? " · minstens één goud" : ""}</div>
      <div className={styles.odds}>renner {pct(KIND_ODDS.renner)} · materiaal {pct(KIND_ODDS.materiaal)} · personeel {pct(KIND_ODDS.personeel)}</div>
    </>
  );
}

function PacksTab({ save, update, onOpen, onTrade }: { save: Save; update: (s: Save) => void; onOpen: (type: PackType) => void; onTrade: (tier: Tier) => void }) {
  const counts = TIERS.map((t) => ({ type: t as PackType, n: save.packs.filter((p) => p === t).length })).filter((x) => x.n > 0);
  const spares = sparesByTier(save);
  const spareTiers = TIERS.filter((t) => spares[t] > 0);
  return (
    <div className={styles.stack}>
      <div className={styles.panel}>
        <div className={styles.h3} style={{ marginBottom: 10 }}>Te openen</div>
        {counts.length ? (
          <div className={styles.packRow}>
            {counts.map(({ type, n }) => (
              <div key={type} className={`${styles.pack} ${styles[type]}`}>
                <div className={styles.h3}>{PACK_LABELS[type]} ×{n}</div>
                <OddsLine type={type} />
                <button type="button" onClick={() => onOpen(type)}>Openen</button>
              </div>
            ))}
          </div>
        ) : <div className={styles.muted}>Geen pakketten</div>}
        <div className={styles.muted} style={{ marginTop: 10 }}>Goud gegarandeerd binnen {Math.max(1, PITY_PACKS - save.pity)} pakketten</div>
      </div>
      {spareTiers.length ? (
        <div className={styles.panel}>
          <div className={styles.h3} style={{ marginBottom: 10 }}>Reservekaarten</div>
          <div className={styles.packRow}>
            {spareTiers.map((tier) => {
              const up = NEXT_TIER[tier];
              const value = spares[tier] * DUPLICATE_COINS[tier];
              const sell = () => {
                if (!window.confirm(`${spares[tier]} ${TIER_LABELS[tier].toLowerCase()} reservekaarten verkopen voor ${value.toLocaleString("nl-NL")} munten?`)) return;
                const sold = sellSpares(save, tier);
                if (sold) update(sold.save);
              };
              return (
                <div key={tier} className={`${styles.pack} ${styles.spare} ${styles[tier]}`}>
                  <div className={styles.h3}>{TIER_LABELS[tier]} ×{spares[tier]}</div>
                  {up ? <button type="button" disabled={spares[tier] < TRADE_COST} onClick={() => onTrade(tier)}>Ruil {TRADE_COST} → {TIER_LABELS[up].toLowerCase()}</button> : null}
                  <button type="button" className={styles.sell} onClick={sell}><Coins size={14} aria-hidden /> Verkoop · {value.toLocaleString("nl-NL")}</button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className={styles.panel}>
        <div className={styles.h3} style={{ marginBottom: 10 }}>Winkel</div>
        <div className={styles.packRow}>
          {(["brons", "zilver", "goud"] as PackType[]).map((type) => {
            const price = PACK_PRICE[type];
            return (
              <div key={type} className={`${styles.pack} ${styles[type]}`}>
                <div className={styles.h3}>{PACK_LABELS[type]}</div>
                <OddsLine type={type} />
                {price !== undefined
                  ? <button type="button" disabled={save.coins < price} onClick={() => { const next = buyPack(save, type, price); if (next) update(next); }}><Coins size={14} aria-hidden /> {price.toLocaleString("nl-NL")}</button>
                  : <div className={styles.odds}>Alleen te winnen</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StandingsTable({ save }: { save: Save }) {
  const standings = seasonStandings(save);
  return (
    <div className={styles.panel}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>Ploegenklassement</caption>
        <thead><tr><th>#</th><th>Ploeg</th><th className={styles.num}>Punten</th></tr></thead>
        <tbody>
          {standings.map((t, i) => (
            <tr key={t.id} className={t.id === PLAYER_TEAM ? styles.mine : undefined}>
              <td>{i + 1}</td><td><span className={styles.teamDot} style={{ background: teamColor(t.id) }} />{t.name}</td><td className={styles.num}>{t.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeasonTab({ save, update }: { save: Save; update: (s: Save) => void }) {
  return (
    <div className={styles.stack}>
      <div className={styles.h2}>Seizoen {save.season}</div>
      <StandingsTable save={save} />
      {save.seasonResults.length ? (
        <div className={styles.panel}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Uitslagen</caption>
            <thead><tr><th>Koers</th><th>Winnaar</th><th className={styles.num}>Beste</th><th className={styles.num}>Punten</th></tr></thead>
            <tbody>
              {save.seasonResults.map((r) => (
                <tr key={r.race}><td>{raceById.get(r.race)?.name}</td><td>{r.winner ? riderName(r.winner) : "–"}</td><td className={styles.num}>{r.best || "–"}</td><td className={styles.num}>{r.points}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div>
        <button type="button" className={styles.ghost} onClick={() => { if (window.confirm("Opnieuw beginnen? Je verzameling en seizoen gaan verloren.")) update(newSave(newSeed(), today())); }}>Opnieuw beginnen</button>
      </div>
    </div>
  );
}

function ResultView({ result, own, onClose, onPacks }: { result: { raceId: string; placings: Placing[]; reward: RaceReward }; own: string; onClose: () => void; onPacks: () => void }) {
  const race = raceById.get(result.raceId)!;
  const top = result.placings.slice(0, 10);
  const mine = result.placings.filter((p) => p.team === PLAYER_TEAM && (p.place > 10 || p.place === 0));
  const ownPlacings = result.placings.filter((p) => p.team === PLAYER_TEAM).sort((a, b) => (a.place || 999) - (b.place || 999));
  const moodFor = (place: number): Mood => (place >= 1 && place <= 3 ? "zege" : place >= 1 && place <= 20 ? "rust" : "limiet");
  const { reward } = result;
  const row = (p: Placing) => (
    <tr key={p.id} className={p.team === PLAYER_TEAM ? styles.mine : undefined}>
      <td>{p.place || "–"}</td>
      <td><span className={styles.teamDot} style={{ background: teamColor(p.team) }} />{riderName(p.id)}</td>
      <td className={styles.muted}>{teamName(p.team, own)}</td>
      <td className={styles.num}>{p.place === 1 ? clock(p.time ?? 0) : p.gap === null ? "–" : p.gap === 0 ? "z.t." : `+${clock(p.gap)}`}</td>
    </tr>
  );
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Uitslag ${race.name}`}>
      <div className={styles.reveal}>
        <div className={styles.finishLine}>
          {ownPlacings.map((p) => (
            <figure key={p.id} className={styles.finisher}>
              <span className={`${styles.finisherFace} ${styles[cardById(p.id).tier]}`}><Portrait card={cardById(p.id)} mood={moodFor(p.place)} /></span>
              <span className={styles.finisherPlace}>{p.place || "–"}</span>
              <figcaption>{cardById(p.id).last}</figcaption>
            </figure>
          ))}
        </div>
        <div className={styles.panel} style={{ width: "100%" }}>
          <div className={styles.h2}>{race.name}</div>
          <table className={styles.table} style={{ marginTop: 8 }}>
            <thead><tr><th>#</th><th>Renner</th><th>Ploeg</th><th className={styles.num}>Tijd</th></tr></thead>
            <tbody>{top.map(row)}{mine.map(row)}</tbody>
          </table>
        </div>
        <div className={styles.rewards}>
          <div className={styles.reward}><span className={styles.muted}>Munten</span><b>+{reward.coins.toLocaleString("nl-NL")}</b></div>
          <div className={styles.reward}><span className={styles.muted}>Punten</span><b>+{reward.points}</b></div>
          <div className={styles.reward}><span className={styles.muted}>Pakket</span><b>{reward.pack ? PACK_LABELS[reward.pack] : reward.dailyUsed ? "–" : "Limiet vandaag"}</b></div>
          {reward.season ? <div className={styles.reward}><span className={styles.muted}>Seizoen: {reward.season.rank}e</span><b>+{reward.season.coins.toLocaleString("nl-NL")} · {PACK_LABELS[reward.season.pack]}</b></div> : null}
        </div>
        <div className={styles.row}>
          {reward.pack || reward.season ? <button type="button" className={styles.primary} onClick={onPacks}><Package size={18} aria-hidden />Pakket openen</button> : null}
          <button type="button" className={styles.secondary} onClick={onClose}>Verder</button>
        </div>
      </div>
    </div>
  );
}

function PackReveal({ reveal, owned, onClose }: { reveal: { title: string; pulls: Pull[] }; owned: Record<string, number>; onClose: () => void }) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={reveal.title}>
      <div className={styles.reveal}>
        <div className={styles.h2}>{reveal.title}</div>
        <div className={`${styles.revealCards} ${reveal.pulls.length === 1 ? styles.revealOne : ""}`}>
          {reveal.pulls.map((p) => (
            <div key={p.id} className={styles.flip}>
              {isItem(p.id) ? <ItemCardView id={p.id} live /> : <RiderCardView card={cardById(p.id)} live mood={cardById(p.id).tier === "goud" && !p.duplicate ? "zege" : "rust"} />}
              {p.duplicate ? <div className={styles.dupMark}>Dubbel · ×{owned[p.id]}</div> : <div className={styles.newMark}>Nieuw</div>}
            </div>
          ))}
        </div>
        <button type="button" className={styles.primary} onClick={onClose}>Verder</button>
      </div>
    </div>
  );
}
