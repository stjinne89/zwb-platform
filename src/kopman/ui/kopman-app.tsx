"use client";

import { CalendarDays, ChevronDown, ChevronUp, Coins, Crown, Flag, Package, Play, Trophy, Users, Wand2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cardById, TIER_LABELS, TYPE_LABELS } from "../engine/cards";
import { buildCourse, courseKind, courseWeights, fitFor } from "../engine/course";
import { bestLineup, buyPack, calendarOf, currentRace, currentTour, raceSetup, DUPLICATE_COINS, finishRace, LINEUP_SIZE, moveFor, newSave, newSeason, NEXT_TIER, openPackOf, priceAt, seasonDone, seasonMove, seasonStandings, sellSpares, setKopman, sparesByTier, toggleLineup, TRADE_COST, tradeable, tradeCards, tradeUp, type Pull, type RaceReward, type Save, type TourReward } from "../engine/economy";
import { generalOf, jerseysOf, type GcRow, type Jerseys } from "../engine/tour";
import type { Carry } from "../engine/board";
import type { Lineup } from "../engine/race";
import { bestItems, GEAR_SLOTS, isItem, ITEMS, STAFF_ROLES, teamBonus, type ItemSlot } from "../engine/items";
import { KIND_ODDS, PACK_LABELS, PACK_ODDS, PITY_PACKS } from "../engine/packs";
import { results, statBoost, type Placing, type RaceState } from "../engine/race";
import { PLAYER_TEAM, RIDER_TYPES, TIERS, type PackType, type RiderType, type Tier } from "../engine/types";
import { DIVISIONS, TOP_DIVISION } from "../engine/divisions";
import { raceById, tourById } from "../engine/world";
import { loadSave, SAVE_KEY, storeSave } from "../engine/save";
import { ItemCardView, SlotTile } from "./item-card";
import { Profile } from "./profile";
import { BoardView } from "./board-view";
import { clock, riderName, teamColor, teamName } from "./race-view";
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
const KIND_LABELS = { kermis: "Kermiskoers", klassieker: "Klassieker", monument: "Monument", rit: "Bergrit", tijdrit: "Tijdrit" } as const;
const pct = (n: number) => `${Math.round(n * 100)}%`;

function newSeed() {
  try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch { return Math.floor(Math.random() * 2 ** 32); }
}

function browserStore() {
  try { return window.localStorage; } catch { return null; }
}

/** The game on its own page: the night ground fills the screen, without the club's frame. */
export function KopmanScreen() {
  return <div className={styles.screen}><KopmanApp /></div>;
}

