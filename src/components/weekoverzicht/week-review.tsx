"use client";

// Het weekoverzicht als reeks volle schermen: terugblik per onderdeel van
// ZWBeter dat het lid die week gebruikte, het oordeel van de coach, en als
// laatste de week erna om meteen aan te passen. Tikken rechts is verder, links
// terug, vasthouden pauzeert. Onderdelen zonder data krijgen geen scherm.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { emphasisParts } from "@/lib/weekly-review/coach-text";
import { isoWeekNumber } from "@/lib/weekly-review/period";
import type { WeekReview } from "@/lib/weekly-review/service";
import { durationWords, type WeekSummary } from "@/lib/weekly-review/summary";
import { refreshWeekReview } from "@/app/(app)/weekoverzicht/_actions";
import { karlaFont, stencilFont } from "./fonts";
import {
  BriljantPrint,
  ClubPrint,
  CoachPrint,
  FormPrint,
  FuelPrint,
  OpenerPrint,
  PlanPrint,
  PowerPrint,
  RidesPrint,
  TeamPrint,
} from "./prints";
import { clock, WeekAhead } from "./week-ahead";
import s from "./week-review.module.css";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** `scroll`: het scherm mag langer zijn dan de telefoon, met de knop onderin vast. */
type Slide = { key: string; label: string; seconds: number; scroll?: boolean; render: () => React.ReactNode };

const noSubscribe = () => () => {};

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function rangeLabel(start: string, end: string) {
  const [, m1, d1] = start.split("-").map(Number);
  const [, m2, d2] = end.split("-").map(Number);
  return m1 === m2 ? `${d1} – ${d2} ${MONTHS[m2 - 1]}` : `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]}`;
}

const weekdayName = (day: string) =>
  ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"][(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7];

const elevation = (m: number) => m.toLocaleString("nl-NL");

function CoachText({ text, waiting }: { text: string; waiting: boolean }) {
  return (
    <p className={`${s.coach} ${s.txt}${waiting ? ` ${s.coachWait}` : ""}`}>
      {emphasisParts(text).map((part, i) => (part.strong ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>))}
    </p>
  );
}

