"use client";

// Persoonlijke voorkeuren (0230): de lijst en het invoerveld. Eén component voor
// het lid en voor de trainer; `profileId` zegt over wie het gaat.

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrainingPreference } from "@/lib/training/preferences";
import { addTrainingPreference, removeTrainingPreference } from "../_actions";

const MAX_BODY = 1000;

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}

export function PreferencesPanel({
  profileId,
  currentUserId,
  preferences,
  pendingIds,
  full,
}: {
  profileId: string;
  currentUserId: string;
  preferences: TrainingPreference[];
  /** Voorkeuren die er nog niet waren toen het lopende schema werd gemaakt. */
  pendingIds: string[];
  /** Het maximum is bereikt: er kan niets meer bij. */
  full: boolean;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function run(
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string; note?: string | null }>,
    formData: FormData,
    done?: () => void,
  ) {
    setError(null);
    setNote(null);
    startTransition(async () => {
      const outcome = await action(formData);
      if (outcome.ok) {
        setNote(outcome.note ?? null);
        done?.();
      } else {
        setError(outcome.error ?? "Opslaan faalde.");
      }
    });
  }

  function add() {
    const text = body.trim();
    if (!text) return;
    const formData = new FormData();
    formData.set("profile_id", profileId);
    formData.set("body", text);
    run(addTrainingPreference, formData, () => setBody(""));
  }

  function remove(id: string) {
    if (!confirm("Voorkeur weghalen?")) return;
    const formData = new FormData();
    formData.set("preference_id", id);
    run(removeTrainingPreference, formData);
  }

  return (
    <div className="space-y-3">
      {preferences.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog niets vastgelegd.</p>
      ) : (
        <ul className="space-y-2">
          {preferences.map((preference) => {
            const mine = preference.authorId === currentUserId;
            const removable = currentUserId === profileId || mine;
            return (
              <li key={preference.id} className="rounded-md border bg-background p-3 text-sm">
                <p className="whitespace-pre-wrap break-words">{preference.body}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {mine ? "Jij" : preference.authorName}
                    {preference.authorRole === "trainer" && !mine ? " (trainer)" : ""}
                  </span>
                  <span>·</span>
                  <span>{fmtDay(preference.createdAt)}</span>
                  {pendingIds.includes(preference.id) ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                      Vanaf de volgende herziening
                    </span>
                  ) : null}
                  {removable ? (
                    <button
                      type="button"
                      onClick={() => remove(preference.id)}
                      disabled={pending}
                      title="Weghalen"
                      className="ml-auto disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5 hover:text-destructive" />
                    </button>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {full ? null : (
        <div className="flex items-start gap-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={2}
            maxLength={MAX_BODY}
            placeholder="Bijvoorbeeld: in de winter motiveren indoor races mij meer dan lange duurritten."
            className="flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="button" size="sm" onClick={add} disabled={pending || !body.trim()}>
            {pending ? "Bezig…" : "Toevoegen"}
          </Button>
        </div>
      )}

      {note ? <p className="text-xs font-medium text-primary">{note}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