export function KopmanApp() {
  const [save, setSave] = useState<Save | null>(null);
  const saveRef = useRef<Save | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("koers");
  const [racing, setRacing] = useState<{ raceId: string; seed: number; lineup: Lineup; carry?: Carry; title?: string } | null>(null);
  // Back from a race leaves it standing; Verder on the race tab picks it up again.
  const [away, setAway] = useState(false);
  const [result, setResult] = useState<{ raceId: string; placings: Placing[]; reward: RaceReward } | null>(null);
  const [reveal, setReveal] = useState<{ title: string; pulls: Pull[] } | null>(null);
  const [picking, setPicking] = useState<Tier | null>(null);

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
      update(newSave(newSeed()));
    });
    return () => cancelAnimationFrame(frame);
  }, [update]);

  const onFinish = useCallback((state: RaceState, kracht: Record<string, number>) => {
    const current = saveRef.current;
    if (!current) return;
    const placings = results(state);
    const { save: next, reward } = finishRace(current, placings, kracht);
    update(next);
    setRacing(null);
    setAway(false);
    setResult({ raceId: state.raceId, placings, reward });
  }, [update]);

  if (!save) return <div className={styles.app}><div className={styles.muted} role="status">Ploeg opstellen…</div></div>;

  const race = currentRace(save);

  const start = () => {
    if (racing) { setAway(false); return; }
    if (!race || save.lineup.length !== LINEUP_SIZE || !save.kopman) return;
    const setup = raceSetup(save);
    const tour = currentTour(save);
    // In a stage race the board says which stage it is.
    if (setup) setRacing({ ...setup, title: tour ? `Etappe ${(save.tour?.stage ?? 0) + 1}/${tour.stages.length}` : undefined });
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
  const tradePicked = (picks: Record<string, number>) => {
    const traded = tradeCards(save, picks);
    if (!traded) return;
    update(traded.save);
    setPicking(null);
    setReveal({ title: "Ruil", pulls: [traded.pull] });
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.title}>Kop<span>man</span></div>
        <div className={styles.wallet}>
          <span className={styles.chip} title="Munten"><Coins size={15} aria-hidden /><span className={styles.stat}>{save.coins.toLocaleString("nl-NL")}</span><span className={styles.srOnly}>munten</span></span>
          <span className={styles.chip} title="Ongeopende pakketten"><Package size={15} aria-hidden />{save.packs.length}<span className={styles.srOnly}>pakketten</span></span>
          <span className={styles.chip} title="Niveau"><Trophy size={15} aria-hidden />{DIVISIONS[save.division].name}</span>
        </div>
      </header>
      {notice ? <div className={styles.notice} role="alert" style={{ marginBottom: 12 }}>{notice}</div> : null}
      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={styles.tab} onClick={() => setTab(t.id)}>
            <t.icon size={18} aria-hidden />{t.label}{t.id === "pakketten" && save.packs.length ? <span className={styles.tabCount}><span className={styles.srOnly}>, te openen: </span>{save.packs.length}</span> : null}
          </button>
        ))}
      </div>
      {tab === "koers" ? <RaceTab save={save} update={update} running={!!racing} onStart={start} /> : null}
      {tab === "ploeg" ? <TeamTab save={save} update={update} /> : null}
      {tab === "pakketten" ? <PacksTab save={save} update={update} onOpen={open} onTrade={trade} onPick={setPicking} /> : null}
      {tab === "seizoen" ? <SeasonTab save={save} update={update} /> : null}

      {racing ? (
        <div className={styles.race} role="region" aria-label={raceById.get(racing.raceId)?.name} style={away ? { display: "none" } : undefined}>
          <BoardView raceId={racing.raceId} seed={racing.seed} lineup={racing.lineup} carry={racing.carry} title={racing.title} items={save.items} own={save.teamName} active={!away} onBack={() => setAway(true)} onFinish={onFinish} />
        </div>
      ) : null}
      {result ? <ResultView result={result} own={save.teamName} onClose={() => setResult(null)} onPacks={() => { setResult(null); setTab("pakketten"); }} /> : null}
      {picking ? <TradePicker save={save} tier={picking} onTrade={tradePicked} onClose={() => setPicking(null)} /> : null}
      {reveal ? <PackReveal reveal={reveal} owned={{ ...save.collection, ...save.items }} onClose={() => setReveal(null)} /> : null}
    </div>
  );
}