function buildSlides(
  summary: WeekSummary,
  review: WeekReview,
  coach: { text: string; state: WeekReview["coachState"] },
  back: () => void,
  preview: boolean,
): Slide[] {
  const slides: Slide[] = [];
  const { rides, plan, form, power, teams, fuel, club, briljant } = summary;

  slides.push({
    key: "open",
    label: `Week ${isoWeekNumber(summary.weekStart)}`,
    seconds: 5,
    render: () => (
      <>
        <h1 className={`${s.big} ${s.txt}`}>
          Week
          <br />
          {isoWeekNumber(summary.weekStart)}
        </h1>
        <div className={s.art}>
          <OpenerPrint riders={rides?.count ?? 3} />
        </div>
        <p className={`${s.lead} ${s.txt}`}>
          {summary.firstName ? `${summary.firstName}, zo` : "Zo"} {rides ? "reed" : "was"} je week.
        </p>
        <p className={`${s.sub} ${s.txt}`} style={{ marginBottom: 56 }}>{rangeLabel(summary.weekStart, summary.weekEnd)}</p>
      </>
    ),
  });

  if (rides) {
    slides.push({
      key: "rides",
      label: "Ritten",
      seconds: 6,
      render: () => (
        <>
          <h2 className={`${s.big} ${s.txt}`}>
            {Math.round(rides.km)}
            <small>km</small>
          </h2>
          <p className={`${s.sub} ${s.txt}`}>
            {rides.count === 1 ? "Eén rit" : `${rides.count} ritten`}
            {/* Een CSV-import zonder tijden geeft 0 minuten: dan geen "0:00 uur". */}
            {rides.movingMinutes > 0 ? (
              <>
                , <b>{clock(rides.movingMinutes)} uur</b>
              </>
            ) : null}
            {rides.elevationM > 0 ? (
              <>
                {" "}en <b>{elevation(rides.elevationM)} hoogtemeters</b>
              </>
            ) : null}
            .{rides.longest && rides.count > 1 ? ` ${weekdayName(rides.longest.day).replace(/^./, (c) => c.toUpperCase())} de langste: ${Math.round(rides.longest.km)} km.` : ""}
          </p>
          <div className={s.art}>
            <RidesPrint rides={rides} />
          </div>
        </>
      ),
    });
  }

  if (plan) {
    const missed = plan.perDay.filter((day) => day.status === "gemist");
    slides.push({
      key: "plan",
      label: "Schema",
      seconds: 6,
      render: () => (
        <>
          <h2 className={`${s.big} ${s.txt}`}>
            {plan.done}/{plan.planned}
          </h2>
          <p className={`${s.sub} ${s.txt}`}>
            Trainingen uit je schema gedaan.
            {missed.length === 1 ? (
              <>
                {" "}<b>{weekdayName(missed[0].day).replace(/^./, (c) => c.toUpperCase())} bleef liggen.</b>
              </>
            ) : missed.length > 1 ? (
              <>
                {" "}<b>{missed.length} bleven liggen.</b>
              </>
            ) : null}
          </p>
          <div className={s.art}>
            <PlanPrint plan={plan} />
          </div>
        </>
      ),
    });
  }

  if (form) {
    const diff = form.ctlStart == null ? null : Math.round(form.ctlEnd - form.ctlStart);
    slides.push({
      key: "form",
      label: "Belasting",
      seconds: 6,
      render: () => (
        <>
          <h2 className={`${s.big} ${s.txt}`}>{Math.round(form.ctlEnd)}</h2>
          <p className={`${s.lead} ${s.txt}`}>
            {diff == null || diff === 0 ? "Fitness, gelijk gebleven." : diff > 0 ? `Fitness, ${diff} ${diff === 1 ? "punt" : "punten"} erbij.` : `Fitness, ${-diff} ${diff === -1 ? "punt" : "punten"} eraf.`}
          </p>
          {form.tsbEnd != null ? (
            <p className={`${s.sub} ${s.txt}`}>
              Je vorm staat op <b>{form.tsbEnd > 0 ? "+" : ""}{Math.round(form.tsbEnd)}</b>.
            </p>
          ) : null}
          {form.weeks.length > 1 ? (
            <div className={s.art}>
              <FormPrint form={form} />
            </div>
          ) : null}
        </>
      ),
    });
  }

  if (power) {
    const shown = power.record ?? power.focus;
    if (shown) {
      slides.push({
        key: "power",
        label: "Vermogen",
        seconds: 6,
        render: () => (
          <>
            <h2 className={`${s.big} ${s.txt}`}>
              {shown.watts}
              <small>w</small>
            </h2>
            <p className={`${s.lead} ${s.txt}`}>
              {power.record ? `Je beste ${durationWords(shown.seconds)} van het afgelopen jaar.` : `Je beste ${durationWords(shown.seconds)} deze week.`}
            </p>
            {power.record?.wattsPerKg ? (
              <p className={`${s.sub} ${s.txt}`}>
                <b>{power.record.wattsPerKg.toLocaleString("nl-NL")} W/kg</b>.
              </p>
            ) : power.focus?.percentOfBest ? (
              <p className={`${s.sub} ${s.txt}`}>
                <b>{power.focus.percentOfBest}%</b> van je jaarbeste.
              </p>
            ) : null}
            <div className={s.art}>
              <PowerPrint power={power} />
            </div>
          </>
        ),
      });
    }
  }

  if (briljant) {
    const diff = briljant.previousPoints == null ? null : briljant.points - briljant.previousPoints;
    const up = briljant.previousLevel != null && briljant.level > briljant.previousLevel;
    slides.push({
      key: "briljant",
      label: "ZWBriljant",
      seconds: 6,
      render: () => (
        <>
          <h2 className={`${s.big} ${s.txt}`}>{briljant.points.toLocaleString("nl-NL")}</h2>
          <p className={`${s.lead} ${s.txt}`}>
            {up
              ? `Omhoog naar ${briljant.levelName}.`
              : diff == null
                ? `ZWBriljant ${briljant.levelName}.`
                : diff === 0
                  ? `${briljant.levelName}, gelijk gebleven.`
                  : `${briljant.levelName}, ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "punt" : "punten"} ${diff > 0 ? "erbij" : "eraf"}.`}
          </p>
          <p className={`${s.sub} ${s.txt}`}>
            {briljant.nextName ? (
              <>
                Nog <b>{briljant.toNext}</b> tot {briljant.nextName}.
              </>
            ) : null}
            {briljant.growFacet ? (
              <>
                {briljant.nextName ? " " : ""}Werk aan <b>{briljant.growFacet}</b> om je steen sneller te laten groeien.
              </>
            ) : null}
          </p>
          <div className={s.art}>
            <BriljantPrint briljant={briljant} />
          </div>
        </>
      ),
    });
  }

  if (teams) {
    const result = teams.results[0];
    const src = teams.src[0];
    slides.push({
      key: "teams",
      label: "Teams",
      seconds: 6,
      render: () =>
        result ? (
          <>
            <h2 className={`${s.big} ${s.txt}`}>{result.rank}e</h2>
            <p className={`${s.lead} ${s.txt}`}>
              {result.team} in {result.event}.
            </p>
            <p className={`${s.sub} ${s.txt}`}>
              Van {result.teams} teams.
              {result.riderPosition ? (
                <>
                  {" "}Jij werd <b>{result.riderPosition}e</b>
                  {result.riderCategory ? ` in ${result.riderCategory}` : ""}.
                </>
              ) : null}
              {teams.results.slice(1).map((other) => ` ${other.team}: ${other.rank}e.`)}
              {src ? (
                <>
                  {" "}Sunday Race Club: <b>{src.rank}e</b>.
                </>
              ) : null}
            </p>
            <div className={s.art}>
              <TeamPrint result={result} />
            </div>
          </>
        ) : (
          <>
            <h2 className={`${s.big} ${s.txt}`}>{src.rank}e</h2>
            <p className={`${s.lead} ${s.txt}`}>In de Sunday Race Club.</p>
            <p className={`${s.sub} ${s.txt}`}>
              {src.event}
              {src.category ? `, categorie ${src.category}` : ""}.
            </p>
          </>
        ),
    });
  }

  if (fuel) {
    const logged = fuel.loggedDays?.filter(Boolean).length ?? 0;
    slides.push({
      key: "fuel",
      label: "Voeding en kracht",
      seconds: 6,
      render: () => (
        <>
          <h2 className={`${s.big} ${s.txt}`}>{fuel.loggedDays ? `${logged}/7` : `${fuel.mobilitySessions}×`}</h2>
          <p className={`${s.lead} ${s.txt}`}>{fuel.loggedDays ? "Dagen voeding bijgehouden." : "Core en mobiliteit."}</p>
          {fuel.loggedDays && fuel.mobilitySessions > 0 ? (
            <p className={`${s.sub} ${s.txt}`}>
              En <b>{fuel.mobilitySessions === 1 ? "één core-sessie" : `${fuel.mobilitySessions} core-sessies`}</b>
              {fuel.mobilityMinutes ? `, samen ${fuel.mobilityMinutes} minuten` : ""}.
            </p>
          ) : null}
          <div className={s.art}>
            <FuelPrint fuel={fuel} />
          </div>
        </>
      ),
    });
  }

  if (club) {
    const ride = club.clubRides[0];
    slides.push({
      key: "club",
      label: "Club",
      seconds: 6,
      render: () => (
        <>
          <h2 className={`${s.big} ${s.txt}`}>{ride ? ride.riders : `+${club.newBlocks}`}</h2>
          <p className={`${s.lead} ${s.txt}`}>
            {ride ? `${ride.riders === 1 ? "Clubgenoot" : "Clubgenoten"} op ${weekdayName(ride.day)}.` : "Nieuwe ZWBlokken."}
          </p>
          <p className={`${s.sub} ${s.txt}`}>
            {ride ? <>{ride.title}{club.clubRides.length > 1 ? ` en nog ${club.clubRides.length - 1} clubrit${club.clubRides.length > 2 ? "ten" : ""}` : ""}.</> : null}
            {ride && club.newBlocks > 0 ? <> Onderweg <b>{club.newBlocks} nieuwe ZWBlokken</b>.</> : null}
            {club.badges.length ? <> Je verdiende de weekbadge <b>{club.badges.join(" en ")}</b>.</> : null}
          </p>
          {ride ? (
            <div className={s.art}>
              <ClubPrint club={club} />
            </div>
          ) : null}
        </>
      ),
    });
  }

  slides.push({
    key: "coach",
    label: "Coach",
    seconds: 9,
    render: () => (
      <>
        <div className={`${s.quote} ${s.txt}`} aria-hidden="true">“</div>
        <CoachText text={coach.text} waiting={coach.state === "pending"} />
        <p className={`${s.sig} ${s.txt}`}>{coach.state === "done" ? "Je coach · op basis van je week" : "Op basis van je week"}</p>
        <div className={s.art} style={{ margin: "auto -22px calc(-20px - env(safe-area-inset-bottom))" }}>
          <CoachPrint />
        </div>
      </>
    ),
  });

  slides.push({
    key: "next",
    label: `Week ${isoWeekNumber(review.next.weekStart)}`,
    seconds: 0,
    scroll: true,
    render: () => (
      <>
        <h2 className={`${s.big} ${s.m} ${s.txt}`}>Week {isoWeekNumber(review.next.weekStart)}</h2>
        <WeekAhead week={review.next} onBack={back} preview={preview} />
      </>
    ),
  });

  return slides;
}

