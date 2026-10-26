"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { answerBonus, cancelBet, joinBokaal, placeBets } from "@/app/(app)/voorzpwelbokaal/actions";
import type { Board as BoardData, BoardRider } from "@/lib/bokaal/odds";
import type { BonusQuestion } from "@/lib/bokaal/settle";
import { boardName, CATEGORY_LABEL, formatBalls, formatOdd, MARKET_LABEL, PER_RACE, type Category, type Market } from "@/lib/bokaal/rules";
import { BallRack, ChalkRing, ChalkUnderline } from "./shell";
import styles from "./bokaal.module.css";

export type BoardRace = {
  id: string;
  category: Category;
  eventName: string;
  location: string | null;
  startsAt: string;
  board: BoardData;
  bonus: BonusQuestion | null;
};
export type PlacedBet = {
  id: string;
  raceId: string;
  market: Market;
  rider: string;
  riderName: string;
  vs: string | null;
  vsName: string | null;
  odds: number;
  stake: number;
};
type Pending = Omit<PlacedBet, "id"> & { key: string };

const SHOWN = 12;
const keyOf = (raceId: string, market: Market, rider: string, vs: string | null) => `${raceId}|${market}|${rider}|${vs ?? ""}`;

const DAY = new Intl.DateTimeFormat("nl-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Brussels" });
const TIME = new Intl.DateTimeFormat("nl-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });

export function BokaalBoard({
  races, placed, answers: initialAnswers, joined, balance, now,
}: {
  races: BoardRace[];
  placed: PlacedBet[];
  answers: Record<string, number>;
  joined: boolean;
  balance: number;
  now: number;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState(races[0]?.id ?? "");
  const [all, setAll] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState(initialAnswers);

  const race = races.find((r) => r.id === tab) ?? races[0];
  const isOpen = (r: BoardRace) => Date.parse(r.startsAt) > now;
  const placedIn = (raceId: string) => placed.filter((b) => b.raceId === raceId).reduce((a, b) => a + b.stake, 0);
  const pendingIn = (raceId: string) => pending.filter((b) => b.raceId === raceId).reduce((a, b) => a + b.stake, 0);
  const pendingTotal = pending.reduce((a, b) => a + b.stake, 0);
  const free = balance - pendingTotal;
  const placedKeys = useMemo(() => new Set(placed.map((b) => keyOf(b.raceId, b.market, b.rider, b.vs))), [placed]);
  const names = useMemo(() => new Map(races.flatMap((r) => r.board.riders.map((x) => [x.slug, x.name] as const))), [races]);

  function roomFor(raceId: string): string | null {
    if (placedIn(raceId) + pendingIn(raceId) >= PER_RACE) return `Per wedstrijd zet je hoogstens ${PER_RACE} ballen in.`;
    if (free < 1) return "Je hebt niet genoeg ZWBallen.";
    return null;
  }

  function toggle(r: BoardRace, market: Market, rider: string, vs: string | null, odds: number) {
    setError(null);
    const key = keyOf(r.id, market, rider, vs);
    if (pending.some((p) => p.key === key)) {
      setPending(pending.filter((p) => p.key !== key));
      return;
    }
    const blocked = roomFor(r.id);
    if (blocked) {
      setError(blocked);
      return;
    }
    setPending([...pending, { key, raceId: r.id, market, rider, riderName: names.get(rider) ?? rider, vs, vsName: vs ? names.get(vs) ?? vs : null, odds, stake: 1 }]);
    setFresh(key);
  }

  function step(key: string, delta: number) {
    setError(null);
    // Functioneel, zodat snel achter elkaar tikken elke tik telt.
    setPending((current) => {
      const bet = current.find((p) => p.key === key);
      if (!bet) return current;
      if (delta > 0) {
        const inRace = current.filter((p) => p.raceId === bet.raceId).reduce((a, p) => a + p.stake, 0);
        const total = current.reduce((a, p) => a + p.stake, 0);
        if (placedIn(bet.raceId) + inRace >= PER_RACE || balance - total < 1) return current;
      }
      return current.flatMap((p) => (p.key !== key ? [p] : p.stake + delta <= 0 ? [] : [{ ...p, stake: p.stake + delta }]));
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const reply = await placeBets(pending.map((p) => ({ raceId: p.raceId, market: p.market, rider: p.rider, vs: p.vs, stake: p.stake })));
      if (reply.ok) setPending([]);
      else setError(reply.error);
      router.refresh();
    });
  }

  function withdraw(id: string) {
    setError(null);
    startTransition(async () => {
      const reply = await cancelBet(id);
      if (!reply.ok) setError(reply.error);
      router.refresh();
    });
  }

  function answer(r: BoardRace, choice: number) {
    setError(null);
    const before = answers[r.id];
    setAnswers({ ...answers, [r.id]: choice });
    setFresh(`${r.id}|bonus|${choice}`);
    startTransition(async () => {
      const reply = await answerBonus({ raceId: r.id, choice });
      if (!reply.ok) {
        setError(reply.error);
        setAnswers((current) => {
          const next = { ...current };
          if (before === undefined) delete next[r.id];
          else next[r.id] = before;
          return next;
        });
      }
    });
  }

  function join() {
    setError(null);
    startTransition(async () => {
      const reply = await joinBokaal();
      if (!reply.ok) setError(reply.error);
      router.refresh();
    });
  }

  if (!race) {
    return (
      <div className={styles.layout}>
        <div>
          <div className={styles.board}>
            <div className={styles.slate}>
              <p className={cn(styles.emptyBoard, styles.chalk)}>Nog niets op het bord.</p>
            </div>
          </div>
          <div className={styles.ledge} aria-hidden="true" />
        </div>
      </div>
    );
  }

  const open = isOpen(race) && joined;
  const riders = all ? race.board.riders : race.board.riders.slice(0, SHOWN);

  const oddButton = (r: BoardRace, market: Market, rider: BoardRider, odds: number | null, extra?: string, vs: string | null = null) => {
    const key = keyOf(r.id, market, rider.slug, vs);
    const isPending = pending.some((p) => p.key === key);
    const isPlaced = placedKeys.has(key);
    return (
      <button
        type="button"
        className={cn(styles.odd, extra, odds == null && styles.none)}
        disabled={odds == null || !open || busy}
        aria-pressed={isPending}
        aria-label={`${rider.name} ${MARKET_LABEL[market]}${vs ? ` tegen ${names.get(vs) ?? vs}` : ""}, quotering ${formatOdd(odds)}`}
        onClick={() => odds != null && toggle(r, market, rider.slug, vs, odds)}
      >
        <span className={styles.chalk}>{formatOdd(odds)}</span>
        {isPending ? <ChalkRing variant={key.length} draw={fresh === key} /> : isPlaced ? <ChalkRing variant={key.length} placed /> : null}
      </button>
    );
  };

  const riderCell = (rider: BoardRider, end = false) => (
    <div className={cn(styles.rider, styles.chalk, end && styles.riderEnd)} title={rider.name}>
      <span className={styles.nm}>{boardName(rider.name)}</span>
      {!end && <span className={styles.rt}>{rider.rating ?? "–"}</span>}
    </div>
  );

  const start = new Date(race.startsAt);
  const bySlug = new Map(race.board.riders.map((x) => [x.slug, x]));
  const eventPlaced = placed.filter((b) => races.some((r) => r.id === b.raceId));
  const potential = pending.reduce((a, p) => a + p.stake * p.odds, 0);

  return (
    <div className={styles.layout}>
      <div>
        <div className={styles.board}>
          <div className={styles.slate}>
            <header className={cn(styles.boardHead, styles.chalk)}>
              <h2>{race.eventName}</h2>
              <span className={styles.when}>
                {DAY.format(start)}
                {race.location ? ` · ${race.location}` : ""}
                {!isOpen(race) && <span className={styles.shut}> · bord dicht</span>}
              </span>
            </header>
            {races.length > 1 && (
              <div className={cn(styles.tabs, styles.chalk)} role="tablist" aria-label="Wedstrijd">
                {races.map((r) => (
                  <button key={r.id} type="button" role="tab" className={styles.tab} aria-selected={r.id === race.id} onClick={() => { setTab(r.id); setAll(false); }}>
                    {CATEGORY_LABEL[r.category]} · {TIME.format(new Date(r.startsAt))}
                    <ChalkUnderline />
                  </button>
                ))}
              </div>
            )}
            <div role="tabpanel" aria-label={CATEGORY_LABEL[race.category]}>
              <div className={cn(styles.row, styles.heads, styles.chalk)}>
                <span>Renner</span><span>Wint</span><span>Podium</span><span>Top 10</span>
              </div>
              <div className={styles.rows}>
                {riders.map((rider) => (
                  <div key={rider.slug} className={styles.row}>
                    {riderCell(rider)}
                    {oddButton(race, "win", rider, rider.win, styles.win)}
                    {oddButton(race, "pod", rider, rider.pod)}
                    {oddButton(race, "top", rider, rider.top)}
                  </div>
                ))}
              </div>
              {race.board.riders.length > SHOWN && (
                <button type="button" className={cn(styles.more, styles.chalk)} aria-expanded={all} onClick={() => setAll(!all)}>
                  {all ? `Alleen de top ${SHOWN}` : `Hele startlijst (${race.board.riders.length})`}
                </button>
              )}
              {race.board.duels.length > 0 && (
                <div className={styles.section}>
                  <h3 className={cn(styles.duelsHead, styles.chalk)}>Duels · wie eindigt hoger</h3>
                  {race.board.duels.map((d) => {
                    const a = bySlug.get(d.a);
                    const b = bySlug.get(d.b);
                    if (!a || !b) return null;
                    return (
                      <div key={`${d.a}-${d.b}`} className={styles.duel}>
                        {riderCell(a)}
                        {oddButton(race, "duel", a, d.oa, styles.duelOdd, b.slug)}
                        <span className={cn(styles.vs, styles.chalk)}>of</span>
                        {oddButton(race, "duel", b, d.ob, styles.duelOdd, a.slug)}
                        {riderCell(b, true)}
                      </div>
                    );
                  })}
                </div>
              )}
              {race.bonus && (
                <div className={styles.section}>
                  <h3 className={cn(styles.bonusHead, styles.chalk)}>Bonusvraag · goed is 1 bal</h3>
                  <p className={cn(styles.question, styles.chalk)}>{race.bonus.question}</p>
                  <div className={styles.opts} role="group" aria-label={race.bonus.question}>
                    {race.bonus.options.map((option, i) => {
                      const chosen = answers[race.id] === i;
                      return (
                        <button key={option} type="button" className={styles.opt} aria-pressed={chosen} disabled={!open || busy} onClick={() => answer(race, i)}>
                          <span className={styles.chalk}>{option}</span>
                          {chosen && <ChalkRing variant={i} draw={fresh === `${race.id}|bonus|${i}`} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <footer className={cn(styles.slateFoot, styles.chalk)}>
              <span>
                Ratings: <a href="https://cyclingflash.com/cyclingflash-ranking/cyclocross/men-elite" target="_blank" rel="noreferrer">CyclingFlash</a>
              </span>
              <span>{TIME.format(start)} start</span>
            </footer>
          </div>
        </div>
        <div className={styles.ledge} aria-hidden="true" />
      </div>

      <div className={styles.slipColumn}>
        <div className={styles.slip} aria-live="polite">
          <div className={styles.slipHead}>
            <span>Wedbriefje</span>
            {joined && <span>Saldo {formatBalls(balance)}</span>}
          </div>
          {!joined ? (
            <>
              <div className={styles.actions}>
                <button type="button" className={styles.btn} onClick={join} disabled={busy}>Meedoen</button>
                <Link className={styles.slipLink} href="/privacy#voorzpwelbokaal">Privacy</Link>
              </div>
            </>
          ) : (
            <>
              <BallRack
                free={free}
                label={`${formatBalls(free)} vrij · ${races.map((r) => `${CATEGORY_LABEL[r.category].toLowerCase()} ${placedIn(r.id) + pendingIn(r.id)}/${PER_RACE}`).join(" · ")}`}
              />
              {eventPlaced.length === 0 && pending.length === 0 && Object.keys(answers).length === 0 && (
                <p className={styles.slipNote}>Tik een quotering aan.</p>
              )}
              <ul className={styles.lines}>
                {eventPlaced.map((b) => {
                  const r = races.find((x) => x.id === b.raceId)!;
                  return (
                    <li key={b.id} className={styles.line}>
                      <div className={styles.what}>
                        <b>{boardName(b.riderName)}</b> {MARKET_LABEL[b.market]}{b.vsName ? ` v. ${boardName(b.vsName)}` : ""} · {formatOdd(b.odds)}
                        <div className={styles.meta}>{CATEGORY_LABEL[r.category].toLowerCase()} · inzet {b.stake} · uitbetaling {formatBalls(b.stake * b.odds)}</div>
                      </div>
                      {isOpen(r) ? (
                        <button type="button" className={styles.lineBtn} onClick={() => withdraw(b.id)} disabled={busy}>Intrekken</button>
                      ) : <span />}
                    </li>
                  );
                })}
                {pending.map((p) => {
                  const r = races.find((x) => x.id === p.raceId)!;
                  return (
                    <li key={p.key} className={styles.line}>
                      <div className={styles.what}>
                        <b>{boardName(p.riderName)}</b> {MARKET_LABEL[p.market]}{p.vsName ? ` v. ${boardName(p.vsName)}` : ""} · {formatOdd(p.odds)}
                        <div className={styles.meta}>{CATEGORY_LABEL[r.category].toLowerCase()} · uitbetaling {formatBalls(p.stake * p.odds)}</div>
                      </div>
                      <div className={styles.stepper}>
                        <button type="button" aria-label={`Bal minder op ${p.riderName}`} onClick={() => step(p.key, -1)} disabled={busy}>−</button>
                        <output aria-label="Inzet">{p.stake}</output>
                        <button type="button" aria-label={`Bal meer op ${p.riderName}`} onClick={() => step(p.key, 1)} disabled={busy || roomFor(p.raceId) != null}>+</button>
                      </div>
                    </li>
                  );
                })}
                {races.filter((r) => r.bonus && answers[r.id] !== undefined).map((r) => (
                  <li key={`bonus-${r.id}`} className={styles.line}>
                    <div className={styles.what}>
                      <b>Bonus</b> {r.bonus!.options[answers[r.id]]}
                      <div className={styles.meta}>{CATEGORY_LABEL[r.category].toLowerCase()} · goed is 1 bal</div>
                    </div>
                    <span />
                  </li>
                ))}
              </ul>
              {pending.length > 0 && (
                <div className={styles.totals}>
                  <div><span>Op dit briefje</span><span>{pendingTotal}</span></div>
                  <div><span>Als alles raak is</span><span>{formatBalls(potential)}</span></div>
                </div>
              )}
              {error && <p className={styles.slipError} role="alert">{error}</p>}
              {pending.length > 0 && (
                <div className={styles.actions}>
                  <button type="button" className={styles.btn} onClick={submit} disabled={busy}>Op de lei zetten</button>
                  <button type="button" className={cn(styles.btn, styles.ghost)} onClick={() => { setPending([]); setError(null); }} disabled={busy}>Wissen</button>
                </div>
              )}
            </>
          )}
          {!joined && error && <p className={styles.slipError} role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