function RaceTab({ save, update, running, onStart }: { save: Save; update: (s: Save) => void; running: boolean; onStart: () => void }) {
  if (seasonDone(save)) {
    const standings = seasonStandings(save);
    const rank = standings.findIndex((t) => t.id === PLAYER_TEAM) + 1;
    const move = seasonMove(save);
    const next = DIVISIONS[save.division + move].name;
    return (
      <div className={styles.stack}>
        <div className={styles.panel}>
          <div className={styles.h2}>{move > 0 ? `Promotie naar de ${next}` : move < 0 ? `Degradatie naar de ${next}` : `Seizoen ${save.season} klaar`}</div>
          <p className={styles.muted} style={{ margin: "6px 0 12px" }}>{save.teamName} werd {rank}e in de {DIVISIONS[save.division].name} met {standings[rank - 1].points} punten.</p>
          <button type="button" className={styles.primary} onClick={() => update(newSeason(save))}><CalendarDays size={18} aria-hidden />{move ? `Naar de ${next}` : "Nieuw seizoen"}</button>
        </div>
        <Pyramid division={save.division} move={move} />
        <StandingsTable save={save} />
      </div>
    );
  }
  const race = currentRace(save)!;
  const tour = currentTour(save);
  const course = buildCourse(race);
  const weights = courseWeights(course);
  const climbs = course.features;
  const ready = save.lineup.length === LINEUP_SIZE && !!save.kopman;
  const slot = `Koers ${save.raceIndex + 1} van ${calendarOf(save.division).length}`;
  return (
    <div className={styles.stack}>
      <div className={styles.panel}>
        <div className={styles.raceHead}>
          <div>
            <div className={styles.h2}>{tour ? tour.name : race.name}</div>
            {tour ? <div className={styles.h3} style={{ marginTop: 2 }}>{race.name}</div> : null}
            <div className={styles.row} style={{ marginTop: 4, gap: 8 }}>
              <span className={`${styles.badge} ${race.kind === "monument" || tour ? styles.badgeMonument : ""}`}>{tour ? `Etappe ${(save.tour?.stage ?? 0) + 1} van ${tour.stages.length}` : KIND_LABELS[race.kind]}</span>
              <span className={styles.muted}>{Math.round(course.length / 1000)} km · {courseKind(course)} · {race.country} · {slot}</span>
            </div>
          </div>
          <button type="button" className={styles.primary} disabled={!running && !ready} onClick={onStart}><Play size={18} aria-hidden />{running ? "Verder" : "Start"}</button>
        </div>
        <div style={{ margin: "12px 0" }}><Profile course={course} /></div>
        {climbs.length ? <div className={styles.features}>{[...new Map(climbs.map((f) => [f.name, f])).values()].map((f) => { const times = climbs.filter((x) => x.name === f.name).length; return <span key={f.name} className={`${styles.feature} ${f.kind === "kasseien" ? styles.featureKas : f.kind === "grind" ? styles.featureGrind : ""}`}>{f.name}{times > 1 ? ` ×${times}` : ""}</span>; })}</div> : null}
      </div>
      {save.tour ? (
        <div className={styles.panel}>
          <JerseyLine jerseys={jerseysOf(save.tour)} />
          <GeneralTable general={generalOf(save.tour)} own={save.teamName} />
        </div>
      ) : null}
      <div className={styles.panel}>
        <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <span className={styles.h3}>Opstelling</span>
          <button type="button" className={styles.ghost} onClick={() => update(bestLineup(save, race.id))}><Wand2 size={15} aria-hidden />Beste opstelling</button>
        </div>
        <div className={`${styles.lineupGrid} ${styles.lineupRace}`}>
          {Array.from({ length: LINEUP_SIZE }, (_, i) => save.lineup[i]).map((id, i) => id
            ? <RiderCardView key={id} card={cardById(id)} small live kopman={id === save.kopman} fit={fitFor(cardById(id), weights)} />
            : <div key={`leeg-${i}`} className={styles.emptySlot}>Leeg</div>)}
        </div>
      </div>
    </div>
  );
}

/**
 * The team name. While you type, the field may be empty; the save keeps the
 * last name that was not, and an empty field gets that name back when you
 * leave it.
 */
function TeamNameInput({ save, update }: { save: Save; update: (s: Save) => void }) {
  const [draft, setDraft] = useState(save.teamName);
  return (
    <input
      className={styles.nameInput}
      value={draft}
      maxLength={40}
      autoComplete="off"
      enterKeyHint="done"
      onChange={(e) => {
        setDraft(e.target.value);
        const name = e.target.value.trim();
        if (name && name !== save.teamName) update({ ...save, teamName: name });
      }}
      onBlur={() => setDraft(draft.trim() || save.teamName)}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
    />
  );
}