export function WeekReviewStories({ review, onClose, preview = false }: { review: WeekReview; onClose: () => void; preview?: boolean }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [coach, setCoach] = useState({ text: review.coachText, state: review.coachState });
  const closeRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remaining = useRef(0);
  const startedAt = useRef(0);
  const heldAt = useRef(0);
  // Pas beginnen als de stencilletter er is: anders drukt WEEK 42 eerst in de
  // terugvalletter. Hooguit tweeënhalve seconde wachten; de launcher laadt
  // de letter al terwijl het overzicht wordt opgehaald.
  const [fontReady, setFontReady] = useState(false);

  const back = useCallback(() => setCurrent((value) => Math.max(0, value - 1)), []);
  const slides = useMemo(() => buildSlides(review.summary, review, coach, back, preview), [review, coach, back, preview]);
  const last = slides.length - 1;
  const slide = slides[Math.min(current, last)];

  useEffect(() => {
    closeRef.current?.focus();
    let done = false;
    const ready = () => {
      if (!done) {
        done = true;
        setFontReady(true);
      }
    };
    const fallback = setTimeout(ready, 2500);
    document.fonts?.load(`900 100px ${stencilFont.style.fontFamily}`).then(ready, ready);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(fallback);
      document.body.style.overflow = overflow;
    };
  }, []);

  // De coachtekst kan nog onderweg zijn: een paar keer navragen.
  useEffect(() => {
    if (coach.state !== "pending") return;
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      const fresh = await refreshWeekReview(review.weekStart).catch(() => null);
      if (fresh && fresh.coachState !== "pending") {
        setCoach({ text: fresh.coachText, state: fresh.coachState });
        clearInterval(id);
      }
      if (tries >= 12) clearInterval(id);
    }, 5000);
    return () => clearInterval(id);
  }, [coach.state, review.weekStart]);

  // Vanzelf door naar het volgende scherm, behalve op de laatste pagina.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    remaining.current = slide.seconds * 1000;
    startedAt.current = Date.now();
    if (!fontReady || reducedMotion() || !slide.seconds || current >= last) return;
    timer.current = setTimeout(() => setCurrent((value) => Math.min(last, value + 1)), remaining.current);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [current, slide.seconds, last, fontReady]);

  const hold = () => {
    heldAt.current = Date.now();
    if (!slide.seconds || current >= last) return;
    if (timer.current) clearTimeout(timer.current);
    remaining.current -= Date.now() - startedAt.current;
    setPaused(true);
  };
  const release = () => {
    if (!paused) return;
    setPaused(false);
    startedAt.current = Date.now();
    if (!reducedMotion()) timer.current = setTimeout(() => setCurrent((value) => Math.min(last, value + 1)), Math.max(300, remaining.current));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if ((event.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (event.key === "ArrowRight") setCurrent((value) => Math.min(last, value + 1));
      if (event.key === "ArrowLeft") setCurrent((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  const onLast = current >= last;
  // Rechtstreeks in <body>: binnen de pagina viel de onderbalk van het
  // tegelsontwerp eroverheen, met zondag en de opslaanknop eronder.
  const onClient = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!onClient) return null;

  return createPortal(
    <div
      className={`${s.backdrop} ${stencilFont.variable} ${karlaFont.variable}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Weekoverzicht week ${isoWeekNumber(review.summary.weekStart)}`}
    >
      <div className={`${s.stage}${paused ? ` ${s.paused}` : ""}`} onPointerUp={release} onPointerCancel={release}>
        <svg className={s.fiber} aria-hidden="true">
          <filter id="wr-fiber">
            <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves={3} seed={7} />
            <feColorMatrix values="0 0 0 0 .42  0 0 0 0 .37  0 0 0 0 .27  0 0 0 .42 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#wr-fiber)" />
        </svg>
        <svg className={s.reg} style={{ left: 4 }} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" />
          <path d="M8 0v16M0 8h16" stroke="currentColor" />
        </svg>
        <svg className={s.reg} style={{ right: 4 }} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" />
          <path d="M8 0v16M0 8h16" stroke="currentColor" />
        </svg>

        <div className={s.strips} aria-hidden="true">
          {slides.map((item, i) => (
            <i
              key={item.key}
              className={i < current ? s.done : i === current && fontReady ? s.now : undefined}
              style={{ "--dur": `${item.seconds || 600}s` } as React.CSSProperties}
            >
              <b key={i === current ? `now-${current}` : "b"} />
            </i>
          ))}
        </div>
        <button ref={closeRef} type="button" className={s.close} onClick={onClose} aria-label="Weekoverzicht sluiten">
          <X className="size-[22px]" strokeWidth={2.4} />
        </button>

        {slides.map((item, i) => (
          <section
            key={item.key}
            className={[s.slide, item.scroll ? s.scroll : "", i === current && fontReady ? s.on : ""].filter(Boolean).join(" ")}
            aria-hidden={i !== current} aria-label={item.label}>
            {i === current || Math.abs(i - current) === 1 || i === last ? item.render() : null}
          </section>
        ))}

        {!onLast ? (
          <>
            <button type="button" className={`${s.tap} ${s.tapL}`} aria-label="Vorig scherm" onClick={() => setCurrent((value) => Math.max(0, value - 1))} />
            <button
              type="button"
              className={`${s.tap} ${s.tapR}`}
              aria-label="Volgend scherm"
              onPointerDown={hold}
              onClick={() => {
                // Lang vasthouden is pauzeren, geen tik: dan niet door.
                if (Date.now() - heldAt.current > 350) return;
                setCurrent((value) => Math.min(last, value + 1));
              }}
            />
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
