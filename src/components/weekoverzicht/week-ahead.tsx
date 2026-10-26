"use client";

// De laatste pagina van het weekoverzicht: de week erna, met per dag de tijd
// die het lid heeft, wat het schema er zet en de events waar het al op staat.
// Aanpassen en opslaan kan hier meteen; dat gaat via dezelfde actie als de
// beschikbaarheid op de schemapagina, inclusief het bijwerken van het schema.

import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  AVAILABILITY_MAX_MINUTES,
  AVAILABILITY_STEP_MINUTES,
  WEEKDAY_SLUGS,
  weekdayOf,
} from "@/lib/training/availability";
import type { NextEventStatus, NextWeek } from "@/lib/weekly-review/summary";
import { saveWeekAvailability } from "@/app/(app)/zwbeter-worden/_actions";
import { reloadNextWeek } from "@/app/(app)/weekoverzicht/_actions";
import s from "./week-review.module.css";

const DAY = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
/**
 * De balk en de schuif delen één schaal. Eerst liep de balk tot vier uur en de
 * schuif tot zes: het streepje stond dan niet waar de echte schuifknop zat, en
 * op de iPhone (waar je alleen de knop zelf kunt slepen) gebeurde er niets.
 */
const BAR_MINUTES = AVAILABILITY_MAX_MINUTES;

/** Minuten op de plek van de vinger of muis op de balk, in kwartieren. */
function minutesAt(track: HTMLElement, clientX: number): number {
  const rect = track.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.round((ratio * AVAILABILITY_MAX_MINUTES) / AVAILABILITY_STEP_MINUTES) * AVAILABILITY_STEP_MINUTES;
}

const STATUS_LABEL: Record<NextEventStatus, string> = {
  opgesteld: "Opgesteld",
  aangemeld: "Aangemeld",
  beschikbaar: "Beschikbaar",
  misschien: "Misschien",
};

const STATUS_INK: Record<NextEventStatus, string> = {
  opgesteld: "var(--g)",
  aangemeld: "var(--s)",
  beschikbaar: "var(--c)",
  misschien: "var(--s)",
};

export function clock(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * `preview` is voor /ontwerp-voorbeeld: daar slaat de knop niets op. Die pagina
 * draait lokaal, vaak met een ingelogde sessie, en mag nooit echte
 * beschikbaarheid schrijven (zo ging het op 2026-10-18 een keer mis).
 */
export function WeekAhead({ week: initial, onBack, preview = false }: { week: NextWeek; onBack: () => void; preview?: boolean }) {
  const [week, setWeek] = useState(initial);
  const [minutes, setMinutes] = useState(() => week.days.map((day) => day.minutes));
  const [saved, setSaved] = useState(() => week.days.map((day) => day.minutes));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const total = minutes.reduce((sum, value) => sum + value, 0);
  const daysOn = minutes.filter((value) => value > 0).length;
  const dirty = useMemo(() => minutes.some((value, i) => value !== saved[i]), [minutes, saved]);

  function setDay(i: number, value: number) {
    setMinutes((current) => (current[i] === value ? current : current.map((old, j) => (j === i ? value : old))));
    setStatus(null);
    setJustSaved(false);
  }

  async function save() {
    if (preview) {
      setSaved(minutes);
      setJustSaved(true);
      setStatus("Voorbeeld: niets opgeslagen.");
      return;
    }
    setBusy(true);
    setStatus(null);
    const form = new FormData();
    form.set("week_start", week.weekStart);
    week.days.forEach((day, i) => form.set(`minutes_${weekdayOf(day.day)}`, String(minutes[i])));
    // Zekerheid: elke weekdag gaat mee, ook als de week korter zou zijn.
    for (const slug of WEEKDAY_SLUGS) if (!form.has(`minutes_${slug}`)) form.set(`minutes_${slug}`, "0");
    const result = await saveWeekAvailability(form);
    if (!result.ok) {
      setStatus(result.error);
      setBusy(false);
      return;
    }
    setSaved(minutes);
    setJustSaved(true);
    setStatus(result.generationId ? "Opgeslagen. Je schema wordt bijgewerkt." : "Opgeslagen.");
    const fresh = await reloadNextWeek(week.weekStart);
    if (fresh) setWeek(fresh);
    setBusy(false);
  }

  return (
    <>
      <p className={`${s.lead} ${s.txt}`} style={{ maxWidth: "none" }}>
        {clock(total)} uur · {daysOn} {daysOn === 1 ? "dag" : "dagen"} op de fiets
      </p>
      <div className={`${s.week} ${s.txt}`}>
        {week.days.map((day, i) => {
          const value = minutes[i];
          const pct = Math.min(100, (value / BAR_MINUTES) * 100);
          const changed = value !== saved[i];
          const training = value === 0 ? null : changed ? "schema past zich aan" : day.plan;
          return (
            <div key={day.day} className={s.row}>
              <span className={s.dn}>{DAY[i]}</span>
              {/* De balk zelf volgt de vinger: tikken of slepen waar dan ook op de
                  balk. De schuif eronder blijft voor het toetsenbord. */}
              <div
                className={s.track}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  event.currentTarget.querySelector("input")?.focus({ preventScroll: true });
                  setDay(i, minutesAt(event.currentTarget, event.clientX));
                }}
                onPointerMove={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    setDay(i, minutesAt(event.currentTarget, event.clientX));
                  }
                }}
              >
                <span className={s.fill} style={{ width: `${pct}%` }} />
                {day.events.map((event) => (
                  <span
                    key={event.id}
                    className={s.evb}
                    style={{ width: `${Math.min(100, (event.durationMinutes / BAR_MINUTES) * 100)}%`, background: STATUS_INK[event.status] }}
                  />
                ))}
                <span className={s.knob} style={{ left: `calc(${pct}% - 2px)`, opacity: value ? 1 : 0.35 }} />
                <input
                  type="range"
                  min={0}
                  max={AVAILABILITY_MAX_MINUTES}
                  step={AVAILABILITY_STEP_MINUTES}
                  value={value}
                  aria-label={`Beschikbaar op ${DAY[i]}`}
                  aria-valuetext={value ? `${clock(value)} uur` : "vrij"}
                  onChange={(event) => setDay(i, Number(event.target.value))}
                />
              </div>
              <span className={s.val}>{value ? clock(value) : "vrij"}</span>
              <div className={s.meta}>
                {training ? <span>{training}</span> : null}
                {day.events.map((event) => {
                  const short = value < event.durationMinutes;
                  return (
                    <span
                      key={event.id}
                      className={short ? `${s.evc} ${s.warn}` : s.evc}
                      style={{ "--evc": STATUS_INK[event.status] } as React.CSSProperties}
                    >
                      {event.title} {event.time} · <b>{short ? "meer tijd nodig" : STATUS_LABEL[event.status]}</b>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className={s.foot}>
        <p className={s.status} role="status">{status}</p>
        <div className={s.act}>
          <button type="button" className={`${s.btn} ${s.alt}`} onClick={onBack} aria-label="Vorig scherm">
            <ChevronLeft className="mx-auto size-6" strokeWidth={2.4} />
          </button>
          <button type="button" className={s.btn} onClick={save} disabled={busy}>
            {busy ? "Opslaan…" : justSaved && !dirty ? "Opgeslagen" : "Beschikbaarheid opslaan"}
          </button>
        </div>
      </div>
    </>
  );
}