function TeamTab({ save, update }: { save: Save; update: (s: Save) => void }) {
  const [filter, setFilter] = useState<RiderType | "alle">("alle");
  const race = currentRace(save);
  const weights = race ? courseWeights(buildCourse(race)) : null;
  const bonus = teamBonus(save.items);
  const owned = Object.keys(save.collection).map(cardById).filter((c) => filter === "alle" || c.type === filter).sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id));
  return (
    <div className={styles.stack}>
      <div className={styles.panel}>
        <label className={styles.row}>
          <span className={styles.h3}>Ploegnaam</span>
          <TeamNameInput save={save} update={update} />
        </label>
      </div>
      <div className={styles.panel}>
        <div className={styles.h3} style={{ marginBottom: 10 }}>Opstelling {save.lineup.length}/{LINEUP_SIZE}</div>
        <div className={styles.lineupGrid}>
          {Array.from({ length: LINEUP_SIZE }, (_, i) => save.lineup[i]).map((id, i) => id ? (
            <RiderCardView key={id} card={cardById(id)} small live kopman={id === save.kopman} fit={weights ? fitFor(cardById(id), weights) : undefined}>
              <div className={styles.cardActions}>
                <button type="button" aria-pressed={id === save.kopman} aria-label="Kopman" onClick={() => update(setKopman(save, id))}><Crown size={14} aria-hidden /></button>
                <button type="button" disabled={!!save.tour} onClick={() => update(toggleLineup(save, id))}>Eruit</button>
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
              <RiderCardView key={card.id} card={card} kopman={card.id === save.kopman} fit={weights ? fitFor(card, weights) : undefined} boost={statBoost(card, bonus)}>
                <div className={styles.cardActions}>
                  <button type="button" aria-pressed={inLineup} disabled={!!save.tour || (!inLineup && save.lineup.length >= LINEUP_SIZE)} onClick={() => update(toggleLineup(save, card.id))}>{inLineup ? "In ploeg" : "Opstellen"}</button>
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
        <div className={styles.slotGrid}>{GEAR_SLOTS.map((slot) => <SlotTile key={slot} slot={slot} item={best[slot]} owned={copiesOf(items, slot)} />)}</div>
      </div>
      <div className={styles.panel}>
        <div className={styles.h3} style={{ marginBottom: 10 }}>Personeel</div>
        <div className={styles.slotGrid}>{STAFF_ROLES.map((role) => <SlotTile key={role} slot={role} item={best[role]} owned={copiesOf(items, role)} />)}</div>
      </div>
    </>
  );
}

function OddsLine({ type }: { type: PackType }) {
  const odds = PACK_ODDS[type];
  return (
    <>
      <div className={styles.odds}>{TIERS.filter((t) => odds[t] > 0).map((t) => `${t} ${pct(odds[t])}`).join(" · ")}{type === "goud" ? " · minstens één goud" : type === "diamant" ? " · minstens één diamant" : ""}</div>
      <div className={styles.odds}>renner {pct(KIND_ODDS.renner)} · materiaal {pct(KIND_ODDS.materiaal)} · personeel {pct(KIND_ODDS.personeel)}</div>
    </>
  );
}

function PacksTab({ save, update, onOpen, onTrade, onPick }: { save: Save; update: (s: Save) => void; onOpen: (type: PackType) => void; onTrade: (tier: Tier) => void; onPick: (tier: Tier) => void }) {
  const counts = TIERS.map((t) => ({ type: t as PackType, n: save.packs.filter((p) => p === t).length })).filter((x) => x.n > 0);
  const spares = sparesByTier(save);
  const forTrade = tradeableByTier(save);
  const tradeTiers = TIERS.filter((t) => spares[t] > 0 || (NEXT_TIER[t] && forTrade[t] > 0));
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
        <div className={styles.muted} style={{ marginTop: 10 }}>Goud gegarandeerd binnen {Math.max(1, PITY_PACKS - save.pity)} zilveren of gouden pakketten</div>
      </div>
      {tradeTiers.length ? (
        <div className={styles.panel}>
          <div className={styles.h3} style={{ marginBottom: 10 }}>Ruilen</div>
          <div className={styles.packRow}>
            {tradeTiers.map((tier) => {
              const up = NEXT_TIER[tier];
              const value = spares[tier] * DUPLICATE_COINS[tier];
              const sell = () => {
                if (!window.confirm(`${spares[tier]} ${TIER_LABELS[tier].toLowerCase()} reservekaarten verkopen voor ${value.toLocaleString("nl-NL")} munten?`)) return;
                const sold = sellSpares(save, tier);
                if (sold) update(sold.save);
              };
              return (
                <div key={tier} className={`${styles.pack} ${styles.spare} ${styles[tier]}`}>
                  <div className={styles.h3}>{TIER_LABELS[tier]}{spares[tier] ? ` · ${spares[tier]} reserve` : ""}</div>
                  {up ? <button type="button" disabled={forTrade[tier] < TRADE_COST} onClick={() => onPick(tier)}>Kies {TRADE_COST} → {TIER_LABELS[up].toLowerCase()}</button> : null}
                  {up && spares[tier] >= TRADE_COST ? <button type="button" className={styles.sell} onClick={() => onTrade(tier)}>Ruil {TRADE_COST} reserves</button> : null}
                  {spares[tier] ? <button type="button" className={styles.sell} onClick={sell}><Coins size={14} aria-hidden /> Verkoop reserves · {value.toLocaleString("nl-NL")}</button> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className={styles.panel}>
        <div className={styles.h3} style={{ marginBottom: 10 }}>Winkel</div>
        <div className={styles.packRow}>
          {(["brons", "zilver", "goud", "diamant"] as PackType[]).map((type) => {
            const price = priceAt(save, type);
            const from = DIVISIONS.find((d) => d.shop.includes(type));
            return (
              <div key={type} className={`${styles.pack} ${styles[type]}`}>
                <div className={styles.h3}>{PACK_LABELS[type]}</div>
                <OddsLine type={type} />
                {price !== undefined
                  ? <button type="button" disabled={save.coins < price} onClick={() => { const next = buyPack(save, type, price); if (next) update(next); }}><Coins size={14} aria-hidden /> {price.toLocaleString("nl-NL")}</button>
                  : <div className={styles.odds}>{from ? `Vanaf ${from.name}` : "Alleen te winnen"}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** All cards you hold for one slot, every tier. */
const copiesOf = (items: Record<string, number>, slot: ItemSlot) => ITEMS.filter((x) => x.slot === slot).reduce((sum, x) => sum + (items[x.id] ?? 0), 0);

/** Copies per tier that may go into a trade you pick yourself. */
function tradeableByTier(save: Save): Record<Tier, number> {
  const out: Record<Tier, number> = { brons: 0, zilver: 0, goud: 0, diamant: 0 };
  for (const id of Object.keys(save.collection)) out[cardById(id).tier] += tradeable(save, id);
  for (const item of ITEMS) out[item.tier] += tradeable(save, item.id);
  return out;
}

function TradePicker({ save, tier, onTrade, onClose }: { save: Save; tier: Tier; onTrade: (picks: Record<string, number>) => void; onClose: () => void }) {
  const [picks, setPicks] = useState<Record<string, number>>({});
  const up = NEXT_TIER[tier]!;
  const total = Object.values(picks).reduce((sum, n) => sum + n, 0);
  // One list: the most copies to spare first, riders, equipment and staff mixed; what you cannot trade last.
  const cards = [
    ...Object.keys(save.collection).map(cardById).filter((c) => c.tier === tier).map((c) => ({ id: c.id, owned: save.collection[c.id], rank: c.overall })),
    ...ITEMS.filter((x) => x.tier === tier && save.items[x.id]).map((x) => ({ id: x.id, owned: save.items[x.id], rank: 0 })),
  ].sort((a, b) => Number(!tradeable(save, a.id)) - Number(!tradeable(save, b.id)) || b.owned - a.owned || a.rank - b.rank || a.id.localeCompare(b.id));
  const pick = (id: string) => {
    const n = picks[id] ?? 0;
    setPicks({ ...picks, [id]: n < tradeable(save, id) && total < TRADE_COST ? n + 1 : 0 });
  };
  const actions = (id: string, owned: number) => {
    const n = picks[id] ?? 0;
    const free = tradeable(save, id);
    return (
      <div className={styles.cardActions}>
        <button type="button" aria-pressed={n > 0} disabled={!free || (!n && total >= TRADE_COST)} onClick={() => pick(id)}>{!free ? "In ploeg" : !n ? "Kiezen" : free > 1 ? `Gekozen ×${n}` : "Gekozen"}</button>
        {owned > 1 ? <span className={styles.badge}>×{owned}</span> : null}
      </div>
    );
  };
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Ruil ${TIER_LABELS[tier].toLowerCase()} naar ${TIER_LABELS[up].toLowerCase()}`}>
      <div className={styles.reveal}>
        <div className={styles.h2}>Ruil {TIER_LABELS[tier].toLowerCase()} → {TIER_LABELS[up].toLowerCase()}</div>
        <div className={styles.pickBar}>
          <span className={styles.stat}>{total}/{TRADE_COST}</span>
          <button type="button" className={styles.primary} disabled={total !== TRADE_COST} onClick={() => onTrade(picks)}>Ruil</button>
          <button type="button" className={styles.secondary} onClick={onClose}>Terug</button>
        </div>
        <div className={`${styles.cardGrid} ${styles.pickGrid}`}>
          {cards.map((x) => (isItem(x.id)
            ? <ItemCardView key={x.id} id={x.id}>{actions(x.id, x.owned)}</ItemCardView>
            : <RiderCardView key={x.id} card={cardById(x.id)} kopman={x.id === save.kopman}>{actions(x.id, x.owned)}</RiderCardView>))}
        </div>
      </div>
    </div>
  );
}

/** The pyramid, top level first; yours is yellow, with an arrow where the season sends you. */
function Pyramid({ division, move = 0 }: { division: number; move?: number }) {
  return (
    <ol className={styles.pyramid} aria-label="Piramide">
      {DIVISIONS.map((d, i) => ({ d, i })).reverse().map(({ d, i }) => (
        <li key={d.id} className={i === division ? styles.pyramidMine : i === division + move && move ? styles.pyramidNext : undefined} style={{ width: `${44 + (TOP_DIVISION - i) * 14}%` }} aria-current={i === division ? "step" : undefined}>
          {d.name}
        </li>
      ))}
    </ol>
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
          {standings.map((t, i) => {
            const move = moveFor(i + 1, standings.length, save.division);
            return (
              <tr key={t.id} className={`${t.id === PLAYER_TEAM ? styles.mine : ""} ${move > 0 ? styles.zoneUp : move < 0 ? styles.zoneDown : ""}`}>
                <td>{i + 1}{move > 0 ? <ChevronUp size={13} aria-label="promotie" /> : move < 0 ? <ChevronDown size={13} aria-label="degradatie" /> : null}</td><td><span className={styles.teamDot} style={{ background: teamColor(t.id) }} />{t.name}</td><td className={styles.num}>{t.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SeasonTab({ save, update }: { save: Save; update: (s: Save) => void }) {
  return (
    <div className={styles.stack}>
      <div className={styles.h2}>Seizoen {save.season} · {DIVISIONS[save.division].name}</div>
      <Pyramid division={save.division} />
      <StandingsTable save={save} />
      {save.seasonResults.length ? (
        <div className={styles.panel}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Uitslagen</caption>
            <thead><tr><th>Koers</th><th>Winnaar</th><th className={styles.num}>Beste</th><th className={styles.num}>Punten</th></tr></thead>
            <tbody>
              {save.seasonResults.map((r) => (
                <tr key={r.race}><td>{raceById.get(r.race)?.name ?? tourById.get(r.race)?.name}</td><td>{r.winner ? riderName(r.winner) : "–"}</td><td className={styles.num}>{r.best || "–"}</td><td className={styles.num}>{r.points}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div>
        <button type="button" className={styles.ghost} onClick={() => { if (window.confirm("Opnieuw beginnen? Je verzameling en seizoen gaan verloren.")) update(newSave(newSeed())); }}>Opnieuw beginnen</button>
      </div>
    </div>
  );
}

function ResultView({ result, own, onClose, onPacks }: { result: { raceId: string; placings: Placing[]; reward: RaceReward }; own: string; onClose: () => void; onPacks: () => void }) {
  const race = raceById.get(result.raceId)!;
  const tour = result.reward.tour;
  const tourName = tour ? tourById.get(tour.id)?.name : undefined;
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
          <div className={styles.h2}>{tourName ?? race.name}</div>
          {tour ? <div className={styles.h3} style={{ marginTop: 2 }}>{race.name}</div> : null}
          <table className={styles.table} style={{ marginTop: 8 }}>
            <thead><tr><th>#</th><th>Renner</th><th>Ploeg</th><th className={styles.num}>Tijd</th></tr></thead>
            <tbody>{top.map(row)}{mine.map(row)}</tbody>
          </table>
        </div>
        {tour ? <TourStanding tour={tour} own={own} /> : null}
        <div className={styles.rewards}>
          <div className={styles.reward}><span className={styles.muted}>Munten</span><b>+{reward.coins.toLocaleString("nl-NL")}</b></div>
          <div className={styles.reward}><span className={styles.muted}>Punten</span><b>+{reward.points}</b></div>
          <div className={styles.reward}><span className={styles.muted}>Pakket</span><b>{[reward.pack, ...(tour?.packs ?? [])].filter((p): p is PackType => !!p).map((p) => PACK_LABELS[p]).join(" · ") || "–"}</b></div>
          {reward.season ? <div className={styles.reward}><span className={styles.muted}>Seizoen: {reward.season.rank}e{reward.season.move > 0 ? " · promotie" : reward.season.move < 0 ? " · degradatie" : ""}</span><b>+{reward.season.coins.toLocaleString("nl-NL")}{reward.season.pack ? ` · ${PACK_LABELS[reward.season.pack]}` : ""}</b></div> : null}
        </div>
        <div className={styles.row}>
          {reward.pack || reward.season?.pack || tour?.packs.length ? <button type="button" className={styles.primary} onClick={onPacks}><Package size={18} aria-hidden />Pakket openen</button> : null}
          <button type="button" className={styles.secondary} onClick={onClose}>Verder</button>
        </div>
      </div>
    </div>
  );
}

const JERSEYS: { key: keyof Jerseys; label: string; className: string }[] = [
  { key: "geel", label: "Geel", className: styles.jerseyGeel },
  { key: "groen", label: "Groen", className: styles.jerseyGroen },
  { key: "berg", label: "Berg", className: styles.jerseyBerg },
];

/** Who wears the jerseys of a stage race. */
function JerseyLine({ jerseys }: { jerseys: Jerseys }) {
  return (
    <div className={styles.jerseys}>
      {JERSEYS.map((j) => jerseys[j.key] ? <span key={j.key} className={styles.jersey}><span className={`${styles.jerseyDot} ${j.className}`} aria-hidden />{j.label}: {riderName(jerseys[j.key]!)}</span> : null)}
    </div>
  );
}

/** The top five of the general classification, and your best rider below it if he is further down. */
function GeneralTable({ general, own, caption = "Klassement" }: { general: GcRow[]; own: string; caption?: string }) {
  const top = general.slice(0, 5);
  const index = general.findIndex((r) => r.team === PLAYER_TEAM);
  const rows = index >= 5 ? [...top, general[index]] : top;
  return (
    <table className={styles.table} style={{ marginTop: 8 }}>
      <caption className={styles.h3} style={{ textAlign: "left", marginBottom: 4 }}>{caption}</caption>
      <thead><tr><th>#</th><th>Renner</th><th>Ploeg</th><th className={styles.num}>Tijd</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className={r.team === PLAYER_TEAM ? styles.mine : undefined}>
            <td>{general.indexOf(r) + 1}</td>
            <td><span className={styles.teamDot} style={{ background: teamColor(r.team) }} />{riderName(r.id)}</td>
            <td className={styles.muted}>{teamName(r.team, own)}</td>
            <td className={styles.num}>{r.gap === 0 ? clock(r.time) : `+${clock(r.gap)}`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TourStanding({ tour, own }: { tour: TourReward; own: string }) {
  return (
    <div className={styles.panel} style={{ width: "100%" }}>
      <JerseyLine jerseys={tour.jerseys} />
      <GeneralTable general={tour.general} own={own} caption={tour.done ? "Eindklassement" : `Klassement na etappe ${tour.stage} van ${tour.of}`} />
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
              {isItem(p.id) ? <ItemCardView id={p.id} live /> : <RiderCardView card={cardById(p.id)} live mood={(cardById(p.id).tier === "goud" || cardById(p.id).tier === "diamant") && !p.duplicate ? "zege" : "rust"} />}
              {p.duplicate ? <div className={styles.dupMark}>Dubbel · ×{owned[p.id]}</div> : <div className={styles.newMark}>Nieuw</div>}
            </div>
          ))}
        </div>
        <button type="button" className={styles.primary} onClick={onClose}>Verder</button>
      </div>
    </div>
  );
}
