"use client";

// Doeltype, met bij een gran fondo of outdoor event de doeltijd en het
// parcours. Een eindtijd hoort alleen bij één rit op één dag; bij een doorlopend
// doel zouden de velden alleen in de weg staan.

import { useEffect, useRef, useState } from "react";
import { GOAL_LABELS } from "../../_components/format";
import { TARGET_TIME_GOAL_TYPES } from "@/lib/training/goal-target-types";

type EventOption = { id: string; label: string };

const FIELD = "mt-1 w-full rounded-md border bg-background px-3 py-2";

export function GoalTypeFields({ events }: { events: EventOption[] }) {
  const defaultType = Object.keys(GOAL_LABELS)[0];
  const [goalType, setGoalType] = useState(defaultType);
  const [eventId, setEventId] = useState("");
  const ref = useRef<HTMLLabelElement>(null);

  // Na opslaan zet het formulier zich terug; de velden horen dan mee terug.
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const reset = () => {
      setGoalType(defaultType);
      setEventId("");
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultType]);

  const withTarget = TARGET_TIME_GOAL_TYPES.includes(goalType);

  return (
    <>
      <label ref={ref} className="text-sm">
        Doeltype
        <select
          name="goal_type"
          value={goalType}
          onChange={(event) => setGoalType(event.target.value)}
          className={FIELD}
        >
          {Object.entries(GOAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {withTarget ? (
        <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <label className="text-sm">
            Doeltijd (rijtijd)
            <input
              name="target_time"
              placeholder="6:15"
              inputMode="numeric"
              autoComplete="off"
              className={FIELD}
            />
          </label>
          <label className="text-sm">
            Rijden
            <select name="target_riding" defaultValue="alone" className={FIELD}>
              <option value="alone">Alleen</option>
              <option value="group">In een groep</option>
            </select>
          </label>
          <label className="text-sm">
            Parcours
            <select
              name="target_event_id"
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              className={FIELD}
            >
              <option value="">Eigen GPX</option>
              {events.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {eventId === "" ? (
            <label className="text-sm">
              GPX
              <input
                name="target_gpx"
                type="file"
                accept=".gpx,application/gpx+xml"
                className={`${FIELD} file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm`}
              />
            </label>
          ) : null}
        </fieldset>
      ) : null}
    </>
  );
}
